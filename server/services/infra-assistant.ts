/**
 * Command Center — natural-language control layer over the owner-only Azure
 * infrastructure primitives in ./azure-infra.
 *
 * Uses Claude native tool use to map a plain-English prompt to either a READ
 * tool (status / metrics / logs / insights / cost — executed automatically and
 * summarized) or a CONTROL tool (start / stop / restart / deepsleep / slotswap /
 * cost cap / emergency suspend — which are NEVER executed here; they are returned
 * as a pending action for the owner to confirm via /api/infra/assistant/confirm).
 *
 * Owner gating + CSRF are enforced by the routes that call this module.
 */
import {
  getStatus,
  controlAppService,
  getMetrics,
  getActivityLogs,
  getInsights,
  getCost,
  setCostBudget,
  emergencySuspend,
  isConfigured,
  missingCoreConfig,
  type ControlAction,
  type MetricRange,
} from "./azure-infra";

type AnyObj = Record<string, any>;

export interface AssistantMessage {
  role: "user" | "assistant";
  content: string;
}

export interface PendingAction {
  tool: string;
  input: AnyObj;
  summary: string;
}

export interface AssistantResult {
  reply: string;
  pendingAction?: PendingAction;
  ranTools: string[];
}

const MODEL = "claude-sonnet-4-5-20250929";

const READ_TOOLS = new Set([
  "get_status",
  "get_metrics",
  "get_activity_logs",
  "get_insights",
  "get_cost",
]);

const ACTION_TOOLS = new Set([
  "control_app_service",
  "set_cost_budget",
  "emergency_suspend",
]);

const TOOLS = [
  {
    name: "get_status",
    description:
      "Get the live App Service (the server) status: running/stopped state, host name, region, SKU, and whether Always On is enabled. Use for questions like 'is the server up', 'status', 'health', 'is it running'.",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "get_metrics",
    description:
      "Get server performance metrics over a time range: CPU time, memory in use, bytes in/out, request count, 5xx errors, average response time.",
    input_schema: {
      type: "object",
      properties: { range: { type: "string", enum: ["15m", "1h", "24h"] } },
      additionalProperties: false,
    },
  },
  {
    name: "get_activity_logs",
    description:
      "Recent Azure activity log entries (who did what to the infrastructure in the last hour).",
    input_schema: {
      type: "object",
      properties: { limit: { type: "number" } },
      additionalProperties: false,
    },
  },
  {
    name: "get_insights",
    description:
      "Live application insights: active user sessions, request latency, dependency latency, and HTTP status code breakdown (2xx/4xx/5xx).",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "get_cost",
    description:
      "Month-to-date Azure spend, projected end-of-month cost, and a breakdown of cost by service.",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "control_app_service",
    description:
      "CONTROL the live production server. action: start (power up), stop (shut down — the live site goes OFFLINE), restart (hard restart, brief downtime), deepsleep (disable Always On so the worker can idle), slotswap (swap the staging slot into production). This changes the live production server and must be confirmed by the owner before it runs.",
    input_schema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["start", "stop", "restart", "deepsleep", "slotswap"],
        },
      },
      required: ["action"],
      additionalProperties: false,
    },
  },
  {
    name: "set_cost_budget",
    description:
      "Set the monthly Azure cost cap in the account currency. Must be confirmed by the owner before it runs.",
    input_schema: {
      type: "object",
      properties: { amount: { type: "number" } },
      required: ["amount"],
      additionalProperties: false,
    },
  },
  {
    name: "emergency_suspend",
    description:
      "EMERGENCY: immediately stop the App Service to halt all compute spend. Must be confirmed by the owner before it runs.",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
];

const SYSTEM = `You are the Command Center assistant for TurboAnswer's cloud infrastructure. You manage a single Azure App Service (referred to as "the server") plus its telemetry and cost.

How you work:
- For questions about status, performance, logs, live users/insights, or cost, call the matching read tool and then answer in clear, plain English. Lead with the answer.
- For any control action (start, stop, restart, deep sleep, slot swap, set cost cap, emergency suspend), call the matching tool with the right input. The system will pause and ask the owner to confirm before anything actually happens — so it is safe to propose the action, but make the consequence explicit (e.g. "stop" takes the live site offline).
- If a request is ambiguous about which action, ask a brief clarifying question instead of guessing on a destructive action.

Formatting rules: plain text only. No markdown, no asterisks for bold or italic, no headings, no backticks. Keep it short and direct. When you report numbers, round sensibly and include units.`;

function anthropicCfg() {
  const key =
    process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;
  const base =
    process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL || "https://api.anthropic.com";
  return { key, base };
}

async function callAnthropic(
  base: string,
  key: string,
  messages: AnyObj[],
): Promise<AnyObj> {
  const res = await fetch(`${base.replace(/\/$/, "")}/v1/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM,
      tools: TOOLS,
      messages,
    }),
  });
  const text = await res.text();
  let json: AnyObj;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Command center model error: ${text.slice(0, 300)}`);
  }
  if (!res.ok) {
    throw new Error(json?.error?.message || `Command center model error ${res.status}`);
  }
  return json;
}

