import { sql } from "drizzle-orm";
import { boolean, index, jsonb, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

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
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  paypalSubscriptionId: text("paypal_subscription_id"),
  subscriptionStatus: text("subscription_status").default("free"),
  subscriptionTier: text("subscription_tier").default("free"),
  preferredModel: text("preferred_model").default("gemini-2.0-flash"),
  isEmployee: boolean("is_employee").default(false),
  employeeRole: text("employee_role").default("basic"),
  canViewAllChats: boolean("can_view_all_chats").default(false),
  canBanUsers: boolean("can_ban_users").default(false),
  isBanned: boolean("is_banned").default(false),
  isFlagged: boolean("is_flagged").default(false),
  flagReason: text("flag_reason"),
  banReason: text("ban_reason"),
  isSuspended: boolean("is_suspended").default(false),
  suspensionReason: text("suspension_reason"),
  suspendedAt: timestamp("suspended_at"),
  suspendedBy: text("suspended_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  lastLoginAt: timestamp("last_login_at"),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
