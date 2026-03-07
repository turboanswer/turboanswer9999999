import express, { type Request, Response, NextFunction } from "express";
import compression from "compression";
import rateLimit from "express-rate-limit";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { ensureSubscriptionPlans } from "./paypal";
import { pool } from "./db";
import { stopProactiveDiagnostics } from "./services/proactive-diagnostics";
import { trackError } from "./services/error-tracker";
import { storage } from "./storage";

const app = express();

async function initPayPal() {
  try {
    if (process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET) {
      console.log('[PayPal] Initializing subscription plans...');
      await ensureSubscriptionPlans();
      console.log('[PayPal] Ready');
    } else {
      console.warn('[PayPal] Missing credentials, skipping init');
    }
  } catch (error: any) {
    console.error('[PayPal] Init error:', error.message);
  }
}

await initPayPal();

app.use(compression());

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
  skip: (req) => !req.path.startsWith('/api'),
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Too many login attempts. Please try again later.' },
});

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'AI rate limit reached. Please wait a moment.' },
});

app.use(apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/conversations', aiLimiter);

app.use(express.json({ limit: '10mb' }));
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
  try { await storage.seedOwnerPromoCode(); } catch (e: any) { console.error('[PromoCode] Seed error:', e.message); }

  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    console.error(`[Error] ${status}: ${message}`);
    if (status >= 500) {
      trackError('routeError', message, { stack: err.stack, route: req.path });
    }
    res.status(status).json({ message });
  });

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });

  const gracefulShutdown = (signal: string) => {
    console.log(`[Server] ${signal} received, shutting down gracefully...`);
    stopProactiveDiagnostics();
    server.close(() => {
      console.log('[Server] HTTP server closed');
      pool.end().then(() => {
        console.log('[Server] Database pool closed');
        process.exit(0);
      }).catch(() => process.exit(1));
    });
    setTimeout(() => {
      console.error('[Server] Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  process.on('uncaughtException', (err) => {
    console.error('[Server] Uncaught exception:', err.message);
    trackError('uncaughtException', err.message, { stack: err.stack });
    gracefulShutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason: any) => {
    const message = reason?.message || String(reason);
    console.error('[Server] Unhandled rejection:', message);
    trackError('unhandledRejection', message, { stack: reason?.stack });
  });
})();
