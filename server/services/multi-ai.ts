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
      description: "Premium model for detailed responses and complex tasks",
      maxTokens: 8000,
      temperature: 0.3,
    },
  },
  research: {
    "claude-research": {
      name: "Gemini 2.5 Pro",
      provider: "google",
      description: "Most powerful model for deep research and comprehensive analysis",
      maxTokens: 16000,
      temperature: 0.1,
    },
  },
  ultimate: {
    "gpt-4o": {
      name: "GPT-4o",
      provider: "openai",
      description: "OpenAI's most powerful model for superior coding, reasoning, and analysis",
      maxTokens: 16000,
      temperature: 0.2,
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

    if (selectedModel === 'gpt-4o') {
      const openaiApiKey = process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
      if (!openaiApiKey) {
        return "OpenAI API key is not configured. Please add OPENAI_API_KEY to use GPT-4o.";
      }
      const gptSystemPrompt = `You are Turbo Answer, the most powerful AI assistant. Only if someone specifically asks who made, created, or developed TurboAnswer, say it was developed by Tiago Tschantret — otherwise never mention it. Give expert-level, comprehensive responses with excellent code, analysis, and reasoning.${languageInstruction ? ' ' + languageInstruction : ''}${additionalContext}`;
      const recentHistory = conversationHistory.slice(-4).map(m => ({
        role: m.role === 'assistant' ? 'assistant' as const : 'user' as const,
        content: m.content.slice(0, 1000),
      }));
      const messages = [
        { role: 'system' as const, content: gptSystemPrompt },
        ...recentHistory,
        { role: 'user' as const, content: enhancedMessage },
      ];
      console.log(`[AI] Model: gpt-4o, Tokens: 16000`);
      return await callOpenAI(messages, openaiApiKey);
    } else if (selectedModel === 'claude-research') {
      geminiModel = 'gemini-2.5-pro';
      maxTokens = 8000;
      temperature = 0.1;
      systemPrompt = `You are Turbo Answer, a research assistant. Only if someone specifically asks who made, created, or developed TurboAnswer, say it was developed by Tiago Tschantret — otherwise never mention it. Give thorough, well-structured analysis with clear headings and evidence-based reasoning.${languageInstruction ? ' ' + languageInstruction : ''}${additionalContext}`;
    } else if (selectedModel === 'gemini-pro') {
      geminiModel = 'gemini-2.5-flash';
      maxTokens = isSimple ? 500 : 4000;
      temperature = 0.3;
      systemPrompt = isSimple
        ? `You are Turbo. Only if someone specifically asks who made, created, or developed TurboAnswer, say it was developed by Tiago Tschantret — otherwise never mention it. Be concise and direct.${languageInstruction ? ' ' + languageInstruction : ''}`
        : `You are Turbo Answer, a premium assistant. Only if someone specifically asks who made, created, or developed TurboAnswer, say it was developed by Tiago Tschantret — otherwise never mention it. Give clear, detailed responses.${languageInstruction ? ' ' + languageInstruction : ''}${additionalContext}`;
    } else {
      geminiModel = 'gemini-2.5-flash';
      maxTokens = isSimple ? 300 : 2000;
      temperature = 0.4;
      systemPrompt = isSimple
        ? `You are Turbo. Only if someone specifically asks who made, created, or developed TurboAnswer, say it was developed by Tiago Tschantret — otherwise never mention it. Answer in 1-2 sentences max.${languageInstruction ? ' ' + languageInstruction : ''}`
        : `You are Turbo Answer. Only if someone specifically asks who made, created, or developed TurboAnswer, say it was developed by Tiago Tschantret — otherwise never mention it. Give clear, helpful responses.${languageInstruction ? ' ' + languageInstruction : ''}${additionalContext}`;
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return "Gemini API key is not configured. Please add GEMINI_API_KEY to get started.";
    }

    console.log(`[AI] Model: ${geminiModel}, Tokens: ${maxTokens}`);

    const recentHistory = conversationHistory.slice(-2).map(m => `${m.role}: ${m.content.slice(0, 500)}`).join('\n');
    const fullPrompt = recentHistory
      ? `${systemPrompt}\n\nContext:\n${recentHistory}\n\nUser: ${enhancedMessage}`
      : `${systemPrompt}\n\nUser: ${enhancedMessage}`;

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
  const allModels = preferredModel === 'gemini-2.5-pro' 
    ? ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash']
    : preferredModel === 'gemini-2.0-flash'
    ? ['gemini-2.0-flash', 'gemini-2.5-flash']
    : ['gemini-2.5-flash', 'gemini-2.0-flash'];

  const requestBody = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature, maxOutputTokens: maxTokens }
  });

  for (let attempt = 0; attempt < 2; attempt++) {
    for (const model of allModels) {
      try {
        const start = Date.now();
        const controller = new AbortController();
        const timeoutMs = model.includes('2.0-flash') ? 10000 : 25000;
        const timeout = setTimeout(() => controller.abort(), timeoutMs);
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: requestBody, signal: controller.signal }
        );
        clearTimeout(timeout);

        if (response.status === 429) {
          console.log(`[Gemini] ${model} rate limited (attempt ${attempt + 1}), trying next...`);
          if (attempt === 0) await new Promise(r => setTimeout(r, 2000));
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
            await new Promise(r => setTimeout(r, 3000));
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
      await new Promise(r => setTimeout(r, 3000));
    }
  }

  throw new Error('AI is temporarily busy due to high demand. Please wait a moment and try again.');
}

