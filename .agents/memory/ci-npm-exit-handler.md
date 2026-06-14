---
name: CI "Exit handler never called" npm crash
description: GitHub Actions deploy/android builds failing inside npm itself during install — diagnosis trail and what did/didn't work.
---

Symptom: both `main_turboanswergroup.yml` (Azure web deploy) and `android-build.yml` fail during the dependency-install step with `npm error Exit handler never called!` (exit 1). In the CI log there is ~65s of total silence after the deprecation warnings, then the crash. Downstream Android symptom `sh: 1: vite: not found` (exit 127) is just a consequence of deps never installing. App code is fine — local `npm run build` succeeds.

**Key fact — this wrapper hides the real error.** "Exit handler never called!" is npm's generic catch-all; the actual cause (ENOMEM / ENOSPC / ETARGET / killed / etc.) only lives in `~/.npm/_logs/*-debug-0.log` on the runner, which is NOT printed to the Actions log and NOT uploaded as an artifact. So you MUST instrument the workflow to `cat` that debug log on failure to learn the true cause.

**Regression correlation:** last GREEN build was 2026-06-02 (no `@azure/identity`). The crash began the moment `@azure/identity@^4.13.1` was added (the "Azure infrastructure control panel" feature), which grew package-lock by ~390 lines (~30 transitive pkgs: @azure/*, @azure/msal-*, @typespec/ts-http-runtime, jsonwebtoken, open, default-browser, run-applescript, wsl-utils, lodash.*). None of the new packages have install scripts. That's the only dependency delta vs green.

**Cannot fully reproduce locally:** Replit's package firewall (`package-firewall.replit.local`) returns 403 "Blocked by Security Policy" for `es5-ext@0.10.64` (flagged as protestware by Socket). es5-ext is a PRE-EXISTING transitive dep (present at the green build too), so the 403 is a local-env-only artifact — NOT the CI failure — but it masks everything downstream so a local `npm ci` can never finish. GitHub runners use the public registry and install es5-ext fine.

**What did NOT fix it:** pinning npm to 10.9.2 + a retry loop (`npm ci || npm ci || npm i`). All 3 attempts crashed identically. Retries can't help a deterministic failure.

**Current attempt (outcome pending):** in BOTH workflows — (1) upgrade npm to current major `npm i -g npm@11` (documented workaround for this npm bug), (2) add 6G swap via fallocate before install (covers OOM), (3) wrap install so on failure it dumps `free -h`, `df -h /`, and `~/.npm/_logs/*-debug-0.log` then exits 1 (guarantees the real error surfaces next run), (4) moved `NODE_OPTIONS=--max-old-space-size=4096` to build-only (raising heap ceiling during install can worsen OOM). If it still fails, read the dumped debug log for the true error code.

**File edit gotcha:** `main_turboanswergroup.yml` uses CRLF line endings — the `edit` tool's LF strings won't match; patch via a script that preserves the file's existing newline. `android-build.yml` is LF. Real Android workflow is `android-build.yml`; `build-android-apk.yml` is a disabled stub (`if: false`).

**Diagnose CI without user pasting logs:** GitHub connection token via `listConnections('github')[0].settings.access_token`; Actions REST API `/actions/runs`, `/runs/{id}/jobs`, `/jobs/{id}/logs` (plain text). Repo `turboanswer/turboanswer9999999`, branch `main`. The runner debug log is the one thing the API can't give you — only workflow instrumentation can.
