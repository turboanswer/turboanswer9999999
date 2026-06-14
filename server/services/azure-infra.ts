/**
 * Azure Infrastructure Admin — server-side proxy service.
 *
 * Authenticates as a service principal (ClientSecretCredential) and exposes typed
 * helpers for Azure Resource Manager (ARM) control operations, Azure Monitor
 * metrics, Log Analytics (KQL) queries, Application Insights analytics, and
 * Cost Management. All credentials are read from environment variables and are
 * NEVER hardcoded or sent to the browser.
 *
 * Dev (Replit): reads Replit secrets.
 * Prod (Azure App Service): the SAME variables must be configured in the App
 * Service "Environment variables / Application settings".
 *
 * Required RBAC on the service principal (else calls 403):
 *  - Contributor (or Website Contributor) on the resource group  -> control ops
 *  - Monitoring Reader                                           -> metrics
 *  - Log Analytics Reader                                        -> activity logs
 *  - Cost Management Reader                                      -> cost panel
 */
import { ClientSecretCredential, type AccessToken } from "@azure/identity";

// ---------------------------------------------------------------------------
// Configuration (from env)
// ---------------------------------------------------------------------------
export const azureConfig = {
  tenantId: process.env.AZURE_TENANT_ID || "",
  clientId: process.env.AZURE_CLIENT_ID || "",
  clientSecret: process.env.AZURE_CLIENT_SECRET || "",
  subscriptionId: process.env.AZURE_SUBSCRIPTION_ID || "",
  resourceGroup: process.env.AZURE_RESOURCE_GROUP || "",
  appServiceName: process.env.AZURE_APP_SERVICE_NAME || "",
  logAnalyticsWorkspaceId: process.env.AZURE_LOG_ANALYTICS_WORKSPACE_ID || "",
  appInsightsAppId: process.env.AZURE_APP_INSIGHTS_APP_ID || "",
};

// API versions (stable / known-valid).
const API = {
  web: "2023-12-01",
  metrics: "2023-10-01",
  costQuery: "2023-11-01",
  budgets: "2023-11-01",
};

// Scopes for the three Azure data planes we talk to.
const SCOPE = {
  arm: "https://management.azure.com/.default",
  logs: "https://api.loganalytics.io/.default",
  insights: "https://api.applicationinsights.io/.default",
};

const ARM_BASE = "https://management.azure.com";

export class AzureConfigError extends Error {
  status = 503;
  constructor(message: string) {
    super(message);
    this.name = "AzureConfigError";
  }
}

export class AzureApiError extends Error {
  status: number;
  detail: unknown;
  constructor(message: string, status: number, detail?: unknown) {
    super(message);
    this.name = "AzureApiError";
    this.status = status;
    this.detail = detail;
  }
}

/** Returns the list of missing required config keys (for diagnostics). */
export function missingCoreConfig(): string[] {
  const missing: string[] = [];
  if (!azureConfig.tenantId) missing.push("AZURE_TENANT_ID");
  if (!azureConfig.clientId) missing.push("AZURE_CLIENT_ID");
  if (!azureConfig.clientSecret) missing.push("AZURE_CLIENT_SECRET");
  if (!azureConfig.subscriptionId) missing.push("AZURE_SUBSCRIPTION_ID");
  if (!azureConfig.resourceGroup) missing.push("AZURE_RESOURCE_GROUP");
  if (!azureConfig.appServiceName) missing.push("AZURE_APP_SERVICE_NAME");
  return missing;
}

export function isConfigured(): boolean {
  return missingCoreConfig().length === 0;
}

// ---------------------------------------------------------------------------
// Token management: ClientSecretCredential with per-scope caching + silent renewal
// ---------------------------------------------------------------------------
let _credential: ClientSecretCredential | null = null;
const _tokenCache = new Map<string, AccessToken>();
const _inflight = new Map<string, Promise<AccessToken>>();
// Refresh a little before actual expiry so requests are never issued with a
// token that expires mid-flight.
const RENEW_SKEW_MS = 5 * 60 * 1000;

