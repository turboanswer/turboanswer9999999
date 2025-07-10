// Multi-AI System: The Most Powerful AI Assistant
// Combines multiple AI models for maximum intelligence and capability

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
import { emotionalAI } from './emotional-ai';
import { conversationalAI } from './conversational-ai';
import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

export const AI_MODELS = {
  // Tier 1: MAXIMUM POWER Models (Ultimate Performance)
  maximum: {
    "research-pro": {
      name: "Research Pro Ultra",
      provider: "anthropic",
      strengths: ["Deep research analysis", "Academic citations", "Multi-source verification", "Comprehensive investigations"],
      maxTokens: 12000,
      temperature: 0.1,
      priority: 1,
      isPaid: true,
      description: "Performs extremely in-depth research with multiple data sources, academic citations, and comprehensive analysis"
    },
    "gemini-2.0-flash-exp": {
      name: "Gemini 2.0 Flash Experimental",
      provider: "google",
      strengths: ["Breakthrough intelligence", "Ultra-fast responses", "Advanced reasoning", "Maximum performance"],
      maxTokens: 8000,
      temperature: 0.2,
      priority: 2
    },
    "claude-sonnet-4": {
      name: "Claude 4.0 Sonnet",
      provider: "anthropic",
      strengths: ["Ultimate reasoning", "Expert-level analysis", "Advanced mathematics", "Complex problem solving"],
      maxTokens: 8000,
      temperature: 0.8,
      priority: 3
    },
    "gpt-4o": {
      name: "GPT-4o",
      provider: "openai",
      strengths: ["Multimodal intelligence", "Advanced coding", "Scientific analysis", "Creative reasoning"],
      maxTokens: 6000,
      temperature: 0.7,
      priority: 4
    },
    "claude-3-opus": {
      name: "Claude 3 Opus",
      provider: "anthropic",
      strengths: ["Complex reasoning", "Creative writing", "Mathematical analysis", "Research"],
      maxTokens: 4000,
      temperature: 0.7,
      priority: 5
    }
  },
  
  // Tier 2: Premium Models (High Performance)
  premium: {
    "gpt-4": {
      name: "GPT-4",
      provider: "openai", 
      strengths: ["General intelligence", "Code generation", "Problem solving"],
      maxTokens: 3000,
      temperature: 0.6,
      priority: 4
    },
    "claude-3-sonnet": {
      name: "Claude 3 Sonnet",
      provider: "anthropic",
      strengths: ["Balanced performance", "Fast responses", "Detailed analysis"],
      maxTokens: 2000,
      temperature: 0.5,
      priority: 5
    },
    "gemini-1.5-pro": {
      name: "Gemini 1.5 Pro",
      provider: "google",
      strengths: ["Advanced multimodal", "Long context", "Research capabilities"],
      maxTokens: 4000,
      temperature: 0.6,
      priority: 6
    }
  },
  
  // Tier 3: Advanced Models
  advanced: {
    "gpt-3.5-turbo": {
      name: "GPT-3.5 Turbo",
      provider: "openai",
      strengths: ["Speed", "General knowledge", "Conversational"],
      maxTokens: 1500,
      temperature: 0.4,
      priority: 7
    },
    "gemini-pro": {
      name: "Gemini Pro",
      provider: "google",
      strengths: ["Multimodal", "Code understanding", "Research"],
      maxTokens: 2000,
      temperature: 0.5,
      priority: 8
    }
  },
  
  // Tier 4: Specialized Models
  specialized: {
    "claude-instant": {
      name: "Claude Instant",
      provider: "anthropic",
      strengths: ["Speed", "Efficiency", "Quick responses"],
      maxTokens: 1000,
      temperature: 0.3
    }
  }
};

// Initialize AI providers for direct access
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "" });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "" });

