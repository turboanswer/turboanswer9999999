---
name: Connected accounts (Gmail + Calendar) OAuth
description: How per-user Google/Microsoft email+calendar connections work and the external redirect-URI dependency that gates them in prod.
---

# Connected accounts = "email and calendar connections"

The app's email + calendar "connections" are one feature: per-user Google/Microsoft OAuth (connected-accounts service), NOT the native device calendar and NOT signup email verification. Connecting a Google account grants the AI read access to the user's Gmail + Calendar (and write via signed confirmation tokens). UI lives under `/ai-settings`; the AI auto-invokes the tools via a pre-flight intent classifier (no manual "search my calendar" button).

**Why this matters:** "do the email and calendar connections" almost always means this connected-accounts feature, not Task #20 signup verification — don't rebuild either; both already exist and have all secrets set.

## External dependency that silently blocks connect in prod
`getRedirectUri()` derives the OAuth callback from the live request host: `https://<host>/api/connections/<provider>/callback`. Because the app is a thin WebView loading the **Azure** host at runtime (and also serves `turboanswer.it.com`), the OAuth callback host in production is the Azure/custom domain — NOT a replit domain.
**How to apply:** if "Connect Google/Microsoft" fails in prod with redirect_uri_mismatch, the fix is in the Google Cloud Console / Microsoft Entra app registration (add the exact prod callback URL), not in code. Required secrets (all present): GOOGLE_OAUTH_CLIENT_ID/SECRET, MICROSOFT_OAUTH_CLIENT_ID/SECRET, plus CRISIS_ENCRYPTION_KEY for signing write-actions and token encryption at rest.
