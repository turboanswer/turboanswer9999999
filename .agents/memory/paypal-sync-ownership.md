---
name: PayPal tier-sync ownership (IDOR)
description: Why /api/sync-subscription must bind a subscription to its owner and never trust a client tier.
---

# PayPal subscription → tier elevation must be ownership-bound

## The rule
When elevating a user's `subscriptionTier` from a PayPal subscription, the server must:
1. Read the subscription from PayPal (`getSubscriptionDetails`).
2. Parse `custom_id` (set at checkout as `{ userId, tier }` in `server/paypal.ts`).
3. **Require `custom_id.userId === caller userId`** before doing anything. Reject 403 otherwise.
4. Take the tier **only** from `custom_id.tier`, validated against `['pro','research','enterprise']`. Never from a client-supplied `expectedTier`/price.

This applies to both the body-supplied `subscriptionId` branch *and* the stored
`user.paypalSubscriptionId` branch of `/api/sync-subscription`, plus any future
endpoint that maps a PayPal subscription to a tier.

## Why
`/api/sync-subscription` originally accepted any `subscriptionId` from the request
body and upgraded the *current* user based on that subscription's status — with no
check that the subscription belonged to the caller. That's an IDOR: a free user
could pass any ACTIVE subscription id (their own from another account, or a leaked
one) and self-elevate without paying. It also trusted a client `expectedTier`,
letting the client pick the tier. This was the same "no payment → higher tier"
class of bug the billing fix was meant to close.

## How to apply
The authoritative ownership signal is PayPal's `custom_id`, which only the server
sets at checkout — the client cannot forge it. Bind on that, not on the user's
stored id alone. Checkout (`/api/checkout`) must never set a paid tier directly;
tier only changes after PayPal confirms ACTIVE/APPROVED here or via the webhook.