async function callOpenAI(messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>, apiKey: string): Promise<string> {
  const start = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages,
        max_tokens: 16000,
        temperature: 0.2,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[OpenAI] Error ${response.status}:`, errorText.substring(0, 500));
      if (response.status === 429) {
        if (errorText.includes('insufficient_quota')) {
          return "Your OpenAI API key has run out of credits. Please add credits to your OpenAI account at platform.openai.com to use GPT-4o.";
        }
        return "GPT-4o is busy right now. Please wait a few seconds and try again.";
      }
      if (response.status === 401) {
        return "GPT-4o authentication error. The API key may be invalid. Please update your OpenAI API key.";
      }
      if (response.status === 404) {
        return "GPT-4o model not available with current API key. Please verify your OpenAI account has access to GPT-4o.";
      }
      if (response.status === 403 || errorText.includes('insufficient_quota')) {
        return "Your OpenAI API key has run out of credits. Please add credits to your OpenAI account at platform.openai.com to use GPT-4o.";
      }
      throw new Error(`OpenAI API error: ${response.status} - ${errorText.substring(0, 200)}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('No content in OpenAI response');

    console.log(`[OpenAI] gpt-4o responded in ${Date.now() - start}ms`);
    return content;
  } catch (error: any) {
    clearTimeout(timeout);
    if (error.name === 'AbortError') {
      return "GPT-4o took too long to respond. Please try again.";
    }
    throw error;
  }
}

export function getAvailableModels(subscriptionTier: string): Record<string, any> {
  const hasGemini = !!process.env.GEMINI_API_KEY;
  const hasOpenAI = !!(process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY);

  const models: Record<string, any> = {};

  if (hasGemini) {
    Object.assign(models, AI_MODELS.free);
  }

  if (subscriptionTier === 'pro' || subscriptionTier === 'research' || subscriptionTier === 'enterprise' || subscriptionTier === 'ultimate') {
    if (hasGemini) Object.assign(models, AI_MODELS.pro);
  }

  if (subscriptionTier === 'research' || subscriptionTier === 'enterprise' || subscriptionTier === 'ultimate') {
    if (hasGemini) Object.assign(models, AI_MODELS.research);
  }

  if (subscriptionTier === 'ultimate') {
    if (hasOpenAI) Object.assign(models, AI_MODELS.ultimate);
  }

  return models;
}
