---
name: Reaching Azure prod DB from the sandbox + cross-DB data copy
description: How to reach the Azure prod Postgres directly from the Replit sandbox, and the robust way to bulk-copy data between two managed Postgres (e.g. Neon -> Azure).
---

# Reaching Azure prod Postgres from the dev sandbox

The Azure runtime/prod Postgres CAN be reached directly from the Replit dev sandbox
**if** the user allowlists the sandbox's current outbound IP on the Azure Postgres
firewall. This qualifies the older "prod DB is unreachable from dev" note — that holds
only while the firewall blocks the sandbox.

**How to do it:**
- Get the sandbox egress IP: `curl -4 -s https://api.ipify.org` (two services agree; no IPv6).
- User adds an Azure firewall rule (Portal -> the Postgres server -> Settings ->
  Networking): ensure **Public access** is enabled (not Private/VNet only), then add a
  rule with start IP = end IP = that egress IP.
- **Why it breaks again:** the sandbox egress IP changes on workflow/sandbox restart, so
  a single-IP rule goes stale and the dev app's Azure connection times out. For a one-off
  job, allowlist the current IP and finish in one go; or temporarily use
  `0.0.0.0`–`255.255.255.255` (allow all) during the job and delete it after.
- Connect with `new Pool({connectionString, ssl:{rejectUnauthorized:false}, connectionTimeoutMillis:~18000})`.
  psql also works (sslmode=require => encrypt, no CA verify). Never print the conn string.

# Bulk-copying data between two managed Postgres (Neon -> Azure)

**Why:** node-pg parameterized inserts mis-serialize jsonb-arrays (sent as Postgres
array literals) and pg_dump aborts on a server-version mismatch. The reliable path is
psql `\copy` (text COPY format) — version-independent and type-exact.

**How to apply (small data, both reachable from the sandbox):**
1. Compare schemas first: list shared tables, per-table column intersection (some prod
   tables have extra columns), and FK edges (for load order + cascade-truncate safety).
2. Back up the destination rows you will touch to a local JSON file before writing.
3. Per source table (rows>0): `\copy (SELECT <quoted intersection cols> FROM "t") TO '/tmp/data_t.dat'`.
4. Build ONE atomic script: `TRUNCATE <targets> RESTART IDENTITY CASCADE;` then
   `\copy "t"(<cols>) FROM '/tmp/data_t.dat'` per table in **FK-topological order**
   (parents before children), then `setval(pg_get_serial_sequence('t','col'), MAX(col))`.
5. Run it with `psql "$DEST" -v ON_ERROR_STOP=1 --single-transaction -f combined.sql`
   so it's all-or-nothing. Reference conn strings as shell `$VARS` (pass `env:process.env`)
   so the value never lands in logged command text.
6. Verify row counts source vs dest afterward.

**Gotchas:**
- `session_replication_role = replica` to disable FK checks needs superuser — the Azure
  Flexible Server admin role is NOT superuser, so use topo-ordered load instead.
- TRUNCATE ... CASCADE silently empties external tables that FK into your targets; compute
  the cascade closure and abort if any non-target victim has rows.
- "Replace junk" judgement call: tables with dest rows but 0 source rows may be NEW data
  the user created on the new setup (api_keys, workgroups, admin_invite_tokens) — clearing
  them is destructive; keep the backup and tell the user.
