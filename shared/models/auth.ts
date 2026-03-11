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
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  homeAddress: text("home_address"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  paypalSubscriptionId: text("paypal_subscription_id"),
  subscriptionStatus: text("subscription_status").default("free"),
  subscriptionTier: text("subscription_tier").default("free"),
  subscriptionStartDate: timestamp("subscription_start_date"),
  complimentaryExpiresAt: timestamp("complimentary_expires_at"),
  preferredModel: text("preferred_model").default("gemini-2.0-flash"),
  isEmployee: boolean("is_employee").default(false),
  employeeRole: text("employee_role").default("basic"),
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
  codeStudioAddon: boolean("code_studio_addon").default(false),
  codeStudioAddonSubId: text("code_studio_addon_sub_id"),
  codeStudioCredits: integer("code_studio_credits").default(0),
  codeStudioCreditsResetAt: timestamp("code_studio_credits_reset_at"),
  phoneNumber: varchar("phone_number"),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
