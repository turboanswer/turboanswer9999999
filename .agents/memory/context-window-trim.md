---
name: context-window-trim
description: Why chat 400s on long conversations and how the router trims history to fit the model context window.
---
Long conversations (or a few large pasted messages) can exceed a model's context window and make Azure return `HTTP 400: maximum context length is N tokens, your messages resulted in M tokens` — this fails even a trivial "hi" because the bloat is the HISTORY, not the new message. Free tier (gpt-4o-mini) is the smallest at 128k, so it hits this first.

**Rule:** never cap chat history by TURN COUNT alone — cap by an estimated TOKEN budget against the resolved model's context window. The chat route trimming by `.slice(-20)` turns was insufficient because a handful of large messages blow past 128k.

**Why:** prod free-tier chat 400'd at 164k tokens > 128k; the public-OpenAI fallback then masked it with a misleading 401. Capping by tokens at the model chokepoint fixes it for every route at once.

**Estimate UNDER-counts — trimming "to budget" is not enough by itself.** The chars/4 estimate under-counts real Azure tokens for code/JSON/non-English, so a payload the trimmer believed was ~122k (budget = contextLimit − reserve ≈ 95% of window) was really ~160k → STILL a 400 even though the trim ran. Two changes were needed: (1) estimate divisor 4 → 3.5 (slight over-count) and cap input at ~70% of the window (`min(contextLimit − reserve, contextLimit*0.70*factor)`), not ~95%; (2) the real guarantee — a retry-on-context-400 loop.

**The guarantee is the retry, not the estimate.** `callDirect`/`callDirectStream` loop over `factors = [1, 0.6, 0.4]`, calling `fitMessagesToContext(messages, r, opts, factor)` per attempt; on a 400 whose body matches `isContextLengthError(...)` they re-trim harder and retry, else report+break. Any estimation error is absorbed by shrinking the budget and retrying — don't chase a "perfect" token count.

**How to apply:**
- The guard lives in `direct-router.ts` (`fitMessagesToContext`, now called PER-ATTEMPT inside the retry loop of both `callDirect` and `callDirectStream`, not once up top). Each resolved model carries a `contextLimit` (gpt-4o-mini 128k, gpt-4.1 1M, gpt-5.x 256k).
- It keeps all system messages + the most recent turn, drops the OLDEST turns first, and truncates a single oversized text message as a last resort; it reserves output headroom (`maxTokens` + buffer).
- Streaming retry is SAFE from duplicate output: a context-length 400 is rejected at request time (`res.ok` false) before any SSE chunk is emitted; once `consumeOpenAIStream` has emitted deltas it returns non-empty `acc` and the loop does NOT retry. The empty-stream non-stream fallback reuses the SAME fitted messages from that attempt. Public/non-stream fallbacks now also receive FITTED messages (they used to get raw history — latent bug).
- Residual (still unhandled, low-risk): system-only overflow and oversized structured/vision payloads are never trimmed/truncated, so an extreme one could still 400 after the final 0.4 attempt. The responses-API path (gpt-5-pro/codex, 256k) has no retry loop yet. Next step if either bites: allow truncating oversized system text + structured-content text on the final attempt, and reuse the retry wrapper for `azureResponsesNonStream`.

**Verified e2e** against the real Azure endpoint: 122 msgs / ~432k est tokens → trimmed 122→23 → HTTP 200 with a normal answer (no 400). Prod deploy is via git push → GitHub Actions → Azure App Service (NOT Replit Deploy); see prod-deploy-pipeline.md.
