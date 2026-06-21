---
name: Production deploy pipeline (web)
description: How the TurboAnswer web app actually reaches Azure prod, and how to verify a deploy from the dev sandbox.
---

# Prod web deploys via GitHub Actions → Azure App Service, NOT Replit Deploy
The live site is the Azure App Service **turboanswergroup** (slot Production). It is
deployed by the GitHub Actions workflow `.github/workflows/main_turboanswergroup.yml`,
which triggers on **push to `main`** of the GitHub repo (origin). So "deploying" =
`git push` to GitHub; the user does NOT use Replit's Deploy button. Replit's
`fetch_deployment_logs` is therefore always EMPTY for this app — do not conclude from
that that prod is down.

**How to verify a deploy actually shipped (from the dev sandbox):** use the GitHub
integration (`listConnections('github')` → token) and call the Actions API:
`GET https://api.github.com/repos/turboanswer/turboanswer9999999/actions/runs`. Check the
newest "Build and deploy Node.js app to Azure Web App - turboanswergroup" run's
`conclusion` and `head_sha`. If the latest commit's run = success, prod has that code.
(api.github.com is reachable from the sandbox.)

# Reaching prod from the sandbox: use the DIRECT azurewebsites.net host, not the custom domain
The custom domain `turboanswer.it.com` is fronted by Cloudflare/WAF bot-protection →
plain fetch/curl gets **403** (looks like "blocked" but it's just bot filtering; a real
browser/screenshot renders fine). BUT the **direct App Service host**
`https://turboanswergroup-dce0g0azd4bnanhs.westus2-01.azurewebsites.net` **IS reachable
from the sandbox** and is NOT behind the WAF. Use it to smoke-test the live deployed app.

**Best live engine smoke test (no auth needed):** the widget endpoints are unauthenticated
and run the SAME Claude engine. POST `/api/widget/conversation` `{domain,userAgent}` → get
`conversationId`, then POST `/api/widget/message` `{sessionId,message,domain}` → a real
Claude answer with HTTP 200 proves the live Azure-Claude path is healthy end-to-end. (Note
the deployed widget validates `sessionId`+`message`; field names have drifted between the
deployed build and the workspace source before — see below.) This is far stronger than the
in-process local repro because it exercises the ACTUAL running deployment.

**Watch for code drift:** the running deployment has at times NOT matched the workspace
source (e.g. deployed `/api/widget/message` expected `sessionId` while workspace source
used `conversationId`). Always trust a live probe over reading local source when diagnosing
prod. Still cross-check the GitHub Actions run `head_sha` vs `origin/main` to see what's
actually shipped.

`origin` = `github.com/turboanswer/turboanswer9999999` (has an embedded PAT in the remote
URL — user should rotate it). Stale decoy repos exist under `tiagotschantret12-dotcom/*`
(no workflows) — do not confuse them for the live repo.

# A GitHub Actions run shows "failure" even when prod deployed fine — check per-JOB, not run conclusion
The workflow has THREE jobs: `build`, `deploy` (→ real app `turboanswergroup`), and
`deploy-fallback` (→ `EMERGECY-FALLBACK-START-EMERGECY-PROTOCAL`, a bogus/non-existent
app name). The fallback job **fails on every run**, which drags the whole run's
`conclusion` to `failure` — but the primary `deploy` job is usually `success`. So a red
run does NOT mean prod failed. Always fetch the run's jobs
(`/actions/runs/{id}/jobs`) and read the `deploy` job's conclusion + its "Deploy to
Azure Web App" step. (Cleanup TODO: delete/fix the fallback job so runs stop showing
false failures.)

# Azure finishes deploys ASYNC — GitHub "success" ≠ code live yet
`azure/webapps-deploy` reports success when the package is handed off; Azure (Kudu
OneDeploy) then swaps wwwroot + restarts the worker minutes later. So a prod error
timestamped a few minutes AFTER the GH job's "success" can still be OLD code serving
during the swap. To see what's ACTUALLY live, list ARM deployments:
`GET {siteBasePath}/deployments` with **api-version 2026-03-15** (older versions 400 in
westus2) → the entry with `active:true` and `status:4` (=success) is the running build;
its `end_time` is when it went live. Also: the running log TAG identifies the code
version (e.g. old `[Router/Azure/gpt-4o-mini-stream]` vs current
`[Router/Azure-OpenAI-stream]`) — a mismatch means prod is behind.

# Strongest live verification: oversized widget message (no auth, exercises the engine)
To prove a context/engine fix is LIVE (not just deployed), POST `/api/widget/conversation`
{domain,userAgent} → `conversationId`, then POST `/api/widget/message`
{sessionId|conversationId, message, domain} with a deliberately HUGE `message`
(~180k tokens of repeated text). 200 = the context-trim fix is live; 400 "maximum context
length" = old code still running. Beats local in-process repro — it hits the real deploy.

# CI already normalizes the lockfile
The workflow has a "Normalize lockfile registry URLs" step that seds
`http://package-firewall.replit.local/npm/` → `https://registry.npmjs.org/` before
`npm install`, so the recurring replit.local lockfile issue does NOT break this CI.
**Why this matters:** don't waste time hand-editing package-lock.json for prod deploys —
CI handles it. (Still an issue for OTHER external CI that lacks that step.)
