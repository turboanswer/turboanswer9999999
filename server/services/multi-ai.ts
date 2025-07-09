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

// System prompt for all models
const SYSTEM_PROMPT = `You are Turbo Answer, a professional AI assistant with comprehensive knowledge across multiple disciplines. You specialize in:

TECHNICAL EXPERTISE:
- Programming languages (JavaScript, Python, TypeScript, etc.)
- Web development (React, Node.js, databases, APIs)
- Software engineering (algorithms, system design, debugging)
- DevOps and deployment (CI/CD, cloud platforms, containerization)

GENERAL KNOWLEDGE:
- Science (physics, chemistry, biology, mathematics)
- History and geography
- Literature and philosophy
- Health and wellness information
- Current events and practical topics

COMMUNICATION STYLE:
- Provide clear, detailed explanations
- Use professional but accessible language
- Include practical examples when helpful
- Structure responses with bullet points and sections
- Ask clarifying questions when needed

Always provide accurate, helpful information while maintaining a professional tone.`;

export async function generateAIResponse(
  userMessage: string, 
  conversationHistory: Array<{role: string, content: string}> = [],
  subscriptionTier: string = "free",
  selectedModel?: string
): Promise<string> {
  
  // Determine available models based on subscription tier
  let availableModels;
  if (subscriptionTier === "premium") {
    availableModels = AI_MODELS.PREMIUM;
  } else if (subscriptionTier === "pro") {
    availableModels = AI_MODELS.PRO;
  } else {
    availableModels = AI_MODELS.FREE;
  }

  // Default model selection if not specified
  if (!selectedModel || !availableModels[selectedModel]) {
    selectedModel = Object.keys(availableModels)[0];
  }

  const modelConfig = availableModels[selectedModel];
  
  try {
    // Prepare conversation context
    const messages = conversationHistory.slice(-10); // Keep last 10 messages for context
    
    switch (modelConfig.provider) {
      case 'gemini':
        return await generateGeminiResponse(userMessage, messages, modelConfig.model);
      
      case 'openai':
        return await generateOpenAIResponse(userMessage, messages, modelConfig.model);
      
      case 'anthropic':
        return await generateAnthropicResponse(userMessage, messages, modelConfig.model);
      
      default:
        throw new Error(`Unsupported AI provider: ${modelConfig.provider}`);
    }
    
  } catch (error: any) {
    console.error(`AI API Error (${modelConfig.provider}):`, error);
    
    // Fallback to alternative model in same tier
    const fallbackModels = Object.keys(availableModels).filter(key => key !== selectedModel);
    if (fallbackModels.length > 0) {
      const fallbackModel = fallbackModels[0];
      console.log(`Falling back to model: ${fallbackModel}`);
      return generateAIResponse(userMessage, conversationHistory, subscriptionTier, fallbackModel);
    }
    
    throw new Error("AI service temporarily unavailable. Please try again in a moment.");
  }
}

async function generateGeminiResponse(userMessage: string, context: Array<{role: string, content: string}>, model: string): Promise<string> {
  let contextPrompt = "";
  if (context.length > 0) {
    contextPrompt = "Previous conversation:\n";
    context.forEach(msg => {
      contextPrompt += `${msg.role}: ${msg.content}\n`;
    });
    contextPrompt += "\n";
  }

  const fullPrompt = `${SYSTEM_PROMPT}\n\n${contextPrompt}User: ${userMessage}\nAssistant: Please provide a helpful, accurate response.`;

  const response = await gemini.models.generateContent({
    model,
    contents: fullPrompt,
  });

  return response.text || "I apologize, but I'm having trouble generating a response right now. Please try asking your question again.";
}

async function generateOpenAIResponse(userMessage: string, context: Array<{role: string, content: string}>, model: string): Promise<string> {
  const messages: any[] = [
    { role: "system", content: SYSTEM_PROMPT }
  ];

  // Add conversation context
  context.forEach(msg => {
    messages.push({
      role: msg.role === "user" ? "user" : "assistant",
      content: msg.content
    });
  });

  // Add current message
  messages.push({ role: "user", content: userMessage });

  const response = await openai.chat.completions.create({
    model,
    messages,
    max_tokens: 1000,
    temperature: 0.7
  });

  return response.choices[0].message.content || "I apologize, but I'm having trouble generating a response right now. Please try asking your question again.";
}

async function generateAnthropicResponse(userMessage: string, context: Array<{role: string, content: string}>, model: string): Promise<string> {
  const messages: any[] = [];

  // Add conversation context
  context.forEach(msg => {
    messages.push({
      role: msg.role === "user" ? "user" : "assistant",
      content: msg.content
    });
  });

  // Add current message
  messages.push({ role: "user", content: userMessage });

  const response = await anthropic.messages.create({
    model,
    system: SYSTEM_PROMPT,
    messages,
    max_tokens: 1000
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