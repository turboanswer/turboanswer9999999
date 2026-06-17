---
name: Azure Foundry Claude inference surface
description: How Claude (Anthropic) deployments on the services.ai.azure.com Foundry resource must be called, and the tier→model mapping.
---

# Claude on Azure AI Foundry (services.ai.azure.com)

Claude deployments on this Foundry resource are served via the **Anthropic-native
Messages API** — the "Target URI" the Foundry portal shows for each Claude deployment:
`POST <resource-origin>/anthropic/v1/messages` with headers `x-api-key: <key>` and
`anthropic-version: 2023-06-01`, body `{ model: <deployment>, system?, messages[], max_tokens, temperature?, stream? }`.

**Auth header is the trap:** that endpoint accepts ONLY `x-api-key`. Sending `api-key`
(the Azure/OpenAI convention) returns HTTP **401** "Access denied due to invalid
subscription key or wrong API endpoint" for haiku/sonnet/opus alike. With `x-api-key`
all three return 200. (The `/openai/v1/responses` surface also exists and accepts
`api-key`, but the official deployment Target URI is the Anthropic Messages path, so
the app uses that.)

**Build the URL from the ORIGIN only.** The path portion of `AZURE_OPENAI_ENDPOINT` is
irrelevant: bare host, `/api/projects/<project>`, or the `…/anthropic/v1/messages`
Target URI all collapse to `<origin>/anthropic/v1/messages` (`azureAnthropicUrl()`).
**Why:** operators naturally paste the portal Target URI into `AZURE_OPENAI_ENDPOINT`;
older code appended `/openai/v1/responses` to whatever was configured, so a pasted
Target URI became `…/anthropic/v1/messages/openai/v1/responses` → 401 — a recurring
outage. Deriving from the origin makes any configured form work.

**How to apply:**
- Body from messages: system turns → top-level `system` string; user/assistant → `messages[]`.
  Array/vision content passes through as Anthropic content blocks unchanged.
- Non-stream: read `content[].text` (join all text blocks).
- Stream (SSE): accumulate `content_block_delta.delta.text`; stop on `message_stop`/`error`.
- JSON mode: the Messages API has NO strict json mode (the old Responses API had
  `text.format:json_object`). Pin it with a system instruction ("respond with ONLY valid
  JSON, no fences") AND strip code fences on the result.
- Temperature: Opus 4.x (`claude-opus-4-8`) accepts ONLY the default temperature; any explicit
  non-default value 400s. OMIT `temperature` for Opus; detect Opus from the resolved MODEL
  NAME (always contains "opus"), not the deployment string, so a custom
  `AZURE_DEPLOYMENT_CLAUDE_OPUS` can't silently regress it. Haiku/Sonnet accept any value.

# Health check must probe the REAL engine, not api.anthropic.com
The ProactiveDiag AI check (`checkAIService`) probes Claude via `callDirect()` (the
direct-router → Azure Claude path the app actually uses), NOT a raw POST to api.anthropic.com.
**Why:** there is no direct Anthropic key in any env, so a raw probe always reported "key not
configured" (false fail) even when Azure Claude was healthy. NOTE: a stale "AI Engine (Claude)"
ProactiveDiag failure is usually from an outage window before an endpoint fix — the chronic
recurring failure is "Memory Usage" (dev heap >95%), not Claude. Confirm live before chasing.

# Tier → Claude deployment (live names, confirmed working)
- Free  ("Turbo")      → `claude-haiku-4-5`
- Pro   ("Turbo Pro")  → `claude-sonnet-4-5`
- Research/Enterprise/Owner ("Matrix AI", top tier) → `claude-opus-4-8`

Override defaults via `AZURE_DEPLOYMENT_CLAUDE_{HAIKU,SONNET,OPUS}`. The older
`AZURE_DEPLOYMENT_CLAUDE_SONNET_4_5` secret is stale (nonexistent `claude-sonnet-4-6`) and
is no longer read — leave it unset.

# Gating: never require AZURE_HOSTED_ANTHROPIC alone to reach Claude
Attempt the Azure Claude path whenever a Foundry endpoint + key are present:
`AZURE_OPENAI_API_KEY && AZURE_OPENAI_ENDPOINT && (AZURE_HOSTED_ANTHROPIC || isFoundryEndpoint(ep))`.
**Why:** dev sets the flag but prod (Azure App Service) does not, and there is NO direct
Anthropic key anywhere, so flag-only gating made prod skip the only working path → fall through
to api.anthropic.com with no key → null → `AI_PROVIDERS_UNAVAILABLE` on every chat, while dev
looked fine. The Foundry-endpoint check is the durable signal Claude is reachable.

# Hostname forms: only services.ai.azure.com resolves the Claude deployments
The same resource is reachable under three hostname forms; only `services.ai.azure.com` resolves
the Claude deployments. `<name>.cognitiveservices.azure.com` returns 404 `DeploymentNotFound`;
the `<name>.openai.azure.com` form is the OpenAI surface. `normalizeFoundryEndpoint()` rewrites
BOTH `.cognitiveservices.azure.com` and `.openai.azure.com` → `.services.ai.azure.com` (resource
name is identical across forms) so a prod env var stuck on either still reaches Claude after deploy.

# Gotcha: the management plane can't enumerate these deployments
The Azure SP returns zero Cognitive Services accounts via management.azure.com (RBAC/scope), and
data-plane list routes 404 / reject api-version. Discover real deployment names by probing
candidates; verify a call with a real Messages request (x-api-key) rather than trusting list APIs.
