// Direct provider router. Takes OpenRouter-style model IDs (e.g.
// "openai/gpt-4o-mini", "openai/gpt-5.4-mini", or legacy "anthropic/claude-*"
// strings still passed by older call sites) and dispatches to Azure OpenAI.
//
// The entire text engine now runs on the GPT line-up served by the Azure
// OpenAI / AI Foundry resource:
//   gpt-4o-mini   → free tier  (Turbo AI)          [chat-completions]
//   gpt-4.1       → pro tier   (Turbo AI Pro)       [chat-completions]
//   gpt-5.4-mini  → research   (Matrix AI)          [chat-completions]
//   gpt-5-pro     → enterprise                      [Responses API only]
//   gpt-5.2-codex → Stack Trace Surgeon ONLY        [Responses API only]
//
// NOTE: gpt-5-pro and gpt-5.2-codex do NOT support /chat/completions on Azure
// (they 400 "operation is unsupported"); they are only reachable via the
// /openai/responses endpoint, so resolveModel flags them usesResponsesApi.
//
// Every deployment name, the API version, and the chat endpoint are
// env-overridable so a naming difference in Azure is a config change, not a
// code change. Function signatures intentionally mirror the old callDirect /
// callDirectStream so callers stay unchanged.

export type Message = { role: 'system' | 'user' | 'assistant'; content: any };

export type CallOpts = {
  maxTokens?: number;
  temperature?: number;
  jsonMode?: boolean;
  timeoutMs?: number;
  // Diagnostic hook: invoked with a short, secret-free reason whenever a provider
  // attempt fails (HTTP status + truncated body, "no key", or an exception). Lets
  // callers surface the REAL underlying cause instead of a generic "all failed".
  onProviderError?: (detail: string) => void;
  // Usage hook: invoked once with the token counts reported by the provider for a
  // successful non-stream call. Used for actual-cost metering (e.g. Stack Trace
  // Surgeon). Not emitted for streaming calls.
  onUsage?: (usage: { promptTokens: number; completionTokens: number }) => void;
};

type Resolved = {
  // The Azure deployment name to call.
  deployment: string;
  // GPT-5 family (incl. codex) needs max_completion_tokens (not max_tokens) and
  // only the DEFAULT temperature; it also accepts reasoning_effort.
  isGpt5: boolean;
  // True for deployments that ONLY support Azure's /openai/responses endpoint
  // (gpt-5-pro, gpt-5.2-codex) and reject /chat/completions.
  usesResponsesApi?: boolean;
  // Reasoning effort for Responses-API models. gpt-5-pro ONLY accepts 'high';
  // gpt-5.2-codex accepts 'low'. Ignored for chat-completions deployments.
  reasoningEffort?: string;
  // Best-effort public-OpenAI model name for the optional api.openai.com fallback.
  publicModel: string;
  // Approx model context window in tokens (input + output). Used to trim history
  // so a long conversation never 400s with "maximum context length exceeded".
  contextLimit: number;
  // Short label for diagnostics.
  label: string;
};