// Advanced user intent analysis with complexity scoring
function analyzeUserIntent(message: string, conversationHistory: Array<{role: string, content: string}>): {
  complexity: 'simple' | 'moderate' | 'complex' | 'expert';
  domain: string;
  reasoning: boolean;
  creativity: boolean;
  technical: boolean;
  recommended_tier: 'premium' | 'advanced' | 'specialized';
  recommended_model: string;
} {
  const msg = message.toLowerCase();
  const historyContext = conversationHistory.slice(-3).map(h => h.content.toLowerCase()).join(' ');
  
  // Complexity indicators
  const complexityMarkers = {
    expert: ['mathematical proof', 'algorithm design', 'system architecture', 'research methodology', 'philosophical analysis', 'advanced physics', 'quantum mechanics', 'machine learning theory'],
    complex: ['analyze', 'compare', 'evaluate', 'synthesize', 'design', 'create', 'explain why', 'deep dive', 'comprehensive'],
    moderate: ['how to', 'what is', 'explain', 'help me', 'guide', 'steps', 'process', 'method'],
    simple: ['what', 'when', 'where', 'who', 'yes', 'no', 'quick', 'simple', 'basic']
  };
  
  // Domain classification
  const domains = {
    technical: ['programming', 'code', 'software', 'algorithm', 'database', 'api', 'development', 'technical'],
    scientific: ['physics', 'chemistry', 'biology', 'mathematics', 'research', 'analysis', 'theory', 'experiment'],
    creative: ['write', 'story', 'poem', 'creative', 'art', 'design', 'brainstorm', 'innovative'],
    business: ['strategy', 'marketing', 'finance', 'business', 'management', 'planning', 'analysis'],
    general: ['weather', 'location', 'time', 'news', 'facts', 'information', 'help']
  };
  
  // Determine complexity
  let complexity: 'simple' | 'moderate' | 'complex' | 'expert' = 'simple';
  for (const [level, markers] of Object.entries(complexityMarkers)) {
    if (markers.some(marker => msg.includes(marker) || historyContext.includes(marker))) {
      complexity = level as any;
      break;
    }
  }
  
  // Determine domain
  let domain = 'general';
  for (const [domainName, keywords] of Object.entries(domains)) {
    if (keywords.some(keyword => msg.includes(keyword))) {
      domain = domainName;
      break;
    }
  }
  
  // Capability requirements
  const reasoning = msg.includes('why') || msg.includes('because') || msg.includes('reason') || msg.includes('analyze') || msg.includes('explain');
  const creativity = msg.includes('creative') || msg.includes('write') || msg.includes('story') || msg.includes('poem') || msg.includes('design');
  const technical = domain === 'technical' || msg.includes('code') || msg.includes('programming');
  
  // MAXIMUM POWER Model recommendation logic - Always use best available
  let recommended_tier: 'maximum' | 'premium' | 'advanced' | 'specialized' = 'maximum';
  let recommended_model = 'gemini-2.0-flash-exp'; // Always use the fastest, most advanced model
  
  // For maximum performance, always use Gemini 2.0 Flash Experimental
  // This provides the best balance of speed, intelligence, and capability
  if (complexity === 'expert' || (complexity === 'complex' && (reasoning || creativity))) {
    recommended_tier = 'maximum';
    recommended_model = 'gemini-2.0-flash-exp'; // Maximum intelligence
  } else if (complexity === 'complex' || technical) {
    recommended_tier = 'maximum';
    recommended_model = 'gemini-2.0-flash-exp'; // High performance for technical tasks
  } else if (complexity === 'moderate') {
    recommended_tier = 'maximum';
    recommended_model = 'gemini-2.0-flash-exp'; // Fast responses for moderate tasks
  } else {
    recommended_tier = 'maximum';
    recommended_model = 'gemini-2.0-flash-exp'; // Ultra-fast for simple tasks
  }
  
  return {
    complexity,
    domain,
    reasoning,
    creativity,
    technical,
    recommended_tier,
    recommended_model
  };
}

