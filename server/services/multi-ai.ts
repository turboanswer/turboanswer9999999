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

export const AI_MODELS: Record<string, Record<string, any>> = {
  pro: {
    "gemini-pro": {
      name: "Gemini Pro",
      provider: "google",
      description: "Premium model for deep analysis and complex tasks",
      maxTokens: 8000,
      temperature: 0.3,
    },
  },
  research: {
    "claude-research": {
      name: "Claude Research",
      provider: "anthropic",
      description: "Claude AI for deep research and comprehensive analysis",
      maxTokens: 16000,
      temperature: 0.1,
    },
  },
  free: {
    "gemini-flash": {
      name: "Gemini 2.5 Flash",
      provider: "google",
      description: "Fast free model for everyday questions",
      maxTokens: 4000,
      temperature: 0.4,
    },
  },
};

export async function generateAIResponse(
  userMessage: string,
  conversationHistory: Array<{role: string, content: string}> = [],
  subscriptionTier: string = "free",
  selectedModel?: string,
  userId?: string,
  userLanguage: string = "en"
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

    const isSimple = userMessage.length < 50 || /\b(hi|hello|hey|thanks|ok|yes|no|turbo)\b/i.test(userMessage);
    const languageInstruction = userLanguage !== "en" ? 
      `CRITICAL: Respond in ${userLanguage} language. ALL responses must be in ${userLanguage}.` : "";

    let systemPrompt: string;
    let geminiModel: string;
    let maxTokens: number;
    let temperature: number;

    if (selectedModel === 'claude-research') {
      geminiModel = 'gemini-2.5-pro';
      maxTokens = 16000;
      temperature = 0.1;
      systemPrompt = `You are Turbo Answer, a premium AI research assistant. Provide thorough, well-structured, in-depth analysis. Use clear headings, evidence-based reasoning, and comprehensive coverage. Go deeper than a standard response - cite reasoning, explore multiple angles, and give expert-level detail.
${languageInstruction}
${additionalContext}`;
    } else if (selectedModel === 'gemini-pro') {
      geminiModel = 'gemini-2.5-pro';
      maxTokens = 8000;
      temperature = 0.3;
      systemPrompt = `You are Turbo Answer, a premium AI assistant. Provide clear, detailed, high-quality responses. For simple questions, be concise. For complex topics, provide thorough explanations.
${languageInstruction}
${additionalContext}`;
    } else {
      geminiModel = 'gemini-2.5-flash';
      maxTokens = isSimple ? 1000 : 4000;
      temperature = 0.4;
      systemPrompt = isSimple
        ? `You are Turbo, a fast AI assistant. Give direct, simple answers. Keep responses under 2 sentences for simple questions. Be conversational.
${languageInstruction}`
        : `You are Turbo Answer, a helpful AI assistant. Provide clear, helpful responses. For simple questions, keep answers brief. For complex questions, provide detailed explanations.
${languageInstruction}
${additionalContext}`;
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return "Gemini API key is not configured. Please add GEMINI_API_KEY to get started.";
    }

    console.log(`[AI] Model: ${geminiModel}, Tokens: ${maxTokens}`);

    const contextMessages = conversationHistory.slice(-4).map(m => `${m.role}: ${m.content}`).join('\n');
    const fullPrompt = `${systemPrompt}\n\n${contextMessages ? `Recent conversation:\n${contextMessages}\n\n` : ''}User: ${enhancedMessage}`;

    return await callGemini(fullPrompt, geminiModel, maxTokens, temperature, geminiApiKey);

  } catch (error: any) {
    console.error('[AI] Error:', error.message);
    if (error.message?.includes('rate limit') || error.message?.includes('quota') || error.message?.includes('Rate') || error.message?.includes('429')) {
      return "I'm a bit busy right now - too many requests at once. Please wait a few seconds and try again!";
    }
    return "Something went wrong. Please try again in a moment.";
  }
}

