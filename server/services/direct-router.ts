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

type Resolved = { provider: 'anthropic' | 'openai' | 'google' | 'groq' | 'azure'; modelName: string };

// Azure OpenAI defaults. Deployment names default to the model name; override via env if you named your Azure deployments differently.
const AZURE_API_VERSION = process.env.AZURE_OPENAI_API_VERSION || '2024-10-21';
function azureDeployment(modelName: string): string {
  const lower = modelName.toLowerCase();
  // GPT-5.4 family (current tier ladder). Code refers to models with dashes
  // (gpt-5-4-nano) but Azure deployments are named with dots (gpt-5.4-nano).
  if (lower.includes('5-4-nano') || lower.includes('5.4-nano')) {
    return process.env.AZURE_DEPLOYMENT_GPT54_NANO || 'gpt-5.4-nano';
  }
  if (lower.includes('5-4-mini') || lower.includes('5.4-mini')) {
    return process.env.AZURE_DEPLOYMENT_GPT54_MINI || 'gpt-5.4-mini';
  }
  if (lower.includes('5-4-pro') || lower.includes('5.4-pro')) {
    return process.env.AZURE_DEPLOYMENT_GPT54_PRO || 'gpt-5.4-pro';
  }
  // Legacy GPT-4 family fallbacks.
  if (lower.includes('mini')) return process.env.AZURE_OPENAI_DEPLOYMENT_GPT4O_MINI || 'gpt-4o-mini';
  if (lower.includes('turbo')) return process.env.AZURE_OPENAI_DEPLOYMENT_GPT4_TURBO || 'gpt-4-turbo';
  return process.env.AZURE_OPENAI_DEPLOYMENT_GPT4O || 'gpt-4o';
}
function azureUrl(deployment: string, path: 'chat/completions'): string {
  const ep = (process.env.AZURE_OPENAI_ENDPOINT || '').replace(/\/+$/, '');
  // Newer Azure AI Foundry endpoints (services.ai.azure.com) use the v1 path
  // with model in the body. Older Azure OpenAI endpoints (openai.azure.com)
  // use deployment-in-URL with api-version. We detect which to use by host.
  if (ep.includes('services.ai.azure.com')) {
    return `${ep}/openai/v1/${path}`;
  }
  return `${ep}/openai/deployments/${encodeURIComponent(deployment)}/${path}?api-version=${AZURE_API_VERSION}`;
}
function isAzureFoundry(): boolean {
  return (process.env.AZURE_OPENAI_ENDPOINT || '').includes('services.ai.azure.com');
}
// When set, Claude calls are billed to Azure (routed through Foundry MaaS)
// instead of api.anthropic.com.
function useAzureForAnthropic(): boolean {
  return process.env.AZURE_HOSTED_ANTHROPIC === '1' || process.env.AZURE_HOSTED_ANTHROPIC === 'true';
}
// Map a dated Claude model ID back to its Azure deployment name.
// Override per-model with AZURE_DEPLOYMENT_CLAUDE_* env vars if your
// deployment names differ.
function claudeAzureDeployment(modelName: string): string {
  const m = modelName.toLowerCase();
  if (m.includes('opus-4-1') || m.includes('opus')) {
    return process.env.AZURE_DEPLOYMENT_CLAUDE_OPUS_4_1 || 'claude-opus-4-1';
  }
  if (m.includes('sonnet-4-5')) {
    return process.env.AZURE_DEPLOYMENT_CLAUDE_SONNET_4_5 || 'claude-sonnet-4-5';
  }
  if (m.includes('sonnet-4')) {
    return process.env.AZURE_DEPLOYMENT_CLAUDE_SONNET_4 || 'claude-sonnet-4';
  }
  if (m.includes('3-7-sonnet') || m.includes('sonnet-3-7')) {
    return process.env.AZURE_DEPLOYMENT_CLAUDE_SONNET_3_7 || 'claude-sonnet-3-7';
  }
  return process.env.AZURE_DEPLOYMENT_CLAUDE_SONNET_4_5 || 'claude-sonnet-4-5';
}
// Azure Foundry MaaS endpoint for non-OpenAI models (Anthropic, Mistral, etc.)
function azureModelsUrl(): string {
  const ep = (process.env.AZURE_OPENAI_ENDPOINT || '').replace(/\/+$/, '');
  const apiVer = process.env.AZURE_MAAS_API_VERSION || '2024-05-01-preview';
  // Foundry hosts: use /models/ path. Legacy hosts don't support MaaS.
  return `${ep}/models/chat/completions?api-version=${apiVer}`;
}

