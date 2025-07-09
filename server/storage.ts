import { users, conversations, messages, type User, type InsertUser, type Conversation, type InsertConversation, type Message, type InsertMessage } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateStripeCustomerId(userId: number, stripeCustomerId: string): Promise<User>;
  updateUserStripeInfo(userId: number, stripeCustomerId: string, stripeSubscriptionId: string): Promise<User>;
  updateUserSubscription(userId: number, subscriptionStatus: string, subscriptionTier: string): Promise<User>;
  validateUserCredentials(username: string, password: string): Promise<User | null>;
  applyPromoCode(userId: number, promoCode: string): Promise<{ success: boolean; message: string; user?: User }>;
  
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  getConversation(id: number): Promise<Conversation | undefined>;
  updateConversation(id: number, updates: Partial<Conversation>): Promise<Conversation | undefined>;
  getConversations(): Promise<Conversation[]>;
  
  createMessage(message: InsertMessage): Promise<Message>;
  getMessagesByConversation(conversationId: number): Promise<Message[]>;
  getMessages(): Promise<Message[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    if (!email) return undefined;
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async validateUserCredentials(username: string, password: string): Promise<User | null> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    if (user && user.password === password) {
      return user;
    }
    return null;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        username: insertUser.username,
        password: insertUser.password,
        email: insertUser.email || null,
      })
      .returning();
    return user;
  }

  async createConversation(insertConversation: InsertConversation): Promise<Conversation> {
    const [conversation] = await db
      .insert(conversations)
      .values({
        title: insertConversation.title || "New Conversation",
      })
      .returning();
    return conversation;
  }

  async getConversation(id: number): Promise<Conversation | undefined> {
    const [conversation] = await db.select().from(conversations).where(eq(conversations.id, id));
    return conversation || undefined;
  }

  async updateConversation(id: number, updates: Partial<Conversation>): Promise<Conversation | undefined> {
    const [conversation] = await db
      .update(conversations)
      .set(updates)
      .where(eq(conversations.id, id))
      .returning();
    return conversation || undefined;
  }

  async getConversations(): Promise<Conversation[]> {
    return await db.select().from(conversations).orderBy(conversations.createdAt);
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db
      .insert(messages)
      .values({
        conversationId: insertMessage.conversationId,
        content: insertMessage.content,
        role: insertMessage.role,
      })
      .returning();
    return message;
  }

  async getMessagesByConversation(conversationId: number): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.timestamp);
  }

  async getMessages(): Promise<Message[]> {
    return await db.select().from(messages).orderBy(messages.timestamp);
  }

  async updateStripeCustomerId(userId: number, stripeCustomerId: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ stripeCustomerId })
      .where(eq(users.id, userId))
      .returning();
    if (!user) throw new Error("User not found");
    return user;
  }

  async updateUserStripeInfo(userId: number, stripeCustomerId: string, stripeSubscriptionId: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        stripeCustomerId,
        stripeSubscriptionId,
        subscriptionStatus: "active",
        subscriptionTier: "pro"
      })
      .where(eq(users.id, userId))
      .returning();
    if (!user) throw new Error("User not found");
    return user;
  }

  async updateUserSubscription(userId: number, subscriptionStatus: string, subscriptionTier: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ subscriptionStatus, subscriptionTier })
      .where(eq(users.id, userId))
      .returning();
    if (!user) throw new Error("User not found");
    return user;
  }

  async applyPromoCode(userId: number, promoCode: string): Promise<{ success: boolean; message: string; user?: User }> {
    // Define available promo codes
    const promoCodes = {
      'LIFETIME_FREE': {
        subscriptionStatus: 'lifetime',
        subscriptionTier: 'pro',
        message: 'Congratulations! You now have lifetime premium access!'
      },
      'PREMIUM_YEAR': {
        subscriptionStatus: 'active',
        subscriptionTier: 'pro', 
        message: 'You now have 1 year of premium access!'
      },
      'FOUNDER_ACCESS': {
        subscriptionStatus: 'lifetime',
        subscriptionTier: 'pro',
        message: 'Welcome, founder! You have lifetime premium access!'
      }
    };

    const promo = promoCodes[promoCode as keyof typeof promoCodes];
    
    if (!promo) {
      return { success: false, message: 'Invalid promo code' };
    }

    try {
      const [user] = await db
        .update(users)
        .set({
          subscriptionStatus: promo.subscriptionStatus,
          subscriptionTier: promo.subscriptionTier
        })
        .where(eq(users.id, userId))
        .returning();
      
      if (!user) {
        return { success: false, message: 'User not found' };
      }

      return { success: true, message: promo.message, user };
    } catch (error) {
      return { success: false, message: 'Failed to apply promo code' };
    }
  }
}

export const storage = new DatabaseStorage();
