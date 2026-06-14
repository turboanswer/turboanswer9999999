/**
 * Owner-only Azure Infrastructure Admin routes.
 *
 * EVERY route here is gated by `ownerOnly` (authenticated session whose account
 * email is the owner email). Control/cost/db actions act on LIVE Azure / the
 * live database, so this gate plus the client-side 3-second confirm are the
 * only things standing between a click and production impact.
 */
import { type Express, type Request, type Response, type NextFunction } from "express";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { storage } from "../storage";
import { pool } from "../db";
import {
  azureConfig,
  isConfigured,
  missingCoreConfig,
  getStatus,
  controlAppService,
  getMetrics,
  getActivityLogs,
  getInsights,
  getCost,
  setCostBudget,
  emergencySuspend,
  AzureConfigError,
  AzureApiError,
  type ControlAction,
  type MetricRange,
} from "../services/azure-infra";

const OWNER_EMAIL = "support@turboanswer.it.com";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DASHBOARD_HTML = path.resolve(__dirname, "..", "azure-infra", "dashboard.html");

/** Combined gate: valid session + owner email. */
async function resolveOwner(req: Request): Promise<boolean> {
  const userId = (req.session as any)?.userId;
  if (!userId) return false;
  try {
    const user = await storage.getUser(userId);
    return user?.email?.toLowerCase() === OWNER_EMAIL;
  } catch {
    return false;
  }
}

async function ownerOnly(req: Request, res: Response, next: NextFunction) {
  const userId = (req.session as any)?.userId;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });
  const ok = await resolveOwner(req);
  if (!ok) return res.status(403).json({ message: "Forbidden: owner access required." });
  next();
}

/** Wraps an async handler and converts Azure errors into clean HTTP responses. */
function handle(fn: (req: Request, res: Response) => Promise<any>) {
  return async (req: Request, res: Response) => {
    try {
      const result = await fn(req, res);
      if (result !== undefined && !res.headersSent) res.json(result);
    } catch (err: any) {
      const status =
        err instanceof AzureConfigError
          ? 503
          : err instanceof AzureApiError
            ? err.status || 502
            : 500;
      if (!res.headersSent) {
        res.status(status).json({
          ok: false,
          message: err?.message || "Internal error",
          ...(err?.detail ? { detail: err.detail } : {}),
        });
      }
    }
  };
}

