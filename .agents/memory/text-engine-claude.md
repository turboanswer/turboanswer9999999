---
name: text-engine-claude
description: Which models power text vs image, the tier→Claude mapping, and the no-fallback / image-gen carve-out rules.
---
Text generation runs EXCLUSIVELY on Anthropic Claude (incl. Azure-hosted Claude). There is NO non-Claude text fallback anymore — on Claude failure the engine FAILS LOUDLY (throws), it must never silently switch to another provider.

Tier → Claude model:
- free → anthropic/claude-haiku
- pro → anthropic/claude-sonnet-4.5
- research / enterprise / owner → anthropic/claude-opus-4-1

**Why:** Product decision (June 2026) to unify ALL text/vision/reasoning on Claude and strip every other vendor (Gemini/OpenAI/GPT/Azure-GPT/Groq/Mistral) out of the live answer path. Live web search was also removed (no substitute).

**Image generation is the ONE deliberate carve-out — do NOT "fix" it to Claude.** Claude cannot draw pixels, so image gen/edit stays on non-Claude providers and the user explicitly asked to KEEP it:
- `/api/generate-image` (image studio): Azure image model (gpt-image-2) → Pollinations (flux) → OpenAI gpt-image-1.
- `/api/photo-editor/generate` + `/edit`: Azure image model → Pollinations; the edit flow uses Claude vision (`generateVisionResponse`) only for the "describe the source image" step, then regenerates pixels via the image model.
- `/api/tts`: Azure speech (voice output) — also kept.

**How to apply:**
- direct-router.ts `resolveModel()` is the chokepoint: ANY model id (gemini/google/groq/openai/gpt/llama/mistral/etc.) is remapped to Claude (nano/mini/flash/lite/small→haiku, opus→opus, else sonnet). Legacy ids left in code are harmless because of this remap, but prefer claude ids for no-trace.
- All vision/document/camera paths go through `generateVisionResponse` (multi-ai.ts) / document-analysis / live-camera — Claude vision, fail loud.
- JSON-extraction callers (emotional-ai, auto-debugger, connected-accounts classifier) pass `{ jsonMode: true }` to callDirect (which sets Claude json_object format + strips fences); keep the defensive first-`{...}` parse as backup.
- Auxiliary surfaces that return a STATIC fallback on failure (crisis-ai safety message, emotional neutral, widget generic, classifier "none") are allowed — they degrade, they do NOT switch providers. That is not a fail-loud violation.
