---
name: Azure runtime DB vs db:push/sandbox
description: The running app uses the Azure DB, but db:push and the code_execution executeSql hit a different (Neon) DB — schema/data changes must target Azure.
---

At startup `server/db-cutover.ts` overrides `process.env.DATABASE_URL` with the `AZURE_DATABASE_URL` secret (logged as `[db-cutover] ... routing DATABASE_URL to Azure`). So the live app talks to the Azure Postgres, NOT the default Neon DB.

**Why it bites:** `npm run db:push` (drizzle.config reads the pre-override `DATABASE_URL`) and the `code_execution` `executeSql` helper both connect to the default Neon DB. Changes applied there are invisible to the running app, producing runtime errors like `column "x" does not exist` even though the push "succeeded".

**How to apply:**
- To add a column/table for the live app, add it to the curated startup migration `server/db-migrations.ts` (`USERS_COLUMNS` / `EXTRA_TABLE_COLUMNS` / `NEW_TABLES`, all `ADD COLUMN IF NOT EXISTS`). Restarting the app runs it against Azure. This is the project's intended pattern (prod DBs never get `drizzle-kit push`).
- Do NOT run `db:push --force` against Azure to fix drift — drizzle-kit wants destructive constraint drops because Azure's schema differs from the Drizzle model.
- To run one-off SQL/seed against the live DB, run a script with `DATABASE_URL="$AZURE_DATABASE_URL" node script.mjs` (pass the secret by env-var name, never print its value).
- Session cookies are `secure: true` + `sameSite: none` + `trust proxy`, so curl over plain `http://localhost` gets NO session cookie. Add `-H "X-Forwarded-Proto: https"` to simulate the Replit proxy when testing login via curl.
