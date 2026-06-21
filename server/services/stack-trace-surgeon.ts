import { fastAnswer } from "./reasoning-engine.js";
import { callDirect } from "./direct-router.js";

// Stack Trace Surgeon runs EXCLUSIVELY on the GPT-5.2 Codex deployment — the only
// feature in the app that uses Codex. Falls back to the tier-routed answer chain
// via fastAnswer if the model is unavailable, so the feature never goes silent.
const SURGEON_MODEL = 'openai/gpt-5.2-codex';

export type ModelUsage = { promptTokens: number; completionTokens: number };

async function callSurgeonModel(prompt: string, onUsage?: (u: ModelUsage) => void): Promise<string | null> {
  return callDirect(SURGEON_MODEL, [{ role: 'user', content: prompt }], {
    maxTokens: 3000,
    temperature: 0.2,
    timeoutMs: 50000,
    onUsage,
  });
}

export type StackFrame = { file: string; line?: number; raw: string };
export type RepoRef = { owner: string; repo: string; branch: string };

const TRACE_PATTERNS: { re: RegExp; fileGroup: number; lineGroup?: number }[] = [
  { re: /at\s+[^\s(]+\s+\(([^):\s]+):(\d+)(?::\d+)?\)/g, fileGroup: 1, lineGroup: 2 },
  { re: /at\s+([^\s(]+):(\d+)(?::\d+)?/g, fileGroup: 1, lineGroup: 2 },
  { re: /File\s+"([^"]+)",\s+line\s+(\d+)/g, fileGroup: 1, lineGroup: 2 },
  { re: /([\w./\\-]+\.(?:py|rb|go|java|kt|kts|scala|cs|cpp|cc|c|h|hpp|rs|php|swift|m|mm|ts|tsx|js|jsx|mjs|cjs|vue|svelte|sql|sh)):(\d+)/g, fileGroup: 1, lineGroup: 2 },
  { re: /from\s+([\w./\\-]+\.\w+):(\d+)/g, fileGroup: 1, lineGroup: 2 },
];

export function parseStackTrace(text: string): StackFrame[] {
  if (!text) return [];
  const seen = new Set<string>();
  const frames: StackFrame[] = [];
  for (const { re, fileGroup, lineGroup } of TRACE_PATTERNS) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const file = m[fileGroup]?.trim();
      if (!file) continue;
      const line = lineGroup ? Number(m[lineGroup]) : undefined;
      const key = `${file}:${line ?? ''}`;
      if (seen.has(key)) continue;
      seen.add(key);
      frames.push({ file, line, raw: m[0] });
      if (frames.length >= MAX_FRAMES) return frames;
    }
  }
  return frames;
}

export function parseRepoUrl(url: string): RepoRef | null {
  if (!url) return null;
  const cleaned = url.trim().replace(/\.git$/, '').replace(/\/+$/, '');
  // /tree/<branch> branches may legitimately contain `/` (e.g. feature/foo).
  // We greedily capture everything after /tree/ as the branch name.
  let m = cleaned.match(/github\.com[/:]([^/]+)\/([^/]+?)(?:\/tree\/(.+))?$/i);
  if (!m) {
    m = cleaned.match(/^([^/\s]+)\/([^/\s@]+?)(?:@(.+))?$/);
    if (m) return { owner: m[1], repo: m[2], branch: m[3] || 'main' };
    return null;
  }
  return { owner: m[1], repo: m[2], branch: m[3] || 'main' };
}

const FILE_EXT_RE = /\.(py|rb|go|java|kt|scala|cs|cpp|cc|c|h|hpp|rs|php|swift|m|mm|ts|tsx|js|jsx|mjs|cjs|vue|svelte)$/i;
const REPO_FILE_LIMIT = 8;
const FILE_BYTE_LIMIT = 60_000;
const MAX_FRAMES = 20;
const MAX_FETCH_ATTEMPTS = 40;

