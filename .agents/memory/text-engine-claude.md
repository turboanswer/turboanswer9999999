---
name: text-engine-claude
description: Which models power text vs image, and the tier→Claude mapping.
---
Text generation runs EXCLUSIVELY on Anthropic Claude. GPT/OpenAI is reserved strictly for photo (image) generation and must never be surfaced in the UI.

Tier → Claude model:
- free → anthropic/claude-haiku
- pro → anthropic/claude-sonnet-4.5
- research / enterprise / owner → anthropic/claude-opus-4-1

**Why:** Product decision (June 2026) to unify on Claude for text and strip all GPT branding from the UI.

**How to apply:**
- reasoning-engine.ts `claudeModelForTier()` is the single source of the tier map; answerForTier / answerForTierStream use it with Gemini (NOT GPT) as resilience fallback.
- direct-router.ts `resolveModel()` has a safety remap: any model id containing "gpt" → Claude (nano/mini→haiku, else sonnet-4.5). So legacy gpt ids in fallback chains still route to Claude.
- Video generation was fully removed (routes, service files, page, nav, marketing).
- Competitor "ChatGPT" mentions in enterprise.tsx are intentionally kept (they describe the customer's existing tool, not our stack).
