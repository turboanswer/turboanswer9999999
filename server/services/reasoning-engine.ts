/**
 * TurboAnswer Reasoning Engine (TRE)
 * Auto-routes between fast single-model and deep multi-model reasoning.
 * Streams progress via onProgress callback. All billing through OpenRouter.
 */

const OR_KEY = () => process.env.OPENROUTER_API_KEY || '';
const OR_URL = 'https://openrouter.ai/api/v1/chat/completions';

const MODEL_ROUTER = 'google/gemini-2.5-flash';
const MODEL_PLANNER = 'google/gemini-2.5-flash';
const MODEL_PANEL = [
  { id: 'google/gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
  { id: 'anthropic/claude-sonnet-4.5', name: 'Claude Sonnet 4.5' },
  { id: 'openai/gpt-4o', name: 'GPT-4o' },
];
const MODEL_JUDGE = 'anthropic/claude-sonnet-4.5';
const MODEL_VERIFIER = 'google/gemini-2.5-flash';

export type Stage = {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'done' | 'skipped' | 'error';
  detail?: string;
};

export type EngineEvent =
  | { type: 'stage'; stage: Stage }
  | { type: 'sources'; sources: Source[] }
  | { type: 'panel'; model: string; preview: string }
  | { type: 'chunk'; text: string }
  | { type: 'done'; content: string; verified: 'verified' | 'unverified' | 'unknown'; mode: 'fast' | 'deep'; sources: Source[]; claims: ClaimCheck[] }
  | { type: 'error'; message: string }
  | { type: 'quota'; tier: string; used: number; limit: number; fellBackToFast: boolean };

export type Source = { title: string; url: string; snippet: string };
export type ClaimCheck = { claim: string; verdict: 'supported' | 'unsupported' | 'unclear'; note?: string };

export type RouteDecision = {
  mode: 'fast' | 'deep';
  needsRetrieval: boolean;
  isMath: boolean;
  reason: string;
};

async function callOR(model: string, prompt: string, opts: { maxTokens?: number; temperature?: number; jsonMode?: boolean; system?: string; timeoutMs?: number } = {}): Promise<string | null> {
  const key = OR_KEY();
  if (!key) return null;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 45000);
  try {
    const messages: any[] = [];
    if (opts.system) messages.push({ role: 'system', content: opts.system });
    messages.push({ role: 'user', content: prompt });
    const body: any = {
      model,
      messages,
      max_tokens: opts.maxTokens ?? 1500,
      temperature: opts.temperature ?? 0.3,
    };
    if (opts.jsonMode) body.response_format = { type: 'json_object' };
    const res = await fetch(OR_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
        'HTTP-Referer': 'https://turbo-answer.replit.app',
        'X-Title': 'TurboAnswer Reasoning Engine',
      },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      console.warn(`[TRE] ${model} HTTP ${res.status}: ${txt.slice(0, 200)}`);
      return null;
    }
    const data: any = await res.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (err: any) {
    clearTimeout(t);
    console.warn(`[TRE] ${model} failed: ${err.message}`);
    return null;
  }
}

function parseJSON<T>(s: string | null, fallback: T): T {
  if (!s) return fallback;
  try {
    const m = s.match(/\{[\s\S]*\}/);
    return JSON.parse(m ? m[0] : s) as T;
  } catch {
    return fallback;
  }
}

// ============= ROUTER =============
export async function routeQuestion(question: string, hasImage: boolean, manualDeepThink: boolean): Promise<RouteDecision> {
  if (manualDeepThink) {
    return { mode: 'deep', needsRetrieval: true, isMath: /\d.*[+\-*/=].*\d|\bcalculate\b|\bsolve\b/i.test(question), reason: 'manual_override' };
  }
  if (hasImage) return { mode: 'fast', needsRetrieval: false, isMath: false, reason: 'image_query' };

  const prompt = `Classify this user question. Output STRICT JSON only:
{"mode":"fast"|"deep","needs_retrieval":true|false,"is_math":true|false,"reason":"short"}

Use "deep" when ANY apply:
- Multi-step reasoning, comparison, analysis, or synthesis required
- Open-ended research, current events, or controversial/disputed topics
- The question has multiple sub-parts
- Accuracy matters more than speed (medical, legal, financial, scientific)
- Requires citing or cross-checking sources

Use "fast" when:
- Casual conversation, greetings, simple Q&A
- Single fact lookup that one model knows
- Code snippets, simple definitions
- Creative writing without research

Question: """${question.slice(0, 1500)}"""`;

  const raw = await callOR(MODEL_ROUTER, prompt, { maxTokens: 200, temperature: 0, jsonMode: true, timeoutMs: 8000 });
  const parsed = parseJSON<{ mode?: string; needs_retrieval?: boolean; is_math?: boolean; reason?: string }>(raw, {});
  return {
    mode: parsed.mode === 'deep' ? 'deep' : 'fast',
    needsRetrieval: parsed.needs_retrieval !== false && parsed.mode === 'deep',
    isMath: !!parsed.is_math,
    reason: parsed.reason || 'auto',
  };
}

