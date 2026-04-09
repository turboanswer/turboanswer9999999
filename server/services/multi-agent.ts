const AGENT_PERSPECTIVES = [
  {
    id: 'technical',
    name: 'Technical Architect',
    prompt: 'You are a senior technical architect. Analyze this from a technical implementation perspective — focus on architecture, systems design, performance, scalability, and technical trade-offs. Be specific and practical.',
  },
  {
    id: 'business',
    name: 'Business Strategist',
    prompt: 'You are a business strategist. Analyze this from a business perspective — focus on ROI, market positioning, competitive advantage, cost-benefit analysis, and business impact. Think like a CEO.',
  },
  {
    id: 'security',
    name: 'Security Analyst',
    prompt: 'You are a cybersecurity expert. Analyze this from a security perspective — focus on vulnerabilities, threat models, data protection, compliance requirements, and security best practices.',
  },
  {
    id: 'ux',
    name: 'UX Researcher',
    prompt: 'You are a UX researcher and designer. Analyze this from a user experience perspective — focus on usability, accessibility, user psychology, pain points, and design patterns that work.',
  },
  {
    id: 'data',
    name: 'Data Scientist',
    prompt: 'You are a data scientist. Analyze this from a data perspective — focus on metrics, measurement, analytics, data-driven insights, statistical thinking, and evidence-based conclusions.',
  },
  {
    id: 'innovation',
    name: 'Innovation Lead',
    prompt: 'You are an innovation strategist. Analyze this from a future-thinking perspective — focus on emerging trends, disruptive potential, creative solutions, and what most people overlook.',
  },
  {
    id: 'risk',
    name: 'Risk Assessor',
    prompt: 'You are a risk management expert. Analyze this from a risk perspective — focus on what could go wrong, mitigation strategies, worst-case scenarios, dependencies, and contingency planning.',
  },
  {
    id: 'practical',
    name: 'Implementation Lead',
    prompt: 'You are a pragmatic implementation lead. Analyze this from an execution perspective — focus on actionable steps, timelines, resource requirements, quick wins, and realistic roadmaps.',
  },
  {
    id: 'academic',
    name: 'Domain Expert',
    prompt: 'You are an academic domain expert. Analyze this with deep subject-matter expertise — cite relevant research, established frameworks, proven methodologies, and foundational principles.',
  },
  {
    id: 'contrarian',
    name: 'Devil\'s Advocate',
    prompt: 'You are a critical thinker and devil\'s advocate. Challenge the obvious answer. Find flaws in popular assumptions, present alternative viewpoints, and highlight what others might miss or get wrong.',
  },
];

async function callAzureModel(prompt: string, maxTokens: number, temperature: number, deploymentName?: string): Promise<string | null> {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  if (!endpoint || !apiKey) return null;

  const deployment = deploymentName || 'gpt-4o';
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    const response = await fetch(`${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=2024-08-01-preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': apiKey },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens,
        temperature,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!response.ok) return null;
    const data: any = await response.json();
    return data.choices?.[0]?.message?.content || null;
  } catch {
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

  const models = ['gemini-3.1-flash-lite-preview', 'gemini-2.5-flash', 'gemini-2.0-flash'];
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

async function callAgent(perspective: typeof AGENT_PERSPECTIVES[0], question: string): Promise<{ id: string; name: string; response: string } | null> {
  const prompt = `${perspective.prompt}\n\nQuestion: ${question}\n\nGive a focused analysis in 2-4 paragraphs. Be specific, not generic. No preamble — go straight into your analysis.`;

  const hasAzure = !!(process.env.AZURE_OPENAI_ENDPOINT && process.env.AZURE_OPENAI_API_KEY);

  let response: string | null = null;

  if (hasAzure) {
    response = await callAzureModel(prompt, 1500, 0.3);
  }

  if (!response) {
    response = await callClaude(prompt, 1500, 0.2);
  }

  if (!response) {
    response = await callGemini(prompt, 1500, 0.3);
  }

  if (!response) return null;

  return { id: perspective.id, name: perspective.name, response };
}

export async function runMultiAgentResearch(question: string, languageInstruction: string = '', behaviorInstruction: string = ''): Promise<string> {
  console.log(`[Multi-Agent] Starting 10-agent analysis...`);
  const startTime = Date.now();

  const agentPromises = AGENT_PERSPECTIVES.map(p => callAgent(p, question));
  const results = await Promise.allSettled(agentPromises);

  const agentResponses = results
    .map((r, i) => r.status === 'fulfilled' && r.value ? r.value : null)
    .filter(Boolean) as { id: string; name: string; response: string }[];

  console.log(`[Multi-Agent] ${agentResponses.length}/10 agents responded in ${Date.now() - startTime}ms`);

  if (agentResponses.length === 0) {
    throw new Error('No agents were able to respond. Please try again.');
  }

  const synthesisInput = agentResponses.map(a =>
    `### ${a.name}\n${a.response}`
  ).join('\n\n');

  const synthesisPrompt = `You are the Lead Synthesizer for TurboAnswer Research. You have received analysis from ${agentResponses.length} expert agents, each examining the same question from a different perspective.

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

  const hasAzure = !!(process.env.AZURE_OPENAI_ENDPOINT && process.env.AZURE_OPENAI_API_KEY);

  let synthesis: string | null = null;

  if (hasAzure) {
    synthesis = await callAzureModel(synthesisPrompt, 4096, 0.2);
  }

  if (!synthesis) {
    synthesis = await callClaude(synthesisPrompt, 4096, 0.15);
  }

  if (!synthesis) {
    synthesis = await callGemini(synthesisPrompt, 4096, 0.2);
  }

  if (!synthesis) {
    synthesis = agentResponses.map(a => `## ${a.name}\n\n${a.response}`).join('\n\n---\n\n');
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[Multi-Agent] Synthesis complete in ${totalTime}s (${agentResponses.length} agents)`);

  return `${synthesis}\n\n---\n*Powered by TurboAnswer Multi-Agent Research — ${agentResponses.length} expert perspectives analyzed in ${totalTime}s*`;
}
