---
name: CI npm install fails — Replit firewall URLs baked into package-lock
description: GitHub Actions (or any external CI) npm install dies because package-lock.json contains package-firewall.replit.local URLs. Recurs on every dependency add.
---

**ROOT CAUSE (confirmed).** When you add/install an npm dependency inside the Replit environment, Replit's package proxy rewrites the `resolved` field of the NEW lockfile entries to `http://package-firewall.replit.local/npm/...` instead of `https://registry.npmjs.org/...`. That host only exists inside Replit. On GitHub-hosted runners (or any external CI) it does not resolve, so `npm ci`/`npm install` fails with `EAI_AGAIN getaddrinfo package-firewall.replit.local`. npm then prints its generic wrapper `Exit handler never called!` and exits 1, which HIDES the real EAI_AGAIN error in the Actions log (it's only in `~/.npm/_logs/*-debug-0.log` on the runner).

**THE FIX:** rewrite the polluted URLs in package-lock.json back to the public registry, then commit:
`sed -i 's#http://package-firewall\.replit\.local/npm/#https://registry.npmjs.org/#g' package-lock.json`
Integrity hashes stay valid because the proxy mirrors npmjs.org byte-for-byte. Verify zero remain: `rg -c 'package-firewall' package-lock.json` and that every `"resolved"` host is `registry.npmjs.org`.

**RECURRENCE GUARD (now in place):** both `.github/workflows/main_turboanswergroup.yml` and `android-build.yml` have a "Normalize lockfile registry URLs" step that runs the sed above on the runner BEFORE install (ephemeral, not committed). So even if a new dep re-pollutes the lock, CI self-heals. Keep that step; if it's ever removed and a dep is added in Replit, the failure returns.

**HOW TO RECOGNIZE / WHEN IT RECURS:** any time someone adds a dependency in Replit and then deploys via the GitHub Actions workflows, the new transitive packages will carry the firewall URL. The deploy/Android build will fail at the install step. The CI log shows only `Exit handler never called!`; do NOT chase memory/npm-version/retry theories — grep the lockfile for `package-firewall.replit.local` FIRST.

**Dead ends already tried (don't repeat):** pinning npm version + retry loop; npm@11 upgrade; adding 6G swap (runner had 14Gi free RAM, never OOM); NODE_OPTIONS heap bump. None mattered — it was never memory or an npm bug.

**Diagnosis tip:** to surface the hidden error without local repro, temporarily wrap the install step to dump the runner debug log on failure (`... || { tail -n +1 ~/.npm/_logs/*-debug-0.log; exit 1; }`). That's how the EAI_AGAIN was found. Local repro is impossible from the Replit shell because the same firewall blocks downloads (e.g. 403 on es5-ext protestware) before install can finish.

**File edit gotcha:** `main_turboanswergroup.yml` uses CRLF endings (the `edit` tool's LF strings won't match — patch via a script that preserves the file's newline). `android-build.yml` is LF. Real Android workflow is `android-build.yml`; `build-android-apk.yml` is a disabled stub (`if: false`).

**CI access:** GitHub token via `listConnections('github')[0].settings.access_token`; Actions REST API `/actions/runs`, `/runs/{id}/jobs`, `/jobs/{id}/logs`. Repo `turboanswer/turboanswer9999999`, branch `main`.
