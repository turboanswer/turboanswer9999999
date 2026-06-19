import { pool } from "./db";

const USERS_COLUMNS: Array<{ name: string; ddl: string }> = [
  { name: "two_factor_secret", ddl: "VARCHAR" },
  { name: "two_factor_enabled", ddl: "BOOLEAN DEFAULT false" },
  { name: "two_factor_backup_codes", ddl: "TEXT[]" },
  { name: "home_address", ddl: "TEXT" },
  { name: "stripe_customer_id", ddl: "TEXT" },
  { name: "stripe_subscription_id", ddl: "TEXT" },
  { name: "stripe_subscription_status", ddl: "TEXT" },
  { name: "stripe_current_period_end", ddl: "TIMESTAMP" },
  { name: "paypal_subscription_id", ddl: "TEXT" },
  { name: "payment_failure_count", ddl: "INTEGER DEFAULT 0" },
  { name: "subscription_status", ddl: "TEXT DEFAULT 'free'" },
  { name: "subscription_tier", ddl: "TEXT DEFAULT 'free'" },
  { name: "subscription_start_date", ddl: "TIMESTAMP" },
  { name: "complimentary_expires_at", ddl: "TIMESTAMP" },
  { name: "preferred_model", ddl: "TEXT DEFAULT 'gemini-2.0-flash'" },
  { name: "is_employee", ddl: "BOOLEAN DEFAULT false" },
  { name: "employee_role", ddl: "TEXT DEFAULT 'basic'" },
  { name: "is_receptionist", ddl: "BOOLEAN DEFAULT false" },
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
  // Stack Trace Surgeon: free trial + metered credits + ingest webhook token.
  { name: "stack_trace_trial_used", ddl: "INTEGER DEFAULT 0" },
  { name: "stack_trace_credits", ddl: "INTEGER DEFAULT 0" },
  { name: "stack_trace_credit_granted", ddl: "BOOLEAN DEFAULT false" },
  { name: "stack_trace_ingest_token", ddl: "TEXT" },
];

// Extra columns we need on tables OTHER than users.
const EXTRA_TABLE_COLUMNS: Array<{ table: string; name: string; ddl: string }> = [
  { table: "support_tickets", name: "requester_email", ddl: "TEXT" },
  { table: "support_tickets", name: "requester_name", ddl: "TEXT" },
  { table: "support_tickets", name: "context", ddl: "TEXT" },
  { table: "support_tickets", name: "category", ddl: "TEXT" },
  { table: "support_tickets", name: "department", ddl: "TEXT" },
  { table: "support_tickets", name: "priority", ddl: "TEXT DEFAULT 'normal'" },
  { table: "support_tickets", name: "status", ddl: "TEXT DEFAULT 'open'" },
  { table: "support_tickets", name: "created_at", ddl: "TIMESTAMP DEFAULT now()" },
  { table: "support_tickets", name: "updated_at", ddl: "TIMESTAMP DEFAULT now()" },
  // Stack Trace Surgeon revolutionary-upgrade columns (added after initial table).
  { table: "stack_trace_diagnoses", name: "source", ddl: "TEXT NOT NULL DEFAULT 'manual'" },
  { table: "stack_trace_diagnoses", name: "status", ddl: "TEXT NOT NULL DEFAULT 'diagnosed'" },
  { table: "stack_trace_diagnoses", name: "severity", ddl: "TEXT" },
  { table: "stack_trace_diagnoses", name: "confidence", ddl: "INTEGER" },
  { table: "stack_trace_diagnoses", name: "alternatives", ddl: "JSONB NOT NULL DEFAULT '[]'::jsonb" },
  { table: "stack_trace_diagnoses", name: "incident_summary", ddl: "TEXT" },
  { table: "stack_trace_diagnoses", name: "postmortem", ddl: "TEXT" },
  { table: "stack_trace_diagnoses", name: "culprit", ddl: "JSONB" },
];

// Columns that need to be made NULLABLE because we relaxed the constraint.
const NULLABLE_COLUMNS: Array<{ table: string; column: string }> = [
  { table: "support_tickets", column: "workgroup_id" },
  { table: "ticket_notifications", column: "workgroup_id" },
];