function normalizeRepoPath(file: string, repo: string): string[] {
  const candidates = new Set<string>();
  let p = file.replace(/\\/g, '/').replace(/^\.\//, '');
  if (p.startsWith('file://')) p = p.slice(7);
  if (/^[a-zA-Z]:\//.test(p)) p = p.slice(3);
  if (p.startsWith('/')) p = p.slice(1);
  candidates.add(p);
  const repoIdx = p.indexOf(`${repo}/`);
  if (repoIdx >= 0) candidates.add(p.slice(repoIdx + repo.length + 1));
  const segments = p.split('/');
  for (let i = 1; i < segments.length; i++) candidates.add(segments.slice(i).join('/'));
  return Array.from(candidates).filter(c => c && FILE_EXT_RE.test(c));
}

import { fetchFileViaContentsApi, searchFileByBasename } from './github-pr.js';

async function tryFetchRaw(owner: string, repo: string, branch: string, path: string, token?: string): Promise<string | null> {
  // 1. Authenticated: prefer the Contents API (works for private repos AND fine-grained PATs).
  if (token) {
    const viaApi = await fetchFileViaContentsApi(owner, repo, path, branch, token);
    if (viaApi !== null) {
      return viaApi.length > FILE_BYTE_LIMIT
        ? viaApi.slice(0, FILE_BYTE_LIMIT) + '\n…[truncated by Stack Trace Surgeon]'
        : viaApi;
    }
  }
  // 2. Anonymous (or token failed): use raw.githubusercontent.com (no auth, public repos only).
  const headers: Record<string, string> = { 'User-Agent': 'TurboAnswer-StackTraceSurgeon' };
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(url, { headers, signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return null;
    const text = await res.text();
    return text.length > FILE_BYTE_LIMIT ? text.slice(0, FILE_BYTE_LIMIT) + '\n…[truncated by Stack Trace Surgeon]' : text;
  } catch {
    return null;
  }
}

export async function fetchRepoFiles(
  ref: RepoRef,
  frames: StackFrame[],
  token?: string,
): Promise<{ path: string; content: string; line?: number }[]> {
  const results: { path: string; content: string; line?: number }[] = [];
  const tried = new Set<string>();
  const branchesToTry = Array.from(new Set([ref.branch, ref.branch === 'main' ? 'master' : 'main', 'develop', 'dev', 'trunk']));
  let attempts = 0;

  for (const frame of frames) {
    if (results.length >= REPO_FILE_LIMIT) break;
    if (attempts >= MAX_FETCH_ATTEMPTS) break;
    const candidates = normalizeRepoPath(frame.file, ref.repo);
    let fetched: { path: string; content: string } | null = null;
    for (const cand of candidates) {
      for (const br of branchesToTry) {
        if (attempts >= MAX_FETCH_ATTEMPTS) break;
        const key = `${br}::${cand}`;
        if (tried.has(key)) continue;
        tried.add(key);
        attempts += 1;
        const content = await tryFetchRaw(ref.owner, ref.repo, br, cand, token);
        if (content) { fetched = { path: cand, content }; break; }
      }
      if (fetched) break;
    }

    // Fallback: if we have a token and STILL didn't find the file, search the repo by basename.
    if (!fetched && token && attempts < MAX_FETCH_ATTEMPTS) {
      const basename = candidates[0]?.split('/').pop();
      if (basename && /\.[A-Za-z0-9]+$/.test(basename)) {
        const found = await searchFileByBasename(ref.owner, ref.repo, basename, token);
        if (found) {
          for (const br of branchesToTry) {
            if (attempts >= MAX_FETCH_ATTEMPTS) break;
            const key = `${br}::search::${found}`;
            if (tried.has(key)) continue;
            tried.add(key);
            attempts += 1;
            const content = await tryFetchRaw(ref.owner, ref.repo, br, found, token);
            if (content) { fetched = { path: found, content }; break; }
          }
        }
      }
    }

    if (fetched) results.push({ ...fetched, line: frame.line });
  }
  return results;
}

export type Diagnosis = {
  rootCause: string;
  suggestedFix: string;
  filesUsed: { path: string; line?: number }[];
  framesParsed: number;
  warnings: string[];
  // ── Revolutionary upgrade ──────────────────────────────────────────────────
  confidence: number;                                   // 0–100
  severity: 'critical' | 'high' | 'medium' | 'low';
  alternatives: { cause: string; confidence: number }[];
  incidentSummary: string;                              // on-call incident brief
  postmortem: string;                                   // blameless postmortem (markdown)
  culprit: { sha: string; author: string; date: string; message: string; url: string } | null;
  // Token usage of the Codex diagnosis call, when available — used for
  // actual-cost metering. Undefined when the fallback answer chain was used.
  modelUsage?: ModelUsage;
};

// ── Deep repo reasoning: follow local imports one hop ─────────────────────────
// Extract relative import targets from a source file so we can pull in the
// modules the failing file actually depends on. Only relative paths ('./' '../')
// are followed — never node_modules / stdlib.
const IMPORT_PATTERNS: RegExp[] = [
  /import\s+(?:[^'"]+\s+from\s+)?['"](\.[^'"]+)['"]/g, // JS/TS import … from './x'
  /require\(\s*['"](\.[^'"]+)['"]\s*\)/g,              // CommonJS require('./x')
  /from\s+(\.[^\s]+)\s+import/g,                       // Python: from .mod import
];

const IMPORT_EXTS = ['', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.py', '.go', '.rb', '/index.ts', '/index.js', '/__init__.py'];
const DEEP_FILE_LIMIT = 6;

function resolveRelative(fromPath: string, target: string): string {
  const dir = fromPath.includes('/') ? fromPath.slice(0, fromPath.lastIndexOf('/')) : '';
  // Python dotted: ".mod" / "..pkg.mod" → strip leading dots into ../, dots→/
  let t = target;
  if (/^\.+[A-Za-z_]/.test(t) && !t.includes('/')) {
    const dots = (t.match(/^\.+/) || [''])[0].length;
    const rest = t.slice(dots).replace(/\./g, '/');
    t = (dots > 1 ? '../'.repeat(dots - 1) : './') + rest;
  }
  const parts = (dir + '/' + t).split('/');
  const out: string[] = [];
  for (const p of parts) {
    if (p === '' || p === '.') continue;
    if (p === '..') out.pop();
    else out.push(p);
  }
  return out.join('/');
}

async function expandWithImports(
  ref: RepoRef,
  seed: { path: string; content: string; line?: number }[],
  token?: string,
): Promise<{ path: string; content: string; line?: number }[]> {
  const have = new Set(seed.map(f => f.path));
  const extra: { path: string; content: string; line?: number }[] = [];
  const branches = Array.from(new Set([ref.branch, ref.branch === 'main' ? 'master' : 'main']));
  for (const f of seed) {
    if (extra.length >= DEEP_FILE_LIMIT) break;
    const targets = new Set<string>();
    for (const re of IMPORT_PATTERNS) {
      re.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = re.exec(f.content)) !== null) {
        const base = resolveRelative(f.path, m[1]);
        if (base) targets.add(base);
      }
    }
    for (const base of Array.from(targets)) {
      if (extra.length >= DEEP_FILE_LIMIT) break;
      for (const ext of IMPORT_EXTS) {
        const cand = base + ext;
        if (have.has(cand) || !FILE_EXT_RE.test(cand)) continue;
        let content: string | null = null;
        for (const br of branches) {
          content = await tryFetchRaw(ref.owner, ref.repo, br, cand, token);
          if (content) break;
        }
        if (content) {
          have.add(cand);
          extra.push({ path: cand, content });
          break;
        }
      }
    }
  }
  return extra;
}

function buildPrompt(stackTrace: string, files: { path: string; content: string; line?: number }[]): string {
  const fileBlocks = files.map(f => {
    const head = f.line ? `### FILE: ${f.path} (error around line ${f.line})` : `### FILE: ${f.path}`;
    return `${head}\n\`\`\`\n${f.content}\n\`\`\``;
  }).join('\n\n');
  const haveFiles = fileBlocks.length > 0;
  return [
    'You are Stack Trace Surgeon, a senior debugging engineer with 20 years of production experience.',
    'You receive a runtime error / stack trace and (sometimes) the actual source files referenced by that trace.',
    'Your job: diagnose the ROOT CAUSE precisely (not the symptom), then give a CONCRETE, ACTIONABLE fix.',
    '',
    '════════════════════════════════════════',
    'ABSOLUTE RULES — READ TWICE:',
    '════════════════════════════════════════',
    '1. You MUST fill in EVERY section below. Empty sections, "(cannot provide)", "source files not provided",',
    '   "without the source file I cannot…", or any refusal phrase is FORBIDDEN. The user is paying $30/mo',
    '   for an answer — give them one.',
    '2. If source files are missing, that is FINE — you have decades of pattern-matching experience.',
    '   Infer the most likely buggy code from the error message + traceback context (function names, line numbers,',
    '   library conventions). Write the BEFORE block as your best reconstruction of what the code probably says,',
    '   and the AFTER block as the fix. Label it clearly as a reconstruction if uncertain, but ALWAYS provide it.',
    '3. The error message itself almost always tells you the bug. TypeError, ZeroDivisionError, NullPointerException,',
    '   KeyError, AttributeError, etc. — each has a small set of known causes. Pick the most likely one and commit.',
    '4. Never say "look elsewhere" or "I need more info". Make the best call you can with what you have.',
    '',
    '════════════════════════════════════════',
    'OUTPUT FORMAT (markdown, exact section names, in this order):',
    '════════════════════════════════════════',
    '',
    '## Confidence',
    '(A single integer 0-100 on its own line = how confident you are in the PRIMARY root cause below.',
    'High (85-100) only when the trace + source make it near-certain. Lower it honestly when guessing.)',
    '',
    '## Severity',
    '(One word: critical, high, medium, or low. critical = data loss / outage / security; high = core feature',
    'broken; medium = degraded; low = cosmetic or edge case.)',
    '',
    '## Root Cause',
    '(2–4 sentences in plain English. Name the file + line from the trace, then explain WHY it fails — the',
    'underlying mistake — not just WHAT the error message says. Be specific.)',
    '',
    '## Alternative Causes',
    '(2–3 OTHER plausible explanations, ranked, each on its own line formatted EXACTLY as:',
    '`- (NN%) one-sentence alternate hypothesis`  where NN is your confidence in that alternative.',
    'If you are fully certain, still give at least one lower-confidence alternative.)',
    '',
    '## Suggested Fix',
    '(Required: file path + a fenced code block. Use unified diff format `--- a/path` / `+++ b/path` with',
    '`-` for removed lines and `+` for added lines. Keep the change minimal — usually 1–5 lines. If you do not',
    'have the exact source, write your best reconstruction of the buggy line based on the trace and library',
    'conventions, and patch THAT.)',
    '',
    '## Why This Works',
    '(1–2 sentences. Connect the fix back to the root cause. Mention any edge case the engineer should',
    'still watch for.)',
    '',
    '## Tests / Verification',
    '(1–3 short, concrete steps. e.g. "Run `python app.py` again — the TypeError should be gone." or',
    '"Add a unit test that passes timeout=10.0 and expects no exception.")',
    '',
    '## Incident Brief',
    '(A terse on-call brief for whoever is paged RIGHT NOW. Three lines, each prefixed exactly:',
    '`Impact:` who/what is affected and how bad. `Mitigate now:` the fastest safe stop-gap (feature flag,',
    'rollback, restart). `Permanent fix:` one line pointing at the fix above.)',
    '',
    '## Postmortem',
    '(A short blameless postmortem in markdown with these bold labels on their own lines: **Summary**,',
    '**Root cause**, **Resolution**, **Prevention**. 1–3 sentences each. Blameless tone — no names, focus on',
    'systems and process. This is auto-attached to the incident record.)',
    '',
    '════════════════════════════════════════',
    haveFiles
      ? `INPUT: stack trace + ${(fileBlocks.match(/^=== /gm) || []).length} fetched source file(s).`
      : 'INPUT: stack trace ONLY. Source files were not fetched (private repo, wrong path, or rate-limited). Diagnose anyway — your reconstruction will still help.',
    '════════════════════════════════════════',
    '',
    '=== STACK TRACE ===',
    stackTrace.slice(0, 8000),
    '',
    '=== SOURCE FILES ===',
    fileBlocks || '(none fetched — work from the stack trace and your debugging experience)',
  ].join('\n');
}

type ParsedDiagnosis = {
  rootCause: string;
  suggestedFix: string;
  confidence: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  alternatives: { cause: string; confidence: number }[];
  incidentSummary: string;
  postmortem: string;
};

function section(text: string, name: string): string {
  const re = new RegExp(`##\\s*${name}\\s*([\\s\\S]*?)(?=\\n##\\s|$)`, 'i');
  return text.match(re)?.[1]?.trim() || '';
}

function splitDiagnosis(text: string): ParsedDiagnosis {
  const root = section(text, 'Root Cause');
  const fixSection = section(text, 'Suggested Fix');
  const why = section(text, 'Why This Works');
  const tests = section(text, 'Tests \\/ Verification');
  const incidentSummary = section(text, 'Incident Brief');
  const postmortem = section(text, 'Postmortem');

  // Confidence: first integer 0-100 in its section.
  const confRaw = section(text, 'Confidence');
  const confMatch = confRaw.match(/\b(\d{1,3})\b/);
  let confidence = confMatch ? Math.max(0, Math.min(100, parseInt(confMatch[1], 10))) : 70;

  // Severity: first matching keyword.
  const sevRaw = (section(text, 'Severity') || '').toLowerCase();
  const severity: ParsedDiagnosis['severity'] =
    /critical/.test(sevRaw) ? 'critical' :
    /high/.test(sevRaw) ? 'high' :
    /low/.test(sevRaw) ? 'low' : 'medium';

  // Alternatives: lines like "- (NN%) cause" or "- cause — NN%".
  const altRaw = section(text, 'Alternative Causes');
  const alternatives: { cause: string; confidence: number }[] = [];
  for (const line of altRaw.split('\n')) {
    const l = line.replace(/^\s*[-*]\s*/, '').trim();
    if (!l) continue;
    let pct = 50;
    let cause = l;
    const lead = l.match(/^\((\d{1,3})\s*%?\)\s*(.+)$/);
    const trail = l.match(/^(.+?)\s*[—-]\s*(\d{1,3})\s*%\s*$/);
    if (lead) { pct = parseInt(lead[1], 10); cause = lead[2].trim(); }
    else if (trail) { cause = trail[1].trim(); pct = parseInt(trail[2], 10); }
    if (cause) alternatives.push({ cause, confidence: Math.max(0, Math.min(100, pct)) });
    if (alternatives.length >= 4) break;
  }

  const suggested = [
    fixSection,
    why ? `\n**Why this works:** ${why}` : '',
    tests ? `\n\n**Verify:**\n${tests}` : '',
  ].filter(Boolean).join('').trim();

  return {
    rootCause: root || text.slice(0, 600),
    suggestedFix: suggested || text,
    confidence,
    severity,
    alternatives,
    incidentSummary,
    postmortem,
  };
}

export async function diagnoseStackTrace(
  stackTrace: string,
  repoUrl: string,
  tier: string | undefined,
  token?: string,
): Promise<Diagnosis> {
  const warnings: string[] = [];
  const ref = parseRepoUrl(repoUrl);
  if (!ref) {
    return {
      rootCause: 'Invalid GitHub repo URL.',
      suggestedFix: 'Paste a URL like `https://github.com/owner/repo` or `owner/repo`.',
      filesUsed: [],
      framesParsed: 0,
      warnings: ['repo_url_invalid'],
      confidence: 0,
      severity: 'low',
      alternatives: [],
      incidentSummary: '',
      postmortem: '',
      culprit: null,
    };
  }
  const frames = parseStackTrace(stackTrace);
  if (frames.length === 0) warnings.push('no_frames_parsed');
  const seedFiles = await fetchRepoFiles(ref, frames, token);
  // Deep repo reasoning: follow local imports one hop out from the failing files
  // so the AI can reason across modules, not just the single frame file.
  let files = seedFiles;
  if (seedFiles.length > 0) {
    const extra = await expandWithImports(ref, seedFiles, token);
    if (extra.length > 0) {
      files = [...seedFiles, ...extra];
      warnings.push('deep_repo_expanded');
    }
  }
  if (frames.length > 0 && files.length === 0) warnings.push('no_files_fetched');

  const prompt = buildPrompt(stackTrace, files);
  // Primary: GPT-4o via direct OpenAI API.
  // Fallback: tier-routed answer chain via fastAnswer (so we never go silent
  // if OpenAI is unavailable or rate-limited).
  let modelUsage: ModelUsage | undefined;
  let raw = await callSurgeonModel(prompt, (u) => { modelUsage = u; });
  if (!raw || raw.trim().length < 20) {
    raw = await fastAnswer(prompt, undefined, tier);
    modelUsage = undefined; // fallback chain — Codex usage not applicable
  }
  const parsed = splitDiagnosis(raw);

  // Find-what-broke-it: AI git-bisect on the top frame's resolved file. The last
  // commit that touched the failing file is the prime suspect. Needs a token.
  let culprit: Diagnosis['culprit'] = null;
  if (token && files.length > 0) {
    try {
      const { getLatestCommitForPath } = await import('./github-pr.js');
      const topPath = files[0].path;
      const branches = Array.from(new Set([ref.branch, ref.branch === 'main' ? 'master' : 'main']));
      for (const br of branches) {
        const c = await getLatestCommitForPath(ref.owner, ref.repo, topPath, br, token);
        if (c) { culprit = c; break; }
      }
    } catch { /* best-effort */ }
  }

  return {
    rootCause: parsed.rootCause,
    suggestedFix: parsed.suggestedFix,
    filesUsed: files.map(f => ({ path: f.path, line: f.line })),
    framesParsed: frames.length,
    warnings,
    confidence: parsed.confidence,
    severity: parsed.severity,
    alternatives: parsed.alternatives,
    incidentSummary: parsed.incidentSummary,
    postmortem: parsed.postmortem,
    culprit,
    modelUsage,
  };
}

// ── Cheap auto-triage for ingested signals (no repo fetch, no credit charge) ──
// Used by the public ingest webhook so the signals feed shows severity + a one
// line root cause without burning the user's metered balance. Uses a fast model.
export type Triage = {
  title: string;
  rootCause: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  confidence: number;
};

export async function triageSignal(stackTrace: string, hintTitle?: string): Promise<Triage> {
  const prompt = [
    'You are an SRE triaging an incoming production error. Be terse.',
    'Output EXACTLY these three lines and nothing else:',
    'SEVERITY: <critical|high|medium|low>',
    'CONFIDENCE: <0-100>',
    'CAUSE: <one sentence most-likely root cause>',
    '',
    'ERROR:',
    stackTrace.slice(0, 4000),
  ].join('\n');
  let raw = '';
  try {
    raw = (await callDirect('openai/gpt-4o-mini', [{ role: 'user', content: prompt }], {
      maxTokens: 200, temperature: 0.1, timeoutMs: 20000,
    })) || '';
  } catch { /* fall through */ }
  if (!raw || raw.trim().length < 5) {
    try { raw = await fastAnswer(prompt, undefined, 'free'); } catch { raw = ''; }
  }
  const sev = (raw.match(/SEVERITY:\s*(critical|high|medium|low)/i)?.[1] || 'medium').toLowerCase() as Triage['severity'];
  const conf = Math.max(0, Math.min(100, parseInt(raw.match(/CONFIDENCE:\s*(\d{1,3})/i)?.[1] || '50', 10)));
  const cause = raw.match(/CAUSE:\s*(.+)/i)?.[1]?.trim() || 'Unclassified production error — open the signal to run a full diagnosis.';
  const firstLine = (hintTitle || stackTrace.split('\n').find(l => l.trim()) || 'Production error').trim();
  return {
    title: firstLine.slice(0, 120),
    rootCause: cause,
    severity: sev,
    confidence: conf,
  };
}
