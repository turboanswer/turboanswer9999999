// Direct provider router. Takes OpenRouter-style model IDs (e.g.
// "anthropic/claude-sonnet-4.5", "openai/gpt-4o", "google/gemini-2.5-pro",
// "groq/llama-3.3-70b-versatile") and dispatches to the corresponding native
// provider API. Eliminates the OpenRouter middleman to:
//   * Cut ~15% in markup costs
//   * Remove one network hop (~150-300ms faster per call)
//   * Increase reliability (no OR rate-limits)
//
// Function signatures intentionally mirror the old callOR / callORStream so
// callers stay unchanged.

export type Message = { role: 'system' | 'user' | 'assistant'; content: any };

export type CallOpts = {
  maxTokens?: number;
  temperature?: number;
  jsonMode?: boolean;
  timeoutMs?: number;
};

type Resolved = { provider: 'anthropic'; modelName: string };

// When set, Claude calls are billed to Azure (routed through Foundry MaaS)
// instead of api.anthropic.com.
function useAzureForAnthropic(): boolean {
  return process.env.AZURE_HOSTED_ANTHROPIC === '1' || process.env.AZURE_HOSTED_ANTHROPIC === 'true';
}
// Azure AI Foundry endpoints (services.ai.azure.com) host the Claude deployments
// and serve them via /openai/v1/responses. When the configured endpoint is a
// Foundry endpoint we route Claude through it WITHOUT requiring the
// AZURE_HOSTED_ANTHROPIC flag — so any environment that has the Foundry
// endpoint/key (e.g. the Azure App Service) reaches Claude instead of falling
// through to an absent direct Anthropic key and failing "all providers failed".
function isFoundryEndpoint(ep: string): boolean {
  return ep.toLowerCase().includes('services.ai.azure.com');
}
// Map a Claude model ID to its Azure AI Foundry deployment name. The three live
// Claude deployments on this resource are the entire text engine:
//   Haiku  → free tier (Turbo)
//   Sonnet → pro tier  (Turbo Pro)
//   Opus   → research / enterprise / owner (Matrix AI, top tier)
// Override the defaults with AZURE_DEPLOYMENT_CLAUDE_{HAIKU,SONNET,OPUS} if your
// deployment names differ.
function claudeAzureDeployment(modelName: string): string {
  const m = modelName.toLowerCase();
  if (m.includes('haiku')) return process.env.AZURE_DEPLOYMENT_CLAUDE_HAIKU || 'claude-haiku-4-5';
  if (m.includes('opus')) return process.env.AZURE_DEPLOYMENT_CLAUDE_OPUS || 'claude-opus-4-8';
  return process.env.AZURE_DEPLOYMENT_CLAUDE_SONNET || 'claude-sonnet-4-5';
}
// Azure AI Foundry Responses API endpoint. Claude deployments on this
// services.ai.azure.com resource reject /chat/completions ("api_not_supported")
// and are served ONLY via /openai/v1/responses.
function azureResponsesUrl(): string {
  const ep = (process.env.AZURE_OPENAI_ENDPOINT || '').replace(/\/+$/, '');
  return `${ep}/openai/v1/responses`;
}
// Build a Responses-API request body from OpenAI-style messages. System turns
// become `instructions`; user/assistant turns become the `input` array.
function buildResponsesBody(deployment: string, messages: Message[], opts: CallOpts, stream: boolean): any {
  let instructions = '';
  const input: { role: string; content: any }[] = [];
  for (const m of messages) {
    if (m.role === 'system') {
      const c = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
      instructions += (instructions ? '\n\n' : '') + c;
    } else {
      input.push({ role: m.role, content: m.content });
    }
  }
  const body: any = { model: deployment, input, max_output_tokens: opts.maxTokens ?? 1500 };
  if (instructions) body.instructions = instructions;
  if (opts.temperature != null) body.temperature = opts.temperature;
  if (opts.jsonMode) body.text = { format: { type: 'json_object' } };
  if (stream) body.stream = true;
  return body;
}
// Pull the assistant text out of a non-streamed Responses-API payload.
function extractResponsesText(data: any): string | null {
  if (!data) return null;
  if (typeof data.output_text === 'string' && data.output_text) return data.output_text;
  if (Array.isArray(data.output)) {
    const text = data.output
      .map((o: any) => (Array.isArray(o?.content) ? o.content.map((c: any) => c?.text || '').join('') : ''))
      .join('');
    if (text) return text;
  }
  return null;
}
function stripJsonFences(s: string): string {
  return s.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
}

