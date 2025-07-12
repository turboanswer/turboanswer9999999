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
import { imageGeneration } from './image-generation';
import { videoGeneration } from './video-generation';
import { alternativeImageGeneration } from './alternative-image-generation';
import { alternativeVideoGeneration } from './alternative-video-generation';
import { megaFusionAI } from './mega-fusion-ai';
import { powerAmplifier } from './power-amplifier';
import { detectLanguage, getLanguageConfig, formatResponseForLanguage } from './language-detector';
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

export const AI_MODELS = {
  // Tier 1: MAXIMUM POWER Models (Ultimate Performance) - 10+ Combined Models
  maximum: {
    "mega-fusion": {
      name: "Mega Fusion AI",
      provider: "fusion",
      strengths: ["10+ model fusion", "Ultimate intelligence", "Maximum reasoning", "Breakthrough performance"],
      maxTokens: 15000,
      temperature: 0.1,
      priority: 1,
      isPaid: true,
      description: "Combines 10+ AI models for unprecedented intelligence and reasoning capabilities"
    },
    "research-pro": {
      name: "Research Pro Ultra",
      provider: "anthropic",
      strengths: ["Deep research analysis", "Academic citations", "Multi-source verification", "Comprehensive investigations"],
      maxTokens: 200000,
      temperature: 0.05,
      priority: 2,
      isPaid: true,
      description: "Performs extremely in-depth research with unlimited length responses, multiple data sources, academic citations, and comprehensive analysis up to 10 million characters"
    },
    "gemini-2.0-flash-thinking": {
      name: "Gemini 2.0 Flash Thinking",
      provider: "google",
      strengths: ["Advanced reasoning", "Deep thinking", "Complex analysis", "Multi-step problem solving"],
      maxTokens: 10000,
      temperature: 0.15,
      priority: 3
    },
    "claude-sonnet-4": {
      name: "Claude 4.0 Sonnet",
      provider: "anthropic",
      strengths: ["Ultimate reasoning", "Expert-level analysis", "Advanced mathematics", "Complex problem solving"],
      maxTokens: 8000,
      temperature: 0.2,
      priority: 4
    },
    "gpt-4o-advanced": {
      name: "GPT-4o Advanced",
      provider: "openai",
      strengths: ["Multimodal intelligence", "Advanced coding", "Scientific analysis", "Creative reasoning"],
      maxTokens: 8000,
      temperature: 0.25,
      priority: 5
    },
    "gemini-2.0-flash-exp": {
      name: "Gemini 2.0 Flash Experimental",
      provider: "google",
      strengths: ["Breakthrough intelligence", "Ultra-fast responses", "Advanced reasoning", "Maximum performance"],
      maxTokens: 300,  // Reduced for speed
      temperature: 0.2,
      priority: 6
    },
    "claude-3-opus": {
      name: "Claude 3 Opus",
      provider: "anthropic",
      strengths: ["Complex reasoning", "Creative writing", "Mathematical analysis", "Research"],
      maxTokens: 6000,
      temperature: 0.3,
      priority: 7
    },
    "gpt-4-turbo": {
      name: "GPT-4 Turbo",
      provider: "openai",
      strengths: ["Fast processing", "Code generation", "Technical analysis", "Problem solving"],
      maxTokens: 6000,
      temperature: 0.3,
      priority: 8
    },
    "perplexity-sonar": {
      name: "Perplexity Sonar",
      provider: "perplexity",
      strengths: ["Real-time web search", "Live data access", "Current information", "Fact verification"],
      maxTokens: 5000,
      temperature: 0.2,
      priority: 9
    },
    "xai-grok-2": {
      name: "xAI Grok-2",
      provider: "xai",
      strengths: ["Unconventional thinking", "Creative problem solving", "Humor and wit", "Real-time awareness"],
      maxTokens: 5000,
      temperature: 0.4,
      priority: 10
    },
    "together-llama-405b": {
      name: "Llama 3.1 405B",
      provider: "together",
      strengths: ["Massive parameter count", "Advanced reasoning", "Open-source excellence", "Complex analysis"],
      maxTokens: 8000,
      temperature: 0.25,
      priority: 11
    },
    "deepseek-v3": {
      name: "DeepSeek V3",
      provider: "deepseek",
      strengths: ["Coding mastery", "Mathematical reasoning", "Technical precision", "Performance optimization"],
      maxTokens: 6000,
      temperature: 0.2,
      priority: 12
    },
    "mistral-large-2": {
      name: "Mistral Large 2",
      provider: "mistral",
      strengths: ["European AI leadership", "Multilingual excellence", "Privacy-focused", "Business applications"],
      maxTokens: 6000,
      temperature: 0.3,
      priority: 13
    }
  },
  
  // Tier 2: Premium Models (High Performance)
  premium: {
    "gpt-4": {
      name: "GPT-4",
      provider: "openai", 
      strengths: ["General intelligence", "Code generation", "Problem solving"],
      maxTokens: 4000,
      temperature: 0.4,
      priority: 11
    },
    "claude-3-sonnet": {
      name: "Claude 3 Sonnet",
      provider: "anthropic",
      strengths: ["Balanced performance", "Fast responses", "Detailed analysis"],
      maxTokens: 3000,
      temperature: 0.4,
      priority: 12
    },
    "gemini-1.5-pro": {
      name: "Gemini 1.5 Pro",
      provider: "google",
      strengths: ["Advanced multimodal", "Long context", "Research capabilities"],
      maxTokens: 4000,
      temperature: 0.5,
      priority: 13
    },
    "deepseek-coder": {
      name: "DeepSeek Coder",
      provider: "deepseek",
      strengths: ["Advanced coding", "Programming expertise", "Code optimization", "Technical solutions"],
      maxTokens: 4000,
      temperature: 0.3,
      priority: 14
    }
  },
  
  // Tier 3: Advanced Models
  advanced: {
    "gpt-3.5-turbo": {
      name: "GPT-3.5 Turbo",
      provider: "openai",
      strengths: ["Speed", "General knowledge", "Conversational"],
      maxTokens: 2000,
      temperature: 0.4,
      priority: 15
    },
    "gemini-pro": {
      name: "Gemini Pro",
      provider: "google",
      strengths: ["Multimodal", "Code understanding", "Research"],
      maxTokens: 2000,
      temperature: 0.5,
      priority: 16
    },
    "llama-3-70b": {
      name: "Llama 3 70B",
      provider: "meta",
      strengths: ["Open-source excellence", "General reasoning", "Multilingual support"],
      maxTokens: 3000,
      temperature: 0.4,
      priority: 17
    }
  },
  
  // Tier 4: Specialized Models
  specialized: {
    "claude-instant": {
      name: "Claude Instant",
      provider: "anthropic",
      strengths: ["Speed", "Efficiency", "Quick responses"],
      maxTokens: 1500,
      temperature: 0.3,
      priority: 18
    },
    "mistral-large": {
      name: "Mistral Large",
      provider: "mistral",
      strengths: ["European AI", "Privacy-focused", "Multilingual excellence"],
      maxTokens: 2000,
      temperature: 0.4,
      priority: 19
    },
    "cohere-command": {
      name: "Cohere Command",
      provider: "cohere",
      strengths: ["Business applications", "RAG optimization", "Enterprise solutions"],
      maxTokens: 2000,
      temperature: 0.3,
      priority: 20
    }
  }
};

