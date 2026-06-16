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
- max_output_tokens floor: the Responses API rejects `max_output_tokens` < 16 with HTTP 400
  "integer below minimum value. Expected a value >= 16". Any tiny probe (e.g. a health check
  sending maxTokens:1 or :5) silently 400s → callDirect returns null. Use >= 16 for probes.

# Health check must probe the REAL engine, not api.anthropic.com
The ProactiveDiag AI check (`checkAIService`) must probe Claude via `callDirect()` (the
direct-router → Azure-hosted Claude path the app actually uses), NOT a raw POST to
`{base}/v1/messages` on api.anthropic.com. **Why:** there is no direct Anthropic key in
any env, so the old probe always reported "Anthropic API key not configured" (fail) even
though Azure Claude was healthy — a permanent false "Failures: 1". Probing via callDirect
makes the check reflect what users experience. Keep probe maxTokens >= 16 (see floor above).

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

The SAME Foundry resource is reachable under THREE hostname forms, but they DO NOT behave
identically for the Claude Responses API (verified by probing the same deployment+key on each):
- `<name>.services.ai.azure.com` (AI Foundry form, what dev uses) → **200 OK** ✓
- `<name>.openai.azure.com` (the form the Foundry "Get code" dialog shows) → **200 OK** ✓
- `<name>.cognitiveservices.azure.com` (Azure AI Services form on the Overview page) →
  **HTTP 404 `DeploymentNotFound`** ✗ for the very same deployment that works on the other two.

**This is the trap.** A prior note here wrongly claimed all forms serve Claude. Prod had
`AZURE_OPENAI_ENDPOINT` set to the cognitiveservices form, so EVERY Claude call 404'd, and
with no direct Anthropic key there was no fallback → `AI_PROVIDERS_UNAVAILABLE` on every chat,
while dev (services.ai form) looked perfectly healthy. Matching the substring in
`isFoundryEndpoint()` is NOT enough — the request still 404s.

**Fix:** `normalizeFoundryEndpoint()` in direct-router.ts rewrites
`.cognitiveservices.azure.com` → `.services.ai.azure.com` before building the Responses URL,
so a prod env var stuck on the cognitiveservices form still reaches Claude WITHOUT anyone
editing prod env. `isFoundryEndpoint()` accepts all three substrings (so the Azure path is
chosen); `normalizeFoundryEndpoint()` fixes the one broken host. Either rewriting the prod env
var OR shipping this code fix resolves the outage — but the code fix only lands after redeploy.

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
