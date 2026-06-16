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
- **CONFIRMED root cause of the 2026-06 SEV-A — `AZURE_OPENAI_ENDPOINT` value carried the
  wrong PATH.** `azureResponsesUrl()` does `normalizeFoundryEndpoint(endpoint) + "/openai/v1/responses"`,
  and `normalizeFoundryEndpoint` only rewrites the HOST (cognitiveservices→services.ai); it
  NEVER strips the path. So the env var must already be the working Foundry PROJECT endpoint
  `https://<res>.services.ai.azure.com/api/projects/<project>` (dev's value) — appending
  `/openai/v1/responses` then yields a valid project Responses URL. Prod had it set to
  `https://<res>.services.ai.azure.com/anthropic/v1/messages`, so the app called
  `…/anthropic/v1/messages/openai/v1/responses` → 404 → fell through to (absent) direct
  Anthropic → `AI_PROVIDERS_UNAVAILABLE` for EVERY chat. Fix = set prod's `AZURE_OPENAI_ENDPOINT`
  equal to dev's `/api/projects/<project>` form; no code change, App Service restarts on save.
  Matches Azure's "requests don't reach Foundry": they 404 at a bogus path, never hit the deployment.
- Azure App Service "Application settings" `AZURE_OPENAI_ENDPOINT` / `AZURE_OPENAI_API_KEY`
  missing/wrong. These live in the Azure portal, NOT Replit/GitHub; dev secrets do not
  propagate to prod.
- Foundry Claude deployments deleted/renamed/quota-exhausted
  (claude-haiku-4-5 / claude-sonnet-4-5 / claude-opus-4-8) -> 404 DeploymentNotFound.
- Azure Foundry resource down / region outage.

**Why:** recurring SEV-A panic that "the code is broken" when code + deploy are already
verified correct; the actual lever is Azure config, not another push.
**How to apply:** the Replit sandbox cannot reach prod (azurewebsites.net = HTTP 000;
custom domain WAF returns 403), and Replit deployment logs are empty (prod is Azure, not
Replit Deploy). Read real prod telemetry via `server/services/azure-infra.ts`
(App Insights / Log Analytics KQL — needs SP env AZURE_TENANT_ID/CLIENT_ID/CLIENT_SECRET
plus RBAC) or the in-app owner-only Azure Infra Control Center.
