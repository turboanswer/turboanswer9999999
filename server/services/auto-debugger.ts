import { onErrorTracked, type TrackedError } from "./error-tracker";
import { attemptRemediation, type RemediationAttempt } from "./auto-remediation";

interface AutoDebugDiagnosis {
  errorId: string;
  fingerprint: string;
  errorMessage: string;
  errorType: string;
  route?: string;
  rootCause: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  suggestedFix: string;
  immediateMitigation: string;
  filesToCheck: string[];
  diagnosedAt: string;
  durationMs: number;
  remediation?: RemediationAttempt | null;
}

const diagnoses: AutoDebugDiagnosis[] = [];
const inFlight = new Set<string>();
const MAX_DIAGNOSES = 100;

const QUEUEABLE_SEVERITIES: Array<TrackedError['severity']> = ['critical', 'high', 'medium'];

let enabled = true;
let totalDiagnosed = 0;
let totalErrors = 0;
let totalFailedDiagnoses = 0;

export function setAutoDebuggerEnabled(v: boolean) { enabled = v; }
export function isAutoDebuggerEnabled() { return enabled; }

export function getDiagnoses(): AutoDebugDiagnosis[] {
  return [...diagnoses].reverse();
}

export function clearDiagnoses(): number {
  const n = diagnoses.length;
  diagnoses.length = 0;
  return n;
}

export function getAutoDebuggerStats() {
  return {
    enabled,
    totalErrorsObserved: totalErrors,
    totalDiagnosed,
    totalFailedDiagnoses,
    pendingInFlight: inFlight.size,
    cachedDiagnoses: diagnoses.length,
  };
}

function fp(err: TrackedError): string {
  return `${err.type}::${err.message.substring(0, 120)}`;
}

function getGeminiKey(): string | null {
  return process.env.AI_INTEGRATIONS_GOOGLE_GEMINI_KEY
    || process.env.GEMINI_API_KEY
    || process.env.GOOGLE_AI_API_KEY
    || null;
}

async function callGeminiForDebug(prompt: string, apiKey: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 800, responseMimeType: 'application/json' },
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const data: any = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

async function runDiagnosis(err: TrackedError): Promise<AutoDebugDiagnosis | null> {
  const apiKey = getGeminiKey();
  if (!apiKey) return null;

  const start = Date.now();
  const prompt = `You are TurboAnswer's autonomous production debugger. A live error just occurred in a Node.js / Express / TypeScript / React app. Analyze it and respond with STRICT JSON only.

Error type: ${err.type}
Heuristic severity: ${err.severity}
Route: ${err.route || '(none)'}
Occurrences: ${err.occurrences}
Message: ${err.message}
Stack:
${(err.stack || '(no stack)').slice(0, 2000)}

Respond with ONLY this JSON shape:
{
  "rootCause": "1-2 sentences in plain English: what actually broke",
  "severity": "low|medium|high|critical",
  "suggestedFix": "concrete code-level fix; name file/function if you can infer it",
  "immediateMitigation": "what to do RIGHT NOW to keep the app running (restart, env var, feature flag, fallback)",
  "filesToCheck": ["server/routes.ts", "..."]
}`;

  try {
    const raw = await callGeminiForDebug(prompt, apiKey);
    const cleaned = String(raw).replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
    const parsed = JSON.parse(cleaned);

    return {
      errorId: err.id,
      fingerprint: fp(err),
      errorMessage: err.message,
      errorType: err.type,
      route: err.route,
      rootCause: String(parsed.rootCause || 'Unknown').slice(0, 600),
      severity: ['low', 'medium', 'high', 'critical'].includes(parsed.severity) ? parsed.severity : err.severity,
      suggestedFix: String(parsed.suggestedFix || '').slice(0, 1000),
      immediateMitigation: String(parsed.immediateMitigation || '').slice(0, 600),
      filesToCheck: Array.isArray(parsed.filesToCheck)
        ? parsed.filesToCheck.slice(0, 8).map((s: any) => String(s).slice(0, 120))
        : [],
      diagnosedAt: new Date().toISOString(),
      durationMs: Date.now() - start,
    };
  } catch (e: any) {
    totalFailedDiagnoses++;
    return null;
  }
}

async function maybeDiagnose(err: TrackedError) {
  if (!enabled) return;
  totalErrors++;
  if (!QUEUEABLE_SEVERITIES.includes(err.severity)) return;
  if (err.occurrences > 1) return;
  const key = fp(err);
  if (inFlight.has(key)) return;
  if (diagnoses.some(d => d.fingerprint === key)) return;

  inFlight.add(key);
  try {
    const remediation = await attemptRemediation(err);
    const diag = await runDiagnosis(err);
    if (diag) {
      diag.remediation = remediation;
      diagnoses.push(diag);
      if (diagnoses.length > MAX_DIAGNOSES) diagnoses.splice(0, diagnoses.length - MAX_DIAGNOSES);
      totalDiagnosed++;
      const remTag = remediation ? ` [auto-fix: ${remediation.playbook}=${remediation.status}]` : '';
      console.log(`[AutoDebug] Diagnosed ${err.severity} ${err.type} in ${diag.durationMs}ms${remTag} — ${diag.rootCause.slice(0, 100)}`);
    }
  } finally {
    inFlight.delete(key);
  }
}

let installed = false;
export function installAutoDebugger() {
  if (installed) return;
  installed = true;
  onErrorTracked((e) => { void maybeDiagnose(e); });
  const hasKey = !!getGeminiKey();
  console.log(`[AutoDebug] Real-time AI debugger installed (Gemini Flash) — API key: ${hasKey ? 'present' : 'MISSING'}`);
}

export type { AutoDebugDiagnosis };