function resolveModel(orId: string): Resolved | null {
  if (orId.startsWith('azure/')) return { provider: 'azure', modelName: orId.slice(6) };
  if (orId.startsWith('anthropic/')) {
    const lower = orId.toLowerCase();
    // Specific model IDs win first, then family tags.
    const name =
      /\d{8}/.test(lower) ? orId.slice('anthropic/'.length) : // already a dated ID
      lower.includes('opus-4-1') || (lower.includes('opus') && lower.includes('4.1')) ? 'claude-opus-4-1-20250805' :
      lower.includes('opus') ? 'claude-opus-4-1-20250805' :
      lower.includes('sonnet-4-5') || lower.includes('sonnet-4.5') ? 'claude-sonnet-4-5-20250929' :
      lower.includes('sonnet-4') || lower.includes('sonnet4') ? 'claude-sonnet-4-20250514' :
      lower.includes('sonnet-3-7') || lower.includes('sonnet-3.7') || lower.includes('3-7-sonnet') ? 'claude-3-7-sonnet-20250219' :
      lower.includes('haiku') ? 'claude-3-5-haiku-20241022' :
      'claude-sonnet-4-5-20250929';
    return { provider: 'anthropic', modelName: name };
  }
  if (orId.startsWith('openai/')) return { provider: 'openai', modelName: orId.slice(7) };
  if (orId.startsWith('google/')) return { provider: 'google', modelName: orId.slice(7) };
  if (orId.startsWith('groq/')) return { provider: 'groq', modelName: orId.slice(5) };
  return null;
}