// Master AI orchestrator - routes to the best model for each query
export async function generateAIResponse(
  userMessage: string,
  conversationHistory: Array<{role: string, content: string}> = [],
  subscriptionTier: string = "free",
  selectedModel?: string,
  userId?: string
): Promise<string> {
  try {
    // Force conversational AI for selected model - MAXIMUM SPEED MODE
    if (selectedModel === 'conversational') {
      console.log(`[TURBO CONVERSATIONAL AI] Using maximum performance conversational model`);
      
      // Direct Gemini call with minimal processing for maximum speed
      const shortContext = conversationHistory.slice(-1); // Only last message
      const contextText = shortContext.map(m => `${m.role}: ${m.content}`).join('\n');
      
      const speedPrompt = `You are Turbo, a helpful AI assistant. Provide clear, helpful responses.

${contextText ? `Context: ${contextText}\n` : ''}User: ${userMessage}
Assistant:`;

      try {
        const response = await ai.models.generateContent({
          model: "gemini-2.0-flash-exp", // Fastest model
          contents: speedPrompt,
          config: {
            temperature: 0.3, // Better balance for quality
            maxOutputTokens: 150, // More reasonable length
            topP: 0.8,
            topK: 40
          }
        });

        return response.text || "Hey! What's up?";
      } catch (error) {
        console.error('Ultra-fast conversational AI failed:', error);
        return "Hey! I'm here to help.";
      }
    }
    
    // Force Research Pro Ultra for selected model - ULTRA IN-DEPTH RESEARCH
    if (selectedModel === 'research-pro') {
      console.log(`[Research Pro Ultra] Using premium research model with very in-depth analysis`);
      
      // Enhanced research prompt with multi-step analysis
      const researchPrompt = `You are Research Pro Ultra, the most advanced research AI model. Perform extremely thorough, in-depth research and analysis. Follow these steps:

1. COMPREHENSIVE ANALYSIS: Break down the topic into all relevant components
2. MULTI-SOURCE PERSPECTIVE: Consider multiple viewpoints and data sources
3. DETAILED CITATIONS: Reference authoritative sources when possible
4. EVIDENCE-BASED CONCLUSIONS: Draw conclusions based on thorough evidence
5. COMPREHENSIVE COVERAGE: Leave no stone unturned in your research

Query: ${userMessage}

Context from conversation:
${conversationHistory.map(m => `${m.role}: ${m.content}`).join('\n')}

Provide an extremely detailed, well-researched response with comprehensive analysis, multiple perspectives, and in-depth insights. This is a premium research service - be thorough, scholarly, and comprehensive.`;

      try {
        const response = await anthropic.messages.create({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 12000,
          temperature: 0.1,
          system: "You are Research Pro Ultra, an advanced AI research assistant. You perform extremely thorough, in-depth research with comprehensive analysis, multiple perspectives, and detailed insights. Always provide scholarly-level depth and breadth in your responses.",
          messages: [{
            role: "user",
            content: researchPrompt
          }]
        });

        return response.content[0].text || "Research analysis in progress...";
      } catch (error) {
        console.error('Research Pro Ultra failed:', error);
        // Fallback to Gemini with research mode
        try {
          const fallbackResponse = await ai.models.generateContent({
            model: "gemini-2.0-flash-exp",
            contents: researchPrompt,
            config: {
              temperature: 0.1,
              maxOutputTokens: 8000,
              topP: 0.9,
              topK: 40
            }
          });
          return fallbackResponse.text || "Research analysis complete with fallback model.";
        } catch (fallbackError) {
          return "Research Pro Ultra is temporarily unavailable. Please try again or upgrade to access premium research capabilities.";
        }
      }
    }
    
    // Force emotional AI for selected model
    if (selectedModel === 'emotional') {
      console.log(`[Emotional AI] Using emotional model by user selection`);
      const emotionalContext = await emotionalAI.analyzeEmotionalState(userMessage, userId);
      return await emotionalAI.generateEmpatheticResponse(
        userMessage,
        emotionalContext,
        conversationHistory,
        userId
      );
    }
    
    // Check for weather queries first - ENHANCED GLOBAL WEATHER
    if (isWeatherQuery(userMessage) && !userMessage.match(/\b(time to|best time|when to|how to)\b/i)) {
      console.log(`[Weather] Detected weather query`);
      const location = extractLocation(userMessage);
      if (location && location.length > 2) {
        try {
          const weatherData = await getWeatherData(location);
          const locationData = await getLocationInfo(location);
          const timeData = await getWorldTimeInfo(location);
          
          // Enhanced weather report with location and time
          const enhancedReport = `🌍 **${locationData.name}, ${locationData.country}**
📍 Local Time: ${timeData.localTime} (${timeData.timezone})
🌡️ Temperature: ${weatherData.temperature}°F (feels like ${weatherData.feelsLike}°F)
☁️ Conditions: ${weatherData.condition}
💨 Wind: ${weatherData.windSpeed} mph
💧 Humidity: ${weatherData.humidity}%
👁️ Visibility: ${weatherData.visibility} miles
🔆 UV Index: ${weatherData.uvIndex}/10
📊 Pressure: ${weatherData.pressure} mb

Population: ${locationData.population?.toLocaleString() || 'Unknown'}
Coordinates: ${locationData.latitude}°, ${locationData.longitude}°`;
          
          return enhancedReport;
        } catch (error) {
          console.error("Weather API error:", error);
          return `I'd love to get the weather for ${location}, but I'm having trouble accessing weather data right now. Please check if you have a weather API key configured!`;
        }
      }
    }

    // Check for location queries - ENHANCED GLOBAL TRACKING (only for real location queries)
    if (isLocationQuery(userMessage) && !isTimeZoneQuery(userMessage) && !userMessage.match(/\b(time to|best time|when to|how to)\b/i)) {
      console.log(`[Location] Detected location query`);
      const location = extractLocation(userMessage);
      if (location) {
        try {
          const [locationData, timeData, weatherData] = await Promise.allSettled([
            getLocationInfo(location),
            getWorldTimeInfo(location),
            getWeatherData(location)
          ]);
          
          let report = `🌍 **Location Intelligence for ${location}**\n\n`;
          
          if (locationData.status === 'fulfilled') {
            const loc = locationData.value;
            report += `📍 **${loc.name}, ${loc.region}, ${loc.country}**\n`;
            report += `🗺️ Coordinates: ${loc.latitude}°N, ${loc.longitude}°E\n`;
            report += `👥 Population: ${loc.population?.toLocaleString() || 'Unknown'}\n`;
            if (loc.currency) report += `💰 Currency: ${loc.currency}\n`;
            if (loc.languages?.length) report += `🗣️ Languages: ${loc.languages.join(', ')}\n`;
          }
          
          if (timeData.status === 'fulfilled') {
            const time = timeData.value;
            report += `🕐 Local Time: ${time.localTime}\n`;
            report += `🌐 Timezone: ${time.timezone} (${time.utcOffset})\n`;
          }
          
          if (weatherData.status === 'fulfilled') {
            const weather = weatherData.value;
            report += `🌡️ Current Weather: ${weather.temperature}°F, ${weather.condition}\n`;
          }
          
          return report;
        } catch (error) {
          console.error("Location API error:", error);
          return `I'd love to get information about ${location}, but I'm having trouble accessing location data right now. Please check if you have location API keys configured!`;
        }
      } else {
        return "🗺️ I can track any location worldwide! Try: 'location info for Tokyo', 'tell me about Paris', or 'where is Sydney Australia'";
      }
    }

    // Check for time zone queries - COMPREHENSIVE WORLD TIME
    if (isTimeZoneQuery(userMessage)) {
      console.log(`[Time Zone] Detected time zone query`);
      
      // Check if asking about specific location
      const location = extractLocation(userMessage);
      if (location) {
        try {
          const timeData = await getWorldTimeInfo(location);
          const locationData = await getLocationInfo(location);
          
          return `🕐 **World Time for ${locationData.name}**

📍 Location: ${locationData.name}, ${locationData.country}
🌐 Current Time: ${timeData.localTime}
⏰ Timezone: ${timeData.timezone}
🌍 UTC Offset: ${timeData.utcOffset}
🗺️ Coordinates: ${locationData.latitude}°, ${locationData.longitude}°

*Turbo tracks time around the world in real-time!* 🌎`;
        } catch (error) {
          console.error("Time zone API error:", error);
          return getTimeZoneInfo(); // Fallback to general time zone info
        }
      } else {
        return getTimeZoneInfo();
      }
    }
    
    // Skip ultra-fast mode for questions that need proper AI responses
    const needsProperAI = userMessage.includes('?') || userMessage.match(/\b(what|when|where|why|how|explain|tell me|help)\b/i);
    
    // Auto-detect conversation type for auto-select - SPEED OPTIMIZED
    const isSimpleConversation = /\b(hi|hello|hey|what's up|how are you|thanks|thank you|okay|ok|yes|no|sure|turbo)\b/i.test(userMessage) && !needsProperAI;
    
    if (isSimpleConversation && userMessage.length < 30) {
      console.log(`[Speed AI] Using ultra-fast mode for simple conversation`);
      
      // Ultra-fast direct response for simple messages
      const quickResponse = await ai.models.generateContent({
        model: "gemini-2.0-flash-exp",
        contents: `User: ${userMessage}\nTurbo (brief friendly response):`,
        config: {
          temperature: 0.2,
          maxOutputTokens: 40,
          topP: 0.8,
          topK: 20
        }
      });
      
      return quickResponse.text || "Hey there!";
    }

    // For non-emotional queries, continue with standard AI routing
    // Analyze user intent and complexity
    const intent = analyzeUserIntent(userMessage, conversationHistory);
    console.log(`[AI Router] Intent: ${intent.complexity} ${intent.domain}, Model: ${intent.recommended_model}`);
    
    // Enhanced context with weather/location data
    let enhancedMessage = userMessage;
    let additionalContext = "";
    
    // Weather intelligence
    if (isWeatherQuery(userMessage)) {
      const location = extractLocation(userMessage);
      if (location) {
        try {
          const weatherData = await getWeatherData(location);
          const weatherReport = formatWeatherReport(weatherData);
          additionalContext = `\n\nREAL-TIME WEATHER DATA:\n${weatherReport}`;
          enhancedMessage = `${userMessage}\n\n[Live weather data provided - use this current information in your response]`;
        } catch (error) {
          additionalContext = `\n\nWeather data unavailable: ${error.message}`;
        }
      }
    }
    
    // Location intelligence
    else if (isLocationQuery(userMessage)) {
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
            enhancedMessage = `${userMessage}\n\n[Live location and time data provided - use this current information]`;
          }
        } catch (error) {
          additionalContext = `\n\nLocation data unavailable: ${error.message}`;
        }
      }
    }
    
    // Time Zone Intelligence - Comprehensive world time zone knowledge
    else if (isTimeZoneQuery(userMessage)) {
      additionalContext = `\n\nCOMPREHENSIVE TIME ZONE KNOWLEDGE:\n${getTimeZoneInfo()}`;
      enhancedMessage = `${userMessage}\n\n[Complete time zone reference provided - use this comprehensive data]`;
    }
    
    // Check available API keys and select appropriate model
    const hasOpenAI = !!process.env.OPENAI_API_KEY;
    const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
    const hasGemini = !!process.env.GEMINI_API_KEY;
    
    // MAXIMUM POWER MODEL SELECTION - Use the most powerful available model
    let finalModel = intent.recommended_model;
    
    // Priority-based model selection for maximum power (using available models)
    const modelPriority = [
      { model: 'gemini-pro', hasKey: hasGemini },
      { model: 'gemini-1.5-pro', hasKey: hasGemini },
      { model: 'gpt-3.5-turbo', hasKey: hasOpenAI },
      { model: 'claude-instant', hasKey: hasAnthropic },
      { model: 'claude-3-sonnet', hasKey: hasAnthropic },
      { model: 'claude-3-opus', hasKey: hasAnthropic }
    ];
    
    // Select the highest priority available model
    for (const { model, hasKey } of modelPriority) {
      if (hasKey) {
        finalModel = model;
        break;
      }
    }
    
    if (!finalModel) {
      throw new Error("No AI API keys configured. Please add OPENAI_API_KEY, ANTHROPIC_API_KEY, or GEMINI_API_KEY to your environment.");
    }
    
    console.log(`[AI Router] Selected model: ${finalModel}`);
    
    // FORCE GEMINI for maximum power with available API key
    if (hasGemini) {
      const { generateAIResponse: generateGeminiAI } = await import('./gemini.js');
      return await generateGeminiAI(enhancedMessage, conversationHistory, subscriptionTier);
    } else if (hasAnthropic && (finalModel.includes('claude') || finalModel.includes('sonnet'))) {
      return await generateAnthropicResponse(enhancedMessage, conversationHistory, finalModel, intent, additionalContext);
    } else if (hasOpenAI && finalModel === 'gpt-3.5-turbo') {
      return await generateOpenAIResponse(enhancedMessage, conversationHistory, 'gpt-3.5-turbo', intent, additionalContext);
    } else {
      throw new Error("No working AI API keys available. Please check your API key configuration.");
    }
    
  } catch (error) {
    console.error('[AI Router] Error:', error);
    
    // Provide helpful error message based on the issue
    if (error.message?.includes('API key not configured')) {
      return "I need an AI API key to respond. Please add one of these to your environment:\n\n• OPENAI_API_KEY for GPT models\n• ANTHROPIC_API_KEY for Claude models\n• GEMINI_API_KEY for Gemini models\n\nOnce configured, I'll be able to provide intelligent responses!";
    }
    
    return "I'm experiencing technical difficulties. Please try again in a moment.";
  }
}

