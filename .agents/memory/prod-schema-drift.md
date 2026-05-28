---
name: Prod schema drift via db-migrations.ts
description: Production Azure Postgres only gets schema changes from the in-app `ensureDatabaseSchema()` migration on startup — it never runs `drizzle-kit push`. New tables must be added to `NEW_TABLES` in `server/db-migrations.ts`, not just defined in `shared/schema.ts`.
---

When a new Drizzle table works in dev but errors in production with `relation "<name>" does not exist`, the root cause is that production never ran `npm run db:push`. The deployed Azure Web App only executes the in-app migration in `server/db-migrations.ts::ensureDatabaseSchema()` on boot, and that file historically only handled column ADDs and NOT NULL relaxations.

**Rule:** any new table added to `shared/schema.ts` must also be appended to the `NEW_TABLES` array in `server/db-migrations.ts` with an idempotent `CREATE TABLE IF NOT EXISTS …` DDL. The migration runs on every startup, so the table will be created the next time prod boots.

**Why:** dev uses `npm run db:push` which Drizzle handles, but prod has no such hook — the in-app migration is the only path to apply schema changes without manual psql. Forgetting this causes silent prod-only 500s that don't reproduce in dev (which is exactly how `stack_trace_diagnoses` slipped through).

**How to apply:** when adding a new `pgTable()` definition, add a matching entry to `NEW_TABLES`. For ALTER-style changes use `EXTRA_TABLE_COLUMNS` or `NULLABLE_COLUMNS`. Never assume `drizzle-kit push` ran in prod.
