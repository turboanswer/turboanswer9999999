---
name: Play compliance & native AI gating
description: Why the native app gated AI, what the Play notice actually was, and the real fix.
---

The native Android app previously hid AI Chat / AI Settings behind a "web only" gate, supposedly for a Google Play compliance notice. That notice was ONLY about a broken account-deletion URL in the Play Console Data safety form (an old replit.app link returning 404) — NOT about AI features.

**Why:** Un-gating AI in the native app is therefore safe. The compliance risk was the deletion link, not the chat.

**How to apply:**
- The real fix for the Play notice is to point the Data safety "account deletion" URL at a working page (the `/data-deletion` route works, e.g. https://turboanswer.it.com/data-deletion). No app resubmission needed for that.
- The native app is a webview of the Azure-served site (capacitor server.url), so UI/gating changes reach users on the next app open AFTER a web redeploy via GitHub Actions — no Play resubmit required for code changes.
- The web "gate" component returns children unchanged on non-native, so removing the gate wrapper from a route never changes web behavior — only native.
