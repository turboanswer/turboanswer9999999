---
name: Cookie SameSite — web vs native app
description: Why session + CSRF cookies must pick SameSite per request origin (web same-origin vs native cross-origin)
---

# SameSite must be chosen per request origin

The app is served two different ways, with opposite cookie requirements:

- **Web** (turboanswer.it.com, via Cloudflare → Azure): the page and the API are
  the **same origin**. Cookies should be `SameSite=Lax`. Lax is sent on
  same-site requests and avoids browser third-party-cookie blocking.
- **Native app** (Capacitor): the installed APK loads bundled assets at
  `https://localhost` (iOS `capacitor://localhost`) and calls the **Azure API
  cross-origin**. Cross-site cookies are ONLY sent when `SameSite=None; Secure`.
  `client/src/lib/api-base.ts` hardcodes `API_BASE = AZURE_BACKEND` for native,
  and `server/index.ts` has a CORS block for `NATIVE_ORIGINS`
  (https/capacitor/http/ionic ://localhost) with Allow-Credentials.

**Why this matters:** setting one global SameSite breaks one client.
`None` for everyone risks third-party-cookie blocking on web; `Lax` for everyone
makes the native cross-site requests drop the `_csrf_token` and session cookies,
so login fails **in the app only** (CSRF returns 403, surfaced as a login error).

**How to apply:** choose SameSite by `req.headers.origin`.
- CSRF cookie: `server/index.ts` `csrfCookieOptionsFor(req)` → None+Secure when
  origin ∈ NATIVE_ORIGINS, else Lax.
- Session cookie: express-session's static cookie defaults to Lax; a middleware
  right after `app.use(getSession())` in `replitAuth.ts` flips
  `req.session.cookie.sameSite='none'; .secure=true` for native origins
  (express-session serializes `req.session.cookie` at response time, so a
  per-request mutation works).

**Trap:** `capacitor.config.ts` sets `server.url = <azure>` (which would be
same-origin), but the installed APK behaves cross-origin from `https://localhost`
— proven because switching to Lax broke the app. The per-origin fix is robust to
either model. CSRF here is a stateless double-submit cookie (header must equal
cookie), so the cookie MUST round-trip; verify login with
`curl -H "Origin: https://localhost"` (expect 401 invalid creds, not 403).

**Deploy:** the native app loads the **Azure** site, which is a separate deploy
from the Replit publish — server cookie changes need Azure redeployed to reach
the app.
