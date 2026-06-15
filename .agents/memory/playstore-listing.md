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

## Copy rules (MUST follow — user got angry about wrong claims)
- **Never say "ten models" / "every model".** The product is ONE AI per plan, all branded **Matrix AI**, powered by Claude.
  - Free = Matrix AI · Claude 3.7 Sonnet
  - Pro = Matrix AI · Claude 4.5 Sonnet
  - Research / Enterprise = "Matrix AI Research" multi-agent (deep think)
- **Verified / cited answers are Research & Enterprise only** — frame the "Verified, cited" slide as a paid-tier feature, not universal.
- Visual style must match the live app's "Clear Blue" design (see design-language.md): white bg, #1a73e8 blue, blue→violet→magenta spark gradient, clean Inter sans (NOT serif), soft shadows.
