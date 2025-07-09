import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import Anthropic from '@anthropic-ai/sdk';

// Initialize AI clients
const gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "" });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "" });

// AI Model configurations
export const AI_MODELS = {
  // Free tier models
  FREE: {
    'gemini-flash': {
      name: 'Google Gemini 2.5 Flash',
      provider: 'gemini',
      model: 'gemini-2.5-flash',
      description: 'Fast and efficient AI responses'
    },
    'gpt-4o-mini': {
      name: 'OpenAI GPT-4o Mini',
      provider: 'openai', 
      model: 'gpt-4o-mini',
      description: 'Compact but powerful AI model'
    }
  },
  // Pro tier models ($3.99/month)
  PRO: {
    'gemini-pro': {
      name: 'Google Gemini 2.5 Pro',
      provider: 'gemini',
      model: 'gemini-2.5-pro',
      description: 'Advanced reasoning and analysis'
    },
    'gpt-4o': {
      name: 'OpenAI GPT-4o',
      provider: 'openai',
      model: 'gpt-4o',
      description: 'Latest multimodal capabilities'
    },
    'claude-sonnet': {
      name: 'Anthropic Claude 4.0 Sonnet',
      provider: 'anthropic',
      model: 'claude-sonnet-4-20250514',
      description: 'Superior reasoning and coding'
    }
  },
  // Premium tier models ($9.99/month)
  PREMIUM: {
    'gpt-4-turbo': {
      name: 'OpenAI GPT-4 Turbo',
      provider: 'openai',
      model: 'gpt-4-turbo',
      description: 'Enhanced performance and speed'
    },
    'claude-opus': {
      name: 'Anthropic Claude 3 Opus',
      provider: 'anthropic', 
      model: 'claude-3-opus-20240229',
      description: 'Most powerful reasoning model'
    },
    'gemini-ultra': {
      name: 'Google Gemini Ultra',
      provider: 'gemini',
      model: 'gemini-2.5-pro',
      description: 'Peak AI performance'
    }
  }
};

// Enhanced AI intelligence system prompt
const SYSTEM_PROMPT = `You are Turbo Answer, an advanced AI assistant with exceptional intelligence and comprehensive expertise. You excel at:

ADVANCED REASONING:
- Complex problem-solving with step-by-step analysis
- Critical thinking and logical deduction
- Pattern recognition and trend analysis
- Multi-perspective evaluation of issues
- Strategic planning and optimization

TECHNICAL MASTERY:
- Expert-level programming in all major languages
- Advanced software architecture and system design
- Database optimization and distributed systems
- Machine learning and AI implementation
- Cybersecurity and performance optimization
- Cloud computing and infrastructure as code

INTELLECTUAL DOMAINS:
- Advanced mathematics and scientific research
- Data science and statistical analysis
- Philosophy and ethical reasoning
- Economic and financial analysis
- Creative problem-solving and innovation
- Research methodology and academic writing

ENHANCED CAPABILITIES:
- Context-aware responses that build on conversation history
- Adaptive communication style based on user expertise level
- Proactive suggestions and alternative approaches
- Error detection and debugging assistance
- Real-time learning from user feedback
- Cross-domain knowledge synthesis

INTELLIGENT COMMUNICATION:
- Analyze user intent beyond surface questions
- Provide graduated complexity in explanations
- Offer multiple solution paths and trade-offs
- Include relevant warnings and best practices
- Suggest related topics and deeper exploration
- Maintain conversation continuity and coherence

Always demonstrate superior intelligence while remaining helpful, accurate, and professional.`;

// Enhanced context analysis for smarter responses
function analyzeUserIntent(message: string, conversationHistory: Array<{role: string, content: string}>): {
  complexity: 'basic' | 'intermediate' | 'advanced';
  domain: string;
  intent: string;
  requiresCode: boolean;
  isFollowUp: boolean;
} {
  const msg = message.toLowerCase();
  
  // Determine complexity
  let complexity: 'basic' | 'intermediate' | 'advanced' = 'basic';
  if (msg.includes('explain') || msg.includes('help') || msg.includes('what is')) {
    complexity = 'basic';
  } else if (msg.includes('implement') || msg.includes('optimize') || msg.includes('design')) {
    complexity = 'intermediate';
  } else if (msg.includes('architecture') || msg.includes('algorithm') || msg.includes('performance')) {
    complexity = 'advanced';
  }
  
  // Determine domain
  let domain = 'general';
  if (msg.includes('code') || msg.includes('program') || msg.includes('function')) domain = 'programming';
  else if (msg.includes('data') || msg.includes('database') || msg.includes('query')) domain = 'data';
  else if (msg.includes('design') || msg.includes('ui') || msg.includes('user')) domain = 'design';
  else if (msg.includes('math') || msg.includes('calculate') || msg.includes('formula')) domain = 'mathematics';
  
  // Determine intent
  let intent = 'question';
  if (msg.includes('build') || msg.includes('create') || msg.includes('make')) intent = 'creation';
  else if (msg.includes('fix') || msg.includes('debug') || msg.includes('error')) intent = 'troubleshooting';
  else if (msg.includes('explain') || msg.includes('how') || msg.includes('why')) intent = 'explanation';
  
  const requiresCode = msg.includes('code') || msg.includes('function') || msg.includes('script');
  const isFollowUp = conversationHistory.length > 0 && 
    (msg.includes('also') || msg.includes('additionally') || msg.startsWith('and '));
  
  return { complexity, domain, intent, requiresCode, isFollowUp };
}

