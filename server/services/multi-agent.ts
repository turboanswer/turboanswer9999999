const AGENT_PERSPECTIVES = [
  {
    id: 'architect',
    name: 'Technical Architect',
    prompt: 'You are a senior technical architect. Analyze this from a technical implementation perspective — focus on architecture, systems design, performance, scalability, and technical trade-offs. Be specific and practical.',
    model: 'anthropic/claude-sonnet-4.5',
    modelLabel: 'Matrix Architect',
  },
  {
    id: 'strategist',
    name: 'Business Strategist',
    prompt: 'You are a business strategist. Analyze this from a business perspective — focus on ROI, market positioning, competitive advantage, cost-benefit analysis, and business impact. Think like a CEO.',
    model: 'openai/gpt-4o',
    modelLabel: 'Matrix Strategist',
  },
  {
    id: 'analyst',
    name: 'Data Analyst',
    prompt: 'You are a data scientist. Analyze this from a data perspective — focus on metrics, measurement, analytics, data-driven insights, statistical thinking, and evidence-based conclusions.',
    model: 'google/gemini-2.5-pro',
    modelLabel: 'Matrix Analyst',
  },
  {
    id: 'visionary',
    name: 'Innovation Lead',
    prompt: 'You are an innovation strategist. Analyze this from a future-thinking perspective — focus on emerging trends, disruptive potential, creative solutions, and what most people overlook.',
    model: 'x-ai/grok-4',
    modelLabel: 'Matrix Visionary',
  },
  {
    id: 'skeptic',
    name: 'Devil\'s Advocate',
    prompt: 'You are a critical thinker and devil\'s advocate. Challenge the obvious answer. Find flaws in popular assumptions, present alternative viewpoints, and highlight what others might miss or get wrong.',
    model: 'deepseek/deepseek-r1',
    modelLabel: 'Matrix Skeptic',
  },
];

function tryComputeArithmetic(question: string): string | null {
  const cleaned = question
    .replace(/[×x✕⋅·]/gi, '*')
    .replace(/÷/g, '/')
    .replace(/\bplus\b/gi, '+')
    .replace(/\bminus\b/gi, '-')
    .replace(/\btimes\b|\bmultiplied by\b/gi, '*')
    .replace(/\bdivided by\b/gi, '/')
    .replace(/\bmod(?:ulo)?\b/gi, '%')
    .replace(/\bto the power of\b|\^/gi, '**')
    .replace(/[, _]/g, '');
  const expr = cleaned.match(/(?:\d+(?:\.\d+)?(?:\s*(?:\*\*|[+\-*/%])\s*\d+(?:\.\d+)?)+)/);
  if (!expr) return null;
  const e = expr[0].replace(/\s+/g, '');
  if (!/^[\d+\-*/%.()*]+$/.test(e.replace(/\*\*/g, ''))) return null;
  const allInts = !e.includes('.');
  try {
    if (allInts) {
      const tokens = e.match(/\d+|\*\*|[+\-*/%]/g);
      if (!tokens) return null;
      const vals: bigint[] = [];
      const ops: string[] = [];
      const prec = (op: string) => op === '**' ? 3 : (op === '*' || op === '/' || op === '%') ? 2 : 1;
      const apply = () => {
        const op = ops.pop()!;
        const b = vals.pop()!;
        const a = vals.pop()!;
        if (op === '+') vals.push(a + b);
        else if (op === '-') vals.push(a - b);
        else if (op === '*') vals.push(a * b);
        else if (op === '/') vals.push(a / b);
        else if (op === '%') vals.push(a % b);
        else if (op === '**') vals.push(a ** b);
      };
      for (const t of tokens) {
        if (/^\d+$/.test(t)) vals.push(BigInt(t));
        else {
          while (ops.length && prec(ops[ops.length - 1]) >= prec(t)) apply();
          ops.push(t);
        }
      }
      while (ops.length) apply();
      return vals[0].toString();
    } else {
      // eslint-disable-next-line no-new-func
      const result = Function(`"use strict"; return (${e});`)();
      if (typeof result === 'number' && Number.isFinite(result)) return String(result);
    }
  } catch {
    return null;
  }
  return null;
}