function credential(): ClientSecretCredential {
  const missing = missingCoreConfig().filter((k) =>
    ["AZURE_TENANT_ID", "AZURE_CLIENT_ID", "AZURE_CLIENT_SECRET"].includes(k),
  );
  if (missing.length) {
    throw new AzureConfigError(
      `Azure credentials are not configured. Missing: ${missing.join(", ")}. ` +
        `Set them as secrets (dev) and in Azure App Service settings (prod).`,
    );
  }
  if (!_credential) {
    _credential = new ClientSecretCredential(
      azureConfig.tenantId,
      azureConfig.clientId,
      azureConfig.clientSecret,
    );
  }
  return _credential;
}

async function getToken(scope: string): Promise<string> {
  const cached = _tokenCache.get(scope);
  if (cached && cached.expiresOnTimestamp - RENEW_SKEW_MS > Date.now()) {
    return cached.token;
  }
  // De-duplicate concurrent refreshes for the same scope.
  let pending = _inflight.get(scope);
  if (!pending) {
    pending = (async () => {
      const tok = await credential().getToken(scope);
      if (!tok) throw new AzureApiError("Failed to acquire Azure token", 502);
      _tokenCache.set(scope, tok);
      return tok;
    })();
    _inflight.set(scope, pending);
    pending.finally(() => _inflight.delete(scope));
  }
  const tok = await pending;
  return tok.token;
}

// ---------------------------------------------------------------------------
// Low-level REST helpers
// ---------------------------------------------------------------------------
async function callJson(
  url: string,
  scope: string,
  init: RequestInit = {},
): Promise<any> {
  const token = await getToken(scope);
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
    ...(init.headers as Record<string, string> | undefined),
  };
  if (init.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(url, { ...init, headers });
  const text = await res.text();
  let parsed: any = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }
  if (!res.ok) {
    const msg =
      parsed?.error?.message ||
      parsed?.message ||
      (typeof parsed === "string" ? parsed : `Azure API error ${res.status}`);
    throw new AzureApiError(msg, res.status, parsed);
  }
  return parsed;
}

