---
name: Theme system & CSS var format
description: How the app theme tokens are defined, the hsl() gotcha, and why the marketing landing is a separate black theme.
---

# Theme system

The app uses a "warm paper, clean glass" design language (Claude-warm + Gemini-clean): warm off-white light mode, warm charcoal dark mode, a clay/terracotta primary accent, and a blue→violet `--ai-gradient` reserved only for "AI moments" (streaming, thinking, the send button, key CTAs).

## CSS variables are FULL hsl() strings, not bare channels
In `client/src/index.css` the tokens are defined as complete colors, e.g. `--border: hsl(40, 18%, 87%);` and `--primary: hsl(16, 55%, 52%);` — NOT as bare `H S% L%` channels.

**Rule:** consume them directly as `var(--border)` / `var(--primary)`. Do NOT wrap them in `hsl(...)`.
**Why:** writing `hsl(var(--border))` resolves to `hsl(hsl(40,18%,87%))`, which is invalid and silently yields wrong/black colors. This bit the recharts chart on the landing page (fills/strokes used `hsl(var(--primary))`).
**How to apply:** in inline styles, recharts props, and any JS-driven color, use `var(--x)` directly. For alpha, don't try `var(--x)/0.5` — use a literal rgba instead. This differs from the typical shadcn convention where vars ARE bare channels and you DO write `hsl(var(--x))`; this project broke that convention.

## The marketing landing is a SEPARATE black theme — by design
`client/src/pages/landing.tsx` is intentionally a self-contained premium **black/near-black** marketing site (Linear/Vercel/Anthropic feel) with inline styles, deliberately NOT following the app's warm theme.
**Why:** the user explicitly wanted the public website to look professional and black ("not scammy"), distinct from the warm in-app chat experience.
**How to apply:** do not "fix" the landing to match the warm app palette — the divergence is intentional. The app (chat, settings, auth) stays warm; the landing stays black. The public WEBSITE/landing brands as "TurboAnswer" — old "Matrix AI" naming and the fake competitor benchmark chart were removed there as they read as scammy. NOTE: the Capacitor native app is a separate division that intentionally keeps "Matrix AI" branding (see native-vs-website-identity.md) — do not rename native to TurboAnswer.
