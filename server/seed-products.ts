// Seed script to create the Turbo Answer Pro product in Stripe
import { getUncachableStripeClient } from './stripeClient';

async function createProducts() {
  const stripe = await getUncachableStripeClient();

  const products = await stripe.products.search({ query: "name:'Turbo Answer Pro'" });
  if (products.data.length > 0) {
    console.log('Turbo Answer Pro already exists:', products.data[0].id);
    const prices = await stripe.prices.list({ product: products.data[0].id, active: true });
    for (const price of prices.data) {
      console.log(`  Price: ${price.id} - $${(price.unit_amount || 0) / 100}/${price.recurring?.interval}`);
    }
    return;
  }

  const product = await stripe.products.create({
    name: 'Turbo Answer Pro',
    description: 'Unlock Gemini 2.5 Pro and Deep Research mode for advanced AI assistance',
    metadata: {
      tier: 'pro',
      features: 'gemini-pro,gemini-pro-research,priority-speed',
    },
  });
  console.log('Created product:', product.id);

  const monthlyPrice = await stripe.prices.create({
    product: product.id,
    unit_amount: 699,
    currency: 'usd',
    recurring: { interval: 'month' },
  });
  console.log('Created monthly price:', monthlyPrice.id, '- $6.99/month');
}

createProducts().catch(console.error);
