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

**Cross-UI cards/modals (desktop + native):** two working mechanisms. (1) Marker-in-content: embed in the message body and extract in `renderMessageContent` BEFORE cleanMarkdown, same as media — works in both UIs because they share `renderMessageContent`. (2) Fixed-overlay sibling: render a `position:fixed` modal driven by component state as a sibling of `<MobileChatUI>` inside the `isNativeMobile` return AND again in the desktop return. `actionConfirmModal`/`pendingAction` (the connected-accounts send/reply + calendar confirm) uses approach (2) and is intentionally placed in BOTH returns — that's why it works on native; if you ever add it to only one return it silently breaks the other surface. **Why approach matters:** state passed only as desktop JSX never reaches the native return. **Note:** the old `[[EMAIL_DRAFT]]` compose-deeplink card was removed — email is handled by per-user connected Gmail/Outlook (OAuth) via the connected-accounts classifier + `action_proposal`/`actionConfirmModal`, not a compose deep link.
