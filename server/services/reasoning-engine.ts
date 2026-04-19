/**
 * TurboAnswer Reasoning Engine (TRE)
 * Auto-routes between fast / retrieval-only / deep multi-model reasoning.
 * Streams progress via onEvent callback. Billing through OpenRouter.
 */
import { retrieveSources as retrieveSourcesMulti } from './retrievers';

const OR_KEY = () => process.env.OPENROUTER_API_KEY || '';
const OR_URL = 'https://openrouter.ai/api/v1/chat/completions';

const MODEL_ROUTER = 'google/gemini-2.5-flash';
const MODEL_PLANNER = 'google/gemini-2.5-flash';
const MODEL_PANEL = [
  { id: 'google/gemini-2.5-pro', name: 'Matrix Core α', costPer1k: 0.005 },
  { id: 'anthropic/claude-sonnet-4.5', name: 'Matrix Core β', costPer1k: 0.015 },
  { id: 'openai/gpt-4o', name: 'Matrix Core γ', costPer1k: 0.015 },
];
const MODEL_JUDGE = 'anthropic/claude-sonnet-4.5';
const MODEL_VERIFIER = 'google/gemini-2.5-flash';
const MODEL_DEBATE = 'google/gemini-2.5-flash';

const COST_CEILING_USD = 0.30;

export type Stage = {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'done' | 'skipped' | 'error';
  detail?: string;
};

export type Source = { title: string; url: string; snippet: string; publishedAt?: string | null };
export type ClaimCheck = { claim: string; verdict: 'supported' | 'unsupported' | 'unclear' | 'contested'; note?: string; sourceIdx?: number };

export type EngineEvent =
  | { type: 'stage'; stage: Stage }
  | { type: 'sources'; sources: Source[] }
  | { type: 'panel'; model: string; preview: string }
  | { type: 'chunk'; text: string }
  | { type: 'done'; content: string; verified: 'verified' | 'unverified' | 'unknown'; mode: 'fast' | 'retrieval' | 'deep'; sources: Source[]; claims: ClaimCheck[]; confidence: number }
  | { type: 'error'; message: string }
  | { type: 'quota'; tier: string; used: number; limit: number; fellBackToFast: boolean };

export type RouteDecision = {
  mode: 'fast' | 'retrieval' | 'deep';
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
  } catch { return fallback; }
}

// ============= ROUTER =============
export async function routeQuestion(question: string, hasImage: boolean, manualDeepThink: boolean): Promise<RouteDecision> {
  if (manualDeepThink) {
    return { mode: 'deep', needsRetrieval: true, isMath: /\d.*[+\-*/=].*\d|\bcalculate\b|\bsolve\b/i.test(question), reason: 'manual_override' };
  }
  if (hasImage) return { mode: 'fast', needsRetrieval: false, isMath: false, reason: 'image_query' };

  const prompt = `Classify this user question. Output STRICT JSON only:
{"mode":"fast"|"retrieval"|"deep","needs_retrieval":true|false,"is_math":true|false,"reason":"short"}

- "fast": casual chat, simple Q&A, single fact one model knows, code snippets, creative writing without research
- "retrieval": single factual lookup but it requires CURRENT info or a citation (recent events, specific dates, statistics, prices, scores)
- "deep": multi-step reasoning, comparison, synthesis, controversial topics, multi-part questions, accuracy-critical (medical/legal/financial/scientific)

Question: """${question.slice(0, 1500)}"""`;

  const raw = await callOR(MODEL_ROUTER, prompt, { maxTokens: 200, temperature: 0, jsonMode: true, timeoutMs: 8000 });
  const parsed = parseJSON<{ mode?: string; needs_retrieval?: boolean; is_math?: boolean; reason?: string }>(raw, {});
  const mode = (parsed.mode === 'deep' || parsed.mode === 'retrieval') ? parsed.mode : 'fast';
  return {
    mode: mode as RouteDecision['mode'],
    needsRetrieval: parsed.needs_retrieval !== false && (mode === 'deep' || mode === 'retrieval'),
    isMath: !!parsed.is_math,
    reason: parsed.reason || 'auto',
  };
}

// ============= SAFE MATH EVALUATOR (shunting-yard, no eval) =============
type Tok = { t: 'num' | 'op' | 'lp' | 'rp'; v: string };
const PREC: Record<string, number> = { '+': 1, '-': 1, '*': 2, '/': 2, '%': 2, '^': 3 };
const RIGHT_ASSOC = new Set(['^']);

