import { 
  getWeatherData, 
  getLocationInfo, 
  getWorldTimeInfo, 
  formatWeatherReport, 
  formatLocationReport,
  isWeatherQuery,
  isLocationQuery,
  isTimeZoneQuery,
  extractLocation,
  getTimeZoneInfo
} from "./weather-location";
import { runMultiAgentResearch } from "./multi-agent";

export const AI_MODELS: Record<string, Record<string, any>> = {
  pro: {
    "gemini-pro": {
      name: "Gemini Flash",
      provider: "google",
      description: "Fast, powerful model for detailed responses and complex tasks",
      maxTokens: 8000,
      temperature: 0.3,
    },
  },
  research: {
    "claude-research": {
      name: "10-Agent Research",
      provider: "multi-agent",
      description: "10 AI experts analyze your question from different angles — technical, business, security, UX, data, innovation, risk, implementation, academic, and contrarian perspectives — then synthesize into one comprehensive answer",
      maxTokens: 16000,
      temperature: 0.1,
    },
  },
  enterprise: {
    "enterprise-research": {
      name: "10-Agent Research",
      provider: "multi-agent",
      description: "10 AI experts analyze your question from every angle — enterprise-grade multi-perspective intelligence",
      maxTokens: 16000,
      temperature: 0.1,
    },
  },
  free: {
    "gemini-flash": {
      name: "Gemini Flash Lite",
      provider: "google",
      description: "Fast free model for everyday questions",
      maxTokens: 4000,
      temperature: 0.4,
    },
  },
};

