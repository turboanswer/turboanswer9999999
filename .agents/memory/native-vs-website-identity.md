---
name: Native app vs website identity
description: The Capacitor/Play Store app is a separate "division" from the website and must not show website-aesthetic surfaces.
---

The native app (Capacitor) and the marketing website are treated as two separate
divisions with deliberately different identities. The native app uses a dark,
futuristic "Matrix AI" brand; the website keeps its own marketing look.

**Rule:** Native users must never land on website-aesthetic marketing surfaces
(e.g. `LandingPage`). The authenticated root route in `client/src/App.tsx` branches
on `isNativeMobile` and sends native users to the chat app, web users to `LandingPage`.

**Why:** User explicitly wants the app "unrecognizable compared to the website" — they
are separate divisions. A prior bug had the `/` ternary return `LandingPage` for both
branches, so the app showed the website after login.

**How to apply:** When adding/restructuring routing or onboarding, keep native entry
points pointed at app surfaces (onboarding `mobile-welcome.tsx` → register/login → chat),
not website marketing pages. "Matrix AI" is the AI brand name; the website may keep its
own naming, but never re-introduce GPT/OpenAI vendor marketing in shared copy.