// ── Deployment resolution ────────────────────────────────────────────────────
// Map any incoming model id (new openai/* ids OR legacy anthropic/* ids still
// passed by older call sites) to an Azure OpenAI deployment, by capability hint.
// Order matters: check the most specific hints first so "gpt-5.4-mini" is not
// swallowed by the generic "mini" rule.
function resolveModel(orId: string): Resolved {
  const m = (orId || '').toLowerCase();

  // Stack Trace Surgeon — exclusive Codex model.
  if (m.includes('codex')) {
    return {
      deployment: process.env.AZURE_OPENAI_DEPLOYMENT_GPT_CODEX || 'gpt-5.2-codex',
      isGpt5: true, usesResponsesApi: true, reasoningEffort: process.env.AZURE_OPENAI_CODEX_EFFORT || 'low',
      publicModel: 'gpt-5', contextLimit: 256_000, label: 'codex',
    };
  }
  // Enterprise top engine. NOTE: legacy "opus" is intentionally NOT routed here —
  // historically Opus was the Matrix/research model, so legacy anthropic/claude-opus
  // call sites resolve to gpt-5.4-mini (Matrix) below. Enterprise routing comes
  // through explicit openai/gpt-5-pro ids (claudeModelForTier), not the opus hint.
  if (m.includes('5.5') || m.includes('5-5') || m.includes('enterprise') || m.includes('5-pro') || (m.includes('gpt-5') && m.includes('pro'))) {
    return {
      deployment: process.env.AZURE_OPENAI_DEPLOYMENT_GPT5_PRO || 'gpt-5-pro',
      isGpt5: true, usesResponsesApi: true, reasoningEffort: process.env.AZURE_OPENAI_PRO_EFFORT || 'high',
      publicModel: 'gpt-5', contextLimit: 256_000, label: 'gpt5-pro',
    };
  }
  // Matrix AI (research) — also where legacy "opus" lands.
  if (m.includes('5.4') || m.includes('5-4') || m.includes('matrix') || m.includes('opus') || (m.includes('gpt-5') && m.includes('mini'))) {
    return {
      deployment: process.env.AZURE_OPENAI_DEPLOYMENT_GPT5_MINI || 'gpt-5.4-mini',
      isGpt5: true, publicModel: 'gpt-5-mini', contextLimit: 256_000, label: 'gpt5-mini',
    };
  }
  // Generic GPT-5.
  if (m.includes('gpt-5') || m.includes('gpt5')) {
    return {
      deployment: process.env.AZURE_OPENAI_DEPLOYMENT_GPT5_MINI || 'gpt-5.4-mini',
      isGpt5: true, publicModel: 'gpt-5-mini', contextLimit: 256_000, label: 'gpt5',
    };
  }
  // Pro tier — gpt-4.1 (also where legacy "sonnet" and bare "gpt-4o" land).
  if (m.includes('4.1') || m.includes('4-1') || m.includes('sonnet') || (m.includes('gpt-4o') && !m.includes('mini'))) {
    return {
      deployment: process.env.AZURE_OPENAI_DEPLOYMENT_GPT41 || 'gpt-4.1',
      isGpt5: false, publicModel: 'gpt-4.1', contextLimit: 1_000_000, label: 'gpt-4.1',
    };
  }
  // Free tier / everything else (haiku, nano, mini, flash, lite, small, gpt-4o-mini).
  return {
    deployment: process.env.AZURE_OPENAI_DEPLOYMENT_GPT4O_MINI || 'gpt-4o-mini',
    isGpt5: false, publicModel: 'gpt-4o-mini', contextLimit: 128_000, label: 'gpt-4o-mini',
  };
}

function apiVersion(): string {
  return process.env.AZURE_OPENAI_API_VERSION || '2025-04-01-preview';
}

// Build the Azure OpenAI chat-completions URL for a deployment. Uses the resource
// ORIGIN of AZURE_OPENAI_ENDPOINT (path portion irrelevant) so any value — bare
// host, /api/projects/..., or a portal Target URI — resolves to the same correct
// URL. Override the whole base with AZURE_OPENAI_CHAT_ENDPOINT if needed.
function azureOrigin(): string {
  const override = (process.env.AZURE_OPENAI_CHAT_ENDPOINT || '').replace(/\/+$/, '');
  if (override) { try { return new URL(override).origin; } catch { return override; } }
  const raw = (process.env.AZURE_OPENAI_ENDPOINT || '').replace(/\/+$/, '');
  try { return new URL(raw).origin; } catch { return raw.replace(/(https?:\/\/[^/]+).*/i, '$1'); }
}
function azureOpenAIUrl(deployment: string): string {
  return `${azureOrigin()}/openai/deployments/${encodeURIComponent(deployment)}/chat/completions?api-version=${apiVersion()}`;
}
// Azure's newer Responses endpoint — required by gpt-5-pro / gpt-5.2-codex, which
// reject /chat/completions. The deployment goes in the body (model), not the path.
function azureResponsesUrl(): string {
  return `${azureOrigin()}/openai/responses?api-version=${apiVersion()}`;
}

// Convert an Anthropic-style content value (string OR array of content blocks,
// including base64 image blocks used by the vision path) into the OpenAI
// chat-completions content shape.
function toOpenAIContent(content: any): any {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content.map((b: any) => {
      if (!b || typeof b !== 'object') return { type: 'text', text: String(b ?? '') };
      if (b.type === 'text') return { type: 'text', text: b.text ?? '' };
      if (b.type === 'image_url') return b; // already OpenAI shape
      if (b.type === 'image' && b.source) {
        const url = b.source.type === 'base64'
          ? `data:${b.source.media_type};base64,${b.source.data}`
          : b.source.url;
        return { type: 'image_url', image_url: { url } };
      }
      return b;
    });
  }
  return content;
}