function resolveModel(orId: string): Resolved {
  // The entire text engine runs EXCLUSIVELY on Anthropic Claude. There is no
  // non-Claude path. Any model ID that reaches the router — including legacy
  // Gemini/Google, OpenAI/GPT, Groq/Llama, Mistral or Azure-GPT ids still passed
  // by older call sites — is transparently mapped to a Claude equivalent by tier.
  // Already-dated Anthropic ids are preserved as-is.
  const lower = orId.toLowerCase();
  if (lower.includes('anthropic/') && /\d{8}/.test(lower)) {
    return { provider: 'anthropic', modelName: orId.slice(orId.indexOf('/') + 1) };
  }
  // Tier mapping by capability hint in the id. "Small/fast" ids (haiku, nano,
  // mini, flash, lite, small) → Haiku; "opus" → Opus; everything else → Sonnet.
  const name =
    lower.includes('opus') ? 'claude-opus-4-1-20250805' :
    (lower.includes('haiku') || lower.includes('nano') || lower.includes('mini') ||
     lower.includes('flash') || lower.includes('lite') || lower.includes('small'))
      ? 'claude-3-5-haiku-20241022' :
    (lower.includes('sonnet-4-5') || lower.includes('sonnet-4.5')) ? 'claude-sonnet-4-5-20250929' :
    (lower.includes('sonnet-4') || lower.includes('sonnet4')) ? 'claude-sonnet-4-20250514' :
    (lower.includes('sonnet-3-7') || lower.includes('sonnet-3.7') || lower.includes('3-7-sonnet')) ? 'claude-3-7-sonnet-20250219' :
    'claude-sonnet-4-5-20250929';
  return { provider: 'anthropic', modelName: name };
}

