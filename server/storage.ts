import { users, conversations, messages, auditLogs, adminNotifications, type User, type Conversation, type InsertConversation, type Message, type InsertMessage, type AuditLog, type InsertAuditLog, type AdminNotification, type InsertAdminNotification } from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  updateUserSubscription(userId: string, subscriptionStatus: string, subscriptionTier: string): Promise<User>;
  updatePaypalSubscription(userId: string, paypalSubscriptionId: string, tier: string): Promise<User>;
  cancelUserSubscription(userId: string): Promise<User>;

  getAllUsers(): Promise<User[]>;
  banUser(userId: string, reason: string): Promise<User>;
  unbanUser(userId: string): Promise<User>;
  flagUser(userId: string, reason: string): Promise<User>;
  unflagUser(userId: string): Promise<User>;

  suspendUser(userId: string, reason: string, employeeId: string, employeeUsername: string): Promise<User>;
  unsuspendUser(userId: string, employeeId: string, employeeUsername: string): Promise<User>;

  createAuditLog(auditLog: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(limit?: number): Promise<AuditLog[]>;
  getAuditLogsByUser(userId: string): Promise<AuditLog[]>;
  getAuditLogsByEmployee(employeeId: string): Promise<AuditLog[]>;

  createConversation(conversation: InsertConversation): Promise<Conversation>;
  getConversation(id: number): Promise<Conversation | undefined>;
  updateConversation(id: number, updates: Partial<Conversation>): Promise<Conversation | undefined>;
  getConversations(): Promise<Conversation[]>;
  getConversationsByUser(userId: string): Promise<Conversation[]>;

  createMessage(message: InsertMessage): Promise<Message>;
  getMessagesByConversation(conversationId: number): Promise<Message[]>;
  getMessages(): Promise<Message[]>;

  getAllConversationsWithMessages(): Promise<Array<{conversation: Conversation, messages: Message[]}>>;
  searchConversationsByContent(searchTerm: string): Promise<Array<{conversation: Conversation, messages: Message[], matches: number}>>;

  createAdminNotification(notification: InsertAdminNotification): Promise<AdminNotification>;
  getAdminNotifications(limit?: number): Promise<AdminNotification[]>;
  getUnreadNotificationCount(): Promise<number>;
  markNotificationRead(id: number): Promise<AdminNotification | undefined>;
  markAllNotificationsRead(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async createConversation(insertConversation: InsertConversation): Promise<Conversation> {
    const [conversation] = await db
      .insert(conversations)
      .values({
        title: insertConversation.title || "New Conversation",
        userId: insertConversation.userId || null,
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

  async getConversationsByUser(userId: string): Promise<Conversation[]> {
    return await db.select().from(conversations).where(eq(conversations.userId, userId)).orderBy(conversations.createdAt);
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

  async updateUserSubscription(userId: string, subscriptionStatus: string, subscriptionTier: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ subscriptionStatus, subscriptionTier })
      .where(eq(users.id, userId))
      .returning();
    if (!user) throw new Error("User not found");
    return user;
  }

  async updatePaypalSubscription(userId: string, paypalSubscriptionId: string, tier: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        paypalSubscriptionId,
        subscriptionStatus: "active",
        subscriptionTier: tier,
        subscriptionStartDate: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    if (!user) throw new Error("User not found");
    return user;
  }

  async cancelUserSubscription(userId: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        subscriptionStatus: "cancelled",
        subscriptionTier: "free",
        paypalSubscriptionId: null,
        subscriptionStartDate: null,
      })
      .where(eq(users.id, userId))
      .returning();
    if (!user) throw new Error("User not found");
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(users.createdAt);
  }

  async banUser(userId: string, reason: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        isBanned: true,
        banReason: reason,
        isFlagged: false,
        flagReason: null
      })
      .where(eq(users.id, userId))
      .returning();
    if (!user) throw new Error("User not found");
    return user;
  }

  async unbanUser(userId: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        isBanned: false,
        banReason: null
      })
      .where(eq(users.id, userId))
      .returning();
    if (!user) throw new Error("User not found");
    return user;
  }

  async flagUser(userId: string, reason: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        isFlagged: true,
        flagReason: reason
      })
      .where(eq(users.id, userId))
      .returning();
    if (!user) throw new Error("User not found");
    return user;
  }

  async unflagUser(userId: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        isFlagged: false,
        flagReason: null
      })
      .where(eq(users.id, userId))
      .returning();
    if (!user) throw new Error("User not found");
    return user;
  }

  async suspendUser(userId: string, reason: string, employeeId: string, employeeUsername: string): Promise<User> {
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

    await this.createAuditLog({
      employeeId,
      employeeUsername,
      action: 'suspend',
      targetUserId: userId,
      targetUsername: user.firstName || user.email || userId,
      reason,
      details: `User suspended by ${employeeUsername}`
    });

    return user;
  }

  async unsuspendUser(userId: string, employeeId: string, employeeUsername: string): Promise<User> {
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

    await this.createAuditLog({
      employeeId,
      employeeUsername,
      action: 'unsuspend',
      targetUserId: userId,
      targetUsername: user.firstName || user.email || userId,
      details: `User unsuspended by ${employeeUsername}`
    });

    return user;
  }

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

  async getAuditLogsByUser(userId: string): Promise<AuditLog[]> {
    return await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.targetUserId, userId))
      .orderBy(auditLogs.timestamp);
  }

  async getAuditLogsByEmployee(employeeId: string): Promise<AuditLog[]> {
    return await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.employeeId, employeeId))
      .orderBy(auditLogs.timestamp);
  }

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

  async createAdminNotification(notification: InsertAdminNotification): Promise<AdminNotification> {
    const [result] = await db
      .insert(adminNotifications)
      .values(notification)
      .returning();
    return result;
  }

  async getAdminNotifications(limit: number = 50): Promise<AdminNotification[]> {
    return await db
      .select()
      .from(adminNotifications)
      .orderBy(desc(adminNotifications.createdAt))
      .limit(limit);
  }

  async getUnreadNotificationCount(): Promise<number> {
    const unread = await db
      .select()
      .from(adminNotifications)
      .where(eq(adminNotifications.isRead, "false"));
    return unread.length;
  }

  async markNotificationRead(id: number): Promise<AdminNotification | undefined> {
    const [result] = await db
      .update(adminNotifications)
      .set({ isRead: "true" })
      .where(eq(adminNotifications.id, id))
      .returning();
    return result || undefined;
  }

  async markAllNotificationsRead(): Promise<void> {
    await db
      .update(adminNotifications)
      .set({ isRead: "true" })
      .where(eq(adminNotifications.isRead, "false"));
  }
}

export const storage = new DatabaseStorage();