/** Generic ARM request. `path` is relative to the ARM base. */
export async function armRequest(
  method: string,
  path: string,
  apiVersion: string,
  body?: unknown,
): Promise<any> {
  const sep = path.includes("?") ? "&" : "?";
  const url = `${ARM_BASE}${path}${sep}api-version=${apiVersion}`;
  return callJson(url, SCOPE.arm, {
    method,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

function siteBasePath(): string {
  if (!azureConfig.subscriptionId || !azureConfig.resourceGroup || !azureConfig.appServiceName) {
    throw new AzureConfigError(
      "App Service target not configured (subscription / resource group / app name).",
    );
  }
  return (
    `/subscriptions/${azureConfig.subscriptionId}` +
    `/resourceGroups/${azureConfig.resourceGroup}` +
    `/providers/Microsoft.Web/sites/${azureConfig.appServiceName}`
  );
}

// ---------------------------------------------------------------------------
// App Service status + control
// ---------------------------------------------------------------------------
export async function getStatus() {
  const site = await armRequest("GET", siteBasePath(), API.web);
  let alwaysOn: boolean | null = null;
  try {
    const cfg = await armRequest("GET", `${siteBasePath()}/config/web`, API.web);
    alwaysOn = cfg?.properties?.alwaysOn ?? null;
  } catch {
    /* non-fatal */
  }
  return {
    name: site?.name ?? azureConfig.appServiceName,
    state: site?.properties?.state ?? "Unknown", // "Running" | "Stopped"
    enabled: site?.properties?.enabled ?? null,
    defaultHostName: site?.properties?.defaultHostName ?? null,
    location: site?.location ?? null,
    sku: site?.properties?.sku ?? null,
    alwaysOn,
    availabilityState: site?.properties?.availabilityState ?? null,
  };
}

export type ControlAction =
  | "start"
  | "stop"
  | "restart"
  | "deepsleep"
  | "slotswap";

export async function controlAppService(action: ControlAction) {
  switch (action) {
    case "start":
      await armRequest("POST", `${siteBasePath()}/start`, API.web);
      return { action, result: "App Service start requested." };
    case "stop":
      await armRequest("POST", `${siteBasePath()}/stop`, API.web);
      return { action, result: "App Service stop requested." };
    case "restart":
      await armRequest(
        "POST",
        `${siteBasePath()}/restart?softRestart=false`,
        API.web,
      );
      return { action, result: "App Service hard restart requested." };
    case "deepsleep":
      // No literal "deep sleep" in Azure; the recoverable low-power equivalent
      // is disabling Always On so the worker can idle/unload.
      await armRequest("PATCH", `${siteBasePath()}/config/web`, API.web, {
        properties: { alwaysOn: false },
      });
      return {
        action,
        result: "Deep sleep enabled (Always On disabled; worker may idle).",
      };
    case "slotswap":
      // Swap the 'staging' deployment slot into production.
      await armRequest("POST", `${siteBasePath()}/slotsswap`, API.web, {
        targetSlot: "staging",
        preserveVnet: true,
      });
      return { action, result: "Production slot swap with 'staging' requested." };
    default:
      throw new AzureApiError(`Unknown control action: ${action}`, 400);
  }
}

// ---------------------------------------------------------------------------
// Azure Monitor metrics (App Service site-level)
// ---------------------------------------------------------------------------
export type MetricRange = "15m" | "1h" | "24h";

function rangeToTimespanInterval(range: MetricRange): {
  timespan: string;
  interval: string;
} {
  const now = new Date();
  const end = now.toISOString();
  let startMs: number;
  let interval: string;
  switch (range) {
    case "15m":
      startMs = now.getTime() - 15 * 60 * 1000;
      interval = "PT1M";
      break;
    case "24h":
      startMs = now.getTime() - 24 * 60 * 60 * 1000;
      interval = "PT15M";
      break;
    case "1h":
    default:
      startMs = now.getTime() - 60 * 60 * 1000;
      interval = "PT1M";
      break;
  }
  return { timespan: `${new Date(startMs).toISOString()}/${end}`, interval };
}

export async function getMetrics(range: MetricRange = "1h") {
  const { timespan, interval } = rangeToTimespanInterval(range);
  // Site-level metrics that exist without needing the App Service Plan name.
  const metricNames = [
    "CpuTime",
    "MemoryWorkingSet",
    "BytesReceived",
    "BytesSent",
    "Requests",
    "Http5xx",
    "AverageResponseTime",
  ].join(",");
  const path =
    `${siteBasePath()}/providers/Microsoft.Insights/metrics` +
    `?metricnames=${encodeURIComponent(metricNames)}` +
    `&timespan=${encodeURIComponent(timespan)}` +
    `&interval=${interval}` +
    `&aggregation=Average,Total`;
  const data = await armRequest("GET", path, API.metrics);

  const series: Record<string, { t: string; v: number | null }[]> = {};
  for (const m of data?.value ?? []) {
    const name = m?.name?.value ?? "unknown";
    const points = m?.timeseries?.[0]?.data ?? [];
    series[name] = points.map((p: any) => ({
      t: p.timeStamp,
      v: p.average ?? p.total ?? null,
    }));
  }
  return { range, timespan, interval, series };
}

// ---------------------------------------------------------------------------
// Log Analytics (AzureActivity via KQL)
// ---------------------------------------------------------------------------
async function logAnalyticsQuery(kql: string): Promise<any> {
  if (!azureConfig.logAnalyticsWorkspaceId) {
    throw new AzureConfigError(
      "Log Analytics workspace not configured (AZURE_LOG_ANALYTICS_WORKSPACE_ID).",
    );
  }
  const url = `https://api.loganalytics.io/v1/workspaces/${azureConfig.logAnalyticsWorkspaceId}/query`;
  return callJson(url, SCOPE.logs, {
    method: "POST",
    body: JSON.stringify({ query: kql }),
  });
}

/** Converts a Log Analytics/App Insights table response into row objects. */
function tableToRows(resp: any): Record<string, any>[] {
  const table = resp?.tables?.[0];
  if (!table) return [];
  const cols: string[] = (table.columns || []).map((c: any) => c.name);
  return (table.rows || []).map((row: any[]) => {
    const obj: Record<string, any> = {};
    cols.forEach((c, i) => (obj[c] = row[i]));
    return obj;
  });
}

export async function getActivityLogs(limit = 100) {
  const kql =
    `AzureActivity ` +
    `| where TimeGenerated > ago(1h) ` +
    `| project TimeGenerated, OperationNameValue, Caller, ActivityStatusValue, ResourceGroup ` +
    `| order by TimeGenerated desc ` +
    `| take ${Math.max(1, Math.min(limit, 500))}`;
  const resp = await logAnalyticsQuery(kql);
  return tableToRows(resp);
}

// ---------------------------------------------------------------------------
// Application Insights analytics
// ---------------------------------------------------------------------------
async function appInsightsQuery(kql: string): Promise<any> {
  if (!azureConfig.appInsightsAppId) {
    throw new AzureConfigError(
      "Application Insights not configured (AZURE_APP_INSIGHTS_APP_ID).",
    );
  }
  const url = `https://api.applicationinsights.io/v1/apps/${azureConfig.appInsightsAppId}/query`;
  return callJson(url, SCOPE.insights, {
    method: "POST",
    body: JSON.stringify({ query: kql }),
  });
}

export async function getInsights() {
  // Active sessions in the last 5 minutes.
  const sessionsKql =
    `requests | where timestamp > ago(5m) | summarize sessions = dcount(session_Id)`;
  // Average request latency over the last hour, binned per 5 min.
  const latencyKql =
    `requests | where timestamp > ago(1h) ` +
    `| summarize avgMs = avg(duration) by bin(timestamp, 5m) | order by timestamp asc`;
  // Dependency latency over the last hour.
  const depKql =
    `dependencies | where timestamp > ago(1h) ` +
    `| summarize avgMs = avg(duration) by bin(timestamp, 5m) | order by timestamp asc`;
  // HTTP status-code breakdown over the last hour.
  const statusKql =
    `requests | where timestamp > ago(1h) ` +
    `| summarize count() by bucket = case(` +
    `toint(resultCode) >= 500, "5xx", ` +
    `toint(resultCode) >= 400, "4xx", ` +
    `toint(resultCode) >= 200, "2xx", "other")`;

  const [sessions, latency, deps, status] = await Promise.allSettled([
    appInsightsQuery(sessionsKql),
    appInsightsQuery(latencyKql),
    appInsightsQuery(depKql),
    appInsightsQuery(statusKql),
  ]);

  const firstScalar = (r: PromiseSettledResult<any>): number => {
    if (r.status !== "fulfilled") return 0;
    const rows = tableToRows(r.value);
    const v = rows[0] ? Object.values(rows[0])[0] : 0;
    return typeof v === "number" ? v : Number(v) || 0;
  };

  const statusCounts: Record<string, number> = { "2xx": 0, "4xx": 0, "5xx": 0, other: 0 };
  if (status.status === "fulfilled") {
    for (const row of tableToRows(status.value)) {
      const bucket = row.bucket as string;
      const count = Number(row.count_ ?? Object.values(row)[1] ?? 0) || 0;
      if (bucket in statusCounts) statusCounts[bucket] += count;
    }
  }

  return {
    activeSessions: firstScalar(sessions),
    latencySeries:
      latency.status === "fulfilled"
        ? tableToRows(latency.value).map((r) => ({ t: r.timestamp, v: r.avgMs }))
        : [],
    dependencySeries:
      deps.status === "fulfilled"
        ? tableToRows(deps.value).map((r) => ({ t: r.timestamp, v: r.avgMs }))
        : [],
    statusCounts,
  };
}

// ---------------------------------------------------------------------------
// Cost Management (Consumption)
// ---------------------------------------------------------------------------
export async function getCost() {
  if (!azureConfig.subscriptionId) {
    throw new AzureConfigError("Subscription not configured (AZURE_SUBSCRIPTION_ID).");
  }
  const path =
    `/subscriptions/${azureConfig.subscriptionId}` +
    `/providers/Microsoft.CostManagement/query`;
  const body = {
    type: "ActualCost",
    timeframe: "MonthToDate",
    dataset: {
      granularity: "None",
      aggregation: { totalCost: { name: "Cost", function: "Sum" } },
      grouping: [{ type: "Dimension", name: "ServiceName" }],
    },
  };
  const data = await armRequest("POST", path, API.costQuery, body);

  const cols: string[] = (data?.properties?.columns || []).map((c: any) => c.name);
  const costIdx = cols.findIndex((c) => c.toLowerCase() === "cost");
  const svcIdx = cols.findIndex((c) => c.toLowerCase() === "servicename");
  const curIdx = cols.findIndex((c) => c.toLowerCase() === "currency");

  let total = 0;
  let currency = "USD";
  const byService: { service: string; cost: number }[] = [];
  for (const row of data?.properties?.rows || []) {
    const cost = Number(row[costIdx] ?? 0) || 0;
    const service = svcIdx >= 0 ? String(row[svcIdx] ?? "Other") : "Other";
    if (curIdx >= 0 && row[curIdx]) currency = String(row[curIdx]);
    total += cost;
    byService.push({ service, cost });
  }
  byService.sort((a, b) => b.cost - a.cost);

  // Simple linear month-end projection from month-to-date spend.
  const now = new Date();
  const dayOfMonth = now.getUTCDate();
  const daysInMonth = new Date(
    now.getUTCFullYear(),
    now.getUTCMonth() + 1,
    0,
  ).getUTCDate();
  const forecast = dayOfMonth > 0 ? (total / dayOfMonth) * daysInMonth : total;

  return {
    currency,
    monthToDate: Number(total.toFixed(2)),
    forecast: Number(forecast.toFixed(2)),
    byService: byService.slice(0, 8).map((s) => ({
      ...s,
      cost: Number(s.cost.toFixed(2)),
    })),
  };
}

/** Create/update a monthly Consumption budget for the subscription. */
export async function setCostBudget(amount: number) {
  if (!azureConfig.subscriptionId) {
    throw new AzureConfigError("Subscription not configured (AZURE_SUBSCRIPTION_ID).");
  }
  if (!(amount > 0)) throw new AzureApiError("Budget amount must be > 0", 400);
  const name = "infra-admin-monthly-cap";
  const path =
    `/subscriptions/${azureConfig.subscriptionId}` +
    `/providers/Microsoft.Consumption/budgets/${name}`;
  const start = new Date();
  const startStr = `${start.getUTCFullYear()}-${String(
    start.getUTCMonth() + 1,
  ).padStart(2, "0")}-01T00:00:00Z`;
  const body = {
    properties: {
      category: "Cost",
      amount,
      timeGrain: "Monthly",
      timePeriod: { startDate: startStr, endDate: "2030-12-31T00:00:00Z" },
      notifications: {
        Actual_GreaterThan_80_Percent: {
          enabled: true,
          operator: "GreaterThan",
          threshold: 80,
          contactEmails: ["support@turboanswer.it.com"],
          thresholdType: "Actual",
        },
      },
    },
  };
  await armRequest("PUT", path, API.budgets, body);
  return { result: `Monthly cost cap set to ${amount}.`, name, amount };
}

/** Emergency: stop the App Service (the primary billable compute resource). */
export async function emergencySuspend() {
  await armRequest("POST", `${siteBasePath()}/stop`, API.web);
  return { result: "Over-budget guard: App Service stopped to halt compute spend." };
}