function tokenize(expr: string): Tok[] | null {
  const out: Tok[] = [];
  let i = 0;
  let prevWasOp = true; // track for unary minus
  while (i < expr.length) {
    const c = expr[i];
    if (c === ' ') { i++; continue; }
    if (/[\d.]/.test(c)) {
      let j = i;
      while (j < expr.length && /[\d.]/.test(expr[j])) j++;
      const numStr = expr.slice(i, j);
      if ((numStr.match(/\./g) || []).length > 1) return null;
      out.push({ t: 'num', v: numStr });
      i = j;
      prevWasOp = false;
    } else if (c === '(') {
      out.push({ t: 'lp', v: '(' }); i++; prevWasOp = true;
    } else if (c === ')') {
      out.push({ t: 'rp', v: ')' }); i++; prevWasOp = false;
    } else if ('+-*/%^'.includes(c)) {
      if (c === '-' && prevWasOp) {
        // unary minus -> push 0 then -
        out.push({ t: 'num', v: '0' });
      }
      out.push({ t: 'op', v: c });
      i++; prevWasOp = true;
    } else {
      return null;
    }
  }
  return out;
}

function shuntingYard(toks: Tok[]): Tok[] | null {
  const out: Tok[] = [];
  const ops: Tok[] = [];
  for (const tok of toks) {
    if (tok.t === 'num') out.push(tok);
    else if (tok.t === 'op') {
      while (ops.length) {
        const top = ops[ops.length - 1];
        if (top.t === 'op' && (
          PREC[top.v] > PREC[tok.v] ||
          (PREC[top.v] === PREC[tok.v] && !RIGHT_ASSOC.has(tok.v))
        )) {
          out.push(ops.pop()!);
        } else break;
      }
      ops.push(tok);
    } else if (tok.t === 'lp') ops.push(tok);
    else if (tok.t === 'rp') {
      while (ops.length && ops[ops.length - 1].t !== 'lp') out.push(ops.pop()!);
      if (!ops.length) return null;
      ops.pop();
    }
  }
  while (ops.length) {
    const top = ops.pop()!;
    if (top.t === 'lp' || top.t === 'rp') return null;
    out.push(top);
  }
  return out;
}

function evalRPN(rpn: Tok[]): number | null {
  const st: number[] = [];
  let steps = 0;
  for (const t of rpn) {
    if (++steps > 1000) return null;
    if (t.t === 'num') st.push(parseFloat(t.v));
    else if (t.t === 'op') {
      const b = st.pop(); const a = st.pop();
      if (a === undefined || b === undefined) return null;
      let r: number;
      switch (t.v) {
        case '+': r = a + b; break;
        case '-': r = a - b; break;
        case '*': r = a * b; break;
        case '/': if (b === 0) return null; r = a / b; break;
        case '%': if (b === 0) return null; r = a % b; break;
        case '^': r = Math.pow(a, b); break;
        default: return null;
      }
      if (!isFinite(r) || Math.abs(r) > 1e18) return null;
      st.push(r);
    }
  }
  return st.length === 1 ? st[0] : null;
}

export function safeEvalMath(expr: string): number | null {
  if (expr.length > 200) return null;
  const toks = tokenize(expr);
  if (!toks || toks.length === 0) return null;
  const rpn = shuntingYard(toks);
  if (!rpn) return null;
  return evalRPN(rpn);
}

function evalArithmetic(q: string): string | null {
  const matches = q.match(/[\d.]+(?:\s*[+\-*/^%(),\s\d.]+)+/g);
  if (!matches) return null;
  for (const expr of matches) {
    const cleaned = expr.replace(/,/g, '').trim();
    if (cleaned.length < 3 || !/[+\-*/^%]/.test(cleaned)) continue;
    const v = safeEvalMath(cleaned);
    if (v !== null) {
      const display = Number.isInteger(v) ? String(v) : v.toFixed(6).replace(/\.?0+$/, '');
      return `${cleaned.replace(/\s+/g, '')} = ${display}`;
    }
  }
  return null;
}