async function callGemini(prompt: string, preferredModel: string, maxTokens: number, temperature: number, apiKey: string): Promise<string> {
  const models = preferredModel === 'gemini-2.5-pro'
    ? ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash']
    : ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-lite-001'];

  const requestBody = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature, maxOutputTokens: maxTokens, topP: 0.8, topK: 40 }
  });

  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        console.log(`[Gemini] Trying ${model} (attempt ${attempt + 1})`);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000);
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: requestBody, signal: controller.signal }
        );
        clearTimeout(timeout);

        if (response.status === 429) {
          const retryAfter = response.headers.get('retry-after');
          const body = await response.json().catch(() => ({}));
          const retryMatch = body.error?.message?.match(/retry in ([\d.]+)s/i);
          let waitMs = retryAfter ? parseInt(retryAfter) * 1000
            : retryMatch ? Math.ceil(parseFloat(retryMatch[1]) * 1000)
            : 5000;
          waitMs += Math.random() * 1000;

          if (attempt === 0) {
            console.log(`[Gemini] Rate limited on ${model}, waiting ${Math.round(waitMs)}ms...`);
            await new Promise(resolve => setTimeout(resolve, waitMs));
            continue;
          }
          console.log(`[Gemini] ${model} still limited, trying next model...`);
          break;
        }

        const data = await response.json();

        if (data.error) {
          console.error(`[Gemini] ${model} error:`, data.error.message);
          if (data.error.code === 429) break;
          throw new Error(data.error.message);
        }

        const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!content) {
          throw new Error('No content received from Gemini');
        }

        return content;

      } catch (error: any) {
        if (error.name === 'AbortError') {
          console.log(`[Gemini] ${model} timed out after 30s, trying next...`);
          break;
        }
        if (error.message?.includes('quota') || error.message?.includes('429') || error.message?.includes('Rate')) {
          if (attempt === 0) {
            await new Promise(resolve => setTimeout(resolve, 5000 + Math.random() * 2000));
            continue;
          }
          break;
        }
        throw error;
      }
    }
  }

  throw new Error('All Gemini models are currently rate limited. Please wait a moment and try again.');
}

async function callClaude(userMessage: string, systemPrompt: string, contextMessages: string, maxTokens: number, temperature: number, apiKey: string, baseUrl?: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);

  try {
    const messages: Array<{role: string, content: string}> = [];
    if (contextMessages) {
      messages.push({ role: "user", content: `Previous conversation context:\n${contextMessages}` });
      messages.push({ role: "assistant", content: "I understand the context. How can I help?" });
    }
    messages.push({ role: "user", content: userMessage });

    const apiUrl = baseUrl ? `${baseUrl}/v1/messages` : 'https://api.anthropic.com/v1/messages';
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: maxTokens,
        temperature,
        system: systemPrompt,
        messages,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[Claude] API error:', response.status, errorData);
      if (response.status === 429) {
        return "Claude is a bit busy right now. Please wait a few seconds and try again!";
      }
      throw new Error(errorData.error?.message || `Claude API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.content?.[0]?.text;
    if (!content) {
      throw new Error('No content received from Claude');
    }
    return content;
  } catch (error: any) {
    clearTimeout(timeout);
    if (error.name === 'AbortError') {
      return "The research query took too long. Please try a simpler question or try again.";
    }
    throw error;
  }
}

export function getAvailableModels(subscriptionTier: string): Record<string, any> {
  const hasGemini = !!process.env.GEMINI_API_KEY;
  const hasClaude = !!(process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY);

  const models: Record<string, any> = {};

  if (hasGemini) {
    Object.assign(models, AI_MODELS.free);
  }

  if (subscriptionTier === 'pro' || subscriptionTier === 'research') {
    if (hasGemini) Object.assign(models, AI_MODELS.pro);
  }

  if (subscriptionTier === 'research') {
    if (hasGemini) Object.assign(models, AI_MODELS.research);
  }

  return models;
}