function buildOpenAIBody(r: Resolved, messages: Message[], opts: CallOpts, stream: boolean): any {
  const msgs = messages.map(m => ({ role: m.role, content: toOpenAIContent(m.content) }));
  const body: any = { model: r.deployment, messages: msgs };
  const tokens = opts.maxTokens ?? 1500;
  if (r.isGpt5) {
    // Reasoning models: reasoning tokens count against the budget, so give them
    // headroom; they reject custom temperature; they accept reasoning_effort.
    body.max_completion_tokens = Math.max(tokens, 1024);
    const effort = process.env.AZURE_OPENAI_REASONING_EFFORT || 'low';
    if (effort) body.reasoning_effort = effort;
  } else {
    body.max_tokens = tokens;
    if (opts.temperature != null) body.temperature = opts.temperature;
  }
  if (opts.jsonMode) body.response_format = { type: 'json_object' };
  if (stream) {
    body.stream = true;
    body.stream_options = { include_usage: false };
  }
  return body;
}

function stripJsonFences(s: string): string {
  return s.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
}

// Azure enforces per-minute token rate limits (HTTP 429 with Retry-After). A
// single transient burst shouldn't fail the user's request, so retry the SAME
// call a bounded number of times, honoring Retry-After but capping the wait so a
// live chat never stalls for the full window. A 429'd request is rejected before
// it consumes quota, so retrying does not add to the rate-limit pressure.
async function azureFetchWithRetry(url: string, init: RequestInit, opts: CallOpts, label: string): Promise<Response> {
  const maxRetries = 2;
  let attempt = 0;
  let res = await fetch(url, init);
  while (res.status === 429 && attempt < maxRetries) {
    const raHeader = parseInt(res.headers.get('retry-after') || '', 10);
    const waitMs = Math.min((Number.isFinite(raHeader) && raHeader > 0 ? raHeader : 2) * 1000, 8000);
    attempt++;
    const note = `${label} rate-limited (HTTP 429) — retry ${attempt}/${maxRetries} in ${waitMs}ms`;
    opts.onProviderError?.(note);
    console.warn(`[Router/Azure-OpenAI] ${note}`);
    await new Promise(r => setTimeout(r, waitMs));
    res = await fetch(url, init);
  }
  return res;
}

function azureCreds(): { key: string; endpoint: string } | null {
  const key = process.env.AZURE_OPENAI_API_KEY;
  const endpoint = (process.env.AZURE_OPENAI_CHAT_ENDPOINT || process.env.AZURE_OPENAI_ENDPOINT || '').replace(/\/+$/, '');
  if (key && endpoint) return { key, endpoint };
  return null;
}

// Optional safety net: api.openai.com using OPENAI_API_KEY. Default OFF — the
// text engine is Azure-only by design and "fails loud", so a real Azure problem
// (key/endpoint/deployment) surfaces directly instead of being masked by a
// public-OpenAI error (e.g. a misconfigured OPENAI_API_KEY producing a
// confusing 401 that points users at platform.openai.com). Opt in explicitly
// with OPENAI_PUBLIC_FALLBACK=1.
function publicFallbackEnabled(): boolean {
  return process.env.OPENAI_PUBLIC_FALLBACK === '1' || process.env.OPENAI_PUBLIC_FALLBACK === 'true';
}

async function publicOpenAINonStream(r: Resolved, messages: Message[], opts: CallOpts, signal: AbortSignal): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key || !publicFallbackEnabled()) return null;
  const msgs = messages.map(m => ({ role: m.role, content: toOpenAIContent(m.content) }));
  const body: any = { model: r.publicModel, messages: msgs };
  if (r.isGpt5) { body.max_completion_tokens = Math.max(opts.maxTokens ?? 1500, 1024); }
  else { body.max_tokens = opts.maxTokens ?? 1500; if (opts.temperature != null) body.temperature = opts.temperature; }
  if (opts.jsonMode) body.response_format = { type: 'json_object' };
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify(body), signal,
  });
  if (!res.ok) { const txt = await res.text().catch(() => ''); opts.onProviderError?.(`openai-public(${r.publicModel}) HTTP ${res.status}: ${txt.slice(0, 160)}`); return null; }
  const data: any = await res.json();
  const u = data?.usage;
  if (u && opts.onUsage) opts.onUsage({ promptTokens: u.prompt_tokens ?? 0, completionTokens: u.completion_tokens ?? 0 });
  let out = data?.choices?.[0]?.message?.content || null;
  if (out && opts.jsonMode) out = stripJsonFences(out);
  return out;
}