// ============= RETRIEVAL =============
export async function retrieve(question: string, isMath: boolean): Promise<{ sources: Source[]; arithmetic: string | null }> {
  const sources = await retrieveSourcesMulti(question, { limit: 6, perProviderLimit: 3 });
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

// ============= PANEL =============
function buildPanelPrompt(question: string, subQs: string[], context: string): string {
  return `You are a careful expert. Answer the user's question with maximum accuracy.

${context ? `Reference material (may help, may be incomplete):\n${context}\n\n` : ''}${subQs.length > 1 ? `Sub-questions to address:\n${subQs.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\n` : ''}User question: ${question}

Rules:
- Be concise but complete. Use markdown.
- If you are uncertain about a fact, explicitly say so.
- Do NOT fabricate citations. Only cite if you actually know the source.
- If math is involved, show steps.`;
}

export async function panelAnswer(question: string, subQs: string[], context: string, modelIds: { id: string; name: string }[], onPanel: (model: string, preview: string) => void): Promise<{ model: string; answer: string }[]> {
  const prompt = buildPanelPrompt(question, subQs, context);
  const results = await Promise.all(modelIds.map(async m => {
    const ans = await callOR(m.id, prompt, { maxTokens: 1200, temperature: 0.3, timeoutMs: 40000 });
    if (ans) onPanel(m.name, ans.slice(0, 160));
    return { model: m.name, answer: ans || '' };
  }));
  return results.filter(r => r.answer.trim().length > 0);
}

// ============= DEBATE / CROSS-CRITIQUE =============
export async function debate(question: string, panel: { model: string; answer: string }[]): Promise<{ agreements: string[]; disagreements: string[]; consensusScore: number }> {
  if (panel.length < 2) return { agreements: [], disagreements: [], consensusScore: 0.5 };
  const prompt = `Three expert AI models answered the same question. Identify points of AGREEMENT (claims that 2 or more models support) and DISAGREEMENT (claims where models differ). Output STRICT JSON:
{"agreements":["fact 1 supported by 2+ models","..."], "disagreements":["claim X — Model A says Y, Model B says Z"], "consensus_score": 0.0-1.0}

consensus_score = fraction of key claims with 2/3+ agreement.

Question: ${question}

${panel.map(p => `## ${p.model}\n${p.answer.slice(0, 1500)}`).join('\n\n')}`;
  const raw = await callOR(MODEL_DEBATE, prompt, { maxTokens: 800, temperature: 0.1, jsonMode: true, timeoutMs: 20000 });
  const parsed = parseJSON<{ agreements?: string[]; disagreements?: string[]; consensus_score?: number }>(raw, {});
  return {
    agreements: parsed.agreements || [],
    disagreements: parsed.disagreements || [],
    consensusScore: typeof parsed.consensus_score === 'number' ? Math.max(0, Math.min(1, parsed.consensus_score)) : 0.5,
  };
}

// ============= SYNTHESIZER (with 2/3 consensus gating + [contested]) =============
export async function synthesize(question: string, panel: { model: string; answer: string }[], sources: Source[], arithmetic: string | null, debateOut: { agreements: string[]; disagreements: string[] }): Promise<string> {
  if (panel.length === 0) return 'I could not generate a verified answer at this time. Please try again.';
  if (panel.length === 1) return panel[0].answer;

  const prompt = `You are the synthesis judge. Three expert AI models answered. Produce the BEST single answer following STRICT rules:

CONSENSUS GATING (critical):
- Only assert a factual claim as fact if AT LEAST 2 of 3 models support it.
- For a claim where models disagree, wrap it in "[contested]" tags like: "[contested] X may be Y or Z [/contested]" and briefly explain the disagreement.
- Discard claims supported by only 1 model unless clearly verifiable from the provided sources.

Question: ${question}

${arithmetic ? `Verified arithmetic: ${arithmetic}\n\n` : ''}${sources.length ? `Reference snippets:\n${sources.map((s, i) => `[${i + 1}] ${s.title}: ${s.snippet}`).join('\n')}\n\n` : ''}${debateOut.agreements.length ? `AGREED FACTS (2/3+ consensus):\n${debateOut.agreements.map(a => '- ' + a).join('\n')}\n\n` : ''}${debateOut.disagreements.length ? `DISAGREEMENTS:\n${debateOut.disagreements.map(d => '- ' + d).join('\n')}\n\n` : ''}--- MODEL ANSWERS ---
${panel.map(p => `## ${p.model}\n${p.answer}`).join('\n\n')}
--- END ---

Output ONLY the final synthesized answer in markdown. Where you cite a source, use inline markers like [1] [2] matching the reference numbers. Keep [contested] tags around disputed claims.`;

  const out = await callOR(MODEL_JUDGE, prompt, { maxTokens: 1800, temperature: 0.2, timeoutMs: 45000 });
  return out || panel[0].answer;
}

// ============= VERIFIER (sentence-level [unverified] marking + confidence) =============
export async function verifyAndMark(answer: string, sources: Source[]): Promise<{ verdict: 'verified' | 'unverified' | 'unknown'; claims: ClaimCheck[]; markedAnswer: string; confidence: number }> {
  const prompt = `You are a strict fact-checker. Extract up to 6 of the most important factual claims from this answer, judge each, and decide which sentences (if any) need an "[unverified]" or "[contested]" inline tag inserted.

${sources.length ? `Sources:\n${sources.map((s, i) => `[${i + 1}] ${s.title} (${s.publishedAt || 'no date'}): ${s.snippet}`).join('\n')}\n\n` : ''}Answer to check:
"""${answer.slice(0, 4000)}"""

Output STRICT JSON:
{
  "verdict": "verified" | "unverified" | "unknown",
  "confidence": 0-100,
  "claims": [{"claim": "...", "verdict": "supported"|"unsupported"|"unclear"|"contested", "note": "short", "source_idx": 1}],
  "sentences_to_mark": [{"sentence_substring": "exact substring from answer", "tag": "unverified"|"contested"}]
}

- "verified" + confidence 80-100 if every key claim is supported.
- "unverified" + confidence 0-50 if any key claim is unsupported.
- "unknown" + confidence 50-70 if you cannot tell.
- confidence reflects your overall trust in the answer.`;

  const raw = await callOR(MODEL_VERIFIER, prompt, { maxTokens: 900, temperature: 0, jsonMode: true, timeoutMs: 18000 });
  const parsed = parseJSON<{ verdict?: string; confidence?: number; claims?: ClaimCheck[]; sentences_to_mark?: { sentence_substring?: string; tag?: string }[] }>(raw, {});
  const verdict: 'verified' | 'unverified' | 'unknown' =
    parsed.verdict === 'verified' ? 'verified'
    : parsed.verdict === 'unverified' ? 'unverified'
    : 'unknown';
  const claims = (parsed.claims || []).slice(0, 6);
  const confidence = typeof parsed.confidence === 'number' ? Math.max(0, Math.min(100, Math.round(parsed.confidence))) : (verdict === 'verified' ? 85 : verdict === 'unverified' ? 35 : 60);

  // Apply inline markings
  let markedAnswer = answer;
  for (const m of parsed.sentences_to_mark || []) {
    if (!m.sentence_substring || !m.tag) continue;
    const sub = m.sentence_substring.slice(0, 200);
    const tag = m.tag === 'contested' ? '[contested]' : '[unverified]';
    if (markedAnswer.includes(sub) && !markedAnswer.includes(`${tag} ${sub.slice(0, 30)}`)) {
      markedAnswer = markedAnswer.replace(sub, `${tag} ${sub}`);
    }
  }

  return { verdict, claims, markedAnswer, confidence };
}

// ============= FAST PATH =============
export async function fastAnswer(question: string, system?: string): Promise<string> {
  const out = await callOR('google/gemini-2.5-flash', question, { maxTokens: 1500, temperature: 0.4, system, timeoutMs: 25000 });
  return out || 'I could not generate an answer right now. Please try again.';
}

// ============= RETRIEVAL-ONLY PATH =============
export async function retrievalAnswer(question: string, sources: Source[], system?: string): Promise<string> {
  const ctx = sources.length
    ? `Use these sources (cite as [1], [2], ...):\n${sources.map((s, i) => `[${i + 1}] ${s.title}${s.publishedAt ? ` (${s.publishedAt})` : ''}: ${s.snippet}`).join('\n')}\n\n`
    : '';
  const out = await callOR('google/gemini-2.5-flash', `${ctx}Question: ${question}\n\nAnswer concisely with inline citations like [1].`, { maxTokens: 1200, temperature: 0.2, system, timeoutMs: 25000 });
  return out || 'I could not retrieve enough information to answer reliably.';
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

function estimateRunCost(panelSize: number, withDebate: boolean, questionTokens: number, subQCount: number, contextTokens: number): number {
  // Per-model: input (system + question + sub-questions + context) + output
  const inputKtoks = (questionTokens + subQCount * 30 + contextTokens + 200) / 1000;
  const outputKtoks = 1.5; // ~1500 tok answer per model
  const panelCost = MODEL_PANEL.slice(0, panelSize).reduce((a, m) => a + m.costPer1k * (inputKtoks + outputKtoks), 0);
  const synthInputK = (panelSize * outputKtoks * 1000 + contextTokens + 300) / 1000;
  const synthCost = 0.015 * (synthInputK + 1.8);
  const verifyCost = 0.005 * (outputKtoks + contextTokens / 1000 + 0.9);
  const debateCost = withDebate ? 0.005 * (panelSize * outputKtoks + 0.8) : 0;
  return panelCost + synthCost + verifyCost + debateCost;
}

function approxTokens(s: string): number {
  return Math.ceil(s.length / 4);
}

export async function runReasoning(opts: RunOptions): Promise<{ content: string; verified: 'verified' | 'unverified' | 'unknown'; mode: 'fast' | 'retrieval' | 'deep'; sources: Source[]; claims: ClaimCheck[]; confidence: number }> {
  const { question, hasImage = false, manualDeepThink = false, forceFastMode = false, systemPrompt, onEvent } = opts;
  const stage = (id: string, label: string, status: Stage['status'], detail?: string) =>
    onEvent({ type: 'stage', stage: { id, label, status, detail } });

  // Stage 1: Route
  stage('route', 'Analyzing question', 'active');
  let decision: RouteDecision;
  if (forceFastMode) {
    decision = { mode: 'fast', needsRetrieval: false, isMath: false, reason: 'quota_capped_fast' };
  } else {
    try { decision = await routeQuestion(question, hasImage, manualDeepThink); }
    catch { decision = { mode: 'fast', needsRetrieval: false, isMath: false, reason: 'router_error' }; }
  }
  stage('route', `Mode: ${decision.mode === 'deep' ? 'Deep Think' : decision.mode === 'retrieval' ? 'Retrieval' : 'Fast'}`, 'done', decision.reason);

  // FAST PATH
  if (decision.mode === 'fast') {
    stage('answer', 'Generating answer', 'active');
    const content = await fastAnswer(question, systemPrompt);
    stage('answer', 'Answer ready', 'done');
    onEvent({ type: 'done', content, verified: 'unknown', mode: 'fast', sources: [], claims: [], confidence: 70 });
    return { content, verified: 'unknown', mode: 'fast', sources: [], claims: [], confidence: 70 };
  }

  // RETRIEVAL-ONLY PATH
  if (decision.mode === 'retrieval') {
    stage('retrieve', 'Searching live sources', 'active');
    const retrieved = await retrieve(question, decision.isMath);
    stage('retrieve', `${retrieved.sources.length} source${retrieved.sources.length === 1 ? '' : 's'}${retrieved.arithmetic ? ' + math verified' : ''}`, 'done');
    if (retrieved.sources.length) onEvent({ type: 'sources', sources: retrieved.sources });
    stage('answer', 'Answering with citations', 'active');
    const content = await retrievalAnswer(question, retrieved.sources, systemPrompt);
    stage('answer', 'Answer ready', 'done');
    stage('verify', 'Fact-checking claims', 'active');
    const ver = await verifyAndMark(content, retrieved.sources).catch(() => ({ verdict: 'unknown' as const, claims: [], markedAnswer: content, confidence: 60 }));
    stage('verify', ver.verdict === 'verified' ? `Verified (${ver.confidence}%)` : ver.verdict === 'unverified' ? `Some claims flagged (${ver.confidence}%)` : `Inconclusive (${ver.confidence}%)`, 'done');
    onEvent({ type: 'done', content: ver.markedAnswer, verified: ver.verdict, mode: 'retrieval', sources: retrieved.sources, claims: ver.claims, confidence: ver.confidence });
    return { content: ver.markedAnswer, verified: ver.verdict, mode: 'retrieval', sources: retrieved.sources, claims: ver.claims, confidence: ver.confidence };
  }

  // DEEP PATH
  stage('plan', 'Planning sub-questions', 'active');
  stage('retrieve', 'Searching live sources', 'active');
  const [subQs, retrieved] = await Promise.all([
    planSubQuestions(question).catch(() => [question]),
    decision.needsRetrieval ? retrieve(question, decision.isMath) : Promise.resolve({ sources: [] as Source[], arithmetic: decision.isMath ? evalArithmetic(question) : null }),
  ]);
  stage('plan', `${subQs.length} sub-question${subQs.length === 1 ? '' : 's'}`, 'done', subQs.slice(0, 3).join(' • '));
  stage('retrieve', `${retrieved.sources.length} source${retrieved.sources.length === 1 ? '' : 's'}${retrieved.arithmetic ? ' + math verified' : ''}`, 'done');
  if (retrieved.sources.length) onEvent({ type: 'sources', sources: retrieved.sources });

  const ctxParts: string[] = [];
  if (retrieved.arithmetic) ctxParts.push(`Verified arithmetic: ${retrieved.arithmetic}`);
  if (retrieved.sources.length) ctxParts.push('Sources:\n' + retrieved.sources.map((s, i) => `[${i + 1}] ${s.title}${s.publishedAt ? ` (${s.publishedAt})` : ''}: ${s.snippet}`).join('\n'));
  const context = ctxParts.join('\n\n');

  // Cost ceiling: now context-aware. Drop one model + skip debate if over budget.
  const qTok = approxTokens(question);
  const ctxTok = approxTokens(context);
  let panelModels = MODEL_PANEL;
  let runDebate = true;
  let estCost = estimateRunCost(panelModels.length, runDebate, qTok, subQs.length, ctxTok);
  if (estCost > COST_CEILING_USD) {
    panelModels = MODEL_PANEL.slice(0, 2);
    runDebate = false;
    estCost = estimateRunCost(panelModels.length, runDebate, qTok, subQs.length, ctxTok);
    stage('budget', `Cost ceiling hit ($${estCost.toFixed(2)} est) — dropped 1 model + skipped debate`, 'done');
  }

  stage('panel', `Asking ${panelModels.length} expert AI models in parallel`, 'active');
  const panel = await panelAnswer(question, subQs, context, panelModels, (m, p) => onEvent({ type: 'panel', model: m, preview: p }));
  if (panel.length === 0) {
    stage('panel', 'All models failed — falling back', 'error');
    const content = await fastAnswer(question, systemPrompt);
    onEvent({ type: 'done', content, verified: 'unknown', mode: 'fast', sources: retrieved.sources, claims: [], confidence: 50 });
    return { content, verified: 'unknown', mode: 'fast', sources: retrieved.sources, claims: [], confidence: 50 };
  }
  stage('panel', `${panel.length} model answer${panel.length === 1 ? '' : 's'} received`, 'done');

  // Debate
  let debateOut = { agreements: [] as string[], disagreements: [] as string[], consensusScore: 0.5 };
  if (runDebate && panel.length >= 2) {
    stage('debate', 'Cross-critique: finding consensus & conflicts', 'active');
    debateOut = await debate(question, panel).catch(() => debateOut);
    stage('debate', `Consensus ${Math.round(debateOut.consensusScore * 100)}% • ${debateOut.disagreements.length} conflict${debateOut.disagreements.length === 1 ? '' : 's'}`, 'done');
  } else {
    stage('debate', 'Skipped (cost ceiling)', 'skipped');
  }

  // Synthesize
  stage('synth', 'Synthesizing best answer (2/3 consensus gating)', 'active');
  const finalAnswer = await synthesize(question, panel, retrieved.sources, retrieved.arithmetic, debateOut);
  stage('synth', 'Synthesis complete', 'done');

  // Verify + sentence-level marking
  stage('verify', 'Fact-checking claims', 'active');
  const ver = await verifyAndMark(finalAnswer, retrieved.sources).catch(() => ({ verdict: 'unknown' as const, claims: [], markedAnswer: finalAnswer, confidence: 60 }));
  // Adjust confidence by consensus
  const adjustedConfidence = Math.round(ver.confidence * (0.7 + 0.3 * debateOut.consensusScore));
  stage('verify', ver.verdict === 'verified' ? `Verified (${adjustedConfidence}%)` : ver.verdict === 'unverified' ? `Some claims flagged (${adjustedConfidence}%)` : `Inconclusive (${adjustedConfidence}%)`, 'done');

  onEvent({ type: 'done', content: ver.markedAnswer, verified: ver.verdict, mode: 'deep', sources: retrieved.sources, claims: ver.claims, confidence: adjustedConfidence });
  return { content: ver.markedAnswer, verified: ver.verdict, mode: 'deep', sources: retrieved.sources, claims: ver.claims, confidence: adjustedConfidence };
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
