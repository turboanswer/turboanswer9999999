const AGENT_PERSPECTIVES = [
  {
    id: 'technical',
    name: 'Technical Architect',
    prompt: 'You are a senior technical architect. Analyze this from a technical implementation perspective — focus on architecture, systems design, performance, scalability, and technical trade-offs. Be specific and practical.',
    model: 'openai/gpt-4o',
    modelLabel: 'GPT-4o',
  },
  {
    id: 'business',
    name: 'Business Strategist',
    prompt: 'You are a business strategist. Analyze this from a business perspective — focus on ROI, market positioning, competitive advantage, cost-benefit analysis, and business impact. Think like a CEO.',
    model: 'anthropic/claude-sonnet-4-20250514',
    modelLabel: 'Claude Sonnet 4',
  },
  {
    id: 'security',
    name: 'Security Analyst',
    prompt: 'You are a cybersecurity expert. Analyze this from a security perspective — focus on vulnerabilities, threat models, data protection, compliance requirements, and security best practices.',
    model: 'mistralai/mistral-large-latest',
    modelLabel: 'Mistral Large',
  },
  {
    id: 'ux',
    name: 'UX Researcher',
    prompt: 'You are a UX researcher and designer. Analyze this from a user experience perspective — focus on usability, accessibility, user psychology, pain points, and design patterns that work.',
    model: 'google/gemini-2.5-flash-preview',
    modelLabel: 'Gemini 2.5 Flash',
  },
  {
    id: 'data',
    name: 'Data Scientist',
    prompt: 'You are a data scientist. Analyze this from a data perspective — focus on metrics, measurement, analytics, data-driven insights, statistical thinking, and evidence-based conclusions.',
    model: 'cohere/command-r-plus',
    modelLabel: 'Command R+',
  },
  {
    id: 'innovation',
    name: 'Innovation Lead',
    prompt: 'You are an innovation strategist. Analyze this from a future-thinking perspective — focus on emerging trends, disruptive potential, creative solutions, and what most people overlook.',
    model: 'meta-llama/llama-3.1-70b-instruct',
    modelLabel: 'Llama 3.1 70B',
  },
  {
    id: 'risk',
    name: 'Risk Assessor',
    prompt: 'You are a risk management expert. Analyze this from a risk perspective — focus on what could go wrong, mitigation strategies, worst-case scenarios, dependencies, and contingency planning.',
    model: 'qwen/qwen-2.5-72b-instruct',
    modelLabel: 'Qwen 2.5 72B',
  },
  {
    id: 'practical',
    name: 'Implementation Lead',
    prompt: 'You are a pragmatic implementation lead. Analyze this from an execution perspective — focus on actionable steps, timelines, resource requirements, quick wins, and realistic roadmaps.',
    model: 'deepseek/deepseek-chat-v3-0324',
    modelLabel: 'DeepSeek V3',
  },
  {
    id: 'academic',
    name: 'Domain Expert',
    prompt: 'You are an academic domain expert. Analyze this with deep subject-matter expertise — cite relevant research, established frameworks, proven methodologies, and foundational principles.',
    model: 'perplexity/sonar-pro',
    modelLabel: 'Perplexity Sonar Pro',
  },
  {
    id: 'contrarian',
    name: 'Devil\'s Advocate',
    prompt: 'You are a critical thinker and devil\'s advocate. Challenge the obvious answer. Find flaws in popular assumptions, present alternative viewpoints, and highlight what others might miss or get wrong.',
    model: 'nvidia/llama-3.1-nemotron-70b-instruct',
    modelLabel: 'Nemotron 70B',
  },
];

async function callOpenRouter(model: string, prompt: string, maxTokens: number, temperature: number): Promise<string | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://turboanswer.it.com',
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
      return null;
    }

    const data: any = await response.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (err: any) {
    console.log(`[OpenRouter] ${model} failed: ${err.message}`);
    return null;
  }
}

async function callClaude(prompt: string, maxTokens: number, temperature: number): Promise<string | null> {
  const anthropicKey = process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;
  const anthropicBase = process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL || 'https://api.anthropic.com';
  if (!anthropicKey) return null;

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
    if (!response.ok) return null;
    const data: any = await response.json();
    return data.content?.[0]?.text || null;
  } catch {
    return null;
  }
}

async function callGemini(prompt: string, maxTokens: number, temperature: number): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

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

async function callAgent(perspective: typeof AGENT_PERSPECTIVES[0], question: string): Promise<{ id: string; name: string; model: string; response: string } | null> {
  const prompt = `${perspective.prompt}\n\nQuestion: ${question}\n\nGive a focused analysis in 2-4 paragraphs. Be specific, not generic. No preamble — go straight into your analysis.`;

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
  console.log(`[Multi-Agent] Starting 10-agent analysis with 10 different AI models...`);
  const startTime = Date.now();

  const agentPromises = AGENT_PERSPECTIVES.map(p => callAgent(p, question));
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

  const synthesisPrompt = `You are the Lead Synthesizer for TurboAnswer Research. You have received analysis from ${agentResponses.length} expert agents, each powered by a different AI model and examining the same question from a different perspective.

QUESTION: ${question}

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

  const modelList = agentResponses.map(a => `${a.name}: ${a.model}`).join(' · ');

  return `${synthesis}\n\n---\n*Powered by TurboAnswer Multi-Agent Research — ${agentResponses.length} expert perspectives from ${modelsUsed.length} AI models analyzed in ${totalTime}s*\n*Models: ${modelList}*`;
}