export async function callDirect(orModelId: string, messages: Message[], opts: CallOpts = {}): Promise<string | null> {
  const r = resolveModel(orModelId);
  if (!r) { console.warn(`[Router] No direct provider for ${orModelId}`); return null; }
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 30000);
  try {
    if (r.provider === 'azure') {
      const key = process.env.AZURE_OPENAI_API_KEY;
      const ep = process.env.AZURE_OPENAI_ENDPOINT;
      if (!key || !ep) { console.warn('[Router/Azure] missing AZURE_OPENAI_API_KEY or AZURE_OPENAI_ENDPOINT'); return null; }
      const deployment = azureDeployment(r.modelName);
      // GPT-5 family (reasoning models) require `max_completion_tokens` instead
      // of `max_tokens` and only support the default temperature.
      const isReasoning = /gpt-5/.test(r.modelName.toLowerCase());
      const body: any = { messages };
      if (isAzureFoundry()) body.model = deployment;
      if (isReasoning) {
        body.max_completion_tokens = opts.maxTokens ?? 1500;
      } else {
        body.max_tokens = opts.maxTokens ?? 1500;
        body.temperature = opts.temperature ?? 0.3;
      }
      if (opts.jsonMode) body.response_format = { type: 'json_object' };
      const res = await fetch(azureUrl(deployment, 'chat/completions'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'api-key': key },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      clearTimeout(t);
      if (!res.ok) { const txt = await res.text().catch(() => ''); console.warn(`[Router/Azure] ${deployment} HTTP ${res.status}: ${txt.slice(0, 200)}`); return null; }
      const data: any = await res.json();
      return data.choices?.[0]?.message?.content || null;
    }
    if (r.provider === 'anthropic') {
      // Path 1: Azure-hosted Claude (billed to Azure via Foundry MaaS).
      if (useAzureForAnthropic()) {
        const key = process.env.AZURE_OPENAI_API_KEY;
        const ep = process.env.AZURE_OPENAI_ENDPOINT;
        if (key && ep) {
          const deployment = claudeAzureDeployment(r.modelName);
          const body: any = { model: deployment, messages, max_tokens: opts.maxTokens ?? 1500, temperature: opts.temperature ?? 0.3 };
          if (opts.jsonMode) body.response_format = { type: 'json_object' };
          const res = await fetch(azureModelsUrl(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'api-key': key, 'Authorization': `Bearer ${key}` },
            body: JSON.stringify(body),
            signal: ctrl.signal,
          });
          clearTimeout(t);
          if (res.ok) { const data: any = await res.json(); return data.choices?.[0]?.message?.content || null; }
          const txt = await res.text().catch(() => '');
          console.warn(`[Router/Azure-Claude] ${deployment} HTTP ${res.status}: ${txt.slice(0, 200)}`);
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
    if (r.provider === 'openai' || r.provider === 'groq') {
      const key = r.provider === 'openai' ? process.env.OPENAI_API_KEY : process.env.GROQ_API_KEY;
      if (!key) return null;
      const url = r.provider === 'openai' ? 'https://api.openai.com/v1/chat/completions' : 'https://api.groq.com/openai/v1/chat/completions';
      const body: any = { model: r.modelName, messages, max_tokens: opts.maxTokens ?? 1500, temperature: opts.temperature ?? 0.3 };
      if (opts.jsonMode) body.response_format = { type: 'json_object' };
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` }, body: JSON.stringify(body), signal: ctrl.signal });
      clearTimeout(t);
      if (!res.ok) { const txt = await res.text().catch(() => ''); console.warn(`[Router/${r.provider}] ${r.modelName} HTTP ${res.status}: ${txt.slice(0, 200)}`); return null; }
      const data: any = await res.json();
      return data.choices?.[0]?.message?.content || null;
    }
    if (r.provider === 'google') {
      const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
      if (!key) return null;
      let sys = '';
      const contents: any[] = [];
      for (const m of messages) {
        if (m.role === 'system') sys += (sys ? '\n\n' : '') + m.content;
        else contents.push({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] });
      }
      const body: any = { contents, generationConfig: { temperature: opts.temperature ?? 0.3, maxOutputTokens: opts.maxTokens ?? 1500, ...(opts.jsonMode ? { responseMimeType: 'application/json' } : {}) } };
      if (sys) body.systemInstruction = { parts: [{ text: sys }] };
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${r.modelName}:generateContent?key=${key}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctrl.signal });
      clearTimeout(t);
      if (!res.ok) { const txt = await res.text().catch(() => ''); console.warn(`[Router/Gemini] ${r.modelName} HTTP ${res.status}: ${txt.slice(0, 200)}`); return null; }
      const data: any = await res.json();
      return data.candidates?.[0]?.content?.parts?.map((p: any) => p.text).filter(Boolean).join('') || null;
    }
    return null;
  } catch (err: any) {
    clearTimeout(t);
    console.warn(`[Router] ${orModelId} failed: ${err?.message || err}`);
    return null;
  }
}

export async function callDirectStream(orModelId: string, messages: Message[], opts: CallOpts, onChunk: (text: string) => void): Promise<string | null> {
  const r = resolveModel(orModelId);
  if (!r) return null;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 45000);
  try {
    if (r.provider === 'azure') {
      const key = process.env.AZURE_OPENAI_API_KEY;
      const ep = process.env.AZURE_OPENAI_ENDPOINT;
      if (!key || !ep) return null;
      const deployment = azureDeployment(r.modelName);
      // GPT-5 family: use max_completion_tokens and the default temperature.
      const isReasoning = /gpt-5/.test(r.modelName.toLowerCase());
      const body: any = { messages, stream: true };
      if (isAzureFoundry()) body.model = deployment;
      if (isReasoning) {
        body.max_completion_tokens = opts.maxTokens ?? 1500;
      } else {
        body.max_tokens = opts.maxTokens ?? 1500;
        body.temperature = opts.temperature ?? 0.3;
      }
      const res = await fetch(azureUrl(deployment, 'chat/completions'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'api-key': key },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
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
          if (data === '[DONE]') { done = true; break; }
          try {
            const p = JSON.parse(data);
            const delta = p?.choices?.[0]?.delta?.content;
            if (delta) { acc += delta; onChunk(delta); }
          } catch {}
        }
      }
      clearTimeout(t);
      return acc || null;
    }
    if (r.provider === 'anthropic') {
      // Azure-hosted Claude streaming: use OpenAI-compatible SSE format.
      if (useAzureForAnthropic()) {
        const akey = process.env.AZURE_OPENAI_API_KEY;
        const aep = process.env.AZURE_OPENAI_ENDPOINT;
        if (akey && aep) {
          const deployment = claudeAzureDeployment(r.modelName);
          const res = await fetch(azureModelsUrl(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'api-key': akey, 'Authorization': `Bearer ${akey}` },
            body: JSON.stringify({ model: deployment, messages, max_tokens: opts.maxTokens ?? 1500, temperature: opts.temperature ?? 0.3, stream: true }),
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
                  const delta = p?.choices?.[0]?.delta?.content;
                  if (delta) { acc += delta; onChunk(delta); }
                } catch {}
              }
            }
            clearTimeout(t);
            return acc || null;
          }
          // Fall through to direct Anthropic on Azure failure.
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
    if (r.provider === 'openai' || r.provider === 'groq') {
      const key = r.provider === 'openai' ? process.env.OPENAI_API_KEY : process.env.GROQ_API_KEY;
      if (!key) return null;
      const url = r.provider === 'openai' ? 'https://api.openai.com/v1/chat/completions' : 'https://api.groq.com/openai/v1/chat/completions';
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` }, body: JSON.stringify({ model: r.modelName, messages, max_tokens: opts.maxTokens ?? 1500, temperature: opts.temperature ?? 0.3, stream: true }), signal: ctrl.signal });
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
          if (data === '[DONE]') { done = true; break; }
          try {
            const p = JSON.parse(data);
            const delta = p?.choices?.[0]?.delta?.content;
            if (delta) { acc += delta; onChunk(delta); }
          } catch {}
        }
      }
      clearTimeout(t);
      return acc || null;
    }
    if (r.provider === 'google') {
      const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
      if (!key) return null;
      let sys = '';
      const contents: any[] = [];
      for (const m of messages) {
        if (m.role === 'system') sys += (sys ? '\n\n' : '') + m.content;
        else contents.push({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] });
      }
      const body: any = { contents, generationConfig: { temperature: opts.temperature ?? 0.3, maxOutputTokens: opts.maxTokens ?? 1500 } };
      if (sys) body.systemInstruction = { parts: [{ text: sys }] };
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${r.modelName}:streamGenerateContent?alt=sse&key=${key}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctrl.signal });
      if (!res.ok || !res.body) { clearTimeout(t); return null; }
      const reader = (res.body as any).getReader();
      const dec = new TextDecoder();
      let buf = '', acc = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let i;
        while ((i = buf.indexOf('\n')) !== -1) {
          const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
          if (!line.startsWith('data:')) continue;
          const data = line.slice(5).trim(); if (!data) continue;
          try {
            const p = JSON.parse(data);
            const text = p?.candidates?.[0]?.content?.parts?.map((x: any) => x.text).filter(Boolean).join('');
            if (text) { acc += text; onChunk(text); }
          } catch {}
        }
      }
      clearTimeout(t);
      return acc || null;
    }
    return null;
  } catch (err: any) {
    clearTimeout(t);
    console.warn(`[Router-stream] ${orModelId} failed: ${err?.message || err}`);
    return null;
  }
}
