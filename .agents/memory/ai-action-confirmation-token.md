---
name: AI action confirmation tokens
description: Side-effect AI actions (send email, create event) must be bound to a server-signed proposal token, not trusted from the client.
---

# AI action confirmation must be enforced server-side

When the AI proposes a side-effect action (send email, create calendar event,
etc.) behind a "confirm" UI card, the execute endpoint must NOT trust a raw
client `{provider, action, args}` payload. A UI confirm card is not a security
control — any authenticated user can POST directly to the execute route and run
the action without ever seeing the card.

**The rule:** when the server proposes an action, mint a short-lived HMAC token
bound to `{userId, provider, action, sha256(canonical args), expiry, nonce}`
(key derived from `CRISIS_ENCRYPTION_KEY`). Send it in the proposal. The execute
route requires the token and re-verifies: timing-safe signature, not expired,
`payload.userId === caller`, provider+action match, args-hash match, single-use
nonce. 403 otherwise.

**Why:** code review flagged that confirmation was UI-only and bypassable — a
confirmation-bypass on an endpoint that sends real email / writes calendars.
The signed token makes "the AI actually proposed this, for this user, with
these exact args" a cryptographic fact, not a client claim.

**How to apply:** any NEW connected-account action (or any future "AI does X on
your behalf" endpoint) must go through `signActionProposal` /
`verifyActionProposal` in `server/services/connected-accounts/tools.ts`. Don't
add an action that executes from a bare client body.

**Known limitation:** the single-use nonce set is in-process. For multi-instance
prod, move replay state to shared storage (DB/Redis) for cluster-wide single-use.
The signed token + short TTL is still the primary control regardless.
