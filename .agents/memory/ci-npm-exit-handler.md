---
name: CI "Exit handler never called" npm crash
description: GitHub Actions deploy/android builds failing inside npm itself during install — cause and fix.
---

Symptom: both `main_turboanswergroup.yml` (Azure web deploy) and `android-build.yml` started failing with `npm error Exit handler never called!` during the dependency-install step. Downstream symptoms vary (e.g. `sh: 1: vite: not found`, exit 127) because deps never finished installing. The app code is NOT the cause — the local production build (`npm run build`) succeeds.

**Why:** This is an npm internal crash on GitHub-hosted runners (intermittent; commonly an npm-version regression after a runner-image update, sometimes memory pressure). It hit both Node 20 and Node 22 jobs at once, which is why it looked like a deploy failure rather than a code bug. It appeared even though no dependencies changed — a prior identical workflow had deployed fine weeks earlier.

**How to apply / fix:** Harden the install step in the workflow YAML (do NOT change app code):
- Pin npm to a stable version before installing: `npm i -g npm@10.9.2`.
- Retry the install to absorb transient crashes: `npm ci ... || npm ci ... || npm i ...`.
- Give the build memory headroom: `env: NODE_OPTIONS: --max-old-space-size=4096`.
Note: `main_turboanswergroup.yml` uses CRLF line endings — preserve them when editing (the `edit` tool's LF strings won't match; patch via a script that keeps the file's existing newline). `android-build.yml` is LF. The real Android workflow is `android-build.yml`; `build-android-apk.yml` is a disabled stub (`if: false`).

To diagnose CI failures without the user pasting logs: use the installed GitHub connection (`listConnections('github')` → `access_token`) and the Actions REST API (`/actions/runs`, `/actions/runs/{id}/jobs`, `/actions/jobs/{id}/logs`). Repo is `turboanswer/turboanswer9999999`, branch `main`.
