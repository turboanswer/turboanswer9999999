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

# Tier → Claude deployment (live names, confirmed working)
- Free  ("Turbo")      → `claude-haiku-4-5`
- Pro   ("Turbo Pro")  → `claude-sonnet-4-5`
- Research/Enterprise/Owner ("Matrix AI", top tier) → `claude-opus-4-8`

Override defaults via `AZURE_DEPLOYMENT_CLAUDE_{HAIKU,SONNET,OPUS}`. The older
`AZURE_DEPLOYMENT_CLAUDE_SONNET_4_5` secret is stale (set to a nonexistent `claude-sonnet-4-6`)
and is no longer read — leave it unset/ignored.

# Gotcha: the management plane can't enumerate these deployments
The Azure SP (AZURE_CLIENT_ID/TENANT/SECRET/SUBSCRIPTION) returns zero Cognitive Services
accounts via management.azure.com (RBAC/subscription scope), and the data-plane list routes
(`/openai/v1/models`, `/openai/deployments?api-version=...`) 404 or reject the api-version.
Discover real deployment names by **probing candidate names on `/openai/v1/...`**: an existing
Anthropic deployment returns `api_not_supported` (exists, wrong surface) vs `DeploymentNotFound`.
