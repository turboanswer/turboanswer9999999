import { users, conversations, messages, auditLogs, type User, type InsertUser, type Conversation, type InsertConversation, type Message, type InsertMessage, type AuditLog, type InsertAuditLog } from "@shared/schema";
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
  
  // Employee management methods
  getAllUsers(): Promise<User[]>;
  banUser(userId: number, reason: string): Promise<User>;
  unbanUser(userId: number): Promise<User>;
  flagUser(userId: number, reason: string): Promise<User>;
  unflagUser(userId: number): Promise<User>;
  validateEmployeeCredentials(username: string, password: string): Promise<User | null>;
  
  // Suspension management methods
  suspendUser(userId: number, reason: string, employeeId: number, employeeUsername: string): Promise<User>;
  unsuspendUser(userId: number, employeeId: number, employeeUsername: string): Promise<User>;
  
  // Audit log methods
  createAuditLog(auditLog: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(limit?: number): Promise<AuditLog[]>;
  getAuditLogsByUser(userId: number): Promise<AuditLog[]>;
  getAuditLogsByEmployee(employeeId: number): Promise<AuditLog[]>;
  
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  getConversation(id: number): Promise<Conversation | undefined>;
  updateConversation(id: number, updates: Partial<Conversation>): Promise<Conversation | undefined>;
  getConversations(): Promise<Conversation[]>;
  
  createMessage(message: InsertMessage): Promise<Message>;
  getMessagesByConversation(conversationId: number): Promise<Message[]>;
  getMessages(): Promise<Message[]>;
  
  // Enhanced chat history tracking methods
  getAllConversationsWithMessages(): Promise<Array<{conversation: Conversation, messages: Message[]}>>;
  getUserConversationsWithMessages(userId: number): Promise<Array<{conversation: Conversation, messages: Message[]}>>;
  searchConversationsByContent(searchTerm: string): Promise<Array<{conversation: Conversation, messages: Message[], matches: number}>>;
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

  // Employee management methods implementation
  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(users.createdAt);
  }

  async banUser(userId: number, reason: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ 
        isBanned: true, 
        banReason: reason,
        isFlagged: false, // Remove flag when banned
        flagReason: null
      })
      .where(eq(users.id, userId))
      .returning();
    if (!user) throw new Error("User not found");

    // Create audit log entry for ban action
    await this.createAuditLog({
      employeeId: 1, // Demo employee ID
      employeeUsername: 'admin', // Demo employee username
      action: 'ban',
      targetUserId: userId,
      targetUsername: user.username,
      reason,
      details: `User banned for: ${reason}`
    });

    return user;
  }

  async unbanUser(userId: number): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ 
        isBanned: false, 
        banReason: null 
      })
      .where(eq(users.id, userId))
      .returning();
    if (!user) throw new Error("User not found");

    // Create audit log entry for unban action
    await this.createAuditLog({
      employeeId: 1, // Demo employee ID
      employeeUsername: 'admin', // Demo employee username
      action: 'unban',
      targetUserId: userId,
      targetUsername: user.username,
      details: `User unbanned by admin`
    });

    return user;
  }

  async flagUser(userId: number, reason: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ 
        isFlagged: true, 
        flagReason: reason 
      })
      .where(eq(users.id, userId))
      .returning();
    if (!user) throw new Error("User not found");

    // Create audit log entry for flag action
    await this.createAuditLog({
      employeeId: 1, // Demo employee ID
      employeeUsername: 'admin', // Demo employee username
      action: 'flag',
      targetUserId: userId,
      targetUsername: user.username,
      reason,
      details: `User flagged for: ${reason}`
    });

    return user;
  }

  async unflagUser(userId: number): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ 
        isFlagged: false, 
        flagReason: null 
      })
      .where(eq(users.id, userId))
      .returning();
    if (!user) throw new Error("User not found");

    // Create audit log entry for unflag action
    await this.createAuditLog({
      employeeId: 1, // Demo employee ID
      employeeUsername: 'admin', // Demo employee username
      action: 'unflag',
      targetUserId: userId,
      targetUsername: user.username,
      details: `User unflagged by admin`
    });

    return user;
  }

  async validateEmployeeCredentials(username: string, password: string): Promise<User | null> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    if (user && user.password === password && user.isEmployee) {
      return user;
    }
    return null;
  }

  // Suspension management methods implementation
  async suspendUser(userId: number, reason: string, employeeId: number, employeeUsername: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ 
        isSuspended: true, 
        suspensionReason: reason,
        suspendedAt: new Date(),
        suspendedBy: employeeUsername
      })
      .where(eq(users.id, userId))
      .returning();
    if (!user) throw new Error("User not found");

    // Create audit log entry
    await this.createAuditLog({
      employeeId,
      employeeUsername,
      action: 'suspend',
      targetUserId: userId,
      targetUsername: user.username,
      reason,
      details: `User suspended by ${employeeUsername}`
    });

    return user;
  }

  async unsuspendUser(userId: number, employeeId: number, employeeUsername: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ 
        isSuspended: false, 
        suspensionReason: null,
        suspendedAt: null,
        suspendedBy: null
      })
      .where(eq(users.id, userId))
      .returning();
    if (!user) throw new Error("User not found");

    // Create audit log entry
    await this.createAuditLog({
      employeeId,
      employeeUsername,
      action: 'unsuspend',
      targetUserId: userId,
      targetUsername: user.username,
      details: `User unsuspended by ${employeeUsername}`
    });

    return user;
  }

  // Audit log methods implementation
  async createAuditLog(insertAuditLog: InsertAuditLog): Promise<AuditLog> {
    const [auditLog] = await db
      .insert(auditLogs)
      .values(insertAuditLog)
      .returning();
    return auditLog;
  }

  async getAuditLogs(limit: number = 100): Promise<AuditLog[]> {
    return await db
      .select()
      .from(auditLogs)
      .orderBy(auditLogs.timestamp)
      .limit(limit);
  }

  async getAuditLogsByUser(userId: number): Promise<AuditLog[]> {
    return await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.targetUserId, userId))
      .orderBy(auditLogs.timestamp);
  }

  async getAuditLogsByEmployee(employeeId: number): Promise<AuditLog[]> {
    return await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.employeeId, employeeId))
      .orderBy(auditLogs.timestamp);
  }

  // Enhanced chat history tracking methods implementation
  async getAllConversationsWithMessages(): Promise<Array<{conversation: Conversation, messages: Message[]}>> {
    const allConversations = await db.select().from(conversations).orderBy(conversations.createdAt);
    const result = [];
    
    for (const conversation of allConversations) {
      const conversationMessages = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conversation.id))
        .orderBy(messages.timestamp);
      result.push({ conversation, messages: conversationMessages });
    }
    
    return result;
  }

  async getUserConversationsWithMessages(userId: number): Promise<Array<{conversation: Conversation, messages: Message[]}>> {
    // Note: In the current schema, conversations are not linked to users
    // This method returns all conversations for now, but in production you'd want user-specific conversations
    return await this.getAllConversationsWithMessages();
  }

  async searchConversationsByContent(searchTerm: string): Promise<Array<{conversation: Conversation, messages: Message[], matches: number}>> {
    const allConversations = await this.getAllConversationsWithMessages();
    const results = [];
    
    for (const { conversation, messages } of allConversations) {
      const matches = messages.filter(msg => 
        msg.content.toLowerCase().includes(searchTerm.toLowerCase())
      ).length;
      
      if (matches > 0) {
        results.push({ conversation, messages, matches });
      }
    }
    
    return results.sort((a, b) => b.matches - a.matches);
  }
}

export const storage = new DatabaseStorage();
