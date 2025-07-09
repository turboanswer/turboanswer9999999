import OpenAI from "openai";

// Using GPT-4.1, the latest flagship model with 21.4% improvement over GPT-4o on coding benchmarks
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "your-api-key-here"
});

export async function generateAIResponse(userMessage: string, conversationHistory: Array<{role: string, content: string}> = []): Promise<string> {
  try {
    const messages = [
      {
        role: "system",
        content: "You are an exceptionally knowledgeable AI assistant powered by GPT-4.1. You have deep expertise across science, technology, history, literature, mathematics, philosophy, current events, and countless other fields. You excel at breaking down complex topics into clear explanations, providing detailed analysis, solving problems step-by-step, and offering practical insights. You're thorough yet conversational, always aiming to educate and enlighten while being genuinely helpful."
      },
      ...conversationHistory,
      {
        role: "user",
        content: userMessage
      }
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-4.1", // GPT-4.1 is the latest flagship model with improved coding performance
      messages: messages as any,
      max_tokens: 1500,
      temperature: 0.7,
    });

    return response.choices[0].message.content || "I apologize, but I couldn't generate a response. Please try again.";
  } catch (error: any) {
    console.error("OpenAI API Error:", error);
    throw new Error(`Failed to generate AI response: ${error.message}`);
  }
}
