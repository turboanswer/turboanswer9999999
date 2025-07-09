import { GoogleGenAI } from "@google/genai";

// DON'T DELETE THIS COMMENT
// Follow these instructions when using this blueprint:
// - Note that the newest Gemini model series is "gemini-2.5-flash" or gemini-2.5-pro"
//   - do not change this unless explicitly requested by the user

// This API key is from Gemini Developer API Key, not vertex AI API Key
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

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

    // Enhanced system prompt for natural conversation and quick responses
    const systemPrompt = `You are Turbo Answer, an advanced AI assistant focused on helpful, direct responses.

RESPONSE GUIDELINES:
- For simple questions: Give short, clear answers
- For weather questions: Provide general weather information if you know it
- For technical questions: Be detailed but concise
- For conversation: Be natural and friendly
- For complex topics: Break down into clear points

COMMUNICATION STYLE:
- Use everyday language, not technical jargon
- Be conversational and natural
- Match the user's communication style
- Give direct answers without unnecessary explanations
- Keep responses focused and helpful

SPECIAL FOCUS:
- Weather queries: Provide helpful weather information using your knowledge
- Simple questions: Keep answers brief and to the point
- Conversational questions: Be warm and engaging`;

    const fullPrompt = `${systemPrompt}

${contextPrompt}User: ${userMessage}
Assistant: Please provide a helpful, accurate response.`;

    // Choose MAXIMUM POWER model based on subscription tier
    const model = subscriptionTier === "pro" ? "gemini-2.5-pro" : "gemini-2.5-flash";
    
    // Call Gemini API with optimized settings for speed
    const response = await ai.models.generateContent({
      model,
      contents: fullPrompt,
      config: {
        temperature: 0.7, // Balanced for natural responses
        maxOutputTokens: userMessage.length < 30 ? 100 : 200, // Longer for better conversations
        topP: 0.8,
        topK: 30
      }
    });

    const responseText = response.text || "I apologize, but I'm having trouble generating a response right now. Please try asking your question again.";
    
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
