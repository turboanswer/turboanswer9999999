---
name: context-window-trim
description: Why chat 400s on long conversations and how the router trims history to fit the model context window.
---
Long conversations (or a few large pasted messages) can exceed a model's context window and make Azure return `HTTP 400: maximum context length is N tokens, your messages resulted in M tokens` — this fails even a trivial "hi" because the bloat is the HISTORY, not the new message. Free tier (gpt-4o-mini) is the smallest at 128k, so it hits this first.

**Rule:** never cap chat history by TURN COUNT alone — cap by an estimated TOKEN budget against the resolved model's context window. The chat route trimming by `.slice(-20)` turns was insufficient because a handful of large messages blow past 128k.

**Why:** prod free-tier chat 400'd at 164k tokens > 128k; the public-OpenAI fallback then masked it with a misleading 401. Capping by tokens at the model chokepoint fixes it for every route at once.

**How to apply:**
- The guard lives in `direct-router.ts` (`fitMessagesToContext`, called at the top of both `callDirect` and `callDirectStream`) so ALL paths are protected, not just one route. Each resolved model carries a `contextLimit` (gpt-4o-mini 128k, gpt-4.1 1M, gpt-5.x 256k).
- It keeps all system messages + the most recent turn, drops the OLDEST turns first, and truncates a single oversized text message as a last resort; it reserves output headroom (`maxTokens` + buffer). Token estimate is ~chars/4 plus a flat per-image cost — pragmatic, not exact, so keep a generous reserve.
- Residual (currently unhandled, low-risk for this app): system-only overflow and oversized structured/vision payloads are not trimmed. If those ever 400, the next step is a retry-on-400-context loop that re-trims more aggressively.

**Verified live in prod** via an oversized widget message (~180k tokens → HTTP 200 instead of the old 400). See prod-deploy-pipeline.md for that probe technique.
