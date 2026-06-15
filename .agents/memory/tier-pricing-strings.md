---
name: Tier & pricing strings are scattered (no single source)
description: Where user-visible tier names, prices, and model versions live — all must be updated together on any rebrand.
---

Tier display names, monthly prices, and per-tier model/version strings are duplicated across many files with NO central constant. A pricing/model rebrand must touch all of them or stale copies leak via emails, checkout, and /api/models.

**Why:** A "remove Gemini / bump Claude versions / change prices" rebrand was repeatedly "finished" while backend copies (emails, Stripe/PayPal product descriptions, the /api/models catalog, admin revenue math, refund fallbacks) still served old branding and prices. grep on the client alone is not enough.

**How to apply — check every one of these on any tier/price/model change:**
- `server/paypal.ts` — plan names, descriptions, price checks (e.g. `=== 10`), Enterprise desc. CAUTION: `plan.name` is used as an internal IDENTIFIER (`plan.name === "Turbo Pro"`) AND PayPal plans don't cleanly rename — changing it spawns a NEW plan on boot. Leave the literal plan.name as-is on rebrands; the client shows its own labels.
- `server/services/stripe.ts` — `TIER_CONFIG` name/description/`amountCents` (cents! $10 = 1000). Changing amountCents makes ensureStripeProducts create a NEW price object on next boot.
- `server/routes.ts` — `TIER_LABELS` / `TIER_PRICES` / `TIER_PERKS` (used by subscription emails), refund-amount fallback, admin revenue multipliers.
- `server/services/multi-ai.ts` — `AI_MODELS` catalog `name`/`description` (returned by `/api/models`, user-visible) and the `IDENTITY_RULE` brand line.
- `server/services/multi-agent.ts` — Deep Think synthesizer prompt brand label.
- Client: `pricing.tsx`, `subscribe.tsx`, `home.tsx`, `landing.tsx`, `business.tsx`, `chat.tsx` (multiple upgrade popups: Pro/Research/Enterprise/DailyLimit/Promo + welcome hints), `ai-settings.tsx`, `employee-dashboard.tsx`, `receptionist-dashboard.tsx` (`TIER_LABEL` + `TIER_PRICE`), `stack-trace-surgeon.tsx`, `mobile-welcome.tsx`, `MobileChatUI.tsx`, `CodeAnalyzerModal.tsx`, `code-customizer.tsx`.
- Internal-only (leave functional, do NOT rebrand): the Gemini API engine/fallback, AutoDebug "Gemini Flash" log, console.logs, code comments, config-error messages naming providers. Tier keys stay `free|pro|research|enterprise` in code — only the DISPLAY strings change.

Current map (June 2026, renamed): free=**Turbo AI** $0 Claude Haiku 5.5 · pro=**Turbo AI Pro** $10/mo Claude Sonnet 4.6 · research=**Matrix AI** $35/mo Claude Opus 4.8 · enterprise=$100/mo 5-seat team SKU of Matrix AI. (Was "Turbo"/"Turbo Pro" before.) `stripe.ts` TIER_CONFIG.name is metadata-keyed so renaming the string is safe but does NOT rename the already-created live Stripe product; `paypal.ts` plan.name kept as "Turbo Pro" on purpose (internal identifier — see CAUTION above).
