import Stripe from "stripe";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

export const stripeEnabled = !!STRIPE_SECRET_KEY;

export const stripe: Stripe | null = STRIPE_SECRET_KEY
  ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2025-01-27.acacia" as any })
  : null;

export type Tier = "pro" | "research" | "enterprise";

const TIER_CONFIG: Record<Tier, { name: string; description: string; amountCents: number }> = {
  pro: {
    name: "TurboAnswer Pro",
    description: "Claude Sonnet 4.5, image generation, longer answers, priority support.",
    amountCents: 699,
  },
  research: {
    name: "TurboAnswer Research",
    description: "Multi-model AI panel (Claude + GPT-4o + Gemini Pro) synthesized for the most accurate answer. Includes AI Video Studio.",
    amountCents: 3000,
  },
  enterprise: {
    name: "TurboAnswer Enterprise",
    description: "Everything in Research plus team collaboration with up to 5 members and dedicated support.",
    amountCents: 10000,
  },
};

// Product/price IDs are looked up by metadata key so we never duplicate
// products if the server restarts.
const METADATA_KEY = "turboanswer_tier";

let cachedPriceIds: Partial<Record<Tier, string>> = {};

export async function ensureStripeProducts(): Promise<Record<Tier, string>> {
  if (!stripe) throw new Error("Stripe not configured");
  const tiers: Tier[] = ["pro", "research", "enterprise"];
  const results: Partial<Record<Tier, string>> = {};

  for (const tier of tiers) {
    if (cachedPriceIds[tier]) {
      results[tier] = cachedPriceIds[tier]!;
      continue;
    }
    const config = TIER_CONFIG[tier];

    // 1) Find or create the Product (keyed by metadata so we don't duplicate)
    const productSearch = await stripe.products.search({
      query: `metadata['${METADATA_KEY}']:'${tier}' AND active:'true'`,
      limit: 1,
    });
    let product = productSearch.data[0];
    if (!product) {
      product = await stripe.products.create({
        name: config.name,
        description: config.description,
        metadata: { [METADATA_KEY]: tier },
      });
      console.log(`[Stripe] Created product for ${tier}: ${product.id}`);
    }

    // 2) Find a monthly recurring USD price at the right amount; create if missing.
    const priceList = await stripe.prices.list({ product: product.id, active: true, limit: 100 });
    let price = priceList.data.find(p =>
      p.currency === "usd" &&
      p.unit_amount === config.amountCents &&
      p.recurring?.interval === "month",
    );
    if (!price) {
      price = await stripe.prices.create({
        product: product.id,
        currency: "usd",
        unit_amount: config.amountCents,
        recurring: { interval: "month" },
        metadata: { [METADATA_KEY]: tier },
      });
      console.log(`[Stripe] Created price for ${tier}: ${price.id} ($${(config.amountCents / 100).toFixed(2)}/mo)`);
    }

    cachedPriceIds[tier] = price.id;
    results[tier] = price.id;
  }

  return results as Record<Tier, string>;
}

export async function createCheckoutSession(opts: {
  tier: Tier;
  userId: string;
  email: string | null | undefined;
  existingCustomerId: string | null | undefined;
  successUrl: string;
  cancelUrl: string;
  trialDays?: number;
}): Promise<{ url: string; sessionId: string }> {
  if (!stripe) throw new Error("Stripe not configured");
  const prices = await ensureStripeProducts();
  const priceId = prices[opts.tier];

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: opts.successUrl,
    cancel_url: opts.cancelUrl,
    // Reuse existing customer if we have one (preserves payment methods,
    // history, default card), otherwise let Stripe create one and we'll
    // capture the id from the webhook.
    customer: opts.existingCustomerId || undefined,
    customer_email: opts.existingCustomerId ? undefined : (opts.email || undefined),
    client_reference_id: opts.userId,
    allow_promotion_codes: true,
    billing_address_collection: "auto",
    subscription_data: {
      trial_period_days: opts.trialDays ?? 7,
      metadata: { userId: opts.userId, tier: opts.tier },
    },
    metadata: { userId: opts.userId, tier: opts.tier },
  });

  if (!session.url) throw new Error("Stripe did not return a checkout URL");
  return { url: session.url, sessionId: session.id };
}

export async function createPortalSession(
  customerId: string,
  returnUrl: string,
): Promise<{ url: string }> {
  if (!stripe) throw new Error("Stripe not configured");
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
  return { url: session.url };
}

export async function cancelSubscriptionAtPeriodEnd(subscriptionId: string) {
  if (!stripe) throw new Error("Stripe not configured");
  return stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true });
}

/**
 * Verify a Stripe webhook signature and return the parsed event. Throws if
 * the signature is invalid — caller should respond 400.
 */
export function constructWebhookEvent(rawBody: Buffer | string, signature: string): Stripe.Event {
  if (!stripe) throw new Error("Stripe not configured");
  if (!STRIPE_WEBHOOK_SECRET) throw new Error("STRIPE_WEBHOOK_SECRET is not set");
  return stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET);
}

/**
 * Map a Stripe Price ID back to our internal tier name. Used in the webhook
 * when a subscription updates (plan change) and we need to know the new tier.
 */
export async function tierForPriceId(priceId: string): Promise<Tier | null> {
  const prices = await ensureStripeProducts();
  for (const [tier, id] of Object.entries(prices) as [Tier, string][]) {
    if (id === priceId) return tier;
  }
  // Fall back to looking up the price metadata directly (in case of a stale cache).
  if (!stripe) return null;
  try {
    const price = await stripe.prices.retrieve(priceId);
    const meta = price.metadata?.[METADATA_KEY];
    if (meta === "pro" || meta === "research" || meta === "enterprise") return meta;
  } catch {}
  return null;
}
