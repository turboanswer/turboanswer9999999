import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export * from "./models/auth";

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
