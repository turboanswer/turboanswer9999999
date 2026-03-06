import { storage } from "../storage";
import { ensureSubscriptionPlans } from "../paypal";
import { trackError } from "./error-tracker";

export interface DiagnosticResult {
  check: string;
  status: 'pass' | 'warn' | 'fail' | 'fixed';
  details: string;
  timestamp: string;
}

export interface DiagnosticReport {
  results: DiagnosticResult[];
  timestamp: string;
  overallStatus: 'healthy' | 'degraded' | 'critical';
  issuesFound: number;
  issuesFixed: number;
}

const diagnosticHistory: DiagnosticReport[] = [];
const MAX_HISTORY = 100;

let intervalId: ReturnType<typeof setInterval> | null = null;

const DIAGNOSTIC_INTERVAL = 30 * 60 * 1000;

const alertCooldowns = new Map<string, number>();
const ALERT_COOLDOWN_MS = 60 * 60 * 1000;

const lastIssueSignatures = new Map<string, string>();

function getIssueSignature(results: DiagnosticResult[]): string {
  return results
    .filter(r => r.status === 'fail')
    .map(r => r.check)
    .sort()
    .join('|');
}

function shouldSendAlert(alertKey: string, currentSignature: string): boolean {
  const lastSent = alertCooldowns.get(alertKey) || 0;
  const lastSignature = lastIssueSignatures.get(alertKey) || '';
  const now = Date.now();

  const isNewIssue = currentSignature !== lastSignature;
  const cooldownExpired = now - lastSent > ALERT_COOLDOWN_MS;

  return isNewIssue || cooldownExpired;
}

async function checkDatabase(): Promise<DiagnosticResult> {
  const ts = new Date().toISOString();
  try {
    const count = await storage.getUserCount();
    return { check: 'Database Connection', status: 'pass', details: `Connected — ${count} users`, timestamp: ts };
  } catch (e: any) {
    trackError('dbError', e.message, { stack: e.stack });
    return { check: 'Database Connection', status: 'fail', details: e.message, timestamp: ts };
  }
}