// Tables introduced after the initial schema. Created idempotently on startup
// so production databases (which never get `drizzle-kit push`) stay in sync.
const NEW_TABLES: Array<{ name: string; ddl: string }> = [
  {
    name: "stack_trace_diagnoses",
    ddl: `CREATE TABLE IF NOT EXISTS stack_trace_diagnoses (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      stack_trace TEXT NOT NULL,
      repo_url TEXT NOT NULL,
      root_cause TEXT NOT NULL,
      suggested_fix TEXT NOT NULL,
      frames_parsed INTEGER NOT NULL DEFAULT 0,
      files_used JSONB NOT NULL DEFAULT '[]'::jsonb,
      warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
      pr_url TEXT,
      source TEXT NOT NULL DEFAULT 'manual',
      status TEXT NOT NULL DEFAULT 'diagnosed',
      severity TEXT,
      confidence INTEGER,
      alternatives JSONB NOT NULL DEFAULT '[]'::jsonb,
      incident_summary TEXT,
      postmortem TEXT,
      culprit JSONB,
      created_at TIMESTAMP NOT NULL DEFAULT now()
    )`,
  },
  {
    name: "escalations",
    ddl: `CREATE TABLE IF NOT EXISTS escalations (
      id SERIAL PRIMARY KEY,
      raised_by_id TEXT NOT NULL,
      raised_by_email TEXT,
      customer_user_id TEXT,
      customer_email TEXT,
      customer_name TEXT,
      summary TEXT NOT NULL,
      severity TEXT NOT NULL DEFAULT 'normal',
      status TEXT NOT NULL DEFAULT 'open',
      emailed BOOLEAN NOT NULL DEFAULT false,
      resolved_by_id TEXT,
      resolved_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT now()
    )`,
  },
  {
    name: "user_oauth_connections",
    ddl: `CREATE TABLE IF NOT EXISTS user_oauth_connections (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id VARCHAR NOT NULL,
      provider VARCHAR NOT NULL,
      account_email VARCHAR,
      account_name VARCHAR,
      access_token TEXT NOT NULL,
      refresh_token TEXT,
      expires_at TIMESTAMP,
      scopes TEXT,
      created_at TIMESTAMP DEFAULT now(),
      updated_at TIMESTAMP DEFAULT now()
    )`,
  },
];

async function tableExists(table: string): Promise<boolean> {
  const res = await pool.query(
    "SELECT 1 FROM information_schema.tables WHERE table_name = $1 LIMIT 1",
    [table]
  );
  return !!(res.rowCount && res.rowCount > 0);
}

export async function ensureDatabaseSchema(): Promise<void> {
  const startedAt = Date.now();
  let added = 0;
  let alreadyExisted = 0;
  let failed = 0;
  let relaxed = 0;
  let tablesCreated = 0;

  for (const t of NEW_TABLES) {
    try {
      const existed = await tableExists(t.name);
      await pool.query(t.ddl);
      if (existed) {
        alreadyExisted++;
      } else {
        tablesCreated++;
        console.log(`[DB Migration] Created table ${t.name}`);
      }
    } catch (e: any) {
      failed++;
      console.error(`[DB Migration] Failed to create table ${t.name}: ${e?.message || e}`);
    }
  }

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

  for (const col of EXTRA_TABLE_COLUMNS) {
    try {
      if (!(await tableExists(col.table))) continue;
      const beforeRes = await pool.query(
        "SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = $2 LIMIT 1",
        [col.table, col.name]
      );
      const existed = beforeRes.rowCount && beforeRes.rowCount > 0;
      if (existed) {
        alreadyExisted++;
        continue;
      }
      await pool.query(`ALTER TABLE ${col.table} ADD COLUMN IF NOT EXISTS ${col.name} ${col.ddl}`);
      added++;
      console.log(`[DB Migration] Added ${col.table}.${col.name}`);
    } catch (e: any) {
      failed++;
      console.error(`[DB Migration] Failed to ensure ${col.table}.${col.name}: ${e?.message || e}`);
    }
  }

  for (const col of NULLABLE_COLUMNS) {
    try {
      if (!(await tableExists(col.table))) continue;
      const res = await pool.query(
        "SELECT is_nullable FROM information_schema.columns WHERE table_name = $1 AND column_name = $2 LIMIT 1",
        [col.table, col.column]
      );
      if (!res.rowCount) continue;
      if (res.rows[0].is_nullable === "YES") continue;
      await pool.query(`ALTER TABLE ${col.table} ALTER COLUMN ${col.column} DROP NOT NULL`);
      relaxed++;
      console.log(`[DB Migration] Relaxed NOT NULL on ${col.table}.${col.column}`);
    } catch (e: any) {
      failed++;
      console.error(`[DB Migration] Failed to relax ${col.table}.${col.column}: ${e?.message || e}`);
    }
  }

  console.log(
    `[DB Migration] Complete in ${Date.now() - startedAt}ms — tables created: ${tablesCreated}, columns added: ${added}, existing: ${alreadyExisted}, relaxed: ${relaxed}, failed: ${failed}`
  );
}
