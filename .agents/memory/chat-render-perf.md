---
name: Chat render performance
description: Why the chat "freezes a few questions in" and the render pattern that prevents it
---

# Chat streaming render performance

Symptom: free-tier users report the chat "freezes about 3 questions into a conversation." It is NOT a rate limit — it is a client-side render blowup.

**Root cause:** the live answer streams token-by-token over SSE. If each token triggers a top-level state update (e.g. setStreamingText) AND each message bubble does expensive per-render work (markdown cleaning + media/tag regex over its content), then every token re-renders the WHOLE message list → O(messages × tokens) main-thread work. A few turns in, the history is long enough that the main thread locks.

**Fix pattern (keep both in place):**
1. Memoize the per-message renderer. The heavy work (cleanMarkdown + media/audio/unverified-tag regex) must live inside a `React.memo` component keyed on its own `{content, role, isDark}` so historical bubbles skip recompute while a new answer streams. `isDark` (theme) must be a prop or memo won't repaint on theme switch.
2. Batch the streaming state updates. Accumulate tokens in a ref and flush on a short timer (~60ms) instead of setState per token. Reset the buffer/timer at stream start AND on finalize, flush once after the read loop so the live bubble shows the full answer before the server-saved message replaces it, and clear the timer on unmount.

**Why:** the dominant cost is the history multiplier, which is exactly why the freeze appears only after several messages, not on the first answer.

**How to apply:** the message renderer feeds BOTH the desktop list and the mobile UI (mobile receives it as a prop). Fixing it at the memoized-component level fixes both at once — but any change to the renderer's signature must keep that desktop/mobile hand-off intact.
