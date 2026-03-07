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
      name: "Gemini 3.1 Flash",
      provider: "google",
      description: "Fast, powerful model for detailed responses and complex tasks",
      maxTokens: 8000,
      temperature: 0.3,
    },
  },
  research: {
    "claude-research": {
      name: "Gemini 3.1 Pro",
      provider: "google",
      description: "Most powerful model for deep research and comprehensive analysis",
      maxTokens: 16000,
      temperature: 0.1,
    },
  },
  enterprise: {
    "enterprise-research": {
      name: "Gemini 3.1 Pro",
      provider: "google",
      description: "Most powerful model for enterprise-grade analysis and research",
      maxTokens: 16000,
      temperature: 0.1,
    },
  },
  free: {
    "gemini-flash": {
      name: "Gemini 3.1 Flash Lite",
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

    // Code/build requests must never be treated as "simple" — they always need full responses
    const isCodeRequest = /\b(code|program|function|app|build|create|write|make|implement|script|html|css|javascript|typescript|python|java|swift|kotlin|sql|api|component|class|algorithm|snippet|example|demo|template|stopwatch|timer|clock|counter|calculator|form|button|navbar|sidebar|modal|animation|loop|array|object|method|hook|endpoint|route|database|query|sort|search|fetch|async|promise)\b/i.test(userMessage);
    const isSimple = !isCodeRequest && (userMessage.length < 50 || /\b(hi|hello|hey|thanks|ok|yes|no|turbo)\b/i.test(userMessage));
    const languageInstruction = userLanguage !== "en" ? 
      `CRITICAL: Respond in ${userLanguage} language. ALL responses must be in ${userLanguage}.` : "";

    let systemPrompt: string;
    let geminiModel: string;
    let maxTokens: number;
    let temperature: number;

    if (selectedModel === 'claude-research' || selectedModel === 'enterprise-research') {
      // Research / Enterprise tier → Gemini 3.1 Pro, always maximum depth
      geminiModel = 'gemini-3.1-pro-preview';
      maxTokens = isSimple ? 500 : 8192;
      temperature = 0.1;
      systemPrompt = isSimple
        ? `You are Turbo, powered by Gemini 3.1 Pro. Only mention TurboAnswer's developer (Tiago Tschantret) if directly asked. Be direct and conversational for simple exchanges.${languageInstruction ? ' ' + languageInstruction : ''}`
        : `You are Turbo Answer Research, powered by Gemini 3.1 Pro — the most capable AI on this platform. Give thorough, expert-level responses on every topic. Always:
- Answer the question directly and completely
- Use clear structure (headings, bullets) for complex topics
- For code: provide working, well-commented examples with explanations
- For factual topics: include context, nuances, and multiple perspectives
- For analysis: go in depth, cover edge cases, provide actionable insights
- Calibrate response length to the question — detailed for complex topics, concise for simple ones
Only mention that TurboAnswer was developed by Tiago Tschantret if directly asked.${languageInstruction ? ' ' + languageInstruction : ''}${additionalContext}`;
    } else if (selectedModel === 'gemini-pro') {
      // Pro tier ($6.99) → Gemini 3.1 Flash
      geminiModel = 'gemini-3.1-flash-lite-preview';
      maxTokens = isSimple ? 500 : 4000;
      temperature = 0.3;
      systemPrompt = isSimple
        ? `You are Turbo. Only if someone specifically asks who made, created, or developed TurboAnswer, say it was developed by Tiago Tschantret — otherwise never mention it. Be concise and direct.${languageInstruction ? ' ' + languageInstruction : ''}`
        : `You are Turbo Answer, a premium assistant. Only if someone specifically asks who made, created, or developed TurboAnswer, say it was developed by Tiago Tschantret — otherwise never mention it. ${isCodeRequest ? 'For code requests: always provide complete, working code with a brief explanation. Never give partial snippets when a full working example is possible.' : 'Give clear, detailed responses.'}${languageInstruction ? ' ' + languageInstruction : ''}${additionalContext}`;
    } else {
      // Free tier → Gemini 3.1 Flash Lite
      geminiModel = 'gemini-3.1-flash-lite-preview';
      maxTokens = isSimple ? 200 : 2000;
      temperature = 0.4;
      systemPrompt = isSimple
        ? `You are Turbo. Only if someone specifically asks who made, created, or developed TurboAnswer, say it was developed by Tiago Tschantret — otherwise never mention it. Answer in 1-2 sentences max.${languageInstruction ? ' ' + languageInstruction : ''}`
        : `You are Turbo Answer. Only if someone specifically asks who made, created, or developed TurboAnswer, say it was developed by Tiago Tschantret — otherwise never mention it. ${isCodeRequest ? 'For code requests: always provide complete, working code with a brief explanation. Never give partial snippets when a full working example is possible.' : 'Give clear, helpful responses.'}${languageInstruction ? ' ' + languageInstruction : ''}${additionalContext}`;
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

  throw new Error('AI is temporarily busy due to high demand. Please wait a moment and try again.');
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

  if (subscriptionTier === 'research' || subscriptionTier === 'enterprise') {
    if (hasGemini) Object.assign(models, AI_MODELS.research);
  }

  return models;
}