function classifyQueryComplexity(message: string): 'simple' | 'complex' {
  const msg = message.trim();
  const msgLower = msg.toLowerCase();
  const len = msg.length;

  if (len < 25) return 'simple';

  if (/```|`[^`]{10,}`|\bfunction\s*[\w(]|\bconst\s+\w+\s*=\s*(async\s*)?\(|\bdef\s+\w|\bclass\s+\w|\b#include|\bfor\s*\(|\bwhile\s*\(/.test(msg)) return 'complex';

  if (/\b(?:1\.|2\.|3\.|first[,\s]|second[,\s]|step\s+1\b|and\s+also\b|furthermore\b|additionally\b|moreover\b)/.test(msgLower)) return 'complex';

  if (/\b(?:implement|algorithm|architecture|optimize|refactor|debug\s+(?:this|my)|analyze|analyse|compare\s+and|explain\s+(?:in\s+detail|how|why|the\s+difference)|write\s+a\s+(?:function|class|program|script|app|test)|design\s+(?:a|the|an))\b/.test(msgLower)) return 'complex';

  if (len > 220) return 'complex';

  if (/^(?:what\s+is\b|what'?s\b|who\s+(?:is|was)\b|where\s+is\b|when\s+(?:is|did|was)\b|how\s+(?:much|many|old)\b|define\b|capital\s+of\b|meaning\s+of\b|translate\b)/.test(msgLower)) return 'simple';

  if (/^(?:hi\b|hello\b|hey\b|thanks\b|thank\s+you\b|ok\b|okay\b|sure\b|yes\b|no\b|bye\b|good\s+(?:morning|afternoon|evening)\b|how\s+are\s+you\b|can\s+you\s+help\b)/.test(msgLower)) return 'simple';

  return 'simple';
}

async function callClaude(prompt: string, maxTokens: number, temperature: number): Promise<string | null> {
  const anthropicKey = process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;
  const anthropicBase = process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL || 'https://api.anthropic.com';
  if (!anthropicKey) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);
    const response = await fetch(`${anthropicBase}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
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
      console.log(`[Claude] HTTP ${response.status}`);
      return null;
    }

    const data: any = await response.json();
    const text = data.content?.[0]?.text;
    if (text) {
      console.log(`[Claude] claude-sonnet-4 responded`);
      return text;
    }
    return null;
  } catch (err: any) {
    console.log(`[Claude] Failed: ${err.message}`);
    return null;
  }
}

export async function generateAIResponse(
  userMessage: string,
  conversationHistory: Array<{role: string, content: string}> = [],
  subscriptionTier: string = "free",
  selectedModel?: string,
  userId?: string,
  userLanguage: string = "en",
  responseStyle: string = "balanced",
  responseTone: string = "casual"
): Promise<string> {
  try {
    let additionalContext = "";
    let enhancedMessage = userMessage;

    if (isWeatherQuery(userMessage)) {
      const location = extractLocation(userMessage);
      if (location) {
        try {
          const weatherData = await getWeatherData(location);
          const weatherReport = formatWeatherReport(weatherData);
          additionalContext = `\n\nREAL-TIME WEATHER DATA:\n${weatherReport}`;
          enhancedMessage = `${userMessage}\n\n[Live weather data provided - use this current information in your response]`;
        } catch (error: any) {
          additionalContext = `\n\nWeather data unavailable: ${error.message}`;
        }
      }
    } else if (isLocationQuery(userMessage)) {
      const location = extractLocation(userMessage);
      if (location) {
        try {
          const [locationInfo, timeInfo] = await Promise.allSettled([
            getLocationInfo(location),
            getWorldTimeInfo(location)
          ]);
          if (locationInfo.status === 'fulfilled') {
            const timeData = timeInfo.status === 'fulfilled' ? timeInfo.value : null;
            const locationReport = formatLocationReport(locationInfo.value, timeData);
            additionalContext = `\n\nREAL-TIME LOCATION DATA:\n${locationReport}`;
            enhancedMessage = `${userMessage}\n\n[Live location and time data provided]`;
          }
        } catch (error: any) {
          additionalContext = `\n\nLocation data unavailable: ${error.message}`;
        }
      }
    } else if (isTimeZoneQuery(userMessage)) {
      additionalContext = `\n\nTIME ZONE DATA:\n${getTimeZoneInfo()}`;
      enhancedMessage = `${userMessage}\n\n[Time zone reference provided]`;
    }

    const languageInstruction = userLanguage !== "en" ? 
      `CRITICAL: Respond in ${userLanguage} language. ALL responses must be in ${userLanguage}.` : "";

    const styleMap: Record<string, string> = {
      concise: "Keep responses brief and to the point. Use short sentences.",
      balanced: "",
      detailed: "Give thorough, comprehensive answers with full explanations, examples, and context.",
    };
    const toneMap: Record<string, string> = {
      casual: "Use a friendly, conversational tone.",
      professional: "Use a formal, professional tone.",
      creative: "Be creative and expressive in your responses.",
      academic: "Use an academic, scholarly tone with precise language.",
    };
    const styleInstruction = styleMap[responseStyle] || "";
    const toneInstruction = toneMap[responseTone] || "";
    const behaviorInstruction = [styleInstruction, toneInstruction].filter(Boolean).join(" ");

    const recentHistory = conversationHistory.slice(-2).map(m => `${m.role}: ${m.content.slice(0, 500)}`).join('\n');

    const geminiApiKey = process.env.GEMINI_API_KEY;

    if (selectedModel === 'claude-research' || selectedModel === 'enterprise-research') {
      const complexity = classifyQueryComplexity(userMessage);

      if (complexity === 'simple') {
        if (!geminiApiKey) return "API key not configured.";
        const systemPrompt = `You are Turbo Answer Research. Answer questions directly and concisely. Never discuss your own state, feelings, or load. Only mention TurboAnswer was developed by Tiago Tschantret if directly asked.${behaviorInstruction ? ' ' + behaviorInstruction : ''}${languageInstruction ? ' ' + languageInstruction : ''}${additionalContext}`;
        const fullPrompt = recentHistory ? `${systemPrompt}\n\nContext:\n${recentHistory}\n\nUser: ${enhancedMessage}` : `${systemPrompt}\n\nUser: ${enhancedMessage}`;
        console.log(`[AI] Research/simple → Gemini Flash Lite`);
        return await callGemini(fullPrompt, 'gemini-3.1-flash-lite-preview', 2000, 0.4, geminiApiKey);
      } else {
        console.log(`[AI] Research/complex → 10-Agent Multi-Agent System`);
        const fullQuestion = additionalContext ? `${enhancedMessage}\n\n${additionalContext}` : enhancedMessage;
        return await runMultiAgentResearch(fullQuestion, languageInstruction, behaviorInstruction);
      }
    } else if (selectedModel === 'gemini-pro') {
      // Pro tier ($6.99) → Gemini Flash
      if (!geminiApiKey) return "API key not configured.";
      const systemPrompt = `You are Turbo Answer. Answer questions directly and helpfully. Never discuss your own state, feelings, or system load. Only mention TurboAnswer was developed by Tiago Tschantret if directly asked.${behaviorInstruction ? ' ' + behaviorInstruction : ''}${languageInstruction ? ' ' + languageInstruction : ''}${additionalContext}`;
      const fullPrompt = recentHistory ? `${systemPrompt}\n\nContext:\n${recentHistory}\n\nUser: ${enhancedMessage}` : `${systemPrompt}\n\nUser: ${enhancedMessage}`;
      console.log(`[AI] Pro → Gemini Flash Lite`);
      return await callGemini(fullPrompt, 'gemini-3.1-flash-lite-preview', 4000, 0.3, geminiApiKey);
    } else {
      // Free tier → Gemini Flash Lite
      if (!geminiApiKey) return "API key not configured.";
      const systemPrompt = `You are Turbo Answer. Answer questions directly and helpfully. Keep responses concise unless detail is needed. Never discuss your own state, feelings, or system load. Only mention TurboAnswer was developed by Tiago Tschantret if directly asked.${behaviorInstruction ? ' ' + behaviorInstruction : ''}${languageInstruction ? ' ' + languageInstruction : ''}${additionalContext}`;
      const fullPrompt = recentHistory ? `${systemPrompt}\n\nContext:\n${recentHistory}\n\nUser: ${enhancedMessage}` : `${systemPrompt}\n\nUser: ${enhancedMessage}`;
      console.log(`[AI] Free → Gemini Flash Lite`);
      return await callGemini(fullPrompt, 'gemini-3.1-flash-lite-preview', 2000, 0.4, geminiApiKey);
    }

  } catch (error: any) {
    console.error('[AI] Error:', error.message);
    if (error.message?.includes('rate limit') || error.message?.includes('quota') || error.message?.includes('Rate') || error.message?.includes('429')) {
      return "Please wait a moment and try again.";
    }
    return "Please try again.";
  }
}

async function callGemini(prompt: string, preferredModel: string, maxTokens: number, temperature: number, apiKey: string): Promise<string> {
  const allModels =
    preferredModel === 'gemini-3.1-pro-preview'
      ? ['gemini-3.1-pro-preview', 'gemini-2.5-pro', 'gemini-2.0-flash']
      : preferredModel === 'gemini-3.1-flash-lite-preview'
        ? ['gemini-3.1-flash-lite-preview', 'gemini-2.5-flash', 'gemini-2.0-flash']
        : ['gemini-3.1-flash-lite-preview', 'gemini-2.5-flash', 'gemini-2.0-flash'];

  const requestBody = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature, maxOutputTokens: maxTokens }
  });

  for (let attempt = 0; attempt < 2; attempt++) {
    for (const model of allModels) {
      try {
        const start = Date.now();
        const controller = new AbortController();
        const timeoutMs = model === 'gemini-3.1-pro-preview' ? 60000
          : model === 'gemini-2.5-pro' ? 20000
          : model === 'gemini-3.1-flash-lite-preview' ? 12000
          : 8000;
        const timeout = setTimeout(() => controller.abort(), timeoutMs);
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: requestBody, signal: controller.signal }
        );
        clearTimeout(timeout);

        if (response.status === 429) {
          console.log(`[Gemini] ${model} rate limited (attempt ${attempt + 1}), trying next...`);
          if (attempt === 0) await new Promise(r => setTimeout(r, 1000));
          continue;
        }

        if (response.status === 503 || response.status === 500) {
          console.log(`[Gemini] ${model} server error ${response.status}, trying next...`);
          continue;
        }

        const data = await response.json();
        if (data.error) {
          console.error(`[Gemini] ${model} error:`, data.error.message);
          if (data.error.code === 429 && attempt === 0) {
            await new Promise(r => setTimeout(r, 1500));
          }
          continue;
        }

        const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!content) continue;

        console.log(`[Gemini] ${model} responded in ${Date.now() - start}ms`);
        return content;

      } catch (error: any) {
        console.log(`[Gemini] ${model} failed: ${error.message}, trying next...`);
        continue;
      }
    }

    if (attempt === 0) {
      console.log('[Gemini] All models failed on first attempt, retrying after delay...');
      await new Promise(r => setTimeout(r, 1500));
    }
  }

  throw new Error('Please try again in a moment.');
}

export function getAvailableModels(subscriptionTier: string): Record<string, any> {
  const hasGemini = !!process.env.GEMINI_API_KEY;

  const models: Record<string, any> = {};

  if (hasGemini) {
    Object.assign(models, AI_MODELS.free);
  }

  if (subscriptionTier === 'pro' || subscriptionTier === 'research' || subscriptionTier === 'enterprise') {
    if (hasGemini) Object.assign(models, AI_MODELS.pro);
  }

  if (subscriptionTier === 'research') {
    Object.assign(models, AI_MODELS.research);
  }

  if (subscriptionTier === 'enterprise') {
    Object.assign(models, AI_MODELS.research);
    Object.assign(models, AI_MODELS.enterprise);
  }

  return models;
}