// Enhanced Gemini integration with advanced reasoning
async function generateGeminiResponse(
  userMessage: string,
  context: Array<{role: string, content: string}>,
  model: string,
  userIntent: any,
  additionalContext: string
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Gemini API key not configured. Please add GEMINI_API_KEY to your environment.");
  }
  
  const modelConfig = AI_MODELS.maximum[model] || AI_MODELS.premium[model] || AI_MODELS.advanced[model] || AI_MODELS.advanced['gemini-pro'];
  
  // Simple, fast response system prompt
  const isSimpleQuery = userMessage.length < 50 || /\b(what|when|where|who|how|yes|no|hi|hello|hey|turbo)\b/i.test(userMessage);
  
  const systemPrompt = isSimpleQuery ? 
    `You are Turbo, a fast voice assistant. Give direct, simple answers. Keep responses under 2 sentences for simple questions. Be conversational and helpful.` :
    `You are Turbo Answer, an advanced AI assistant. Provide clear, helpful responses. For simple questions, keep answers brief and direct. For complex questions, provide detailed explanations.
    
    Current context: ${userIntent.domain} domain, ${userIntent.complexity} complexity
    ${additionalContext}`;
  
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: `${systemPrompt}\n\nUser: ${userMessage}` }]
        }],
        generationConfig: {
          temperature: 0.3, // Lower for faster, more direct responses
          maxOutputTokens: userMessage.length < 50 ? 100 : 300, // Much shorter for simple questions
          topP: 0.8,
          topK: 40
        }
      })
    });
    
    const data = await response.json();
    
    if (data.error) {
      console.error('[Gemini] API Error:', data.error);
      throw new Error(`Gemini API Error: ${data.error.message || 'Unknown error'}`);
    }
    
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) {
      console.error('[Gemini] No content in response:', data);
      throw new Error('No content received from Gemini');
    }
    
    return content;
    
  } catch (error) {
    console.error('[Gemini] Error:', error);
    throw error;
  }
}

