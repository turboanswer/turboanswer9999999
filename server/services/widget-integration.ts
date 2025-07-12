// Widget Integration Service
// Easy integration for any business software

import { GoogleGenerativeAI } from "@google/generative-ai";
import { conversationalAI } from './conversational-ai';

export interface WidgetConfig {
  apiKey?: string;
  theme?: 'light' | 'dark';
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  primaryColor?: string;
  businessName?: string;
  welcomeMessage?: string;
  placeholder?: string;
}

export interface WidgetMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export class WidgetService {
  private conversations: Map<string, WidgetMessage[]> = new Map();
  
  // Generate unique widget session ID
  generateSessionId(): string {
    return `widget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // Get or create conversation
  getConversation(sessionId: string): WidgetMessage[] {
    if (!this.conversations.has(sessionId)) {
      this.conversations.set(sessionId, []);
    }
    return this.conversations.get(sessionId)!;
  }
  
  // Process widget message
  async processMessage(sessionId: string, message: string): Promise<string> {
    const conversation = this.getConversation(sessionId);
    
    // Add user message
    conversation.push({
      role: 'user',
      content: message,
      timestamp: new Date()
    });
    
    try {
      // Use conversational AI for widget responses (fast and friendly)
      const response = await conversationalAI.generateResponse(message, conversation);
      
      // Add assistant response
      conversation.push({
        role: 'assistant',
        content: response,
        timestamp: new Date()
      });
      
      // Keep conversation history limited to last 20 messages
      if (conversation.length > 20) {
        conversation.splice(0, conversation.length - 20);
      }
      
      return response;
    } catch (error) {
      console.error('Widget AI error:', error);
      
      // Fallback to simple Gemini response
      try {
        const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
        const model = gemini.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
        
        const result = await model.generateContent({
          contents: [{
            role: 'user',
            parts: [{ text: message }]
          }],
          generationConfig: {
            maxOutputTokens: 200, // Keep responses short
            temperature: 0.7,
          }
        });
        
        const response = result.response.text();
        
        conversation.push({
          role: 'assistant',
          content: response,
          timestamp: new Date()
        });
        
        return response;
      } catch (fallbackError) {
        return "I'm here to help! Please try rephrasing your question.";
      }
    }
  }
  
  // Clear old conversations (cleanup)
  cleanup(): void {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    for (const [sessionId, messages] of this.conversations.entries()) {
      const lastMessage = messages[messages.length - 1];
      if (!lastMessage || lastMessage.timestamp.getTime() < oneHourAgo) {
        this.conversations.delete(sessionId);
      }
    }
  }
}

export const widgetService = new WidgetService();

// Cleanup old conversations every 30 minutes
setInterval(() => {
  widgetService.cleanup();
}, 30 * 60 * 1000);