---
name: Provisioning privileged roles into the prod DB
description: Why role/seed data that must exist in production can't be written from the dev shell, and the app-level pattern that works instead.
---

# Provisioning privileged roles / seed data into production

The production deployment connects to its **own** database — distinct from every
dev secret (DATABASE_URL, NEON_DATABASE_URL, AZURE_DATABASE_URL). That prod DB is
**not reachable** from the dev shell, and the database skill's production queries are
**read-only**. So you cannot seed or fix a prod row (e.g. flip a user's role flag) by
writing to any dev DB or by running SQL against prod.

**Symptom that reveals this:** a live login returns different field values than the
same account shows in every dev DB (e.g. live receptionist came back firstName
"support"/isReceptionist=false while all dev DBs showed the receptionist as
isReceptionist=true). Different data == different database.

**The pattern that works:** auto-provision at the application layer on login. Keep an
email allowlist (e.g. `RECEPTIONIST_EMAILS`) and, in the `/api/login` handler, after a
successful password check, `upsertUser({ isReceptionist: true })` for allowlisted
emails — mirroring the existing `ADMIN_EMAILS -> isEmployee` grant. This writes to
*whatever* DB the running app uses, so it self-heals in prod after deploy. It only
takes effect once republished, and the user must then log in once to trigger it.

**Why:** manual DB seeding is impossible across the dev/prod DB boundary here; the
login-time grant is the only path that touches the prod DB.

**Security guardrail:** the login grant is safe only because it runs *after* password
auth on an existing account. The matching risk is the **registration** path: if an
allowlisted privileged email is unclaimed, someone could self-register it and then get
the role on next login. Admin emails are intentionally self-registerable (register
grants admin to `ADMIN_EMAILS`), but receptionist is pre-provisioned only — so
`/api/register` must reject any `RECEPTIONIST_EMAILS` address. Broader hardening
(mailbox verification / MFA before any allowlist grant) is a known pre-existing gap for
the admin model too, out of scope for a single role fix.
