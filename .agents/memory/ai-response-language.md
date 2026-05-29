---
name: AI response language pinning
description: Why the AI must always be told its output language, and which paths bypass the system prompt
---

# AI response language must be pinned on EVERY path — including English

Rule: when generating an answer, always inject an explicit "respond in <language>"
instruction, even when the language is English. Never gate it on `language !== "en"`.

**Why:** With no instruction, the model mirrors whatever language it thinks the
user's input is. Ambiguous input (notably Filipino/Tagalog) makes Gemini drift to
Indonesian, so default-English users in the Philippines got Indonesian replies.
The product has an explicit language picker (default `en`), so the user's
selection must always win over the model's guess.

**How to apply:** Use `getLanguageName(code)` in `server/services/multi-ai.ts`
(code→readable name, falls back to the raw code) and build the instruction
unconditionally.

# The reasoning engine's DEEP mode bypasses `systemPrompt`

`runReasoning()` only forwards `systemPrompt` into `fastAnswerStream` and
`retrievalAnswer`. The deep path (panel + synthesis) uses fixed internal prompts.
Any per-request directive (language, tone, style) must be threaded explicitly into
`buildPanelPrompt`/`panelAnswer` (via `opts.system`) and `synthesizeStream`,
otherwise it is silently dropped for complex queries.

**Why it bites:** during LAUNCH NIGHT the free tier gets deep verifications, so the
most-used tier hits exactly the path that ignored the language fix.

# Language state lives in multiple disconnected keys (client)

Three separate localStorage keys exist: `turbo_language` (chat AI picker),
`turbo_translate_lang` (floating Google-Translate pill), `turbo_lang` (useLang UI
strings). They do NOT auto-sync. The pill now also writes `turbo_language` so it
drives the AI; chat reads `turbo_language || turbo_translate_lang`. Never auto-apply
a language from `navigator.language` or a leftover `googtrans` cookie — a VPN/locale
must not override the user's explicit choice.
