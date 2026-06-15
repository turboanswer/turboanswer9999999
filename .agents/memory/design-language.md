---
name: TurboAnswer design language ("Clear Blue")
description: The cohesive visual concept (clean, Gemini-grade blue minimal) and the rules that keep it custom rather than a knock-off.
---

# "Clear Blue" — clean, professional, Gemini-grade minimal

The app uses a clean, blue-forward, minimal aesthetic inspired by the Gemini app:
airy whitespace, soft rounded surfaces, and a vibrant blue→violet→magenta spark —
but it must stay CUSTOM (own gradient angle/stops, own spacing), not a pixel copy.

**The signature spark:** ONE gradient defined a single time as `--ai-gradient` in
`client/src/index.css` (light + dark roots) and reused everywhere
(`.spark-gradient-text`, `.ai-gradient-bg`, mobile `THEME.primaryGradient`).
- Light: `linear-gradient(105deg, #1a73e8 0%, #8e5ad4 50%, #e0608a 100%)`
- Dark:  `linear-gradient(105deg, #5b9bff 0%, #b58bf0 50%, #f291b0 100%)`

**Palette:** clean white (#ffffff) light / near-black (#131314) dark backgrounds;
Gemini-style light blue-grey surfaces (#f0f4f9) and dark surfaces (#1e1f20); Google
blue primary (#1a73e8 light / #8ab4f8-ish #5b9bff dark); Google grey text muted
(#5f6368 / #9aa0a6). Surfaces are NOT flat — they carry `--card-shadow` depth and a
`--spark-glow` focus halo.

**Why:** the user explicitly rejected the prior warm "paper/clay" direction and asked
for "a professional gemini looking app with a clean blue minimal design but that
doesn't look flat or hard to use … truly custom exactly like the gemini app." Warm
hexes were swept to this blue palette across index.css, chat.tsx, MobileChatUI.tsx,
login.tsx, register.tsx, ai-settings.tsx.

**How to apply:**
- Do NOT introduce new ad-hoc gradients. Reuse `--ai-gradient` / its helper classes.
- Keep the spark DISCIPLINED: greeting line, primary send action, AI/"thinking"
  moments only. Core surfaces stay clean blue-neutral (`--chat-input-bg`, `--chat-text`,
  `--chat-text-muted`, `--card-shadow`, `--spark-glow`).
- Greetings are clean SANS (Inter), gradient-filled — NOT serif. The old Fraunces
  `.font-display` serif greeting was removed; Gemini reads as a clean sans.
- "Not flat": keep subtle shadows + hover lift on cards; never pure-flat fills.
- Chat theming is split: desktop `chat.tsx` + `index.css` CSS vars; mobile
  `MobileChatUI.tsx` uses a local `THEME` object — update BOTH to stay consistent.
- App brand in store/marketing copy: ONE AI model per tier (all "Matrix AI", powered
  by Claude under the hood) — Free/Pro/Research/Enterprise. NEVER claim "ten models."
