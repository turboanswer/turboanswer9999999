import express, { type Request, Response, NextFunction } from "express";
import { runMigrations } from 'stripe-replit-sync';
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { getStripeSync, getUncachableStripeClient } from "./stripeClient";
import { WebhookHandlers } from "./webhookHandlers";
import { storage } from "./storage";
import { users } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

const app = express();

async function initStripe() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.warn('DATABASE_URL not set, skipping Stripe init');
    return;
  }

  try {
    console.log('Initializing Stripe schema...');
    await runMigrations({ databaseUrl } as any);
    console.log('Stripe schema ready');

    const stripeSync = await getStripeSync();

    console.log('Setting up managed webhook...');
    try {
      const webhookBaseUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}`;
      const result = await stripeSync.findOrCreateManagedWebhook(
        `${webhookBaseUrl}/api/stripe/webhook`
      );
      console.log('Webhook configured:', result?.webhook?.url || 'OK');
    } catch (webhookError: any) {
      console.warn('Webhook setup warning (non-critical):', webhookError.message);
    }

    console.log('Syncing Stripe data...');
    stripeSync.syncBackfill()
      .then(() => console.log('Stripe data synced'))
      .catch((err: any) => console.error('Error syncing Stripe data:', err));
  } catch (error) {
    console.error('Failed to initialize Stripe:', error);
  }
}

await initStripe();

// Register Stripe webhook route BEFORE express.json()
app.post(
  '/api/stripe/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const signature = req.headers['stripe-signature'];
    if (!signature) {
      return res.status(400).json({ error: 'Missing stripe-signature' });
    }

    try {
      const sig = Array.isArray(signature) ? signature[0] : signature;

      if (!Buffer.isBuffer(req.body)) {
        console.error('STRIPE WEBHOOK ERROR: req.body is not a Buffer');
        return res.status(500).json({ error: 'Webhook processing error' });
      }

      // Let stripe-replit-sync process the webhook first
      await WebhookHandlers.processWebhook(req.body as Buffer, sig);

      // Also handle app-level subscription updates
      try {
        const stripe = await getUncachableStripeClient();
        const event = stripe.webhooks.constructEvent(req.body, sig, '');
        
        if (event.type === 'checkout.session.completed') {
          const session = event.data.object as any;
          const customerId = session.customer;
          const subscriptionId = session.subscription;
          const tier = session.metadata?.tier || 'pro';
          
          if (customerId && subscriptionId) {
            const [user] = await db.select().from(users).where(eq(users.stripeCustomerId, customerId));
            if (user) {
              await storage.updateUserStripeInfo(user.id, customerId, subscriptionId);
              await storage.updateUserSubscription(user.id, 'active', tier);
              console.log(`[Stripe] Updated user ${user.id} to ${tier} subscription`);
            }
          }
        } else if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
          const subscription = event.data.object as any;
          const customerId = subscription.customer;
          const status = subscription.status;
          
          const [user] = await db.select().from(users).where(eq(users.stripeCustomerId, customerId));
          if (user) {
            if (status === 'active' || status === 'trialing') {
              let tier = 'pro';
              try {
                const item = subscription.items?.data?.[0];
                if (item?.price?.product) {
                  const productId = typeof item.price.product === 'string' ? item.price.product : item.price.product.id;
                  const product = await stripe.products.retrieve(productId);
                  if (product.name?.toLowerCase().includes('research') || product.metadata?.tier === 'research') {
                    tier = 'research';
                  }
                }
                if (item?.price?.unit_amount === 1500) tier = 'research';
              } catch (e) {}
              await storage.updateUserSubscription(user.id, status, tier);
              console.log(`[Stripe] Updated user ${user.id} subscription: ${status}, tier: ${tier}`);
            } else {
              await storage.updateUserSubscription(user.id, status, 'free');
              console.log(`[Stripe] Updated user ${user.id} subscription cancelled: ${status}`);
            }
          }
        }
      } catch (appError: any) {
        // Non-critical - stripe-replit-sync already processed the webhook
        console.log('[Stripe] App-level webhook handling note:', appError.message?.substring(0, 100));
      }

      res.status(200).json({ received: true });
    } catch (error: any) {
      console.error('Webhook error:', error.message);
      res.status(400).json({ error: 'Webhook processing error' });
    }
  }
);

// Now apply JSON middleware for all other routes
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