// ── Azure Responses API (gpt-5-pro / gpt-5.2-codex) ──────────────────────────
// These deployments only answer on /openai/responses. The request/response
// shapes differ from chat-completions: system prompt → `instructions`, the
// conversation → typed `input` items, output text is nested under output[].

function toResponsesInput(messages: Message[]): { instructions: string; input: any[] } {
  const sys: string[] = [];
  const input: any[] = [];
  for (const m of messages) {
    if (m.role === 'system') {
      if (typeof m.content === 'string') sys.push(m.content);
      else if (Array.isArray(m.content)) sys.push(m.content.map((b: any) => (b?.type === 'text' ? (b.text ?? '') : '')).join('\n'));
      continue;
    }
    const isAssistant = m.role === 'assistant';
    const textType = isAssistant ? 'output_text' : 'input_text';
    const parts: any[] = [];
    if (typeof m.content === 'string') {
      parts.push({ type: textType, text: m.content });
    } else if (Array.isArray(m.content)) {
      for (const b of m.content) {
        if (!b || typeof b !== 'object') { parts.push({ type: textType, text: String(b ?? '') }); continue; }
        if (b.type === 'text') { parts.push({ type: textType, text: b.text ?? '' }); continue; }
        if (b.type === 'image_url' && !isAssistant) { parts.push({ type: 'input_image', image_url: typeof b.image_url === 'string' ? b.image_url : b.image_url?.url }); continue; }
        if (b.type === 'image' && b.source && !isAssistant) {
          const url = b.source.type === 'base64' ? `data:${b.source.media_type};base64,${b.source.data}` : b.source.url;
          parts.push({ type: 'input_image', image_url: url }); continue;
        }
        parts.push({ type: textType, text: typeof b.text === 'string' ? b.text : '' });
      }
    }
    input.push({ role: m.role, content: parts });
  }
  return { instructions: sys.join('\n\n'), input };
}

function buildResponsesBody(r: Resolved, messages: Message[], opts: CallOpts): any {
  const { instructions, input } = toResponsesInput(messages);
  // Reasoning tokens count against max_output_tokens, so keep generous headroom
  // or the response can complete with reasoning only and no visible text.
  const body: any = { model: r.deployment, input, max_output_tokens: Math.max(opts.maxTokens ?? 1500, 2048) };
  if (instructions) body.instructions = instructions;
  const effort = r.reasoningEffort;
  if (effort) body.reasoning = { effort };
  if (opts.jsonMode) body.text = { format: { type: 'json_object' } };
  return body;
}

function parseResponsesText(data: any): string | null {
  if (typeof data?.output_text === 'string' && data.output_text) return data.output_text;
  const out = Array.isArray(data?.output) ? data.output : [];
  // Concatenate every output_text segment across all message items so multi-part
  // answers aren't truncated to just the first chunk.
  const text = out
    .filter((o: any) => o?.type === 'message')
    .flatMap((o: any) => (Array.isArray(o.content) ? o.content : []))
    .filter((c: any) => c?.type === 'output_text' && typeof c.text === 'string')
    .map((c: any) => c.text)
    .join('');
  return text || null;
}

async function azureResponsesNonStream(r: Resolved, messages: Message[], opts: CallOpts, signal: AbortSignal, onCtxError?: (body: string) => void): Promise<string | null> {
  const creds = azureCreds();
  if (!creds) { opts.onProviderError?.('Azure OpenAI not configured (AZURE_OPENAI_API_KEY / AZURE_OPENAI_ENDPOINT missing)'); return null; }
  const res = await azureFetchWithRetry(azureResponsesUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': creds.key },
    body: JSON.stringify(buildResponsesBody(r, messages, opts)),
    signal,
  }, opts, `azure-responses(${r.deployment})`);
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    if (res.status === 400 && isContextLengthError(txt)) onCtxError?.(txt);
    const detail = `azure-responses(${r.deployment}) HTTP ${res.status}: ${txt.slice(0, 200)}`;
    opts.onProviderError?.(detail);
    console.warn(`[Router/Azure-Responses] ${detail}`);
    return null;
  }
  const data: any = await res.json();
  const u = data?.usage;
  if (u && opts.onUsage) opts.onUsage({ promptTokens: u.input_tokens ?? 0, completionTokens: u.output_tokens ?? 0 });
  let text = parseResponsesText(data);
  if (text && opts.jsonMode) text = stripJsonFences(text);
  if (!text) opts.onProviderError?.(`azure-responses(${r.deployment}) returned no text (status ${data?.status})`);
  return text;
}

