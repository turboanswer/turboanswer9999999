---
name: Image generation provider chain
description: How /api/generate-image picks providers and the config traps that broke it in prod vs dev
---

# Image generation provider chain

`/api/generate-image` tries providers in order: Azure Foundry gpt-image (primary) → Pollinations.ai (free) → OpenAI gpt-image-1 (last resort). Returns 500 only if all fail.

## Azure gpt-image: never send `response_format`
The gpt-image family (gpt-image-1 / gpt-image-2) does NOT accept the `response_format` parameter — it always returns `b64_json` by default. Sending `response_format: "b64_json"` makes Azure return `HTTP 400 "Unknown parameter: 'response_format'"`, killing the primary path. Parse `data[0].b64_json` (fallback to `.url`) without requesting a format.
**Why:** this exact 400 took down image gen in prod while dev masked it (dev's Azure resource has no image deployment, so dev fell straight to fallback).
**How to apply:** any Azure Foundry image request body — omit `response_format`.

## OpenAI client: key off the GATEWAY base URL, not the key
The Replit AI Integrations gateway provides `AI_INTEGRATIONS_OPENAI_BASE_URL` but **not always** `AI_INTEGRATIONS_OPENAI_API_KEY` (the key can be absent in dev; the SDK/gateway uses `OPENAI_API_KEY`). Build the OpenAI client by testing `AI_INTEGRATIONS_OPENAI_BASE_URL` presence: if present use gateway (Replit-billed, has budget), else direct `OPENAI_API_KEY`.
**Why:** keying off the API key sent dev to the direct `OPENAI_API_KEY`, which has hit its billing hard limit, so the fallback failed. The gateway path is the one with budget in dev.
**How to apply:** prod (Azure App Service) has no gateway vars → uses direct `OPENAI_API_KEY`; dev has the gateway → uses it.

## Pollinations is dead weight
Free Pollinations endpoint now returns `HTTP 402` (payment required) — treat the middle fallback as effectively non-functional; rely on Azure primary + OpenAI last-resort.

## Dev cannot fully repro prod image gen
Dev's `AZURE_OPENAI_ENDPOINT` (a Foundry resource) has no image deployment → every model 404s. Prod Azure App Service has its own `AZURE_OPENAI_*` with a real `gpt-image-2` deployment. The prod log stream is authoritative for image-gen debugging, not dev.
