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

# The sandbox CANNOT reach the prod URL directly
`curl https://turboanswergroup.azurewebsites.net/...` returns HTTP 000 immediately
(connection blocked by the sandbox egress firewall) — this is NOT prod being down. You
cannot smoke-test the live app over HTTP from dev. Verify prod via the GitHub Actions
run status instead, and reproduce the engine in-process locally (it uses the same Azure
Foundry endpoint+key as prod).

# CI already normalizes the lockfile
The workflow has a "Normalize lockfile registry URLs" step that seds
`http://package-firewall.replit.local/npm/` → `https://registry.npmjs.org/` before
`npm install`, so the recurring replit.local lockfile issue does NOT break this CI.
**Why this matters:** don't waste time hand-editing package-lock.json for prod deploys —
CI handles it. (Still an issue for OTHER external CI that lacks that step.)