// Rough token estimate (~4 chars/token for English). Structured/vision blocks
// are counted by their text length plus a flat per-image cost; this only needs
// to be good enough to keep us safely under the model's context window.
function estimateContentTokens(content: any): number {
  if (typeof content === 'string') return Math.ceil(content.length / 3.5);
  if (Array.isArray(content)) {
    let n = 0;
    for (const b of content) {
      if (b && typeof b.text === 'string') n += Math.ceil(b.text.length / 3.5);
      else if (b && (b.type === 'image' || b.type === 'image_url' || b.source)) n += 1200;
      else n += 50;
    }
    return n;
  }
  return 0;
}

// True when an Azure 400 body is a context-window overflow (vs. some other 400).
// Used to re-trim harder and retry instead of failing the user's request.
function isContextLengthError(body: string): boolean {
  const b = (body || '').toLowerCase();
  return b.includes('context length') || b.includes('maximum context')
    || b.includes('context_length_exceeded') || b.includes('reduce the length')
    || (b.includes('token') && b.includes('maximum') && b.includes('length'));
}

function truncateContentText(content: any, maxTokens: number): any {
  const maxChars = Math.max(400, Math.floor(maxTokens * 3.5));
  if (typeof content === 'string') {
    if (content.length <= maxChars) return content;
    const head = Math.floor(maxChars * 0.6);
    const tail = maxChars - head;
    return content.slice(0, head) + '\n\n[…earlier text trimmed to fit the model context window…]\n\n' + content.slice(content.length - tail);
  }
  // Structured/vision content: truncate text blocks proportionally and, as a
  // final guard, drop the oldest image blocks (keeping at least one) so an
  // image-heavy message can never overflow the window on its own.
  if (Array.isArray(content)) {
    const textBlocks = content.filter((b: any) => b && typeof b.text === 'string').length || 1;
    const perText = Math.max(120, Math.floor(maxTokens / textBlocks));
    let blocks = content.map((b: any) =>
      (b && typeof b.text === 'string') ? { ...b, text: truncateContentText(b.text, perText) } : b);
    while (estimateContentTokens(blocks) > maxTokens) {
      const imgCount = blocks.filter((b: any) => b && (b.type === 'image' || b.type === 'image_url' || b.source)).length;
      if (imgCount <= 1) break;
      const dropIdx = blocks.findIndex((b: any) => b && (b.type === 'image' || b.type === 'image_url' || b.source));
      blocks = blocks.filter((_: any, i: number) => i !== dropIdx);
    }
    return blocks;
  }
  return content;
}

