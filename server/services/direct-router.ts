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

export type Message = { role: 'system' | 'user' | 'assistant'; content: string };

export type CallOpts = {
  maxTokens?: number;
  temperature?: number;
  jsonMode?: boolean;
  timeoutMs?: number;
};

type Resolved = { provider: 'anthropic' | 'openai' | 'google' | 'groq'; modelName: string };

function resolveModel(orId: string): Resolved | null {
  if (orId.startsWith('anthropic/')) {
    const lower = orId.toLowerCase();
    const name =
      lower.includes('haiku') ? 'claude-3-5-haiku-20241022' :
      lower.includes('opus') ? 'claude-opus-4-20250514' :
      'claude-sonnet-4-20250514';
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
    if (r.provider === 'anthropic') {
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
    if (r.provider === 'anthropic') {
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
