/**
 * TurboAnswer Reasoning Engine (TRE)
 * Auto-routes between fast / retrieval-only / deep multi-model reasoning.
 * Streams progress via onEvent callback.
 *
 * The entire text engine runs EXCLUSIVELY on Anthropic Claude (direct API, or
 * Azure-hosted Claude) via direct-router.ts. There are NO non-Claude fallbacks:
 * if Claude fails, calls fail loudly. Model IDs keep their "provider/model"
 * prefix for backwards compatibility — the router maps every id to a Claude
 * model by tier.
 */
import { retrieveSources as retrieveSourcesMulti } from './retrievers';
import { callDirect, callDirectStream, type Message } from './direct-router';

const MODEL_ROUTER = 'anthropic/claude-haiku';
const MODEL_PLANNER = 'anthropic/claude-haiku';
// Verification panel: 3 strongest brands, all routed direct. Dropped x-ai/grok-4
// and deepseek/deepseek-r1 (no direct keys + DeepSeek R1 was the slow link).
// Three independent models is enough for quorum-of-2 verification while halving
// panel latency vs the old 5-model setup.
const MODEL_PANEL = [
  { id: 'anthropic/claude-opus-4-1', name: 'Matrix Core α', costPer1k: 0.015 },
  { id: 'anthropic/claude-sonnet-4.5', name: 'Matrix Core β', costPer1k: 0.015 },
  { id: 'anthropic/claude-haiku', name: 'Matrix Core γ', costPer1k: 0.005 },
];
const MODEL_JUDGE = 'anthropic/claude-opus-4-1';
const MODEL_VERIFIER = 'anthropic/claude-haiku';
const MODEL_DEBATE = 'anthropic/claude-haiku';

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
  | { type: 'route'; mode: 'fast' | 'retrieval' | 'deep'; autoDowngraded: boolean; reason: string }
  | { type: 'done'; content: string; verified: 'verified' | 'unverified' | 'unknown'; mode: 'fast' | 'retrieval' | 'deep'; sources: Source[]; claims: ClaimCheck[]; confidence: number }
  | { type: 'error'; message: string }
  | { type: 'quota'; tier: string; used: number; limit: number; fellBackToFast: boolean };

export type RouteDecision = {
  mode: 'fast' | 'retrieval' | 'deep';
  needsRetrieval: boolean;
  isMath: boolean;
  reason: string;
};

export type ChatTurn = { role: 'user' | 'assistant'; content: string };

// Thin wrapper that builds the messages array and dispatches via the direct
// router, which always resolves to a Claude model.
async function callOR(
  model: string,
  prompt: string,
  opts: { maxTokens?: number; temperature?: number; jsonMode?: boolean; system?: string; timeoutMs?: number; history?: ChatTurn[]; onProviderError?: (detail: string) => void } = {}
): Promise<string | null> {
  const messages: Message[] = [];
  if (opts.system) messages.push({ role: 'system', content: opts.system });
  if (opts.history?.length) {
    for (const h of opts.history) {
      if (h && (h.role === 'user' || h.role === 'assistant') && typeof h.content === 'string' && h.content.trim()) {
        messages.push({ role: h.role, content: h.content });
      }
    }
  }
  messages.push({ role: 'user', content: prompt });
  return callDirect(model, messages, {
    maxTokens: opts.maxTokens,
    temperature: opts.temperature,
    jsonMode: opts.jsonMode,
    timeoutMs: opts.timeoutMs ?? 45000,
    onProviderError: opts.onProviderError,
  });
}

function parseJSON<T>(s: string | null, fallback: T): T {
  if (!s) return fallback;
  try {
    const m = s.match(/\{[\s\S]*\}/);
    return JSON.parse(m ? m[0] : s) as T;
  } catch { return fallback; }
}