// ============= RETRIEVAL =============
const retrievalCache = new Map<string, { sources: Source[]; ts: number }>();
const CACHE_TTL = 30 * 60 * 1000;

async function searchWikipedia(q: string): Promise<Source[]> {
  try {
    const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&format=json&srsearch=${encodeURIComponent(q)}&srlimit=3&origin=*`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return [];
    const data: any = await res.json();
    const hits = data?.query?.search || [];
    return hits.slice(0, 3).map((h: any) => ({
      title: h.title,
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(h.title.replace(/ /g, '_'))}`,
      snippet: (h.snippet || '').replace(/<[^>]+>/g, '').slice(0, 280),
    }));
  } catch {
    return [];
  }
}

function evalArithmetic(q: string): string | null {
  const m = q.match(/([\d.\s+\-*/()^%]+)/g);
  if (!m) return null;
  for (const expr of m) {
    const cleaned = expr.replace(/\s+/g, '').replace(/\^/g, '**');
    if (!/^[\d+\-*/().%]+$/.test(cleaned) || cleaned.length < 3) continue;
    try {
      // eslint-disable-next-line no-new-func
      const v = Function(`"use strict"; return (${cleaned});`)();
      if (typeof v === 'number' && isFinite(v)) return `${cleaned} = ${v}`;
    } catch {}
  }
  return null;
}

export async function retrieve(question: string, isMath: boolean): Promise<{ sources: Source[]; arithmetic: string | null }> {
  const key = question.toLowerCase().trim().slice(0, 200);
  const cached = retrievalCache.get(key);
  let sources: Source[] = [];
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    sources = cached.sources;
  } else {
    sources = await searchWikipedia(question);
    if (sources.length) retrievalCache.set(key, { sources, ts: Date.now() });
  }
  const arithmetic = isMath ? evalArithmetic(question) : null;
  return { sources, arithmetic };
}

// ============= PLANNER =============
export async function planSubQuestions(question: string): Promise<string[]> {
  const prompt = `Break this question into 2-4 atomic sub-questions that, when answered together, fully address the original. Output STRICT JSON: {"subs":["...","..."]}.
If the question is already atomic, return one item.

Question: """${question.slice(0, 1500)}"""`;
  const raw = await callOR(MODEL_PLANNER, prompt, { maxTokens: 400, temperature: 0.2, jsonMode: true, timeoutMs: 10000 });
  const parsed = parseJSON<{ subs?: string[] }>(raw, { subs: [question] });
  const subs = (parsed.subs || []).filter(s => typeof s === 'string' && s.trim()).slice(0, 4);
  return subs.length ? subs : [question];
}

