---
name: text-engine
description: Which models power text vs image, the tier→model mapping, and the no-fallback / image-gen carve-out rules.
---
Text generation runs EXCLUSIVELY on Azure OpenAI GPT (migrated off Claude, June 2026). There is NO cross-provider text fallback in the live answer path — on model failure the engine FAILS LOUDLY (throws), it must never silently switch providers.

Tier → GPT model:
- free → gpt-4o-mini (no daily cap — free is unlimited)
- pro → gpt-4.1
- research (a.k.a. "Matrix") → gpt-5.4-mini
- enterprise / owner → gpt-5.5-pro
- Stack Trace Surgeon ONLY → gpt-5.1-codex (Enterprise-only; removed from Matrix)

**Why:** Product decision to unify ALL text/vision/reasoning on Azure OpenAI GPT and strip Claude (and the other legacy vendors) out of the live answer path. GPT-5.x deployments may 404 in an Azure resource until the user actually deploys those named deployments — code being healthy in dev but a tier 404'ing in prod is usually a missing Azure deployment, not a code bug.

GPT-5.x param gotcha: the 5.x family needs `max_completion_tokens` (not `max_tokens`) and default temperature — see azure-foundry-gpt5.md.

**Image generation & TTS are the deliberate carve-outs — do NOT "fix" them onto the text model.** The text model cannot draw pixels or speak:
- `/api/generate-image` (image studio): Azure image model → Pollinations (flux) → OpenAI gpt-image-1.
- `/api/photo-editor/generate` + `/edit`: Azure image model → Pollinations; the edit flow uses vision only to "describe the source image", then regenerates pixels via the image model.
- `/api/tts`: Azure speech (voice output).

**How to apply:**
- direct-router.ts `resolveModel()` is the chokepoint: ANY stray/legacy model id (gemini/google/groq/llama/mistral/claude/opus/etc.) is remapped to a GPT id (e.g. legacy `opus` → gpt-5.4-mini). Legacy ids left in code are harmless because of this remap, but prefer the real GPT ids for no-trace.
- Token usage for metered features is captured via `CallOpts.onUsage` in direct-router (Azure non-stream + public-OpenAI fallback paths); threaded through callers that need actual cost (e.g. Stack Trace Surgeon → Diagnosis.modelUsage). onUsage is undefined when a non-metered fallback chain runs instead of the primary model.
- All vision/document/camera paths go through the shared vision response path, fail loud.
- Auxiliary surfaces that return a STATIC fallback on failure (crisis-ai safety message, emotional neutral, widget generic, classifier "none") are allowed — they degrade, they do NOT switch providers. That is not a fail-loud violation.
- Identity guard still applies: user-facing prompts pin the product identity, never a vendor name (see ai-identity-guard.md).
