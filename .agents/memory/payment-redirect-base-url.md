---
name: Payment redirect base URL
description: How Stripe/PayPal return URLs must be built so users stay logged in and can't be phished.
---

# Payment redirect base URL (Stripe / PayPal return pages)

Building Stripe/PayPal success/cancel/portal/return URLs from `req.get('host')`
is broken in prod and was the cause of "pay on Stripe → bounced to the raw
azurewebsites.net URL → logged out → tier never upgrades".

## The rule
A single helper (`getPublicBaseUrl(req)` in `server/routes.ts`) builds every
payment return URL. It must satisfy BOTH constraints:

1. **Correctness — never return the raw `*.azurewebsites.net` host.** The login
   session cookie is scoped to the custom domain (`turboanswer.it.com`).
   Returning the browser to the Azure origin = different origin = cookie not
   sent = user looks logged out = `/api/sync-subscription` 401 = no upgrade.
2. **Security — only ever return an ALLOWLISTED host.** These values become the
   Stripe/PayPal redirect URLs, so trusting raw `Origin`/`Referer`/`Host`
   without validation is an open-redirect / phishing vector. Validate every
   candidate (origin → referer → host) against a fixed allowlist
   (canonical domain + `PUBLIC_APP_URL` + `REPLIT_DOMAINS` + known owned hosts;
   localhost allowed for dev only), else fall back to the canonical domain.

**Why:** prod is Azure App Service fronted by Cloudflare; the proxied `Host`
can arrive as the Azure host even though the user is on `turboanswer.it.com`.
The browser-set `Origin`/`Referer` carry the real domain (proxies forward them
unchanged) but are attacker-controllable, hence the allowlist.

**How to apply:** any new checkout/billing/return flow must use
`getPublicBaseUrl(req)` — never re-derive a base URL from `req.get('host')`.
Set `PUBLIC_APP_URL` in the Azure app config to make it deterministic.

## Related, still-true
- The Stripe webhook (`checkout.session.completed`) is the durable upgrade
  backup but only works if `STRIPE_WEBHOOK_SECRET` is set in the Azure config;
  if it's missing the webhook 503s and the sync-on-return path is the only
  thing that upgrades — which is exactly why keeping the user logged in matters.
- See `cookie-samesite-dual-origin.md` for why the cookie is origin-scoped.