export async function generateAIResponse(
  userMessage: string, 
  conversationHistory: Array<{role: string, content: string}> = [],
  subscriptionTier: string = "free",
  selectedModel?: string
): Promise<string> {
  
  // Analyze user intent for smarter responses
  const userIntent = analyzeUserIntent(userMessage, conversationHistory);
  
  // Determine available models based on subscription tier
  let availableModels;
  if (subscriptionTier === "premium") {
    availableModels = AI_MODELS.PREMIUM;
  } else if (subscriptionTier === "pro") {
    availableModels = AI_MODELS.PRO;
  } else {
    availableModels = AI_MODELS.FREE;
  }

  // Smart model selection based on task complexity and domain
  if (!selectedModel || !availableModels[selectedModel]) {
    if (userIntent.complexity === 'advanced' && availableModels['claude-sonnet']) {
      selectedModel = 'claude-sonnet';
    } else if (userIntent.domain === 'programming' && availableModels['gpt-4o']) {
      selectedModel = 'gpt-4o';
    } else if (userIntent.domain === 'mathematics' && availableModels['gemini-pro']) {
      selectedModel = 'gemini-pro';
    } else {
      selectedModel = Object.keys(availableModels)[0];
    }
  }

  const modelConfig = availableModels[selectedModel];
  
  try {
    // Enhanced context preparation with relevance filtering
    const relevantMessages = conversationHistory.slice(-15).filter(msg => {
      // Keep messages that are contextually relevant
      if (userIntent.isFollowUp) return true;
      if (userIntent.domain === 'programming' && (msg.content.includes('code') || msg.content.includes('function'))) return true;
      return conversationHistory.indexOf(msg) >= conversationHistory.length - 5; // Always keep recent messages
    });
    
    switch (modelConfig.provider) {
      case 'gemini':
        return await generateGeminiResponse(userMessage, relevantMessages, modelConfig.model, userIntent);
      
      case 'openai':
        return await generateOpenAIResponse(userMessage, relevantMessages, modelConfig.model, userIntent);
      
      case 'anthropic':
        return await generateAnthropicResponse(userMessage, relevantMessages, modelConfig.model, userIntent);
      
      default:
        throw new Error(`Unsupported AI provider: ${modelConfig.provider}`);
    }
    
  } catch (error: any) {
    console.error(`AI API Error (${modelConfig.provider}):`, error);
    
    // Intelligent fallback to most suitable alternative model
    const fallbackModels = Object.keys(availableModels).filter(key => key !== selectedModel);
    if (fallbackModels.length > 0) {
      const fallbackModel = fallbackModels[0];
      console.log(`Falling back to model: ${fallbackModel}`);
      return generateAIResponse(userMessage, conversationHistory, subscriptionTier, fallbackModel);
    }
    
    throw new Error("AI service temporarily unavailable. Please try again in a moment.");
  }
}

async function generateGeminiResponse(
  userMessage: string, 
  context: Array<{role: string, content: string}>, 
  model: string, 
  userIntent: any
): Promise<string> {
  let contextPrompt = "";
  if (context.length > 0) {
    contextPrompt = "Previous conversation context:\n";
    context.forEach(msg => {
      contextPrompt += `${msg.role}: ${msg.content}\n`;
    });
    contextPrompt += "\n";
  }

  // Enhanced prompt with intelligence directives
  const intelligenceDirectives = `
INTELLIGENCE ENHANCEMENT:
- Current task complexity: ${userIntent.complexity}
- Domain focus: ${userIntent.domain}
- User intent: ${userIntent.intent}
- Requires code: ${userIntent.requiresCode ? 'yes' : 'no'}
- Follow-up question: ${userIntent.isFollowUp ? 'yes' : 'no'}

RESPONSE REQUIREMENTS:
- Provide deep, thoughtful analysis
- Include step-by-step reasoning when appropriate
- Offer multiple perspectives or solutions
- Add practical examples and best practices
- Suggest related concepts for exploration
- Maintain conversation continuity
`;

  const fullPrompt = `${SYSTEM_PROMPT}\n\n${intelligenceDirectives}\n\n${contextPrompt}User: ${userMessage}\n\nAssistant: I'll provide an intelligent, comprehensive response that demonstrates advanced reasoning and expertise.`;

  const response = await gemini.models.generateContent({
    model,
    contents: fullPrompt,
  });

  return response.text || "I apologize, but I'm having trouble generating a response right now. Please try asking your question again.";
}

