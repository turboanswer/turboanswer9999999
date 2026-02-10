import { storage } from "../storage";
import { ensureSubscriptionPlans } from "../paypal";

interface DiagnosticResult {
  check: string;
  status: 'pass' | 'warn' | 'fail' | 'fixed';
  details: string;
  timestamp: string;
}

interface DiagnosticReport {
  results: DiagnosticResult[];
  timestamp: string;
  overallStatus: 'healthy' | 'degraded' | 'critical';
  issuesFound: number;
  issuesFixed: number;
}

const diagnosticHistory: DiagnosticReport[] = [];
const MAX_HISTORY = 50;

let intervalId: ReturnType<typeof setInterval> | null = null;
const DIAGNOSTIC_INTERVAL = 5 * 60 * 1000;

async function checkDatabase(): Promise<DiagnosticResult> {
  const ts = new Date().toISOString();
  try {
    const count = await storage.getUserCount();
    return { check: 'Database Connection', status: 'pass', details: `Connected, ${count} users`, timestamp: ts };
  } catch (e: any) {
    return { check: 'Database Connection', status: 'fail', details: e.message, timestamp: ts };
  }
}

async function checkAIService(): Promise<DiagnosticResult> {
  const ts = new Date().toISOString();
  if (!process.env.GEMINI_API_KEY) {
    return { check: 'AI Engine (Gemini)', status: 'fail', details: 'GEMINI_API_KEY not configured', timestamp: ts };
  }
  try {
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent("Reply with OK");
    const text = result.response.text();
    if (text && text.length > 0) {
      return { check: 'AI Engine (Gemini)', status: 'pass', details: 'Gemini API responding normally', timestamp: ts };
    }
    return { check: 'AI Engine (Gemini)', status: 'warn', details: 'Gemini returned empty response', timestamp: ts };
  } catch (e: any) {
    if (e.message?.includes('429') || e.message?.includes('rate')) {
      return { check: 'AI Engine (Gemini)', status: 'warn', details: 'Rate limited - will recover automatically', timestamp: ts };
    }
    return { check: 'AI Engine (Gemini)', status: 'fail', details: e.message, timestamp: ts };
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
    return { check: 'PayPal Payments', status: 'warn', details: 'Some subscription plans missing', timestamp: ts };
  } catch (e: any) {
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
  return { check: 'Memory Usage', status: 'pass', details: `${heapPercent}% heap used (${heapMB}MB), RSS: ${rssMB}MB`, timestamp: ts };
}

async function checkExpiredBans(): Promise<DiagnosticResult> {
  const ts = new Date().toISOString();
  try {
    const allUsers = await storage.getAllUsers();
    const now = new Date();
    const expiredBans = allUsers.filter(u =>
      u.isBanned && u.banExpiresAt && new Date(u.banExpiresAt) <= now
    );
    if (expiredBans.length > 0) {
      for (const u of expiredBans) {
        await storage.unbanUser(u.id);
        console.log(`[ProactiveDiag] Auto-unbanned user ${u.id} (ban expired)`);
      }
      return { check: 'Expired Bans', status: 'fixed', details: `Auto-unbanned ${expiredBans.length} user(s) with expired bans`, timestamp: ts };
    }
    return { check: 'Expired Bans', status: 'pass', details: 'No expired bans found', timestamp: ts };
  } catch (e: any) {
    return { check: 'Expired Bans', status: 'fail', details: e.message, timestamp: ts };
  }
}

async function checkOrphanedSubscriptions(): Promise<DiagnosticResult> {
  const ts = new Date().toISOString();
  try {
    const allUsers = await storage.getAllUsers();
    const orphaned = allUsers.filter(u =>
      (u.subscriptionTier === 'enterprise' || u.subscriptionTier === 'pro' || u.subscriptionTier === 'research') &&
      u.subscriptionStatus !== 'active'
    );
    if (orphaned.length > 0) {
      for (const u of orphaned) {
        await storage.adminSetSubscription(u.id, 'free', 'free');
        console.log(`[ProactiveDiag] Fixed orphaned ${u.subscriptionTier} subscription for user ${u.id}`);
      }
      return { check: 'Orphaned Subscriptions', status: 'fixed', details: `Fixed ${orphaned.length} orphaned subscription(s)`, timestamp: ts };
    }
    return { check: 'Orphaned Subscriptions', status: 'pass', details: 'No orphaned subscriptions', timestamp: ts };
  } catch (e: any) {
    return { check: 'Orphaned Subscriptions', status: 'fail', details: e.message, timestamp: ts };
  }
}

async function checkStuckSubscriptions(): Promise<DiagnosticResult> {
  const ts = new Date().toISOString();
  try {
    const allUsers = await storage.getAllUsers();
    const stuck = allUsers.filter(u => u.subscriptionStatus === 'active' && u.subscriptionTier === 'free');
    if (stuck.length > 0) {
      for (const u of stuck) {
        await storage.adminSetSubscription(u.id, 'free', 'free');
        console.log(`[ProactiveDiag] Fixed stuck subscription state for user ${u.id}`);
      }
      return { check: 'Stuck Subscriptions', status: 'fixed', details: `Fixed ${stuck.length} inconsistent subscription state(s)`, timestamp: ts };
    }
    return { check: 'Stuck Subscriptions', status: 'pass', details: 'No inconsistent states', timestamp: ts };
  } catch (e: any) {
    return { check: 'Stuck Subscriptions', status: 'fail', details: e.message, timestamp: ts };
  }
}

async function checkExpiredComplimentary(): Promise<DiagnosticResult> {
  const ts = new Date().toISOString();
  try {
    const allUsers = await storage.getAllUsers();
    const now = new Date();
    const expired = allUsers.filter(u =>
      u.complimentaryExpiresAt && new Date(u.complimentaryExpiresAt) <= now &&
      u.subscriptionStatus === 'active' && (u.subscriptionTier === 'pro' || u.subscriptionTier === 'research' || u.subscriptionTier === 'enterprise')
    );
    if (expired.length > 0) {
      for (const u of expired) {
        await storage.adminSetSubscription(u.id, 'free', 'free');
        console.log(`[ProactiveDiag] Expired complimentary access for user ${u.id}`);
      }
      return { check: 'Expired Complimentary Access', status: 'fixed', details: `Revoked ${expired.length} expired complimentary subscription(s)`, timestamp: ts };
    }
    return { check: 'Expired Complimentary Access', status: 'pass', details: 'No expired complimentary access', timestamp: ts };
  } catch (e: any) {
    return { check: 'Expired Complimentary Access', status: 'fail', details: e.message, timestamp: ts };
  }
}

export async function runProactiveDiagnostics(): Promise<DiagnosticReport> {
  console.log('[ProactiveDiag] Running scheduled diagnostics...');

  const results: DiagnosticResult[] = [];

  const [db, ai, paypal, memory] = await Promise.all([
    checkDatabase(),
    checkAIService(),
    checkPayPal(),
    Promise.resolve(checkMemory()),
  ]);
  results.push(db, ai, paypal, memory);

  const [bans, orphaned, stuck, complimentary] = await Promise.all([
    checkExpiredBans(),
    checkOrphanedSubscriptions(),
    checkStuckSubscriptions(),
    checkExpiredComplimentary(),
  ]);
  results.push(bans, orphaned, stuck, complimentary);

  const issuesFound = results.filter(r => r.status !== 'pass').length;
  const issuesFixed = results.filter(r => r.status === 'fixed').length;
  const hasFail = results.some(r => r.status === 'fail');
  const hasWarn = results.some(r => r.status === 'warn');

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

  if (issuesFound > 0) {
    const failedChecks = results.filter(r => r.status === 'fail').map(r => r.check);
    const fixedChecks = results.filter(r => r.status === 'fixed').map(r => `${r.check}: ${r.details}`);
    const warnChecks = results.filter(r => r.status === 'warn').map(r => r.check);

    let alertContent = `Proactive diagnostics detected ${issuesFound} issue(s).`;
    if (failedChecks.length > 0) alertContent += ` Failures: ${failedChecks.join(', ')}.`;
    if (warnChecks.length > 0) alertContent += ` Warnings: ${warnChecks.join(', ')}.`;
    if (fixedChecks.length > 0) alertContent += ` Auto-fixed: ${fixedChecks.join('; ')}.`;

    try {
      await storage.createAdminNotification({
        type: 'system_diagnostic',
        userId: 'system',
        userEmail: 'system@turboanswer.it.com',
        userFirstName: 'System',
        userLastName: 'Diagnostics',
        flaggedContent: alertContent,
        conversationId: null,
        actionTaken: `Auto-diagnosis completed. Status: ${overallStatus}. ${issuesFixed} issue(s) auto-fixed.`,
      });
    } catch (e) {
      console.error('[ProactiveDiag] Failed to create notification:', e);
    }
  }

  console.log(`[ProactiveDiag] Complete — Status: ${overallStatus}, Issues: ${issuesFound}, Fixed: ${issuesFixed}`);
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

  console.log(`[ProactiveDiag] Started — running every ${DIAGNOSTIC_INTERVAL / 1000}s`);
}

export function stopProactiveDiagnostics() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('[ProactiveDiag] Stopped');
  }
}