// ============= ROUTER =============
// Trivial-message fast-path: skip the LLM router entirely for greetings,
// chit-chat, and ultra-short inputs. Saves 1-3s + a model call per "hi".
const TRIVIAL_RE = /^(hi+|hey+|hello+|yo+|sup|howdy|hola|salut|ciao|good\s*(morning|afternoon|evening|night)|gm|gn|thanks?|thank\s*you|ty|thx|ok(ay)?|cool|nice|great|awesome|lol|lmao|haha+|bye+|cya|see\s*ya|goodbye|👋|🙂|😊|test|testing|ping)[\s!.?,👋🙂😊]*$/i;
function isTrivial(q: string): boolean {
  const t = q.trim();
  if (!t) return true;
  if (TRIVIAL_RE.test(t)) return true;
  // Anything ≤ 18 chars with no question mark, no digits, no research keywords
  if (t.length <= 18 && !/[?]/.test(t) && !/\d/.test(t) && !/\b(why|how|what|when|where|who|which|explain|compare|vs|versus|prove|calculate|solve|cite|source)\b/i.test(t)) {
    return true;
  }
  return false;
}

export async function routeQuestion(question: string, hasImage: boolean, manualDeepThink: boolean): Promise<RouteDecision> {
  if (manualDeepThink) {
    return { mode: 'deep', needsRetrieval: true, isMath: /\d.*[+\-*/=].*\d|\bcalculate\b|\bsolve\b/i.test(question), reason: 'manual_override' };
  }
  if (hasImage) return { mode: 'fast', needsRetrieval: false, isMath: false, reason: 'image_query' };
  if (isTrivial(question)) return { mode: 'fast', needsRetrieval: false, isMath: false, reason: 'trivial_skip_router' };

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
  const prompt = `Break this question into 2-3 atomic sub-questions that, when answered together, fully address the original. Output STRICT JSON: {"subs":["...","..."]}.
If the question is already atomic, return one item.

Question: """${question.slice(0, 1200)}"""`;
  // Tighter budget: planner is on the critical path before the panel can fire.
  const raw = await callOR(MODEL_PLANNER, prompt, { maxTokens: 250, temperature: 0.2, jsonMode: true, timeoutMs: 6000 });
  const parsed = parseJSON<{ subs?: string[] }>(raw, { subs: [question] });
  const subs = (parsed.subs || []).filter(s => typeof s === 'string' && s.trim()).slice(0, 3);
  return subs.length ? subs : [question];
}

