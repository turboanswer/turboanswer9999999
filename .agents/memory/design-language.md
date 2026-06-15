---
name: TurboAnswer design language ("Warm Intelligence")
description: The cohesive visual concept and the one rule that keeps it from looking like a Claude/Gemini knock-off.
---

# "Warm Intelligence" — Claude calm × Gemini spark

The app blends the Claude aesthetic (warm paper/charcoal, calm, editorial serif,
generous whitespace) with the Gemini aesthetic (a vibrant spectrum spark).

**The unifying move:** ONE signature gradient that travels Gemini-blue → violet →
Claude-clay, defined a single time as `--ai-gradient` in `client/src/index.css`
(light + dark roots) and reused everywhere (`.spark-gradient-text`, `.ai-gradient-bg`,
mobile `THEME.primaryGradient`). Ending the Gemini gradient in Claude's clay is what
fuses the two brand identities into one instead of mashing two palettes together.

**Why:** an earlier version mixed separate Gemini and Claude palettes side-by-side
and read as a "rip-off" of both. A single shared gradient + warm neutral surfaces
fixed that.

**How to apply:**
- Do NOT introduce new ad-hoc gradients. Reuse `--ai-gradient` / its helper classes.
- Keep the spark DISCIPLINED: greeting name, primary send action, AI/"thinking"
  moments only. Core surfaces stay warm-neutral (`--chat-input-bg`, `--chat-text`,
  `--chat-text-muted`, `--card-shadow`, `--spark-glow`).
- Serif (`.font-display` = Fraunces) is for presence moments (greetings/heroes); Inter
  for reading.
- Composer = `.composer-card` (warm at rest, `--spark-glow` halo on `:focus-within`);
  the inner textarea is transparent/border-less, so focus visibility lives on the card.
- Animated gradient text must keep the `prefers-reduced-motion: reduce` fallback.
- Chat theming is split: desktop `chat.tsx` + `index.css` CSS vars; mobile
  `MobileChatUI.tsx` uses a local `THEME` object — update BOTH to stay consistent.
