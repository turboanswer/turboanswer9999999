---
name: Chat media rendering — base64-wall prevention
description: How generated images render in chat and the rules that stop a data URL from leaking as a wall of base64 text.
---

Generated images are stored as an assistant message `![alt](dataURL)` and parsed by `renderMessageContent` in chat.tsx (shared by desktop + MobileChatUI). The cleanMarkdown stripper must NEVER run over a data:/http URL — it can shatter the markdown and dump the whole base64 string as plain text.

**Rules (all required together):**
- Extract media from the RAW message text FIRST, then apply cleanMarkdown ONLY to the text segments between media matches. Cleaning first then matching is fragile: cleanMarkdown rewrites `[text](http://…)` links, which would break `![](http://…)` before the media regex sees it.
- Use a CONSTANT safe alt text (`![Generated image](url)`), never the user's prompt. A prompt containing `]` breaks the `!\[([^\]]*)\]` regex → no match → the whole raw message (with the full data URL) renders as text. Keep the prompt in the caption line instead.
- When building the data URL client-side, prefer a provider `url` that is already a real `data:image/…` URL (preserves the true MIME, e.g. Pollinations JPEG); fall back to `b64_json` (assume PNG) only when no valid data URL is present; never accept raw base64 as a URL.
- The no-media fallback branch must render the CLEANED text, not the raw content, or `**bold**` artifacts leak.

**Why:** users repeatedly reported "make a picture" dumping a giant wall of random characters. Root cause was never the data: URL itself (proven to render even at ~700KB) — it was these edge paths (prompt-with-bracket alt, http-url cleanMarkdown rewrite, raw-content fallback) plus older deployed builds serving pre-fix code.

**How to apply:** any change to image generation, cleanMarkdown, or message rendering must preserve these four rules. Image generation does NOT stream, so streaming bubbles render plain text only — don't add media parsing there.

**Interactive cards in chat (e.g. email-draft card):** rich in-message UI must be embedded as a base64 marker in the message content (`[[EMAIL_DRAFT]]<b64 json>[[/EMAIL_DRAFT]]`) and extracted in `renderMessageContent` BEFORE cleanMarkdown, same as media. **Why:** the desktop-only `actionConfirmModal`/`pendingAction` path is NOT passed to MobileChatUI, so a modal-based card renders on desktop only; the marker-in-content approach is the single mechanism that works in BOTH UIs (they share `renderMessageContent`). Use UTF-8-safe base64 (TextEncoder/TextDecoder), and if the marker fails to decode, STRIP it from the text rather than letting raw base64 fall through to the user.