// ============= PANEL =============
function buildPanelPrompt(question: string, subQs: string[], context: string, system?: string): string {
  return `You are a careful expert. Answer the user's question with maximum accuracy.
${system ? `\n${system}\n` : ''}
${context ? `Reference material (may help, may be incomplete):\n${context}\n\n` : ''}${subQs.length > 1 ? `Sub-questions to address:\n${subQs.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\n` : ''}User question: ${question}

Rules:
- Be concise but complete. Use markdown.
- If you are uncertain about a fact, explicitly say so.
- Do NOT fabricate citations. Only cite if you actually know the source.
- If math is involved, show steps.`;
}

export async function panelAnswer(
  question: string,
  subQs: string[],
  context: string,
  modelIds: { id: string; name: string }[],
  onPanel: (model: string, preview: string) => void,
  opts: { quorum?: number; graceMs?: number; onQuorum?: (n: number) => void; system?: string } = {},
): Promise<{ model: string; answer: string }[]> {
  const prompt = buildPanelPrompt(question, subQs, context, opts.system);
  const quorum = opts.quorum ?? modelIds.length;     // default = wait for all (back-compat)
  const graceMs = opts.graceMs ?? 4000;
  const results: { model: string; answer: string }[] = [];

  return new Promise(resolve => {
    let resolved = false;
    let settled = 0;
    let graceTimer: ReturnType<typeof setTimeout> | null = null;
    const finish = () => {
      if (resolved) return;
      resolved = true;
      if (graceTimer) clearTimeout(graceTimer);
      resolve(results.filter(r => r.answer.trim().length > 0));
    };

    modelIds.forEach(m => {
      // Per-model timeout 20s — quorum + grace handles tail latency anyway.
      callOR(m.id, prompt, { maxTokens: 1200, temperature: 0.3, timeoutMs: 20000 })
        .then(ans => {
          if (ans && ans.trim()) {
            results.push({ model: m.name, answer: ans });
            onPanel(m.name, ans.slice(0, 160));
          }
        })
        .catch(() => {})
        .finally(() => {
          settled++;
          // All models settled — finish immediately.
          if (settled === modelIds.length) return finish();
          // Quorum reached — start grace window for stragglers.
          if (results.length >= quorum && !graceTimer) {
            opts.onQuorum?.(results.length);
            graceTimer = setTimeout(finish, graceMs);
          }
        });
    });
  });
}

// ============= DEBATE / CROSS-CRITIQUE =============
export async function debate(question: string, panel: { model: string; answer: string }[]): Promise<{ agreements: string[]; disagreements: string[]; consensusScore: number }> {
  if (panel.length < 2) return { agreements: [], disagreements: [], consensusScore: 0.5 };
  const prompt = `Three expert AI models answered the same question. Identify points of AGREEMENT (claims that 2 or more models support) and DISAGREEMENT (claims where models differ). Output STRICT JSON:
{"agreements":["fact 1 supported by 2+ models","..."], "disagreements":["claim X — Model A says Y, Model B says Z"], "consensus_score": 0.0-1.0}

consensus_score = fraction of key claims with 2/3+ agreement.

Question: ${question}

${panel.map(p => `## ${p.model}\n${p.answer.slice(0, 1500)}`).join('\n\n')}`;
  // Tighter debate budget: it sits between panel and synthesis on the critical path.
  const raw = await callOR(MODEL_DEBATE, prompt, { maxTokens: 400, temperature: 0.1, jsonMode: true, timeoutMs: 12000 });
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
${panel.map(p => `=== ${p.model} ===\n${p.answer}`).join('\n\n')}
--- END ---

Formatting rules — follow STRICTLY:
- Plain text only. NEVER use markdown: no **bold**, no *italic*, no # or ## headings, no \`backticks\`, no --- dividers.
- Short paragraphs separated by blank lines. Use a simple "- " dash for lists only when there are 3+ items.
- Lead with the answer. No filler, no recap of the question.
- Keep inline source markers [1] [2] and [contested]…[/contested] tags exactly as instructed — those are NOT markdown.`;

  const out = await callOR(MODEL_JUDGE, prompt, { maxTokens: 1800, temperature: 0.2, timeoutMs: 45000 });
  return out || panel[0].answer;
}

// Streaming version: emits onChunk(text) for each delta as the synthesis judge
// generates the answer. Returns the full accumulated string. Falls back to the
// non-streaming path if the streaming call returns nothing useful.
export async function synthesizeStream(
  question: string,
  panel: { model: string; answer: string }[],
  sources: Source[],
  arithmetic: string | null,
  debateOut: { agreements: string[]; disagreements: string[] },
  onChunk: (text: string) => void,
  system?: string,
): Promise<string> {
  if (panel.length === 0) return 'I could not generate a verified answer at this time. Please try again.';
  if (panel.length === 1) {
    onChunk(panel[0].answer);
    return panel[0].answer;
  }
  const prompt = `You are the synthesis judge. Three expert AI models answered. Produce the BEST single answer following STRICT rules:
${system ? `\n${system}\n` : ''}

CONSENSUS GATING (critical):
- Only assert a factual claim as fact if AT LEAST 2 of 3 models support it.
- For a claim where models disagree, wrap it in "[contested]" tags like: "[contested] X may be Y or Z [/contested]" and briefly explain the disagreement.
- Discard claims supported by only 1 model unless clearly verifiable from the provided sources.

Question: ${question}

${arithmetic ? `Verified arithmetic: ${arithmetic}\n\n` : ''}${sources.length ? `Reference snippets:\n${sources.map((s, i) => `[${i + 1}] ${s.title}: ${s.snippet}`).join('\n')}\n\n` : ''}${debateOut.agreements.length ? `AGREED FACTS (2/3+ consensus):\n${debateOut.agreements.map(a => '- ' + a).join('\n')}\n\n` : ''}${debateOut.disagreements.length ? `DISAGREEMENTS:\n${debateOut.disagreements.map(d => '- ' + d).join('\n')}\n\n` : ''}--- MODEL ANSWERS ---
${panel.map(p => `=== ${p.model} ===\n${p.answer}`).join('\n\n')}
--- END ---

Formatting rules — follow STRICTLY:
- Plain text only. NEVER use markdown: no **bold**, no *italic*, no # or ## headings, no \`backticks\`, no --- dividers.
- Short paragraphs separated by blank lines. Use a simple "- " dash for lists only when there are 3+ items.
- Lead with the answer. No filler, no recap of the question.
- Keep inline source markers [1] [2] and [contested]…[/contested] tags exactly as instructed — those are NOT markdown.`;

  let acc = '';
  const streamed = await callORStream(
    MODEL_JUDGE,
    prompt,
    { maxTokens: 1800, temperature: 0.2, timeoutMs: 45000 },
    (chunk) => { acc += chunk; onChunk(chunk); },
  );
  if (acc) return acc;
  // Streaming failed (provider didn't honor stream:true or all chunks dropped) — fall back
  if (streamed) {
    onChunk(streamed);
    return streamed;
  }
  const fallback = await callOR(MODEL_JUDGE, prompt, { maxTokens: 1800, temperature: 0.2, timeoutMs: 45000 });
  if (fallback) {
    onChunk(fallback);
    return fallback;
  }
  return panel[0].answer;
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

  // Tighter verifier budget: runs after synth and gates the final badge.
  const raw = await callOR(MODEL_VERIFIER, prompt, { maxTokens: 500, temperature: 0, jsonMode: true, timeoutMs: 10000 });
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

// Tier → Claude model. Free = Haiku (fast), Pro = Sonnet 4.5, Research /
// Enterprise / Owner = Opus (deepest). These three Claude models are the whole
// text engine; GPT/OpenAI is reserved strictly for image generation.
function claudeModelForTier(tier?: string): string {
  const t = (tier || 'free').toLowerCase();
  if (t === 'research' || t === 'enterprise' || t === 'owner') return 'anthropic/claude-opus-4-1';
  if (t === 'pro') return 'anthropic/claude-sonnet-4.5';
  return 'anthropic/claude-haiku';
}

// All text tiers answer EXCLUSIVELY on Claude (via the direct router). There is
// no non-Claude fallback: if Anthropic fails, this returns null and the caller
// fails loudly rather than silently switching providers.
async function answerForTier(
  prompt: string,
  tier: string | undefined,
  opts: { maxTokens?: number; temperature?: number; system?: string; timeoutMs?: number; history?: ChatTurn[]; onProviderError?: (detail: string) => void } = {}
): Promise<string | null> {
  return await callOR(claudeModelForTier(tier), prompt, opts);
}

// ============= TIER-BASED RESPONSE SHAPING =============
// Free tier gets intentionally brief answers so Pro / Research feel meaningfully more capable.
// Pro and above get the full-length, richly detailed treatment.
const FREE_TIER_BREVITY_PREFIX =
  "You are TurboAnswer on the free Lite plan. Keep answers SHORT and PLAIN: " +
  "3–5 sentences max for normal questions, or a brief 3–5 bullet list if a list truly fits. " +
  "No long introductions, no multi-section breakdowns, no tables, no code unless explicitly asked. " +
  "Skip headings and avoid filler like 'Great question!'. Give the single most useful answer and stop. " +
  "If the user asks for depth, analysis, a full explanation, or research, tell them this requires Pro or Research and keep the free reply short.";

// Adaptive complexity classifier — used to throttle answer length + temperature
// based on what the user actually asked. Saves tokens on greetings / quick
// factuals, unleashes the full budget on real questions.
type Complexity = 'trivial' | 'short' | 'normal' | 'complex';
const COMPLEX_RE = /\b(explain|analyz[ei]|compare|contrast|why\s+(does|is|do)|how\s+(does|do|can|to)|breakdown|break\s+down|step[\s-]?by[\s-]?step|in\s+detail|deep\s+dive|walk\s+me\s+through|pros\s+and\s+cons|trade[\s-]?offs?|architecture|design|implement|debug|fix|refactor|optimi[sz]e|research|outline|essay|plan|strategy|comprehensive|thoroughly?|nuance|history\s+of|evolution\s+of|differences?\s+between)\b/i;
function classifyComplexity(question: string): Complexity {
  const q = (question || '').trim();
  if (!q) return 'trivial';
  if (isTrivial(q)) return 'trivial';
  const len = q.length;
  const hasComplexWord = COMPLEX_RE.test(q);
  const hasMultipleSentences = (q.match(/[.!?]\s+\S/g) || []).length >= 1;
  const hasMultipleQuestions = (q.match(/\?/g) || []).length >= 2;
  if (hasComplexWord || hasMultipleQuestions || len > 200) return 'complex';
  if (hasMultipleSentences || len > 80) return 'normal';
  return 'short';
}

// Returns the token budget AND temperature AND a precision-instruction for the
// system prompt based on tier × complexity. The matrix:
//   trivial  → tiny, warm  (greetings: ~120 tok, temp 0.7)
//   short    → small, neutral (~400-1500 tok)
//   normal   → tier default
//   complex  → MAX tier budget + low temp + "think step by step" instruction
const PRECISION_PREFIX =
  "This is a complex question. Think carefully and step-by-step before answering. " +
  "Be precise: use specific numbers, names, and concrete examples instead of vague claims. " +
  "Cover the key angles thoroughly but do not pad — every sentence must earn its place. " +
  "When you are uncertain, say so explicitly rather than hedging vaguely.";

function shapeForTier(tier: string | undefined, system?: string, question?: string): { system?: string; maxTokens: number; temperature: number } {
  const t = (tier || 'free').toLowerCase();
  const complexity = classifyComplexity(question || '');

  // Per-tier token caps for each complexity bucket. Free stays brief on
  // purpose; Pro and above scale up significantly on complex questions.
  const budgets: Record<string, Record<Complexity, number>> = {
    free:       { trivial: 120, short: 350,  normal: 600,  complex: 1000 },
    pro:        { trivial: 150, short: 800,  normal: 1500, complex: 2000 },
    research:   { trivial: 150, short: 1000, normal: 1600, complex: 2000 },
    enterprise: { trivial: 150, short: 1000, normal: 1600, complex: 2000 },
    owner:      { trivial: 150, short: 1000, normal: 1600, complex: 2000 },
  };
  const tempByComplexity: Record<Complexity, number> = { trivial: 0.7, short: 0.5, normal: 0.4, complex: 0.25 };
  const tierBudget = budgets[t] || budgets.free;
  const maxTokens = tierBudget[complexity];
  const temperature = tempByComplexity[complexity];

  // Build system prompt: free always gets brevity prefix; complex questions
  // (Pro+) get the precision/step-by-step prefix prepended.
  let combinedSystem = system;
  if (t === 'free') {
    combinedSystem = combinedSystem ? `${FREE_TIER_BREVITY_PREFIX}\n\n${combinedSystem}` : FREE_TIER_BREVITY_PREFIX;
  } else if (complexity === 'complex') {
    combinedSystem = combinedSystem ? `${PRECISION_PREFIX}\n\n${combinedSystem}` : PRECISION_PREFIX;
  }

  return { system: combinedSystem, maxTokens, temperature };
}

// ============= FAST PATH =============
// COST GUARD: trivial questions ("hi", "what can you do", "thanks") get
// short-circuited to the cheap Replit gpt-4o-mini path regardless of the
// user's tier. No reason to burn Claude / multi-agent dollars on greetings.
function routingTier(tier: string | undefined, question: string): string | undefined {
  return classifyComplexity(question || '') === 'trivial' ? 'free' : tier;
}

export async function fastAnswer(question: string, system?: string, tier?: string, history?: ChatTurn[]): Promise<string> {
  const shaped = shapeForTier(tier, system, question);
  // Scale timeout with budget: ~50 tok/sec floor + 10s headroom, min 25s, max 120s.
  const timeoutMs = Math.min(120_000, Math.max(25_000, shaped.maxTokens * 20 + 10_000));
  let providerErr = '';
  const out = await answerForTier(question, routingTier(tier, question), { maxTokens: shaped.maxTokens, temperature: shaped.temperature, system: shaped.system, timeoutMs, history, onProviderError: (d) => { providerErr = d; } });
  if (out) return out;
  // No silent fallback — surface the failure so the route returns a real HTTP
  // error and the UI can offer a retry instead of persisting a fake assistant
  // message in chat history. Include the real provider detail (no secrets) so
  // the cause is visible instead of a generic "engine failed".
  throw new Error(`AI_ENGINE_UNAVAILABLE: Claude failed${providerErr ? ` — ${providerErr}` : ' (no provider detail captured)'}`);
}

// ============= STREAMING (token-by-token) FAST PATH =============
// Used by the SSE endpoint so the user sees the first words within ~1s instead
// of waiting for the entire answer to be generated server-side.

// Streaming variant — also dispatched via the direct router (Claude SSE).
async function callORStream(
  model: string,
  prompt: string,
  opts: { maxTokens?: number; temperature?: number; system?: string; timeoutMs?: number; history?: ChatTurn[]; onProviderError?: (detail: string) => void },
  onChunk: (text: string) => void,
): Promise<string | null> {
  const messages: Message[] = [];
  if (opts.system) messages.push({ role: 'system', content: opts.system });
  if (opts.history?.length) {
    for (const h of opts.history) {
      if (h && (h.role === 'user' || h.role === 'assistant') && typeof h.content === 'string' && h.content.trim()) {
        messages.push({ role: h.role, content: h.content });
      }
    }
  }
  messages.push({ role: 'user', content: prompt });
  return callDirectStream(model, messages, {
    maxTokens: opts.maxTokens,
    temperature: opts.temperature,
    timeoutMs: opts.timeoutMs ?? 45000,
    onProviderError: opts.onProviderError,
  }, onChunk);
}

async function answerForTierStream(
  prompt: string,
  tier: string | undefined,
  opts: { maxTokens?: number; temperature?: number; system?: string; timeoutMs?: number; history?: ChatTurn[]; onProviderError?: (detail: string) => void },
  onChunk: (text: string) => void,
): Promise<string | null> {
  // Stream from the tier's Claude model. There is NO non-Claude fallback: if
  // Anthropic fails this returns null and the caller fails loudly. Once ANY
  // chunk has reached the client we must never cascade to another stream (it
  // would re-emit tokens and garble the live output).
  const model = claudeModelForTier(tier);
  let emitted = false;
  const guarded = (text: string) => { emitted = true; onChunk(text); };
  return await callORStream(model, prompt, opts, guarded);
}

export async function fastAnswerStream(
  question: string,
  system: string | undefined,
  tier: string | undefined,
  history: ChatTurn[] | undefined,
  onChunk: (text: string) => void,
): Promise<string> {
  const shaped = shapeForTier(tier, system, question);
  // Streaming gets a longer ceiling because complex answers can be 4000-6000 tokens.
  const timeoutMs = Math.min(150_000, Math.max(45_000, shaped.maxTokens * 25 + 15_000));
  // Capture the LAST real provider failure so the thrown error (which the SSE
  // route forwards verbatim to the client toast) reveals the true cause —
  // 403=network/firewall, 429=quota, 401=key, timeout=connectivity — instead of
  // a generic "all failed". No secrets are included in these details.
  let providerErr = '';
  const out = await answerForTierStream(
    question,
    routingTier(tier, question),
    { maxTokens: shaped.maxTokens, temperature: shaped.temperature, system: shaped.system, timeoutMs, history, onProviderError: (d) => { providerErr = d; } },
    onChunk,
  );
  if (out) return out;
  throw new Error(`AI_PROVIDERS_UNAVAILABLE: Claude streaming failed${providerErr ? ` — ${providerErr}` : ' (no provider detail captured)'}`);
}

// ============= RETRIEVAL-ONLY PATH =============
export async function retrievalAnswer(question: string, sources: Source[], system?: string, tier?: string, history?: ChatTurn[]): Promise<string> {
  const ctx = sources.length
    ? `Use these sources (cite as [1], [2], ...):\n${sources.map((s, i) => `[${i + 1}] ${s.title}${s.publishedAt ? ` (${s.publishedAt})` : ''}: ${s.snippet}`).join('\n')}\n\n`
    : '';
  const shaped = shapeForTier(tier, system, question);
  const retrievalMax = Math.min(shaped.maxTokens, (tier || 'free').toLowerCase() === 'free' ? 600 : 2200);
  const out = await answerForTier(`${ctx}Question: ${question}\n\nAnswer concisely with inline citations like [1].`, tier, { maxTokens: retrievalMax, temperature: 0.2, system: shaped.system, timeoutMs: 25000, history });
  return out || 'I could not retrieve enough information to answer reliably.';
}

// Streaming variant of retrievalAnswer — emits onChunk(text) for each token so
// cited answers pop up word-by-word instead of arriving as one block. Returns
// null if the streaming provider yields nothing, so the caller can fall back to
// the robust non-streaming cascade.
export async function retrievalAnswerStream(
  question: string,
  sources: Source[],
  onChunk: (text: string) => void,
  system?: string,
  tier?: string,
  history?: ChatTurn[],
): Promise<string | null> {
  const ctx = sources.length
    ? `Use these sources (cite as [1], [2], ...):\n${sources.map((s, i) => `[${i + 1}] ${s.title}${s.publishedAt ? ` (${s.publishedAt})` : ''}: ${s.snippet}`).join('\n')}\n\n`
    : '';
  const shaped = shapeForTier(tier, system, question);
  const retrievalMax = Math.min(shaped.maxTokens, (tier || 'free').toLowerCase() === 'free' ? 600 : 2200);
  return answerForTierStream(
    `${ctx}Question: ${question}\n\nAnswer concisely with inline citations like [1].`,
    tier,
    { maxTokens: retrievalMax, temperature: 0.2, system: shaped.system, timeoutMs: 25000, history },
    onChunk,
  );
}

// ============= ORCHESTRATOR =============
export type RunOptions = {
  question: string;
  hasImage?: boolean;
  manualDeepThink?: boolean;
  forceFastMode?: boolean;
  systemPrompt?: string;
  tier?: string;
  history?: ChatTurn[];
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
  const { question, hasImage = false, manualDeepThink = false, forceFastMode = false, systemPrompt, tier, history, onEvent } = opts;
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

  // Research / Enterprise / Owner: never auto-route to the slow 5-stage deep
  // pipeline. Reserve deep for explicit Deep Think toggle so perceived latency
  // stays low. Auto-deep questions get downgraded to retrieval (still cited,
  // still fast) unless the user clicked Deep Think.
  const tLower = (tier || 'free').toLowerCase();
  let autoDowngraded = false;
  if ((tLower === 'research' || tLower === 'enterprise' || tLower === 'owner') && !manualDeepThink && decision.mode === 'deep') {
    decision = { ...decision, mode: 'retrieval', reason: `${decision.reason}_auto_downgraded` };
    autoDowngraded = true;
  }

  stage('route', `Mode: ${decision.mode === 'deep' ? 'Deep Think' : decision.mode === 'retrieval' ? 'Retrieval' : 'Fast'}`, 'done', decision.reason);
  onEvent({ type: 'route', mode: decision.mode, autoDowngraded, reason: decision.reason });

  // FAST PATH (streamed token-by-token so first words appear in <1s)
  if (decision.mode === 'fast') {
    stage('answer', 'Generating answer', 'active');
    let acc = '';
    const out = await fastAnswerStream(question, systemPrompt, tier, history, (chunk) => {
      acc += chunk;
      onEvent({ type: 'chunk', text: chunk });
    });
    // Fallback: if the streaming path returned a full string but onChunk never
    // fired (e.g. provider didn't honour stream:true), use the returned text.
    if (!acc && out) {
      acc = out;
      onEvent({ type: 'chunk', text: out });
    }
    if (!acc) {
      stage('answer', 'Provider failed', 'error');
      throw new Error('AI_PROVIDERS_UNAVAILABLE: fast-path stream returned no content.');
    }
    stage('answer', 'Answer ready', 'done');
    // Fast path has no verification pass — emit null confidence so the UI does
    // not render a misleading "70% confidence" chip on greetings/chit-chat.
    onEvent({ type: 'done', content: acc, verified: 'unknown', mode: 'fast', sources: [], claims: [], confidence: null as any });
    return { content: acc, verified: 'unknown', mode: 'fast', sources: [], claims: [], confidence: null as any };
  }

  // RETRIEVAL-ONLY PATH
  if (decision.mode === 'retrieval') {
    stage('retrieve', 'Searching live sources', 'active');
    const retrieved = await retrieve(question, decision.isMath);
    stage('retrieve', `${retrieved.sources.length} source${retrieved.sources.length === 1 ? '' : 's'}${retrieved.arithmetic ? ' + math verified' : ''}`, 'done');
    if (retrieved.sources.length) onEvent({ type: 'sources', sources: retrieved.sources });
    stage('answer', 'Answering with citations', 'active');
    // Stream token-by-token; fall back to the non-streaming cascade if the
    // streaming provider emits nothing (keeps the same robustness as before).
    let acc = '';
    const streamed = await retrievalAnswerStream(question, retrieved.sources, (chunk) => {
      acc += chunk;
      onEvent({ type: 'chunk', text: chunk });
    }, systemPrompt, tier, history);
    if (!acc) {
      const fallback = (streamed && streamed.trim())
        ? streamed
        : await retrievalAnswer(question, retrieved.sources, systemPrompt, tier, history);
      acc = fallback;
      onEvent({ type: 'chunk', text: fallback });
    }
    const content = acc;
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
  // Quorum-of-3 with 4s grace: synthesis fires once 3 of N panel models return,
  // giving stragglers a short window to land. Cuts perceived latency by 4-8s
  // versus waiting for the slowest model in the panel.
  const quorumTarget = Math.min(3, panelModels.length);
  const panel = await panelAnswer(question, subQs, context, panelModels,
    (m, p) => onEvent({ type: 'panel', model: m, preview: p }),
    {
      quorum: quorumTarget,
      graceMs: 4000,
      onQuorum: (n) => stage('panel', `Quorum reached (${n}/${panelModels.length}) — starting synthesis`, 'active'),
      system: systemPrompt,
    },
  );
  if (panel.length === 0) {
    stage('panel', 'All models failed — falling back', 'error');
    const content = await fastAnswer(question, systemPrompt, tier);
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

  // Synthesize — streamed so user sees the final answer growing in real time
  // even though verification still runs after.
  stage('synth', 'Synthesizing best answer (2/3 consensus gating)', 'active');
  const finalAnswer = await synthesizeStream(
    question,
    panel,
    retrieved.sources,
    retrieved.arithmetic,
    debateOut,
    (chunk) => onEvent({ type: 'chunk', text: chunk }),
    systemPrompt,
  );
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
  free: 0,
  pro: 0,
  research: 200,
  enterprise: -1,
  owner: -1,
};

export function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}