export async function callDirect(orModelId: string, messages: Message[], opts: CallOpts = {}): Promise<string | null> {
  const r = resolveModel(orModelId);
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 30000);
  try {
    {
      // Path 1: Azure-hosted Claude via the Foundry Responses API
      // (services.ai.azure.com/openai/v1/responses). Billed to Azure. Attempted
      // whenever Foundry creds exist OR AZURE_HOSTED_ANTHROPIC forces it — we do
      // NOT require the flag, so prod (Azure App Service) reaches Claude even if
      // the flag was never set there.
      {
        const key = process.env.AZURE_OPENAI_API_KEY;
        const ep = (process.env.AZURE_OPENAI_ENDPOINT || '').replace(/\/+$/, '');
        if (key && ep && (useAzureForAnthropic() || isFoundryEndpoint(ep))) {
          const deployment = claudeAzureDeployment(r.modelName);
          const res = await fetch(azureResponsesUrl(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'api-key': key },
            body: JSON.stringify(buildResponsesBody(deployment, messages, opts, false)),
            signal: ctrl.signal,
          });
          if (res.ok) {
            const data: any = await res.json();
            let text = extractResponsesText(data);
            if (text && opts.jsonMode) text = stripJsonFences(text);
            if (text) { clearTimeout(t); return text; }
          } else {
            const txt = await res.text().catch(() => '');
            console.warn(`[Router/Azure-Claude] ${deployment} HTTP ${res.status}: ${txt.slice(0, 200)}`);
          }
          // Fall through to direct Anthropic if Azure deployment fails.
        }
      }
      // Path 2: Direct Anthropic API (billed to Anthropic).
      const key = process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;
      const base = process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL || 'https://api.anthropic.com';
      if (!key) return null;
      let sys = '';
      const msgs: any[] = [];
      for (const m of messages) {
        if (m.role === 'system') sys += (sys ? '\n\n' : '') + m.content;
        else msgs.push({ role: m.role, content: m.content });
      }
      const res = await fetch(`${base}/v1/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: r.modelName, max_tokens: opts.maxTokens ?? 1500, temperature: opts.temperature ?? 0.3, ...(sys ? { system: sys } : {}), messages: msgs }),
        signal: ctrl.signal,
      });
      clearTimeout(t);
      if (!res.ok) { const txt = await res.text().catch(() => ''); console.warn(`[Router/Anthropic] ${r.modelName} HTTP ${res.status}: ${txt.slice(0, 200)}`); return null; }
      const data: any = await res.json();
      return data.content?.[0]?.text || null;
    }
  } catch (err: any) {
    clearTimeout(t);
    console.warn(`[Router] ${orModelId} failed: ${err?.message || err}`);
    return null;
  }
}

export async function callDirectStream(orModelId: string, messages: Message[], opts: CallOpts, onChunk: (text: string) => void): Promise<string | null> {
  const r = resolveModel(orModelId);
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 45000);
  try {
    {
      // Azure-hosted Claude streaming via the Foundry Responses API (SSE).
      // Attempted whenever Foundry creds exist — see callDirect for why we do
      // not require the AZURE_HOSTED_ANTHROPIC flag.
      {
        const akey = process.env.AZURE_OPENAI_API_KEY;
        const aep = (process.env.AZURE_OPENAI_ENDPOINT || '').replace(/\/+$/, '');
        if (akey && aep && (useAzureForAnthropic() || isFoundryEndpoint(aep))) {
          const deployment = claudeAzureDeployment(r.modelName);
          const res = await fetch(azureResponsesUrl(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'api-key': akey },
            body: JSON.stringify(buildResponsesBody(deployment, messages, opts, true)),
            signal: ctrl.signal,
          });
          if (res.ok && res.body) {
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
                  if (p.type === 'response.output_text.delta' && typeof p.delta === 'string') { acc += p.delta; onChunk(p.delta); }
                  else if (p.type === 'response.completed' || p.type === 'response.failed' || p.type === 'error') { done = true; }
                } catch {}
              }
            }
            if (acc) { clearTimeout(t); return acc; }
          } else {
            const txt = await res.text().catch(() => '');
            console.warn(`[Router/Azure-Claude-stream] ${deployment} HTTP ${res.status}: ${txt.slice(0, 200)}`);
          }
          // Fall through to direct Anthropic only if nothing was emitted.
        }
      }
      const key = process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;
      const base = process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL || 'https://api.anthropic.com';
      if (!key) return null;
      let sys = '';
      const msgs: any[] = [];
      for (const m of messages) {
        if (m.role === 'system') sys += (sys ? '\n\n' : '') + m.content;
        else msgs.push({ role: m.role, content: m.content });
      }
      const res = await fetch(`${base}/v1/messages`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' }, body: JSON.stringify({ model: r.modelName, max_tokens: opts.maxTokens ?? 1500, temperature: opts.temperature ?? 0.3, ...(sys ? { system: sys } : {}), messages: msgs, stream: true }), signal: ctrl.signal });
      if (!res.ok || !res.body) { clearTimeout(t); return null; }
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
          try {
            const p = JSON.parse(data);
            if (p.type === 'content_block_delta' && p.delta?.text) { acc += p.delta.text; onChunk(p.delta.text); }
            else if (p.type === 'message_stop') { done = true; }
          } catch {}
        }
      }
      clearTimeout(t);
      return acc || null;
    }
  } catch (err: any) {
    clearTimeout(t);
    console.warn(`[Router-stream] ${orModelId} failed: ${err?.message || err}`);
    return null;
  }
}