// Trim the assembled messages so they fit the model's context window, leaving
// room for the response. Keeps ALL system messages and the most recent turn,
// drops the OLDEST conversation turns first, and truncates a single oversized
// text message only as a last resort. Prevents Azure HTTP 400 "maximum context
// length exceeded" when a long conversation (or a huge pasted message) blows
// past the limit (e.g. gpt-4o-mini's 128k).
function fitMessagesToContext(messages: Message[], r: Resolved, opts: CallOpts, factor = 1, absCap = Infinity): Message[] {
  const reserve = Math.max(opts.maxTokens ?? 1500, 2048) + 4000;
  // The token estimate (chars/3.5) still UNDER-counts real tokens for code,
  // JSON, and non-English text, so never fill the whole window: cap input at
  // ~70% of the model context and shrink further (smaller `factor`) on each
  // retry. `absCap` is an absolute estimated-token ceiling used by retries so we
  // converge to a size safe even if a model's configured contextLimit is larger
  // than its real Azure deployment window. Dropping a few old turns is always
  // better than a hard 400.
  const cap = Math.floor(r.contextLimit * 0.70 * factor);
  const budget = Math.max(1500, Math.min(r.contextLimit - reserve, cap, absCap));
  const per = (m: Message) => estimateContentTokens(m.content) + 8;
  const total = messages.reduce((s, m) => s + per(m), 0);
  if (total <= budget) return messages;

  const systems = messages.filter(m => m.role === 'system');
  const convo = messages.filter(m => m.role !== 'system');
  let used = systems.reduce((s, m) => s + per(m), 0);

  const kept: Message[] = [];
  for (let i = convo.length - 1; i >= 0; i--) {
    const cost = per(convo[i]);
    if (kept.length === 0 || used + cost <= budget) { kept.unshift(convo[i]); used += cost; }
    else break; // budget exhausted — drop the remaining (older) turns
  }

  // If what we kept (plus the always-kept system messages) still overflows —
  // e.g. the latest message alone is huge, the system prompt(s) dominate, or the
  // payload is image-heavy — truncate the largest message's text repeatedly
  // until it fits. System messages are truncated only here, as an absolute last
  // resort: a hard 400 (no answer at all) is worse than a trimmed prompt. The
  // largest message is cut first, so a giant pasted user message goes before the
  // (smaller) system prompt does.
  const all = [...systems, ...kept];
  const frozen = new Set<number>(); // messages that can't shrink further (e.g. a lone image)
  let curTotal = all.reduce((s, m) => s + per(m), 0);
  for (let guard = 0; curTotal > budget && guard < 100; guard++) {
    let idx = -1, max = -1;
    all.forEach((m, i) => { if (frozen.has(i)) return; const c = estimateContentTokens(m.content); if (c > max) { max = c; idx = i; } });
    if (idx === -1) break; // nothing left to shrink
    const cur = estimateContentTokens(all[idx].content);
    const allowed = Math.max(120, cur - (curTotal - budget) - 50);
    const next = { ...all[idx], content: truncateContentText(all[idx].content, allowed) };
    if (estimateContentTokens(next.content) >= cur) { frozen.add(idx); continue; } // skip this one; keep shrinking the others
    all[idx] = next;
    curTotal = all.reduce((s, m) => s + per(m), 0);
  }

  const result = all;
  console.warn(`[Router] context-trim ${r.label}: ${messages.length}→${result.length} msgs (~${total} tok > ~${budget} budget, final ~${curTotal})`);
  return result;
}

// Retry budgets for context-length 400s. Each attempt re-trims smaller; the
// absolute caps (in estimated tokens) guarantee convergence to a size safe for
// the smallest REAL Azure window we serve (gpt-4o-mini, 128k) even if a model's
// configured contextLimit is set larger than its real deployment window.
const CTX_RETRY_ATTEMPTS: Array<{ factor: number; absCap?: number }> = [
  { factor: 1 },
  { factor: 0.6, absCap: 90_000 },
  { factor: 0.4, absCap: 45_000 },
];

