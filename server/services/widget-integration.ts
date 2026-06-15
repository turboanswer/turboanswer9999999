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

const MAX_SESSIONS = 10000;
const SESSION_TTL = 60 * 60 * 1000;
const MAX_MESSAGES_PER_SESSION = 20;

export class WidgetService {
  private conversations: Map<string, WidgetMessage[]> = new Map();
  
  generateSessionId(): string {
    return `widget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  getConversation(sessionId: string): WidgetMessage[] {
    if (!this.conversations.has(sessionId)) {
      if (this.conversations.size >= MAX_SESSIONS) {
        this.evictOldest();
      }
      this.conversations.set(sessionId, []);
    }
    return this.conversations.get(sessionId)!;
  }

  private evictOldest(): void {
    const now = Date.now();
    const entries = Array.from(this.conversations.entries());
    for (const [id, msgs] of entries) {
      const last = msgs[msgs.length - 1];
      if (!last || now - last.timestamp.getTime() > SESSION_TTL) {
        this.conversations.delete(id);
      }
      if (this.conversations.size < MAX_SESSIONS * 0.8) break;
    }
    if (this.conversations.size >= MAX_SESSIONS) {
      const firstKey = Array.from(this.conversations.keys())[0];
      if (firstKey) this.conversations.delete(firstKey);
    }
  }
  
  async processMessage(sessionId: string, message: string): Promise<string> {
    const conversation = this.getConversation(sessionId);
    
    conversation.push({
      role: 'user',
      content: message,
      timestamp: new Date()
    });
    
    try {
      const response = await conversationalAI.generateConversationalResponse(message, conversation);
      
      conversation.push({
        role: 'assistant',
        content: response,
        timestamp: new Date()
      });
      
      if (conversation.length > MAX_MESSAGES_PER_SESSION) {
        conversation.splice(0, conversation.length - MAX_MESSAGES_PER_SESSION);
      }
      
      return response;
    } catch (error) {
      console.error('Widget AI error:', error);
      return "I'm here to help! Please try rephrasing your question.";
    }
  }
  
  cleanup(): void {
    const cutoff = Date.now() - SESSION_TTL;
    const entries = Array.from(this.conversations.entries());
    for (const [sessionId, messages] of entries) {
      const lastMessage = messages[messages.length - 1];
      if (!lastMessage || lastMessage.timestamp.getTime() < cutoff) {
        this.conversations.delete(sessionId);
      }
    }
  }

  getStats(): { activeSessions: number; totalMessages: number } {
    let totalMessages = 0;
    const values = Array.from(this.conversations.values());
    for (const msgs of values) {
      totalMessages += msgs.length;
    }
    return { activeSessions: this.conversations.size, totalMessages };
  }
}

export const widgetService = new WidgetService();

setInterval(() => {
  widgetService.cleanup();
}, 15 * 60 * 1000);
