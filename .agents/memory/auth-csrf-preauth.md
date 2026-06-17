---
name: Pre-auth endpoints must be CSRF-exempt
description: Why sign-up/verification/reset codes silently fail to send, and the CSRF + rate-limit interaction behind it
---

# Pre-authentication endpoints must be CSRF-exempt

Global CSRF middleware (`server/index.ts`) enforces a double-submit cookie+header
(`_csrf_token` cookie must equal `x-csrf-token` header) on every mutating `/api`
request except an exempt list. The client auto-attaches the header via a
`window.fetch` override (`client/src/lib/queryClient.ts`).

**Symptom:** "login won't send a code" / "verification email never arrives" — but
Brevo is fine. Root cause is the request being rejected `403 CSRF token missing`
*before* it ever calls the email sender. Login itself sends NO code (plain
email+password); only sign-up verification and password reset send codes.

**Rule:** pre-session endpoints (login, register, email/sms send-verification +
verify, forgot-password, verify-reset-otp, reset-password) must be in the CSRF
exempt set. CSRF protects an *existing* logged-in session, so it adds no security
before a session exists — but the CSRF cookie does NOT reliably round-trip on the
published site or the cross-origin native (Capacitor → Azure) app, so it silently
blocks the flow there even though dev/web sometimes works.

**Why:** the double-submit cookie depends on `_csrf_token` (SameSite chosen per
origin: Lax web / None native) actually sticking; cross-origin + third-party
cookie blocking make that fragile. Backend + Brevo were proven working when a
token IS present (200 + email dispatched), so the failure is purely token
delivery.

**How to apply:**
- Use exact-path matching for fixed exempt routes, prefix matching only for true
  namespaces (`/api/widget/`, `/api/devtools/`) — `startsWith` on `/api/login`
  would also exempt a future `/api/login-admin`.
- Compensating control after removing CSRF = rate limiting. Watch for mis-mounted
  limiters: the limiters were mounted on `/api/auth/login` and `/api/auth/register`
  but the real routes are `/api/login` and `/api/register` (no `/auth/`), so they
  never applied. forgot-password/reset-password ARE under `/api/auth/`.
- Verification-code senders also need a per-IP throttle (not just the per-email
  in-memory limit) once CSRF is off, to stop email/SMS amplification.
- Do NOT add strict Origin/Sec-Fetch-Site enforcement on these — it risks
  re-breaking the cross-origin native app, the exact thing being fixed.
