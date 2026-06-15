---
name: Claude tool use & command center
description: How native Claude function-calling is wired across the app (ops command center, main chat preflight, PDF chat) and the deliberate design choices behind each.
---

# Native Claude tool use

Three surfaces use Claude's native tool use. They share one safety principle: read/compute tools run automatically, but anything with side effects requires an explicit, server-revalidated confirm step.

## Ops Command Center (owner-only)
Backend assistant that controls Azure servers from plain English. Read tools (status/metrics/logs/insights/cost) auto-run and get summarized; control tools (start/stop/restart/suspend/budget) return a `pendingAction` and are NEVER executed on the first pass. The confirm route re-validates the tool name + input server-side (allowed-tool set + action enum + budget>0 + Azure-config check) — it does NOT trust the client-supplied summary/text.
**Why:** one prompt that can stop production must not be one round-trip from disaster; the confirm + server revalidation is the control, the UI button is not.

## Main chat: preflight, NOT streaming tool loops
The consumer chat injects exact tool results via a regex-gated, Haiku-powered preflight that runs the Claude tool call, executes first-party tools (exact math, current date/time) server-side, and injects results into the streaming model's system context — same mechanism as connectedContext. It is deliberately NOT implemented as `tools`/`tool_choice` inside `callDirect`/`callDirectStream`.
**Why:** the chat streams to every tier on a latency budget; a streaming tool loop adds risk + round-trips on the hot path for all users. A regex gate means the extra (cheap) tool call only fires when a message plausibly needs a tool; normal chat is untouched.
**How to apply:** add new first-party chat tools to `server/services/claude-tools.ts` (tool def + executor + a gate regex). Keep executors deterministic and bounded (e.g. calculator caps input length + exponent-chain count; uses `new Function` only on a strict arithmetic whitelist).

## PDF/document chat
PDFs prefer Claude native document reading (base64 `document` content block, `anthropic-version: 2023-06-01`) and fall back to Gemini. The Claude path runs BEFORE the Gemini-key check so a missing Gemini key never blocks it. Claude model is picked by tier (free=Haiku, pro=Sonnet 4, research/enterprise/owner=Sonnet 4.5) so PDF cost matches the rest of the stack.
**Why:** earlier ordering bug required a Gemini key before Claude could run, defeating the Claude-native path; and routing all PDFs to a fixed top model would break per-tier cost policy.
