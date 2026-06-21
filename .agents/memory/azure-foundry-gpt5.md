---
name: Azure Foundry GPT-5 params
description: How the shared direct-router must call Azure Foundry GPT-5.x deployments (param quirks + which deployments are live).
---

# Azure Foundry GPT-5.x calling rules

The shared `callDirect` azure path (`server/services/direct-router.ts`) must, for the GPT-5 family, send `max_completion_tokens` instead of `max_tokens` and must NOT send a custom `temperature` (only the default is supported). Detected via `/gpt-5/` in the model name.

**Why:** Azure Foundry returns HTTP 400 `Unsupported parameter: 'max_tokens' ... Use 'max_completion_tokens'` and rejects non-default temperature for these reasoning models. Before this fix the azure branch always sent `max_tokens` + `temperature`, so every GPT-5.x call 400'd and silently fell back to other providers — Azure looked "configured" but was never actually used.

**How to apply:** Any new code routing through `callDirect('azure/gpt-5-*', …)` already gets the right params. If you add a new Azure deployment family with different rules, branch on the model name in that same azure block.

**Live deployments (this resource):** chat/completions works for `gpt-4o-mini` (free), `gpt-4.1` (pro), `gpt-5.4-mini` (Matrix/research). The top engines `gpt-5-pro` (enterprise) and `gpt-5.2-codex` (Stack Trace Surgeon) EXIST but return HTTP 400 "The requested operation is unsupported" on chat/completions — they are reachable ONLY via the Responses API (see below). Verify a name by pinging: 400 "operation is unsupported" = exists-but-wrong-endpoint; 404 DeploymentNotFound = doesn't exist (e.g. `gpt-5.5-pro`, `gpt-5.1-codex`, `gpt-5.2-codex-max` all 404 here — don't use those names).

**Responses API path (gpt-5-pro / gpt-5.2-codex):** POST `${origin}/openai/responses?api-version=...` with the deployment in body `model`. Body: `{model, instructions (=system), input: [{role, content:[{type:'input_text'|'output_text'|'input_image', ...}]}], max_output_tokens, reasoning:{effort}}`. Output text = `output.find(o=>o.type==='message').content.find(c=>c.type==='output_text').text`. Usage = `{input_tokens, output_tokens}` (map to prompt/completion for metering). `resolveModel` flags these `usesResponsesApi`; `callDirectStream` can't stream them — it fetches full text and emits one chunk.

**Reasoning effort is per-model:** `gpt-5-pro` ONLY accepts `effort:'high'` (400 "Unsupported value: 'low' ... Supported values are: 'high'" otherwise); `gpt-5.2-codex` accepts `'low'`. Carry effort per-deployment in the Resolved object, never a single global env. Reasoning tokens count against `max_output_tokens`, so floor it (≥2048) or you get a completed response with reasoning only and no visible text.

**Endpoint shape:** derive the resource ORIGIN from `AZURE_OPENAI_ENDPOINT` (path portion irrelevant); chat/completions uses `/openai/deployments/<name>/chat/completions`, Responses uses `/openai/responses` with the deployment in the body.