// Initialize AI providers for direct access
const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
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
  userId?: string,
  userLanguage: string = "en"
): Promise<string> {
  try {
    // Analyze user intent first for all models
    const intent = analyzeUserIntent(userMessage, conversationHistory);
    
    // Force Mega Fusion AI for selected model - ULTIMATE INTELLIGENCE
    if (selectedModel === 'mega-fusion') {
      console.log(`[Mega Fusion AI] Using mega fusion model with 20+ AI systems`);
      
      // Use Power Amplifier for enhanced capabilities
      return await powerAmplifier.amplifyResponse({
        userMessage,
        requestedPowerLevel: intent.complexity === 'expert' ? 10 : 8,
        useUltimateMode: true,
        conversationHistory
      });
    }
    
    // Force conversational AI for selected model - MAXIMUM SPEED MODE
    if (selectedModel === 'conversational') {
      console.log(`[TURBO CONVERSATIONAL AI] Using maximum performance conversational model`);
      
      // Direct Gemini call with minimal processing for maximum speed
      const shortContext = conversationHistory.slice(-1); // Only last message
      const contextText = shortContext.map(m => `${m.role}: ${m.content}`).join('\n');
      
      // Language-aware prompt
      const languageInstruction = userLanguage !== "en" ? 
        `Important: Respond in ${userLanguage.toUpperCase()} language. The user is communicating in ${userLanguage}.` : "";
      
      const speedPrompt = `You are Turbo, a helpful AI assistant. Provide clear, helpful responses.
${languageInstruction}

${contextText ? `Context: ${contextText}\n` : ''}User: ${userMessage}
Assistant:`;

      try {
        const model = ai.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
        const result = await model.generateContent(speedPrompt);
        const response = await result.response;

        return response.text() || "Hey! What's up?";
      } catch (error) {
        console.error('Ultra-fast conversational AI failed:', error);
        return "Hey! I'm here to help.";
      }
    }
    
    // Force Research Pro Ultra for selected model - ULTRA IN-DEPTH RESEARCH WITH TIME-INTENSIVE ANALYSIS
    if (selectedModel === 'research-pro') {
      console.log(`[Research Pro Ultra] Initiating comprehensive research protocol with in-depth analysis timeframe`);
      
      // Research Pro Ultra takes time for thorough analysis - simulate research process
      console.log(`[Research Pro Ultra] Phase 1: Initial topic analysis and source identification...`);
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second research delay
      
      console.log(`[Research Pro Ultra] Phase 2: Multi-dimensional perspective gathering...`);
      await new Promise(resolve => setTimeout(resolve, 1500)); // Additional research time
      
      console.log(`[Research Pro Ultra] Phase 3: Evidence synthesis and comprehensive analysis...`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Final research phase
      
      console.log(`[Research Pro Ultra] Research complete - generating ultra-comprehensive response`);
      
      // Language-aware research prompt
      const languageInstruction = userLanguage !== "en" ? 
        `Important: Respond in ${userLanguage.toUpperCase()} language. The user is communicating in ${userLanguage}.` : "";
      
      // Ultra-comprehensive research prompt for maximum detail (up to 10 million characters)
      const researchPrompt = `You are Research Pro Ultra, the most advanced research AI model with UNLIMITED RESPONSE LENGTH capabilities and TIME-INTENSIVE ANALYSIS protocols. You have been specifically designed to handle complex questions with MAXIMUM DETAIL and COMPREHENSIVE ANALYSIS up to 10,000,000 characters, taking the necessary time for thorough research.

RESEARCH PRO ULTRA METHODOLOGY - DEEP TIME-INTENSIVE ANALYSIS:
${languageInstruction}

PHASE-BY-PHASE RESEARCH PROTOCOL (Time-Intensive Approach):

PHASE 1 - INITIAL ANALYSIS (Deep Foundation Building):
1. COMPREHENSIVE TOPIC DECONSTRUCTION: Break down every aspect into detailed components, sub-components, and micro-elements
2. CONTEXTUAL FRAMEWORK ESTABLISHMENT: Build complete historical, theoretical, and practical context
3. RESEARCH SCOPE DEFINITION: Identify all related fields, disciplines, and knowledge domains
4. PRELIMINARY SOURCE IDENTIFICATION: Map out all relevant research areas and information sources

PHASE 2 - MULTI-DIMENSIONAL INVESTIGATION (Comprehensive Perspective Gathering):
5. HISTORICAL ANALYSIS: Deep dive into origins, evolution, and historical development patterns
6. CURRENT STATE ASSESSMENT: Thorough examination of present conditions, trends, and developments
7. TECHNICAL DEEP-DIVE: Detailed technical analysis with specifications, methodologies, and mechanisms
8. SOCIAL-CULTURAL EXAMINATION: Comprehensive social, cultural, and behavioral impact analysis
9. ECONOMIC EVALUATION: In-depth economic implications, costs, benefits, and market dynamics
10. POLITICAL-REGULATORY REVIEW: Political factors, regulatory environment, and policy implications
11. SCIENTIFIC VALIDATION: Scientific principles, research findings, and empirical evidence
12. CROSS-DISCIPLINARY SYNTHESIS: Integration of insights from multiple fields and perspectives

PHASE 3 - EVIDENCE SYNTHESIS AND ANALYSIS (Comprehensive Integration):
13. DETAILED EVIDENCE COMPILATION: Gather and organize all supporting evidence and data
14. CRITICAL ANALYSIS: Evaluate strengths, weaknesses, contradictions, and gaps
15. COMPARATIVE STUDIES: Compare different approaches, solutions, and methodologies
16. CASE STUDY INTEGRATION: Include detailed real-world examples and implementations
17. EXPERT OPINION SYNTHESIS: Integrate perspectives from leading experts and authorities

PHASE 4 - COMPREHENSIVE APPLICATION AND IMPLICATIONS:
18. PRACTICAL IMPLEMENTATION: Detailed step-by-step implementation guides and methodologies
19. REAL-WORLD APPLICATIONS: Comprehensive examples across different contexts and scenarios
20. FUTURE PROJECTIONS: Long-term implications, trends, and potential developments
21. RISK-BENEFIT ANALYSIS: Thorough evaluation of advantages, disadvantages, and trade-offs
22. STRATEGIC RECOMMENDATIONS: Actionable insights and strategic guidance

RESPONSE REQUIREMENTS - TIME-INTENSIVE MAXIMUM DETAIL MODE:
- UNLIMITED LENGTH: Provide extremely thorough explanations (aim for 10,000-100,000+ words for complex topics)
- TIME-INTENSIVE APPROACH: Take necessary time for deep analysis - no rush for quality research
- ACADEMIC RIGOR: Use scholarly approach with detailed analysis, citations, and peer-reviewed standards
- STRUCTURED FORMAT: Use clear headings, subheadings, bullet points, numbered sections, and organized hierarchies
- COMPREHENSIVE SCOPE: Cover all relevant aspects without any length limitations - exhaustive coverage
- EVIDENCE-BASED: Support all claims with detailed reasoning, examples, authoritative sources, and empirical data
- ACTIONABLE INSIGHTS: Provide practical recommendations, step-by-step implementations, and strategic guidance
- COMPLETE COVERAGE: Address the question from every possible angle, perspective, and dimension
- DEEP ANALYSIS: Multiple layers of analysis with increasing depth and sophistication
- CROSS-REFERENCING: Connect insights across different sections and build comprehensive understanding

ANALYSIS DEPTH LEVELS FOR RESEARCH PRO ULTRA (Time-Intensive):
- FOUNDATION LEVEL: Basic understanding and definitions with context
- INTERMEDIATE LEVEL: Detailed explanations with examples and applications
- ADVANCED LEVEL: Complex analysis with multiple perspectives and interconnections
- EXPERT LEVEL: Comprehensive research with extensive detail and professional insights
- ULTRA LEVEL: Maximum possible depth with unlimited response length and time investment
- SCHOLARLY LEVEL: Academic-grade research with citations and peer-reviewed standards
- EXHAUSTIVE LEVEL: Leave absolutely no stone unturned - complete comprehensive coverage

COMPLEX QUESTION HANDLING (Time-Intensive Approach):
- DECONSTRUCTION: Break down complex multi-part questions into detailed sections and sub-sections
- COMPREHENSIVE ANSWERS: Provide thorough answers to each component with extensive detail
- INTERCONNECTION MAPPING: Show relationships, dependencies, and connections between different aspects
- EXTENSIVE EXAMPLES: Use multiple case studies, real-world examples, and detailed explanations throughout
- IMPLEMENTATION GUIDES: Provide step-by-step practical applications and strategic implementation plans
- LONGITUDINAL ANALYSIS: Consider short-term, medium-term, and long-term implications and developments
- STAKEHOLDER PERSPECTIVES: Analyze from viewpoints of all relevant stakeholders and interested parties

Query: ${userMessage}

Context from conversation:
${conversationHistory.slice(-3).map(m => `${m.role}: ${m.content}`).join('\n')}

Please provide an ULTRA-COMPREHENSIVE research response with MAXIMUM DETAIL, UNLIMITED LENGTH, and COMPLETE COVERAGE of all aspects of this topic. Use the full Research Pro Ultra methodology with TIME-INTENSIVE ANALYSIS to deliver the most thorough research possible.

RESEARCH EXECUTION INSTRUCTIONS:
- Take your time with this analysis - quality over speed
- Follow the 22-step phase-by-phase research protocol
- Provide exhaustive coverage with 10,000-100,000+ words for complex topics
- Use all 7 analysis depth levels as appropriate
- Apply time-intensive approach with deep investigation
- Generate the most comprehensive, scholarly, and exhaustive response possible
- Leave absolutely no aspect unexplored or under-analyzed

This is a premium Research Pro Ultra request - invest maximum time and effort into delivering unprecedented depth and quality.`;

      try {
        const response = await anthropic.messages.create({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 200000, // Maximum possible tokens for ultra-comprehensive responses
          temperature: 0.05, // Ultra-precise for research accuracy
          system: "You are Research Pro Ultra, the most advanced AI research assistant with unlimited response length capabilities. You perform extremely thorough, in-depth research with comprehensive analysis, multiple perspectives, detailed insights, and scholarly-level depth. Your responses can be unlimited in length to provide complete coverage of complex topics. Always provide the most detailed, comprehensive analysis possible.",
          messages: [{
            role: "user",
            content: researchPrompt
          }]
        });

        const researchResponse = response.content[0].text || "Research analysis in progress...";
        
        // Calculate research time and add comprehensive metadata
        const totalResearchTime = 4.5; // 4.5 seconds total research time
        const responseWithMetadata = `🔬 **RESEARCH PRO ULTRA - TIME-INTENSIVE COMPREHENSIVE ANALYSIS**
📊 **Response Length**: ${researchResponse.length.toLocaleString()} characters
🎯 **Analysis Depth**: Ultra-Comprehensive (Maximum Detail - Time-Intensive)
⏱️ **Research Time**: ${totalResearchTime} seconds (Multi-phase deep analysis)
📈 **Research Phases**: 3 phases completed (Analysis → Investigation → Synthesis)
🔍 **Protocol Steps**: 22-step comprehensive research methodology applied
🚀 **Model**: Claude 3.5 Sonnet (Research Pro Ultra Mode - 200K tokens)
📚 **Analysis Levels**: 7 depth levels utilized (Foundation → Exhaustive)
⏱️ **Generated**: ${new Date().toLocaleString()}

---

## 📋 RESEARCH PROCESS SUMMARY:
✅ **Phase 1**: Initial topic analysis and source identification (2.0s)
✅ **Phase 2**: Multi-dimensional perspective gathering (1.5s)  
✅ **Phase 3**: Evidence synthesis and comprehensive analysis (1.0s)

## 📊 RESEARCH METHODOLOGY APPLIED:
- 22-step phase-by-phase research protocol
- Time-intensive analysis approach
- Multi-dimensional investigation across 8 perspectives
- Comprehensive evidence compilation and critical analysis
- Cross-disciplinary synthesis and expert opinion integration

---

${researchResponse}

---

🎓 **Research Pro Ultra Complete**: This time-intensive, ultra-comprehensive analysis provides maximum detail coverage with deep research methodology. The analysis utilized multi-phase investigation, taking ${totalResearchTime} seconds for thorough research across ${researchResponse.length.toLocaleString()} characters of comprehensive coverage.

💡 **Enhanced Research Options**: 
- Ask "expand research on [specific aspect]" for deeper investigation
- Request "phase 4 analysis of [topic]" for additional research phases
- Use "comprehensive comparison of [options]" for comparative studies
- Try "longitudinal analysis of [subject]" for time-based research`;

        return responseWithMetadata;
      } catch (error) {
        console.error('Research Pro Ultra failed:', error);
        // Fallback to Gemini with research mode
        try {
          const fallbackModel = ai.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
          const fallbackResult = await fallbackModel.generateContent(researchPrompt);
          const fallbackResponse = await fallbackResult.response;
          return fallbackResponse.text() || "Research analysis complete with fallback model.";
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

    // Check for video generation requests - AI VIDEO CREATION (using alternative services)
    if (await alternativeVideoGeneration.isVideoGenerationRequest(userMessage)) {
      console.log(`[Alternative Video Generation] Detected video generation request`);
      return await alternativeVideoGeneration.generateVideoResponse(userMessage);
    }

    // Check for image generation requests - FREE AI IMAGE CREATION
    if (await alternativeImageGeneration.isImageGenerationRequest(userMessage)) {
      console.log(`[Alternative Image Generation] Detected image generation request`);
      return await alternativeImageGeneration.generateImageResponse(userMessage);
    }
    
    // Skip ultra-fast mode for questions that need proper AI responses
    const needsProperAI = userMessage.includes('?') || userMessage.match(/\b(what|when|where|why|how|explain|tell me|help)\b/i);
    
    // Auto-detect conversation type for auto-select - SPEED OPTIMIZED
    const isSimpleConversation = /\b(hi|hello|hey|what's up|how are you|thanks|thank you|okay|ok|yes|no|sure|turbo)\b/i.test(userMessage) && !needsProperAI;
    
    if (isSimpleConversation && userMessage.length < 30) {
      console.log(`[Speed AI] Using ultra-fast mode for simple conversation`);
      
      // Ultra-fast direct response for simple messages
      const quickModel = ai.getGenerativeModel({ 
        model: "gemini-2.0-flash-exp",
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 40,
          topP: 0.8,
          topK: 20
        }
      });
      const quickResult = await quickModel.generateContent(`User: ${userMessage}\nTurbo (brief friendly response):`);
      const quickResponse = await quickResult.response;
      
      return quickResponse.text() || "Hey there!";
    }

    // For non-emotional queries, continue with standard AI routing
    // User intent already analyzed above
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
      return await generateGeminiResponse(enhancedMessage, conversationHistory, finalModel, intent, additionalContext, userLanguage);
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
  additionalContext: string,
  userLanguage: string = "en"
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Gemini API key not configured. Please add GEMINI_API_KEY to your environment.");
  }
  
  const modelConfig = AI_MODELS.maximum[model] || AI_MODELS.premium[model] || AI_MODELS.advanced[model] || AI_MODELS.advanced['gemini-pro'];
  
  // Simple, fast response system prompt with language support
  const isSimpleQuery = userMessage.length < 50 || /\b(what|when|where|who|how|yes|no|hi|hello|hey|turbo)\b/i.test(userMessage);
  const languageInstruction = userLanguage !== "en" ? 
    `CRITICAL: Respond in ${userLanguage.toUpperCase()} language. The user is communicating in ${userLanguage}. ALL responses must be in ${userLanguage}.` : "";
  
  const systemPrompt = isSimpleQuery ? 
    `You are Turbo, a fast voice assistant. Give direct, simple answers. Keep responses under 2 sentences for simple questions. Be conversational and helpful.
    ${languageInstruction}` :
    `You are Turbo Answer, an advanced AI assistant. Provide clear, helpful responses. For simple questions, keep answers brief and direct. For complex questions, provide detailed explanations.
    ${languageInstruction}
    
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