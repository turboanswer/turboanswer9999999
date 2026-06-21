---
name: Azure content-filter UX
description: Why Azure Responsible-AI blocks leak scary raw text to the user toast, and the map of every place that must sanitise it.
---

# Azure content-filter (Responsible AI) blocks

Azure OpenAI rejects a blocked prompt as an **HTTP 400** whose body mentions
`content_filter` / "content management policy" / `ResponsibleAIPolicyViolation`
(prompt-shield/jailbreak detection trips on "ignore all previous instructions…"
style prompts — a safe way to actually reproduce it in dev). A blocked
*completion* instead streams a 200 with `finish_reason: "content_filter"`.

**The trap:** these 400 bodies were surfaced VERBATIM. The router's
`onProviderError` carried the raw Azure body → the reasoning engine threw it
inside an `AI_ENGINE_UNAVAILABLE`/`AI_PROVIDERS_UNAVAILABLE` wrapper → the SSE
route forwarded `err.message` → the client toast showed Azure's internal
"content management policy" text. Users read this as a mysterious "content
filter" failure ("one question works, the next fails").

**Rule:** map content-filter 400s to a clean, user-actionable message
("blocked by the AI safety filter, please rephrase") and NEVER let the raw
provider body reach the user.
**Why:** it's user-actionable (rephrase), not an outage; the raw body is scary
and provider-leaking.
**How to apply:** the mapping lives in `direct-router.ts`
(`isContentFilterError` + `azureErrorDetail` → tags `CONTENT_FILTER:`). It must
be applied at EVERY Azure error-surfacing site — there are FOUR: responses
non-stream, chat non-stream, chat stream, and the stream's non-stream fallback.
Miss one and that path leaks again. The engine (`fastAnswer` /
`fastAnswerStream`) detects the `CONTENT_FILTER:` tag and throws just the clean
message (no wrapper).

**Scope notes:**
- Only swap when `status === 400 && isContentFilterError(body)`; other 4xx/5xx
  must keep their raw detail or you'll mask real outages.
- The deep/multi-agent path is SEPARATE: a filtered agent returns null and the
  synthesis throws its own generic "No agents were able to respond" — it does
  not leak the raw body, so it was left alone. If you want the rephrase hint
  there too, you'd have to thread it through multi-agent.
- Unrelated: the ~60s "slow then fail" is enterprise `gpt-5-pro` (Responses API,
  effort locked to 'high' — see azure-foundry-gpt5.md), not the filter.
