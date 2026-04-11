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

export const workgroups = pgTable("workgroups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").default(""),
  ownerId: text("owner_id").notNull(),
  ownerEmail: text("owner_email"),
  requireApproval: boolean("require_approval").default(false).notNull(),
  department: text("department").default("general"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const workgroupMembers = pgTable("workgroup_members", {
  id: serial("id").primaryKey(),
  workgroupId: integer("workgroup_id").references(() => workgroups.id).notNull(),
  userId: text("user_id").notNull(),
  userEmail: text("user_email"),
  userName: text("user_name"),
  role: text("role").notNull().default("member"),
  isBlocked: boolean("is_blocked").default(false).notNull(),
  isRestricted: boolean("is_restricted").default(false).notNull(),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

export const workgroupInvites = pgTable("workgroup_invites", {
  id: serial("id").primaryKey(),
  workgroupId: integer("workgroup_id").references(() => workgroups.id).notNull(),
  email: text("email").notNull(),
  invitedBy: text("invited_by").notNull(),
  status: text("status").notNull().default("pending"),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"),
});

export const workgroupMessages = pgTable("workgroup_messages", {
  id: serial("id").primaryKey(),
  workgroupId: integer("workgroup_id").references(() => workgroups.id).notNull(),
  senderId: text("sender_id").notNull(),
  senderName: text("sender_name"),
  senderEmail: text("sender_email"),
  recipientId: text("recipient_id"),
  content: text("content").notNull(),
  messageType: text("message_type").notNull().default("group"),
  fileUrl: text("file_url"),
  fileName: text("file_name"),
  isEdited: boolean("is_edited").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const workgroupApprovals = pgTable("workgroup_approvals", {
  id: serial("id").primaryKey(),
  workgroupId: integer("workgroup_id").references(() => workgroups.id).notNull(),
  requesterId: text("requester_id").notNull(),
  requesterName: text("requester_name"),
  contentType: text("content_type").notNull(),
  content: text("content").notNull(),
  status: text("status").notNull().default("pending"),
  reviewedBy: text("reviewed_by"),
  reviewNote: text("review_note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  reviewedAt: timestamp("reviewed_at"),
});

export const insertWorkgroupSchema = createInsertSchema(workgroups).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertWorkgroup = z.infer<typeof insertWorkgroupSchema>;
export type Workgroup = typeof workgroups.$inferSelect;

export const insertWorkgroupMemberSchema = createInsertSchema(workgroupMembers).omit({ id: true, joinedAt: true });
export type InsertWorkgroupMember = z.infer<typeof insertWorkgroupMemberSchema>;
export type WorkgroupMember = typeof workgroupMembers.$inferSelect;

export const insertWorkgroupInviteSchema = createInsertSchema(workgroupInvites).omit({ id: true, createdAt: true });
export type InsertWorkgroupInvite = z.infer<typeof insertWorkgroupInviteSchema>;
export type WorkgroupInvite = typeof workgroupInvites.$inferSelect;

export const insertWorkgroupMessageSchema = createInsertSchema(workgroupMessages).omit({ id: true, createdAt: true });
export type InsertWorkgroupMessage = z.infer<typeof insertWorkgroupMessageSchema>;
export type WorkgroupMessage = typeof workgroupMessages.$inferSelect;

export const insertWorkgroupApprovalSchema = createInsertSchema(workgroupApprovals).omit({ id: true, createdAt: true, reviewedAt: true });
export type InsertWorkgroupApproval = z.infer<typeof insertWorkgroupApprovalSchema>;
export type WorkgroupApproval = typeof workgroupApprovals.$inferSelect;

export const supportTickets = pgTable("support_tickets", {
  id: serial("id").primaryKey(),
  workgroupId: integer("workgroup_id").references(() => workgroups.id).notNull(),
  requesterId: text("requester_id").notNull(),
  requesterName: text("requester_name"),
  assignedTo: text("assigned_to"),
  assignedName: text("assigned_name"),
  subject: text("subject").notNull(),
  context: text("context"),
  status: text("status").notNull().default("open"),
  priority: text("priority").notNull().default("normal"),
  category: text("category").default("general"),
  department: text("department").default("general"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
});

export const supportTicketMessages = pgTable("support_ticket_messages", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").references(() => supportTickets.id).notNull(),
  senderId: text("sender_id").notNull(),
  senderName: text("sender_name"),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const ticketNotifications = pgTable("ticket_notifications", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  ticketId: integer("ticket_id").references(() => supportTickets.id).notNull(),
  workgroupId: integer("workgroup_id").references(() => workgroups.id).notNull(),
  title: text("title").notNull(),
  body: text("body"),
  type: text("type").notNull().default("new_ticket"),
  dismissed: boolean("dismissed").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type TicketNotification = typeof ticketNotifications.$inferSelect;

export const insertSupportTicketSchema = createInsertSchema(supportTickets).omit({ id: true, createdAt: true, resolvedAt: true });
export type InsertSupportTicket = z.infer<typeof insertSupportTicketSchema>;
export type SupportTicket = typeof supportTickets.$inferSelect;

export const insertSupportTicketMessageSchema = createInsertSchema(supportTicketMessages).omit({ id: true, createdAt: true });
export type InsertSupportTicketMessage = z.infer<typeof insertSupportTicketMessageSchema>;
export type SupportTicketMessage = typeof supportTicketMessages.$inferSelect;
