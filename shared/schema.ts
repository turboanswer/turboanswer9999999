import { pgTable, text, serial, integer, timestamp, boolean, jsonb, uniqueIndex } from "drizzle-orm/pg-core";
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
  worksWell: text("works_well"),
  frustrating: text("frustrating"),
  wishedFeature: text("wished_feature"),
  rating: integer("rating"),
  submittedAt: timestamp("submitted_at").defaultNow(),
});

// Referral codes — beta testers get 3 codes that grant a friend 1 month of Pro
export const referralCodes = pgTable("referral_codes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  ownerId: text("owner_id").notNull(),
  usedByUserId: text("used_by_user_id"),
  usedByEmail: text("used_by_email"),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type ReferralCode = typeof referralCodes.$inferSelect;

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
  viewCount: integer("view_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCodeProjectSchema = createInsertSchema(codeProjects).omit({ id: true, createdAt: true, updatedAt: true, publishedAt: true });
export type InsertCodeProject = z.infer<typeof insertCodeProjectSchema>;
export type CodeProject = typeof codeProjects.$inferSelect;

export const codeProjectSecrets = pgTable("code_project_secrets", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  userId: text("user_id").notNull(),
  key: text("key").notNull(),
  value: text("value").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCodeProjectSecretSchema = createInsertSchema(codeProjectSecrets).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCodeProjectSecret = z.infer<typeof insertCodeProjectSecretSchema>;
export type CodeProjectSecret = typeof codeProjectSecrets.$inferSelect;

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
  workgroupId: integer("workgroup_id").references(() => workgroups.id),
  requesterId: text("requester_id").notNull(),
  requesterEmail: text("requester_email"),
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
  workgroupId: integer("workgroup_id").references(() => workgroups.id),
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

export const collabRooms = pgTable("collab_rooms", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  creatorId: text("creator_id").notNull(),
  creatorName: text("creator_name"),
  isActive: boolean("is_active").notNull().default(true),
  maxMembers: integer("max_members").notNull().default(10),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const collabRoomMembers = pgTable("collab_room_members", {
  id: serial("id").primaryKey(),
  roomId: integer("room_id").references(() => collabRooms.id).notNull(),
  userId: text("user_id").notNull(),
  userName: text("user_name"),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

export const collabRoomMessages = pgTable("collab_room_messages", {
  id: serial("id").primaryKey(),
  roomId: integer("room_id").references(() => collabRooms.id).notNull(),
  senderId: text("sender_id").notNull(),
  senderName: text("sender_name"),
  content: text("content").notNull(),
  role: text("role").notNull().default("user"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type CollabRoom = typeof collabRooms.$inferSelect;
export type CollabRoomMember = typeof collabRoomMembers.$inferSelect;
export type CollabRoomMessage = typeof collabRoomMessages.$inferSelect;
export const insertCollabRoomSchema = createInsertSchema(collabRooms).omit({ id: true, createdAt: true, code: true, isActive: true });

export const factChecks = pgTable("fact_checks", {
  id: serial("id").primaryKey(),
  messageId: integer("message_id").references(() => messages.id).notNull(),
  originalContent: text("original_content").notNull(),
  verdict: text("verdict").notNull(),
  confidenceScore: integer("confidence_score").notNull(),
  claims: jsonb("claims").notNull().default([]),
  checkedBy: text("checked_by").notNull().default("gemini"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type FactCheck = typeof factChecks.$inferSelect;

export const apiKeys = pgTable("api_keys", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  keyHash: text("key_hash").notNull().unique(),
  keyPrefix: text("key_prefix").notNull(),
  name: text("name").notNull(),
  tier: text("tier").notNull().default("free"),
  keyType: text("key_type").notNull().default("public"),
  permissions: jsonb("permissions").notNull().default(["construction_analyze"]),
  rateLimit: integer("rate_limit").notNull().default(100),
  dailyUsage: integer("daily_usage").notNull().default(0),
  totalUsage: integer("total_usage").notNull().default(0),
  monthlySpend: integer("monthly_spend_cents").notNull().default(0),
  monthlyBudget: integer("monthly_budget_cents").notNull().default(2500),
  monthlyResetAt: timestamp("monthly_reset_at").defaultNow(),
  lastUsedAt: timestamp("last_used_at"),
  lastResetAt: timestamp("last_reset_at").defaultNow(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ApiKey = typeof apiKeys.$inferSelect;
export const insertApiKeySchema = createInsertSchema(apiKeys).omit({ id: true, createdAt: true, dailyUsage: true, totalUsage: true, lastUsedAt: true, lastResetAt: true });

export const apiUsageLogs = pgTable("api_usage_logs", {
  id: serial("id").primaryKey(),
  apiKeyId: integer("api_key_id").notNull(),
  endpoint: text("endpoint").notNull(),
  method: text("method").notNull(),
  statusCode: integer("status_code").notNull(),
  costCents: integer("cost_cents").notNull().default(0),
  responseTimeMs: integer("response_time_ms"),
  imageSize: integer("image_size"),
  queryType: text("query_type"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ApiUsageLog = typeof apiUsageLogs.$inferSelect;

export const diagnoses = pgTable("diagnoses", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  imageData: text("image_data").notNull(),
  problem: text("problem").notNull(),
  severity: integer("severity").notNull(),
  category: text("category").notNull(),
  possibleCauses: jsonb("possible_causes").$type<string[]>().notNull().default([]),
  immediateActions: jsonb("immediate_actions").$type<string[]>().notNull().default([]),
  isEmergency: boolean("is_emergency").notNull().default(false),
  needsProfessional: boolean("needs_professional").notNull().default(false),
  fullAnalysis: text("full_analysis").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDiagnosisSchema = createInsertSchema(diagnoses).omit({ id: true, createdAt: true });
export type InsertDiagnosis = z.infer<typeof insertDiagnosisSchema>;
export type Diagnosis = typeof diagnoses.$inferSelect;

export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  diagnosisId: integer("diagnosis_id").references(() => diagnoses.id).notNull(),
  scheduledDate: timestamp("scheduled_date").notNull(),
  priority: text("priority").notNull().default("normal"),
  status: text("status").notNull().default("scheduled"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertAppointmentSchema = createInsertSchema(appointments).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type Appointment = typeof appointments.$inferSelect;

export const deepThinkUsage = pgTable("deep_think_usage", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  date: text("date").notNull(),
  count: integer("count").notNull().default(0),
}, (t) => ({
  uniqUserDate: uniqueIndex("deep_think_usage_user_date_unique").on(t.userId, t.date),
}));

export type DeepThinkUsage = typeof deepThinkUsage.$inferSelect;

export const stackTraceDiagnoses = pgTable("stack_trace_diagnoses", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  stackTrace: text("stack_trace").notNull(),
  repoUrl: text("repo_url").notNull(),
  rootCause: text("root_cause").notNull(),
  suggestedFix: text("suggested_fix").notNull(),
  framesParsed: integer("frames_parsed").notNull().default(0),
  filesUsed: jsonb("files_used").$type<{ path: string; line?: number }[]>().notNull().default([]),
  warnings: jsonb("warnings").$type<string[]>().notNull().default([]),
  prUrl: text("pr_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertStackTraceDiagnosisSchema = createInsertSchema(stackTraceDiagnoses).omit({ id: true, createdAt: true, prUrl: true });
export type InsertStackTraceDiagnosis = z.infer<typeof insertStackTraceDiagnosisSchema>;
export type StackTraceDiagnosisRow = typeof stackTraceDiagnoses.$inferSelect;
