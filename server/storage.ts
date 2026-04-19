import { users, conversations, messages, auditLogs, adminNotifications, enterpriseCodes, enterpriseCodeRedemptions, crisisConversations, crisisMessages, promoCodes, codeProjects, betaApplications, betaFeedback, deepThinkUsage, type User, type Conversation, type InsertConversation, type Message, type InsertMessage, type AuditLog, type InsertAuditLog, type AdminNotification, type InsertAdminNotification, type EnterpriseCode, type EnterpriseCodeRedemption, type CrisisConversation, type InsertCrisisConversation, type CrisisMessage, type InsertCrisisMessage, type PromoCode, type InsertPromoCode } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";

export async function getDeepThinkUsage(userId: string, date: string): Promise<number> {
  const [row] = await db
    .select({ total: sql<number>`COALESCE(SUM(${deepThinkUsage.count}), 0)::int` })
    .from(deepThinkUsage)
    .where(and(eq(deepThinkUsage.userId, userId), eq(deepThinkUsage.date, date)));
  return Number(row?.total || 0);
}

export async function incrementDeepThinkUsage(userId: string, date: string): Promise<number> {
  const [row] = await db
    .insert(deepThinkUsage)
    .values({ userId, date, count: 1 })
    .onConflictDoUpdate({
      target: [deepThinkUsage.userId, deepThinkUsage.date],
      set: { count: sql`${deepThinkUsage.count} + 1` },
    })
    .returning();
  return row.count;
}

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  updateUserSubscription(userId: string, subscriptionStatus: string, subscriptionTier: string): Promise<User>;
  updatePaypalSubscription(userId: string, paypalSubscriptionId: string, tier: string): Promise<User>;
  storePendingSubscription(userId: string, paypalSubscriptionId: string): Promise<User>;
  cancelUserSubscription(userId: string): Promise<User>;
  updateCodeStudioAddon(userId: string, addon: boolean, subId: string | null): Promise<User>;
  updateCodeStudioCredits(userId: string, credits: number, resetAt?: Date): Promise<User>;
  updateWeeklyDigest(userId: string, enabled: boolean): Promise<User>;

  getAllUsers(): Promise<User[]>;
  banUser(userId: string, reason: string, durationMonths?: number): Promise<User>;
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

  createEnterpriseCode(code: string, ownerUserId: string, ownerEmail: string | null): Promise<EnterpriseCode>;
  getEnterpriseCodeByCode(code: string): Promise<EnterpriseCode | undefined>;
  getEnterpriseCodeByOwner(ownerUserId: string): Promise<EnterpriseCode | undefined>;
  redeemEnterpriseCode(codeId: number, userId: string, userEmail: string | null): Promise<EnterpriseCodeRedemption>;
  getEnterpriseCodeRedemptions(codeId: number): Promise<EnterpriseCodeRedemption[]>;
  incrementEnterpriseCodeUses(codeId: number): Promise<void>;
  decrementEnterpriseCodeUses(codeId: number): Promise<void>;
  removeEnterpriseCodeRedemption(codeId: number, userId: string): Promise<void>;
  revokeAllEnterpriseCodeAccess(ownerUserId: string): Promise<string[]>;
  deactivateEnterpriseCode(ownerUserId: string): Promise<void>;
  reactivateEnterpriseCode(ownerUserId: string): Promise<void>;
  getRedemptionByUserId(userId: string): Promise<EnterpriseCodeRedemption | undefined>;
  adminSetSubscription(userId: string, tier: string, status: string): Promise<User>;
  setComplimentaryExpiration(userId: string, expiresAt: Date | null): Promise<void>;
  deleteConversation(conversationId: number, userId: string, privileged?: boolean): Promise<void>;
  deleteAllConversations(userId: string): Promise<void>;
  deleteUserAccount(userId: string): Promise<void>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserCount(): Promise<number>;
  getActiveSubscriptionCount(): Promise<{ pro: number; research: number; enterprise: number }>;

  createCrisisConversation(userId: string): Promise<CrisisConversation>;
  getCrisisConversationsByUser(userId: string): Promise<CrisisConversation[]>;
  getCrisisConversation(id: number, userId: string): Promise<CrisisConversation | undefined>;
  createCrisisMessage(message: InsertCrisisMessage): Promise<CrisisMessage>;
  getCrisisMessagesByConversation(conversationId: number): Promise<CrisisMessage[]>;
  deleteCrisisConversation(id: number, userId: string): Promise<void>;
  deleteAllCrisisData(userId: string): Promise<void>;

  // Promo Codes
  getAllPromoCodes(): Promise<PromoCode[]>;
  getPromoCode(code: string): Promise<PromoCode | undefined>;
  getPromoCodeById(id: number): Promise<PromoCode | undefined>;
  createPromoCode(data: InsertPromoCode): Promise<PromoCode>;
  updatePromoCode(id: number, data: Partial<InsertPromoCode>): Promise<PromoCode>;
  deletePromoCode(id: number): Promise<void>;
  incrementPromoCodeUsage(id: number): Promise<void>;
  seedOwnerPromoCode(): Promise<void>;
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

  async storePendingSubscription(userId: string, paypalSubscriptionId: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ paypalSubscriptionId })
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

  async updateCodeStudioAddon(userId: string, addon: boolean, subId: string | null): Promise<User> {
    const updates: any = { codeStudioAddon: addon, codeStudioAddonSubId: subId };
    if (addon) {
      // 7-day trial: grant 100 cents ($1.00), next reset in 7 days → then 1500 cents/month
      updates.codeStudioCredits = 100;
      updates.codeStudioCreditsResetAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    } else {
      updates.codeStudioCredits = 0;
      updates.codeStudioCreditsResetAt = null;
    }
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, userId))
      .returning();
    if (!user) throw new Error("User not found");
    return user;
  }

  async updateCodeStudioCredits(userId: string, credits: number, resetAt?: Date): Promise<User> {
    const updates: any = { codeStudioCredits: credits };
    if (resetAt !== undefined) updates.codeStudioCreditsResetAt = resetAt;
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, userId))
      .returning();
    if (!user) throw new Error("User not found");
    return user;
  }

  async updateWeeklyDigest(userId: string, enabled: boolean): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ weeklyDigestEnabled: enabled })
      .where(eq(users.id, userId))
      .returning();
    if (!user) throw new Error("User not found");
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(users.createdAt);
  }

  async banUser(userId: string, reason: string, durationMonths?: number): Promise<User> {
    let banExpiresAt: Date | null = null;
    let banDuration: string = "permanent";
    
    if (durationMonths && durationMonths > 0) {
      banExpiresAt = new Date();
      banExpiresAt.setMonth(banExpiresAt.getMonth() + durationMonths);
      banDuration = `${durationMonths} month${durationMonths > 1 ? 's' : ''}`;
    }
    
    const [user] = await db
      .update(users)
      .set({
        isBanned: true,
        banReason: reason,
        banExpiresAt,
        banDuration,
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
        banReason: null,
        banExpiresAt: null,
        banDuration: null
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

  async createEnterpriseCode(code: string, ownerUserId: string, ownerEmail: string | null): Promise<EnterpriseCode> {
    const [result] = await db
      .insert(enterpriseCodes)
      .values({ code, ownerUserId, ownerEmail, maxUses: 10, currentUses: 0 })
      .returning();
    return result;
  }

  async getEnterpriseCodeByCode(code: string): Promise<EnterpriseCode | undefined> {
    const [result] = await db.select().from(enterpriseCodes).where(eq(enterpriseCodes.code, code));
    return result || undefined;
  }

  async getEnterpriseCodeByOwner(ownerUserId: string): Promise<EnterpriseCode | undefined> {
    const [result] = await db.select().from(enterpriseCodes).where(eq(enterpriseCodes.ownerUserId, ownerUserId));
    return result || undefined;
  }

  async redeemEnterpriseCode(codeId: number, userId: string, userEmail: string | null): Promise<EnterpriseCodeRedemption> {
    const [result] = await db
      .insert(enterpriseCodeRedemptions)
      .values({ codeId, userId, userEmail })
      .returning();
    return result;
  }

  async getEnterpriseCodeRedemptions(codeId: number): Promise<EnterpriseCodeRedemption[]> {
    return await db.select().from(enterpriseCodeRedemptions).where(eq(enterpriseCodeRedemptions.codeId, codeId));
  }

  async incrementEnterpriseCodeUses(codeId: number): Promise<void> {
    await db
      .update(enterpriseCodes)
      .set({ currentUses: sql`${enterpriseCodes.currentUses} + 1` })
      .where(eq(enterpriseCodes.id, codeId));
  }

  async decrementEnterpriseCodeUses(codeId: number): Promise<void> {
    await db
      .update(enterpriseCodes)
      .set({ currentUses: sql`GREATEST(${enterpriseCodes.currentUses} - 1, 0)` })
      .where(eq(enterpriseCodes.id, codeId));
  }

  async removeEnterpriseCodeRedemption(codeId: number, userId: string): Promise<void> {
    await db.delete(enterpriseCodeRedemptions)
      .where(
        sql`${enterpriseCodeRedemptions.codeId} = ${codeId} AND ${enterpriseCodeRedemptions.userId} = ${userId}`
      );
  }

  async revokeAllEnterpriseCodeAccess(ownerUserId: string): Promise<string[]> {
    const code = await this.getEnterpriseCodeByOwner(ownerUserId);
    if (!code) return [];
    const redemptions = await this.getEnterpriseCodeRedemptions(code.id);
    const affectedUserIds: string[] = [];
    for (const r of redemptions) {
      affectedUserIds.push(r.userId);
      await db.update(users)
        .set({ subscriptionStatus: 'free', subscriptionTier: 'free' })
        .where(eq(users.id, r.userId));
    }
    await db.delete(enterpriseCodeRedemptions).where(eq(enterpriseCodeRedemptions.codeId, code.id));
    await db.update(enterpriseCodes)
      .set({ currentUses: 0 })
      .where(eq(enterpriseCodes.id, code.id));
    return affectedUserIds;
  }

  async deactivateEnterpriseCode(ownerUserId: string): Promise<void> {
    await db.update(enterpriseCodes)
      .set({ isActive: false })
      .where(eq(enterpriseCodes.ownerUserId, ownerUserId));
  }

  async reactivateEnterpriseCode(ownerUserId: string): Promise<void> {
    await db.update(enterpriseCodes)
      .set({ isActive: true })
      .where(eq(enterpriseCodes.ownerUserId, ownerUserId));
  }

  async adminSetSubscription(userId: string, tier: string, status: string): Promise<User> {
    const existingUser = await this.getUser(userId);
    if (!existingUser) throw new Error("User not found");

    const updateData: any = {
      subscriptionTier: tier,
      subscriptionStatus: status === 'free' ? 'cancelled' : status,
    };
    if (tier === 'free') {
      updateData.paypalSubscriptionId = null;
      updateData.subscriptionStartDate = null;
      updateData.subscriptionStatus = 'cancelled';
    } else if (status === 'active' && !existingUser.subscriptionStartDate) {
      updateData.subscriptionStartDate = new Date();
    }

    const [user] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async setComplimentaryExpiration(userId: string, expiresAt: Date | null): Promise<void> {
    await db
      .update(users)
      .set({ complimentaryExpiresAt: expiresAt })
      .where(eq(users.id, userId));
  }

  async getUserCount(): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(users);
    return Number(result[0]?.count || 0);
  }

  async getActiveSubscriptionCount(): Promise<{ pro: number; research: number; enterprise: number }> {
    const allUsers = await db.select().from(users);
    return {
      pro: allUsers.filter(u => u.subscriptionTier === 'pro' && u.subscriptionStatus === 'active').length,
      research: allUsers.filter(u => u.subscriptionTier === 'research' && u.subscriptionStatus === 'active').length,
      enterprise: allUsers.filter(u => u.subscriptionTier === 'enterprise' && u.subscriptionStatus === 'active').length,
    };
  }

  async getRedemptionByUserId(userId: string): Promise<EnterpriseCodeRedemption | undefined> {
    const [result] = await db.select().from(enterpriseCodeRedemptions).where(eq(enterpriseCodeRedemptions.userId, userId));
    return result || undefined;
  }

  async deleteConversation(conversationId: number, userId: string, privileged?: boolean): Promise<void> {
    const [conv] = await db.select().from(conversations).where(eq(conversations.id, conversationId));
    if (!conv) return;
    if (!privileged && conv.userId !== userId) return;
    await db.delete(messages).where(eq(messages.conversationId, conversationId));
    await db.delete(conversations).where(eq(conversations.id, conversationId));
  }

  async deleteAllConversations(userId: string): Promise<void> {
    const userConversations = await db.select().from(conversations).where(eq(conversations.userId, userId));
    for (const conv of userConversations) {
      await db.delete(messages).where(eq(messages.conversationId, conv.id));
    }
    await db.delete(conversations).where(eq(conversations.userId, userId));
  }

  async deleteUserAccount(userId: string): Promise<void> {
    const userConversations = await db.select().from(conversations).where(eq(conversations.userId, userId));
    for (const conv of userConversations) {
      await db.delete(messages).where(eq(messages.conversationId, conv.id));
    }
    await db.delete(conversations).where(eq(conversations.userId, userId));
    await this.deleteAllCrisisData(userId);
    await db.delete(enterpriseCodeRedemptions).where(eq(enterpriseCodeRedemptions.userId, userId));
    await db.delete(codeProjects).where(eq(codeProjects.userId, userId));
    await db.delete(betaFeedback).where(eq(betaFeedback.userId, userId));
    await db.delete(betaApplications).where(eq(betaApplications.userId, userId));
    await db.delete(users).where(eq(users.id, userId));
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createCrisisConversation(userId: string): Promise<CrisisConversation> {
    const [conv] = await db.insert(crisisConversations).values({ userId }).returning();
    return conv;
  }

  async getCrisisConversationsByUser(userId: string): Promise<CrisisConversation[]> {
    return await db.select().from(crisisConversations)
      .where(eq(crisisConversations.userId, userId))
      .orderBy(desc(crisisConversations.createdAt));
  }

  async getCrisisConversation(id: number, userId: string): Promise<CrisisConversation | undefined> {
    const [conv] = await db.select().from(crisisConversations)
      .where(and(eq(crisisConversations.id, id), eq(crisisConversations.userId, userId)));
    return conv || undefined;
  }

  async createCrisisMessage(message: InsertCrisisMessage): Promise<CrisisMessage> {
    const [msg] = await db.insert(crisisMessages).values(message).returning();
    return msg;
  }

  async getCrisisMessagesByConversation(conversationId: number): Promise<CrisisMessage[]> {
    return await db.select().from(crisisMessages)
      .where(eq(crisisMessages.conversationId, conversationId))
      .orderBy(crisisMessages.timestamp);
  }

  async deleteCrisisConversation(id: number, userId: string): Promise<void> {
    const conv = await this.getCrisisConversation(id, userId);
    if (!conv) return;
    await db.delete(crisisMessages).where(eq(crisisMessages.conversationId, id));
    await db.delete(crisisConversations).where(and(eq(crisisConversations.id, id), eq(crisisConversations.userId, userId)));
  }

  async deleteAllCrisisData(userId: string): Promise<void> {
    const convs = await db.select().from(crisisConversations).where(eq(crisisConversations.userId, userId));
    for (const conv of convs) {
      await db.delete(crisisMessages).where(eq(crisisMessages.conversationId, conv.id));
    }
    await db.delete(crisisConversations).where(eq(crisisConversations.userId, userId));
  }

  async getAllPromoCodes(): Promise<PromoCode[]> {
    return await db.select().from(promoCodes).orderBy(desc(promoCodes.createdAt));
  }

  async getPromoCode(code: string): Promise<PromoCode | undefined> {
    const [promo] = await db.select().from(promoCodes).where(eq(promoCodes.code, code.toUpperCase()));
    return promo || undefined;
  }

  async getPromoCodeById(id: number): Promise<PromoCode | undefined> {
    const [promo] = await db.select().from(promoCodes).where(eq(promoCodes.id, id));
    return promo || undefined;
  }

  async createPromoCode(data: InsertPromoCode): Promise<PromoCode> {
    const [promo] = await db.insert(promoCodes).values({
      ...data,
      code: data.code.toUpperCase(),
    }).returning();
    return promo;
  }

  async updatePromoCode(id: number, data: Partial<InsertPromoCode>): Promise<PromoCode> {
    const [promo] = await db.update(promoCodes).set(data).where(eq(promoCodes.id, id)).returning();
    if (!promo) throw new Error("Promo code not found");
    return promo;
  }

  async deletePromoCode(id: number): Promise<void> {
    await db.delete(promoCodes).where(eq(promoCodes.id, id));
  }

  async incrementPromoCodeUsage(id: number): Promise<void> {
    await db.update(promoCodes).set({ usedCount: sql`${promoCodes.usedCount} + 1` }).where(eq(promoCodes.id, id));
  }

  async seedOwnerPromoCode(): Promise<void> {
    const existing = await this.getPromoCode('TURBOCODE-FOREVER');
    if (!existing) {
      await db.insert(promoCodes).values({
        code: 'TURBOCODE-FOREVER',
        description: 'Owner lifetime Code Studio access — free forever',
        product: 'code_studio',
        discountPercent: 100,
        maxUses: 1,
        usedCount: 0,
        isActive: true,
      });
      console.log('[PromoCode] Seeded owner lifetime code: TURBOCODE-FOREVER');
    }
  }
}

export const storage = new DatabaseStorage();
