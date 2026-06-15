---
name: Play Store listing assets
description: How the Google Play screenshots/feature graphic are generated and the copy rules they must follow
---

# Play Store listing assets

Assets live in `playstore_assets/` — `00_feature_graphic.png` (1024x500) + six phone
screenshots `01..06` (1080x1920). They are marketing graphics (headline + device mockup),
not real app screenshots.

## How they're generated
- Authored as SVG, rasterized with ImageMagick's librsvg delegate (`magick -background none in.svg out.png`). librsvg renders multi-stop gradients and the Inter font cleanly; ImageMagick's own MSVG renderer does not.
- Inter (all weights) is installed via fontconfig — use `font-family="Inter"` with `font-weight` 400/500/700/800.
- **Escape `&` as `&amp;` in any SVG text** (e.g. "Teams & unlimited") or librsvg fails to parse the file.

## Copy rules (MUST follow — user got angry TWICE about fabricated content)
- **Do NOT invent product facts.** Pull tier/model/price details from the REAL `/pricing` page (public route) — it is the source of truth. As of this writing it shows: Free = Anthropic Claude Haiku ($0); Pro = $6.99/mo Claude Sonnet 4.5; Research = $30/mo multi-brand verification (Claude Opus 4.1 + Claude Sonnet 4.5 + Gemini Pro). Re-check the live page before writing copy; numbers change.
- **Never say "ten models" / "every model".**
- **Verified / cited answers are Research & Enterprise only** — paid-tier feature, not universal.
- **Listing screenshots must be REAL app screenshots, not hand-drawn SVG mockups.** User explicitly rejected illustrated mockups twice ("these aren't the pictures from our app"). Capture actual app screens via the screenshot tool. Public routes (no login): /trial-chat, /pricing, /login, /register, /enterprise, /business, /crisis-info, /welcome. Richer in-app screens (live chat answer, voice, code studio, plans inside app) are behind login and need a test account to capture.
- Don't claim features the app can't deliver (user pushed back on the Code Studio "build apps" slide).
