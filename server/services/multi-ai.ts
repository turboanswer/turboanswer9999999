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
  premium: {
    "gemini-pro": {
      name: "Gemini Pro",
      provider: "google",
      description: "Premium model for deep analysis and complex tasks",
      maxTokens: 8000,
      temperature: 0.3,
    },
    "gemini-pro-research": {
      name: "Gemini Pro Research",
      provider: "google",
      description: "Premium model optimized for in-depth research",
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
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return "Gemini API key is not configured. Please add GEMINI_API_KEY to get started.";
    }

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

    if (selectedModel === 'gemini-pro' || selectedModel === 'gemini-pro-research') {
      geminiModel = 'gemini-2.5-pro';
      if (selectedModel === 'gemini-pro-research') {
        maxTokens = 16000;
        temperature = 0.1;
        systemPrompt = `You are Turbo Answer, a premium AI research assistant. Provide thorough, well-structured, in-depth analysis. Use clear headings, evidence-based reasoning, and comprehensive coverage.
${languageInstruction}
${additionalContext}`;
      } else {
        maxTokens = 8000;
        temperature = 0.3;
        systemPrompt = `You are Turbo Answer, a premium AI assistant. Provide clear, detailed, high-quality responses. For simple questions, be concise. For complex topics, provide thorough explanations.
${languageInstruction}
${additionalContext}`;
      }
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

    console.log(`[AI] Model: ${geminiModel}, Tokens: ${maxTokens}`);

    const contextMessages = conversationHistory.slice(-4).map(m => `${m.role}: ${m.content}`).join('\n');
    const fullPrompt = `${systemPrompt}\n\n${contextMessages ? `Recent conversation:\n${contextMessages}\n\n` : ''}User: ${enhancedMessage}`;

    return await callGemini(fullPrompt, geminiModel, maxTokens, temperature, apiKey);

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
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: requestBody }
        );

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

export function getAvailableModels(subscriptionTier: string): Record<string, any> {
  if (!process.env.GEMINI_API_KEY) return {};

  if (subscriptionTier === 'premium' || subscriptionTier === 'pro') {
    return { ...AI_MODELS.premium, ...AI_MODELS.free };
  }
  return { ...AI_MODELS.free };
}
