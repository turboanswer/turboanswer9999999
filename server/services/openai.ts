// Simple mock AI assistant that provides helpful responses
export async function generateAIResponse(userMessage: string, conversationHistory: Array<{role: string, content: string}> = []): Promise<string> {
  try {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simple response based on user input
    const message = userMessage.toLowerCase();
    
    if (message.includes('hello') || message.includes('hi')) {
      return "Hello! I'm your AI assistant. How can I help you today?";
    }
    
    if (message.includes('javascript') || message.includes('js')) {
      return "JavaScript is a versatile programming language! Here are some key concepts:\n\n• Variables: let, const, var\n• Functions: function declarations and arrow functions\n• Objects and arrays for data structures\n• Async/await for handling asynchronous operations\n• DOM manipulation for web development\n\nWhat specific JavaScript topic would you like to explore?";
    }
    
    if (message.includes('python')) {
      return "Python is a powerful and beginner-friendly programming language! Key features include:\n\n• Clean, readable syntax\n• Rich standard library\n• Excellent for data science, web development, and automation\n• Object-oriented and functional programming support\n• Large ecosystem of third-party packages\n\nWhat would you like to know about Python?";
    }
    
    if (message.includes('help') || message.includes('?')) {
      return "I'm here to help! I can assist with:\n\n• Programming questions (JavaScript, Python, etc.)\n• General knowledge and explanations\n• Problem-solving and analysis\n• Code examples and best practices\n\nWhat would you like to learn about?";
    }
    
    if (message.includes('code') || message.includes('programming')) {
      return "Programming is a creative problem-solving process! Here are some general tips:\n\n• Start with understanding the problem\n• Break it down into smaller steps\n• Write clean, readable code\n• Test your code frequently\n• Don't be afraid to refactor and improve\n\nWhat programming challenge are you working on?";
    }
    
    // Default response
    return `I understand you're asking about "${userMessage}". While I'd love to give you a detailed response, I'm currently a simplified assistant. I can help with basic programming questions, general topics, and provide guidance on common subjects. What specific area would you like to explore?`;
    
  } catch (error: any) {
    console.error("AI Response Error:", error);
    throw new Error(`Failed to generate AI response: ${error.message}`);
  }
}
