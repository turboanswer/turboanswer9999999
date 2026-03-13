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

app.use(compression());

app.use((_req, res, next) => {
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains; preload"
  );
  if (process.env.NODE_ENV === "production") {
    res.setHeader(
      "Content-Security-Policy",
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline'",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: blob: https:",
        "connect-src 'self' wss: https://generativelanguage.googleapis.com https://api.openai.com https://api.anthropic.com https://api.paypal.com https://api-m.paypal.com https://api.brevo.com https://resend.com https://wttr.in https://api.open-meteo.com",
        "media-src 'self' blob:",
        "worker-src 'self' blob:",
      ].join("; ")
    );
  }
  next();
});

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

process.on('uncaughtException', (err) => {
  console.error('[Server] Uncaught exception:', err.message, err.stack);
  // Allow EADDRINUSE to be handled by graceful shutdown rather than hard exit
  if ((err as any).code === 'EADDRINUSE') {
    console.error('[Server] Port already in use — exiting cleanly');
    process.exit(0);
  }
  process.exit(1);
});

process.on('unhandledRejection', (reason: any) => {
  console.error('[Server] Unhandled rejection:', reason?.message || String(reason), reason?.stack);
});

(async () => {
  console.log('[Server] Starting up...');

  console.log('[Server] Registering routes...');
  const server = await registerRoutes(app);
  console.log('[Server] Routes registered.');

  try { await storage.seedOwnerPromoCode(); } catch (e: any) { /* Neon API may be disabled, ignore seed errors */ }

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
    console.log('[Server] Setting up static file serving...');
    serveStatic(app);
    console.log('[Server] Static files ready.');
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    console.log(`[Server] Listening on port ${port}...`);
    log(`serving on port ${port}`);
    initPayPal();
  });

  const gracefulShutdown = (signal: string) => {
    console.log(`[Server] ${signal} received, exiting...`);
    stopProactiveDiagnostics();
    process.exit(0);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
})();
