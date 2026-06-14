---
name: Prod-only "file not found" — esbuild doesn't bundle standalone assets
description: Routes that fs.readFile a non-JS asset (e.g. server/azure-infra/dashboard.html) work in dev but 500 in prod because esbuild bundles to dist/ and __dirname shifts.
---

**Symptom:** a page/feature works locally but returns 500 / "unavailable" / blank ONLY in the deployed Azure build. Classic example: the owner Azure ops panel at `/admin/infra` ("Dashboard unavailable").

**Root cause:** the server build is `vite build && esbuild server/index.ts --bundle --outdir=dist`. esbuild bundles all server TS into `dist/index.js` but does NOT copy standalone assets (e.g. `*.html`). Any route that reads such an asset via a path built from `__dirname`/`import.meta.url` breaks: in dev `__dirname` = the source folder (e.g. `server/routes/`), in prod `__dirname` = `dist/`. So `path.resolve(__dirname, "..", "azure-infra", "dashboard.html")` resolves to `server/azure-infra/...` in dev (correct) but `<root>/azure-infra/...` in prod (wrong).

**Why prod still has the file at all:** the Azure deploy workflow ships `package: .` (the WHOLE repo), so `server/azure-infra/dashboard.html` IS on the server at `<approot>/server/azure-infra/dashboard.html` — just not where the bundled code looks. cwd at runtime = approot (`npm start` = `node dist/index.js`).

**Fix used:** resolve the asset against MULTIPLE candidate paths and serve the first that exists (cache the winner). Include a `process.cwd()`-relative candidate (`<cwd>/server/azure-infra/dashboard.html`) which is correct in prod, plus the `__dirname`-relative one for dev. Log the error in the catch so prod failures are diagnosable. Do NOT change package.json's build script (forbidden) — a multi-candidate resolver needs no build/workflow change.

**When this recurs / how to scan:** any new server route that does `fs.readFile`/`sendFile` on a non-JS file under `server/` will have the same prod-only break. Grep `rg -n "readFile|sendFile" server/` and confirm each path has a cwd-relative fallback or the asset is otherwise guaranteed in dist.

**Note on timeline:** this surfaced only after the CI lockfile bug (see ci-npm-exit-handler.md) was fixed — deploys had been failing, so prod never received the azure-infra feature until the first green deploy, which then immediately exposed this second, independent bug.
