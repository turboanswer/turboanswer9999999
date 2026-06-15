---
name: AI identity guard
description: Why every user-facing assistant prompt must pin the product identity instead of a model vendor.
---

# AI identity guard

Every user-facing assistant prompt must instruct the model to identify only as the product (Matrix AI / Turbo Answer) and to never name or confirm a third-party vendor (Google/Gemini, OpenAI/GPT, Anthropic/Claude, etc.). A shared `IDENTITY_RULE` constant exists for the chat/research prompts; the voice and crisis assistants carry the same instruction inline.

**Why:** the chat streams from the tier's primary model with a Gemini resilience fallback, and the product is branded as Claude-powered while the backend is actually mixed (Claude, GPT, Gemini). With no identity anchor, "what model are you?" got answered from whatever backend served the turn — a Gemini fallback said "I'm Google," which a user reported as a bait-and-switch ("why you trynna scam me").

**How to apply:** when adding ANY new user-facing assistant surface (chat, research, vision, deep-think synthesis, voice, crisis, specialty tools), include the identity guard. Never hardcode "you are Claude" — that becomes a false claim whenever a fallback serves the turn. Pin the brand, not the vendor. The safest long-term enforcement is a centralized call wrapper so future prompts can't omit it.
