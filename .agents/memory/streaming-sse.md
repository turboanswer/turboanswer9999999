---
name: SSE token streaming in the reasoning engine
description: How chat answers stream token-by-token and the cascade-duplication trap to avoid
---

# SSE token streaming (chat)

The chat SSE endpoint drives `runReasoning(...)` with an `onEvent` callback; `{type:'chunk'}` events are what the client renders token-by-token, and the final `{type:'done'}` carries the verified/marked answer that replaces the streamed text.

All three routing modes must stream for the answer to "pop up word by word":
- **fast** → `fastAnswerStream` → `answerForTierStream`
- **retrieval** → `retrievalAnswerStream` → `answerForTierStream`
- **deep** → `synthesizeStream`

Streaming providers go through Azure Foundry SSE (`stream: true`). Each `call*Stream` returns the full string on success, or `null` on failure.

**Cascade-duplication trap (important):** a `call*Stream` helper returns `null` on a *mid-stream* failure even though it already fired `onChunk(...)` for the tokens it received. If the wrapper (`answerForTierStream`) then cascades to a fallback deployment, that second stream re-emits tokens and the client shows garbled/duplicated text.

**Rule:** once any chunk has reached the client, do NOT cascade to another provider/deployment. Track an `emitted` flag and bail to `null` after a partial stream; let the caller keep the partial text instead. On a clean no-chunk failure, cascading is fine.

**Why:** mid-stream provider failure is rare but real; truncated text is acceptable, duplicated/interleaved text from two models is not.

**Caller fallback pattern:** stream into an accumulator; if it's still empty afterward, fall back to the non-streaming cascade (`retrievalAnswer` / `fastAnswer`) and emit one chunk. Accepting partial `acc` on mid-stream failure matches the existing fast-path behavior.

**Prod-only empty-SSE outage (Azure App Service / Cloudflare):** the streamed SSE body can come back EMPTY (HTTP 200, zero deltas) in the deployed runtime even though the IDENTICAL non-streaming Responses call returns the full answer reliably (the non-streaming widget worked in prod while streaming chat threw "providers all failed"). The fast path had no non-streaming fallback, so an empty stream → `null` → thrown `AI_PROVIDERS_UNAVAILABLE`. **Rule:** the streaming chokepoint itself (`callDirectStream`, Azure Claude branch) must, when the stream yields no content, retry the SAME Claude deployment NON-streaming (`stream:false` on `azureResponsesUrl()`) and return that text — never give up on an empty stream alone. Safe because reaching that point guarantees nothing was emitted (`if (acc) return acc` returns first), so the caller emits it as one chunk with no double-emit. Still 100% Claude; only the transport degrades. **Why:** server engine can be fully healthy while only the SSE transport is broken behind a proxy — fall back to the proven-working non-streaming transport instead of failing the whole chat.

**Surfacing prod-only provider failures you can't read in logs:** the SSE chat route forwards a thrown error's `.message` VERBATIM to the client toast (`send('error',{message: err.message})`). Provider helpers swallow the real cause (HTTP status, body) into a `console.warn` and return `null`, so the toast only shows a generic "all failed". To diagnose a prod-only failure when telemetry/Kudu are blocked, pass an optional `onProviderError(detail)` callback through `CallOpts` → `callDirect(Stream)` (set on every non-ok / no-key / timeout / exception branch with status + truncated body, NO secrets) → captured in `fastAnswer(Stream)` and appended to the thrown message. The next prod retry's toast then reveals the true cause: 403=network/firewall ACL, 429=quota, 401=key, AbortError=connectivity/timeout. **Why:** when you can't read prod logs, make the error itself carry the diagnosis to the one surface the user CAN screenshot.