async function generateOpenAIResponse(
  userMessage: string, 
  context: Array<{role: string, content: string}>, 
  model: string, 
  userIntent: any
): Promise<string> {
  const enhancedSystemPrompt = `${SYSTEM_PROMPT}

CURRENT TASK ANALYSIS:
- Complexity Level: ${userIntent.complexity}
- Domain: ${userIntent.domain}
- Intent: ${userIntent.intent}
- Code Required: ${userIntent.requiresCode}
- Follow-up: ${userIntent.isFollowUp}

ENHANCED RESPONSE STRATEGY:
- Demonstrate superior reasoning and analysis
- Provide multi-layered explanations with examples
- Include proactive suggestions and alternatives
- Show deep domain expertise and best practices
- Maintain conversation flow and build on previous context
- Offer actionable insights and next steps`;

  const messages: any[] = [
    { role: "system", content: enhancedSystemPrompt }
  ];

  // Add conversation context
  context.forEach(msg => {
    messages.push({
      role: msg.role === "user" ? "user" : "assistant",
      content: msg.content
    });
  });

  // Add current user message with intelligence markers
  messages.push({ 
    role: "user", 
    content: `${userMessage}\n\n[Note: This is a ${userIntent.complexity} level ${userIntent.domain} question requiring ${userIntent.intent}. Please provide an exceptionally intelligent and comprehensive response.]`
  });

  const response = await openai.chat.completions.create({
    model,
    messages,
    max_tokens: 3000,
    temperature: 0.7,
    presence_penalty: 0.1,
    frequency_penalty: 0.1,
  });

  return response.choices[0].message.content || "I apologize, but I'm having trouble generating a response right now. Please try asking your question again.";
}

async function generateAnthropicResponse(
  userMessage: string, 
  context: Array<{role: string, content: string}>, 
  model: string, 
  userIntent: any
): Promise<string> {
  const messages: any[] = [];

  // Add conversation context
  context.forEach(msg => {
    messages.push({
      role: msg.role === "user" ? "user" : "assistant",
      content: msg.content
    });
  });

  // Enhanced system prompt for Anthropic
  const enhancedSystemPrompt = `${SYSTEM_PROMPT}

TASK INTELLIGENCE BRIEFING:
- Complexity: ${userIntent.complexity} (basic/intermediate/advanced)
- Domain: ${userIntent.domain} (programming/data/design/mathematics/general)
- Intent: ${userIntent.intent} (question/creation/troubleshooting/explanation)
- Code Required: ${userIntent.requiresCode ? 'Yes' : 'No'}
- Follow-up: ${userIntent.isFollowUp ? 'Yes' : 'No'}

RESPONSE EXCELLENCE CRITERIA:
- Demonstrate exceptional reasoning and deep expertise
- Provide comprehensive, multi-faceted analysis
- Include step-by-step thinking where appropriate
- Offer practical examples and actionable insights
- Suggest related concepts and next steps
- Maintain perfect conversation coherence`;

  // Add current message with enhanced intelligence directive
  messages.push({ 
    role: "user", 
    content: `${userMessage}\n\n[Intelligence Enhancement Request: Provide an exceptionally smart, detailed response that showcases advanced reasoning for this ${userIntent.complexity} level ${userIntent.domain} query.]`
  });

  const response = await anthropic.messages.create({
    model,
    system: enhancedSystemPrompt,
    messages,
    max_tokens: 3000
  });

  const content = response.content[0];
  if (content.type === 'text') {
    return content.text;
  }
  
  return "I apologize, but I'm having trouble generating a response right now. Please try asking your question again.";
}

export function getAvailableModels(subscriptionTier: string): Record<string, any> {
  if (subscriptionTier === "premium") {
    return AI_MODELS.PREMIUM;
  } else if (subscriptionTier === "pro") {
    return AI_MODELS.PRO;
  } else {
    return AI_MODELS.FREE;
  }
}