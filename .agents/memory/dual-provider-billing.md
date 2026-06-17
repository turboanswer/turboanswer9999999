---
name: Dual-provider billing safety (Stripe + PayPal)
description: When two payment providers can both hold an active subscription, granting via one MUST cancel/clear the other or users get double-billed.
---

# Dual-provider billing safety

The account model stores BOTH `paypalSubscriptionId` and `stripeSubscriptionId`/`stripeCustomerId` on the user row. They are independent — granting a Stripe tier does NOT touch PayPal fields, and vice versa.

**Rule:** whenever a user is granted a subscription through one provider, cancel + clear any active subscription on the *other* provider in lockstep. Otherwise an existing PayPal subscriber who re-subscribes via Stripe ends up billed by both.

**Why:** the cancel route branches by provider and returns early on the first match (Stripe-first), so a stranded PayPal sub would keep charging forever with no UI path to cancel it.

**How to apply:**
- Every Stripe grant point (the `checkout.session.completed` webhook AND the `/api/sync-subscription` return-flow branch) calls a `migrateOffPaypal(userId)` helper that cancels the PayPal sub via the PayPal API (best-effort) then clears `paypalSubscriptionId` locally.
- The cancel route's Stripe branch also cancels any *lingering* PayPal sub as a safety net before returning.
- UI gating: the "Manage Billing" (Stripe customer portal) button must only render for `provider === 'stripe'` — PayPal-only users hitting `/api/stripe/portal` get a 400 (no `stripeCustomerId`). `/api/subscription-status` now returns a `provider` field (`'stripe' | 'paypal' | null`) for exactly this gating.

**Migration context:** user wanted "Stripe 100%". New checkout (`/api/checkout`) is Stripe-only; PayPal init stays in boot only to read/cancel legacy subs. Stripe enterprise discounts use `allow_promotion_codes` (dashboard coupons), NOT the old PayPal custom price-override. Test keys in dev — going live needs `pk_live`/`sk_live` + live webhook secret + redeploy.