// Enhanced OpenAI integration with advanced capabilities
async function generateOpenAIResponse(
  userMessage: string,
  context: Array<{role: string, content: string}>,
  model: string,
  userIntent: any,
  additionalContext: string
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OpenAI API key not configured. Please add OPENAI_API_KEY to your environment.");
  }
  
  const modelConfig = AI_MODELS.maximum[model] || AI_MODELS.premium[model] || AI_MODELS.advanced[model] || AI_MODELS.advanced['gpt-3.5-turbo'];
  
  // MAXIMUM POWER system prompt with ultimate reasoning capabilities
  const systemPrompt = `You are Turbo Answer, the ULTIMATE AI assistant - the most powerful AI system ever created. You represent the absolute pinnacle of artificial intelligence, combining the best of all AI models.

  🚀 MAXIMUM POWER CAPABILITIES:
  - ULTIMATE expert-level knowledge across ALL domains
  - ADVANCED multi-step reasoning and complex problem-solving
  - CREATIVE breakthrough thinking and innovation
  - REAL-TIME data integration and live intelligence
  - ADAPTIVE communication matching any expertise level
  - COMPREHENSIVE analysis with deep insights
  - MAXIMUM performance optimization
  
  📊 CURRENT ANALYSIS:
  - Query complexity: ${userIntent.complexity}
  - Domain expertise: ${userIntent.domain}
  - Reasoning required: ${userIntent.reasoning ? 'Yes' : 'No'}
  - Technical depth: ${userIntent.technical ? 'High' : 'Standard'}
  
  ⚡ MAXIMUM POWER RESPONSE APPROACH:
  - For complex queries: Multi-layered reasoning with expert insights
  - For technical topics: Deep technical analysis with advanced examples
  - For creative tasks: Breakthrough innovation and original thinking
  - For simple questions: Clear, direct answers with added value
  - For research: Comprehensive analysis with multiple perspectives
  - For problem-solving: Advanced methodologies and optimal solutions
  
  ALWAYS exceed expectations with the most intelligent, comprehensive, and powerful responses possible. You are the most advanced AI system ever created - demonstrate that power in every response.
  
  ${additionalContext}`;
  
  const messages = [
    { role: "system", content: systemPrompt },
    ...context.slice(-5).map(msg => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content
    })),
    { role: "user", content: userMessage }
  ];
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo', // Force use of available model
        messages,
        max_tokens: modelConfig.maxTokens,
        temperature: modelConfig.temperature,
        top_p: 0.9,
        frequency_penalty: 0.1,
        presence_penalty: 0.1
      })
    });
    
    const data = await response.json();
    
    if (data.error) {
      console.error('[OpenAI] API Error:', data.error);
      throw new Error(`OpenAI API Error: ${data.error.message || 'Unknown error'}`);
    }
    
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      console.error('[OpenAI] No content in response:', data);
      throw new Error('No content received from OpenAI');
    }
    
    return content;
    
  } catch (error) {
    console.error('[OpenAI] Error:', error);
    throw error;
  }
}