// ============= PANEL (3 models in parallel) =============
function buildPanelPrompt(question: string, subQs: string[], context: string): string {
  return `You are a careful expert. Answer the user's question with maximum accuracy.

${context ? `Reference material (may help, may be incomplete):\n${context}\n\n` : ''}${subQs.length > 1 ? `Sub-questions to address:\n${subQs.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\n` : ''}User question: ${question}

Rules:
- Be concise but complete. Use markdown.
- If you are uncertain about a fact, explicitly say so.
- Do NOT fabricate citations. Only cite if you actually know the source.
- If math is involved, show steps.`;
}

export async function panelAnswer(question: string, subQs: string[], context: string, onPanel: (model: string, preview: string) => void): Promise<{ model: string; answer: string }[]> {
  const prompt = buildPanelPrompt(question, subQs, context);
  const results = await Promise.all(MODEL_PANEL.map(async m => {
    const ans = await callOR(m.id, prompt, { maxTokens: 1200, temperature: 0.3, timeoutMs: 40000 });
    if (ans) onPanel(m.name, ans.slice(0, 160));
    return { model: m.name, answer: ans || '' };
  }));
  return results.filter(r => r.answer.trim().length > 0);
}

// ============= SYNTHESIZER =============
export async function synthesize(question: string, panel: { model: string; answer: string }[], sources: Source[], arithmetic: string | null): Promise<string> {
  if (panel.length === 0) return 'I could not generate a verified answer at this time. Please try again.';
  if (panel.length === 1) return panel[0].answer;

  const prompt = `You are the synthesis judge. Three expert AI models answered the same question. Produce the BEST single answer by:
- Keeping facts that ALL models agree on
- Resolving disagreements by preferring the more specific, well-reasoned answer
- Discarding any hallucinated or unsupported claims
- Keeping the answer concise, clear, and well-formatted in markdown

Question: ${question}

${arithmetic ? `Verified arithmetic: ${arithmetic}\n\n` : ''}${sources.length ? `Reference snippets:\n${sources.map(s => `- ${s.title}: ${s.snippet}`).join('\n')}\n\n` : ''}--- MODEL ANSWERS ---
${panel.map(p => `## ${p.model}\n${p.answer}`).join('\n\n')}
--- END ---

Output ONLY the final synthesized answer (no preamble like "Here is the answer"). Use markdown.`;

  const out = await callOR(MODEL_JUDGE, prompt, { maxTokens: 1800, temperature: 0.2, timeoutMs: 45000 });
  return out || panel[0].answer;
}

// ============= VERIFIER =============
export async function verifyClaims(answer: string, sources: Source[]): Promise<{ verdict: 'verified' | 'unverified' | 'unknown'; claims: ClaimCheck[] }> {
  const prompt = `You are a fact-checker. Extract up to 5 of the most important factual claims from this answer, then judge each as "supported", "unsupported", or "unclear" based ONLY on whether it is well-established knowledge or supported by the provided sources.

${sources.length ? `Sources:\n${sources.map(s => `- ${s.title}: ${s.snippet}`).join('\n')}\n\n` : ''}Answer to check:
"""${answer.slice(0, 4000)}"""

Output STRICT JSON: {"verdict":"verified"|"unverified"|"unknown","claims":[{"claim":"...","verdict":"supported"|"unsupported"|"unclear","note":"short"}]}
- "verified" if most key claims are supported
- "unverified" if any key claim appears wrong
- "unknown" if you cannot tell`;

  const raw = await callOR(MODEL_VERIFIER, prompt, { maxTokens: 700, temperature: 0, jsonMode: true, timeoutMs: 15000 });
  const parsed = parseJSON<{ verdict?: string; claims?: ClaimCheck[] }>(raw, { verdict: 'unknown', claims: [] });
  const verdict = (parsed.verdict === 'verified' || parsed.verdict === 'unverified') ? parsed.verdict : 'unknown';
  return { verdict: verdict as any, claims: (parsed.claims || []).slice(0, 5) };
}

// ============= FAST PATH (single model) =============
export async function fastAnswer(question: string, system?: string): Promise<string> {
  const out = await callOR('google/gemini-2.5-flash', question, { maxTokens: 1500, temperature: 0.4, system, timeoutMs: 25000 });
  return out || 'I could not generate an answer right now. Please try again.';
}

// ============= ORCHESTRATOR =============
export type RunOptions = {
  question: string;
  hasImage?: boolean;
  manualDeepThink?: boolean;
  forceFastMode?: boolean;
  systemPrompt?: string;
  onEvent: (e: EngineEvent) => void;
};

export async function runReasoning(opts: RunOptions): Promise<{ content: string; verified: 'verified' | 'unverified' | 'unknown'; mode: 'fast' | 'deep'; sources: Source[]; claims: ClaimCheck[] }> {
  const { question, hasImage = false, manualDeepThink = false, forceFastMode = false, systemPrompt, onEvent } = opts;

  const stage = (id: string, label: string, status: Stage['status'], detail?: string) =>
    onEvent({ type: 'stage', stage: { id, label, status, detail } });

  // Stage 1: Route
  stage('route', 'Analyzing question', 'active');
  let decision: RouteDecision;
  if (forceFastMode) {
    decision = { mode: 'fast', needsRetrieval: false, isMath: false, reason: 'quota_capped_fast' };
  } else {
    try {
      decision = await routeQuestion(question, hasImage, manualDeepThink);
    } catch (e: any) {
      decision = { mode: 'fast', needsRetrieval: false, isMath: false, reason: 'router_error' };
    }
  }
  stage('route', `Mode: ${decision.mode === 'deep' ? 'Deep Think' : 'Fast'}`, 'done', decision.reason);

  // FAST PATH
  if (decision.mode === 'fast') {
    stage('answer', 'Generating answer', 'active');
    const content = await fastAnswer(question, systemPrompt);
    stage('answer', 'Answer ready', 'done');
    onEvent({ type: 'done', content, verified: 'unknown', mode: 'fast', sources: [], claims: [] });
    return { content, verified: 'unknown', mode: 'fast', sources: [], claims: [] };
  }

  // DEEP PATH
  // Stage 2: Plan + Retrieve in parallel
  stage('plan', 'Planning sub-questions', 'active');
  stage('retrieve', 'Searching live sources', 'active');

  const [subQs, retrieved] = await Promise.all([
    planSubQuestions(question).catch(() => [question]),
    decision.needsRetrieval ? retrieve(question, decision.isMath) : Promise.resolve({ sources: [] as Source[], arithmetic: decision.isMath ? evalArithmetic(question) : null }),
  ]);

  stage('plan', `${subQs.length} sub-question${subQs.length === 1 ? '' : 's'}`, 'done', subQs.slice(0, 3).join(' • '));
  stage('retrieve', `${retrieved.sources.length} source${retrieved.sources.length === 1 ? '' : 's'}${retrieved.arithmetic ? ' + math verified' : ''}`, 'done');
  if (retrieved.sources.length) onEvent({ type: 'sources', sources: retrieved.sources });

  // Stage 3: Panel
  stage('panel', 'Asking 3 expert AI models in parallel', 'active');
  const ctxParts: string[] = [];
  if (retrieved.arithmetic) ctxParts.push(`Verified arithmetic: ${retrieved.arithmetic}`);
  if (retrieved.sources.length) ctxParts.push('Sources:\n' + retrieved.sources.map(s => `- ${s.title}: ${s.snippet}`).join('\n'));
  const context = ctxParts.join('\n\n');

  const panel = await panelAnswer(question, subQs, context, (m, p) => onEvent({ type: 'panel', model: m, preview: p }));
  if (panel.length === 0) {
    stage('panel', 'All models failed — falling back', 'error');
    const content = await fastAnswer(question, systemPrompt);
    onEvent({ type: 'done', content, verified: 'unknown', mode: 'fast', sources: retrieved.sources, claims: [] });
    return { content, verified: 'unknown', mode: 'fast', sources: retrieved.sources, claims: [] };
  }
  stage('panel', `${panel.length} model answer${panel.length === 1 ? '' : 's'} received`, 'done');

  // Stage 4: Synthesize
  stage('synth', 'Synthesizing best answer', 'active');
  const finalAnswer = await synthesize(question, panel, retrieved.sources, retrieved.arithmetic);
  stage('synth', 'Synthesis complete', 'done');

  // Stage 5: Verify
  stage('verify', 'Fact-checking claims', 'active');
  const { verdict, claims } = await verifyClaims(finalAnswer, retrieved.sources).catch(() => ({ verdict: 'unknown' as const, claims: [] }));
  stage('verify', verdict === 'verified' ? 'All key claims verified' : verdict === 'unverified' ? 'Some claims flagged' : 'Verification inconclusive', 'done');

  onEvent({ type: 'done', content: finalAnswer, verified: verdict, mode: 'deep', sources: retrieved.sources, claims });
  return { content: finalAnswer, verified: verdict, mode: 'deep', sources: retrieved.sources, claims };
}

// ============= QUOTAS =============
export const DEEP_QUOTA: Record<string, number> = {
  free: 3,
  pro: 25,
  research: 200,
  enterprise: -1,
  owner: -1,
};

export function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}
