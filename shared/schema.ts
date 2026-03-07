import { pgTable, text, serial, integer, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export * from "./models/auth";

import { pgTable as _pgTable, text as _text, boolean as _boolean, timestamp as _timestamp, serial as _serial, integer as _integer, varchar as _varchar } from "drizzle-orm/pg-core";

export const adminInviteTokens = _pgTable("admin_invite_tokens", {
  id: _serial("id").primaryKey(),
  token: _varchar("token", { length: 64 }).notNull().unique(),
  label: _text("label").notNull().default("Admin Invite"),
  createdBy: _text("created_by").notNull(),
  createdByEmail: _text("created_by_email"),
  maxUses: _integer("max_uses").default(1),
  currentUses: _integer("current_uses").default(0),
  isRevoked: _boolean("is_revoked").default(false),
  createdAt: _timestamp("created_at").defaultNow().notNull(),
  expiresAt: _timestamp("expires_at"),
});

export type AdminInviteToken = typeof adminInviteTokens.$inferSelect;
export type InsertAdminInviteToken = typeof adminInviteTokens.$inferInsert;

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  title: text("title").default("New Conversation"),
  userId: text("user_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").references(() => conversations.id).notNull(),
  content: text("content").notNull(),
  role: text("role").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const insertConversationSchema = createInsertSchema(conversations).pick({
  title: true,
  userId: true,
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  conversationId: true,
  content: true,
  role: true,
});

export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  employeeId: text("employee_id").notNull(),
  employeeUsername: text("employee_username").notNull(),
  action: text("action").notNull(),
  targetUserId: text("target_user_id").notNull(),
  targetUsername: text("target_username").notNull(),
  reason: text("reason"),
  details: text("details"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const adminNotifications = pgTable("admin_notifications", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  userId: text("user_id").notNull(),
  userEmail: text("user_email"),
  userFirstName: text("user_first_name"),
  userLastName: text("user_last_name"),
  flaggedContent: text("flagged_content").notNull(),
  conversationId: integer("conversation_id"),
  actionTaken: text("action_taken").notNull(),
  isRead: text("is_read").default("false"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAdminNotificationSchema = createInsertSchema(adminNotifications).pick({
  type: true,
  userId: true,
  userEmail: true,
  userFirstName: true,
  userLastName: true,
  flaggedContent: true,
  conversationId: true,
  actionTaken: true,
});

export type InsertAdminNotification = z.infer<typeof insertAdminNotificationSchema>;
export type AdminNotification = typeof adminNotifications.$inferSelect;

export const enterpriseCodes = pgTable("enterprise_codes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  ownerUserId: text("owner_user_id").notNull(),
  ownerEmail: text("owner_email"),
  maxUses: integer("max_uses").default(5),
  currentUses: integer("current_uses").default(0),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const enterpriseCodeRedemptions = pgTable("enterprise_code_redemptions", {
  id: serial("id").primaryKey(),
  codeId: integer("code_id").references(() => enterpriseCodes.id).notNull(),
  userId: text("user_id").notNull(),
  userEmail: text("user_email"),
  redeemedAt: timestamp("redeemed_at").defaultNow().notNull(),
});

export const insertEnterpriseCodeSchema = createInsertSchema(enterpriseCodes).pick({
  code: true,
  ownerUserId: true,
  ownerEmail: true,
  maxUses: true,
});

export type InsertEnterpriseCode = z.infer<typeof insertEnterpriseCodeSchema>;
export type EnterpriseCode = typeof enterpriseCodes.$inferSelect;
export type EnterpriseCodeRedemption = typeof enterpriseCodeRedemptions.$inferSelect;

export const crisisConversations = pgTable("crisis_conversations", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const crisisMessages = pgTable("crisis_messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").references(() => crisisConversations.id).notNull(),
  encryptedContent: text("encrypted_content").notNull(),
  role: text("role").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const insertCrisisConversationSchema = createInsertSchema(crisisConversations).pick({
  userId: true,
});

export const insertCrisisMessageSchema = createInsertSchema(crisisMessages).pick({
  conversationId: true,
  encryptedContent: true,
  role: true,
});

export type InsertCrisisConversation = z.infer<typeof insertCrisisConversationSchema>;
export type CrisisConversation = typeof crisisConversations.$inferSelect;
export type InsertCrisisMessage = z.infer<typeof insertCrisisMessageSchema>;
export type CrisisMessage = typeof crisisMessages.$inferSelect;

export const insertAuditLogSchema = createInsertSchema(auditLogs).pick({
  employeeId: true,
  employeeUsername: true,
  action: true,
  targetUserId: true,
  targetUsername: true,
  reason: true,
  details: true,
  ipAddress: true,
  userAgent: true,
});

export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;

// Beta Testing
export const betaApplications = pgTable("beta_applications", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  name: text("name").notNull(),
  email: text("email").notNull(),
  answers: jsonb("answers").notNull(),
  status: text("status").default("pending"), // pending | approved | denied
  denialReason: text("denial_reason"),
  appliedAt: timestamp("applied_at").defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
});

export const betaFeedback = pgTable("beta_feedback", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  userName: text("user_name"),
  userEmail: text("user_email"),
  message: text("message").notNull(),
  category: text("category").default("general"),
  submittedAt: timestamp("submitted_at").defaultNow(),
});

export const insertBetaApplicationSchema = createInsertSchema(betaApplications).omit({ id: true, appliedAt: true, reviewedAt: true });
export const insertBetaFeedbackSchema = createInsertSchema(betaFeedback).omit({ id: true, submittedAt: true });

export type BetaApplication = typeof betaApplications.$inferSelect;
export type BetaFeedback = typeof betaFeedback.$inferSelect;

// Code Studio
export const codeProjects = pgTable("code_projects", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description").default(""),
  files: jsonb("files").$type<{ name: string; content: string; language: string }[]>().notNull().default([]),
  mainLanguage: text("main_language").notNull().default("html"),
  slug: text("slug").unique(),
  customDomain: text("custom_domain"),
  isPublished: boolean("is_published").notNull().default(false),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCodeProjectSchema = createInsertSchema(codeProjects).omit({ id: true, createdAt: true, updatedAt: true, publishedAt: true });
export type InsertCodeProject = z.infer<typeof insertCodeProjectSchema>;
export type CodeProject = typeof codeProjects.$inferSelect;

// Promo Codes
export const promoCodes = pgTable("promo_codes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  description: text("description").default(""),
  product: text("product").notNull().default("code_studio"), // 'code_studio' | 'pro' | 'research' | 'enterprise' | 'all'
  discountPercent: integer("discount_percent").notNull().default(100), // 0-100, 100 = free
  maxUses: integer("max_uses"), // null = unlimited
  usedCount: integer("used_count").notNull().default(0),
  expiresAt: timestamp("expires_at"), // null = never expires
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPromoCodeSchema = createInsertSchema(promoCodes).omit({ id: true, usedCount: true, createdAt: true });
export type InsertPromoCode = z.infer<typeof insertPromoCodeSchema>;
export type PromoCode = typeof promoCodes.$inferSelect;
