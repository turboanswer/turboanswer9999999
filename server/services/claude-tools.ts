// Native Claude tool use (function calling) for the main chat.
//
// This is REAL function calling: we hand Claude a set of first-party tools and
// let IT decide whether to call them. When it does, we execute the tool
// server-side and return the result. The computed facts are then injected into
// the main streaming model's system context (same mechanism as connectedContext)
// so the user-facing answer is phrased in one streamed pass — keeping the hot
// path fast while still giving deterministic, tool-grounded results.
//
// Why a pre-flight instead of streaming tool loops: the consumer chat streams to
// every tier on a latency budget. A regex gate means we only spend an extra
// (cheap, Haiku) tool-enabled round-trip when the message plausibly needs a
// tool — normal chat is untouched.

type ToolInput = Record<string, any>;

// ── First-party tools ──────────────────────────────────────────────────────
const TOOLS = [
  {
    name: 'calculate',
    description:
      'Evaluate an exact arithmetic expression. Use this for ANY math the user asks ' +
      '(addition, subtraction, multiplication, division, powers, percentages, order of ' +
      'operations) instead of computing it yourself, so the result is always exact.',
    input_schema: {
      type: 'object',
      properties: {
        expression: {
          type: 'string',
          description: 'A pure arithmetic expression, e.g. "1234*5678", "(40*1.07)+3", "2^10".',
        },
      },
      required: ['expression'],
    },
  },
  {
    name: 'current_datetime',
    description:
      "Get the current date and time. Use this whenever the user asks what time/date it is " +
      'now, what day today is, or anything that depends on the present moment.',
    input_schema: {
      type: 'object',
      properties: {
        timezone: {
          type: 'string',
          description: 'IANA timezone like "America/New_York". Omit to use the user default.',
        },
      },
      required: [],
    },
  },
] as const;

// Cheap gate: only invoke the tool-enabled Claude call when the message plausibly
// needs a tool. Keeps ordinary chat on the fast path.
const MATH_RE = /\d\s*[-+*/^%x×÷]\s*\d|\b(calculate|compute|what(?:'s| is)\s+\d|how much is|square root|sqrt|percent|% of)\b/i;
const TIME_RE = /\b(what(?:'s| is)?\s+(?:the\s+)?(?:time|date|day)|current (?:time|date)|today'?s date|what day is it|right now)\b/i;

export function mightNeedTool(message: string): boolean {
  if (!message) return false;
  return MATH_RE.test(message) || TIME_RE.test(message);
}

// ── Tool executors (deterministic, server-side) ────────────────────────────
function safeCalculate(expression: string): string {
  const expr = String(expression || '').trim();
  // Length cap: bound CPU/abuse from a huge expression before any evaluation.
  if (expr.length > 200) return 'Error: expression too long.';
  // Whitelist: digits, operators, parens, decimal point, commas, whitespace.
  if (!expr || !/^[0-9+\-*/%^().,\s×÷x]+$/i.test(expr)) {
    return 'Error: not a pure arithmetic expression.';
  }
  // Cap exponent chains so "9^9^9^9" can't blow up CPU/memory.
  if ((expr.match(/\^|\*\*/g) || []).length > 3) return 'Error: expression too complex.';
  const normalized = expr
    .replace(/[×x]/gi, '*')
    .replace(/÷/g, '/')
    .replace(/,/g, '')
    .replace(/\^/g, '**');
  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function(`"use strict"; return (${normalized});`);
    const result = fn();
    if (typeof result !== 'number' || !isFinite(result)) return 'Error: invalid result.';
    // Trim floating noise but keep precision for non-integers.
    const out = Number.isInteger(result) ? String(result) : String(Number(result.toPrecision(12)));
    return `${expr} = ${out}`;
  } catch {
    return 'Error: could not evaluate expression.';
  }
}

function currentDateTime(timezone?: string, fallbackTz?: string): string {
  const tz = timezone || fallbackTz || 'UTC';
  try {
    const now = new Date();
    const formatted = now.toLocaleString('en-US', {
      timeZone: tz,
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
    });
    return `Current date and time (${tz}): ${formatted}`;
  } catch {
    const now = new Date();
    return `Current date and time (UTC): ${now.toUTCString()}`;
  }
}

function runTool(name: string, input: ToolInput, fallbackTz?: string): string {
  switch (name) {
    case 'calculate':
      return safeCalculate(input?.expression);
    case 'current_datetime':
      return currentDateTime(input?.timezone, fallbackTz);
    default:
      return `Error: unknown tool ${name}.`;
  }
}

// ── Native tool-use pre-flight ─────────────────────────────────────────────
// Returns a context string of computed tool results to inject, or null when no
// tool was needed / nothing useful was produced. Uses Haiku for speed/cost.
export async function runChatToolPreflight(
  message: string,
  opts: { timezone?: string; timeoutMs?: number } = {}
): Promise<string | null> {
  if (!mightNeedTool(message)) return null;

  const key = process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;
  const base = process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL || 'https://api.anthropic.com';
  if (!key) return null;

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 6000);
  try {
    const res = await fetch(`${base.replace(/\/$/, '')}/v1/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 512,
        temperature: 0,
        tools: TOOLS,
        tool_choice: { type: 'auto' },
        messages: [{ role: 'user', content: message }],
      }),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      console.warn(`[ClaudeTools] preflight HTTP ${res.status}: ${txt.slice(0, 160)}`);
      return null;
    }
    const data: any = await res.json();
    const blocks: any[] = Array.isArray(data?.content) ? data.content : [];
    const toolUses = blocks.filter((b) => b?.type === 'tool_use');
    if (toolUses.length === 0) return null;

    const results: string[] = [];
    for (const tu of toolUses) {
      const out = runTool(tu.name, tu.input || {}, opts.timezone);
      if (out && !out.startsWith('Error:')) results.push(out);
    }
    if (results.length === 0) return null;

    return (
      `\n\nA tool was just run for THIS request and produced exact results — ` +
      `use them verbatim in your answer; do not recompute or contradict them.\n` +
      results.map((r) => `- ${r}`).join('\n')
    );
  } catch (e: any) {
    clearTimeout(t);
    if (e?.name !== 'AbortError') console.warn(`[ClaudeTools] preflight failed: ${e?.message || e}`);
    return null;
  }
}