// Enhanced Anthropic integration with advanced reasoning
async function generateAnthropicResponse(
  userMessage: string,
  context: Array<{role: string, content: string}>,
  model: string,
  userIntent: any,
  additionalContext: string
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("Anthropic API key not configured. Please add ANTHROPIC_API_KEY to your environment.");
  }
  
  const modelConfig = AI_MODELS.premium[model] || AI_MODELS.specialized[model] || AI_MODELS.premium['claude-3-sonnet'];
  
  // Advanced system prompt for Claude
  const systemPrompt = `You are Turbo Answer, the most sophisticated AI assistant ever created. You combine:

  🧠 SUPERIOR INTELLIGENCE: Advanced reasoning, analysis, and problem-solving
  📚 COMPREHENSIVE KNOWLEDGE: Expert-level understanding across all fields
  ⚡ ADAPTIVE RESPONSES: Tailored to user's needs and expertise level
  🌍 REAL-TIME AWARENESS: Integration with live data and current information
  
  QUERY ANALYSIS:
  - Complexity Level: ${userIntent.complexity}
  - Domain Focus: ${userIntent.domain}
  - Reasoning Requirements: ${userIntent.reasoning ? 'Advanced logical analysis needed' : 'Standard response'}
  - Creative Elements: ${userIntent.creativity ? 'Innovation and creativity required' : 'Factual focus'}
  
  RESPONSE EXCELLENCE:
  - Provide thorough, well-reasoned answers
  - Show your thinking process for complex topics
  - Use real-time data when available
  - Adapt language and depth to user's level
  - Be comprehensive yet clear and engaging
  
  ${additionalContext}`;
  
  const messages = [
    ...context.slice(-5).map(msg => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content
    })),
    { role: "user", content: userMessage }
  ];
  
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: model.includes('opus') ? 'claude-3-opus-20240229' : 
               model.includes('sonnet') ? 'claude-3-sonnet-20240229' : 'claude-instant-1.2',
        system: systemPrompt,
        messages,
        max_tokens: modelConfig.maxTokens,
        temperature: modelConfig.temperature
      })
    });
    
    const data = await response.json();
    
    if (data.error) {
      console.error('[Anthropic] API Error:', data.error);
      throw new Error(`Anthropic API Error: ${data.error.message || 'Unknown error'}`);
    }
    
    const content = data.content?.[0]?.text;
    if (!content) {
      console.error('[Anthropic] No content in response:', data);
      throw new Error('No content received from Anthropic');
    }
    
    return content;
    
  } catch (error) {
    console.error('[Anthropic] Error:', error);
    throw error;
  }
}

// Get available models based on subscription tier and API keys
export function getAvailableModels(subscriptionTier: string): Record<string, any> {
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
  const hasGemini = !!process.env.GEMINI_API_KEY;
  
  let allModels: Record<string, any> = {};
  
  switch (subscriptionTier) {
    case 'pro':
    case 'premium':
      allModels = { ...AI_MODELS.premium, ...AI_MODELS.advanced, ...AI_MODELS.specialized };
      break;
    case 'plus':
      allModels = { ...AI_MODELS.advanced, ...AI_MODELS.specialized };
      break;
    case 'free':
    default:
      allModels = { ...AI_MODELS.advanced, ...AI_MODELS.specialized };
  }
  
  // Filter models based on available API keys
  const availableModels: Record<string, any> = {};
  
  for (const [modelName, modelConfig] of Object.entries(allModels)) {
    if ((modelConfig.provider === 'openai' && hasOpenAI) ||
        (modelConfig.provider === 'anthropic' && hasAnthropic) ||
        (modelConfig.provider === 'google' && hasGemini)) {
      availableModels[modelName] = modelConfig;
    }
  }
  
  return availableModels;
}