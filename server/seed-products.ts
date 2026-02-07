import { getUncachableStripeClient } from './stripeClient';

async function createProducts() {
  const stripe = await getUncachableStripeClient();

  const proProducts = await stripe.products.search({ query: "name:'Turbo Answer Pro'" });
  if (proProducts.data.length > 0) {
    console.log('Turbo Answer Pro already exists:', proProducts.data[0].id);
  } else {
    const product = await stripe.products.create({
      name: 'Turbo Answer Pro',
      description: 'Unlock Gemini 2.5 Pro for advanced AI assistance',
      metadata: { tier: 'pro', features: 'gemini-pro,priority-speed' },
    });
    await stripe.prices.create({
      product: product.id,
      unit_amount: 699,
      currency: 'usd',
      recurring: { interval: 'month' },
    });
    console.log('Created Turbo Answer Pro:', product.id, '- $6.99/month');
  }

  const researchProducts = await stripe.products.search({ query: "name:'Turbo Answer Research'" });
  if (researchProducts.data.length > 0) {
    console.log('Turbo Answer Research already exists:', researchProducts.data[0].id);
  } else {
    const product = await stripe.products.create({
      name: 'Turbo Answer Research',
      description: 'Gemini 2.5 Pro powered deep research and comprehensive analysis',
      metadata: { tier: 'research', features: 'gemini-2.5-pro,gemini-pro,priority-speed' },
    });
    await stripe.prices.create({
      product: product.id,
      unit_amount: 1500,
      currency: 'usd',
      recurring: { interval: 'month' },
    });
    console.log('Created Turbo Answer Research:', product.id, '- $15/month');
  }
}

createProducts().catch(console.error);