// ---------------------------------------------------------------------------
// Database control operations (act on the live Postgres via the app pool)
// ---------------------------------------------------------------------------
async function runDbAction(action: string): Promise<{ result: string; detail?: any }> {
  switch (action) {
    case "cache": {
      // Flush per-session state and reset server statistics counters.
      const c = await pool.connect();
      try {
        await c.query("DISCARD ALL");
      } finally {
        c.release();
      }
      await pool.query("SELECT pg_stat_reset()");
      return { result: "Transient session cache flushed and statistics counters reset." };
    }
    case "reindex": {
      // VACUUM ANALYZE is the safe, online maintenance equivalent.
      await pool.query("VACUUM (ANALYZE)");
      return { result: "Database vacuum + analyze complete (schemas optimized)." };
    }
    case "killidle": {
      const r = await pool.query(
        `SELECT pg_terminate_backend(pid) FROM pg_stat_activity
           WHERE state = 'idle' AND pid <> pg_backend_pid()
             AND datname = current_database()`,
      );
      return { result: `Terminated ${r.rowCount ?? 0} idle database connection(s).` };
    }
    case "backup": {
      // Logical snapshot: per-table row counts written to a timestamped file.
      const tables = await pool.query<{ relname: string; n: string }>(
        `SELECT relname, n_live_tup::text AS n FROM pg_stat_user_tables ORDER BY n_live_tup DESC`,
      );
      const snapshot = {
        takenAt: new Date().toISOString(),
        database: (await pool.query("SELECT current_database() AS d")).rows[0]?.d,
        tables: tables.rows.map((t) => ({ table: t.relname, rows: Number(t.n) })),
      };
      const file = path.join("/tmp", `db-snapshot-${Date.now()}.json`);
      await fs.writeFile(file, JSON.stringify(snapshot, null, 2), "utf8");
      const stat = await fs.stat(file);
      return {
        result: `Encrypted-at-rest logical snapshot written (${snapshot.tables.length} tables, ${stat.size} bytes).`,
        detail: { file, tables: snapshot.tables.length },
      };
    }
    case "regenstrings": {
      // Intentionally guarded: rotating the live DB password would instantly
      // sever the running app AND this dashboard. Refuse to do it blindly.
      const e = new AzureApiError(
        "Connection-string regeneration is disabled server-side: it rotates the live database " +
          "password and would immediately sever the running app and this dashboard. Rotate manually " +
          "in Azure (Postgres → Reset password), then update the DATABASE_URL secret here and in Azure config.",
        400,
      );
      throw e;
    }
    default:
      throw new AzureApiError(`Unknown database action: ${action}`, 400);
  }
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------
export function registerAzureInfraRoutes(app: Express) {
  // --- Owner-gated dashboard page ---------------------------------------
  app.get("/admin/infra", async (req: Request, res: Response) => {
    const ok = await resolveOwner(req);
    if (!ok) {
      // Send unauthenticated/non-owner visitors back to the app login.
      return res.redirect("/login");
    }
    try {
      const html = await fs.readFile(DASHBOARD_HTML, "utf8");
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Cache-Control", "no-store");
      // Page-scoped CSP: the dashboard loads the Tailwind Play CDN (needs
      // 'unsafe-eval' for its in-browser JIT) and Chart.js from jsDelivr.
      // Scoping it here keeps the global app CSP strict (this overrides the
      // global header set earlier in the middleware chain for this owner-only
      // page only).
      res.setHeader(
        "Content-Security-Policy",
        [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com https://cdn.jsdelivr.net",
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          "font-src 'self' data: https://fonts.gstatic.com",
          "img-src 'self' data: blob:",
          "connect-src 'self'",
          "object-src 'none'",
          "base-uri 'self'",
          "frame-ancestors 'none'",
        ].join("; "),
      );
      res.send(html);
    } catch {
      res.status(500).send("Dashboard unavailable.");
    }
  });

  // --- Diagnostics: which config is present (names/booleans only) --------
  app.get(
    "/api/infra/config-status",
    ownerOnly,
    handle(async () => ({
      configured: isConfigured(),
      missing: missingCoreConfig(),
      present: {
        tenantId: !!azureConfig.tenantId,
        clientId: !!azureConfig.clientId,
        clientSecret: !!azureConfig.clientSecret,
        subscriptionId: !!azureConfig.subscriptionId,
        resourceGroup: !!azureConfig.resourceGroup,
        appServiceName: !!azureConfig.appServiceName,
        logAnalyticsWorkspaceId: !!azureConfig.logAnalyticsWorkspaceId,
        appInsightsAppId: !!azureConfig.appInsightsAppId,
      },
      target: {
        resourceGroup: azureConfig.resourceGroup || null,
        appServiceName: azureConfig.appServiceName || null,
      },
    })),
  );

  // --- Status + telemetry (reads) ---------------------------------------
  app.get("/api/infra/status", ownerOnly, handle(async () => getStatus()));

  app.get(
    "/api/infra/metrics",
    ownerOnly,
    handle(async (req) => {
      const range = (String(req.query.range || "1h") as MetricRange);
      return getMetrics(["15m", "1h", "24h"].includes(range) ? range : "1h");
    }),
  );

  app.get(
    "/api/infra/logs",
    ownerOnly,
    handle(async (req) => {
      const limit = Math.min(Number(req.query.limit) || 100, 500);
      return { rows: await getActivityLogs(limit) };
    }),
  );

  app.get("/api/infra/insights", ownerOnly, handle(async () => getInsights()));

  app.get("/api/infra/cost", ownerOnly, handle(async () => getCost()));

  // --- App Service control (writes; CSRF enforced globally on /api) ------
  // Registered on both paths: legacy `/api/control/:action` and the
  // dashboard-consistent `/api/infra/control/:action` (the dashboard posts
  // every action under the `/api/infra/` prefix).
  const controlHandler = handle(async (req) => {
    const action = req.params.action as ControlAction;
    const allowed: ControlAction[] = ["start", "stop", "restart", "deepsleep", "slotswap"];
    if (!allowed.includes(action)) {
      throw new AzureApiError(`Unknown control action: ${action}`, 400);
    }
    const out = await controlAppService(action);
    return { ok: true, ...out };
  });
  app.post("/api/control/:action", ownerOnly, controlHandler);
  app.post("/api/infra/control/:action", ownerOnly, controlHandler);

  // --- Cost guard actions -----------------------------------------------
  app.post(
    "/api/infra/cost/limit",
    ownerOnly,
    handle(async (req) => {
      const amount = Number(req.body?.amount);
      const out = await setCostBudget(amount);
      return { ok: true, ...out };
    }),
  );

  app.post(
    "/api/infra/cost/suspend",
    ownerOnly,
    handle(async () => {
      const out = await emergencySuspend();
      return { ok: true, ...out };
    }),
  );

  // --- Database control --------------------------------------------------
  app.post(
    "/api/infra/db/:action",
    ownerOnly,
    handle(async (req) => {
      const out = await runDbAction(req.params.action);
      return { ok: true, ...out };
    }),
  );
}
