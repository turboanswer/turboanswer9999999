---
name: Azure Foundry GPT-5 params
description: How the shared direct-router must call Azure Foundry GPT-5.x deployments (param quirks + which deployments are live).
---

# Azure Foundry GPT-5.x calling rules

The shared `callDirect` azure path (`server/services/direct-router.ts`) must, for the GPT-5 family, send `max_completion_tokens` instead of `max_tokens` and must NOT send a custom `temperature` (only the default is supported). Detected via `/gpt-5/` in the model name.

**Why:** Azure Foundry returns HTTP 400 `Unsupported parameter: 'max_tokens' ... Use 'max_completion_tokens'` and rejects non-default temperature for these reasoning models. Before this fix the azure branch always sent `max_tokens` + `temperature`, so every GPT-5.x call 400'd and silently fell back to other providers — Azure looked "configured" but was never actually used.

**How to apply:** Any new code routing through `callDirect('azure/gpt-5-*', …)` already gets the right params. If you add a new Azure deployment family with different rules, branch on the model name in that same azure block.

**Live deployments (this resource):** `azure/gpt-5-4-mini` and `azure/gpt-5-4-nano` work (HTTP 200). `azure/gpt-5-4-pro` returns 400 "The requested operation is unsupported" even with correct params — treat pro as unavailable here and prefer mini→nano.

**Endpoint shape:** `AZURE_OPENAI_ENDPOINT` is an AI Foundry host (`services.ai.azure.com`), so the v1 path `/openai/v1/chat/completions` is used with the deployment passed as `model` in the body.
