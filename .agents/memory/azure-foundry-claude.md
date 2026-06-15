---
name: Azure Foundry Claude inference surface
description: How Claude (Anthropic) deployments on the services.ai.azure.com Foundry resource must be called, and the tier→model mapping.
---

# Claude on Azure AI Foundry (services.ai.azure.com)

Claude deployments on this Foundry resource are served **ONLY** via the Responses API:
`POST {AZURE_OPENAI_ENDPOINT}/openai/v1/responses` with header `api-key`, body
`{ model: <deployment>, input, instructions?, temperature?, max_output_tokens, stream? }`.

**Why:** Anthropic deployments here reject `/chat/completions` (error `api_not_supported`)
and the `/models/chat/completions` MaaS route ("API version not supported" for every
api-version). Only the Responses API works. GPT/OpenAI deployments on the SAME resource
DO work via `/openai/v1/chat/completions` (model in body) — so the two model families use
different surfaces on one endpoint.

**How to apply:**
- Build body from OpenAI-style messages: system turns → `instructions`; user/assistant → `input[]`.
- JSON mode: `text: { format: { type: 'json_object' } }` (NOT `response_format`, which the
  Responses API rejects). Output may be ```json-fenced — strip fences or rely on a JSON extractor.
- Non-stream: read `output_text`, else join `output[].content[].text`.
- Stream (SSE): accumulate `response.output_text.delta` events' `.delta`; stop on
  `response.completed`/`response.failed`. Do NOT also add `response.output_text.done` (duplicate).
- Temperature: Opus 4.x (`claude-opus-4-8`) rejects any NON-default `temperature` (e.g. 0 or 0.3)
  with HTTP 400 "invalid_request_error" — only the default (1) is accepted, whether sent
  explicitly as `temperature:1` or by omitting the field (verified by probing the Responses API
  directly). Haiku/Sonnet accept any value. So OMIT `temperature` for Opus deployments. Detect
  Opus from the resolved MODEL NAME (which always contains "opus"), not the deployment string, so
  a custom `AZURE_DEPLOYMENT_CLAUDE_OPUS` name can't silently regress it. Symptom if you forget:
  free+pro tiers work, top tier (Matrix AI) silently 400s and — with no Anthropic fallback key in
  any env — fails loud as "providers unavailable"; this is the recurring ProactiveDiag
  "Failures: 1". Same family of quirk as the GPT-5 reasoning deployments (default-temperature-only).

# Tier → Claude deployment (live names, confirmed working)
- Free  ("Turbo")      → `claude-haiku-4-5`
- Pro   ("Turbo Pro")  → `claude-sonnet-4-5`
- Research/Enterprise/Owner ("Matrix AI", top tier) → `claude-opus-4-8`

Override defaults via `AZURE_DEPLOYMENT_CLAUDE_{HAIKU,SONNET,OPUS}`. The older
`AZURE_DEPLOYMENT_CLAUDE_SONNET_4_5` secret is stale (set to a nonexistent `claude-sonnet-4-6`)
and is no longer read — leave it unset/ignored.

# Gating: never require AZURE_HOSTED_ANTHROPIC alone to reach Claude
The router must attempt the Azure Foundry Claude path whenever a Foundry endpoint +
key are present, i.e. `AZURE_OPENAI_API_KEY && AZURE_OPENAI_ENDPOINT && (AZURE_HOSTED_ANTHROPIC
|| isFoundryEndpoint(ep))`. Do NOT gate it solely on the `AZURE_HOSTED_ANTHROPIC` flag.

The SAME Foundry resource is reachable under TWO hostnames and BOTH serve Claude via
`/openai/v1/responses` (verified — both return Claude body-validation errors, not auth/route
errors): `<name>.services.ai.azure.com` (AI Foundry form, what dev uses) and
`<name>.cognitiveservices.azure.com` (Azure AI Services form shown on the Foundry Overview
page). `isFoundryEndpoint()` MUST match both substrings, else prod set to the
cognitiveservices form is rejected and you get the same outage.

**Why:** dev sets the flag, but the prod Azure App Service does not, and there is NO
direct Anthropic key in any environment (`AI_INTEGRATIONS_ANTHROPIC_API_KEY` /
`ANTHROPIC_API_KEY` both absent). Flag-only gating made prod skip the only working
Claude path and fall through to api.anthropic.com with no key → `callDirect(Stream)`
returns null → reasoning-engine throws `AI_PROVIDERS_UNAVAILABLE` on every chat, while
dev looked fine. The Foundry endpoint check is the durable signal that Claude is reachable.

**How to apply:** any new Claude call site or env-config change must keep the Foundry-endpoint
fallback in the gate; match the endpoint case-insensitively. Prod fix only lands after
redeploy AND only if prod actually has the Foundry endpoint+key set.

# Gotcha: the management plane can't enumerate these deployments
The Azure SP (AZURE_CLIENT_ID/TENANT/SECRET/SUBSCRIPTION) returns zero Cognitive Services
accounts via management.azure.com (RBAC/subscription scope), and the data-plane list routes
(`/openai/v1/models`, `/openai/deployments?api-version=...`) 404 or reject the api-version.
Discover real deployment names by **probing candidate names on `/openai/v1/...`**: an existing
Anthropic deployment returns `api_not_supported` (exists, wrong surface) vs `DeploymentNotFound`.
