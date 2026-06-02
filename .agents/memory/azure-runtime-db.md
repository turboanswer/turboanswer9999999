---
name: Azure runtime DB vs Neon (db:push)
description: Why new tables/columns must be registered in server/db-migrations.ts, not just shared/schema.ts + db:push
---

The app's runtime DB is **Azure Postgres**, not Neon. `server/db-cutover` reroutes `DATABASE_URL` to `AZURE_DATABASE_URL` at process start.

**Rule:** Any new table or column must be added to `server/db-migrations.ts` (`NEW_TABLES` for tables, `USERS_COLUMNS`/column arrays for columns) using idempotent `CREATE TABLE IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS`. These run at server startup against the live Azure DB.

**Why:** `npm run db:push` (drizzle-kit) targets the Neon `DATABASE_URL` from the build env, **not** the Azure runtime DB. So schema changes pushed via drizzle-kit never reach production/runtime. Editing only `shared/schema.ts` makes the types compile but the column/table won't exist at runtime → runtime "column/relation does not exist" errors.

**How to apply:** When adding a model, do all three: (1) `shared/schema.ts` (types), (2) `server/storage.ts` (CRUD), (3) `server/db-migrations.ts` (startup DDL). Verify with a direct `psql "$AZURE_DATABASE_URL"` query. Note the startup migration counter log can read "tables created: 0" even when CREATE IF NOT EXISTS just ran — confirm via psql, not the counter.
