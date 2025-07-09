// Custom AI Integration
// Configure this file to use your own AI service

interface CustomAIConfig {
  endpoint: string;
  apiKey: string;
  model?: string;
  headers?: Record<string, string>;
}

// Configure your AI service here
const AI_CONFIG: CustomAIConfig = {
  endpoint: process.env.CUSTOM_AI_ENDPOINT || "https://api.openai.com/v1/chat/completions",
  apiKey: process.env.CUSTOM_AI_API_KEY || process.env.OPENAI_API_KEY || "",
  model: process.env.CUSTOM_AI_MODEL || "gpt-4o-mini",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${process.env.CUSTOM_AI_API_KEY || process.env.OPENAI_API_KEY || ""}`
  }
};

// Simple system prompt for fast responses
const SYSTEM_PROMPT = `You are Turbo Answer, a helpful AI assistant. Provide clear, direct answers without complex explanations. Keep responses brief and to the point. Use simple, everyday language.`;

export async function generateCustomAIResponse(
  userMessage: string, 
  conversationHistory: Array<{role: string, content: string}> = []
): Promise<string> {
  try {
    // Keep only last 3 messages for speed
    const recentHistory = conversationHistory.slice(-3);
    
    // Prepare messages
    const messages = [
      { role: "system", content: SYSTEM_PROMPT }
    ];
    
    // Add conversation history
    recentHistory.forEach(msg => {
      messages.push({
        role: msg.role === "user" ? "user" : "assistant",
        content: msg.content
      });
    });
    
    // Add current user message
    messages.push({
      role: "user",
      content: userMessage
    });
    
    // Call your AI service
    const response = await fetch(AI_CONFIG.endpoint, {
      method: "POST",
      headers: AI_CONFIG.headers,
      body: JSON.stringify({
        model: AI_CONFIG.model,
        messages: messages,
        max_tokens: 500,
        temperature: 0.3
      })
    });
    
    if (!response.ok) {
      throw new Error(`AI service error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Handle OpenAI-style response format
    if (data.choices && data.choices[0]?.message?.content) {
      return data.choices[0].message.content;
    }
    
    // Handle other response formats
    if (data.response) {
      return data.response;
    }
    
    if (data.content) {
      return data.content;
    }
    
    throw new Error("Unexpected AI response format");
    
  } catch (error) {
    console.error("Custom AI Error:", error);
    return "I'm having trouble connecting to the AI service right now. Please check your configuration and try again.";
  }
}

// Alternative: Direct API integration without external dependencies
export async function generateSimpleAIResponse(
  userMessage: string, 
  conversationHistory: Array<{role: string, content: string}> = []
): Promise<string> {
  // If you have a simple HTTP API that takes text and returns text
  const simpleEndpoint = process.env.SIMPLE_AI_ENDPOINT;
  const simpleApiKey = process.env.SIMPLE_AI_API_KEY;
  
  if (!simpleEndpoint || !simpleApiKey) {
    return generateCustomAIResponse(userMessage, conversationHistory);
  }
  
  try {
    const response = await fetch(simpleEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${simpleApiKey}`
      },
      body: JSON.stringify({
        prompt: userMessage,
        max_length: 500
      })
    });
    
    if (!response.ok) {
      throw new Error(`Simple AI service error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.text || data.response || "No response from AI service";
    
  } catch (error) {
    console.error("Simple AI Error:", error);
    return generateCustomAIResponse(userMessage, conversationHistory);
  }
}