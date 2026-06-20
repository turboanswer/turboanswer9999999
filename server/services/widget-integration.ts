import { conversationalAI } from './conversational-ai';
import { redisSet, redisGet, redisDel } from '../redis';

const REDIS_WIDGET_PREFIX = "widget:conv:";
const REDIS_WIDGET_TTL = 3600;

function syncWidgetToRedis(sessionId: string, messages: WidgetMessage[]): void {
  redisSet(
    `${REDIS_WIDGET_PREFIX}${sessionId}`,
    JSON.stringify(
      messages.map(m => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp.toISOString(),
      }))
    ),
    REDIS_WIDGET_TTL
  ).catch(() => { /* best-effort */ });
}

async function hydrateWidgetFromRedis(sessionId: string, intoMap: Map<string, WidgetMessage[]>): Promise<void> {
  if (intoMap.has(sessionId)) return;
  const raw = await redisGet(`${REDIS_WIDGET_PREFIX}${sessionId}`);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    const messages: WidgetMessage[] = (parsed || []).map((m: any) => ({
      role: m.role,
      content: m.content,
      timestamp: new Date(m.timestamp),
    }));
    intoMap.set(sessionId, messages);
  } catch {
    /* best-effort */
  }
}

function unsyncWidgetFromRedis(sessionId: string): void {
  redisDel(`${REDIS_WIDGET_PREFIX}${sessionId}`).catch(() => { /* best-effort */ });
}

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
  
  async getConversation(sessionId: string): Promise<WidgetMessage[]> {
    if (!this.conversations.has(sessionId)) {
      await hydrateWidgetFromRedis(sessionId, this.conversations);
    }
    if (!this.conversations.has(sessionId)) {
      if (this.conversations.size >= MAX_SESSIONS) {
        this.evictOldest();
      }
      this.conversations.set(sessionId, []);
      unsyncWidgetFromRedis(sessionId);
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
        unsyncWidgetFromRedis(id);
      }
      if (this.conversations.size < MAX_SESSIONS * 0.8) break;
    }
    if (this.conversations.size >= MAX_SESSIONS) {
      const firstKey = Array.from(this.conversations.keys())[0];
      if (firstKey) {
        this.conversations.delete(firstKey);
        unsyncWidgetFromRedis(firstKey);
      }
    }
  }
  
  async processMessage(sessionId: string, message: string): Promise<string> {
    const conversation = await this.getConversation(sessionId);

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

      syncWidgetToRedis(sessionId, conversation);
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
        unsyncWidgetFromRedis(sessionId);
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
