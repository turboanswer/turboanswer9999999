---
name: Azure Claude scaling & rate limits
description: How to survive/scale the Azure Foundry Claude per-minute token rate limit (HTTP 429) — caching, overflow, what does/doesn't reach prod.
---

# Azure Foundry Claude rate limits & scaling

The Foundry Claude deployments enforce a per-minute **input-token** quota (e.g. 80k
UncachedInputTokens/60s on Haiku). Breaching it returns HTTP 429 + Retry-After.
The whole text engine is Claude-only via the router, so there is no non-Claude
escape hatch — scaling is about cutting input tokens and adding Claude capacity.

## Levers, in order of leverage
1. **Prompt caching** — biggest lever, and it attacks the exact metric (UNCACHED
   input). Send the system prompt as a content-block array with
   `cache_control:{type:'ephemeral'}`. The system prompt is identical across
   same-tier chats AND across every router/planner/judge/verifier call, so it
   gets cross-call cache hits. Honored by BOTH api.anthropic.com and the Foundry
   `/anthropic/v1/messages` passthrough. Below a model's min cacheable prefix
   (~2048 tok for Haiku) it's silently ignored — no error.
2. **Overflow to a second provider** — see prod caveat below.
3. **Raise the Azure quota** (support request) and/or spread across the few regions
   that actually serve Claude on Foundry.
4. **Provisioned Throughput** (reserved capacity) once volume is real.
5. Stop spending the rate-limited model on overhead (the per-message Haiku
   classifier in reasoning-engine doubles Haiku request count).

**Why "how many regions" is the wrong question:** Claude on Foundry lives in only
a handful of regions, so you cannot scale by region count alone — you raise
per-deployment quota + cache + add providers. Caching cuts the required capacity
~5x.

## Two non-obvious traps
- **Self-heal the cache field.** Caching defaults ON. If a provider ever 400s on
  `cache_control`/array-form `system`, and there's no overflow key, EVERY request
  fails. Mitigation: a process-wide latch that, on a 400 mentioning
  cache_control/ephemeral, disables caching and retries uncached once.
  `PROMPT_CACHE_DISABLED=1` is the manual kill-switch.
- **Replit integrations/secrets DO NOT reach prod.** Prod is Azure App Service
  (deployed via GitHub Actions), not the Replit runtime. The direct-Anthropic
  overflow fallback reads `AI_INTEGRATIONS_ANTHROPIC_API_KEY || ANTHROPIC_API_KEY`;
  a Replit secret only activates overflow in DEV. For PROD overflow the key must
  be set in the Azure App Service configuration. The installed Anthropic *Replit
  integration* does not help prod for the same reason.

**Why:** repeated debugging of 429s and "all providers failed" traced to (a) the
system prompt being re-billed every call and (b) overflow being dead because no
Anthropic key exists in dev OR prod.
