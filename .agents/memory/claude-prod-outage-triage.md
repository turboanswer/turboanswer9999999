---
name: Claude prod outage triage
description: How to isolate a "Claude failing in prod" SEV to code vs. Azure Foundry / prod App Service config when dev is healthy.
---
When chat returns nothing / "Claude failing all together" in PROD only.

Triage order — if all four are green, the outage is Foundry / Azure-resource / prod
App Service config, NOT code:
1. Fix present in code: `normalizeFoundryEndpoint` applied inside `azureResponsesUrl()`
   (direct-router.ts) — rewrites `cognitiveservices.azure.com` -> `services.ai.azure.com`.
2. CI can deploy: package-lock has 0 `replit.local` URLs AND the deploy workflow has the
   `sed` step normalizing lockfile registry URLs before install (else CI dies as
   "Exit handler never called").
3. Latest deploy actually shipped: GitHub Actions run for the HEAD sha on `main` =
   conclusion `success` (workflow "Build and deploy Node.js app to Azure Web App -
   turboanswergroup"). A green deploy of HEAD means prod runs the whole tree at that
   sha, including every earlier fix commit.
4. Dev is healthy: `callDirect` / `callDirectStream` probes for haiku/sonnet/opus
   return OK; ProactiveDiag failures:0.

If all green, the prod-only failure is environment/infra, fixable only on Azure:
- **2026-06 SEV-A — RESOLVED.** Root cause WAS `AZURE_OPENAI_ENDPOINT` carrying a wrong PATH.
  `azureResponsesUrl()` does `normalizeFoundryEndpoint(endpoint) + "/openai/v1/responses"`, and
  `normalizeFoundryEndpoint` only rewrites the HOST (cognitiveservices→services.ai); it NEVER
  strips the path. The env var must already be the working Foundry PROJECT endpoint
  `https://<res>.services.ai.azure.com/api/projects/<project>` (dev's value). Prod had been set to
  `…/anthropic/v1/messages` → app called `…/anthropic/v1/messages/openai/v1/responses` → 401/404 →
  fell through to (absent) direct Anthropic → `AI_PROVIDERS_UNAVAILABLE`. **Fixed in the portal**
  (App Service app-settings change auto-restarts; no deploy). Verified resolved: prod
  `AZURE_OPENAI_ENDPOINT` now = the `/api/projects/support-9360` form, and a LIVE probe of prod's
  real endpoint+key returned HTTP 200 for ALL three deployments (claude-haiku-4-5 / claude-sonnet-4-5
  / claude-opus-4-8). App Service Running, no VNet (default internet egress).
- **DON'T trust a hand-built HAR/repro after the fact** — a probe that hardcodes the *old* malformed
  URL will still 401 and look like a live outage even though prod is healthy. Always read the LIVE
  prod value via ARM `config/appsettings/list` and probe THAT exact endpoint+key before concluding.
- Azure App Service "Application settings" `AZURE_OPENAI_ENDPOINT` / `AZURE_OPENAI_API_KEY`
  missing/wrong. These live in the Azure portal, NOT Replit/GitHub; dev secrets do not
  propagate to prod.
- Foundry Claude deployments deleted/renamed/quota-exhausted
  (claude-haiku-4-5 / claude-sonnet-4-5 / claude-opus-4-8) -> 404 DeploymentNotFound.
- Azure Foundry resource down / region outage.

**Why:** recurring SEV-A panic that "the code is broken" when code + deploy are already
verified correct; the actual lever is Azure config, not another push.
**How to apply:** the sandbox CAN reach the raw App Service host directly —
`https://<app>.<region>.azurewebsites.net/api/auth/user` returns 401 (app up) — but the
Cloudflare-fronted custom domain (turboanswer.it.com) returns 403 "Just a moment…". The most
decisive check is an ARM probe from the dev sandbox: SP creds (AZURE_TENANT_ID/CLIENT_ID/
CLIENT_SECRET/SUBSCRIPTION_ID/RESOURCE_GROUP/APP_SERVICE_NAME are all present in dev) →
`POST .../config/appsettings/list` for the live endpoint+key → POST that endpoint's
`/openai/v1/responses` with the haiku/sonnet/opus deployment names. NOTE: this resource's
App Insights component + Log Analytics workspace are NOT in this subscription (resource list
returns none), so KQL telemetry is unavailable here — rely on the ARM appsettings read + live
Foundry probe instead.
