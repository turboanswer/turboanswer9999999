---
name: AI response language pinning
description: Why "AI replied in the wrong language" is usually a CLIENT display bug, plus the server pinning rules
---

# "AI replied in the wrong language" is usually the Google Translate DOM widget, NOT the model

The app ships a Google Translate widget (`AutoTranslate`) that rewrites the visible
page DOM — including correct AI replies — into whatever the `googtrans` cookie says.
So a user can get a perfectly English AI response that is then visually translated to
another language client-side. Before touching server prompts, confirm whether the
*model output* is wrong or only the *displayed text* is.

**How to prove which:** call the answer path server-side with a non-English question
and a system prompt forcing English; if it returns English, the bug is the client
display layer (cookie/widget), not the model.

# Explicit-choice-wins: require a positive flag, never trust bare stored values

Default to English. Only honor a stored/cookie language when a positive
"user explicitly picked" marker (`turbo_lang_explicit`) is present, written solely
on a real user action. Any stored language WITHOUT that marker is stale auto-detect
junk (old builds auto-applied browser/VPN locale) and must be wiped to English.

**Why:** auto-detecting from `navigator.language` or a VPN exit IP let the wrong
language stick across sessions and could not be told apart from a real choice. A
positive opt-in flag is the only reliable discriminator. Every language-setting
entry point MUST set this flag or it will be silently reset on next load.

# Server: always pin output language, even English

Always inject "respond in <language>" — never gate it on `language !== "en"`.
With no instruction the model mirrors the input language; ambiguous input (notably
Filipino/Tagalog) makes Gemini drift to Indonesian. The product has an explicit
picker (default `en`), so the selection must always win over the model's guess.
Deep/reasoning mode has its own internal prompts and will drop any per-request
directive (language, tone) unless it is threaded explicitly into the panel and
synthesis prompts — easy to miss because the simple fast path works fine.

# Client language state lives in several disconnected keys

`turbo_language` (chat AI), `turbo_translate_lang` (translate pill), `turbo_lang`
(UI strings), plus the `googtrans` cookie — they do NOT auto-sync. Keep them in
lockstep when changing language behavior.