async function runReadTool(name: string, input: AnyObj): Promise<AnyObj> {
  switch (name) {
    case "get_status":
      return await getStatus();
    case "get_metrics": {
      const range = (["15m", "1h", "24h"].includes(input?.range)
        ? input.range
        : "1h") as MetricRange;
      return await getMetrics(range);
    }
    case "get_activity_logs":
      return { rows: await getActivityLogs(Math.min(Number(input?.limit) || 50, 500)) };
    case "get_insights":
      return await getInsights();
    case "get_cost":
      return await getCost();
    default:
      throw new Error(`Unknown read tool: ${name}`);
  }
}

/** Executes a confirmed control action. Validates the tool + input server-side. */
export async function executeAction(tool: string, input: AnyObj): Promise<AnyObj> {
  if (!ACTION_TOOLS.has(tool)) {
    throw new Error(`Unknown or non-confirmable action: ${tool}`);
  }
  if (!isConfigured()) {
    throw new Error(`Azure is not fully configured. Missing: ${missingCoreConfig().join(", ")}.`);
  }
  switch (tool) {
    case "control_app_service": {
      const allowed: ControlAction[] = ["start", "stop", "restart", "deepsleep", "slotswap"];
      const action = input?.action as ControlAction;
      if (!allowed.includes(action)) throw new Error(`Invalid control action: ${action}`);
      return await controlAppService(action);
    }
    case "set_cost_budget": {
      const amount = Number(input?.amount);
      if (!(amount > 0)) throw new Error("Budget amount must be greater than 0.");
      return await setCostBudget(amount);
    }
    case "emergency_suspend":
      return await emergencySuspend();
    default:
      throw new Error(`Unknown action: ${tool}`);
  }
}

function describeProposed(tool: string, input: AnyObj): string {
  if (tool === "control_app_service") {
    const map: Record<string, string> = {
      start: "power up (start) the server",
      stop: "shut down (stop) the server — the live site will go offline",
      restart: "hard restart the server — expect brief downtime",
      deepsleep: "put the server into deep sleep (disable Always On so it can idle)",
      slotswap: "swap the staging slot into production",
    };
    return `Ready to ${map[input?.action] || input?.action}. Confirm to proceed.`;
  }
  if (tool === "set_cost_budget") {
    return `Ready to set the monthly cost cap to ${input?.amount}. Confirm to proceed.`;
  }
  if (tool === "emergency_suspend") {
    return `EMERGENCY: ready to stop the server immediately to halt all spend. Confirm to proceed.`;
  }
  return `Ready to run ${tool}. Confirm to proceed.`;
}

/**
 * Runs one assistant turn. Read tools execute and are summarized; the first
 * control tool requested is returned as a pendingAction (NOT executed).
 */
export async function runAssistant(
  message: string,
  history: AssistantMessage[] = [],
): Promise<AssistantResult> {
  const { key, base } = anthropicCfg();
  if (!key) {
    return { reply: "The AI key isn't configured, so the command center assistant is offline.", ranTools: [] };
  }
  if (!isConfigured()) {
    return {
      reply: `Azure isn't fully configured yet. Missing: ${missingCoreConfig().join(", ")}. I can't read or control the server until those are set.`,
      ranTools: [],
    };
  }

  const messages: AnyObj[] = [
    ...history
      .slice(-8)
      .filter((m) => m && (m.role === "user" || m.role === "assistant") && m.content)
      .map((m) => ({ role: m.role, content: String(m.content) })),
    { role: "user", content: message },
  ];

  const ranTools: string[] = [];

  for (let i = 0; i < 6; i++) {
    const resp = await callAnthropic(base, key, messages);
    const blocks: AnyObj[] = Array.isArray(resp?.content) ? resp.content : [];
    const toolUses = blocks.filter((b) => b.type === "tool_use");
    const text = blocks
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    if (!toolUses.length) {
      return { reply: text || "Done.", ranTools };
    }

    // A control action pauses the loop for owner confirmation.
    const action = toolUses.find((t) => ACTION_TOOLS.has(t.name));
    if (action) {
      const summary = describeProposed(action.name, action.input || {});
      return {
        reply: text || summary,
        pendingAction: { tool: action.name, input: action.input || {}, summary },
        ranTools,
      };
    }

    // Execute read tools, feed the results back, and let Claude summarize.
    messages.push({ role: "assistant", content: blocks });
    const toolResults: AnyObj[] = [];
    for (const t of toolUses) {
      let result: AnyObj;
      try {
        result = await runReadTool(t.name, t.input || {});
        ranTools.push(t.name);
      } catch (e: any) {
        result = { error: e?.message || "tool failed" };
      }
      toolResults.push({
        type: "tool_result",
        tool_use_id: t.id,
        content: JSON.stringify(result).slice(0, 12000),
      });
    }
    messages.push({ role: "user", content: toolResults });
  }

  return { reply: "That needed too many steps — try a simpler command.", ranTools };
}