export async function callDirect(orModelId: string, messages: Message[], opts: CallOpts = {}): Promise<string | null> {
  const r = resolveModel(orModelId);
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 30000);
  try {
    if (r.usesResponsesApi) {
      // Responses-API models (gpt-5-pro / codex) retry on a context-length 400
      // too, converging to an absolute-safe size via CTX_RETRY_ATTEMPTS.
      for (let attempt = 0; attempt < CTX_RETRY_ATTEMPTS.length; attempt++) {
        const a = CTX_RETRY_ATTEMPTS[attempt];
        const fitted = fitMessagesToContext(messages, r, opts, a.factor, a.absCap ?? Infinity);
        let ctxErr = false;
        const out = await azureResponsesNonStream(r, fitted, opts, ctrl.signal, () => { ctxErr = true; });
        if (out) { clearTimeout(t); return out; }
        if (ctxErr && attempt < CTX_RETRY_ATTEMPTS.length - 1) {
          console.warn(`[Router/Azure-Responses] context-length 400 — re-trimming harder and retrying`);
          continue;
        }
        break;
      }
      const fb = await publicOpenAINonStream(r, fitMessagesToContext(messages, r, opts, 0.6, 90_000), opts, ctrl.signal);
      clearTimeout(t);
      if (fb) { console.warn(`[Router] used public-OpenAI fallback for ${r.label}`); return fb; }
      return null;
    }
    const creds = azureCreds();
    if (creds) {
      // Re-trim and retry on a context-length 400: the token estimate can
      // under-count (dense code/JSON/non-English), so if Azure still rejects we
      // shrink the budget hard and try again rather than failing the user. The
      // absolute caps converge to a size safe even if a model's configured
      // contextLimit is larger than its real Azure deployment window.
      for (let attempt = 0; attempt < CTX_RETRY_ATTEMPTS.length; attempt++) {
        const a = CTX_RETRY_ATTEMPTS[attempt];
        const fitted = fitMessagesToContext(messages, r, opts, a.factor, a.absCap ?? Infinity);
        const res = await azureFetchWithRetry(azureOpenAIUrl(r.deployment), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'api-key': creds.key },
          body: JSON.stringify(buildOpenAIBody(r, fitted, opts, false)),
          signal: ctrl.signal,
        }, opts, `azure-openai(${r.deployment})`);
        if (res.ok) {
          const data: any = await res.json();
          const u = data?.usage;
          if (u && opts.onUsage) opts.onUsage({ promptTokens: u.prompt_tokens ?? 0, completionTokens: u.completion_tokens ?? 0 });
          let text = data?.choices?.[0]?.message?.content || null;
          if (text && opts.jsonMode) text = stripJsonFences(text);
          if (text) { clearTimeout(t); return text; }
          opts.onProviderError?.(`azure-openai(${r.deployment}) HTTP 200 but no text in response`);
          break;
        }
        const txt = await res.text().catch(() => '');
        if (res.status === 400 && isContextLengthError(txt) && attempt < CTX_RETRY_ATTEMPTS.length - 1) {
          console.warn(`[Router/Azure-OpenAI] context-length 400 — re-trimming harder and retrying`);
          continue;
        }
        const detail = `azure-openai(${r.deployment}) HTTP ${res.status}: ${txt.slice(0, 200)}`;
        opts.onProviderError?.(detail);
        console.warn(`[Router/Azure-OpenAI] ${detail}`);
        break;
      }
    } else {
      opts.onProviderError?.('Azure OpenAI not configured (AZURE_OPENAI_API_KEY / AZURE_OPENAI_ENDPOINT missing)');
    }
    // Optional public-OpenAI safety net.
    const fb = await publicOpenAINonStream(r, fitMessagesToContext(messages, r, opts, 0.6, 90_000), opts, ctrl.signal);
    clearTimeout(t);
    if (fb) { console.warn(`[Router] used public-OpenAI fallback for ${r.label}`); return fb; }
    return null;
  } catch (err: any) {
    clearTimeout(t);
    const aborted = err?.name === 'AbortError';
    const detail = aborted
      ? `request timed out after ${opts.timeoutMs ?? 30000}ms (no response from provider — possible network/firewall block)`
      : `exception: ${err?.message || err}`;
    opts.onProviderError?.(detail);
    console.warn(`[Router] ${orModelId} failed: ${err?.message || err}`);
    return null;
  }
}

