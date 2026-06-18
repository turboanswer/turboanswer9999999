---
name: Optional 2FA offer flow
description: How to offer (not force) 2FA after sign-in without losing the Login/Register screen
---

To OFFER optional 2FA after a successful sign-in/registration (a "Set up 2FA? / Maybe later" prompt) while staying on the Login/Register page:

- The server grants the session immediately (`session.userId`) and returns a flag like `twoFactorOffer: true` instead of forcing enrollment.
- The client must NOT invalidate the `/api/auth/user` query when it shows the offer step. Invalidating flips `isAuthenticated`, App.tsx swaps to AuthenticatedRouter, and the Login/Register component unmounts mid-decision.
- Because the session cookie is already set server-side, authenticated endpoints (e.g. `POST /api/2fa/start-setup`, `/api/2fa/verify-setup`) work fine even before the query is invalidated.
- Only invalidate + navigate once the user picks "Maybe later" (completeLogin/handle2faVerified) or finishes setup.

**Why:** routing in App.tsx is gated purely on `isAuthenticated`; the auth query has `staleTime: 0`, so any premature invalidation (or background refetch) drops the user out of the auth screens before they can answer the prompt.

**How to apply:** any "post-login interstitial" on the unauthenticated routes (2FA offer, onboarding, plan pick) follows the same rule — defer the auth-query invalidation until the interstitial is done.

Enrolled-2FA accounts are unchanged: `/api/login` still returns `twoFactorRequired` and only sets `pending2faLoginUserId` (NO session grant) until `/api/2fa/login` passes — do not weaken that branch.

Login resume-after-refresh: the 2FA code-entry step persists a short-lived `localStorage` timestamp and restores the step on mount (cleared on Back/success); server still holds the pending login session, so a stale flag just shows the code screen and a wrong/expired code fails loudly rather than stranding the user.
