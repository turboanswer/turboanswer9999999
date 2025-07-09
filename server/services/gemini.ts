import { GoogleGenAI } from "@google/genai";

// DON'T DELETE THIS COMMENT
// Follow these instructions when using this blueprint:
// - Note that the newest Gemini model series is "gemini-2.5-flash" or gemini-2.5-pro"
//   - do not change this unless explicitly requested by the user

// This API key is from Gemini Developer API Key, not vertex AI API Key
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function generateAIResponse(userMessage: string, conversationHistory: Array<{role: string, content: string}> = []): Promise<string> {
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

    // System prompt for comprehensive AI assistant
    const systemPrompt = `You are a professional AI assistant with comprehensive knowledge across multiple disciplines. You specialize in:

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

SPECIAL CAPABILITIES:
- Time and date queries (respond with current information)
- Mathematical calculations
- Technical definitions and explanations
- Career guidance and interview preparation

Always provide accurate, helpful information while maintaining a professional tone. If you don't know something specific, acknowledge it and offer to help find the information or explain related concepts.`;

    const fullPrompt = `${systemPrompt}

${contextPrompt}User: ${userMessage}
Assistant: Please provide a helpful, accurate response.`;

    // Call Gemini API
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: fullPrompt,
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
