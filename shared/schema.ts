import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  subscriptionStatus: text("subscription_status").default("free"), // 'free', 'active', 'canceled', 'past_due'
  subscriptionTier: text("subscription_tier").default("free"), // 'free', 'pro', 'premium'
  preferredModel: text("preferred_model").default("gemini-2.0-flash-exp"), // Default to maximum performance model
  isEmployee: boolean("is_employee").default(false), // Employee access flag
  employeeRole: text("employee_role").default("basic"), // 'basic', 'admin', 'super_admin'
  canViewAllChats: boolean("can_view_all_chats").default(false), // Permission to view all user chat histories
  canBanUsers: boolean("can_ban_users").default(false), // Permission to ban/unban users
  isBanned: boolean("is_banned").default(false), // User ban status
  isFlagged: boolean("is_flagged").default(false), // User flag status
  flagReason: text("flag_reason"), // Reason for flagging
  banReason: text("ban_reason"), // Reason for banning
  isSuspended: boolean("is_suspended").default(false), // User suspension status
  suspensionReason: text("suspension_reason"), // Reason for suspension
  suspendedAt: timestamp("suspended_at"), // When user was suspended
  suspendedBy: text("suspended_by"), // Employee who suspended the user
  createdAt: timestamp("created_at").defaultNow(),
  lastLoginAt: timestamp("last_login_at"),
});

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  title: text("title").default("New Conversation"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").references(() => conversations.id).notNull(),
  content: text("content").notNull(),
  role: text("role").notNull(), // 'user' or 'assistant'
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
});

export const insertConversationSchema = createInsertSchema(conversations).pick({
  title: true,
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  conversationId: true,
  content: true,
  role: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

// Audit Log table for tracking employee actions
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").references(() => users.id).notNull(),
  employeeUsername: text("employee_username").notNull(),
  action: text("action").notNull(), // 'suspend', 'unsuspend', 'ban', 'unban', 'flag', 'unflag'
  targetUserId: integer("target_user_id").references(() => users.id).notNull(),
  targetUsername: text("target_username").notNull(),
  reason: text("reason"),
  details: text("details"), // Additional context or notes
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

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
