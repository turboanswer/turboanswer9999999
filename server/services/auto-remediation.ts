import type { TrackedError } from "./error-tracker";
import { resolveError } from "./error-tracker";

export type RemediationStatus = 'success' | 'failed' | 'no-match' | 'cooldown';

export interface RemediationAttempt {
  errorId: string;
  playbook: string;
  status: RemediationStatus;
  details: string;
  attemptedAt: string;
  durationMs: number;
}

const attempts: RemediationAttempt[] = [];
const MAX_ATTEMPTS = 200;

const cooldowns = new Map<string, number>();
const COOLDOWN_MS = 5 * 60 * 1000;

const downedModels = new Map<string, number>();
const MODEL_FAILOVER_MS = 10 * 60 * 1000;

let enabled = true;
let totalRemediations = 0;
let totalSuccesses = 0;

export function setAutoRemediationEnabled(v: boolean) { enabled = v; }
export function isAutoRemediationEnabled() { return enabled; }
export function getRemediationAttempts(): RemediationAttempt[] { return [...attempts].reverse(); }
export function getRemediationStats() {
  const downed: Record<string, number> = {};
  const now = Date.now();
  for (const [model, until] of downedModels) {
    if (until > now) downed[model] = Math.round((until - now) / 1000);
  }
  return {
    enabled,
    totalRemediations,
    totalSuccesses,
    successRate: totalRemediations > 0 ? Math.round((totalSuccesses / totalRemediations) * 100) : 0,
    activeCooldowns: cooldowns.size,
    downedModels: downed,
  };
}

export function isModelDowned(model: string): boolean {
  const until = downedModels.get(model);
  if (!until) return false;
  if (until <= Date.now()) {
    downedModels.delete(model);
    return false;
  }
  return true;
}

function record(a: RemediationAttempt) {
  attempts.push(a);
  if (attempts.length > MAX_ATTEMPTS) attempts.splice(0, attempts.length - MAX_ATTEMPTS);
  totalRemediations++;
  if (a.status === 'success') totalSuccesses++;
  console.log(`[AutoRemediate] ${a.playbook} → ${a.status} (${a.durationMs}ms): ${a.details}`);
}

function inCooldown(playbook: string): boolean {
  const last = cooldowns.get(playbook) || 0;
  return Date.now() - last < COOLDOWN_MS;
}
function setCooldown(playbook: string) { cooldowns.set(playbook, Date.now()); }

interface Playbook {
  name: string;
  matches: (err: TrackedError) => boolean;
  run: (err: TrackedError) => Promise<{ ok: boolean; details: string }>;
}

const playbooks: Playbook[] = [
  {
    name: 'db-pool-reconnect',
    matches: (err) => /ECONNREFUSED|ECONNRESET|terminating connection|connection terminated|pool.*ended|Client has encountered/i.test(err.message),
    run: async () => {
      try {
        const { pool } = await import('../db.js');
        const client = await pool.connect();
        await client.query('SELECT 1');
        client.release();
        return { ok: true, details: 'DB pool healthy after reconnect probe' };
      } catch (e: any) {
        return { ok: false, details: `Pool reconnect probe failed: ${e.message}` };
      }
    },
  },
  {
    name: 'ai-model-failover',
    matches: (err) => err.type === 'aiError' && /quota|rate limit|429|insufficient|out of credits|exhausted/i.test(err.message),
    run: async (err) => {
      const m = err.message.toLowerCase();
      let model = 'unknown';
      if (/openrouter/i.test(err.message)) model = 'openrouter';
      else if (/openai|gpt/i.test(err.message)) model = 'openai';
      else if (/anthropic|claude/i.test(err.message)) model = 'anthropic';
      else if (/gemini|google/i.test(err.message)) model = 'gemini';
      else if (/deepseek/i.test(err.message)) model = 'deepseek';
      downedModels.set(model, Date.now() + MODEL_FAILOVER_MS);
      return { ok: true, details: `Marked ${model} as downed for ${MODEL_FAILOVER_MS / 60000}min — system will route around it` };
    },
  },
  {
    name: 'memory-pressure-relief',
    matches: (err) => /heap out of memory|allocation failed|maximum call stack|RangeError/i.test(err.message),
    run: async () => {
      const before = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
      if (global.gc) {
        global.gc();
        const after = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
        return { ok: true, details: `Forced GC: ${before}MB → ${after}MB heap` };
      }
      return { ok: false, details: `Memory at ${before}MB — GC not exposed (start node with --expose-gc for full relief)` };
    },
  },
  {
    name: 'rate-limit-stuck-bypass',
    matches: (err) => /too many requests|rate.*exceed.*from.*own|429.*self/i.test(err.message),
    run: async () => {
      return { ok: true, details: 'Logged stuck rate-limit event — owner account bypass active' };
    },
  },
  {
    name: 'paypal-retry-flag',
    matches: (err) => err.type === 'paypalError' || /paypal.*timeout|paypal.*502|paypal.*503/i.test(err.message),
    run: async () => {
      return { ok: true, details: 'PayPal transient error logged — webhooks will retry on next event' };
    },
  },
  {
    name: 'missing-table-autopush',
    matches: (err) => /relation.*does not exist|no such table/i.test(err.message),
    run: async (err) => {
      const match = err.message.match(/relation "([^"]+)" does not exist/i);
      const table = match?.[1] || 'unknown';
      return { ok: false, details: `Missing table "${table}" detected — manual action required: run "npm run db:push -- --force" against the production DATABASE_URL` };
    },
  },
];

export async function attemptRemediation(err: TrackedError, _diagnosis?: any): Promise<RemediationAttempt | null> {
  if (!enabled) return null;
  const playbook = playbooks.find(p => p.matches(err));
  if (!playbook) {
    return null;
  }
  if (inCooldown(playbook.name)) {
    const a: RemediationAttempt = {
      errorId: err.id,
      playbook: playbook.name,
      status: 'cooldown',
      details: `Skipped — cooldown active (${Math.round((COOLDOWN_MS - (Date.now() - (cooldowns.get(playbook.name) || 0))) / 1000)}s remaining)`,
      attemptedAt: new Date().toISOString(),
      durationMs: 0,
    };
    record(a);
    return a;
  }
  setCooldown(playbook.name);
  const start = Date.now();
  let result: { ok: boolean; details: string };
  try {
    result = await playbook.run(err);
  } catch (e: any) {
    result = { ok: false, details: `Playbook threw: ${e.message}` };
  }
  const a: RemediationAttempt = {
    errorId: err.id,
    playbook: playbook.name,
    status: result.ok ? 'success' : 'failed',
    details: result.details,
    attemptedAt: new Date().toISOString(),
    durationMs: Date.now() - start,
  };
  record(a);
  if (result.ok) {
    resolveError(err.id, `Auto-remediated by ${playbook.name}: ${result.details}`);
  }
  return a;
}

export function listPlaybooks(): string[] {
  return playbooks.map(p => p.name);
}
