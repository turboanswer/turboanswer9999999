import { sql } from "drizzle-orm";
import { boolean, index, integer, jsonb, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);

// User storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  password: varchar("password"),
  twoFactorSecret: varchar("two_factor_secret"),
  twoFactorEnabled: boolean("two_factor_enabled").default(false),
  twoFactorBackupCodes: text("two_factor_backup_codes").array(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  homeAddress: text("home_address"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  stripeSubscriptionStatus: text("stripe_subscription_status"),
  stripeCurrentPeriodEnd: timestamp("stripe_current_period_end"),
  paypalSubscriptionId: text("paypal_subscription_id"),
  paymentFailureCount: integer("payment_failure_count").default(0),
  subscriptionStatus: text("subscription_status").default("free"),
  subscriptionTier: text("subscription_tier").default("free"),
  subscriptionStartDate: timestamp("subscription_start_date"),
  complimentaryExpiresAt: timestamp("complimentary_expires_at"),
  preferredModel: text("preferred_model").default("gemini-2.0-flash"),
  isEmployee: boolean("is_employee").default(false),
  employeeRole: text("employee_role").default("basic"),
  isReceptionist: boolean("is_receptionist").default(false),
  canViewAllChats: boolean("can_view_all_chats").default(false),
  canBanUsers: boolean("can_ban_users").default(false),
  isBanned: boolean("is_banned").default(false),
  isFlagged: boolean("is_flagged").default(false),
  flagReason: text("flag_reason"),
  banReason: text("ban_reason"),
  banExpiresAt: timestamp("ban_expires_at"),
  banDuration: text("ban_duration"),
  isSuspended: boolean("is_suspended").default(false),
  suspensionReason: text("suspension_reason"),
  suspendedAt: timestamp("suspended_at"),
  suspendedBy: text("suspended_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  lastLoginAt: timestamp("last_login_at"),
  passwordResetOtp: varchar("password_reset_otp"),
  passwordResetOtpExpires: timestamp("password_reset_otp_expires"),
  passwordResetVerified: boolean("password_reset_verified").default(false),
  passwordResetVerifiedExpires: timestamp("password_reset_verified_expires"),
  isBetaTester: boolean("is_beta_tester").default(false),
  referralProUntil: timestamp("referral_pro_until"),
  referralCodeUsed: text("referral_code_used"),
  codeStudioAddon: boolean("code_studio_addon").default(false),
  codeStudioAddonSubId: text("code_studio_addon_sub_id"),
  codeStudioCredits: integer("code_studio_credits").default(0),
  codeStudioCreditsResetAt: timestamp("code_studio_credits_reset_at"),
  codeStudioLongBuild: boolean("code_studio_long_build").default(false),
  codeStudioAutoBuyPack: integer("code_studio_auto_buy_pack").default(1000),
  codeStudioLongBuildHours: integer("code_studio_long_build_hours").default(1),
  phoneNumber: varchar("phone_number"),
  weeklyDigestEnabled: boolean("weekly_digest_enabled").default(false),
  dailyQuestionsUsed: integer("daily_questions_used").default(0),
  dailyQuestionsResetAt: timestamp("daily_questions_reset_at"),
  timezone: varchar("timezone").default("UTC"),
  // ── Stack Trace Surgeon: trial + metered credits ──────────────────────────
  // Free/Pro users get a small free trial of diagnoses before the upgrade wall.
  stackTraceTrialUsed: integer("stack_trace_trial_used").default(0),
  // Metered balance in CENTS. Granted once ($35) when a user reaches a paid tier.
  stackTraceCredits: integer("stack_trace_credits").default(0),
  // Whether the one-time $35 credit has already been granted (so it can't be farmed).
  stackTraceCreditGranted: boolean("stack_trace_credit_granted").default(false),
  // Per-user secret token for the public error-ingest webhook (Sentry / log drains).
  stackTraceIngestToken: text("stack_trace_ingest_token"),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Per-user OAuth connections for Connected Accounts (Gmail/Calendar/Drive/Docs via
// Google, Outlook/OneDrive/Contacts via Microsoft). Tokens are stored ENCRYPTED at
// rest (AES-256-GCM). One row per (userId, provider).
export const userOauthConnections = pgTable(
  "user_oauth_connections",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id").notNull(),
    provider: varchar("provider").notNull(), // 'google' | 'microsoft'
    accountEmail: varchar("account_email"),
    accountName: varchar("account_name"),
    accessToken: text("access_token").notNull(), // encrypted
    refreshToken: text("refresh_token"), // encrypted
    expiresAt: timestamp("expires_at"),
    scopes: text("scopes"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [index("IDX_oauth_user_provider").on(table.userId, table.provider)]
);

export type UserOauthConnection = typeof userOauthConnections.$inferSelect;
export type InsertUserOauthConnection = typeof userOauthConnections.$inferInsert;
