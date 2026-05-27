---
name: Tier gating (TurboAnswer)
description: How to gate routes/features by subscription tier without locking out owner/employee accounts.
---

Tier strings in `user.subscriptionTier` cover paying users (free/pro/research/enterprise) but **do not** mark staff. Owner and employee accounts are detected separately:

- `isOwnerAccount(user)` — defined in `server/routes.ts` (~line 1373), checks email against `OWNER_EMAIL = 'support@turboanswer.it.com'`.
- `(user as any)?.isEmployee === true` — boolean column on the users table.

**Rule:** every server-side tier check must allow both. Canonical form used across `server/routes.ts`:

```ts
const allowed =
  tier === "research" || tier === "enterprise" ||
  isOwnerAccount(user) || (user as any)?.isEmployee === true;
```

**Why:** Staff accounts typically don't carry a paid subscriptionTier, so checking the tier string alone (`['research','enterprise','owner','employee'].includes(tier)`) silently locks staff out of features they're supposed to test. Architect caught this on the devtools AI gate.

**How to apply:** When adding a new gated route, grep `server/routes.ts` for `isOwnerAccount(user)` and copy the surrounding `allowed = ...` expression rather than rolling your own tier check.
