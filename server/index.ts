import express, { type Request, Response, NextFunction } from "express";
import compression from "compression";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import cookieParser from "cookie-parser";
import crypto from "crypto";
import path from "path";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { ensureSubscriptionPlans } from "./paypal";
import { pool } from "./db";
import { stopProactiveDiagnostics } from "./services/proactive-diagnostics";
import { trackError } from "./services/error-tracker";
import { installAutoDebugger } from "./services/auto-debugger";
import { storage } from "./storage";
import { applyIntrusionMiddleware, setThreatCallback } from "./services/intrusion-detection";

const app = express();

// Trust the first reverse proxy (Azure App Service, Cloud Run, etc.)
// Required so req.ip, req.secure, and rate-limiting work behind a proxy.
app.set('trust proxy', 1);

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

app.disable('x-powered-by');

// Health check endpoint for Azure App Service / Cloud Run / Kubernetes probes.
// Must respond before any heavy middleware so platform health checks pass.
app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));
app.get('/healthz', (_req, res) => res.status(200).json({ status: 'ok' }));

app.use((req, res, next) => {
  const allowed = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
  if (!allowed.includes(req.method)) {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  next();
});

app.use((_req, res, next) => {
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()");
  res.setHeader("X-Permitted-Cross-Domain-Policies", "none");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  res.setHeader("Cross-Origin-Embedder-Policy", "credentialless");
  res.setHeader(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload"
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
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self' https://www.paypal.com https://api-m.paypal.com",
        "frame-ancestors 'none'",
        "upgrade-insecure-requests",
      ].join("; ")
    );
  }
  next();
});

// Strip port from IP (Azure proxies include port in req.ip), then defer to the
// library's ipKeyGenerator helper for proper IPv6 normalization.
const stripPort = (ip: string): string => {
  const ipv4 = ip.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}):\d+$/);
  if (ipv4) return ipv4[1];
  const ipv6 = ip.match(/^\[([^\]]+)\]:\d+$/);
  if (ipv6) return ipv6[1];
  return ip;
};

const limiterKey = (req: Request): string => ipKeyGenerator(stripPort(req.ip || ''));

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
  skip: (req) => !req.path.startsWith('/api'),
  keyGenerator: limiterKey,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts. Please try again later.' },
  skipSuccessfulRequests: true,
  keyGenerator: limiterKey,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: 'Too many registration attempts. Please try again later.' },
  keyGenerator: limiterKey,
});

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'AI rate limit reached. Please wait a moment.' },
  keyGenerator: limiterKey,
});

const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many password reset requests. Please try again later.' },
  keyGenerator: limiterKey,
});

const sensitiveApiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Too many requests. Please slow down.' },
  keyGenerator: limiterKey,
});

app.use(apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', registerLimiter);
app.use('/api/auth/forgot-password', passwordResetLimiter);
app.use('/api/auth/reset-password', passwordResetLimiter);
app.use('/api/conversations', aiLimiter);
app.use('/api/analyze-image', sensitiveApiLimiter);
app.use('/api/trial', sensitiveApiLimiter);
app.use('/api/checkout', sensitiveApiLimiter);
app.use('/api/admin', sensitiveApiLimiter);

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
app.use(cookieParser());

applyIntrusionMiddleware(app);


const CSRF_COOKIE = '_csrf_token';
const CSRF_HEADER = 'x-csrf-token';
const csrfCookieOptions = {
  httpOnly: false,
  secure: process.env.NODE_ENV === 'production' || !!process.env.REPL_SLUG,
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
};

app.use((req: Request, res: Response, next: NextFunction) => {
  if (!req.cookies?.[CSRF_COOKIE]) {
    const token = crypto.randomBytes(32).toString('hex');
    res.cookie(CSRF_COOKIE, token, csrfCookieOptions);
  }
  next();
});

app.get('/api/csrf-token', (req: Request, res: Response) => {
  let token = req.cookies?.[CSRF_COOKIE];
  if (!token) {
    token = crypto.randomBytes(32).toString('hex');
    res.cookie(CSRF_COOKIE, token, csrfCookieOptions);
  }
  res.json({ token });
});

const CSRF_EXEMPT_PATHS = [
  '/api/paypal/webhook',
  '/api/widget/',
];

app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return next();
  if (!req.path.startsWith('/api')) return next();

  if (CSRF_EXEMPT_PATHS.some(p => req.path.startsWith(p))) return next();

  const cookieToken = req.cookies?.[CSRF_COOKIE];
  const headerToken = req.get(CSRF_HEADER);

  if (!cookieToken || !headerToken) {
    console.warn(`[CSRF] Missing token on ${req.method} ${req.path}`);
    return res.status(403).json({ error: 'CSRF token missing' });
  }

  if (cookieToken !== headerToken) {
    console.warn(`[CSRF] Token mismatch on ${req.method} ${req.path}`);
    return res.status(403).json({ error: 'CSRF token invalid' });
  }

  next();
});

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

  installAutoDebugger();

  try { await storage.seedOwnerPromoCode(); } catch (e: any) { /* Neon API may be disabled, ignore seed errors */ }

  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const internalMessage = err.message || "Internal Server Error";
    console.error(`[Error] ${status}: ${internalMessage}`);
    if (status >= 500) {
      trackError('routeError', internalMessage, { stack: err.stack, route: req.path });
    }
    const safeMessage = status >= 500 ? "Internal Server Error" : internalMessage;
    res.status(status).json({ message: safeMessage });
  });

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    console.log('[Server] Setting up static file serving...');
    serveStatic(app);

    const spaIndexPath = path.resolve(import.meta.dirname, "public", "index.html");
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api")) return next();
      res.sendFile(spaIndexPath);
    });

    console.log('[Server] Static files ready.');
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({
    port,
    host: "0.0.0.0",
  }, () => {
    console.log(`Server is running on port ${port}`);
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
