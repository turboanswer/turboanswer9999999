import OpenAI from "openai";

// Initialize OpenAI client
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "your-api-key-here"
});

// Store assistant ID globally
let assistantId: string | null = null;

// Initialize or get existing assistant
export async function initializeAssistant(): Promise<string> {
  try {
    // Create a new assistant with advanced capabilities
    const assistant = await openai.beta.assistants.create({
      name: "Advanced Knowledge Assistant",
      instructions: `You are an exceptionally knowledgeable AI assistant with deep expertise across all fields. 
        You excel at providing detailed explanations, solving complex problems, analyzing data, and offering practical insights. 
        You have access to code interpretation capabilities and can help with programming, data analysis, and technical tasks.
        Always be thorough, accurate, and helpful while maintaining a conversational tone.`,
      model: "gpt-4-turbo-preview", // Using the most advanced model
      tools: [
        { type: "code_interpreter" }, // Enable code execution
        { type: "file_search" } // Enable document search
      ]
    });
    
    assistantId = assistant.id;
    console.log("Assistant initialized:", assistantId);
    return assistantId;
  } catch (error: any) {
    console.error("Failed to initialize assistant:", error);
    throw new Error(`Failed to initialize assistant: ${error.message}`);
  }
}

// Create a new thread for conversation
export async function createThread(): Promise<string> {
  try {
    const thread = await openai.beta.threads.create();
    return thread.id;
  } catch (error: any) {
    console.error("Failed to create thread:", error);
    throw new Error(`Failed to create thread: ${error.message}`);
  }
}

// Get or create assistant
export async function getAssistantId(): Promise<string> {
  if (!assistantId) {
    assistantId = await initializeAssistant();
  }
  return assistantId;
}

// Send message and get response
export async function sendMessageToAssistant(
  threadId: string, 
  message: string
): Promise<string> {
  try {
    // Ensure we have an assistant
    const asstId = await getAssistantId();
    
    // Add user message to thread
    await openai.beta.threads.messages.create(threadId, {
      role: "user",
      content: message
    });
    
    // Run the assistant
    const run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: asstId
    });
    
    // Poll for completion
    let runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
    let attempts = 0;
    const maxAttempts = 60; // 60 seconds timeout
    
    while (runStatus.status !== 'completed' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
      attempts++;
      
      if (runStatus.status === 'failed' || runStatus.status === 'cancelled' || runStatus.status === 'expired') {
        throw new Error(`Assistant run ${runStatus.status}: ${runStatus.last_error?.message || 'Unknown error'}`);
      }
    }
    
    if (attempts >= maxAttempts) {
      throw new Error('Assistant response timeout');
    }
    
    // Get the assistant's response
    const messages = await openai.beta.threads.messages.list(threadId);
    const assistantMessage = messages.data.find(msg => msg.role === 'assistant');
    
    if (!assistantMessage || !assistantMessage.content[0]) {
      throw new Error('No response from assistant');
    }
    
    // Extract text from the response
    const textContent = assistantMessage.content[0];
    if (textContent.type === 'text') {
      return textContent.text.value;
    }
    
    throw new Error('Unexpected response format from assistant');
  } catch (error: any) {
    console.error("Assistant API Error:", error);
    throw new Error(`Failed to get assistant response: ${error.message}`);
  }
}

// Get all messages in a thread
export async function getThreadMessages(threadId: string): Promise<Array<{role: string, content: string}>> {
  try {
    const messages = await openai.beta.threads.messages.list(threadId);
    
    return messages.data.reverse().map(msg => ({
      role: msg.role,
      content: msg.content[0].type === 'text' ? msg.content[0].text.value : ''
    }));
  } catch (error: any) {
    console.error("Failed to get thread messages:", error);
    throw new Error(`Failed to get thread messages: ${error.message}`);
  }
}