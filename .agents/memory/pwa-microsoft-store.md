---
name: PWA / Microsoft Store path
description: How the web app is packaged as an installable PWA for the Microsoft Store and how screenshot/file intake works
---

The Microsoft Store route for this web app is **PWABuilder** (pwabuilder.com) wrapping the live Azure site into an MSIX — not a native rewrite. Requires a Partner Center account (~$19 one-time) and a privacy policy URL.

PWA assets live in `client/public/` (served at root by Vite; webDir is `dist/public`): `manifest.webmanifest`, `sw.js`, `icons/`, `screenshots/`. `initPwa()` runs from `main.tsx`.

**Why initPwa must skip Capacitor native:** the native shell loads the Azure site via `server.url` and has its own lifecycle; registering the SW there would conflict. Guard is `Capacitor?.isNativePlatform?.()`.

**Screenshot intake (two paths, both land in chat's `attachedImage`):**
- Web Share Target → SW intercepts the POST to `/share-target`, caches the blob under `turbo-shared-media`/`shared-image`, redirects to `/chat?shared=1`.
- File handler ("Open with") → `launchQueue.setConsumer`. Files can arrive AFTER mount on cold start, so use a persistent consumer that buffers + emits `turbo:shared-image`; never gate it behind a fixed timeout or late launches get dropped.

**SW caching rule:** never cache `/api`, `/widget`, `/realtime` or non-GET (avoids serving stale/authed responses). Navigations are network-first with app-shell fallback; static assets are stale-while-revalidate.
