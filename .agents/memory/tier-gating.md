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

## Model selection must be clamped server-side, not just in the UI

`generateAIResponse(...)` (`server/services/multi-ai.ts`) routes purely by the `selectedModel` string with **no tier check**: research aliases `claude-research`/`enterprise-research`/`matrix-research` hit the paid research/Deep-Think branch, and pro aliases `gemini-pro`/`gpt-4o`/`claude-sonnet-4` hit the paid Pro branch. The chat UI gates the model dropdown, but the legacy `/api/conversations/:id/messages` route accepts a client-supplied `selectedModel`, so a free user can POST a paid alias and bypass payment.

**Rule:** any route that forwards a client model choice into `generateAIResponse` must clamp it to the user's entitlement (`canPro` / `canResearch`, staff = owner||employee) and also gate `deepThink` on `canResearch`. Cover **all** aliases in both the pro and research sets, not just `gemini-pro`.

**Why:** UI-only gating is trivially bypassed; this is a billing/access-control hole. The main streaming path (`/messages/stream`) is safe because it ignores client model and calls `runReasoning({ tier })`.

**Note:** the unauthenticated B2B widget route `/api/widget/message` intentionally calls `generateAIResponse(..., 'free', 'gemini-pro')` — that is a separate paid product surface, not the in-app free-user path.