export async function callDirectStream(orModelId: string, messages: Message[], opts: CallOpts, onChunk: (text: string) => void): Promise<string | null> {
  const r = resolveModel(orModelId);
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 45000);
  try {
    // Responses-API models don't stream here — fetch the full answer and emit it
    // as one chunk so the SSE contract to callers is preserved.
    if (r.usesResponsesApi) {
      for (let attempt = 0; attempt < CTX_RETRY_ATTEMPTS.length; attempt++) {
        const a = CTX_RETRY_ATTEMPTS[attempt];
        const fitted = fitMessagesToContext(messages, r, opts, a.factor, a.absCap ?? Infinity);
        let ctxErr = false;
        const out = await azureResponsesNonStream(r, fitted, opts, ctrl.signal, () => { ctxErr = true; });
        if (out) { clearTimeout(t); onChunk(out); return out; }
        if (ctxErr && attempt < CTX_RETRY_ATTEMPTS.length - 1) {
          console.warn(`[Router-stream/Azure-Responses] context-length 400 — re-trimming harder and retrying`);
          continue;
        }
        break;
      }
      const fb = await publicOpenAINonStream(r, fitMessagesToContext(messages, r, opts, 0.6, 90_000), opts, ctrl.signal);
      clearTimeout(t);
      if (fb) { console.warn(`[Router-stream] used public-OpenAI fallback for ${r.label}`); onChunk(fb); return fb; }
      return null;
    }
    const creds = azureCreds();
    if (creds) {
      // Re-trim and retry on a context-length 400 BEFORE any chunk is emitted
      // (a context overflow is rejected at request time, so nothing has streamed
      // yet — safe to retry without duplicating output). Absolute caps converge
      // to a size safe even if contextLimit is set larger than the real window.
      for (let attempt = 0; attempt < CTX_RETRY_ATTEMPTS.length; attempt++) {
        const a = CTX_RETRY_ATTEMPTS[attempt];
        const fitted = fitMessagesToContext(messages, r, opts, a.factor, a.absCap ?? Infinity);
        const res = await azureFetchWithRetry(azureOpenAIUrl(r.deployment), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'api-key': creds.key },
          body: JSON.stringify(buildOpenAIBody(r, fitted, opts, true)),
          signal: ctrl.signal,
        }, opts, `azure-openai-stream(${r.deployment})`);
        if (res.ok && res.body) {
          const acc = await consumeOpenAIStream(res, onChunk);
          if (acc) { clearTimeout(t); return acc; }
          opts.onProviderError?.(`azure-openai(${r.deployment}) stream connected (HTTP 200) but produced no content`);
          // Stream came back empty (some proxies drop the SSE body) — retry the
          // SAME deployment NON-streaming and emit as a single chunk so the user
          // still gets their answer. Reaching here guarantees nothing was emitted.
          const ns = await azureFetchWithRetry(azureOpenAIUrl(r.deployment), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'api-key': creds.key },
            body: JSON.stringify(buildOpenAIBody(r, fitted, opts, false)),
            signal: ctrl.signal,
          }, opts, `azure-openai-nonstream(${r.deployment})`);
          if (ns.ok) {
            const data: any = await ns.json();
            const text = data?.choices?.[0]?.message?.content || null;
            if (text) { clearTimeout(t); onChunk(text); return text; }
          } else {
            const txt = await ns.text().catch(() => '');
            opts.onProviderError?.(`azure-openai(${r.deployment}) non-stream fallback HTTP ${ns.status}: ${txt.slice(0, 160)}`);
          }
          break;
        }
        const txt = await res.text().catch(() => '');
        if (res.status === 400 && isContextLengthError(txt) && attempt < CTX_RETRY_ATTEMPTS.length - 1) {
          console.warn(`[Router/Azure-OpenAI-stream] context-length 400 — re-trimming harder and retrying`);
          continue;
        }
        const detail = `azure-openai(${r.deployment}) HTTP ${res.status}: ${txt.slice(0, 200)}`;
        opts.onProviderError?.(detail);
        console.warn(`[Router/Azure-OpenAI-stream] ${detail}`);
        break;
      }
    } else {
      opts.onProviderError?.('Azure OpenAI not configured (AZURE_OPENAI_API_KEY / AZURE_OPENAI_ENDPOINT missing)');
    }
    // Public-OpenAI safety net (non-streaming; emit as one chunk). Only reached
    // if nothing was streamed to the client above.
    const fb = await publicOpenAINonStream(r, fitMessagesToContext(messages, r, opts, 0.6, 90_000), opts, ctrl.signal);
    clearTimeout(t);
    if (fb) { console.warn(`[Router-stream] used public-OpenAI fallback for ${r.label}`); onChunk(fb); return fb; }
    return null;
  } catch (err: any) {
    clearTimeout(t);
    const aborted = err?.name === 'AbortError';
    const detail = aborted
      ? `request timed out after ${opts.timeoutMs ?? 45000}ms (no response from provider — possible network/firewall block)`
      : `stream exception: ${err?.message || err}`;
    opts.onProviderError?.(detail);
    console.warn(`[Router-stream] ${orModelId} failed: ${err?.message || err}`);
    return null;
  }
}

// Parse an OpenAI-style SSE stream, calling onChunk for each delta and returning
// the accumulated text.
async function consumeOpenAIStream(res: Response, onChunk: (text: string) => void): Promise<string> {
  const reader = (res.body as any).getReader();
  const dec = new TextDecoder();
  let buf = '', acc = '', done = false;
  while (!done) {
    const { done: rd, value } = await reader.read();
    if (rd) break;
    buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf('\n')) !== -1) {
      const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
      if (!line.startsWith('data:')) continue;
      const data = line.slice(5).trim(); if (!data) continue;
      if (data === '[DONE]') { done = true; break; }
      try {
        const p = JSON.parse(data);
        const delta = p?.choices?.[0]?.delta?.content;
        if (typeof delta === 'string' && delta) { acc += delta; onChunk(delta); }
        if (p?.choices?.[0]?.finish_reason) { done = true; }
      } catch { /* partial JSON across chunks — wait for more */ }
    }
  }
  return acc;
}
