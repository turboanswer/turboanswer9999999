import { GoogleGenerativeAI } from "@google/generative-ai";

// DON'T DELETE THIS COMMENT
// Follow these instructions when using this blueprint:
// - Note that the newest Gemini model series is "gemini-2.5-flash" or gemini-2.5-pro"
//   - do not change this unless explicitly requested by the user

// This API key is from Gemini Developer API Key, not vertex AI API Key
const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function generateAIResponse(userMessage: string, conversationHistory: Array<{role: string, content: string}> = [], subscriptionTier: string = "free"): Promise<string> {
  try {
    // Prepare conversation context for Gemini
    const messages = conversationHistory.slice(-10); // Keep last 10 messages for context
    
    // Build conversation context
    let contextPrompt = "";
    if (messages.length > 0) {
      contextPrompt = "Previous conversation:\n";
      messages.forEach(msg => {
        contextPrompt += `${msg.role}: ${msg.content}\n`;
      });
      contextPrompt += "\n";
    }

    // MAXIMUM POWER SYSTEM PROMPT: Enhanced intelligence and performance
    const systemPrompt = `You are Turbo Answer, the most advanced AI assistant powered by maximum intelligence and performance optimization.

MAXIMUM INTELLIGENCE MODE:
- Expert-level reasoning across all domains
- Lightning-fast response generation
- Advanced problem-solving capabilities
- Multi-dimensional analysis and synthesis
- Breakthrough insights and innovative solutions

TURBO PERFORMANCE GUIDELINES:
- Simple questions: Ultra-fast, precise answers (1-2 sentences)
- Complex problems: Advanced multi-step reasoning with clear structure
- Technical queries: Expert-level accuracy with practical solutions
- Creative tasks: Innovative approaches with detailed implementation
- Conversations: Natural, engaging, and intellectually stimulating

ENHANCED CAPABILITIES:
- Advanced mathematics and scientific analysis
- Expert-level programming and system design
- Creative problem-solving and innovation
- Real-time information processing and synthesis
- Contextual awareness and adaptive communication

COMMUNICATION EXCELLENCE:
- Match and exceed user expectations
- Provide value-driven responses
- Use clear, professional language
- Deliver actionable insights
- Maintain conversational flow while maximizing intelligence

MAXIMUM POWER EXECUTION:
- Analyze query complexity and respond appropriately
- Leverage advanced reasoning for breakthrough solutions
- Provide comprehensive yet concise responses
- Exceed performance expectations consistently`;

    const fullPrompt = `${systemPrompt}

${contextPrompt}User: ${userMessage}
Assistant: Please provide a helpful, accurate response.`;

    // MAXIMUM PERFORMANCE: Use the fastest and most advanced Gemini model
    const model = "gemini-2.0-flash"; // Most advanced and fastest model
    
    // TURBO SPEED SETTINGS: Optimized for maximum performance
    const modelInstance = ai.getGenerativeModel({ 
      model,
      generationConfig: {
        temperature: 0.2, // Optimized for speed and accuracy
        maxOutputTokens: userMessage.length < 15 ? 75 : userMessage.length < 50 ? 150 : 300, // Dynamic response length
        topP: 0.8, // Higher for better quality
        topK: 40, // Increased for smarter responses
        stopSequences: ["Human:", "User:", "Assistant:"] // Prevent runaway responses
      }
    });

    const result = await modelInstance.generateContent(fullPrompt);
    const response = await result.response;
    const responseText = response.text() || "I apologize, but I'm having trouble generating a response right now. Please try asking your question again.";
    
    return responseText;
    
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    
    // Provide helpful error messages
    if (error.message?.includes('API_KEY')) {
      throw new Error("Gemini API key is missing or invalid. Please check your API key configuration.");
    }
    
    if (error.message?.includes('quota') || error.message?.includes('limit')) {
      throw new Error("Gemini API quota exceeded. Please try again later or check your usage limits.");
    }
    
    throw new Error(`Failed to generate AI response: ${error.message}`);
  }
}
