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
