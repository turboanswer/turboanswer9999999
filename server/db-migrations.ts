import { pool } from "./db";

const USERS_COLUMNS: Array<{ name: string; ddl: string }> = [
  { name: "two_factor_secret", ddl: "VARCHAR" },
  { name: "two_factor_enabled", ddl: "BOOLEAN DEFAULT false" },
  { name: "home_address", ddl: "TEXT" },
  { name: "stripe_customer_id", ddl: "TEXT" },
  { name: "stripe_subscription_id", ddl: "TEXT" },
  { name: "paypal_subscription_id", ddl: "TEXT" },
  { name: "subscription_status", ddl: "TEXT DEFAULT 'free'" },
  { name: "subscription_tier", ddl: "TEXT DEFAULT 'free'" },
  { name: "subscription_start_date", ddl: "TIMESTAMP" },
  { name: "complimentary_expires_at", ddl: "TIMESTAMP" },
  { name: "preferred_model", ddl: "TEXT DEFAULT 'gemini-2.0-flash'" },
  { name: "is_employee", ddl: "BOOLEAN DEFAULT false" },
  { name: "employee_role", ddl: "TEXT DEFAULT 'basic'" },
  { name: "can_view_all_chats", ddl: "BOOLEAN DEFAULT false" },
  { name: "can_ban_users", ddl: "BOOLEAN DEFAULT false" },
  { name: "is_banned", ddl: "BOOLEAN DEFAULT false" },
  { name: "is_flagged", ddl: "BOOLEAN DEFAULT false" },
  { name: "flag_reason", ddl: "TEXT" },
  { name: "ban_reason", ddl: "TEXT" },
  { name: "ban_expires_at", ddl: "TIMESTAMP" },
  { name: "ban_duration", ddl: "TEXT" },
  { name: "is_suspended", ddl: "BOOLEAN DEFAULT false" },
  { name: "suspension_reason", ddl: "TEXT" },
  { name: "suspended_at", ddl: "TIMESTAMP" },
  { name: "suspended_by", ddl: "TEXT" },
  { name: "last_login_at", ddl: "TIMESTAMP" },
  { name: "password_reset_otp", ddl: "VARCHAR" },
  { name: "password_reset_otp_expires", ddl: "TIMESTAMP" },
  { name: "password_reset_verified", ddl: "BOOLEAN DEFAULT false" },
  { name: "password_reset_verified_expires", ddl: "TIMESTAMP" },
  { name: "is_beta_tester", ddl: "BOOLEAN DEFAULT false" },
  { name: "referral_pro_until", ddl: "TIMESTAMP" },
  { name: "referral_code_used", ddl: "TEXT" },
  { name: "code_studio_addon", ddl: "BOOLEAN DEFAULT false" },
  { name: "code_studio_addon_sub_id", ddl: "TEXT" },
  { name: "code_studio_credits", ddl: "INTEGER DEFAULT 0" },
  { name: "code_studio_credits_reset_at", ddl: "TIMESTAMP" },
  { name: "code_studio_long_build", ddl: "BOOLEAN DEFAULT false" },
  { name: "code_studio_auto_buy_pack", ddl: "INTEGER DEFAULT 1000" },
  { name: "code_studio_long_build_hours", ddl: "INTEGER DEFAULT 1" },
  { name: "phone_number", ddl: "VARCHAR" },
  { name: "weekly_digest_enabled", ddl: "BOOLEAN DEFAULT false" },
  { name: "daily_questions_used", ddl: "INTEGER DEFAULT 0" },
  { name: "daily_questions_reset_at", ddl: "TIMESTAMP" },
  { name: "timezone", ddl: "VARCHAR DEFAULT 'UTC'" },
];

export async function ensureDatabaseSchema(): Promise<void> {
  const startedAt = Date.now();
  let added = 0;
  let alreadyExisted = 0;
  let failed = 0;

  for (const col of USERS_COLUMNS) {
    try {
      const beforeRes = await pool.query(
        "SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = $1 LIMIT 1",
        [col.name]
      );
      const existed = beforeRes.rowCount && beforeRes.rowCount > 0;
      if (existed) {
        alreadyExisted++;
        continue;
      }
      await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS ${col.name} ${col.ddl}`);
      added++;
      console.log(`[DB Migration] Added users.${col.name}`);
    } catch (e: any) {
      failed++;
      console.error(`[DB Migration] Failed to ensure users.${col.name}: ${e?.message || e}`);
    }
  }

  console.log(
    `[DB Migration] Complete in ${Date.now() - startedAt}ms — added: ${added}, existing: ${alreadyExisted}, failed: ${failed}`
  );
}
