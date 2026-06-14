---
name: OpenAI Sora video integration
description: Why video gen calls the Sora REST API directly (not the SDK), and the looming API shutdown date.
---

The OpenAI Node SDK (through at least v5.23.x, the pinned version here) has **no `videos` resource**, so Sora video generation must be called via the raw REST API with `fetch` — not `openai.videos.*`. Pattern mirrors the Luma/Replicate service.

**Why:** `package.json` is locked (cannot bump the SDK), and the studio needs an async job flow.

**How to apply:** `POST https://api.openai.com/v1/videos` (multipart `FormData`: `model=sora-2`, `prompt`, `size`, `seconds`), poll `GET /v1/videos/{id}` (status `queued|in_progress|completed|failed`), then download `GET /v1/videos/{id}/content` for the MP4 bytes. Auth = `Bearer OPENAI_API_KEY`. Sora sizes: `1280x720` (16:9), `720x1280` (9:16). Durations: `"4" | "8" | "12"`. Sora clips include audio.

**Shutdown risk:** OpenAI announced the Sora 2 Videos API + `sora-2`/`sora-2-pro` models are **deprecated and shut down 2026-09-24**. After that the video provider must migrate (Luma fallback already wired as secondary; Veo service also exists).

**Branding constraint:** UI must say "Matrix Video" (video) / "Matrix Imagine" (image) — never surface "OpenAI"/"Sora"/"Luma" to users, including in error toasts. Provider-specific error strings are logged server-side but replaced with neutral messages before responding.