async function callOpenRouter(model: string, prompt: string, maxTokens: number, temperature: number): Promise<string | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;

  const { isModelDowned } = await import('./auto-remediation.js');
  if (isModelDowned('openrouter')) {
    console.log(`[OpenRouter] Skipped ${model} — provider marked downed by auto-remediation`);
    return null;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://turbo-answer.replit.app',
        'X-Title': 'TurboAnswer Research',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens,
        temperature,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      console.log(`[OpenRouter] ${model} HTTP ${response.status}: ${errText.slice(0, 200)}`);
      const { trackError } = await import('./error-tracker.js');
      trackError('aiError', `OpenRouter ${model} HTTP ${response.status}: ${errText.slice(0, 200)}`);
      return null;
    }

    const data: any = await response.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (err: any) {
    console.log(`[OpenRouter] ${model} failed: ${err.message}`);
    const { trackError } = await import('./error-tracker.js');
    trackError('aiError', `OpenRouter ${model} failed: ${err.message}`);
    return null;
  }
}

async function callClaude(prompt: string, maxTokens: number, temperature: number): Promise<string | null> {
  const anthropicKey = process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;
  const anthropicBase = process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL || 'https://api.anthropic.com';
  if (!anthropicKey) return null;

  const { isModelDowned } = await import('./auto-remediation.js');
  if (isModelDowned('anthropic')) {
    console.log(`[Claude] Skipped — provider marked downed by auto-remediation`);
    return null;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    const response = await fetch(`${anthropicBase}/v1/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: maxTokens,
        temperature,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!response.ok) {
      if (response.status === 429 || response.status === 529) {
        const { trackError } = await import('./error-tracker.js');
        trackError('aiError', `Anthropic Claude HTTP ${response.status}: rate limit/quota`);
      }
      return null;
    }
    const data: any = await response.json();
    return data.content?.[0]?.text || null;
  } catch {
    return null;
  }
}

async function callGemini(prompt: string, maxTokens: number, temperature: number): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const { isModelDowned } = await import('./auto-remediation.js');
  if (isModelDowned('gemini')) {
    console.log(`[Gemini] Skipped — provider marked downed by auto-remediation`);
    return null;
  }

  const models = ['gemini-2.5-flash', 'gemini-2.0-flash'];
  for (const model of models) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature, maxOutputTokens: maxTokens },
          }),
          signal: controller.signal,
        }
      );
      clearTimeout(timeout);
      if (!response.ok) continue;
      const data: any = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return text;
    } catch {
      continue;
    }
  }
  return null;
}

async function callAgent(perspective: typeof AGENT_PERSPECTIVES[0], question: string, verifiedAnswer?: string | null): Promise<{ id: string; name: string; model: string; response: string } | null> {
  const groundTruth = verifiedAnswer
    ? `\n\nVERIFIED ARITHMETIC RESULT (computed exactly with arbitrary-precision math, treat as ground truth — do NOT recompute or contradict it): ${verifiedAnswer}\n`
    : '';
  const prompt = `${perspective.prompt}\n\nQuestion: ${question}${groundTruth}\nGive a focused analysis in 2-4 paragraphs. Be specific, not generic. No preamble — go straight into your analysis.`;

  let response: string | null = null;
  let actualModel = perspective.modelLabel;

  response = await callOpenRouter(perspective.model, prompt, 1500, 0.3);

  if (response) {
    console.log(`[Multi-Agent] ${perspective.name} → ${perspective.modelLabel} ✓`);
  }

  if (!response) {
    console.log(`[Multi-Agent] ${perspective.name} → ${perspective.modelLabel} failed, falling back to Claude`);
    response = await callClaude(prompt, 1500, 0.2);
    if (response) actualModel = 'Claude Sonnet 4 (fallback)';
  }

  if (!response) {
    console.log(`[Multi-Agent] ${perspective.name} → Claude failed, falling back to Gemini`);
    response = await callGemini(prompt, 1500, 0.3);
    if (response) actualModel = 'Gemini (fallback)';
  }

  if (!response) return null;

  return { id: perspective.id, name: perspective.name, model: actualModel, response };
}

export async function runMultiAgentResearch(question: string, languageInstruction: string = '', behaviorInstruction: string = ''): Promise<string> {
  console.log(`[Matrix AI] Starting ${AGENT_PERSPECTIVES.length}-perspective analysis...`);
  const startTime = Date.now();

  const verifiedAnswer = tryComputeArithmetic(question);
  if (verifiedAnswer) {
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[Multi-Agent] Arithmetic detected — short-circuiting with exact result in ${totalTime}s`);
    return `**${verifiedAnswer}**\n\n*Computed exactly with arbitrary-precision arithmetic in ${totalTime}s.*`;
  }

  const agentPromises = AGENT_PERSPECTIVES.map(p => callAgent(p, question, verifiedAnswer));
  const results = await Promise.allSettled(agentPromises);

  const agentResponses = results
    .map((r) => r.status === 'fulfilled' && r.value ? r.value : null)
    .filter(Boolean) as { id: string; name: string; model: string; response: string }[];

  const modelsUsed = [...new Set(agentResponses.map(a => a.model))];
  console.log(`[Multi-Agent] ${agentResponses.length}/10 agents responded in ${Date.now() - startTime}ms`);
  console.log(`[Multi-Agent] Models used: ${modelsUsed.join(', ')}`);

  if (agentResponses.length === 0) {
    throw new Error('No agents were able to respond. Please try again.');
  }

  const synthesisInput = agentResponses.map(a =>
    `### ${a.name} (${a.model})\n${a.response}`
  ).join('\n\n');

  const verifiedBlock = verifiedAnswer
    ? `\nVERIFIED ARITHMETIC RESULT (computed exactly with arbitrary-precision math — this is the authoritative answer; quote it verbatim, do NOT recompute, round, or contradict it): ${verifiedAnswer}\n`
    : '';

  const synthesisPrompt = `You are the Lead Synthesizer for TurboAnswer Research. You have received analysis from ${agentResponses.length} expert agents, each powered by a different AI model and examining the same question from a different perspective.

QUESTION: ${question}
${verifiedBlock}
AGENT ANALYSES:
${synthesisInput}

YOUR TASK:
Create one comprehensive, well-structured response that:
1. Opens with a clear, direct answer to the question
2. Weaves together the strongest insights from all agents into a cohesive narrative
3. Uses headings (##) to organize by theme, not by agent
4. Highlights areas of consensus and important disagreements
5. Ends with actionable takeaways or a clear conclusion
6. Does NOT mention the agents by name or say "the technical agent said..." — present it as unified expert analysis

${languageInstruction ? languageInstruction : ''}
${behaviorInstruction ? behaviorInstruction : ''}

Write the synthesized response now:`;

  let synthesis: string | null = null;

  synthesis = await callOpenRouter('anthropic/claude-sonnet-4-20250514', synthesisPrompt, 4096, 0.15);
  if (synthesis) {
    console.log(`[Multi-Agent] Synthesis by Claude Sonnet 4 (via OpenRouter)`);
  }

  if (!synthesis) {
    synthesis = await callClaude(synthesisPrompt, 4096, 0.15);
    if (synthesis) console.log(`[Multi-Agent] Synthesis by Claude (direct)`);
  }

  if (!synthesis) {
    synthesis = await callGemini(synthesisPrompt, 4096, 0.2);
    if (synthesis) console.log(`[Multi-Agent] Synthesis by Gemini (fallback)`);
  }

  if (!synthesis) {
    synthesis = agentResponses.map(a => `## ${a.name}\n\n${a.response}`).join('\n\n---\n\n');
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[Multi-Agent] Synthesis complete in ${totalTime}s (${agentResponses.length} agents, ${modelsUsed.length} models)`);

  return synthesis;
}
