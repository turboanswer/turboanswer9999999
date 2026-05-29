---
name: Code Studio multi-file model
description: How TurboAnswer Code Studio stores/serves multi-file projects and why generation splits a single HTML
---

# Code Studio multi-file architecture

Projects are stored as an array of files (`index.html` + optional `styles.css` + `app.js` …) in the `codeProjects.files` JSONB column.

**Serving/preview already re-inline local assets.** Both the server `buildProjectHtml` and the client `buildSrcdoc` replace `<link href="styles.css">` with `<style>…</style>` and `<script src="app.js">` with inline `<script>…</script>`. So a published page / iframe srcdoc is always one combined document; the separate files exist only for editing/storage.

**Generation works on one HTML internally, then splits.** The AI pipeline (Claude prefill, foundation-CSS injection, lint, long-build passes, autofix) all operate on a single self-contained HTML string. `splitHtmlIntoFiles()` runs only at the very end of `/api/code/ai-generate` to break it into index/css/js. `combineFilesToHtml()` is the inverse and is reused by `buildProjectHtml`.

**Updates recombine before regenerating.** `/api/code/ai` accepts a `files` array from the client and, when >1 file, recombines into one HTML so the AI sees full CSS+JS context (not just the open editor tab), then regenerates and re-splits.

**Why:** the preview is an iframe `srcdoc` with no server to resolve cross-file URLs, so true N-module projects (ES imports across files) can't work without a bundler. The HTML/CSS/JS three-file split is the meaningful multi-file model this architecture supports. Keeping generation single-HTML-internally preserves all the existing robustness machinery.

**Known limitation:** `splitHtmlIntoFiles` merges all inline scripts into one `app.js` placed at the first inline-script position — can reorder execution if a generated app puts scripts in both `<head>` and `<body>`. Fine for the standard `const App = {…}` single body-end script the prompts mandate.