async function checkAIService(): Promise<DiagnosticResult> {
  const ts = new Date().toISOString();
  if (!process.env.GEMINI_API_KEY) {
    return { check: 'AI Engine (Gemini)', status: 'fail', details: 'GEMINI_API_KEY not configured', timestamp: ts };
  }
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`,
      { method: 'GET', signal: AbortSignal.timeout(8000) }
    );
    if (response.ok) {
      return { check: 'AI Engine (Gemini)', status: 'pass', details: 'Gemini API accessible and key valid', timestamp: ts };
    }
    if (response.status === 429) {
      return { check: 'AI Engine (Gemini)', status: 'warn', details: 'Rate limited — auto-recovery in progress', timestamp: ts };
    }
    trackError('aiError', `Gemini API status ${response.status}`);
    return { check: 'AI Engine (Gemini)', status: 'fail', details: `API returned HTTP ${response.status}`, timestamp: ts };
  } catch (e: any) {
    return { check: 'AI Engine (Gemini)', status: 'warn', details: `Connectivity check failed: ${e.message}`, timestamp: ts };
  }
}

async function checkPayPal(): Promise<DiagnosticResult> {
  const ts = new Date().toISOString();
  if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
    return { check: 'PayPal Payments', status: 'fail', details: 'PayPal credentials not configured', timestamp: ts };
  }
  try {
    const plans = await ensureSubscriptionPlans();
    if (plans.pro && plans.research && plans.enterprise) {
      return { check: 'PayPal Payments', status: 'pass', details: 'All subscription plans active', timestamp: ts };
    }
    return { check: 'PayPal Payments', status: 'warn', details: 'Some subscription plans missing or inactive', timestamp: ts };
  } catch (e: any) {
    trackError('paypalError', e.message, { stack: e.stack });
    return { check: 'PayPal Payments', status: 'fail', details: e.message, timestamp: ts };
  }
}

function checkMemory(): DiagnosticResult {
  const ts = new Date().toISOString();
  const mem = process.memoryUsage();
  const heapPercent = Math.round((mem.heapUsed / mem.heapTotal) * 100);
  const heapMB = Math.round(mem.heapUsed / 1024 / 1024);
  const rssMB = Math.round(mem.rss / 1024 / 1024);

  if (heapPercent > 95) {
    return { check: 'Memory Usage', status: 'fail', details: `Critical: ${heapPercent}% heap used (${heapMB}MB), RSS: ${rssMB}MB`, timestamp: ts };
  }
  if (heapPercent > 85) {
    return { check: 'Memory Usage', status: 'warn', details: `High: ${heapPercent}% heap used (${heapMB}MB), RSS: ${rssMB}MB`, timestamp: ts };
  }
  return { check: 'Memory Usage', status: 'pass', details: `${heapPercent}% heap (${heapMB}MB), RSS: ${rssMB}MB`, timestamp: ts };
}

async function checkUserIssues(allUsers: any[]): Promise<DiagnosticResult[]> {
  const ts = new Date().toISOString();
  const results: DiagnosticResult[] = [];
  const now = new Date();

  const expiredBans = allUsers.filter(u =>
    u.isBanned && u.banExpiresAt && new Date(u.banExpiresAt) <= now
  );
  if (expiredBans.length > 0) {
    for (const u of expiredBans) await storage.unbanUser(u.id);
    results.push({ check: 'Expired Bans', status: 'fixed', details: `Auto-unbanned ${expiredBans.length} user(s)`, timestamp: ts });
  } else {
    results.push({ check: 'Expired Bans', status: 'pass', details: 'No expired bans', timestamp: ts });
  }

  const orphaned = allUsers.filter(u =>
    ['enterprise', 'pro', 'research'].includes(u.subscriptionTier) &&
    u.subscriptionStatus !== 'active'
  );
  if (orphaned.length > 0) {
    for (const u of orphaned) await storage.adminSetSubscription(u.id, 'free', 'free');
    results.push({ check: 'Orphaned Subscriptions', status: 'fixed', details: `Reset ${orphaned.length} orphaned subscription(s) to free`, timestamp: ts });
  } else {
    results.push({ check: 'Orphaned Subscriptions', status: 'pass', details: 'No orphaned subscriptions', timestamp: ts });
  }

  const stuck = allUsers.filter(u => u.subscriptionStatus === 'active' && u.subscriptionTier === 'free');
  if (stuck.length > 0) {
    for (const u of stuck) await storage.adminSetSubscription(u.id, 'free', 'free');
    results.push({ check: 'Stuck Subscriptions', status: 'fixed', details: `Corrected ${stuck.length} inconsistent state(s)`, timestamp: ts });
  } else {
    results.push({ check: 'Stuck Subscriptions', status: 'pass', details: 'No inconsistent subscription states', timestamp: ts });
  }

  const expiredComp = allUsers.filter(u =>
    u.complimentaryExpiresAt && new Date(u.complimentaryExpiresAt) <= now &&
    u.subscriptionStatus === 'active' &&
    ['pro', 'research', 'enterprise'].includes(u.subscriptionTier)
  );
  if (expiredComp.length > 0) {
    for (const u of expiredComp) await storage.adminSetSubscription(u.id, 'free', 'free');
    results.push({ check: 'Expired Complimentary Access', status: 'fixed', details: `Revoked ${expiredComp.length} expired complimentary plan(s)`, timestamp: ts });
  } else {
    results.push({ check: 'Expired Complimentary Access', status: 'pass', details: 'No expired complimentary access', timestamp: ts });
  }

  return results;
}

export async function runProactiveDiagnostics(): Promise<DiagnosticReport> {
  console.log('[ProactiveDiag] Running scheduled diagnostics...');

  const results: DiagnosticResult[] = [];

  const [db, ai, paypal] = await Promise.all([checkDatabase(), checkAIService(), checkPayPal()]);
  results.push(db, ai, paypal, checkMemory());

  try {
    const allUsers = await storage.getAllUsers();
    const userResults = await checkUserIssues(allUsers);
    results.push(...userResults);
  } catch (e: any) {
    trackError('dbError', `User checks failed: ${e.message}`, { stack: e.stack });
    results.push({ check: 'User Checks', status: 'fail', details: e.message, timestamp: new Date().toISOString() });
  }

  const failures = results.filter(r => r.status === 'fail');
  const warnings = results.filter(r => r.status === 'warn');
  const fixed = results.filter(r => r.status === 'fixed');
  const issuesFound = failures.length + warnings.length + fixed.length;
  const issuesFixed = fixed.length;

  const hasFail = failures.length > 0;
  const hasWarn = warnings.length > 0;
  const overallStatus: 'healthy' | 'degraded' | 'critical' = hasFail ? 'critical' : hasWarn ? 'degraded' : 'healthy';

  const report: DiagnosticReport = {
    results,
    timestamp: new Date().toISOString(),
    overallStatus,
    issuesFound,
    issuesFixed,
  };

  diagnosticHistory.push(report);
  if (diagnosticHistory.length > MAX_HISTORY) {
    diagnosticHistory.splice(0, diagnosticHistory.length - MAX_HISTORY);
  }

  if (failures.length > 0) {
    const signature = getIssueSignature(results);
    const alertKey = 'system_diagnostic_failure';

    if (shouldSendAlert(alertKey, signature)) {
      const failList = failures.map(r => r.check).join(', ');
      const fixList = fixed.map(r => r.details).join('; ');

      let content = `System detected ${failures.length} critical failure(s): ${failList}.`;
      if (fixList) content += ` Auto-fixed: ${fixList}.`;

      try {
        await storage.createAdminNotification({
          type: 'system_diagnostic',
          userId: 'system',
          userEmail: 'system@turboanswer.it.com',
          userFirstName: 'System',
          userLastName: 'Diagnostics',
          flaggedContent: content,
          conversationId: null,
          actionTaken: `Status: ${overallStatus}. ${issuesFixed} auto-fixed, ${failures.length} unresolved.`,
        });

        alertCooldowns.set(alertKey, Date.now());
        lastIssueSignatures.set(alertKey, signature);
      } catch (e) {
        console.error('[ProactiveDiag] Failed to create notification:', e);
      }
    } else {
      console.log(`[ProactiveDiag] Suppressed duplicate alert — same failures as last time`);
    }
  }

  if (fixed.length > 0 && failures.length === 0) {
    console.log(`[ProactiveDiag] Auto-fixed: ${fixed.map(r => r.details).join('; ')}`);
  }

  console.log(`[ProactiveDiag] Complete — Status: ${overallStatus}, Failures: ${failures.length}, Warnings: ${warnings.length}, Fixed: ${issuesFixed}`);
  return report;
}

export function getDiagnosticsHistory(): DiagnosticReport[] {
  return diagnosticHistory;
}

export function getLatestReport(): DiagnosticReport | null {
  return diagnosticHistory.length > 0 ? diagnosticHistory[diagnosticHistory.length - 1] : null;
}

export function startProactiveDiagnostics() {
  if (intervalId) return;

  setTimeout(() => {
    runProactiveDiagnostics().catch(err => {
      console.error('[ProactiveDiag] Initial run failed:', err);
    });
  }, 30000);

  intervalId = setInterval(() => {
    runProactiveDiagnostics().catch(err => {
      console.error('[ProactiveDiag] Scheduled run failed:', err);
    });
  }, DIAGNOSTIC_INTERVAL);

  console.log(`[ProactiveDiag] Started — running every ${DIAGNOSTIC_INTERVAL / 60000} minutes with smart deduplication`);
}

export function stopProactiveDiagnostics() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('[ProactiveDiag] Stopped');
  }
}
