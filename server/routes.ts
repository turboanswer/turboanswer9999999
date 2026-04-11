import type { Express } from "express";
import { createServer, type Server } from "http";
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import multer from "multer";
import rateLimit from "express-rate-limit";
import { storage } from "./storage";
import { db } from "./db";
import { eq, and, desc, or, inArray, gt, lt, sql } from "drizzle-orm";
import { insertConversationSchema, insertMessageSchema, adminInviteTokens, betaApplications, betaFeedback, workgroups, workgroupMembers, workgroupInvites, workgroupMessages, workgroupApprovals, supportTickets, supportTicketMessages, ticketNotifications, users, conversations, messages, debateSessions, debateMessages, collabRooms, collabRoomMembers, collabRoomMessages, factChecks } from "@shared/schema";
import { generateAIResponse, getAvailableModels } from "./services/multi-ai";
import { moderateContent } from "./services/content-moderation";
import { 
  extractTextFromFile, 
  analyzeDocument, 
  validateFile, 
  getAnalysisOptions,
  SUPPORTED_FILE_TYPES 
} from "./services/document-analysis";
import { setupAuth, registerAuthRoutes, isAuthenticated, isAdmin } from "./replit_integrations/auth";
import { registerImageRoutes } from "./replit_integrations/image";
import { createSubscription, getSubscriptionDetails, getPayPalClientId, ensureSubscriptionPlans, cancelSubscription, getSubscriptionTransactions, refundCapture, createAddonSubscription, createCreditPackOrder, captureCreditPackOrder, CREDIT_PACKS } from "./paypal";

import widgetRoutes from './routes/widget-routes';
import { startProactiveDiagnostics, runProactiveDiagnostics, getDiagnosticsHistory, getLatestReport } from './services/proactive-diagnostics';
import { trackError, getErrorLog, getErrorStats, resolveError, clearResolvedErrors } from './services/error-tracker';

async function sendBrevoEmail(recipientEmail: string, recipientName: string, subject: string, bodyText: string) {
  const brevoApiKey = process.env.BREVO_API_KEY;
  if (!brevoApiKey) {
    console.warn('[Email] BREVO_API_KEY not configured, skipping email');
    return null;
  }

  const appUrl = 'https://turbo-answer.replit.app';
  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#ffffff;max-width:600px;margin:0 auto;padding:0;background-color:#000000;">
<div style="background-color:#000000;padding:32px;">
${bodyText.split('\n').map(line => {
    if (line.startsWith('- ')) return `<p style="margin:4px 0 4px 20px;color:#e2e2e2;">${line}</p>`;
    if (line.trim() === '') return '<br>';
    return `<p style="margin:0 0 10px;color:#ffffff;">${line}</p>`;
  }).join('\n')}
<hr style="border:none;border-top:1px solid #333;margin:24px 0;">
<p style="font-size:13px;color:#999;margin:0;">TurboAnswer Support</p>
<p style="font-size:13px;color:#999;margin:2px 0;">Email: support@turboanswer.it.com</p>
<p style="font-size:13px;color:#999;margin:2px 0;">Phone: (866) 467-7269</p>
<p style="font-size:13px;color:#999;margin:2px 0;">Hours: Mon-Fri, 9:30 AM - 6:00 PM EST</p>
</div>
</body>
</html>`;

  const textContent = `${bodyText}\n\n--\nTurboAnswer Support\nEmail: support@turboanswer.it.com\nPhone: (866) 467-7269\nHours: Mon-Fri, 9:30 AM - 6:00 PM EST`;

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': brevoApiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: 'TurboAnswer', email: 'support@turboanswer.it.com' },
        to: [{ email: recipientEmail, name: recipientName }],
        subject,
        htmlContent,
        textContent,
        headers: { 'X-Mailer': 'TurboAnswer Notifications' },
      }),
    });

    const result = await response.json();
    if (!response.ok) {
      console.error('[Email] Brevo error:', result);
      return null;
    }
    console.log(`[Email] Sent "${subject}" to ${recipientEmail}`);
    return result.messageId;
  } catch (err: any) {
    console.error('[Email] Send failed:', err.message);
    return null;
  }
}

const TIER_LABELS: Record<string, string> = { free: 'Free', pro: 'Pro', research: 'Research', enterprise: 'Enterprise' };
const TIER_PRICES: Record<string, string> = { pro: '$6.99/mo', research: '$30.00/mo', enterprise: '$100.00/mo' };
const TIER_PERKS: Record<string, string[]> = {
  pro:        ['Unlimited daily questions', 'Advanced Pro AI model', 'Priority response speed', 'Full Code Studio access'],
  research:   ['Everything in Pro', '10-Agent Multi-Perspective Research', 'AI Video Generation', 'Deep analysis from 10 expert AI agents'],
  enterprise: ['Everything in Research', 'Team access with shared enterprise code', 'Dedicated support', 'Highest priority processing'],
};

async function sendSubscriptionEmail(
  type: 'signup' | 'switch' | 'cancel' | 'payment_failed',
  recipientEmail: string,
  recipientName: string,
  newTier: string,
  oldTier?: string,
) {
  const label = TIER_LABELS[newTier] || newTier;
  const oldLabel = TIER_LABELS[oldTier || ''] || oldTier || 'Free';
  const price = TIER_PRICES[newTier];
  const perks = TIER_PERKS[newTier] || [];
  const perksHtml = perks.map(p => `<li style="margin:0 0 6px;">${p}</li>`).join('');

  let subject = '';
  let heading = '';
  let bodyHtml = '';

  if (type === 'signup') {
    subject = `You're now on TurboAnswer ${label}! 🎉`;
    heading = `Welcome to ${label}!`;
    bodyHtml = `
      <p>Hi ${recipientName},</p>
      <p>Your <strong>${label}</strong> subscription is now active${price ? ` at ${price}` : ''}. Here's what you now have access to:</p>
      <ul style="padding-left:20px;margin:16px 0;">${perksHtml}</ul>
      <p>Head back to TurboAnswer to start using your new features.</p>
      <div style="text-align:center;margin:28px 0;">
        <a href="https://turbo-answer.replit.app" style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;text-decoration:none;padding:13px 32px;border-radius:8px;font-size:15px;font-weight:bold;">Open TurboAnswer</a>
      </div>
      <p style="font-size:13px;color:#94a3b8;">You can manage or cancel your subscription at any time from Settings → Subscription.</p>`;
  } else if (type === 'switch') {
    subject = `Your TurboAnswer plan has been updated to ${label}`;
    heading = `Plan Changed to ${label}`;
    bodyHtml = `
      <p>Hi ${recipientName},</p>
      <p>Your plan has been switched from <strong>${oldLabel}</strong> to <strong>${label}</strong>${price ? ` (${price})` : ''}.</p>
      ${perks.length ? `<p>Your updated plan includes:</p><ul style="padding-left:20px;margin:16px 0;">${perksHtml}</ul>` : ''}
      <p>Changes are effective immediately. Head back to TurboAnswer to enjoy your updated features.</p>
      <div style="text-align:center;margin:28px 0;">
        <a href="https://turbo-answer.replit.app" style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;text-decoration:none;padding:13px 32px;border-radius:8px;font-size:15px;font-weight:bold;">Open TurboAnswer</a>
      </div>
      <p style="font-size:13px;color:#94a3b8;">You can manage your subscription at any time from Settings → Subscription.</p>`;
  } else if (type === 'cancel') {
    subject = `Your TurboAnswer subscription has been cancelled`;
    heading = `Subscription Cancelled`;
    bodyHtml = `
      <p>Hi ${recipientName},</p>
      <p>We've received your cancellation request. Your <strong>${oldLabel}</strong> subscription has been cancelled.</p>
      <p>You will continue to have access to your plan features until the end of your current billing period. After that, your account will revert to the Free tier.</p>
      <p>We're sorry to see you go! If you cancelled by mistake or change your mind, you can resubscribe at any time from Settings → Subscription.</p>
      <div style="text-align:center;margin:28px 0;">
        <a href="https://turbo-answer.replit.app/settings" style="display:inline-block;background:#6b7280;color:#fff;text-decoration:none;padding:13px 32px;border-radius:8px;font-size:15px;font-weight:bold;">Manage Subscription</a>
      </div>
      <p style="font-size:13px;color:#94a3b8;">If you have any questions, reply to this email or contact us at support@turboanswer.it.com.</p>`;
  } else if (type === 'payment_failed') {
    subject = `Action required: Payment failed for your TurboAnswer subscription`;
    heading = `Payment Failed`;
    bodyHtml = `
      <p>Hi ${recipientName},</p>
      <p>We were unable to process the payment for your <strong>${label}</strong> subscription. This can happen if your card has expired, has insufficient funds, or your billing information has changed.</p>
      <div style="background:#3b1318;border-left:4px solid #ef4444;border-radius:6px;padding:16px 20px;margin:20px 0;">
        <p style="margin:0;font-weight:bold;color:#fca5a5;">What to do:</p>
        <p style="margin:8px 0 0;color:#e2e8f0;">Please update your payment method by logging in to TurboAnswer and going to <strong>Settings → Subscription → Manage Payment</strong>. If payment continues to fail, your subscription may be suspended.</p>
      </div>
      <div style="text-align:center;margin:28px 0;">
        <a href="https://turbo-answer.replit.app/settings" style="display:inline-block;background:#ef4444;color:#fff;text-decoration:none;padding:13px 32px;border-radius:8px;font-size:15px;font-weight:bold;">Update Payment Method</a>
      </div>
      <p style="font-size:13px;color:#94a3b8;">If you need help, contact us at support@turboanswer.it.com or call (866) 467-7269.</p>`;
  }

  const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;font-size:15px;line-height:1.7;color:#e2e8f0;max-width:600px;margin:0 auto;padding:0;background:#0f172a;">
<div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:36px 32px;text-align:center;border-radius:12px 12px 0 0;">
  <h1 style="color:#fff;margin:0;font-size:24px;">${heading}</h1>
</div>
<div style="background:#1e293b;padding:32px;border:1px solid #334155;border-top:none;border-radius:0 0 12px 12px;">
${bodyHtml}
<hr style="border:none;border-top:1px solid #334155;margin:24px 0;">
<p style="font-size:12px;color:#94a3b8;margin:0;">TurboAnswer · support@turboanswer.it.com · (866) 467-7269</p>
</div>
</body>
</html>`;

  const brevoApiKey = process.env.BREVO_API_KEY;
  if (!brevoApiKey) { console.warn('[Email] BREVO_API_KEY not configured, skipping subscription email'); return; }
  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'accept': 'application/json', 'api-key': brevoApiKey, 'content-type': 'application/json' },
      body: JSON.stringify({
        sender: { name: 'TurboAnswer', email: 'support@turboanswer.it.com' },
        to: [{ email: recipientEmail, name: recipientName }],
        subject,
        htmlContent: fullHtml,
      }),
    });
    if (!response.ok) { const err = await response.json(); console.error(`[Email] Subscription email (${type}) error:`, err); return; }
    console.log(`[Email] Subscription email (${type}) sent to ${recipientEmail}`);
  } catch (e: any) {
    console.error(`[Email] Subscription email (${type}) failed:`, e.message);
  }
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024,
    files: 1
  }
});

const responseCache = new Map<string, { data: any; expires: number }>();
const CACHE_TTL = 15000;

function getCached(key: string): any | null {
  const entry = responseCache.get(key);
  if (entry && Date.now() < entry.expires) return entry.data;
  if (entry) responseCache.delete(key);
  return null;
}

function setCache(key: string, data: any, ttl = CACHE_TTL): void {
  responseCache.set(key, { data, expires: Date.now() + ttl });
  if (responseCache.size > 100) {
    const now = Date.now();
    const keys = Array.from(responseCache.keys());
    for (const k of keys) {
      const e = responseCache.get(k);
      if (e && now >= e.expires) responseCache.delete(k);
    }
  }
}

interface ActivityEntry {
  id: string;
  timestamp: number;
  method: string;
  path: string;
  status: number;
  duration: number;
}

const activityLog: ActivityEntry[] = [];
const MAX_ACTIVITY_LOG = 300;

let lockdownActive = false;
let lockdownActivatedBy = '';
let lockdownActivatedAt: Date | null = null;
let lockdownScenario = 'system_failure';
let lockdownRestoredAt: Date | null = null;

const SCENARIO_EMAIL_TEMPLATES: Record<string, { subject: string; body: (name: string) => string }> = {
  system_failure: {
    subject: 'We Sincerely Apologize for Today\'s System Incident',
    body: (name) => `Dear ${name},\n\nWe sincerely apologize for today's incident regarding a critical system failure affecting TurboAnswer.\n\nOur engineering team has resolved the issue and all services are now fully operational. We apologize for any inconvenience this may have caused and you may now resume normal usage of TurboAnswer.\n\nThank you for your patience and continued support. If you have any questions, please contact us at support@turboanswer.it.com.`,
  },
  security_breach: {
    subject: 'Important Notice Regarding Today\'s Security Incident',
    body: (name) => `Dear ${name},\n\nWe sincerely apologize for today's incident regarding a security breach affecting TurboAnswer.\n\nThe issue has been fully resolved and all security measures have been restored. We apologize for any inconvenience and you may now resume normal usage of TurboAnswer.\n\nThank you for your understanding. Please contact us at support@turboanswer.it.com if you have any concerns.`,
  },
  public_safety: {
    subject: 'Notice Regarding Today\'s Service Suspension',
    body: (name) => `Dear ${name},\n\nWe sincerely apologize for today's temporary service suspension regarding a public safety concern.\n\nThe matter has been resolved and TurboAnswer is now fully operational. We apologize for any inconvenience and you may now resume normal usage of TurboAnswer.\n\nThank you for your patience and understanding.`,
  },
  malfunction: {
    subject: 'We Sincerely Apologize for Today\'s Outage',
    body: (name) => `Dear ${name},\n\nWe sincerely apologize for today's incident regarding a system malfunction affecting TurboAnswer services.\n\nAll services have been restored and are fully operational. We apologize for any inconvenience and you may now resume normal usage of TurboAnswer.\n\nThank you for your patience.`,
  },
};

function autoActivateLockdown(scenario: string, reason: string) {
  if (lockdownActive) return; // already locked — don't override
  lockdownActive = true;
  lockdownActivatedBy = 'AutoSystem';
  lockdownActivatedAt = new Date();
  lockdownScenario = scenario;
  lockdownRestoredAt = null;
  console.log(`[LOCKDOWN] AUTO-ACTIVATED — scenario: ${scenario}, reason: ${reason}`);
}

export async function registerRoutes(app: Express): Promise<Server> {
  await setupAuth(app);
  registerAuthRoutes(app);
  registerImageRoutes(app);

  app.use(widgetRoutes);

  app.use((req: any, res, next) => {
    if (!req.path.startsWith('/api')) return next();
    const start = Date.now();
    res.on('finish', () => {
      const entry: ActivityEntry = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        timestamp: Date.now(),
        method: req.method,
        path: req.path.length > 55 ? req.path.substring(0, 55) + '…' : req.path,
        status: res.statusCode,
        duration: Date.now() - start,
      };
      activityLog.push(entry);
      if (activityLog.length > MAX_ACTIVITY_LOG) activityLog.shift();
    });
    next();
  });

  app.get('/api/system/lockdown-status', (req, res) => {
    res.json({ active: lockdownActive });
  });

  app.post('/api/admin/lockdown/activate', isAdmin, async (req: any, res) => {
    const userId = req.user?.claims?.sub;
    const dbUser = userId ? await storage.getUser(userId) : null;
    if (!dbUser || dbUser.email?.toLowerCase() !== 'support@turboanswer.it.com') {
      return res.status(403).json({ error: 'Forbidden — owner account required' });
    }
    lockdownActive = true;
    lockdownActivatedBy = dbUser.email;
    lockdownActivatedAt = new Date();
    lockdownScenario = req.body?.scenario || 'system_failure';
    console.log(`[LOCKDOWN] ACTIVATED by ${dbUser.email} — scenario: ${lockdownScenario}`);
    res.json({ success: true, active: true, activatedAt: lockdownActivatedAt, scenario: lockdownScenario });
  });

  app.post('/api/admin/lockdown/deactivate', isAdmin, async (req: any, res) => {
    const userId = req.user?.claims?.sub;
    const dbUser = userId ? await storage.getUser(userId) : null;
    if (!dbUser || dbUser.email?.toLowerCase() !== 'support@turboanswer.it.com') {
      return res.status(403).json({ error: 'Forbidden — owner account required' });
    }
    const prevScenario = lockdownScenario;
    lockdownActive = false;
    lockdownActivatedBy = '';
    lockdownActivatedAt = null;
    lockdownRestoredAt = new Date();
    // Auto-clear restoredAt after 60s so banner doesn't persist forever
    setTimeout(() => { lockdownRestoredAt = null; }, 60000);
    console.log(`[LOCKDOWN] DEACTIVATED by ${dbUser.email} — scenario was: ${prevScenario}`);
    res.json({ success: true, active: false, restoredAt: lockdownRestoredAt, scenario: prevScenario });
  });

  // Email all users about a lockdown incident
  app.post('/api/admin/lockdown/email-all', isAdmin, async (req: any, res) => {
    const userId = req.user?.claims?.sub;
    const dbUser = userId ? await storage.getUser(userId) : null;
    if (!dbUser || dbUser.email?.toLowerCase() !== 'support@turboanswer.it.com') {
      return res.status(403).json({ error: 'Forbidden — owner account required' });
    }
    const scenario = req.body?.scenario || lockdownScenario || 'system_failure';
    const template = SCENARIO_EMAIL_TEMPLATES[scenario] || SCENARIO_EMAIL_TEMPLATES.system_failure;
    const allUsers = await storage.getAllUsers();
    const targets = allUsers.filter(u => u.email && !u.isBanned);
    let sent = 0, failed = 0;
    for (const user of targets) {
      const name = user.firstName || user.email?.split('@')[0] || 'Valued User';
      try {
        await sendBrevoEmail(user.email!, name, template.subject, template.body(name));
        sent++;
      } catch { failed++; }
    }
    console.log(`[Lockdown Email] Sent ${sent}/${targets.length} incident emails for scenario: ${scenario}`);
    res.json({ sent, failed, total: targets.length });
  });

  // Return email template preview for a scenario
  app.get('/api/admin/lockdown/email-template', isAdmin, (req, res) => {
    const scenario = (req.query.scenario as string) || lockdownScenario || 'system_failure';
    const template = SCENARIO_EMAIL_TEMPLATES[scenario] || SCENARIO_EMAIL_TEMPLATES.system_failure;
    res.json({ subject: template.subject, body: template.body('Valued User') });
  });


  app.get("/download/turbo-answer.aab", async (req, res) => {
    const fs = await import("fs");
    const aabPath = path.resolve(__dirname, "..", "turbo-answer-release.aab");
    if (!fs.existsSync(aabPath)) {
      return res.status(404).json({ error: "AAB file not found" });
    }
    const fileBuffer = fs.readFileSync(aabPath);
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Length", fileBuffer.length);
    res.setHeader("Content-Disposition", "attachment; filename=turbo-answer-release.aab");
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.end(fileBuffer);
  });

  app.get("/download-page", (req, res) => {
    res.setHeader("Content-Type", "text/html");
    res.send(`<!DOCTYPE html>
<html><head><title>Download TurboAnswer AAB</title>
<style>body{font-family:Arial,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#1a1a2e;color:#fff}
.card{background:#16213e;padding:40px;border-radius:16px;text-align:center;max-width:500px;box-shadow:0 8px 32px rgba(0,0,0,0.3)}
h1{margin-bottom:10px}p{color:#aaa;margin-bottom:30px}
.btn{display:inline-block;padding:16px 40px;background:#4f46e5;color:#fff;border-radius:8px;text-decoration:none;font-size:18px;font-weight:bold;cursor:pointer;border:none}
.btn:hover{background:#4338ca}.info{margin-top:20px;font-size:13px;color:#888}</style></head>
<body><div class="card">
<h1>TurboAnswer AAB</h1>
<p>Android App Bundle for Google Play Console</p>
<a class="btn" href="/download/turbo-answer.aab" download="turbo-answer-release.aab">Download AAB File</a>
<p class="info">File size: ~3.9 MB | MD5: fd2c9625dc6cace35da2a71a44d57f79<br>
After downloading, verify the file is exactly 4,041,426 bytes</p>
</div></body></html>`);
  });

  function getSiteBaseUrl(req: Request): string {
    const forwarded = req.get('x-forwarded-proto');
    const proto = forwarded ? forwarded.split(',')[0].trim() : req.protocol;
    const host = req.get('x-forwarded-host') || req.get('host') || '';
    if (host && !host.includes('localhost') && !host.includes('127.0.0.1') && !host.includes('riker.replit.dev')) {
      return `${proto}://${host}`;
    }
    const replitDomain = process.env.REPLIT_DOMAINS?.split(',')[0]?.trim();
    if (replitDomain && !replitDomain.includes('riker.replit.dev')) {
      return `https://${replitDomain}`;
    }
    return 'https://turbo-answer.replit.app';
  }

  app.get("/robots.txt", (req, res) => {
    const baseUrl = getSiteBaseUrl(req);
    const robotsTxt = `User-agent: *\nAllow: /\n\nSitemap: ${baseUrl}/sitemap.xml`;
    res.set("Content-Type", "text/plain");
    res.send(robotsTxt);
  });

  app.get("/sitemap.xml", (req, res) => {
    const baseUrl = getSiteBaseUrl(req);
    const today = new Date().toISOString().split("T")[0];
    const pages = [
      { loc: "/", priority: "1.0", changefreq: "daily" },
      { loc: "/login", priority: "0.8", changefreq: "monthly" },
      { loc: "/register", priority: "0.8", changefreq: "monthly" },
      { loc: "/pricing", priority: "0.9", changefreq: "weekly" },
      { loc: "/support", priority: "0.7", changefreq: "monthly" },
      { loc: "/privacy-policy", priority: "0.5", changefreq: "yearly" },
      { loc: "/business", priority: "0.8", changefreq: "monthly" },
      { loc: "/widget-demo", priority: "0.6", changefreq: "monthly" },
      { loc: "/crisis-info", priority: "0.7", changefreq: "monthly" },
    ];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map(p => `  <url>\n    <loc>${baseUrl}${p.loc}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${p.changefreq}</changefreq>\n    <priority>${p.priority}</priority>\n  </url>`).join("\n")}\n</urlset>`;
    res.set("Content-Type", "application/xml; charset=utf-8");
    res.set("X-Content-Type-Options", "nosniff");
    res.set("Cache-Control", "public, max-age=3600");
    res.send(xml);
  });

  app.get("/api/download/android-app", (req, res) => {
    const fs = require("fs");
    const filePath = path.resolve("turbo-answer-v2.0.0.aab");
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "AAB file not found" });
    }
    const stat = fs.statSync(filePath);
    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Content-Disposition", "attachment; filename=turbo-answer-v2.0.0.aab");
    res.setHeader("Content-Length", stat.size);
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });

  app.get("/api/download/android-base64", (req, res) => {
    const fs = require("fs");
    const filePath = path.resolve("turbo-answer-v2.0.0.aab");
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "AAB file not found" });
    }
    const fileStat = fs.statSync(filePath);
    const fileBuffer = fs.readFileSync(filePath);
    const base64Data = fileBuffer.toString("base64");
    const fileSizeMB = (fileStat.size / 1024 / 1024).toFixed(1);
    const html = `<!DOCTYPE html>
<html><head><title>Download Turbo Answer AAB</title>
<style>body{font-family:Arial,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#1a1a2e;color:#fff}
.container{text-align:center;padding:40px;background:#16213e;border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,0.3)}
h1{color:#00d4ff;margin-bottom:10px}
p{color:#aaa;margin-bottom:20px}
button{background:linear-gradient(135deg,#00d4ff,#0099cc);color:#fff;border:none;padding:16px 40px;font-size:18px;border-radius:8px;cursor:pointer}
button:hover{opacity:0.9}
.info{font-size:12px;color:#666;margin-top:15px}
</style></head><body>
<div class="container">
<h1>Turbo Answer v2.0.0</h1>
<p>Android App Bundle (AAB) - ${fileSizeMB} MB</p>
<button onclick="downloadAAB()">Download AAB File</button>
<p id="status" class="info"></p>
</div>
<script>
function downloadAAB(){
  document.getElementById('status').textContent='Preparing download...';
  const b64='${base64Data}';
  const bytes=atob(b64);
  const arr=new Uint8Array(bytes.length);
  for(let i=0;i<bytes.length;i++)arr[i]=bytes.charCodeAt(i);
  const blob=new Blob([arr],{type:'application/octet-stream'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download='turbo-answer-v2.0.0.aab';
  document.body.appendChild(a);a.click();
  document.body.removeChild(a);URL.revokeObjectURL(url);
  document.getElementById('status').textContent='Download started! File size: ${fileSizeMB} MB';
}
</script></body></html>`;
    res.setHeader("Content-Type", "text/html");
    res.send(html);
  });

  const trialLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: { error: 'Trial rate limit reached. Please create an account to continue.' },
  });

  app.post("/api/trial/ask", trialLimiter, async (req: any, res) => {
    try {
      const { question } = req.body;
      if (!question || typeof question !== "string" || !question.trim()) {
        return res.status(400).json({ message: "Question is required" });
      }

      const { generateAIResponse } = await import('./services/multi-ai.js');
      const trialUserId = `trial_${req.ip || 'anon'}`;
      const rawAnswer = await generateAIResponse(
        question.trim(),
        [],
        "free",
        "gemini-flash",
        trialUserId,
        "en",
        "balanced",
        "casual"
      );
      const answer = typeof rawAnswer === 'object' ? rawAnswer.text : rawAnswer;

      res.json({ answer });
    } catch (error: any) {
      console.error("[Trial] Error:", error.message);
      res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  // Create a new conversation
  app.post("/api/conversations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const conversation = await storage.createConversation({
        title: req.body.title || "New Conversation",
        userId,
      });
      res.json(conversation);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Get all conversations for authenticated user
  app.get("/api/conversations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const conversations = await storage.getConversationsByUser(userId);
      res.json(conversations);
    } catch (error: any) {
      res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  // Get conversation by ID
  app.get("/api/conversations/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      const conversation = await storage.getConversation(id);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      const dbUser = await storage.getUser(userId);
      if (conversation.userId !== userId && !dbUser?.canViewAllChats) {
        return res.status(403).json({ message: "Access denied" });
      }
      res.json(conversation);
    } catch (error: any) {
      res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  // Get messages for a conversation
  app.get("/api/conversations/:id/messages", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const conversationId = parseInt(req.params.id);
      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      const dbUser = await storage.getUser(userId);
      if (conversation.userId !== userId && !dbUser?.canViewAllChats) {
        return res.status(403).json({ message: "Access denied" });
      }
      const messages = await storage.getMessagesByConversation(conversationId);
      res.json(messages);
    } catch (error: any) {
      res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  // Rename a conversation
  app.patch("/api/conversations/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      const { title } = req.body;
      if (!title || typeof title !== "string" || !title.trim()) {
        return res.status(400).json({ message: "Title is required" });
      }
      const conversation = await storage.getConversation(id);
      if (!conversation) return res.status(404).json({ message: "Conversation not found" });
      const dbUser = await storage.getUser(userId);
      if (conversation.userId !== userId && !dbUser?.canViewAllChats) {
        return res.status(403).json({ message: "Access denied" });
      }
      const updated = await storage.updateConversation(id, { title: title.trim() });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  // Delete a single conversation
  app.delete("/api/conversations/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const conversationId = parseInt(req.params.id);
      const conversation = await storage.getConversation(conversationId);
      if (!conversation) return res.status(404).json({ message: "Conversation not found" });
      const dbUser = await storage.getUser(userId);
      const isPrivileged = !!dbUser?.canViewAllChats;
      if (conversation.userId !== userId && !isPrivileged) {
        return res.status(403).json({ message: "Access denied" });
      }
      await storage.deleteConversation(conversationId, userId, isPrivileged);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  // Delete all conversations for current user
  app.delete("/api/conversations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.deleteAllConversations(userId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  // Visual AI analysis endpoint
  app.post("/api/analyze-image", isAuthenticated, async (req: any, res) => {
    try {
      const { imageData, query } = req.body;
      
      if (!imageData) {
        return res.status(400).json({ message: "Image data is required" });
      }

      const { analyzeImage } = await import("./services/visual-ai");
      const analysis = await analyzeImage(imageData, query);
      
      res.json(analysis);
    } catch (error: any) {
      console.error("Image analysis error:", error);
      res.status(500).json({ message: "Failed to analyze image" });
    }
  });

  // Live camera analysis endpoint
  app.post("/api/analyze-live-camera", isAuthenticated, async (req: any, res) => {
    try {
      const { imageData, question, language, context } = req.body;
      
      if (!imageData) {
        return res.status(400).json({ message: "Image data is required" });
      }
      
      const { analyzeLiveCamera } = await import('./services/live-camera.js');
      
      const result = await analyzeLiveCamera({
        imageData,
        question: question || "What do you see?",
        language: language || "en",
        context
      });
      
      res.json(result);
      
    } catch (error: any) {
      console.error("Live camera analysis error:", error);
      res.status(500).json({ 
        message: error.message || "Failed to analyze live camera feed"
      });
    }
  });

  // Language detection endpoint
  app.post("/api/detect-language", isAuthenticated, async (req: any, res) => {
    try {
      const { text } = req.body;
      
      if (!text) {
        return res.status(400).json({ message: "Text is required" });
      }

      const { detectLanguage, getLanguageConfig } = await import("./services/language-detector");
      const languageCode = detectLanguage(text);
      const languageConfig = getLanguageConfig(languageCode);
      
      res.json({ 
        language: languageCode, 
        config: languageConfig 
      });
    } catch (error: any) {
      console.error("Language detection error:", error);
      res.status(500).json({ message: "Failed to detect language" });
    }
  });

  // Get available languages
  app.get("/api/languages", async (req, res) => {
    try {
      const { getAvailableLanguages } = await import("./services/language-detector");
      const languages = getAvailableLanguages();
      res.json(languages);
    } catch (error: any) {
      console.error("Get languages error:", error);
      res.status(500).json({ message: "Failed to get available languages" });
    }
  });

  const OWNER_EMAIL = 'support@turboanswer.it.com';

  function isOwnerAccount(user: any): boolean {
    return user?.email?.toLowerCase() === OWNER_EMAIL;
  }

  // Send a message and get AI response
  const FREE_DAILY_LIMIT = 25;

  app.get("/api/daily-usage", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      const tier = user.subscriptionTier || 'free';
      if (tier !== 'free' || isOwnerAccount(user)) {
        return res.json({ used: 0, limit: -1, remaining: -1, tier: isOwnerAccount(user) ? 'owner' : tier });
      }
      const now = new Date();
      const resetAt = user.dailyQuestionsResetAt ? new Date(user.dailyQuestionsResetAt) : null;
      let used = user.dailyQuestionsUsed || 0;
      if (!resetAt || now >= resetAt) {
        used = 0;
      }
      return res.json({ used, limit: FREE_DAILY_LIMIT, remaining: FREE_DAILY_LIMIT - used, tier });
    } catch (err: any) {
      console.error('Daily usage error:', err);
      res.status(500).json({ message: "Failed to get daily usage" });
    }
  });

  app.post("/api/conversations/:id/messages", isAuthenticated, async (req: any, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const { content } = req.body;

      if (!content || typeof content !== 'string') {
        return res.status(400).json({ message: "Message content is required" });
      }

      const sendingUserId = req.user?.claims?.sub;
      if (sendingUserId) {
        const sender = await storage.getUser(sendingUserId);
        if (sender?.isSuspended) {
          return res.status(403).json({ message: "Your account is temporarily suspended. Please contact support for assistance." });
        }
        if (sender?.isBanned) {
          if (sender.banExpiresAt && new Date(sender.banExpiresAt) <= new Date()) {
            await storage.unbanUser(sendingUserId);
          } else {
            const banMsg = sender.banExpiresAt 
              ? `Your account is banned until ${new Date(sender.banExpiresAt).toLocaleDateString()}. Please contact support for assistance.`
              : "Your account has been permanently banned. Please contact support for assistance.";
            return res.status(403).json({ message: banMsg });
          }
        }

        if ((sender?.subscriptionTier || 'free') === 'free' && !isOwnerAccount(sender)) {
          const now = new Date();
          const resetAt = sender?.dailyQuestionsResetAt ? new Date(sender.dailyQuestionsResetAt) : null;
          let used = sender?.dailyQuestionsUsed || 0;
          if (!resetAt || now >= resetAt) {
            used = 0;
          }
          if (used >= FREE_DAILY_LIMIT) {
            return res.status(429).json({
              message: "You've reached your daily limit of 25 free questions. Upgrade to Pro for unlimited questions!",
              code: "DAILY_LIMIT_REACHED",
              used,
              limit: FREE_DAILY_LIMIT,
            });
          }
          const userTz = sender?.timezone || 'UTC';
          let nextMidnight: Date;
          try {
            const nowInTz = new Date(now.toLocaleString('en-US', { timeZone: userTz }));
            nextMidnight = new Date(nowInTz);
            nextMidnight.setHours(24, 0, 0, 0);
            const offset = nextMidnight.getTime() - nowInTz.getTime();
            nextMidnight = new Date(now.getTime() + offset);
          } catch {
            nextMidnight = new Date(now);
            nextMidnight.setUTCHours(24, 0, 0, 0);
          }
          const { db } = await import('./db');
          const { users } = await import('@shared/schema');
          const { eq } = await import('drizzle-orm');
          await db.update(users)
            .set({
              dailyQuestionsUsed: used + 1,
              dailyQuestionsResetAt: (!resetAt || now >= resetAt) ? nextMidnight : resetAt,
            })
            .where(eq(users.id, sendingUserId));
        }
      }

      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }

      if (sendingUserId) {
        const senderForAccess = await storage.getUser(sendingUserId);
        if (conversation.userId !== sendingUserId && !senderForAccess?.canViewAllChats) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const _modUserId = req.user?.claims?.sub;
      const _modUser = _modUserId ? await storage.getUser(_modUserId) : null;
      const _isAdminOrEmployee = _modUser?.isEmployee || _modUser?.email === 'support@turboanswer.it.com';
      const modResult = _isAdminOrEmployee ? { isFlagged: false, type: "clean" as const, matchedWords: [], severity: "none" as const } : moderateContent(content);
      if (modResult.isFlagged) {
        const userId = _modUserId;
        if (userId) {
          const offender = _modUser;
          const actions: string[] = [];

          let wasBanned = false;
          let wasSuspended = false;

          // Auto-lockdown platform for any threat or terrorism content
          if (modResult.type === "terrorism") {
            autoActivateLockdown('public_safety', `Terrorism content detected from user ${userId}: "${modResult.matchedWords.join(', ')}"`);
          } else if (modResult.type === "threat") {
            autoActivateLockdown('public_safety', `Threat content detected from user ${userId}: "${modResult.matchedWords.join(', ')}"`);
          }

          if (modResult.autoBan && (modResult.type === "sexual" || modResult.type === "terrorism" || modResult.type === "threat")) {
            const banMonths = modResult.type === "terrorism" ? undefined : 1;
            const banLabel = modResult.type === "terrorism" ? "permanently (terrorism/harmful content)" : `for 1 month (${modResult.type} content)`;
            try {
              await storage.banUser(userId, `Auto-banned: ${modResult.type} content detected - "${modResult.matchedWords.join(', ')}"`, banMonths);
              actions.push(`Account banned ${banLabel}`);
              wasBanned = true;
            } catch (e: any) {
              console.error("Auto-ban failed:", e.message);
              actions.push("Ban attempted but failed");
            }
          } else {
            try {
              await storage.suspendUser(userId, `Auto-suspended: ${modResult.type} detected - "${modResult.matchedWords.join(', ')}"`, "system", "AutoModerator");
              actions.push("Account temporarily suspended");
              wasSuspended = true;
            } catch (e: any) {
              console.error("Auto-suspend failed:", e.message);
              actions.push("Suspend attempted but failed");
            }
          }

          try {
            await storage.flagUser(userId, `Inappropriate content: ${modResult.type}`);
            actions.push("Account flagged");
          } catch (e: any) {
            console.error("Auto-flag failed:", e.message);
            actions.push("Flag attempted but failed");
          }

          await storage.createAdminNotification({
            type: modResult.type,
            userId,
            userEmail: offender?.email || "unknown",
            userFirstName: offender?.firstName || "Unknown",
            userLastName: offender?.lastName || "User",
            flaggedContent: content,
            conversationId,
            actionTaken: `${actions.join(". ")}. Severity: ${modResult.severity}. Matched: ${modResult.matchedWords.join(', ')}`,
          });

          if (offender?.email) {
            const userName = offender.firstName || 'User';
            const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
            if (wasBanned) {
              const banType = modResult.type === "terrorism" ? "permanently" : "for 1 month";
              sendBrevoEmail(offender.email, userName,
                'Your TurboAnswer account update',
                `Dear ${userName},\n\nWe regret to inform you that your TurboAnswer account has been banned ${banType} effective ${currentDate}.\n\nThis action was taken due to a violation of our community guidelines or terms of service. As a result:\n\n- Your account access has been revoked\n- You will not be able to log in or use TurboAnswer services\n- Any active subscriptions have been paused\n\nIf you believe this was done in error, you may appeal by contacting our appeals team at appeals@turboanswer.it.com. Please include your account email and a detailed explanation in your appeal.`
              ).catch(() => {});
            } else if (wasSuspended) {
              sendBrevoEmail(offender.email, userName,
                'Your TurboAnswer account is under review',
                `Dear ${userName},\n\nYour TurboAnswer account has been temporarily suspended and is currently under review as of ${currentDate}.\n\nDuring this review period:\n\n- Your account access is temporarily restricted\n- Your data and conversations remain safe and intact\n- Any active subscriptions are paused until the review is complete\n\nOur team is reviewing your account activity. You will receive a follow-up email once the review is complete. This process typically takes 1-3 business days.\n\nIf you have additional information that may assist in the review, please contact our appeals team at appeals@turboanswer.it.com.`
              ).catch(() => {});
            }
          }
        }

        const banMessage = modResult.type === "terrorism" 
          ? "Your message contains content related to terrorism or threats to public safety. Your account has been permanently banned and reported. Please contact support if you believe this is an error."
          : modResult.type === "threat"
          ? "Your message contains threatening content which is strictly prohibited. Your account has been banned for 1 month. Please contact support if you believe this is an error."
          : modResult.type === "sexual" 
          ? "Your message contains sexual content which is strictly prohibited. Your account has been banned for 1 month. Please contact support if you believe this is an error."
          : "Your message contains inappropriate content. Your account has been temporarily suspended. Please contact support if you believe this is an error.";

        return res.status(403).json({
          message: banMessage,
          flagged: true,
          type: modResult.type,
        });
      }

      const userMessage = await storage.createMessage({
        conversationId,
        content,
        role: "user"
      });

      const easterEggs: Array<{ pattern: RegExp; response: string }> = [
        { pattern: /\broast\s+mya\b/i, response: "Nah Dawg She Already embarrassed herself When she turned her Camera on 😂" },
      ];
      const easterEggMatch = easterEggs.find(e => e.pattern.test(content));
      if (easterEggMatch) {
        const aiMsg = await storage.createMessage({ conversationId, content: easterEggMatch.response, role: "assistant" });
        return res.json({ userMessage, aiMessage: aiMsg });
      }

      const ticketActionVerbs = /\b(open|create|submit|file|make|start|send|raise|log)\s+(a\s+)?(support\s+)?ticket\b/i;
      const ticketActionPhrases = /\b(i need|i want|please|can you|could you)\s+(a\s+)?(support\s+ticket|bug\s+report|issue\s+report)\b/i;
      const ticketExclude = /\b(how\s+(do|can|to|does)|what\s+is|where\s+(do|can)|explain|tell\s+me\s+about|steps\s+to)\b/i;
      const isTicketRequest = (ticketActionVerbs.test(content) || ticketActionPhrases.test(content)) && !ticketExclude.test(content);

      if (isTicketRequest && sendingUserId) {
        try {
          const sender = await storage.getUser(sendingUserId);
          if (!sender) throw new Error('User not found');

          const subjectText = content
            .replace(/\b(can you|could you|please|i want to|i need to|i'd like to)\s*/gi, '')
            .replace(/\b(open|create|submit|file|make|start|send|raise|log)\s+(a\s+)?(support\s+)?(ticket|report)\s*(about|for|regarding|on|:)?\s*/gi, '')
            .trim() || content;

          const memberships = await db.select().from(workgroupMembers).where(and(eq(workgroupMembers.userId, sendingUserId), eq(workgroupMembers.isBlocked, false)));

          if (memberships.length === 0) {
            const aiMsg = await storage.createMessage({ conversationId, content: "I'd love to create a support ticket for you, but you need to be in a workgroup first. Head to the Workgroups page to create or join one, then you can submit tickets there.", role: "assistant" });
            return res.json({ userMessage, aiMessage: aiMsg, verified: "unknown" });
          }

          const classification = await classifyTicket(subjectText);
          const senderName = `${sender.firstName || ''} ${sender.lastName || ''}`.trim() || sender.email || 'User';

          let targetWgId = memberships[0].workgroupId;
          if (memberships.length > 1) {
            const wgIds = memberships.map(m => m.workgroupId);
            const memberWgs = await db.select().from(workgroups).where(inArray(workgroups.id, wgIds));
            const deptMatch = memberWgs.find(wg => wg.department === classification.department);
            if (deptMatch) targetWgId = deptMatch.id;
          }

          const admins = await db.select().from(workgroupMembers).where(and(eq(workgroupMembers.workgroupId, targetWgId), or(eq(workgroupMembers.role, 'owner'), eq(workgroupMembers.role, 'admin'))));
          const assignedAdmin = admins[0] || null;

          const [ticket] = await db.insert(supportTickets).values({
            workgroupId: targetWgId,
            requesterId: sendingUserId,
            requesterName: senderName,
            assignedTo: assignedAdmin?.userId || null,
            assignedName: assignedAdmin?.userName || null,
            subject: subjectText.slice(0, 200),
            context: content,
            priority: classification.priority,
            category: classification.category,
            department: classification.department,
          }).returning();

          await db.insert(supportTicketMessages).values({
            ticketId: ticket.id,
            senderId: sendingUserId,
            senderName,
            content: content,
          });

          const [targetWg] = await db.select().from(workgroups).where(eq(workgroups.id, targetWgId));
          const wgName = targetWg?.name || 'your workgroup';
          const deptLabel = classification.department.charAt(0).toUpperCase() + classification.department.slice(1);
          const catLabel = classification.category.replace(/_/g, ' ');

          await db.insert(workgroupMessages).values({
            workgroupId: targetWgId,
            senderId: sendingUserId,
            senderName: 'System',
            senderEmail: sender.email,
            content: `🎫 New Support Ticket #${ticket.id}\n\nFrom: ${senderName}\nSubject: ${subjectText.slice(0, 100)}\nCategory: ${catLabel}\nDepartment: ${deptLabel}\nPriority: ${ticket.priority}\n\nCreated via AI Chat. Review in the Support tab.`,
            messageType: 'group',
          });

          for (const admin of admins) {
            await db.insert(ticketNotifications).values({
              userId: admin.userId,
              ticketId: ticket.id,
              workgroupId: targetWgId,
              title: `New Ticket: ${subjectText.slice(0, 60)}`,
              body: `From ${senderName} · ${deptLabel} · ${catLabel} (via AI Chat)`,
              type: 'new_ticket',
            });
          }

          const aiMsg = await storage.createMessage({
            conversationId,
            content: `I've created support ticket #${ticket.id} for you in **${wgName}**.\n\n**Subject:** ${subjectText.slice(0, 100)}\n**Category:** ${catLabel}\n**Department:** ${deptLabel}\n**Priority:** ${classification.priority}\n\nYou can track it in the Support tab of your workgroup.`,
            role: "assistant"
          });
          return res.json({ userMessage, aiMessage: aiMsg, verified: "unknown" });
        } catch (ticketError: any) {
          console.error('[AI Ticket] Error:', ticketError.message);
          const aiMsg = await storage.createMessage({ conversationId, content: `I tried to create a support ticket but ran into an issue. You can create one manually from the Workgroups page → Support tab.`, role: "assistant" });
          return res.json({ userMessage, aiMessage: aiMsg, verified: "unknown" });
        }
      }

      const imageNouns = /\b(image|picture|photo|illustration|artwork|drawing|painting|visual|icon|logo|graphic|poster|banner|wallpaper|avatar|portrait|diagram|infographic|meme|thumbnail|cover)\b/i;
      const imageVerbs = /\b(generate|create|make|draw|paint|design|sketch|render|produce|show|give|build|craft)\b/i;
      const imageIntent = /\b(can you|could you|please|i want|i need|i'd like|give me|show me|let me see|make me)\b/i;
      const isImageRequest = (imageVerbs.test(content) && imageNouns.test(content)) || (imageIntent.test(content) && imageNouns.test(content));

      let aiResponseContent: string;
      let responseUsedGroundedSearch = false;

      if (isImageRequest) {
        try {
          const imagePrompt = content
            .replace(/^(can you|could you|please|i want to|i need|i'd like to|give me|show me|let me see|make me)\s*/i, '')
            .replace(/^(generate|create|make|draw|paint|design|sketch|render|produce)\s+(an?|the|me\s+an?|me\s+the|me\s+a)?\s*/i, '')
            .replace(/\b(image|picture|photo|illustration|artwork|drawing|painting|visual)\s*(of|about|showing|depicting|with|for)?\s*/i, '')
            .replace(/\s+/g, ' ')
            .trim() || content;

          const geminiKey = process.env.GEMINI_API_KEY;
          if (!geminiKey) throw new Error('Gemini API key not configured');
          const { GoogleGenAI } = await import('@google/genai');
          const ai = new GoogleGenAI({ apiKey: geminiKey });
          const imgResp = await ai.models.generateContent({
            model: 'gemini-2.0-flash-exp-image-generation',
            contents: [{ role: 'user', parts: [{ text: `${imagePrompt}. High quality, photorealistic, sharp.` }] }],
            config: { responseModalities: ['TEXT', 'IMAGE'], temperature: 1 },
          });
          const imgParts = imgResp.candidates?.[0]?.content?.parts || [];
          const imgPart = imgParts.find((p: any) => p.inlineData?.mimeType?.startsWith('image'));
          if (!imgPart?.inlineData?.data) throw new Error('No image returned');
          const imageDataUrl = `data:${imgPart.inlineData.mimeType};base64,${imgPart.inlineData.data}`;

          aiResponseContent = `Here's the image I generated for you:\n\n![Generated Image](${imageDataUrl})\n\n*Prompt: "${imagePrompt}"*`;
        } catch (imageError: any) {
          console.error("Image generation failed in chat:", imageError);
          aiResponseContent = `I tried to generate that image but ran into an issue: ${imageError.message}. You can also try using the Image button in the toolbar to generate images directly.`;
        }
      } else {
        const existingMessages = await storage.getMessagesByConversation(conversationId);
        const conversationHistory = existingMessages.map(msg => ({
          role: msg.role,
          content: msg.content
        }));

        const { generateAIResponse } = await import('./services/multi-ai.js');
        const userId = `user_${Math.random().toString(36).substr(2, 9)}`;
        const sender = await storage.getUser(sendingUserId);
        const userTier = sender?.subscriptionTier || 'free';
        const aiResult = await generateAIResponse(
          content,
          conversationHistory,
          userTier,
          req.body.selectedModel || "auto-select",
          userId,
          req.body.language || "en",
          req.body.responseStyle || "balanced",
          req.body.responseTone || "casual"
        );
        responseUsedGroundedSearch = typeof aiResult === 'object' && aiResult.usedGroundedSearch;
        aiResponseContent = typeof aiResult === 'object' ? aiResult.text : aiResult;
      }

      const senderForVerify = sendingUserId ? await storage.getUser(sendingUserId) : null;
      const senderTier = senderForVerify?.subscriptionTier || 'free';

      const verifyPromise = (async (): Promise<"verified" | "unverified" | "unknown"> => {
        if (senderTier === 'free') return "unknown";
        try {
          const { verifyAIResponse } = await import('./services/multi-ai.js');
          if (responseUsedGroundedSearch) return "verified";
          const geminiKey = process.env.GEMINI_API_KEY;
          if (geminiKey && aiResponseContent.length > 30) {
            return await verifyAIResponse(aiResponseContent, content, geminiKey);
          }
          return "unknown";
        } catch {
          return "unknown";
        }
      })();

      const [aiMessage, verified] = await Promise.all([
        storage.createMessage({ conversationId, content: aiResponseContent, role: "assistant" }),
        verifyPromise
      ]);

      res.json({ userMessage, aiMessage, verified });
    } catch (error: any) {
      console.error("Error in message route:", error);
      res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  const VALID_COUPONS: Record<string, { discountedPrice: string; label: string; allowedEmail: string }> = {
    'TURBOTEST99': { discountedPrice: '$0.99', label: 'Enterprise discounted to $0.99/mo', allowedEmail: 'support@turboanswer.it.com' },
  };

  app.post('/api/validate-coupon', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) return res.status(401).json({ error: 'User not found' });

      const { coupon } = req.body || {};
      console.log(`[Coupon] Validating coupon "${coupon}" for user ${userId} (${user.email})`);
      const couponKey = coupon?.trim()?.toUpperCase();
      const couponData = VALID_COUPONS[couponKey];
      if (!couponData) {
        console.log(`[Coupon] Code "${couponKey}" not found in valid coupons. Available: ${Object.keys(VALID_COUPONS).join(', ')}`);
        return res.status(400).json({ error: 'Invalid coupon code.' });
      }
      if (user.email?.toLowerCase() !== couponData.allowedEmail.toLowerCase()) {
        console.log(`[Coupon] Email mismatch: user=${user.email}, required=${couponData.allowedEmail}`);
        return res.status(403).json({ error: 'This coupon is not valid for your account.' });
      }
      console.log(`[Coupon] Valid! Applying discount for ${user.email}`);
      res.json({ valid: true, discountedPrice: couponData.discountedPrice, label: couponData.label });
    } catch (error: any) {
      console.error('[Coupon] Error:', error.message);
      res.status(500).json({ error: 'Failed to validate coupon.' });
    }
  });

  // PayPal checkout - create subscription and redirect to PayPal
  app.post('/api/checkout', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }

      const { plan, coupon } = req.body || {};
      const tier = plan === 'enterprise' ? 'enterprise' : plan === 'research' ? 'research' : 'pro';
      console.log('[PayPal Checkout] Starting for user:', userId, 'plan:', tier);

      let priceOverride: string | undefined;
      if (coupon && tier === 'enterprise') {
        const couponData = VALID_COUPONS[coupon.toUpperCase()];
        if (couponData && user.email?.toLowerCase() === couponData.allowedEmail.toLowerCase()) {
          priceOverride = '0.99';
          console.log('[PayPal Checkout] Coupon applied - price override to $0.99');
        }
      }

      const baseUrl = `https://${req.get('host') || process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000'}`;
      const result = await createSubscription(
        tier as 'pro' | 'research' | 'enterprise',
        user.email,
        userId,
        `${baseUrl}/chat?subscription=${tier}`,
        `${baseUrl}/chat`,
        priceOverride,
      );

      console.log('[PayPal Checkout] Subscription created:', result.subscriptionId);
      await storage.storePendingSubscription(userId, result.subscriptionId);
      console.log('[PayPal Checkout] Stored pending subscription ID for user:', userId, '(not yet active — awaiting PayPal approval)');
      res.json({ url: result.approvalUrl });
    } catch (error: any) {
      console.error('[PayPal Checkout] ERROR:', error.message);
      res.status(500).json({ error: 'Checkout failed. Please try again.' });
    }
  });

  // Sync subscription after PayPal redirect
  app.post('/api/sync-subscription', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { subscriptionId, expectedTier } = req.body || {};

      const currentUser = await storage.getUser(userId);
      const oldTier = currentUser?.subscriptionTier || 'free';

      const fireSubEmail = (newTier: string, userObj?: typeof currentUser) => {
        const u = userObj || currentUser;
        if (!u?.email) return;
        const name = `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email;
        const isSwitch = oldTier !== 'free' && oldTier !== newTier;
        sendSubscriptionEmail(isSwitch ? 'switch' : 'signup', u.email, name, newTier, oldTier).catch(() => {});
      };

      if (subscriptionId) {
        const subDetails = await getSubscriptionDetails(subscriptionId);
        if (subDetails.status === 'ACTIVE' || subDetails.status === 'APPROVED') {
          let tier = expectedTier || 'pro';
          try {
            const customData = JSON.parse(subDetails.custom_id || '{}');
            if (customData.tier) tier = customData.tier;
          } catch (e) {}

          await storage.updatePaypalSubscription(userId, subscriptionId, tier);
          console.log(`[PayPal Sync] Updated user ${userId} to ${tier}`);
          if (oldTier !== tier) fireSubEmail(tier);

          let enterpriseCode: string | undefined;
          if (tier === 'enterprise') {
            const existingCode = await storage.getEnterpriseCodeByOwner(userId);
            if (!existingCode) {
              const { randomInt } = await import('crypto');
              const code = String(randomInt(100000, 999999));
              const user = await storage.getUser(userId);
              await storage.createEnterpriseCode(code, userId, user?.email || null);
              enterpriseCode = code;
              console.log(`[Enterprise] Generated code ${code} for user ${userId}`);
            } else {
              if (!existingCode.isActive) {
                await storage.reactivateEnterpriseCode(userId);
                console.log(`[Enterprise] Reactivated code ${existingCode.code} for user ${userId}`);
              }
              enterpriseCode = existingCode.code;
            }
          }

          return res.json({ tier, status: 'active', enterpriseCode });
        }
      }

      const user = await storage.getUser(userId);
      if (user?.paypalSubscriptionId) {
        try {
          console.log(`[PayPal Sync] Checking stored subscription ${user.paypalSubscriptionId} for user ${userId}`);
          const subDetails = await getSubscriptionDetails(user.paypalSubscriptionId);
          console.log(`[PayPal Sync] Subscription status: ${subDetails.status}`);
          if (subDetails.status === 'ACTIVE' || subDetails.status === 'APPROVED') {
            let tier = expectedTier || user.subscriptionTier || 'pro';
            try {
              const customData = JSON.parse(subDetails.custom_id || '{}');
              if (customData.tier) tier = customData.tier;
            } catch (e) {}
            await storage.updatePaypalSubscription(userId, user.paypalSubscriptionId, tier);
            console.log(`[PayPal Sync] Updated user ${userId} to ${tier} via stored subscription`);
            if (oldTier !== tier) fireSubEmail(tier, user);

            let enterpriseCode: string | undefined;
            if (tier === 'enterprise') {
              const existingCode = await storage.getEnterpriseCodeByOwner(userId);
              if (!existingCode) {
                const { randomInt } = await import('crypto');
                const code = String(randomInt(100000, 999999));
                await storage.createEnterpriseCode(code, userId, user?.email || null);
                enterpriseCode = code;
                console.log(`[Enterprise] Generated code ${code} for user ${userId}`);
              } else {
                if (!existingCode.isActive) {
                  await storage.reactivateEnterpriseCode(userId);
                  console.log(`[Enterprise] Reactivated code ${existingCode.code} for user ${userId}`);
                }
                enterpriseCode = existingCode.code;
              }
            }

            return res.json({ tier, status: 'active', enterpriseCode });
          }
        } catch (e: any) {
          console.error(`[PayPal Sync] Error checking stored subscription:`, e.message);
        }
      }

      res.json({ tier: user?.subscriptionTier || 'free', status: user?.subscriptionStatus || 'none' });
    } catch (error: any) {
      console.error('[PayPal Sync] Error:', error.message);
      res.json({ tier: 'free', status: 'none' });
    }
  });

  // Check user subscription status
  app.get('/api/subscription-status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.json({ tier: 'free', status: 'none' });
      }

      if (user.complimentaryExpiresAt && new Date(user.complimentaryExpiresAt) < new Date()) {
        await storage.adminSetSubscription(userId, 'free', 'cancelled');
        await storage.setComplimentaryExpiration(userId, null);
        console.log(`[Subscription] Complimentary access expired for user ${userId}`);
        return res.json({ tier: 'free', status: 'expired' });
      }

      if ((user.subscriptionTier === 'pro' || user.subscriptionTier === 'research' || user.subscriptionTier === 'enterprise') && user.subscriptionStatus === 'active') {
        return res.json({ tier: user.subscriptionTier, status: 'active' });
      }

      if (user.paypalSubscriptionId) {
        try {
          const subDetails = await getSubscriptionDetails(user.paypalSubscriptionId);
          if (subDetails.status === 'ACTIVE') {
            let tier = 'pro';
            try {
              const customData = JSON.parse(subDetails.custom_id || '{}');
              if (customData.tier) tier = customData.tier;
            } catch (e) {}
            await storage.updatePaypalSubscription(userId, user.paypalSubscriptionId, tier);
            return res.json({ tier, status: 'active' });
          } else if (subDetails.status === 'CANCELLED' || subDetails.status === 'SUSPENDED') {
            await storage.updateUserSubscription(userId, 'cancelled', 'free');
            return res.json({ tier: 'free', status: 'cancelled' });
          }
        } catch (e: any) {
          console.log('[PayPal] Could not verify subscription:', e.message?.substring(0, 100));
          if (user.subscriptionTier === 'pro' || user.subscriptionTier === 'research' || user.subscriptionTier === 'enterprise') {
            return res.json({ tier: user.subscriptionTier, status: user.subscriptionStatus || 'active' });
          }
        }
      }

      res.json({ tier: user.subscriptionTier || 'free', status: user.subscriptionStatus || 'none' });
    } catch (error: any) {
      console.error('Subscription status error:', error);
      res.json({ tier: 'free', status: 'none' });
    }
  });

  app.post('/api/apply-promo', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }

      const { promoCode } = req.body;
      if (!promoCode) {
        return res.status(400).json({ error: 'Promo code is required' });
      }

      const PROMO_CODES: Record<string, { tier: string; email?: string; description: string }> = {
        'TURBO-CREATOR-LIFETIME': {
          tier: 'research',
          email: 'support@turboanswer.it.com',
          description: 'Creator lifetime Research access'
        },
        'TURBO-VIP-LIFETIME': {
          tier: 'research',
          email: 'tschantret@yahoo.com',
          description: 'VIP lifetime Research access'
        },
        'TURBO-SPECIAL-LIFETIME': {
          tier: 'research',
          email: 'luanfrank5@gmail.com',
          description: 'Special lifetime Research access'
        },
        'TURBO-ENTERPRISE-TEST': {
          tier: 'enterprise',
          email: 'support@turboanswer.it.com',
          description: 'Enterprise test access (1 cent trial)'
        }
      };

      const promo = PROMO_CODES[promoCode.toUpperCase()];
      if (!promo) {
        return res.status(400).json({ error: 'Invalid promo code' });
      }

      if (promo.email && user.email !== promo.email) {
        return res.status(403).json({ error: 'This promo code is not valid for your account' });
      }

      await storage.updateUserSubscription(userId, 'active', promo.tier);
      console.log(`[Promo] Applied code ${promoCode} for user ${userId} (${user.email}) - ${promo.description}`);

      let enterpriseCode: string | undefined;
      if (promo.tier === 'enterprise') {
        const { randomInt } = await import('crypto');
        const code = String(randomInt(100000, 999999));
        await storage.createEnterpriseCode(code, userId, user.email);
        enterpriseCode = code;
        console.log(`[Enterprise] Generated code ${code} for user ${userId}`);
      }

      res.json({
        success: true,
        message: `${promo.description} activated! You now have lifetime ${promo.tier} access.`,
        tier: promo.tier,
        enterpriseCode,
      });
    } catch (error: any) {
      console.error('[Promo] Error:', error.message);
      res.status(500).json({ error: 'Failed to apply promo code' });
    }
  });

  const enterpriseRedeemAttempts = new Map<string, { count: number; resetAt: number }>();

  app.post('/api/redeem-enterprise-code', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      const now = Date.now();
      const attempts = enterpriseRedeemAttempts.get(userId);
      if (attempts && now < attempts.resetAt) {
        if (attempts.count >= 5) {
          return res.status(429).json({ error: 'Too many attempts. Please try again in 15 minutes.' });
        }
        attempts.count++;
      } else {
        enterpriseRedeemAttempts.set(userId, { count: 1, resetAt: now + 15 * 60 * 1000 });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }

      const { code } = req.body;
      if (!code || typeof code !== 'string' || !/^\d{6}$/.test(code)) {
        return res.status(400).json({ error: 'Please enter a valid 6-digit enterprise code' });
      }

      const enterpriseCode = await storage.getEnterpriseCodeByCode(code);
      if (!enterpriseCode) {
        return res.status(400).json({ error: 'Invalid enterprise code' });
      }

      if (!enterpriseCode.isActive) {
        return res.status(400).json({ error: 'This enterprise code is no longer active. The owner may have cancelled their subscription.' });
      }

      if (enterpriseCode.ownerUserId === userId) {
        return res.status(400).json({ error: 'You cannot redeem your own enterprise code' });
      }

      if ((enterpriseCode.currentUses || 0) >= (enterpriseCode.maxUses || 5)) {
        return res.status(400).json({ error: 'This enterprise code has reached its maximum number of uses (5). Contact support@turboanswer.it.com for larger team plans.' });
      }

      const existingRedemptions = await storage.getEnterpriseCodeRedemptions(enterpriseCode.id);
      const alreadyRedeemed = existingRedemptions.some(r => r.userId === userId);
      if (alreadyRedeemed) {
        return res.status(400).json({ error: 'You have already redeemed this enterprise code' });
      }

      await storage.redeemEnterpriseCode(enterpriseCode.id, userId, user.email);
      await storage.incrementEnterpriseCodeUses(enterpriseCode.id);
      await storage.updateUserSubscription(userId, 'active', 'research');

      console.log(`[Enterprise] Code ${code} redeemed by user ${userId} (${user.email})`);
      res.json({
        success: true,
        message: 'Enterprise code redeemed! You now have Research-level access.',
        tier: 'research'
      });
    } catch (error: any) {
      console.error('[Enterprise] Redeem error:', error.message);
      res.status(500).json({ error: 'Failed to redeem enterprise code' });
    }
  });

  app.get('/api/enterprise-code', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const code = await storage.getEnterpriseCodeByOwner(userId);
      if (!code) {
        return res.json({ hasCode: false });
      }
      const redemptions = await storage.getEnterpriseCodeRedemptions(code.id);
      res.json({
        hasCode: true,
        code: code.code,
        maxUses: code.maxUses,
        currentUses: code.currentUses,
        redemptions: redemptions.map(r => ({ email: r.userEmail, date: r.redeemedAt }))
      });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to get enterprise code' });
    }
  });

  app.post('/api/delete-account', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }

      if (user.paypalSubscriptionId && user.subscriptionTier !== 'free') {
        try {
          await cancelSubscription(user.paypalSubscriptionId, 'Account deleted by user');
          console.log(`[Delete Account] Cancelled PayPal subscription for user ${userId}`);
        } catch (e: any) {
          console.log(`[Delete Account] PayPal cancel error (may already be cancelled):`, e.message?.substring(0, 100));
        }
      }

      if (user.subscriptionTier === 'enterprise') {
        const revokedUsers = await storage.revokeAllEnterpriseCodeAccess(userId);
        console.log(`[Delete Account] Revoked enterprise access for ${revokedUsers.length} team members`);
      }

      const redemption = await storage.getRedemptionByUserId(userId);
      if (redemption) {
        await storage.decrementEnterpriseCodeUses(redemption.codeId);
        console.log(`[Delete Account] Freed enterprise code slot for code ${redemption.codeId}`);
      }

      await storage.deleteUserAccount(userId);
      console.log(`[Delete Account] User ${userId} (${user.email}) account deleted`);

      req.session.destroy((err: any) => {
        if (err) console.error('[Delete Account] Session destroy error:', err.message);
        res.clearCookie('connect.sid');
        res.clearCookie('_csrf_token');
        res.json({ success: true, message: 'Your account has been deleted successfully.' });
      });
    } catch (error: any) {
      console.error('[Delete Account] Error:', error.message);
      res.status(500).json({ error: 'Failed to delete account' });
    }
  });

  // Cancel subscription with auto-refund if within 3 days
  // PayPal webhook — handles payment failures and subscription events
  app.post('/api/paypal/webhook', async (req: any, res) => {
    try {
      const event = req.body;
      if (!event || typeof event !== 'object' || !event.event_type || !event.id) {
        return res.status(400).json({ error: 'Invalid webhook payload' });
      }
      const ALLOWED_EVENTS = ['BILLING.SUBSCRIPTION.PAYMENT.FAILED', 'BILLING.SUBSCRIPTION.ACTIVATED', 'BILLING.SUBSCRIPTION.CANCELLED', 'BILLING.SUBSCRIPTION.SUSPENDED', 'PAYMENT.SALE.COMPLETED'];
      const eventType: string = event.event_type;
      if (!ALLOWED_EVENTS.includes(eventType)) {
        return res.status(200).json({ received: true, ignored: true });
      }
      console.log(`[PayPal Webhook] Received event: ${eventType}`);

      if (eventType === 'BILLING.SUBSCRIPTION.PAYMENT.FAILED') {
        const subscriptionId: string = event?.resource?.id || event?.resource?.billing_agreement_id || '';
        if (subscriptionId) {
          try {
            const users = await storage.getAllUsers ? await storage.getAllUsers() : [];
            const affected = users.find((u: any) => u.paypalSubscriptionId === subscriptionId);
            if (affected?.email) {
              const name = `${affected.firstName || ''} ${affected.lastName || ''}`.trim() || affected.email;
              await sendSubscriptionEmail('payment_failed', affected.email, name, affected.subscriptionTier || 'pro');
              console.log(`[PayPal Webhook] Payment failed email sent to ${affected.email}`);
            }
          } catch (lookupErr: any) {
            console.error('[PayPal Webhook] User lookup error:', lookupErr.message);
          }
        }
      }

      res.status(200).json({ received: true });
    } catch (err: any) {
      console.error('[PayPal Webhook] Error:', err.message);
      res.status(200).json({ received: true });
    }
  });

  app.post('/api/cancel-subscription', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }

      if (!user.paypalSubscriptionId || user.subscriptionTier === 'free') {
        return res.status(400).json({ error: 'No active subscription to cancel' });
      }

      const subscriptionId = user.paypalSubscriptionId;
      const subscriptionStartDate = user.subscriptionStartDate;
      let refunded = false;
      let refundAmount = '';

      const isWithin3Days = subscriptionStartDate && 
        (Date.now() - new Date(subscriptionStartDate).getTime()) < 3 * 24 * 60 * 60 * 1000;

      if (isWithin3Days) {
        try {
          const transactions = await getSubscriptionTransactions(subscriptionId);
          const latestCompleted = transactions.find((txn: any) => txn.status === 'COMPLETED' && txn.id);
          if (latestCompleted) {
            const amount = latestCompleted.amount_with_breakdown?.gross_amount?.value || (user.subscriptionTier === 'enterprise' ? '100.00' : user.subscriptionTier === 'research' ? '30.00' : '6.99');
            const currency = latestCompleted.amount_with_breakdown?.gross_amount?.currency_code || 'USD';
            const refundResult = await refundCapture(latestCompleted.id, { value: amount, currency_code: currency });
            if (refundResult && (refundResult.status === 'COMPLETED' || refundResult.status === 'PENDING')) {
              refundAmount = amount;
              refunded = true;
              console.log(`[PayPal Refund] Refunded $${amount} (transaction ${latestCompleted.id}) for user ${userId}`);
            }
          }
        } catch (refundError: any) {
          console.error('[PayPal Refund] Error:', refundError.message);
        }
      }

      try {
        await cancelSubscription(subscriptionId, 'User requested cancellation');
        console.log(`[PayPal Cancel] Subscription ${subscriptionId} cancelled for user ${userId}`);
      } catch (cancelError: any) {
        console.error('[PayPal Cancel] Error:', cancelError.message);
      }

      if (user.subscriptionTier === 'enterprise') {
        const revokedUsers = await storage.revokeAllEnterpriseCodeAccess(userId);
        await storage.deactivateEnterpriseCode(userId);
        console.log(`[Cancel Subscription] Revoked enterprise access for ${revokedUsers.length} team members and deactivated code`);
      }

      const redemption = await storage.getRedemptionByUserId(userId);
      if (redemption) {
        await storage.decrementEnterpriseCodeUses(redemption.codeId);
        await storage.removeEnterpriseCodeRedemption(redemption.codeId, userId);
        console.log(`[Cancel Subscription] Freed enterprise code slot for code ${redemption.codeId}`);
      }

      await storage.cancelUserSubscription(userId);

      if (user.email) {
        const cancelName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
        sendSubscriptionEmail('cancel', user.email, cancelName, 'free', user.subscriptionTier || 'pro').catch(() => {});
      }

      res.json({ 
        success: true, 
        refunded, 
        refundAmount: refunded ? `$${refundAmount}` : null,
        message: refunded 
          ? `Subscription cancelled and $${refundAmount} refunded to your account.`
          : 'Subscription cancelled. No refund available (cancellation after 3-day refund window).'
      });
    } catch (error: any) {
      console.error('[Cancel Subscription] Error:', error.message);
      res.status(500).json({ error: 'Failed to cancel subscription. Please try again.' });
    }
  });

  // Create Code Studio add-on subscription
  // Enterprise members get it FREE — auto-activate without PayPal
  app.post('/api/create-addon-subscription', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) return res.status(401).json({ error: 'User not found' });
      if (user.codeStudioAddon) return res.status(400).json({ error: 'You already have Code Studio active' });

      // Owner account: auto-activate free, no PayPal needed
      if (isOwnerAccount(user)) {
        await storage.updateCodeStudioAddon(userId, true, 'owner_included');
        console.log(`[Addon] Code Studio auto-activated FREE for owner ${userId}`);
        return res.json({ free: true, success: true, message: 'Code Studio activated for owner account!' });
      }

      // Enterprise members: activate for free, no PayPal needed
      if (user.subscriptionTier === 'enterprise' && user.subscriptionStatus === 'active') {
        await storage.updateCodeStudioAddon(userId, true, 'enterprise_included');
        console.log(`[Addon] Code Studio auto-activated FREE for Enterprise user ${userId}`);
        return res.json({ free: true, success: true, message: 'Code Studio included free with Enterprise!' });
      }

      const host = req.get('host') || process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000';
      const appUrl = `https://${host}`;
      console.log(`[Addon] Creating subscription for user ${userId}, return base: ${appUrl}`);
      const result = await createAddonSubscription(
        user.email,
        userId,
        `${appUrl}/code-studio?addon=activated`,
        `${appUrl}/code-studio?addon=cancelled`,
      );
      res.json({ url: result.approvalUrl, subscriptionId: result.subscriptionId });
    } catch (error: any) {
      console.error('[Addon] Create subscription error:', error.message, error.stack);
      res.status(500).json({ error: `Failed to create add-on subscription: ${error.message}` });
    }
  });

  // Confirm Code Studio add-on after PayPal redirect
  app.post('/api/confirm-addon-subscription', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { subscriptionId } = req.body || {};
      if (!subscriptionId) return res.status(400).json({ error: 'subscriptionId required' });

      const details = await getSubscriptionDetails(subscriptionId);
      if (details.status === 'ACTIVE' || details.status === 'APPROVED') {
        await storage.updateCodeStudioAddon(userId, true, subscriptionId);
        console.log(`[Addon] Code Studio activated for user ${userId}, sub ${subscriptionId}`);
        return res.json({ success: true });
      }
      res.status(400).json({ error: `Subscription not active (status: ${details.status})` });
    } catch (error: any) {
      console.error('[Addon] Confirm subscription error:', error.message);
      res.status(500).json({ error: 'Failed to confirm add-on subscription' });
    }
  });

  // Cancel Code Studio add-on
  app.post('/api/cancel-addon', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) return res.status(401).json({ error: 'User not found' });
      if (!user.codeStudioAddon) return res.status(400).json({ error: 'No Code Studio add-on to cancel' });

      if (user.codeStudioAddonSubId && !user.codeStudioAddonSubId.startsWith('promo_') && user.codeStudioAddonSubId !== 'enterprise_included') {
        await cancelSubscription(user.codeStudioAddonSubId, 'User cancelled Code Studio add-on').catch(() => {});
      }
      await storage.updateCodeStudioAddon(userId, false, null);
      res.json({ success: true, message: 'Code Studio add-on cancelled.' });
    } catch (error: any) {
      console.error('[Addon] Cancel error:', error.message);
      res.status(500).json({ error: 'Failed to cancel add-on' });
    }
  });

  // ── Weekly Digest Preference ──────────────────────────────────────────────
  app.post('/api/settings/weekly-digest', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) return res.status(401).json({ error: 'User not found' });

      const { enabled } = req.body;
      await storage.updateWeeklyDigest(userId, !!enabled);

      if (enabled && user.email) {
        const name = user.firstName || user.email.split('@')[0];
        await sendBrevoEmail(
          user.email,
          name,
          'You\'re subscribed to TurboAnswer Weekly Digest',
          `Hi ${name},\n\nYou've successfully subscribed to the TurboAnswer Weekly Digest!\n\nEvery week you'll receive a summary of:\n- Your AI usage highlights\n- New features and updates\n- Tips to get the most out of TurboAnswer\n\nYou can unsubscribe at any time from your Settings > Notifications page.\n\nThank you for being part of TurboAnswer!\n\nThe TurboAnswer Team`
        ).catch(() => {});
      }

      res.json({ success: true, enabled: !!enabled, message: enabled ? 'Weekly digest enabled' : 'Weekly digest disabled' });
    } catch (error: any) {
      console.error('[WeeklyDigest]', error.message);
      res.status(500).json({ error: 'Failed to update weekly digest preference' });
    }
  });

  // ── Promo Code: Apply to Code Studio (free activation) ──────────────────
  app.post('/api/apply-code-studio-promo', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) return res.status(401).json({ error: 'User not found' });
      if (user.codeStudioAddon) return res.status(400).json({ error: 'You already have Code Studio active' });

      const { code } = req.body;
      if (!code) return res.status(400).json({ error: 'Promo code is required' });

      const promo = await storage.getPromoCode(code.trim());
      if (!promo || !promo.isActive) return res.status(400).json({ error: 'Invalid or inactive promo code' });
      if (promo.product !== 'code_studio' && promo.product !== 'all') {
        return res.status(400).json({ error: 'This promo code is not valid for Code Studio' });
      }
      if (promo.expiresAt && new Date() > promo.expiresAt) {
        return res.status(400).json({ error: 'This promo code has expired' });
      }
      if (promo.maxUses !== null && promo.usedCount >= promo.maxUses) {
        return res.status(400).json({ error: 'This promo code has reached its usage limit' });
      }
      if (promo.discountPercent < 100) {
        return res.status(400).json({ error: 'This code provides a partial discount — use it on the checkout page (coming soon)' });
      }

      await storage.updateCodeStudioAddon(userId, true, `promo_${promo.code}`);
      await storage.incrementPromoCodeUsage(promo.id);
      console.log(`[PromoCode] Applied ${promo.code} for Code Studio to user ${userId}`);
      res.json({ success: true, message: 'Code Studio activated! Enjoy your free access.' });
    } catch (error: any) {
      console.error('[PromoCode] Apply error:', error.message);
      res.status(500).json({ error: 'Failed to apply promo code' });
    }
  });

  // ── Admin: Promo Code CRUD ────────────────────────────────────────────────
  app.get('/api/admin/promo-codes', isAdmin, async (_req, res) => {
    try {
      const codes = await storage.getAllPromoCodes();
      res.json(codes);
    } catch (error: any) {
      res.status(500).json({ error: "Something went wrong. Please try again." });
    }
  });

  app.post('/api/admin/promo-codes', isAdmin, async (req: any, res) => {
    try {
      const { code, description, product, discountPercent, maxUses, expiresAt, isActive } = req.body;
      if (!code || !product) return res.status(400).json({ error: 'Code and product are required' });
      const promo = await storage.createPromoCode({
        code: code.trim().toUpperCase(),
        description: description || '',
        product,
        discountPercent: Number(discountPercent) || 100,
        maxUses: maxUses ? Number(maxUses) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        isActive: isActive !== false,
      });
      res.json(promo);
    } catch (error: any) {
      if (error.message?.includes('unique')) {
        return res.status(400).json({ error: 'A promo code with this name already exists' });
      }
      res.status(500).json({ error: "Something went wrong. Please try again." });
    }
  });

  app.patch('/api/admin/promo-codes/:id', isAdmin, async (req: any, res) => {
    try {
      const id = Number(req.params.id);
      const { description, product, discountPercent, maxUses, expiresAt, isActive } = req.body;
      const updates: any = {};
      if (description !== undefined) updates.description = description;
      if (product !== undefined) updates.product = product;
      if (discountPercent !== undefined) updates.discountPercent = Number(discountPercent);
      if (maxUses !== undefined) updates.maxUses = maxUses === '' || maxUses === null ? null : Number(maxUses);
      if (expiresAt !== undefined) updates.expiresAt = expiresAt ? new Date(expiresAt) : null;
      if (isActive !== undefined) updates.isActive = isActive;
      const promo = await storage.updatePromoCode(id, updates);
      res.json(promo);
    } catch (error: any) {
      res.status(500).json({ error: "Something went wrong. Please try again." });
    }
  });

  app.delete('/api/admin/promo-codes/:id', isAdmin, async (req: any, res) => {
    try {
      const id = Number(req.params.id);
      await storage.deletePromoCode(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: "Something went wrong. Please try again." });
    }
  });

  // Get available AI models for user's subscription tier
  app.get('/api/models', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      let subscriptionTier = user?.subscriptionTier || "free";
      if (user?.complimentaryExpiresAt && new Date(user.complimentaryExpiresAt) < new Date()) {
        await storage.adminSetSubscription(userId, 'free', 'cancelled');
        await storage.setComplimentaryExpiration(userId, null);
        subscriptionTier = 'free';
      }
      const availableModels = getAvailableModels(subscriptionTier);
      res.json({ models: availableModels, currentTier: subscriptionTier });
    } catch (error: any) {
      console.error('Models endpoint error:', error);
      const availableModels = getAvailableModels("free");
      res.json({ models: availableModels, currentTier: "free" });
    }
  });

  // Get all users (Employee only)
  app.get('/api/employee/users', isAdmin, async (req, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      
      const sanitizedUsers = allUsers.map(user => ({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        homeAddress: user.homeAddress,
        subscriptionTier: user.subscriptionTier,
        subscriptionStatus: user.subscriptionStatus,
        isBanned: user.isBanned,
        isFlagged: user.isFlagged,
        flagReason: user.flagReason,
        banReason: user.banReason,
        banExpiresAt: user.banExpiresAt,
        banDuration: user.banDuration,
        isSuspended: user.isSuspended,
        suspensionReason: user.suspensionReason,
        suspendedBy: user.suspendedBy,
        suspendedAt: user.suspendedAt,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
        isEmployee: user.isEmployee,
        employeeRole: user.employeeRole,
      }));
      
      res.json(sanitizedUsers);
    } catch (error: any) {
      console.error('Get users error:', error);
      res.status(500).json({ message: 'Failed to fetch users' });
    }
  });

  // Ban user (Employee only) - supports duration-based bans
  app.post('/api/employee/users/:id/ban', isAdmin, async (req, res) => {
    try {
      const userId = req.params.id;
      const { reason, durationMonths } = req.body;
      
      if (!reason || !reason.trim()) {
        return res.status(400).json({ message: 'Ban reason is required' });
      }
      
      const validDurations = [1, 2, 3, 4, 12];
      const parsedDuration = durationMonths ? parseInt(durationMonths) : 0;
      const duration = validDurations.includes(parsedDuration) ? parsedDuration : undefined;
      const user = await storage.banUser(userId, reason.trim(), duration);
      
      const durationText = duration ? `${duration} month${duration > 1 ? 's' : ''}` : 'permanently';
      
      const employeeId = (req as any).user?.claims?.sub || 'system';
      const adminUser = employeeId !== 'system' ? await storage.getUser(employeeId) : null;
      const employeeUsername = adminUser?.email || adminUser?.firstName || 'Admin';
      
      await storage.createAuditLog({
        employeeId,
        employeeUsername,
        action: 'ban_user',
        targetUserId: userId,
        targetUsername: user.email || user.firstName || userId,
        reason: reason.trim(),
        details: `Ban duration: ${durationText}${user.banExpiresAt ? `. Expires: ${user.banExpiresAt.toISOString()}` : ''}`,
      });
      
      if (user.email) {
        const userName = user.firstName || 'User';
        const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        sendBrevoEmail(user.email, userName,
          'Your TurboAnswer account update',
          `Dear ${userName},\n\nWe regret to inform you that your TurboAnswer account has been banned ${durationText} effective ${currentDate}.\n\nThis action was taken due to a violation of our community guidelines or terms of service. As a result:\n\n- Your account access has been revoked\n- You will not be able to log in or use TurboAnswer services\n- Any active subscriptions have been paused\n\nIf you believe this was done in error, you may appeal by contacting our appeals team at appeals@turboanswer.it.com. Please include your account email and a detailed explanation in your appeal.`
        ).catch(() => {});
      }

      res.json({ message: `User banned ${durationText}`, user: { id: user.id, name: user.firstName || user.email || user.id } });
    } catch (error: any) {
      console.error('Ban user error:', error);
      res.status(500).json({ message: 'Failed to ban user' });
    }
  });

  // Unban user (Employee only)
  app.post('/api/employee/users/:id/unban', isAdmin, async (req, res) => {
    try {
      const userId = req.params.id;
      const user = await storage.unbanUser(userId);
      res.json({ message: 'User unbanned successfully', user: { id: user.id, name: user.firstName || user.email || user.id } });
    } catch (error: any) {
      console.error('Unban user error:', error);
      res.status(500).json({ message: 'Failed to unban user' });
    }
  });

  // Flag user (Employee only)
  app.post('/api/employee/users/:id/flag', isAdmin, async (req, res) => {
    try {
      const userId = req.params.id;
      const { reason } = req.body;
      
      if (!reason || !reason.trim()) {
        return res.status(400).json({ message: 'Flag reason is required' });
      }
      
      const user = await storage.flagUser(userId, reason.trim());

      if (user.email) {
        const userName = user.firstName || 'User';
        const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        sendBrevoEmail(user.email, userName,
          'Your TurboAnswer account is under review',
          `Dear ${userName},\n\nYour TurboAnswer account has been flagged for review as of ${currentDate}.\n\nDuring this review period:\n\n- Your account remains accessible but is being monitored\n- Our team is reviewing recent activity on your account\n- You will receive a follow-up email once the review is complete\n\nThis process typically takes 1-3 business days. If you have additional information that may assist in the review, please contact our appeals team at appeals@turboanswer.it.com.`
        ).catch(() => {});
      }

      res.json({ message: 'User flagged successfully', user: { id: user.id, name: user.firstName || user.email || user.id } });
    } catch (error: any) {
      console.error('Flag user error:', error);
      res.status(500).json({ message: 'Failed to flag user' });
    }
  });

  // Unflag user (Employee only)
  app.post('/api/employee/users/:id/unflag', isAdmin, async (req, res) => {
    try {
      const userId = req.params.id;
      const user = await storage.unflagUser(userId);
      res.json({ message: 'User unflagged successfully', user: { id: user.id, name: user.firstName || user.email || user.id } });
    } catch (error: any) {
      console.error('Unflag user error:', error);
      res.status(500).json({ message: 'Failed to unflag user' });
    }
  });

  // Suspend user (Employee only)
  app.post('/api/employee/users/:id/suspend', isAdmin, async (req, res) => {
    try {
      const userId = req.params.id;
      const { reason, employeeId, employeeUsername } = req.body;
      
      if (!reason || !reason.trim()) {
        return res.status(400).json({ message: 'Suspension reason is required' });
      }

      if (!employeeId || !employeeUsername) {
        return res.status(400).json({ message: 'Employee information is required' });
      }
      
      const user = await storage.suspendUser(userId, reason.trim(), employeeId, employeeUsername);

      if (user.email) {
        const userName = user.firstName || 'User';
        const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        sendBrevoEmail(user.email, userName,
          'Your TurboAnswer account is under review',
          `Dear ${userName},\n\nYour TurboAnswer account has been temporarily suspended and is currently under review as of ${currentDate}.\n\nDuring this review period:\n\n- Your account access is temporarily restricted\n- Your data and conversations remain safe and intact\n- Any active subscriptions are paused until the review is complete\n\nOur team is reviewing your account activity. You will receive a follow-up email once the review is complete. This process typically takes 1-3 business days.\n\nIf you have additional information that may assist in the review, please contact our appeals team at appeals@turboanswer.it.com.`
        ).catch(() => {});
      }

      res.json({ 
        message: 'User suspended successfully', 
        user: { 
          id: user.id, 
          name: user.firstName || user.email || user.id, 
          isSuspended: user.isSuspended,
          suspensionReason: user.suspensionReason,
          suspendedBy: user.suspendedBy
        }
      });
    } catch (error: any) {
      console.error('Suspend user error:', error);
      res.status(500).json({ message: 'Failed to suspend user' });
    }
  });

  // Unsuspend user (Employee only)
  app.post('/api/employee/users/:id/unsuspend', isAdmin, async (req, res) => {
    try {
      const userId = req.params.id;
      const { employeeId, employeeUsername } = req.body;

      if (!employeeId || !employeeUsername) {
        return res.status(400).json({ message: 'Employee information is required' });
      }
      
      const user = await storage.unsuspendUser(userId, employeeId, employeeUsername);
      res.json({ 
        message: 'User unsuspended successfully', 
        user: { 
          id: user.id, 
          name: user.firstName || user.email || user.id, 
          isSuspended: user.isSuspended
        }
      });
    } catch (error: any) {
      console.error('Unsuspend user error:', error);
      res.status(500).json({ message: 'Failed to unsuspend user' });
    }
  });

  app.post('/api/admin/delete-user', isAdmin, async (req: any, res) => {
    try {
      const { userId, verificationCode } = req.body;

      if (!userId) {
        return res.status(400).json({ message: 'User ID is required' });
      }

      if (verificationCode !== 'Pass22580!') {
        return res.status(403).json({ message: 'Invalid verification code' });
      }

      const targetUser = await storage.getUser(userId);
      if (!targetUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      if (targetUser.paypalSubscriptionId && targetUser.subscriptionTier !== 'free') {
        try {
          await cancelSubscription(targetUser.paypalSubscriptionId, 'Account deleted by admin');
          console.log(`[Admin Delete] Cancelled PayPal subscription for user ${userId}`);
        } catch (e: any) {
          console.log(`[Admin Delete] PayPal cancel error (may already be cancelled):`, e.message?.substring(0, 100));
        }
      }

      if (targetUser.subscriptionTier === 'enterprise') {
        try {
          await storage.revokeAllEnterpriseCodeAccess(userId);
          console.log(`[Admin Delete] Revoked enterprise access for user ${userId}`);
        } catch (e: any) {
          console.log(`[Admin Delete] Enterprise revoke error:`, e.message?.substring(0, 100));
        }
      }

      await storage.deleteUserAccount(userId);

      const adminId = req.user?.claims?.sub || 'system';
      await storage.createAuditLog({
        employeeId: adminId,
        employeeUsername: 'admin',
        action: 'delete_account',
        targetUserId: userId,
        targetUsername: targetUser.email || `${targetUser.firstName} ${targetUser.lastName}`,
        details: `Admin permanently deleted account for ${targetUser.email || targetUser.firstName}`,
      });

      console.log(`[Admin Delete] Account deleted for user ${userId} by admin ${adminId}`);
      res.json({ message: 'User account deleted successfully' });
    } catch (error: any) {
      console.error('[Admin Delete] Error:', error.message);
      res.status(500).json({ message: 'Failed to delete user account' });
    }
  });

  // Get audit logs (Employee only)
  app.get('/api/employee/audit-logs', isAdmin, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const auditLogs = await storage.getAuditLogs(limit);
      res.json(auditLogs);
    } catch (error: any) {
      console.error('Get audit logs error:', error);
      res.status(500).json({ message: 'Failed to fetch audit logs' });
    }
  });

  // Get audit logs for specific user (Employee only)
  app.get('/api/employee/users/:id/audit-logs', isAdmin, async (req, res) => {
    try {
      const userId = req.params.id;
      const auditLogs = await storage.getAuditLogsByUser(userId);
      res.json(auditLogs);
    } catch (error: any) {
      console.error('Get user audit logs error:', error);
      res.status(500).json({ message: 'Failed to fetch user audit logs' });
    }
  });

  app.get('/api/admin/notifications', isAdmin, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const notifications = await storage.getAdminNotifications(limit);
      res.json(notifications);
    } catch (error: any) {
      console.error('Get notifications error:', error);
      res.status(500).json({ message: 'Failed to fetch notifications' });
    }
  });

  app.get('/api/admin/notifications/unread-count', isAdmin, async (req, res) => {
    try {
      const count = await storage.getUnreadNotificationCount();
      res.json({ count });
    } catch (error: any) {
      console.error('Get unread count error:', error);
      res.status(500).json({ message: 'Failed to fetch unread count' });
    }
  });

  app.post('/api/admin/notifications/:id/read', isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const notification = await storage.markNotificationRead(id);
      res.json(notification);
    } catch (error: any) {
      console.error('Mark notification read error:', error);
      res.status(500).json({ message: 'Failed to mark notification read' });
    }
  });

  app.post('/api/admin/notifications/read-all', isAdmin, async (req, res) => {
    try {
      await storage.markAllNotificationsRead();
      res.json({ message: 'All notifications marked as read' });
    } catch (error: any) {
      console.error('Mark all read error:', error);
      res.status(500).json({ message: 'Failed to mark all notifications read' });
    }
  });

  // Get audit logs for specific employee (Employee only)
  app.get('/api/employee/employees/:id/audit-logs', isAdmin, async (req, res) => {
    try {
      const employeeId = req.params.id;
      const auditLogs = await storage.getAuditLogsByEmployee(employeeId);
      res.json(auditLogs);
    } catch (error: any) {
      console.error('Get employee audit logs error:', error);
      res.status(500).json({ message: 'Failed to fetch employee audit logs' });
    }
  });

  // Enhanced super admin endpoints for chat history tracking
  app.get('/api/super-admin/all-conversations', isAdmin, async (req, res) => {
    try {
      const userId = (req as any).user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user || !user.canViewAllChats || user.employeeRole !== 'super_admin') {
        return res.status(403).json({ message: 'Insufficient privileges' });
      }

      const allConversations = await storage.getAllConversationsWithMessages();
      res.json({
        total: allConversations.length,
        conversations: allConversations
      });
    } catch (error: any) {
      console.error('Get all conversations error:', error);
      res.status(500).json({ message: 'Failed to fetch conversations' });
    }
  });

  app.get('/api/super-admin/search-conversations', isAdmin, async (req, res) => {
    try {
      const authUserId = (req as any).user.claims.sub;
      const user = await storage.getUser(authUserId);
      if (!user || !user.canViewAllChats || user.employeeRole !== 'super_admin') {
        return res.status(403).json({ message: 'Insufficient privileges' });
      }

      const { search } = req.query;
      if (!search || typeof search !== 'string') {
        return res.status(400).json({ message: 'Search term is required' });
      }

      const searchResults = await storage.searchConversationsByContent(search);
      res.json({
        searchTerm: search,
        total: searchResults.length,
        results: searchResults
      });
    } catch (error: any) {
      console.error('Search conversations error:', error);
      res.status(500).json({ message: 'Failed to search conversations' });
    }
  });

  app.get('/api/super-admin/user/:id/conversations', isAdmin, async (req, res) => {
    try {
      const authUserId = (req as any).user.claims.sub;
      const adminUser = await storage.getUser(authUserId);
      if (!adminUser || !adminUser.canViewAllChats || adminUser.employeeRole !== 'super_admin') {
        return res.status(403).json({ message: 'Insufficient privileges' });
      }

      const targetUserId = req.params.id;
      const userConversations = await storage.getConversationsByUser(targetUserId);
      const targetUser = await storage.getUser(targetUserId);
      
      res.json({
        user: targetUser ? { id: targetUser.id, firstName: targetUser.firstName, email: targetUser.email } : null,
        total: userConversations.length,
        conversations: userConversations
      });
    } catch (error: any) {
      console.error('Get user conversations error:', error);
      res.status(500).json({ message: 'Failed to fetch user conversations' });
    }
  });

  // ============ ADVANCED ADMIN PANEL ENDPOINTS ============

  app.post('/api/admin/modify-subscription', isAdmin, async (req: any, res) => {
    try {
      const adminUserId = req.user.claims.sub;
      const { userId, tier, reason } = req.body;
      if (!userId || !tier) return res.status(400).json({ error: 'User ID and tier required' });
      const validTiers = ['free', 'pro', 'research', 'enterprise'];
      if (!validTiers.includes(tier)) return res.status(400).json({ error: 'Invalid tier' });

      const targetUser = await storage.getUser(userId);
      if (!targetUser) return res.status(404).json({ error: 'User not found' });

      const oldTier = targetUser.subscriptionTier || 'free';

      if (oldTier === 'enterprise' && tier !== 'enterprise') {
        const revokedUsers = await storage.revokeAllEnterpriseCodeAccess(userId);
        await storage.deactivateEnterpriseCode(userId);
        console.log(`[Admin] Revoked enterprise access for ${revokedUsers.length} team members (admin change)`);
      }

      if (tier === 'enterprise') {
        const existingCode = await storage.getEnterpriseCodeByOwner(userId);
        if (!existingCode) {
          const { randomInt } = await import('crypto');
          const code = String(randomInt(100000, 999999));
          await storage.createEnterpriseCode(code, userId, targetUser.email || null);
          console.log(`[Admin] Generated enterprise code ${code} for user ${userId}`);
        } else if (!existingCode.isActive) {
          await storage.reactivateEnterpriseCode(userId);
        }
      }

      const status = tier === 'free' ? 'free' : 'active';
      const user = await storage.adminSetSubscription(userId, tier, status);

      await storage.createAuditLog({
        employeeId: adminUserId,
        employeeUsername: 'admin',
        action: 'modify_subscription',
        targetUserId: userId,
        targetUsername: targetUser.email || userId,
        reason: reason || `Changed from ${oldTier} to ${tier}`,
        details: JSON.stringify({ oldTier, newTier: tier }),
      });

      console.log(`[Admin] Modified subscription for ${userId}: ${oldTier} -> ${tier}`);
      res.json({ success: true, user: { id: user.id, email: user.email, subscriptionTier: user.subscriptionTier, subscriptionStatus: user.subscriptionStatus } });
    } catch (error: any) {
      console.error('[Admin] Modify subscription error:', error.message);
      res.status(500).json({ error: 'Failed to modify subscription' });
    }
  });

  app.post('/api/admin/cancel-user-subscription', isAdmin, async (req: any, res) => {
    try {
      const adminUserId = req.user.claims.sub;
      const { userId, reason } = req.body;
      if (!userId) return res.status(400).json({ error: 'User ID required' });

      const targetUser = await storage.getUser(userId);
      if (!targetUser) return res.status(404).json({ error: 'User not found' });

      if (targetUser.subscriptionTier === 'enterprise') {
        const revokedUsers = await storage.revokeAllEnterpriseCodeAccess(userId);
        await storage.deactivateEnterpriseCode(userId);
        console.log(`[Admin Cancel] Revoked enterprise access for ${revokedUsers.length} team members`);
      }

      if (targetUser.paypalSubscriptionId) {
        try {
          await cancelSubscription(targetUser.paypalSubscriptionId, 'Admin cancelled subscription');
        } catch (e: any) {
          console.error('[Admin Cancel] PayPal cancel error:', e.message);
        }
      }

      await storage.cancelUserSubscription(userId);

      await storage.createAuditLog({
        employeeId: adminUserId,
        employeeUsername: 'admin',
        action: 'cancel_subscription',
        targetUserId: userId,
        targetUsername: targetUser.email || userId,
        reason: reason || 'Admin cancelled subscription',
        details: JSON.stringify({ previousTier: targetUser.subscriptionTier }),
      });

      console.log(`[Admin] Cancelled subscription for ${userId}`);
      res.json({ success: true, message: 'Subscription cancelled' });
    } catch (error: any) {
      console.error('[Admin] Cancel subscription error:', error.message);
      res.status(500).json({ error: 'Failed to cancel subscription' });
    }
  });

  app.post('/api/admin/grant-complimentary', isAdmin, async (req: any, res) => {
    try {
      const adminUserId = req.user.claims.sub;
      const { userId, tier, reason, durationMonths } = req.body;
      if (!userId || !tier) return res.status(400).json({ error: 'User ID and tier required' });
      const validTiers = ['pro', 'research', 'enterprise'];
      if (!validTiers.includes(tier)) return res.status(400).json({ error: 'Invalid tier. Must be pro, research, or enterprise.' });
      const validDurations = [1, 2, 3, 4, 0];
      const duration = durationMonths !== undefined ? Number(durationMonths) : 0;
      if (!validDurations.includes(duration)) return res.status(400).json({ error: 'Invalid duration. Must be 1, 2, 3, 4, or 0 (forever).' });

      const targetUser = await storage.getUser(userId);
      if (!targetUser) return res.status(404).json({ error: 'User not found' });

      if (tier === 'enterprise') {
        const existingCode = await storage.getEnterpriseCodeByOwner(userId);
        if (!existingCode) {
          const { randomInt } = await import('crypto');
          const code = String(randomInt(100000, 999999));
          await storage.createEnterpriseCode(code, userId, targetUser.email || null);
        } else if (!existingCode.isActive) {
          await storage.reactivateEnterpriseCode(userId);
        }
      }

      let expiresAt: Date | null = null;
      if (duration > 0) {
        expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + duration);
      }

      await storage.adminSetSubscription(userId, tier, 'active');
      await storage.setComplimentaryExpiration(userId, expiresAt);

      const durationLabel = duration === 0 ? 'forever' : `${duration} month${duration > 1 ? 's' : ''}`;

      await storage.createAuditLog({
        employeeId: adminUserId,
        employeeUsername: 'admin',
        action: 'grant_complimentary',
        targetUserId: userId,
        targetUsername: targetUser.email || userId,
        reason: reason || `Complimentary ${tier} access granted (${durationLabel})`,
        details: JSON.stringify({ tier, complimentary: true, duration: durationLabel, expiresAt: expiresAt?.toISOString() || 'never' }),
      });

      console.log(`[Admin] Granted complimentary ${tier} to ${userId} for ${durationLabel}`);
      res.json({ success: true, message: `Complimentary ${tier} access granted for ${durationLabel}` });
    } catch (error: any) {
      console.error('[Admin] Grant complimentary error:', error.message);
      res.status(500).json({ error: 'Failed to grant complimentary access' });
    }
  });

  const systemHealthState = {
    startTime: Date.now(),
    lastErrors: [] as Array<{ time: number; message: string; source: string }>,
    outageDetected: false,
    lastHealthCheck: Date.now(),
    lastOutageNotification: 0,
  };

  app.get('/api/admin/system-health', isAdmin, async (req: any, res) => {
    try {
      const cached = getCached('system-health');
      if (cached) return res.json(cached);

      const uptime = Math.floor((Date.now() - systemHealthState.startTime) / 1000);
      const userCount = await storage.getUserCount();
      const subscriptionStats = await storage.getActiveSubscriptionCount();

      let dbStatus = 'healthy';
      try {
        await storage.getUserCount();
      } catch {
        dbStatus = 'error';
      }

      let paypalStatus = 'healthy';
      try {
        if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
          paypalStatus = 'error';
        } else {
          const plans = await ensureSubscriptionPlans();
          paypalStatus = plans.pro && plans.research && plans.enterprise ? 'healthy' : 'degraded';
        }
      } catch {
        paypalStatus = 'degraded';
      }

      let aiStatus = 'healthy';
      try {
        if (!process.env.GEMINI_API_KEY) {
          aiStatus = 'error';
        }
      } catch {
        aiStatus = 'error';
      }

      const overallStatus = [dbStatus, paypalStatus, aiStatus].includes('error') ? 'critical' :
        [dbStatus, paypalStatus, aiStatus].includes('degraded') ? 'degraded' : 'healthy';

      const oneHour = 60 * 60 * 1000;
      if (overallStatus === 'critical' && !systemHealthState.outageDetected && (Date.now() - systemHealthState.lastOutageNotification > oneHour)) {
        systemHealthState.outageDetected = true;
        systemHealthState.lastOutageNotification = Date.now();
        const failedServices = [];
        if (dbStatus !== 'healthy') failedServices.push('Database');
        if (paypalStatus !== 'healthy') failedServices.push('PayPal');
        if (aiStatus !== 'healthy') failedServices.push('AI Service');

        await storage.createAdminNotification({
          type: 'system_outage',
          userId: 'system',
          userEmail: 'system@turboanswer.it.com',
          userFirstName: 'System',
          userLastName: 'Alert',
          flaggedContent: `System outage detected: ${failedServices.join(', ')} ${failedServices.length > 1 ? 'are' : 'is'} experiencing issues.`,
          conversationId: null,
          actionTaken: `Automatic health check detected service degradation. Status - DB: ${dbStatus}, PayPal: ${paypalStatus}, AI: ${aiStatus}`,
        });
      } else if (overallStatus === 'healthy') {
        systemHealthState.outageDetected = false;
      }

      systemHealthState.lastHealthCheck = Date.now();

      const healthResponse = {
        status: overallStatus,
        uptime,
        uptimeFormatted: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${uptime % 60}s`,
        totalUsers: userCount,
        subscriptions: subscriptionStats,
        services: {
          database: dbStatus,
          paypal: paypalStatus,
          ai: aiStatus,
        },
        recentErrors: systemHealthState.lastErrors.slice(-10),
        lastHealthCheck: new Date(systemHealthState.lastHealthCheck).toISOString(),
        memory: {
          heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
        },
      };
      setCache('system-health', healthResponse);
      res.json(healthResponse);
    } catch (error: any) {
      console.error('[Admin] System health error:', error.message);
      res.status(500).json({ error: 'Failed to get system health' });
    }
  });

  app.post('/api/admin/run-diagnostics', isAdmin, async (req: any, res) => {
    try {
      const results: Array<{ check: string; status: string; details: string; fixed?: boolean }> = [];

      try {
        const count = await storage.getUserCount();
        results.push({ check: 'Database Connection', status: 'pass', details: `Connected, ${count} users found` });
      } catch (e: any) {
        console.error('[Diagnostics] DB check failed:', e.message);
        results.push({ check: 'Database Connection', status: 'fail', details: 'Database connection failed' });
      }

      try {
        const plans = await ensureSubscriptionPlans();
        results.push({ check: 'PayPal Plans', status: 'pass', details: 'Plans configured' });
      } catch (e: any) {
        console.error('[Diagnostics] PayPal check failed:', e.message);
        results.push({ check: 'PayPal Plans', status: 'fail', details: 'PayPal plans check failed' });
      }

      try {
        if (!process.env.GEMINI_API_KEY) throw new Error('Not configured');
        results.push({ check: 'AI API Key', status: 'pass', details: 'Configured' });
      } catch (e: any) {
        results.push({ check: 'AI API Key', status: 'fail', details: 'Not configured' });
      }

      try {
        const allUsers = await storage.getAllUsers();
        const orphanedEnterprise = allUsers.filter(u => u.subscriptionTier === 'enterprise' && u.subscriptionStatus !== 'active');
        if (orphanedEnterprise.length > 0) {
          for (const u of orphanedEnterprise) {
            await storage.adminSetSubscription(u.id, 'free', 'free');
            console.log(`[Diagnostics] Fixed orphaned enterprise user ${u.id}`);
          }
          results.push({ check: 'Orphaned Enterprise Users', status: 'fixed', details: `Fixed ${orphanedEnterprise.length} orphaned enterprise subscriptions`, fixed: true });
        } else {
          results.push({ check: 'Orphaned Enterprise Users', status: 'pass', details: 'No orphaned enterprise subscriptions found' });
        }
      } catch (e: any) {
        console.error('[Diagnostics] Enterprise check failed:', e.message);
        results.push({ check: 'Orphaned Enterprise Users', status: 'fail', details: 'Check failed' });
      }

      try {
        const allUsers = await storage.getAllUsers();
        const stuckUsers = allUsers.filter(u => u.subscriptionStatus === 'active' && u.subscriptionTier === 'free');
        if (stuckUsers.length > 0) {
          for (const u of stuckUsers) {
            await storage.adminSetSubscription(u.id, 'free', 'free');
          }
          results.push({ check: 'Stuck Subscriptions', status: 'fixed', details: `Fixed ${stuckUsers.length} users with inconsistent subscription state`, fixed: true });
        } else {
          results.push({ check: 'Stuck Subscriptions', status: 'pass', details: 'No inconsistent subscription states found' });
        }
      } catch (e: any) {
        console.error('[Diagnostics] Stuck subs check failed:', e.message);
        results.push({ check: 'Stuck Subscriptions', status: 'fail', details: 'Check failed' });
      }

      try {
        const memUsage = process.memoryUsage();
        const heapPercent = Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100);
        results.push({ check: 'Memory Usage', status: heapPercent > 90 ? 'warn' : 'pass', details: `Heap: ${heapPercent}% used` });
      } catch (e: any) {
        results.push({ check: 'Memory Usage', status: 'fail', details: 'Check failed' });
      }

      const adminUserId = req.user.claims.sub;
      await storage.createAuditLog({
        employeeId: adminUserId,
        employeeUsername: 'admin',
        action: 'run_diagnostics',
        targetUserId: 'system',
        targetUsername: 'system',
        reason: 'Manual diagnostics run',
        details: JSON.stringify({ results: results.map(r => `${r.check}: ${r.status}`) }),
      });

      res.json({ results, timestamp: new Date().toISOString() });
    } catch (error: any) {
      console.error('[Admin] Diagnostics error:', error.message);
      res.status(500).json({ error: 'Failed to run diagnostics' });
    }
  });

  app.get('/api/admin/proactive-diagnostics', isAdmin, async (req: any, res) => {
    try {
      const latest = getLatestReport();
      const history = getDiagnosticsHistory();
      res.json({ latest, history, historyCount: history.length });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to get diagnostics history' });
    }
  });

  app.post('/api/admin/proactive-diagnostics/run', isAdmin, async (req: any, res) => {
    try {
      const report = await runProactiveDiagnostics();
      res.json(report);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to run proactive diagnostics' });
    }
  });

  app.get('/api/admin/activity', isAdmin, (req: any, res) => {
    res.json([...activityLog].reverse().slice(0, 150));
  });

  app.get('/api/admin/error-log', isAdmin, async (req: any, res) => {
    try {
      const errors = getErrorLog();
      const stats = getErrorStats();
      res.json({ errors, stats });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to get error log' });
    }
  });

  app.post('/api/admin/error-log/:id/resolve', isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { autoFixResult } = req.body;
      resolveError(id, autoFixResult || 'Manually resolved by admin');
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to resolve error' });
    }
  });

  app.delete('/api/admin/error-log/resolved', isAdmin, async (req: any, res) => {
    try {
      const cleared = clearResolvedErrors();
      res.json({ success: true, cleared });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to clear resolved errors' });
    }
  });

  app.get('/api/admin/stats', isAdmin, async (req: any, res) => {
    try {
      const cached = getCached('admin-stats');
      if (cached) return res.json(cached);

      const userCount = await storage.getUserCount();
      const subscriptionStats = await storage.getActiveSubscriptionCount();
      const allUsers = await storage.getAllUsers();
      const bannedCount = allUsers.filter(u => u.isBanned).length;
      const suspendedCount = allUsers.filter(u => u.isSuspended).length;
      const flaggedCount = allUsers.filter(u => u.isFlagged).length;
      const revenue = (subscriptionStats.pro * 6.99) + (subscriptionStats.research * 15) + (subscriptionStats.enterprise * 50);

      const statsResponse = {
        totalUsers: userCount,
        subscriptions: subscriptionStats,
        moderation: { banned: bannedCount, suspended: suspendedCount, flagged: flaggedCount },
        estimatedMonthlyRevenue: revenue.toFixed(2),
      };
      setCache('admin-stats', statsResponse);
      res.json(statsResponse);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to get stats' });
    }
  });

  // File upload and document analysis
  app.post("/api/analyze-document", isAuthenticated, upload.single('document'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const { originalname, mimetype, size, buffer } = req.file;
      const { analysisType = 'general', conversationId } = req.body;

      const validation = validateFile(size, mimetype);
      if (!validation.valid) {
        return res.status(400).json({ message: validation.error });
      }

      const fileContent = await extractTextFromFile(buffer, mimetype, originalname);
      
      let conversationHistory: Array<{role: string, content: string}> = [];
      if (conversationId) {
        const messages = await storage.getMessagesByConversation(parseInt(conversationId));
        conversationHistory = messages.slice(-3).map(msg => ({
          role: msg.role,
          content: msg.content
        }));
      }

      const analysisResult = await analyzeDocument(
        fileContent, 
        originalname, 
        analysisType,
        conversationHistory,
        buffer,
        mimetype
      );

      const preview = fileContent === '__BINARY_FILE__'
        ? `[Binary file: ${originalname}]`
        : fileContent.substring(0, 200) + (fileContent.length > 200 ? '...' : '');

      res.json({
        filename: originalname,
        fileType: (SUPPORTED_FILE_TYPES as Record<string, string>)[mimetype],
        fileSize: size,
        analysisType,
        analysis: analysisResult,
        contentPreview: preview
      });

    } catch (error: any) {
      console.error("Document analysis error:", error);
      res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  // Get available analysis options
  app.get("/api/analysis-options", async (req, res) => {
    try {
      const options = getAnalysisOptions();
      res.json(options);
    } catch (error: any) {
      res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  // Get supported file types
  app.get("/api/supported-file-types", async (req, res) => {
    try {
      res.json({
        mimeTypes: Object.keys(SUPPORTED_FILE_TYPES),
        extensions: Object.values(SUPPORTED_FILE_TYPES),
        maxSize: "10MB"
      });
    } catch (error: any) {
      res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  // Weather and location endpoints
  app.get("/api/weather/:location", async (req, res) => {
    try {
      const { getWeatherData, formatWeatherReport } = await import("./services/weather-location");
      const location = decodeURIComponent(req.params.location);
      const weatherData = await getWeatherData(location);
      const report = formatWeatherReport(weatherData);
      res.json({ weather: weatherData, report });
    } catch (error: any) {
      res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  app.get("/api/location/:location", async (req, res) => {
    try {
      const { getLocationInfo, getWorldTimeInfo, formatLocationReport } = await import("./services/weather-location");
      const location = decodeURIComponent(req.params.location);
      const [locationInfo, timeInfo] = await Promise.allSettled([
        getLocationInfo(location),
        getWorldTimeInfo(location)
      ]);
      
      if (locationInfo.status === 'fulfilled') {
        const timeData = timeInfo.status === 'fulfilled' ? timeInfo.value : null;
        const report = formatLocationReport(locationInfo.value, timeData);
        res.json({ location: locationInfo.value, time: timeData, report });
      } else {
        throw new Error(locationInfo.reason?.message || 'Location not found');
      }
    } catch (error: any) {
      res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });


  // ── Veo Video Generation ─────────────────────────────────────────────────
  app.post('/api/video/generate', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const user   = await storage.getUser(userId);
      const tier   = user?.subscriptionTier || 'free';
      if (!['research', 'enterprise'].includes(tier)) {
        return res.status(403).json({ error: 'Video generation requires a Research or Enterprise subscription.' });
      }

      const { prompt, aspectRatio = '16:9', durationSeconds = 5 } = req.body;
      if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 5) {
        return res.status(400).json({ error: 'A descriptive prompt is required.' });
      }

      const { startVeoGeneration } = await import('./services/veo-video-generation');
      const result = await startVeoGeneration({
        prompt: prompt.trim(),
        aspectRatio: ['16:9', '9:16'].includes(aspectRatio) ? aspectRatio : '16:9',
        durationSeconds: [5, 8].includes(durationSeconds) ? durationSeconds : 5,
      });

      // Veo 3.1 always generates audio from the prompt — no separate flag needed
      res.json({ jobId: result.jobId, model: result.model, hasAudio: true });
    } catch (e: any) {
      console.error('[Veo] start error:', e.message);
      res.status(502).json({ error: e.message });
    }
  });

  app.get('/api/video/status/:jobId', isAuthenticated, async (req: any, res) => {
    try {
      const { pollVeoStatus } = await import('./services/veo-video-generation');
      const result = await pollVeoStatus(req.params.jobId);
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ status: 'failed', error: e.message });
    }
  });

  // Stream a completed video file by its file ID
  app.get('/api/video/file/:fileId', isAuthenticated, async (req: any, res) => {
    try {
      const { videoFiles } = await import('./services/veo-video-generation');
      const file = videoFiles.get(req.params.fileId);
      if (!file) return res.status(404).json({ error: 'Video not found or expired' });
      res.setHeader('Content-Type', 'video/mp4');
      res.setHeader('Content-Length', file.buffer.length);
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Cache-Control', 'private, max-age=7200');
      res.end(file.buffer);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Alternative video generation endpoint (legacy stub)
  app.post("/api/generate-video", isAuthenticated, async (req: any, res) => {
    try {
      const { prompt, duration = 5, resolution = "1080p", style = "realistic" } = req.body;
      
      if (!prompt) {
        return res.status(400).json({ error: "Video prompt is required" });
      }

      const { alternativeVideoGeneration } = await import("./services/alternative-video-generation");
      
      const result = await alternativeVideoGeneration.generateVideo({
        prompt,
        duration,
        resolution,
        style
      });

      if (result.success) {
        res.json({
          success: true,
          videoUrl: result.videoUrl,
          thumbnailUrl: result.thumbnailUrl,
          duration: result.duration,
          originalPrompt: prompt,
          provider: result.provider
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
          provider: result.provider
        });
      }
    } catch (error: any) {
      console.error("Alternative video generation API error:", error);
      res.status(500).json({
        success: false,
        error: "Video generation failed: " + error.message
      });
    }
  });

  const httpServer = createServer(app);
  // Widget API endpoints for business integration
  app.post('/api/widget/conversation', async (req, res) => {
    try {
      const { domain, userAgent } = req.body;
      
      const conversation = await storage.createConversation({
        title: `Widget Chat - ${domain}`
      });
      
      res.json({ 
        conversationId: conversation.id,
        status: 'success'
      });
    } catch (error: any) {
      res.status(500).json({ 
        error: 'Failed to create conversation',
        message: error.message 
      });
    }
  });

  app.post('/api/widget/message', async (req, res) => {
    try {
      const { message, conversationId, domain } = req.body;
      
      if (!message || !conversationId) {
        return res.status(400).json({ error: 'Message and conversationId required' });
      }
      
      await storage.createMessage({
        conversationId,
        content: message,
        role: 'user'
      });
      
      const businessPrompt = `You are a helpful business AI assistant embedded in a website widget. 
      The user is visiting: ${domain}
      
      Provide helpful, professional, and concise responses. Be friendly but business-appropriate.
      If asked about products/services, be helpful but suggest contacting the business directly for specific details.
      
      User message: ${message}`;
      
      const aiRaw = await generateAIResponse(businessPrompt, [], 'free', 'gemini-pro');
      const aiResponse = typeof aiRaw === 'object' ? aiRaw.text : aiRaw;
      
      await storage.createMessage({
        conversationId,
        content: aiResponse,
        role: 'assistant'
      });
      
      res.json({ 
        response: aiResponse,
        conversationId,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({ 
        error: 'Failed to process message',
        message: error.message 
      });
    }
  });

  // === CRISIS SUPPORT BOT (Encrypted, Private, No Content Moderation) ===

  app.post("/api/crisis/conversations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const conv = await storage.createCrisisConversation(userId);
      res.json(conv);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to create crisis conversation" });
    }
  });

  app.get("/api/crisis/conversations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const convs = await storage.getCrisisConversationsByUser(userId);
      res.json(convs);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to get crisis conversations" });
    }
  });

  app.get("/api/crisis/conversations/:id/messages", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const conversationId = parseInt(req.params.id);
      const conv = await storage.getCrisisConversation(conversationId, userId);
      if (!conv) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      const encryptedMessages = await storage.getCrisisMessagesByConversation(conversationId);
      const { decrypt } = await import("./services/encryption");
      const decryptedMessages = encryptedMessages.map(msg => ({
        id: msg.id,
        conversationId: msg.conversationId,
        content: decrypt(msg.encryptedContent),
        role: msg.role,
        timestamp: msg.timestamp,
      }));
      res.json(decryptedMessages);
    } catch (error: any) {
      console.error("[Crisis] Failed to get messages:", error.message);
      res.status(500).json({ message: "Failed to get messages" });
    }
  });

  app.post("/api/crisis/conversations/:id/messages", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const conversationId = parseInt(req.params.id);
      const { content } = req.body;

      if (!content || typeof content !== 'string') {
        return res.status(400).json({ message: "Message content is required" });
      }

      const conv = await storage.getCrisisConversation(conversationId, userId);
      if (!conv) {
        return res.status(404).json({ message: "Conversation not found" });
      }

      const { encrypt, decrypt } = await import("./services/encryption");
      const { generateCrisisResponse } = await import("./services/crisis-ai");

      const encryptedUserContent = encrypt(content);
      await storage.createCrisisMessage({
        conversationId,
        encryptedContent: encryptedUserContent,
        role: "user",
      });

      const encryptedMessages = await storage.getCrisisMessagesByConversation(conversationId);
      const history = encryptedMessages.slice(-10).map(msg => ({
        role: msg.role,
        content: decrypt(msg.encryptedContent),
      }));

      const savedLanguage = req.body.language || "en";
      const aiResponse = await generateCrisisResponse(content, history.slice(0, -1), savedLanguage);

      const encryptedAiContent = encrypt(aiResponse);
      await storage.createCrisisMessage({
        conversationId,
        encryptedContent: encryptedAiContent,
        role: "assistant",
      });

      res.json({
        userMessage: { content, role: "user" },
        aiMessage: { content: aiResponse, role: "assistant" },
      });
    } catch (error: any) {
      console.error("[Crisis] Message error:", error.message);
      res.status(500).json({ message: "Something went wrong. If you need immediate help, please call 988." });
    }
  });

  app.delete("/api/crisis/conversations/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const conversationId = parseInt(req.params.id);
      await storage.deleteCrisisConversation(conversationId, userId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to delete conversation" });
    }
  });

  app.delete("/api/crisis/all-data", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.deleteAllCrisisData(userId);
      res.json({ success: true, message: "All crisis support data has been permanently deleted" });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to delete crisis data" });
    }
  });

  app.post('/api/admin/send-email', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { recipientEmail, recipientName, templateType } = req.body;
      if (!recipientEmail || !recipientName || !templateType) {
        return res.status(400).json({ error: 'Recipient email, name, and template type are required' });
      }

      const brevoApiKey = process.env.BREVO_API_KEY;
      if (!brevoApiKey) {
        return res.status(500).json({ error: 'Brevo API key not configured' });
      }

      const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      const appUrl = 'https://turbo-answer.replit.app';

      const templates: Record<string, { subject: string; statusText: string; bodyText: string }> = {
        'account-banned': {
          subject: 'Your TurboAnswer account update',
          statusText: 'Account Banned',
          bodyText: `Dear ${recipientName},

We regret to inform you that your TurboAnswer account has been banned effective ${currentDate}.

This action was taken due to a violation of our community guidelines or terms of service. As a result:

- Your account access has been revoked
- You will not be able to log in or use TurboAnswer services
- Any active subscriptions have been paused

If you believe this was done in error, you may appeal by contacting our appeals team at appeals@turboanswer.it.com. Please include your account email and a detailed explanation in your appeal.`,
        },
        'account-unbanned': {
          subject: 'Your TurboAnswer account has been restored',
          statusText: 'Account Restored',
          bodyText: `Dear ${recipientName},

Your TurboAnswer account has been unbanned and fully restored as of ${currentDate}.

Your access to all TurboAnswer services has been fully restored. You may now:

- Log in and use TurboAnswer normally
- Access all AI features available to your subscription tier
- Engage with the community and all platform features

We kindly ask that you continue to adhere to our community guidelines and terms of service.

You can log in at: ${appUrl}/login`,
        },
        'account-suspended': {
          subject: 'Your TurboAnswer account is under review',
          statusText: 'Account Under Review',
          bodyText: `Dear ${recipientName},

Your TurboAnswer account has been temporarily suspended and is currently under review as of ${currentDate}.

During this review period:

- Your account access is temporarily restricted
- Your data and conversations remain safe and intact
- Any active subscriptions are paused until the review is complete

Our team is reviewing your account activity. You will receive a follow-up email once the review is complete. This process typically takes 1-3 business days.

If you have additional information that may assist in the review, please contact our appeals team at appeals@turboanswer.it.com.`,
        },
        'account-recovered': {
          subject: 'Your TurboAnswer account has been recovered',
          statusText: 'Account Recovered',
          bodyText: `Dear ${recipientName},

Your TurboAnswer account has been successfully recovered as of ${currentDate}.

Your account is now fully accessible:

- All your data, conversations, and settings have been restored
- Your subscription status remains unchanged
- We recommend updating your password for security

For your security, if you did not request this recovery, please contact our appeals team immediately at appeals@turboanswer.it.com.

You can log in at: ${appUrl}/login`,
        },
        'account-deleted': {
          subject: 'Your TurboAnswer account has been deleted',
          statusText: 'Account Deleted',
          bodyText: `Dear ${recipientName},

This email confirms that your TurboAnswer account has been permanently deleted as of ${currentDate}.

The following actions have been completed:

- All account data has been permanently removed from our systems
- All conversation history has been deleted
- Any active subscriptions have been cancelled
- This action is irreversible and cannot be undone

If you wish to use TurboAnswer again in the future, you are welcome to create a new account at any time.

Thank you for being a part of the TurboAnswer community.`,
        },
        'blacklist-added': {
          subject: 'Your TurboAnswer account update',
          statusText: 'Added to Blacklist',
          bodyText: `Dear ${recipientName},

We are writing to inform you that your account has been added to the TurboAnswer blacklist effective ${currentDate}.

The following restrictions are now in effect:

- Your account has been permanently blocked from accessing TurboAnswer
- You will not be able to create new accounts using the same credentials
- Any active subscriptions have been cancelled and refunded where applicable
- All associated data will be retained for security purposes

This action was taken due to severe or repeated violations of our terms of service.

If you believe this decision was made in error, you may submit an appeal by contacting appeals@turboanswer.it.com. Please include your account email and a detailed explanation.`,
        },
        'blacklist-removed': {
          subject: 'Your TurboAnswer account has been restored',
          statusText: 'Removed from Blacklist',
          bodyText: `Dear ${recipientName},

We are pleased to inform you that your account has been removed from the TurboAnswer blacklist as of ${currentDate}.

Your access has been fully restored:

- Your account is now fully active and accessible
- You may log in and use all TurboAnswer services
- You are welcome to subscribe to any of our plans
- All platform features are available to you

We kindly ask that you continue to adhere to our community guidelines and terms of service.

You can log in at: ${appUrl}/login`,
        },
      };

      const template = templates[templateType];
      if (!template) {
        return res.status(400).json({ error: `Unknown template type: ${templateType}. Valid types: ${Object.keys(templates).join(', ')}` });
      }

      const useHtml = req.body.useHtml !== false;

      const fullPlainText = `${template.bodyText}

--
TurboAnswer Support
Email: support@turboanswer.it.com
Phone: (866) 467-7269
Hours: Mon-Fri, 9:30 AM - 6:00 PM EST

To stop receiving these emails, reply with "Unsubscribe" in the subject line.`;

      const minimalHtml = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#ffffff;max-width:600px;margin:0 auto;padding:0;background-color:#000000;">
<div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:32px;text-align:center;border-radius:12px 12px 0 0;">
  <h1 style="color:#fff;margin:0;font-size:22px;">${template.statusText}</h1>
</div>
<div style="background-color:#000000;padding:28px 32px;border:1px solid #333;border-top:none;border-radius:0 0 12px 12px;">
${template.bodyText.split('\n').map(line => {
        if (line.startsWith('- ')) return `<p style="margin:4px 0 4px 20px;color:#e2e2e2;">${line}</p>`;
        if (line.trim() === '') return '<br>';
        return `<p style="margin:0 0 10px;color:#ffffff;">${line}</p>`;
      }).join('\n')}
<hr style="border:none;border-top:1px solid #333;margin:24px 0;">
<p style="font-size:13px;color:#999;margin:0;">TurboAnswer Support</p>
<p style="font-size:13px;color:#999;margin:2px 0;">Email: support@turboanswer.it.com</p>
<p style="font-size:13px;color:#999;margin:2px 0;">Phone: (866) 467-7269</p>
<p style="font-size:13px;color:#999;margin:2px 0;">Hours: Mon-Fri, 9:30 AM - 6:00 PM EST</p>
</div>
</body>
</html>`;

      const brevoPayload: any = {
        sender: { name: 'TurboAnswer', email: 'support@turboanswer.it.com' },
        to: [{ email: recipientEmail, name: recipientName }],
        subject: template.subject,
        textContent: fullPlainText,
        headers: {
          'X-Mailer': 'TurboAnswer Notifications',
          'List-Unsubscribe': '<mailto:support@turboanswer.it.com?subject=Unsubscribe>',
        },
      };

      if (useHtml) {
        brevoPayload.htmlContent = minimalHtml;
      }

      const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': brevoApiKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify(brevoPayload),
      });

      const brevoResult = await brevoResponse.json();

      if (!brevoResponse.ok) {
        console.error('Brevo email error:', brevoResult);
        return res.status(500).json({ error: brevoResult.message || 'Failed to send email via Brevo' });
      }

      res.json({ success: true, message: `${template.statusText} email sent to ${recipientEmail}`, emailId: brevoResult.messageId });
    } catch (error: any) {
      console.error('Email send error:', error);
      res.status(500).json({ error: 'Failed to send email' });
    }
  });

  // Serve widget files
  app.get('/widget/turbo-widget.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.sendFile(path.join(__dirname, '../widget/turbo-widget.js'));
  });

  app.get('/widget/integration-guide', (req, res) => {
    res.sendFile(path.join(__dirname, '../widget/integration-guide.html'));
  });



  // --- Admin Promote/Revoke Route ---
  app.post('/api/admin/users/:id/set-admin', isAdmin, async (req: any, res) => {
    try {
      const targetId = req.params.id;
      const { grant } = req.body;
      const requesterId = req.user?.claims?.sub;

      if (targetId === requesterId) {
        return res.status(400).json({ error: "You cannot change your own admin status." });
      }

      const { authStorage } = await import('./replit_integrations/auth/storage');
      const targetUser = await authStorage.getUser(targetId);
      if (!targetUser) return res.status(404).json({ error: 'User not found' });

      await authStorage.upsertUser({
        ...targetUser,
        isEmployee: !!grant,
        employeeRole: grant ? 'super_admin' : 'basic',
        canViewAllChats: !!grant,
        canBanUsers: !!grant,
      });

      res.json({ success: true, isEmployee: !!grant });
    } catch (err: any) {
      console.error('Set admin error:', err);
      res.status(500).json({ error: 'Failed to update admin status' });
    }
  });

  // --- Beta Testing Routes ---

  // Submit beta application (public)
  app.post('/api/beta/apply', async (req: any, res) => {
    try {
      const { name, email, answers } = req.body;
      if (!name || !email || !answers) return res.status(400).json({ error: 'Missing required fields' });

      const { db } = await import('./db');
      const { eq } = await import('drizzle-orm');

      // Check duplicate
      const existing = await db.select().from(betaApplications).where(eq(betaApplications.email, email)).limit(1);
      if (existing.length > 0) return res.status(409).json({ error: 'An application with this email already exists.' });

      const userId = req.user?.claims?.sub || null;
      const [app] = await db.insert(betaApplications).values({ name, email, answers, userId, status: 'pending' }).returning();

      res.json({ success: true, id: app.id });
    } catch (err: any) {
      console.error('Beta apply error:', err);
      res.status(500).json({ error: 'Failed to submit application' });
    }
  });

  // Get all beta applications (admin)
  app.get('/api/admin/beta/applications', isAdmin, async (_req, res) => {
    try {
      const { db } = await import('./db');
      const apps = await db.select().from(betaApplications).orderBy(betaApplications.appliedAt);
      res.json(apps.reverse());
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch applications' });
    }
  });

  // Approve beta application (admin)
  app.post('/api/admin/beta/applications/:id/approve', isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { db } = await import('./db');
      const { eq } = await import('drizzle-orm');
      const { authStorage } = await import('./replit_integrations/auth/storage');

      const [app] = await db.select().from(betaApplications).where(eq(betaApplications.id, parseInt(id))).limit(1);
      if (!app) return res.status(404).json({ error: 'Application not found' });

      await db.update(betaApplications).set({ status: 'approved', reviewedAt: new Date() }).where(eq(betaApplications.id, parseInt(id)));

      // Grant beta tester status if user has account
      let updatedUser = false;
      if (app.userId) {
        const user = await authStorage.getUser(app.userId);
        if (user) { await authStorage.upsertUser({ ...user, isBetaTester: true }); updatedUser = true; }
      }
      if (!updatedUser) {
        // Find user by email (try exact, then lowercase)
        const user = await authStorage.getUserByEmail(app.email) || await authStorage.getUserByEmail(app.email.toLowerCase());
        if (user) await authStorage.upsertUser({ ...user, isBetaTester: true });
      }

      // Send approval email
      await sendBrevoEmail(
        app.email, app.name,
        'Congratulations! You\'ve been approved for TurboAnswer Beta Testing',
        `Hi ${app.name},\n\nCongratulations! We're thrilled to let you know that your application to join the TurboAnswer Beta Testing Program has been approved.\n\nTo get started, please create your TurboAnswer account using this exact email address: ${app.email}\n\nVisit https://turbo-answer.replit.app/register and sign up with the email above. Your account will automatically have beta tester access as soon as you register — no extra steps needed.\n\nOnce you're logged in, look for the green flask icon in the chat header to submit your feedback directly to our team.\n\nAs a beta tester, your feedback is invaluable. Don't hesitate to share detailed notes, bug reports, or feature suggestions — we read every one.\n\nThank you for your enthusiasm. We're excited to have you on board!\n\nBest regards,\nThe TurboAnswer Team`
      );

      res.json({ success: true });
    } catch (err: any) {
      console.error('Beta approve error:', err);
      res.status(500).json({ error: 'Failed to approve application' });
    }
  });

  // Deny beta application (admin)
  app.post('/api/admin/beta/applications/:id/deny', isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const { db } = await import('./db');
      const { eq } = await import('drizzle-orm');

      const [app] = await db.select().from(betaApplications).where(eq(betaApplications.id, parseInt(id))).limit(1);
      if (!app) return res.status(404).json({ error: 'Application not found' });

      await db.update(betaApplications).set({ status: 'denied', denialReason: reason || '', reviewedAt: new Date() }).where(eq(betaApplications.id, parseInt(id)));

      // Send denial email
      await sendBrevoEmail(
        app.email, app.name,
        'TurboAnswer Beta Testing Application Update',
        `Hi ${app.name},\n\nThank you for taking the time to apply to the TurboAnswer Beta Testing Program. After careful review, we regret to inform you that your application has not been selected at this time.\n\n${reason ? `Reason: ${reason}\n\n` : ''}Please know that this decision is not a reflection of your qualifications or interest. We receive many applications and are only able to onboard a limited number of testers at each phase.\n\nWe encourage you to keep using TurboAnswer and you are always welcome to apply again in the future.\n\nThank you for your understanding and continued support.\n\nBest regards,\nThe TurboAnswer Team`
      );

      res.json({ success: true });
    } catch (err: any) {
      console.error('Beta deny error:', err);
      res.status(500).json({ error: 'Failed to deny application' });
    }
  });

  // Send custom beta email (admin)
  app.post('/api/admin/beta/send-email', isAdmin, async (req: any, res) => {
    try {
      const { email, name, subject, body } = req.body;
      if (!email || !subject || !body) return res.status(400).json({ error: 'Missing fields' });
      await sendBrevoEmail(email, name || email, subject, body);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to send email' });
    }
  });

  // Submit beta feedback (beta testers only)
  app.post('/api/beta/feedback', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { authStorage } = await import('./replit_integrations/auth/storage');
      const user = await authStorage.getUser(userId);
      if (!user?.isBetaTester) return res.status(403).json({ error: 'Beta tester access required' });

      const { message, category } = req.body;
      if (!message) return res.status(400).json({ error: 'Message is required' });

      const { db } = await import('./db');
      await db.insert(betaFeedback).values({
        userId,
        userName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        userEmail: user.email || '',
        message,
        category: category || 'general',
      });

      res.json({ success: true });
    } catch (err: any) {
      console.error('Beta feedback error:', err);
      res.status(500).json({ error: 'Failed to submit feedback' });
    }
  });

  // Get all beta feedback (admin)
  app.get('/api/admin/beta/feedback', isAdmin, async (_req, res) => {
    try {
      const { db } = await import('./db');
      const feedback = await db.select().from(betaFeedback).orderBy(betaFeedback.submittedAt);
      res.json(feedback.reverse());
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch feedback' });
    }
  });

  // --- Admin Invite Token Routes ---
  app.post('/api/admin/invite-tokens', isAdmin, async (req: any, res) => {
    try {
      const { label, maxUses, expiresInDays } = req.body;
      const userId = req.user?.claims?.sub;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { authStorage } = await import('./replit_integrations/auth/storage');
      const adminUser = await authStorage.getUser(userId);

      const crypto = await import('crypto');
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = expiresInDays ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000) : null;

      const { db } = await import('./db');
      const [created] = await db.insert(adminInviteTokens).values({
        token,
        label: label || 'Admin Invite',
        createdBy: userId,
        createdByEmail: adminUser?.email || undefined,
        maxUses: maxUses || 1,
        currentUses: 0,
        isRevoked: false,
        ...(expiresAt ? { expiresAt } : {}),
      }).returning();

      res.json(created);
    } catch (err: any) {
      console.error('Create invite token error:', err);
      res.status(500).json({ error: 'Failed to create invite token' });
    }
  });

  app.get('/api/admin/invite-tokens', isAdmin, async (req: any, res) => {
    try {
      const { db } = await import('./db');
      const { desc } = await import('drizzle-orm');
      const tokens = await db.select().from(adminInviteTokens).orderBy(desc(adminInviteTokens.createdAt));
      res.json(tokens);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch invite tokens' });
    }
  });

  app.delete('/api/admin/invite-tokens/:id', isAdmin, async (req: any, res) => {
    try {
      const { db } = await import('./db');
      const { eq } = await import('drizzle-orm');
      await db.update(adminInviteTokens).set({ isRevoked: true }).where(eq(adminInviteTokens.id, parseInt(req.params.id)));
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to revoke token' });
    }
  });

  app.get('/api/invite/validate/:token', async (req, res) => {
    try {
      const { db } = await import('./db');
      const { eq } = await import('drizzle-orm');
      const [token] = await db.select().from(adminInviteTokens).where(eq(adminInviteTokens.token, req.params.token));
      if (!token || token.isRevoked) return res.json({ valid: false, reason: 'Invalid or revoked link' });
      if (token.expiresAt && new Date() > token.expiresAt) return res.json({ valid: false, reason: 'This invite link has expired' });
      if (token.maxUses && token.currentUses !== null && token.currentUses >= token.maxUses) return res.json({ valid: false, reason: 'This invite link has reached its usage limit' });
      res.json({ valid: true, label: token.label });
    } catch (err: any) {
      res.status(500).json({ valid: false, reason: 'Error validating link' });
    }
  });

  // ── Deep Research (Gemini 3.1 Pro — direct synchronous call) ─────────────
  const GEMINI_PRO_RESEARCH_MODEL = 'gemini-3.1-pro-preview';
  const GEMINI_GENERATE_BASE      = 'https://generativelanguage.googleapis.com/v1beta/models';

  app.post('/api/deep-research/start', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const user   = await storage.getUser(userId);
      const tier   = user?.subscriptionTier || 'free';
      if (!['research', 'enterprise'].includes(tier)) {
        return res.status(403).json({ error: 'Deep Research requires a Research or Enterprise subscription.' });
      }

      const { message, conversationId } = req.body;
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'message is required' });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });

      // Save the user message immediately so it appears in the chat
      let userMessageId: number | undefined;
      if (conversationId) {
        const userMsg = await storage.createMessage({ conversationId, content: message, role: 'user' });
        userMessageId = userMsg.id;
      }

      const systemPrompt = `You are Turbo Answer Research. You provide thorough, well-structured, deeply researched answers. Always:
- Give comprehensive, detailed responses with clear structure
- Use headings and bullet points for complex topics
- Include relevant context, nuances, and examples
- Cover multiple perspectives where applicable
- For code questions: provide working, well-commented code with explanations
- For factual questions: be precise and complete
Only mention that TurboAnswer was developed by Tiago Tschantret if directly asked.`;

      const prompt = `${systemPrompt}\n\nUser: ${message}`;

      const resp = await fetch(
        `${GEMINI_GENERATE_BASE}/${GEMINI_PRO_RESEARCH_MODEL}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 8192 },
          }),
          signal: AbortSignal.timeout(60000),
        }
      );

      if (!resp.ok) {
        const err = await resp.text();
        console.error('[DeepResearch] Gemini error:', err);
        return res.status(502).json({ error: 'Deep Research request failed', detail: err });
      }

      const data: any = await resp.json();
      const text: string =
        data?.candidates?.[0]?.content?.parts?.[0]?.text ?? 'No response generated.';

      // Save the AI response to the conversation
      let aiMessageId: number | undefined;
      if (conversationId) {
        const aiMsg = await storage.createMessage({
          conversationId: parseInt(conversationId as string),
          content: text,
          role: 'assistant',
        });
        aiMessageId = aiMsg.id;
      }

      // Return completed result immediately — no polling needed
      res.json({ status: 'completed', text, userMessageId, aiMessageId });
    } catch (e: any) {
      console.error('[DeepResearch] exception:', e.message);
      res.status(500).json({ error: e.message });
    }
  });

  // Status endpoint kept for backwards compatibility (returns completed immediately)
  app.get('/api/deep-research/status/:id', isAuthenticated, async (_req: any, res) => {
    res.json({ status: 'completed', text: null });
  });

  // ── Code Studio ──────────────────────────────────────────────────────────

  // Gate: all /api/code/* routes require the Code Studio add-on
  app.use('/api/code', async (req: any, res, next) => {
    // Read userId from session directly (req.user isn't set yet at this point)
    const userId = (req.session as any)?.userId;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });
    // Populate req.user so downstream isAuthenticated handlers work normally
    req.user = { claims: { sub: userId } };
    const u = await storage.getUser(userId).catch(() => null);
    if (!u?.codeStudioAddon) return res.status(403).json({ error: 'Code Studio add-on required', requiresAddon: true });

    // Credit reset: resetAt stores the NEXT reset date.
    // When that date passes → reset to exactly 1500 cents ($15.00), push next reset 30 days out.
    if (u.codeStudioCreditsResetAt) {
      const nextReset = new Date(u.codeStudioCreditsResetAt);
      if (Date.now() >= nextReset.getTime()) {
        const next30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        await storage.updateCodeStudioCredits(userId, 1500, next30).catch(() => {});
      }
    }
    next();
  });

  // ── Project Secrets CRUD (Replit-style) ─────────────────────────────────────
  const { codeProjectSecrets } = await import('../shared/schema');

  app.get('/api/code/projects/:projectId/secrets', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const projectId = Number(req.params.projectId);
      const secrets = await db.select({ id: codeProjectSecrets.id, key: codeProjectSecrets.key, createdAt: codeProjectSecrets.createdAt, updatedAt: codeProjectSecrets.updatedAt })
        .from(codeProjectSecrets)
        .where(and(eq(codeProjectSecrets.projectId, projectId), eq(codeProjectSecrets.userId, userId)));
      res.json(secrets);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post('/api/code/projects/:projectId/secrets', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const projectId = Number(req.params.projectId);
      const { key, value } = req.body;
      if (!key?.trim() || !value?.trim()) return res.status(400).json({ error: 'Key and value required' });
      if (!/^[A-Z_][A-Z0-9_]*$/i.test(key.trim())) return res.status(400).json({ error: 'Key must be alphanumeric with underscores (e.g. API_KEY)' });
      const existing = await db.select().from(codeProjectSecrets).where(and(eq(codeProjectSecrets.projectId, projectId), eq(codeProjectSecrets.userId, userId), eq(codeProjectSecrets.key, key.trim())));
      if (existing.length > 0) {
        const [updated] = await db.update(codeProjectSecrets).set({ value: value.trim(), updatedAt: new Date() }).where(eq(codeProjectSecrets.id, existing[0].id)).returning();
        return res.json({ id: updated.id, key: updated.key, updatedAt: updated.updatedAt });
      }
      const [created] = await db.insert(codeProjectSecrets).values({ projectId, userId, key: key.trim(), value: value.trim() }).returning();
      res.json({ id: created.id, key: created.key, createdAt: created.createdAt });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.delete('/api/code/projects/:projectId/secrets/:secretId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const secretId = Number(req.params.secretId);
      await db.delete(codeProjectSecrets).where(and(eq(codeProjectSecrets.id, secretId), eq(codeProjectSecrets.userId, userId)));
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get('/api/code/projects/:projectId/secrets/:secretId/value', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const secretId = Number(req.params.secretId);
      const [secret] = await db.select().from(codeProjectSecrets).where(and(eq(codeProjectSecrets.id, secretId), eq(codeProjectSecrets.userId, userId)));
      if (!secret) return res.status(404).json({ error: 'Secret not found' });
      res.json({ key: secret.key, value: secret.value });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Estimate complexity of a build prompt → returns tier + cost before building
  app.post('/api/code/estimate-complexity', isAuthenticated, async (req: any, res) => {
    const { prompt } = req.body;
    if (!prompt?.trim()) return res.status(400).json({ error: 'Prompt required' });

    const TIERS: Record<string, { label: string; cents: number; emoji: string; desc: string }> = {
      micro:    { label: 'Micro',    cents: 10,  emoji: '⚡', desc: 'Single element or minimal widget (clock, counter, color picker)' },
      simple:   { label: 'Simple',   cents: 35,  emoji: '🟢', desc: 'Small interactive app (calculator, to-do list, quiz, timer)' },
      standard: { label: 'Standard', cents: 75,  emoji: '🔵', desc: 'Full-featured app (notes, weather, landing page, medium game)' },
      complex:  { label: 'Complex',  cents: 150, emoji: '🟣', desc: 'Advanced app (CRUD, multi-page, complex state, API integrations)' },
      advanced: { label: 'Advanced', cents: 300, emoji: '🔴', desc: 'Professional-grade (dashboard, real-time app, large-scale project)' },
    };

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error('No API key');

      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: `Classify this web app build complexity. Reply with ONLY one word.

TIERS:
- micro: Single widget (clock, counter, color picker, basic animation, single button)
- simple: Small app (calculator, to-do list, quiz, timer, contact form)
- standard: Full app with multiple features (notes app, weather widget, landing page, game, data tables)
- complex: Advanced (multi-page, CRUD with storage, complex state, real-time, API calls, charts)
- advanced: Professional-grade (complete dashboard, e-commerce, multi-feature platform, large scale)

Build request: "${prompt.trim().slice(0, 300)}"

Reply with exactly one word (micro/simple/standard/complex/advanced):` }] }],
          generationConfig: { temperature: 0, maxOutputTokens: 10 },
        }),
        signal: AbortSignal.timeout(8000),
      });

      const d: any = await r.json();
      const raw = d.candidates?.[0]?.content?.parts?.[0]?.text?.trim().toLowerCase().replace(/[^a-z]/g, '') || 'standard';
      const tierKey = TIERS[raw] ? raw : 'standard';
      const tier = TIERS[tierKey];

      return res.json({
        tier: tierKey,
        label: tier.label,
        emoji: tier.emoji,
        cents: tier.cents,
        display: `$${(tier.cents / 100).toFixed(2)}`,
        description: tier.desc,
      });
    } catch {
      const tier = TIERS.standard;
      return res.json({ tier: 'standard', label: tier.label, emoji: tier.emoji, cents: tier.cents, display: `$${(tier.cents / 100).toFixed(2)}`, description: tier.desc });
    }
  });

  // AI-generate a complete project from a single prompt
  app.post('/api/code/ai-generate', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { prompt, projectId, referenceUrl } = req.body;
      if (!prompt?.trim()) return res.status(400).json({ error: 'Prompt required' });

      const userSettings = await storage.getUser(userId);
      const longBuildOn = userSettings?.codeStudioLongBuild ?? false;
      const longBuildHours = userSettings?.codeStudioLongBuildHours ?? 1;
      const PASSES_BY_HOURS: Record<number, number> = { 1: 1, 3: 2, 6: 3, 9: 4 };
      const totalPasses = longBuildOn ? (PASSES_BY_HOURS[longBuildHours] || 1) : 1;
      const perPassMs = 130000;
      const timeoutMs = (totalPasses * perPassMs) + 60000;
      res.setTimeout(timeoutMs);
      if (req.socket) req.socket.setTimeout(timeoutMs + 10000);

      // ── Complexity-based billing ──────────────────────────────────────────────
      // Tiers: micro=10¢, simple=35¢, standard=75¢, complex=150¢, advanced=300¢
      const VALID_COST_CENTS = [10, 35, 75, 150, 300];
      const agreedCostCents = VALID_COST_CENTS.includes(Number(req.body.agreedCostCents))
        ? Number(req.body.agreedCostCents)
        : 75; // default to standard if not provided

      const currentUser = await storage.getUser(userId);
      if (!currentUser) return res.status(403).json({ error: 'User not found' });
      const availableCents = currentUser.codeStudioCredits ?? 0;

      if (availableCents < agreedCostCents) {
        return res.status(402).json({
          error: `Insufficient balance. This build costs $${(agreedCostCents / 100).toFixed(2)} but you only have $${(availableCents / 100).toFixed(2)}. Add budget to continue.`,
          outOfCredits: true,
          credits: availableCents,
          creditsDisplay: `$${(availableCents / 100).toFixed(2)}`,
          requiredCents: agreedCostCents,
        });
      }
      // Deduct full cost upfront
      await storage.updateCodeStudioCredits(userId, availableCents - agreedCostCents);

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) return res.status(500).json({ error: 'AI not configured' });

      // ── PHASE 1: Web research — find real apps, copy their features ──────────
      async function researchAppFeatures(userPrompt: string): Promise<{ summary: string; features: string[] }> {
        try {
          const searchQuery = `What are all the features, UI components, and best practices in a professional "${userPrompt}" web app? List every feature from popular apps like this. Be very specific and comprehensive.`;
          const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tools: [{ google_search: {} }],
              contents: [{ role: 'user', parts: [{ text: searchQuery }] }],
              generationConfig: { temperature: 0.2, maxOutputTokens: 1200 },
            }),
            signal: AbortSignal.timeout(20000),
          });
          if (!r.ok) throw new Error(`Research HTTP ${r.status}`);
          const d: any = await r.json();
          const raw = d.candidates?.[0]?.content?.parts?.[0]?.text || '';
          if (!raw) throw new Error('Empty research response');

          // Extract bullet-point features
          const lines = raw.split('\n').map((l: string) => l.replace(/^[\s\-\*•\d\.]+/, '').trim()).filter((l: string) => l.length > 8 && l.length < 200);
          const features = lines.slice(0, 30);
          const summary = raw.slice(0, 600);
          return { summary, features };
        } catch (e: any) {
          console.log('[CodeAI] Research skipped:', e.message);
          return { summary: '', features: [] };
        }
      }

      const { features: discoveredFeatures, summary: researchSummary } = await researchAppFeatures(prompt.trim());

      // Fetch reference website for design inspiration (best-effort, 6s timeout)
      let designContext = '';
      if (referenceUrl?.trim()) {
        try {
          const refRes = await fetch(referenceUrl.trim(), {
            signal: AbortSignal.timeout(6000),
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TurboCode/1.0)' },
          });
          if (refRes.ok) {
            const html = await refRes.text();
            // Extract title and meta description
            const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
            const descMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)/i);
            // Extract color hints from CSS variables and inline styles
            const colorMatches = html.match(/#[0-9a-f]{3,6}|rgb\([^)]+\)|hsl\([^)]+\)/gi) || [];
            const uniqueColors = [...new Set(colorMatches)].slice(0, 12);
            // Extract primary fonts
            const fontMatches = html.match(/font-family:\s*([^;}"']+)/gi) || [];
            const fonts = fontMatches.slice(0, 3).map(f => f.replace('font-family:', '').trim());
            designContext = `\n\nDESIGN REFERENCE: The user wants a design inspired by: ${referenceUrl}
Site title: ${titleMatch?.[1] || 'unknown'}
Site description: ${descMatch?.[1] || 'unknown'}
Dominant colors from the site: ${uniqueColors.join(', ') || 'not found'}
Fonts used: ${fonts.join(', ') || 'not found'}
IMPORTANT: Study these colors and replicate the visual identity, color palette, and overall feel of this reference site in your design. Match the aesthetic closely.`;
          }
        } catch {
          designContext = `\n\nDESIGN REFERENCE: User wants design inspired by ${referenceUrl}. Replicate the general look, feel and color scheme you know this site has.`;
        }
      }

      // Use Replit AI integration proxy for Anthropic (preferred) or direct key
      const anthropicKey = process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;
      const anthropicBase = process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL || 'https://api.anthropic.com';

      // CSS foundation that gets injected into every build — guarantees design system is present
      const CSS_FOUNDATION = `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;600&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#0a0a0f;--surface:#111118;--surface-2:#1a1a26;--surface-3:#222233;
  --border:rgba(255,255,255,0.07);--border-hover:rgba(255,255,255,0.15);
  --text:#e8e8ff;--text-2:#9999bb;--text-3:#55556a;
  --accent:#7c3aed;--accent-2:#6d28d9;--cyan:#06b6d4;
  --green:#10b981;--red:#ef4444;--yellow:#f59e0b;--orange:#f97316;
  --glow:rgba(124,58,237,0.3);--glow-cyan:rgba(6,182,212,0.2);
  --radius:12px;--radius-sm:8px;--radius-lg:20px;--radius-xl:28px;
  --shadow:0 4px 24px rgba(0,0,0,0.5);--shadow-lg:0 20px 60px rgba(0,0,0,0.6);
  --transition:all 0.2s cubic-bezier(0.4,0,0.2,1);
}
html{scroll-behavior:smooth}
body{font-family:'Inter',system-ui,sans-serif;background:var(--bg);color:var(--text);min-height:100vh;line-height:1.6;font-size:15px;-webkit-font-smoothing:antialiased}
h1{font-size:clamp(2rem,5vw,3.5rem);font-weight:800;line-height:1.1;letter-spacing:-0.02em}
h2{font-size:clamp(1.5rem,3vw,2rem);font-weight:700;line-height:1.2}
h3{font-size:1.25rem;font-weight:600}
h4{font-size:1rem;font-weight:600}
button{cursor:pointer;font-family:inherit;font-size:0.9rem;font-weight:600;border:none;outline:none;transition:var(--transition)}
input,textarea,select{font-family:inherit;font-size:0.9rem;outline:none;transition:var(--transition)}
.container{max-width:1100px;margin:0 auto;padding:0 24px}
.card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);box-shadow:var(--shadow);transition:var(--transition)}
.card:hover{border-color:var(--border-hover);transform:translateY(-2px);box-shadow:0 8px 40px rgba(0,0,0,0.6)}
.btn{display:inline-flex;align-items:center;gap:8px;padding:10px 22px;border-radius:var(--radius-sm);font-weight:600;font-size:0.875rem;transition:var(--transition);letter-spacing:0.01em}
.btn-primary{background:linear-gradient(135deg,var(--accent),var(--cyan));color:#fff;box-shadow:0 0 20px var(--glow)}
.btn-primary:hover{transform:translateY(-1px);box-shadow:0 0 30px var(--glow),0 4px 20px rgba(0,0,0,0.4)}
.btn-secondary{background:var(--surface-2);color:var(--text);border:1px solid var(--border)}
.btn-secondary:hover{background:var(--surface-3);border-color:var(--border-hover)}
.input-field{width:100%;background:var(--surface-2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px 14px;color:var(--text);font-size:0.9rem}
.input-field:focus{border-color:var(--accent);box-shadow:0 0 0 3px var(--glow)}
.input-field::placeholder{color:var(--text-3)}
.badge{display:inline-flex;align-items:center;padding:4px 10px;border-radius:999px;font-size:0.75rem;font-weight:600;letter-spacing:0.04em}
.badge-accent{background:rgba(124,58,237,0.15);color:#a78bfa;border:1px solid rgba(124,58,237,0.25)}
.badge-green{background:rgba(16,185,129,0.12);color:#34d399;border:1px solid rgba(16,185,129,0.2)}
.badge-red{background:rgba(239,68,68,0.12);color:#f87171;border:1px solid rgba(239,68,68,0.2)}
.gradient-text{background:linear-gradient(135deg,#a78bfa,#67e8f9);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.glow-line{height:1px;background:linear-gradient(90deg,transparent,var(--accent),var(--cyan),transparent)}
@keyframes fadeInUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes scaleIn{from{opacity:0;transform:scale(0.95)}to{opacity:1;transform:scale(1)}}
@keyframes slideIn{from{opacity:0;transform:translateX(-20px)}to{opacity:1;transform:translateX(0)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
@keyframes spin{to{transform:rotate(360deg)}}
.animate-fadeInUp{animation:fadeInUp 0.5s ease forwards}
.animate-scaleIn{animation:scaleIn 0.3s ease forwards}
@media(max-width:768px){.container{padding:0 16px}h1{font-size:2rem}h2{font-size:1.5rem}}`;

      // The HTML prefix we inject — contains the full design system CSS guaranteed
      const HTML_PREFIX = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
${CSS_FOUNDATION}
  </style>
  <title>`;

      // Build research context block from discovered features
      const featureContext = discoveredFeatures.length > 0
        ? `\n\nWEB-RESEARCHED FEATURES — you MUST implement ALL of these in the app (found from real production apps on the web):\n${discoveredFeatures.map((f, i) => `${i + 1}. ${f}`).join('\n')}\n\nEvery single feature above must be present and working in the final app. This makes it a professional-grade, production-quality app that rivals the best apps on the market.`
        : '';

      const systemPrompt = `You are Turbo Code, a world-class senior UI engineer. You build FULLY FUNCTIONAL web apps as a single HTML file. You are completing an HTML document that has already started. Your output will be appended directly after "<title>".

You must output ONLY the continuation of the HTML — starting with the app title, then </title>, then complete <style>, complete <body>, and closing </html>. No markdown, no explanation, just raw HTML.

ARCHITECTURE (MANDATORY — follow this exact pattern):
\`\`\`
const App = {
  state: { /* all app data here */ },
  init() { this.load(); this.bind(); this.render(); },
  load() { const s = localStorage.getItem('appData'); if (s) this.state = JSON.parse(s); },
  save() { localStorage.setItem('appData', JSON.stringify(this.state)); },
  bind() { /* attach ALL event listeners here using addEventListener, NOT inline onclick */ },
  render() { /* update ALL DOM from this.state — this is the ONLY place you touch innerHTML */ },
  // ... other methods
};
document.addEventListener('DOMContentLoaded', () => App.init());
\`\`\`

CRITICAL RULES:
1. Use addEventListener in bind() for ALL interactions — never use inline onclick/onsubmit in HTML
2. Every user action must: update this.state → call this.save() → call this.render()
3. render() must rebuild ALL dynamic content from this.state every time — never manually tweak DOM
4. All data persists to localStorage via save() and restores via load()
5. Keep scope realistic: build 3-5 core features that work perfectly rather than 20 broken ones
6. Forms must validate inputs and show clear error/success feedback
7. Lists/tables must support add, edit/delete, and filter/search if appropriate
8. Modals: use a single reusable modal pattern (show/hide with a class toggle)
9. Charts: use canvas with real data from state — no placeholder images
10. NO "TODO", NO empty handlers, NO console.log-only functions, NO stub code

UI RULES:
- Use the foundation CSS classes: .card, .btn, .btn-primary, .btn-secondary, .input-field, .container, .badge
- Add app-specific styles only — do NOT redefine foundation CSS variables
- Dark glassmorphism design, gradient accents, smooth transitions
- Mobile responsive with flexbox/grid
- Focus on making the core features polished and fully interactive${featureContext}${designContext}`;

      const userMessage = `Build this app: ${prompt.trim()}

IMPORTANT:
- Output starts immediately with the app title text (e.g. "Todo App</title>") 
- Then add </title> and complete the rest of the HTML
- The foundation CSS is already loaded — use its classes and variables
- Add app-specific styles in a <style> tag after </title> in <head>
- All JavaScript goes in a <script> tag before </body>
- Make it beautiful, complete, fully working, and professional-grade
- Implement ALL researched features listed above — do not skip any`;

      async function callClaude(maxTokens: number, timeoutMs: number): Promise<string | null> {
        if (!anthropicKey) return null;
        try {
          const r = await fetch(`${anthropicBase}/v1/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01' },
            body: JSON.stringify({
              model: 'claude-opus-4-20250514',
              max_tokens: maxTokens,
              system: systemPrompt,
              messages: [
                { role: 'user', content: userMessage },
                { role: 'assistant', content: HTML_PREFIX },
              ],
            }),
            signal: AbortSignal.timeout(timeoutMs),
          });
          if (!r.ok) { console.error('[CodeAI] Claude error:', r.status, await r.text()); return null; }
          const d: any = await r.json();
          const continuation = d.content?.[0]?.text || null;
          // Prepend our injected prefix + foundation CSS
          if (!continuation) return null;
          return HTML_PREFIX + continuation;
        } catch (e: any) { console.error('[CodeAI] Claude exception:', e.message); return null; }
      }

      async function callGemini(model: string, maxTokens: number, timeoutMs: number): Promise<string | null> {
        const geminiPrompt = `You are Turbo Code, a world-class senior UI engineer. Build a complete, FULLY FUNCTIONAL web app as a single self-contained HTML file.

Output ONLY raw HTML starting with <!DOCTYPE html>. No markdown fences, no explanation.

The HTML MUST include this exact CSS at the top of the <style> tag:
<style>
${CSS_FOUNDATION}
/* APP-SPECIFIC STYLES BELOW */
</style>

Build this: ${prompt.trim()}${featureContext}${designContext}

MANDATORY ARCHITECTURE — use this exact pattern:
const App = {
  state: { /* all data */ },
  init() { this.load(); this.bind(); this.render(); },
  load() { const s = localStorage.getItem('appData'); if(s) this.state = JSON.parse(s); },
  save() { localStorage.setItem('appData', JSON.stringify(this.state)); },
  bind() { /* ALL addEventListener calls here — NO inline onclick in HTML */ },
  render() { /* rebuild ALL dynamic content from this.state */ },
};
document.addEventListener('DOMContentLoaded', () => App.init());

RULES:
1. Use addEventListener in bind() — NEVER inline onclick/onsubmit in HTML
2. Every action: update state → save() → render()
3. render() rebuilds all dynamic DOM from state every time
4. Keep scope realistic: 3-5 core features that work perfectly
5. Forms validate and show feedback, lists support CRUD, modals toggle with class
6. Charts use canvas with real data, no placeholder images
7. NO "TODO", NO stubs, NO empty handlers
8. Start output with <!DOCTYPE html>`;

        try {
          const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: geminiPrompt }] }],
              generationConfig: { temperature: 0.4, maxOutputTokens: maxTokens },
            }),
            signal: AbortSignal.timeout(timeoutMs),
          });
          if (!r.ok) return null;
          const d: any = await r.json();
          return d.candidates?.[0]?.content?.parts?.[0]?.text || null;
        } catch { return null; }
      }

      // Claude first (prefill technique forces correct output), then Gemini fallbacks
      const initialTimeout = 120000;
      let rawText = await callClaude(10000, initialTimeout)
        ?? await callGemini('gemini-3.1-pro-preview', 8192, 95000)
        ?? await callGemini('gemini-2.0-flash', 8192, 45000)
        ?? await callGemini('gemini-2.0-flash-lite', 4096, 30000)
        ?? '';

      if (!rawText) return res.status(502).json({ error: 'AI timed out. Please try a shorter description.' });

      // Strip any markdown fences
      let htmlContent = rawText
        .replace(/^```(?:html)?\s*/im, '')
        .replace(/\s*```\s*$/im, '')
        .trim();

      // Make sure it starts with <!DOCTYPE html> — extract if buried in prose
      const doctypeIdx = htmlContent.indexOf('<!DOCTYPE html>');
      if (doctypeIdx > 0) htmlContent = htmlContent.slice(doctypeIdx);
      else if (!htmlContent.startsWith('<!DOCTYPE')) {
        const htmlTagIdx = htmlContent.indexOf('<html');
        if (htmlTagIdx > 0) htmlContent = htmlContent.slice(htmlTagIdx);
      }

      // For Gemini output, inject the CSS foundation into <head> if not already present
      if (!htmlContent.includes('--accent:#7c3aed') && !htmlContent.includes('--accent: #7c3aed')) {
        htmlContent = htmlContent.replace(
          /<head([^>]*)>/i,
          `<head$1>\n  <style>\n${CSS_FOUNDATION}\n  </style>`
        );
      }

      if (!htmlContent || htmlContent.length < 200) {
        return res.status(502).json({ error: 'AI returned incomplete output. Please try again.' });
      }

      // ── LONG BUILD: Iterative improvement passes ──────────────────────────
      if (totalPasses > 1) {
        const refinePasses = totalPasses - 1;
        console.log(`[LongBuild] Starting ${refinePasses} refinement passes for ${longBuildHours}h build (total timeout: ${Math.round(timeoutMs/1000)}s)`);

        async function improvePass(currentHtml: string, passNum: number, total: number): Promise<string> {
          const passTimeout = perPassMs;
          console.log(`[LongBuild] Pass ${passNum}/${total} starting (timeout: ${Math.round(passTimeout/1000)}s, input: ${currentHtml.length} chars)`);

          const improvePrompt = `You are a world-class senior UI/UX engineer reviewing and improving a web application.

Below is the CURRENT HTML of the app. Your job for Pass ${passNum}/${total} is to:

${passNum === 1 ? `- ADD 3-5 missing features that a professional version of this app would have
- Improve the visual design: better spacing, colors, typography, micro-interactions
- Add smooth CSS animations and transitions
- Make forms more polished with better validation UX
- Add loading states, empty states, and error handling` : ''}
${passNum === 2 ? `- Polish every detail: hover effects, focus states, transitions
- Add advanced features: keyboard shortcuts, drag-and-drop, filters, search
- Improve responsive design for mobile and tablet
- Add subtle animations: fade-ins, slide transitions, skeleton loaders
- Make the data layer more robust with better localStorage patterns` : ''}
${passNum >= 3 ? `- Final professional polish: pixel-perfect alignment, consistent spacing
- Add accessibility: ARIA labels, keyboard navigation, focus indicators
- Performance optimization: lazy rendering, debounced inputs
- Add final touches: tooltips, confirmation dialogs, undo functionality
- Ensure every feature works perfectly end-to-end` : ''}

CRITICAL RULES:
- Output ONLY the complete improved HTML file, starting with <!DOCTYPE html>
- Keep ALL existing features working — do NOT remove anything
- Make meaningful improvements, not just cosmetic changes
- The app must be self-contained in a single HTML file
- No markdown fences, no explanation — just the HTML

CURRENT APP HTML:
${currentHtml}`;

          if (anthropicKey) {
            try {
              const controller = new AbortController();
              const timer = setTimeout(() => controller.abort(), passTimeout);
              const r = await fetch(`${anthropicBase}/v1/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01' },
                body: JSON.stringify({
                  model: 'claude-opus-4-20250514',
                  max_tokens: 12000,
                  messages: [{ role: 'user', content: improvePrompt }],
                }),
                signal: controller.signal,
              });
              clearTimeout(timer);
              if (r.ok) {
                const d: any = await r.json();
                const improved = d.content?.[0]?.text || '';
                const cleaned = improved.replace(/^```(?:html)?\s*/im, '').replace(/\s*```\s*$/im, '').trim();
                const idx = cleaned.indexOf('<!DOCTYPE html>');
                if (idx >= 0 && cleaned.length > currentHtml.length * 0.5) {
                  console.log(`[LongBuild] Pass ${passNum} Claude succeeded — ${cleaned.length} chars (was ${currentHtml.length})`);
                  return cleaned.slice(idx);
                }
                console.log(`[LongBuild] Pass ${passNum} Claude output too short or missing DOCTYPE, trying Gemini`);
              } else {
                console.log(`[LongBuild] Pass ${passNum} Claude HTTP ${r.status}, trying Gemini`);
              }
            } catch (e: any) {
              console.log(`[LongBuild] Pass ${passNum} Claude failed: ${e.message}, trying Gemini`);
            }
          }

          try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 60000);
            const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: improvePrompt }] }],
                generationConfig: { temperature: 0.3, maxOutputTokens: 10000 },
              }),
              signal: controller.signal,
            });
            clearTimeout(timer);
            if (r.ok) {
              const d: any = await r.json();
              const improved = d.candidates?.[0]?.content?.parts?.[0]?.text || '';
              const cleaned = improved.replace(/^```(?:html)?\s*/im, '').replace(/\s*```\s*$/im, '').trim();
              const idx = cleaned.indexOf('<!DOCTYPE html>');
              if (idx >= 0 && cleaned.length > currentHtml.length * 0.5) {
                console.log(`[LongBuild] Pass ${passNum} Gemini succeeded — ${cleaned.length} chars`);
                return cleaned.slice(idx);
              }
            }
          } catch (e: any) {
            console.log(`[LongBuild] Pass ${passNum} Gemini failed: ${e.message}`);
          }

          console.log(`[LongBuild] Pass ${passNum} — keeping current version (${currentHtml.length} chars)`);
          return currentHtml;
        }

        for (let pass = 1; pass <= refinePasses; pass++) {
          htmlContent = await improvePass(htmlContent, pass, refinePasses);
        }
        console.log(`[LongBuild] All ${refinePasses} refinement passes complete. Final size: ${htmlContent.length} chars`);
      }

      // Extract project name from <title> tag
      const titleMatch = htmlContent.match(/<title[^>]*>([^<]+)<\/title>/i);
      const projectName = titleMatch?.[1]?.trim() || prompt.slice(0, 50);

      const generatedFiles = [{ name: 'index.html', language: 'html', content: htmlContent }];

      const { db } = await import('./db');
      const { codeProjects } = await import('../shared/schema');

      let project: any;

      // If projectId supplied → update existing project (rebuild)
      if (projectId) {
        const [updated] = await db.update(codeProjects)
          .set({ name: projectName, description: '', files: generatedFiles, mainLanguage: 'html', updatedAt: new Date() })
          .where(eq(codeProjects.id, parseInt(projectId)))
          .returning();
        project = updated;
      } else {
        const [inserted] = await db.insert(codeProjects).values({
          userId, name: projectName, description: '',
          files: generatedFiles, mainLanguage: 'html', isPublished: false,
        }).returning();
        project = inserted;
      }

      // Auto-deploy the project immediately after generation
      let publishUrl: string | null = null;
      try {
        const slug = project.slug || generateSlug(project.name, project.id);
        const [deployed] = await db.update(codeProjects)
          .set({ isPublished: true, publishedAt: new Date(), slug, updatedAt: new Date() })
          .where(eq(codeProjects.id, project.id))
          .returning();
        project = deployed;
        publishUrl = `/p/${slug}`;
      } catch (e: any) {
        console.log('[CodeAI] Auto-deploy skipped:', e.message);
      }

      // ── Complexity billing: cost was already deducted upfront ───────────────
      const costCents = agreedCostCents;
      const finalBalance = availableCents - costCents;
      console.log(`[Credits] User ${userId}: complexity build → cost $${(costCents/100).toFixed(2)} → balance $${(finalBalance/100).toFixed(2)}`);

      const freshUser = await storage.getUser(userId).catch(() => null);
      res.json({
        project, files: generatedFiles, publishUrl, discoveredFeatures,
        creditsRemaining: freshUser?.codeStudioCredits ?? finalBalance,
        costCents,
        costDisplay: `$${(costCents / 100).toFixed(2)}`,
        balanceDisplay: `$${(finalBalance / 100).toFixed(2)}`,
        longBuildPasses: totalPasses,
        longBuildHours: longBuildOn ? longBuildHours : 0,
      });
    } catch (e: any) {
      console.error('[CodeAI] Generate error:', e.message);
      res.status(500).json({ error: e.message });
    }
  });
  const { db } = await import('./db');
  const { codeProjects } = await import('../shared/schema');
  const { eq, and } = await import('drizzle-orm');

  // Get current credit balance
  app.get('/api/code/credits', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user) return res.status(403).json({ error: 'User not found' });
      // codeStudioCreditsResetAt IS the next reset date (not last reset)
      const nextReset = user.codeStudioCreditsResetAt ? new Date(user.codeStudioCreditsResetAt) : null;
      const cents = user.codeStudioCredits ?? 0;
      res.json({
        credits: cents,
        dollars: (cents / 100).toFixed(2),
        nextReset: nextReset?.toISOString() ?? null,
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Create PayPal order to buy a credit pack
  app.post('/api/code/buy-credits', isAuthenticated, async (req: any, res) => {
    try {
      const { credits } = req.body;
      const creditCount = Number(credits);
      if (!CREDIT_PACKS[creditCount]) {
        return res.status(400).json({ error: `Invalid credit pack. Valid options: ${Object.keys(CREDIT_PACKS).join(', ')}` });
      }
      const userId = req.user.claims.sub;
      const origin = req.headers.origin || `${req.protocol}://${req.headers.host}`;
      const { orderId, approvalUrl } = await createCreditPackOrder(
        creditCount,
        `${origin}/code-studio?creditSuccess=1`,
        `${origin}/code-studio?creditCancelled=1`,
        userId,
      );
      res.json({ orderId, approvalUrl });
    } catch (e: any) {
      console.error('[Credits] Buy error:', e.message);
      res.status(500).json({ error: e.message });
    }
  });

  // Capture PayPal order and credit the user's account
  app.post('/api/code/capture-credits', isAuthenticated, async (req: any, res) => {
    try {
      const { orderId } = req.body;
      if (!orderId) return res.status(400).json({ error: 'orderId required' });
      const userId = req.user.claims.sub;

      const { credits, userId: payloadUserId } = await captureCreditPackOrder(orderId);

      // Security: verify payment belongs to the requesting user
      if (payloadUserId !== userId) return res.status(403).json({ error: 'Order mismatch' });

      const user = await storage.getUser(userId);
      const newTotal = (user?.codeStudioCredits ?? 0) + credits;
      await storage.updateCodeStudioCredits(userId, newTotal);
      res.json({ success: true, creditsAdded: credits, totalCredits: newTotal });
    } catch (e: any) {
      console.error('[Credits] Capture error:', e.message);
      res.status(500).json({ error: e.message });
    }
  });

  // List user's projects
  app.get('/api/code/projects', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const projects = await db.select().from(codeProjects).where(eq(codeProjects.userId, userId));
      res.json(projects);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Create project
  app.post('/api/code/projects', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { name, description, files, mainLanguage } = req.body;
      if (!name?.trim()) return res.status(400).json({ error: 'Project name required' });
      const [project] = await db.insert(codeProjects).values({
        userId, name: name.trim(), description: description || '',
        files: files || getDefaultFiles(mainLanguage || 'html'),
        mainLanguage: mainLanguage || 'html',
        isPublished: false,
      }).returning();
      res.json(project);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Update project (save)
  app.put('/api/code/projects/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      const { name, description, files, mainLanguage } = req.body;
      const [project] = await db.update(codeProjects)
        .set({ name, description, files, mainLanguage, updatedAt: new Date() })
        .where(and(eq(codeProjects.id, id), eq(codeProjects.userId, userId)))
        .returning();
      if (!project) return res.status(404).json({ error: 'Project not found' });
      res.json(project);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Delete project
  app.delete('/api/code/projects/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      await db.delete(codeProjects).where(and(eq(codeProjects.id, id), eq(codeProjects.userId, userId)));
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Execute code via Piston API
  app.post('/api/code/execute', isAuthenticated, async (req: any, res) => {
    try {
      const { language, code, stdin } = req.body;
      if (!language || !code) return res.status(400).json({ error: 'language and code required' });

      const pistonLang = mapToPistonLanguage(language);
      const resp = await fetch('https://emkc.org/api/v2/piston/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: pistonLang,
          version: '*',
          files: [{ name: getFilename(language), content: code }],
          stdin: stdin || '',
          run_timeout: 10000,
        }),
        signal: AbortSignal.timeout(20000),
      });

      if (!resp.ok) {
        const text = await resp.text();
        return res.status(502).json({ error: `Execution service error: ${text.slice(0, 200)}` });
      }

      const data: any = await resp.json();
      const output = data.run?.output || data.run?.stdout || '';
      const stderr = data.run?.stderr || '';
      const exitCode = data.run?.code ?? 0;
      res.json({ output, stderr, exitCode, language: data.language, version: data.version });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Deploy project (publish with slug)
  app.post('/api/code/deploy/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      const { customDomain } = req.body;

      const existing = await db.select().from(codeProjects)
        .where(and(eq(codeProjects.id, id), eq(codeProjects.userId, userId)));
      if (!existing[0]) return res.status(404).json({ error: 'Project not found' });

      const slug = existing[0].slug || generateSlug(existing[0].name, id);
      const [project] = await db.update(codeProjects)
        .set({ isPublished: true, publishedAt: new Date(), slug, customDomain: customDomain || null, updatedAt: new Date() })
        .where(eq(codeProjects.id, id))
        .returning();
      res.json({ project, publishUrl: `/p/${slug}` });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Unpublish project
  app.post('/api/code/undeploy/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      await db.update(codeProjects)
        .set({ isPublished: false, updatedAt: new Date() })
        .where(and(eq(codeProjects.id, id), eq(codeProjects.userId, userId)));
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // AI code assistance — with intent detection (build vs chat)
  app.patch('/api/code/long-build', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { enabled, longBuild, autoBuyPack, hours } = req.body;
      const updates: any = {};
      const enabledVal = typeof longBuild === 'boolean' ? longBuild : enabled;
      if (typeof enabledVal === 'boolean') updates.codeStudioLongBuild = enabledVal;
      if (typeof autoBuyPack === 'number' && [500, 1000, 2500, 5000, 10000].includes(autoBuyPack)) updates.codeStudioAutoBuyPack = autoBuyPack;
      if (typeof hours === 'number' && [1, 3, 6, 9].includes(hours)) updates.codeStudioLongBuildHours = hours;
      if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No valid fields' });
      const [updated] = await db.update(users).set(updates).where(eq(users.id, userId)).returning();
      res.json({ success: true, longBuild: updated.codeStudioLongBuild, autoBuyPack: updated.codeStudioAutoBuyPack, hours: updated.codeStudioLongBuildHours });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get('/api/code/long-build', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user) return res.status(403).json({ error: 'User not found' });
      res.json({ longBuild: user.codeStudioLongBuild ?? false, autoBuyPack: user.codeStudioAutoBuyPack ?? 1000, hours: user.codeStudioLongBuildHours ?? 1 });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post('/api/code/auto-buy', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) return res.status(403).json({ error: 'User not found' });
      if (!user.codeStudioLongBuild) return res.status(400).json({ error: 'Long Build not enabled' });

      const packCents = user.codeStudioAutoBuyPack || 1000;
      const PACKS: Record<number, number> = { 500: 5, 1000: 10, 2500: 25, 5000: 50, 10000: 100 };
      const packPrice = PACKS[packCents];
      if (!packPrice) return res.status(400).json({ error: 'Invalid pack size' });

      if (!user.paypalSubscriptionId && !user.stripeSubscriptionId) {
        return res.status(402).json({ error: 'No payment method on file. Please purchase a credit pack manually first.', noPaymentMethod: true });
      }

      const newTotal = (user.codeStudioCredits ?? 0) + packCents;
      await storage.updateCodeStudioCredits(userId, newTotal);
      console.log(`[AutoBuy] User ${userId}: auto-purchased ${packCents} cents ($${packPrice}) → new balance ${newTotal} cents`);
      res.json({ success: true, creditsAdded: packCents, totalCredits: newTotal, charged: packPrice });
    } catch (e: any) {
      console.error('[AutoBuy] Error:', e.message);
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/code/ai', isAuthenticated, async (req: any, res) => {
    try {
      const { message, code, language, projectId } = req.body;
      if (!message) return res.status(400).json({ error: 'message required' });

      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      const CHAT_COST_CENTS = 5;
      const EDIT_COST_CENTS = 15;

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) return res.status(500).json({ error: 'AI not configured' });

      async function callModel(model: string, prompt: string, maxTokens: number, timeoutMs: number): Promise<string | null> {
        try {
          const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.2, maxOutputTokens: maxTokens },
            }),
            signal: AbortSignal.timeout(timeoutMs),
          });
          if (!r.ok) return null;
          const d: any = await r.json();
          return d.candidates?.[0]?.content?.parts?.[0]?.text || null;
        } catch { return null; }
      }

      // Step 0: Instant regex pre-classifier — no AI needed for obvious modify/update requests
      // If the user has existing code open AND is using action verbs, it's always a build/update
      const isModifyRequest = code && code.trim().length > 50 && /\b(change|update|modify|edit|make|set|add|remove|delete|rename|replace|increase|decrease|move|fix|adjust|improve|enhance|convert|turn|switch|toggle|make\s+it|make\s+the|make\s+a|add\s+a|add\s+the|remove\s+the|change\s+the|update\s+the)\b/i.test(message);

      if (isModifyRequest) {
        const availCents = currentUser?.codeStudioCredits ?? 0;
        if (availCents < EDIT_COST_CENTS) {
          if (currentUser?.codeStudioLongBuild) {
            try {
              const abRes = await fetch(`http://localhost:${process.env.PORT || 5000}/api/code/auto-buy`, { method: 'POST', headers: { 'Content-Type': 'application/json', cookie: req.headers.cookie || '' } });
              if (!abRes.ok) return res.status(402).json({ error: 'Insufficient credits and auto-buy failed', outOfCredits: true, credits: availCents });
            } catch { return res.status(402).json({ error: 'Insufficient credits', outOfCredits: true, credits: availCents }); }
          } else {
            return res.status(402).json({ error: `Edit costs $${(EDIT_COST_CENTS/100).toFixed(2)} but you have $${(availCents/100).toFixed(2)}`, outOfCredits: true, credits: availCents });
          }
        } else {
          await storage.updateCodeStudioCredits(userId, availCents - EDIT_COST_CENTS);
        }
        const codeContext = code ? `\n\nEXISTING CODE TO MODIFY:\n\`\`\`${language || 'html'}\n${code.slice(0, 8000)}\n\`\`\`` : '';
        const buildPrompt = `UPDATE EXISTING APP — DO NOT START FROM SCRATCH.\n\nChange requested: ${message}${codeContext}\n\nIMPORTANT: Output the complete updated file with ALL original content preserved, only applying the requested change.`;
        console.log(`[CodeAI] Regex-classified as update (${EDIT_COST_CENTS}¢): "${message.slice(0, 60)}"`);
        const freshUser = await storage.getUser(userId);
        return res.json({ intent: 'build', buildPrompt, reply: `Got it! Applying your update now...`, creditCost: EDIT_COST_CENTS, creditsRemaining: freshUser?.codeStudioCredits ?? 0 });
      }

      // Step 1: Detect intent (build vs chat) using fast model
      const intentPrompt = `You are Turbo Code Agent inside TurboAnswer Code Studio.

Classify if the user message is a BUILD/UPDATE request or a CHAT/question request.

BUILD/UPDATE: creating new apps, modifying existing code, styling changes, adding features, fixing bugs in the app
CHAT/QUESTION: asking coding questions, requesting explanations, asking how things work

BUILD examples: "build me a todo app", "create a portfolio site", "make a snake game", "change the button color", "add a dark mode toggle", "update the header text", "make the font bigger", "add a search bar"
CHAT examples: "how do I center a div?", "explain useEffect", "what is a promise?", "how does CSS flexbox work?"

User message: "${message.slice(0, 500)}"
Has existing code: ${code && code.trim().length > 50 ? 'YES' : 'NO'}

Respond ONLY with valid JSON (no markdown):
For BUILD/UPDATE: {"intent":"build","buildPrompt":"concise description of what to build or modify","reply":"On it! [brief description of what you're doing]..."}
For CHAT/QUESTION: {"intent":"chat"}`;

      const intentRaw = await callModel('gemini-2.0-flash-lite', intentPrompt, 256, 8000)
        ?? await callModel('gemini-2.0-flash', intentPrompt, 256, 8000);

      if (intentRaw) {
        try {
          const cleaned = intentRaw.replace(/^```(?:json)?\s*/im, '').replace(/\s*```\s*$/im, '').trim();
          const intentData = JSON.parse(cleaned.match(/\{[\s\S]*\}/)?.[0] || '{}');
          if (intentData.intent === 'build' && intentData.buildPrompt) {
            const costCents = code && code.trim().length > 50 ? EDIT_COST_CENTS : CHAT_COST_CENTS;
            let avail = (await storage.getUser(userId))?.codeStudioCredits ?? 0;
            if (avail < costCents) {
              if (currentUser?.codeStudioLongBuild) {
                try {
                  const abRes = await fetch(`http://localhost:${process.env.PORT || 5000}/api/code/auto-buy`, { method: 'POST', headers: { 'Content-Type': 'application/json', cookie: req.headers.cookie || '' } });
                  if (!abRes.ok) return res.status(402).json({ error: 'Insufficient credits', outOfCredits: true, credits: avail });
                  avail = (await storage.getUser(userId))?.codeStudioCredits ?? 0;
                } catch { return res.status(402).json({ error: 'Insufficient credits', outOfCredits: true, credits: avail }); }
              } else {
                return res.status(402).json({ error: `This action costs $${(costCents/100).toFixed(2)} but you have $${(avail/100).toFixed(2)}`, outOfCredits: true, credits: avail });
              }
            }
            await storage.updateCodeStudioCredits(userId, avail - costCents);
            let finalBuildPrompt = intentData.buildPrompt;
            if (code && code.trim().length > 50) {
              finalBuildPrompt = `UPDATE EXISTING APP — DO NOT START FROM SCRATCH.\n\nChange: ${intentData.buildPrompt}\n\nEXISTING CODE:\n\`\`\`${language || 'html'}\n${code.slice(0, 8000)}\n\`\`\`\n\nOutput the complete updated file preserving all original content, only applying the requested change.`;
            }
            const freshBal = (await storage.getUser(userId))?.codeStudioCredits ?? 0;
            return res.json({ intent: 'build', buildPrompt: finalBuildPrompt, reply: intentData.reply || `On it! Building now...`, creditCost: costCents, creditsRemaining: freshBal });
          }
        } catch { /* fall through to chat */ }
      }

      // Step 2: Chat response — metered at CHAT_COST_CENTS
      {
        let chatAvail = (await storage.getUser(userId))?.codeStudioCredits ?? 0;
        if (chatAvail < CHAT_COST_CENTS) {
          if (currentUser?.codeStudioLongBuild) {
            try {
              const abRes = await fetch(`http://localhost:${process.env.PORT || 5000}/api/code/auto-buy`, { method: 'POST', headers: { 'Content-Type': 'application/json', cookie: req.headers.cookie || '' } });
              if (!abRes.ok) return res.status(402).json({ error: 'Insufficient credits', outOfCredits: true, credits: chatAvail });
              chatAvail = (await storage.getUser(userId))?.codeStudioCredits ?? 0;
            } catch { return res.status(402).json({ error: 'Insufficient credits', outOfCredits: true, credits: chatAvail }); }
          } else {
            return res.status(402).json({ error: `Chat costs $${(CHAT_COST_CENTS/100).toFixed(2)} but you have $${(chatAvail/100).toFixed(2)}`, outOfCredits: true, credits: chatAvail });
          }
        }
        await storage.updateCodeStudioCredits(userId, chatAvail - CHAT_COST_CENTS);
      }
      const contextBlock = code ? `\n\nCurrent code in editor (${language || 'unknown'}):\n\`\`\`${language || ''}\n${code.slice(0, 4000)}\n\`\`\`` : '';
      const chatPrompt = `You are Turbo Code, an elite AI coding assistant inside TurboAnswer Code Studio. You help users write, debug, optimize, and understand code.

Rules:
- Give complete, working code examples — never snippets with "..." placeholders
- When fixing bugs, explain what was wrong briefly then show the fix
- Format all code with proper language tags in markdown code blocks
- Keep answers focused and practical${contextBlock}

User: ${message}`;

      let reply = await callModel('gemini-2.0-flash', chatPrompt, 4096, 20000)
        ?? await callModel('gemini-3.1-pro-preview', chatPrompt, 8192, 45000)
        ?? await callModel('gemini-2.0-flash-lite', chatPrompt, 4096, 12000);

      if (!reply) {
        const anthropicKey = process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;
        const anthropicBase = process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL || 'https://api.anthropic.com';
        if (anthropicKey) {
          try {
            const r = await fetch(`${anthropicBase}/v1/messages`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01' },
              body: JSON.stringify({ model: 'claude-opus-4-20250514', max_tokens: 4096, messages: [{ role: 'user', content: chatPrompt }] }),
              signal: AbortSignal.timeout(30000),
            });
            if (r.ok) { const d: any = await r.json(); reply = d.content?.[0]?.text || null; }
          } catch {}
        }
      }

      if (!reply) return res.status(502).json({ error: 'AI is temporarily busy. Please try again in a moment.' });
      const chatFreshBal = (await storage.getUser(userId))?.codeStudioCredits ?? 0;
      res.json({ intent: 'chat', reply, creditCost: CHAT_COST_CENTS, creditsRemaining: chatFreshBal });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Serve published project
  app.get('/p/:slug', async (req, res) => {
    try {
      const [project] = await db.select().from(codeProjects)
        .where(and(eq(codeProjects.slug, req.params.slug), eq(codeProjects.isPublished, true)));
      if (!project) return res.status(404).send('<h1>Project not found</h1><p>This project may have been unpublished or the link is incorrect.</p>');

      const files = project.files as { name: string; content: string; language: string }[];
      const html = buildProjectHtml(project.name, files, project.mainLanguage);
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.send(html);
    } catch (e: any) { res.status(500).send('<h1>Error loading project</h1>'); }
  });

  // Live preview — serves the project HTML with NO sandbox so all browser APIs work
  // (localStorage, fetch, WebSockets, IndexedDB, geolocation, etc.)
  app.get('/code-preview/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const projectId = parseInt(req.params.id);
      if (isNaN(projectId)) return res.status(400).send('Invalid project ID');

      const [project] = await db.select().from(codeProjects)
        .where(and(eq(codeProjects.id, projectId), eq(codeProjects.userId, userId)));

      if (!project) return res.status(404).send('Project not found');

      const files = project.files as { name: string; content: string; language: string }[];
      const html = buildProjectHtml(project.name, files, project.mainLanguage);

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('X-Frame-Options', 'SAMEORIGIN');
      res.send(html);
    } catch (e: any) {
      res.status(500).send('<h1 style="font-family:sans-serif">Error loading preview</h1>');
    }
  });

  function getDefaultFiles(lang: string): { name: string; content: string; language: string }[] {
    if (lang === 'html') return [
      { name: 'index.html', language: 'html', content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>My App</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <div class="container">
    <h1>Hello, World!</h1>
    <p>Start building your app here.</p>
    <button onclick="handleClick()">Click me</button>
    <div id="output"></div>
  </div>
  <script src="script.js"></script>
</body>
</html>` },
      { name: 'style.css', language: 'css', content: `* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: system-ui, sans-serif; background: #0f0f1a; color: #e2e8f0; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
.container { text-align: center; padding: 2rem; }
h1 { font-size: 2.5rem; font-weight: 700; background: linear-gradient(135deg, #6366f1, #8b5cf6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 1rem; }
p { color: #94a3b8; margin-bottom: 1.5rem; }
button { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 0.5rem; font-size: 1rem; cursor: pointer; transition: opacity 0.2s; }
button:hover { opacity: 0.85; }
#output { margin-top: 1rem; color: #a78bfa; }` },
      { name: 'script.js', language: 'javascript', content: `let count = 0;

function handleClick() {
  count++;
  document.getElementById('output').textContent = \`You clicked \${count} time\${count === 1 ? '' : 's'}!\`;
}

console.log('App loaded!');` },
    ];
    if (lang === 'python') return [
      { name: 'main.py', language: 'python', content: `# Python Script
def greet(name):
    return f"Hello, {name}! Welcome to TurboAnswer Code Studio."

result = greet("World")
print(result)

# Example: Simple counter
for i in range(1, 6):
    print(f"Count: {i}")` },
    ];
    if (lang === 'javascript') return [
      { name: 'index.js', language: 'javascript', content: `// JavaScript / Node.js
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

// Print first 10 Fibonacci numbers
for (let i = 0; i < 10; i++) {
  console.log(\`fibonacci(\${i}) = \${fibonacci(i)}\`);
}` },
    ];
    if (lang === 'typescript') return [
      { name: 'index.ts', language: 'typescript', content: `// TypeScript
interface User {
  id: number;
  name: string;
  email: string;
}

function createUser(id: number, name: string, email: string): User {
  return { id, name, email };
}

const user: User = createUser(1, "Alice", "alice@example.com");
console.log("User created:", user);
console.log(\`Welcome, \${user.name}!\`);` },
    ];
    return [{ name: 'main.txt', language: 'text', content: '// Start coding here' }];
  }

  function mapToPistonLanguage(lang: string): string {
    const map: Record<string, string> = {
      python: 'python', javascript: 'javascript', typescript: 'typescript',
      java: 'java', cpp: 'c++', c: 'c', rust: 'rust', go: 'go',
      php: 'php', ruby: 'ruby', swift: 'swift', kotlin: 'kotlin',
      bash: 'bash', shell: 'bash',
    };
    return map[lang.toLowerCase()] || lang.toLowerCase();
  }

  function getFilename(lang: string): string {
    const map: Record<string, string> = {
      python: 'main.py', javascript: 'index.js', typescript: 'index.ts',
      java: 'Main.java', cpp: 'main.cpp', c: 'main.c', rust: 'main.rs',
      go: 'main.go', php: 'index.php', ruby: 'main.rb', swift: 'main.swift',
      kotlin: 'main.kt', bash: 'main.sh',
    };
    return map[lang.toLowerCase()] || 'main.txt';
  }

  function generateSlug(name: string, id: number): string {
    const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
    return `${base}-${id}`;
  }

  function buildProjectHtml(projectName: string, files: { name: string; content: string; language: string }[], mainLang: string): string {
    if (mainLang !== 'html') {
      const allCode = files.map(f => `<h3>${f.name}</h3><pre><code class="language-${f.language}">${escapeHtml(f.content)}</code></pre>`).join('\n');
      return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${escapeHtml(projectName)}</title>
<style>body{font-family:monospace;background:#0f0f1a;color:#e2e8f0;padding:2rem;} h1{color:#a78bfa;margin-bottom:2rem;} h3{color:#6366f1;margin-top:1.5rem;margin-bottom:0.5rem;} pre{background:#1e1e2e;padding:1rem;border-radius:0.5rem;overflow:auto;border:1px solid #2d2d4e;} code{font-size:0.85rem;}</style>
</head><body><h1>${escapeHtml(projectName)}</h1>${allCode}</body></html>`;
    }

    const htmlFile = files.find(f => f.name === 'index.html') || files.find(f => f.language === 'html');
    if (!htmlFile) return `<!DOCTYPE html><html><body><h1>${escapeHtml(projectName)}</h1><p>No HTML file found.</p></body></html>`;

    let html = htmlFile.content;

    for (const file of files) {
      if (file.language === 'css') {
        // Match any <link> tag that references this CSS file, regardless of attribute order
        const cssRegex = new RegExp(
          `<link[^>]*href=["']${file.name}["'][^>]*>`,
          'gi'
        );
        html = html.replace(cssRegex, `<style>${file.content}</style>`);
      }
      if (file.language === 'javascript') {
        // Match any <script> tag that references this JS file, regardless of other attributes
        const jsRegex = new RegExp(
          `<script[^>]*src=["']${file.name}["'][^>]*>\\s*</script>`,
          'gi'
        );
        html = html.replace(jsRegex, `<script>${file.content}</script>`);
      }
    }
    return html;
  }

  function escapeHtml(str: string): string {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // ─── Media Editor AI Analyze ─────────────────────────────────────────────
  app.post('/api/media/ai-suggest', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!['enterprise'].includes(user?.subscriptionTier || '')) {
        return res.status(403).json({ error: 'Enterprise plan required.' });
      }
      const { imageData, mimeType = 'image/jpeg', context = '' } = req.body;
      if (!imageData) return res.status(400).json({ error: 'imageData required' });
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) return res.status(500).json({ error: 'AI not configured' });

      const prompt = `You are a professional video/photo editor AI. Analyze this image and provide creative editing suggestions.${context ? ` Context: ${context}` : ''}

Return ONLY valid JSON (no markdown):
{
  "captions": ["caption 1", "caption 2", "caption 3"],
  "styles": ["Cinematic with deep shadows", "Warm golden hour vibe", "Cool moody blue tones"],
  "filters": {"brightness": 1.1, "contrast": 1.2, "saturation": 0.9, "hue": 0, "sepia": 0},
  "description": "Brief scene description in 1-2 sentences.",
  "mood": "The overall mood/feel of this image."
}`;

      const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }, { inlineData: { mimeType, data: imageData } }] }],
          generationConfig: { temperature: 0.8, maxOutputTokens: 512 },
        }),
      });
      const aiData = await aiRes.json();
      const rawText = aiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return res.status(500).json({ error: 'Could not parse AI response' });
      res.json(JSON.parse(jsonMatch[0]));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ─── Photo Editor — Gemini Imagen 3 (free for all) ───────────────────────
  app.post('/api/photo-editor/generate', isAuthenticated, async (req: any, res) => {
    try {
      const { prompt, aspectRatio = '1:1', negativePrompt = 'blurry, low quality, distorted, watermark, text, ugly' } = req.body;
      if (!prompt) return res.status(400).json({ error: 'prompt required' });

      const geminiKey = process.env.GEMINI_API_KEY;
      if (!geminiKey) return res.status(500).json({ error: 'Gemini API key not configured' });

      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey: geminiKey });

      // Embed aspect ratio guidance into the prompt since generateContent doesn't have an aspect param
      const aspectGuide: Record<string, string> = {
        '9:16': 'vertical portrait orientation (9:16 aspect ratio)',
        '16:9': 'wide landscape orientation (16:9 aspect ratio)',
        '3:4': 'portrait orientation (3:4 aspect ratio)',
        '4:3': 'landscape orientation (4:3 aspect ratio)',
        '1:1': 'square composition (1:1 aspect ratio)',
      };
      const fullPrompt = `${prompt}. Compose this as a ${aspectGuide[aspectRatio] || 'square'}. High quality, sharp, photorealistic. Avoid: ${negativePrompt}.`;

      console.log(`[PhotoEditor] Generating with Gemini Flash Image, aspect ${aspectRatio}: "${prompt.slice(0, 80)}"`);
      const start = Date.now();

      let imgPart: any = null;
      for (let attempt = 1; attempt <= 3; attempt++) {
        const response = await ai.models.generateContent({
          model: 'gemini-2.0-flash-exp-image-generation',
          contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
          config: { responseModalities: ['TEXT', 'IMAGE'], temperature: 1 },
        });
        const parts = response.candidates?.[0]?.content?.parts || [];
        imgPart = parts.find((p: any) => p.inlineData?.mimeType?.startsWith('image'));
        if (imgPart?.inlineData?.data) break;
        console.log(`[PhotoEditor] Attempt ${attempt}: no image returned, retrying...`);
        if (attempt < 3) await new Promise(r => setTimeout(r, 800));
      }
      if (!imgPart?.inlineData?.data) return res.status(500).json({ error: 'Image generation failed after 3 attempts. Please try again.' });

      console.log(`[PhotoEditor] Gemini image generated in ${Date.now() - start}ms`);
      res.json({ imageData: imgPart.inlineData.data, mimeType: imgPart.inlineData.mimeType || 'image/png' });
    } catch (e: any) {
      console.error('[PhotoEditor] Generate error:', e.message);
      res.status(500).json({ error: e.message || 'Image generation failed' });
    }
  });

  app.post('/api/photo-editor/edit', isAuthenticated, async (req: any, res) => {
    try {
      const { instruction, imageData, mimeType = 'image/jpeg' } = req.body;
      if (!instruction || !imageData) return res.status(400).json({ error: 'instruction and imageData required' });

      const geminiKey = process.env.GEMINI_API_KEY;
      if (!geminiKey) return res.status(500).json({ error: 'Gemini API key not configured' });

      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey: geminiKey });

      console.log(`[PhotoEditor] Editing image with Gemini: "${instruction.slice(0, 80)}"`);
      const start = Date.now();

      // Step 1: Use Gemini Vision to describe the image in detail
      console.log(`[PhotoEditor] Step 1 — analyzing image with Gemini Vision...`);
      const describeResp = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: [{
          role: 'user',
          parts: [
            { inlineData: { mimeType: mimeType || 'image/jpeg', data: imageData } },
            { text: 'Describe this image in extreme detail: every person (appearance, clothing, pose, expression), objects, colors, lighting, background, textures, composition, and atmosphere. Be very specific and thorough.' },
          ],
        }],
      });
      const imageDescription = describeResp.candidates?.[0]?.content?.parts?.[0]?.text || 'A photo';
      console.log(`[PhotoEditor] Image described (${imageDescription.length} chars). Step 2 — generating edited version...`);

      // Step 2: Generate a new image applying the edit instruction to the description
      const editPrompt = `Create a photorealistic image based on this scene: ${imageDescription}\n\nNow apply this change: ${instruction}\n\nMake it look completely natural and photorealistic. High quality, sharp, 4K.`;

      let imgPart: any = null;
      for (let attempt = 1; attempt <= 3; attempt++) {
        const response = await ai.models.generateContent({
          model: 'gemini-2.0-flash-exp-image-generation',
          contents: [{ role: 'user', parts: [{ text: editPrompt }] }],
          config: { responseModalities: ['TEXT', 'IMAGE'], temperature: 1 },
        });
        const parts = response.candidates?.[0]?.content?.parts || [];
        imgPart = parts.find((p: any) => p.inlineData?.mimeType?.startsWith('image'));
        if (imgPart?.inlineData?.data) break;
        console.log(`[PhotoEditor] Edit attempt ${attempt}: no image returned, retrying...`);
        if (attempt < 3) await new Promise(r => setTimeout(r, 800));
      }
      if (!imgPart?.inlineData?.data) return res.status(500).json({ error: 'Image edit failed. Please try again with a different instruction.' });

      console.log(`[PhotoEditor] Edit complete in ${Date.now() - start}ms`);
      res.json({ imageData: imgPart.inlineData.data, mimeType: imgPart.inlineData.mimeType || 'image/png' });
    } catch (e: any) {
      console.error('[PhotoEditor] Edit error:', e.message);
      res.status(500).json({ error: e.message || 'Image edit failed' });
    }
  });

  // ── IMAGE DOWNLOAD ENDPOINT ──────────────────────────────────────────────────
  // Converts base64 image to a real binary file download — works on all browsers/devices
  app.post('/api/photo-editor/download', isAuthenticated, (req: any, res) => {
    try {
      const { imageData, mimeType = 'image/png', filename = 'turbo-image' } = req.body;
      if (!imageData) return res.status(400).json({ error: 'imageData required' });
      const buffer = Buffer.from(imageData, 'base64');
      const ext = mimeType.includes('jpeg') || mimeType.includes('jpg') ? 'jpg' : 'png';
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}-${Date.now()}.${ext}"`);
      res.setHeader('Content-Length', buffer.length);
      res.send(buffer);
    } catch (e: any) {
      res.status(500).json({ error: 'Download failed' });
    }
  });

  // AI Camera Scanner — analyze any image/document
  app.post('/api/camera/analyze', isAuthenticated, async (req: any, res) => {
    try {
      const { imageData, question } = req.body;
      if (!imageData) return res.status(400).json({ error: 'imageData required' });

      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const geminiKey = process.env.GEMINI_API_KEY;
      if (!geminiKey) return res.status(503).json({ error: 'AI service unavailable' });

      const ai = new GoogleGenerativeAI(geminiKey);
      const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash' });

      const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '');
      const mimeMatch = imageData.match(/^data:(image\/[a-z]+);base64,/);
      const mimeType = (mimeMatch?.[1] || 'image/jpeg') as any;

      const prompt = question
        ? `The user asks: "${question}"\n\nLook at this image carefully and answer the question directly and clearly. If the image contains text, read it exactly. Be thorough and helpful.`
        : `Analyze this image thoroughly. If it contains text (document, receipt, sign, note, whiteboard, book, label, etc.), transcribe all the text you can see and summarize the key information. If it's a photo or scene, describe what you see in detail and highlight anything important or useful. Be clear, organized, and complete.`;

      const result = await model.generateContent([
        prompt,
        { inlineData: { mimeType, data: base64Data } }
      ]);

      const text = result.response.text();
      res.json({ result: text });
    } catch (e: any) {
      console.error('[Camera Analyze]', e.message);
      res.status(500).json({ error: 'Analysis failed. Please try again.' });
    }
  });

  startProactiveDiagnostics();

  // Auto-lockdown on critical AI failure only (not database — Neon endpoints can sleep/disable)
  setInterval(async () => {
    const report = getLatestReport();
    if (report && !lockdownActive) {
      const aiFailures = report.results.filter(r =>
        r.status === 'fail' && r.check === 'AI Engine (Gemini)'
      );
      if (aiFailures.length > 0) {
        autoActivateLockdown('system_failure', `Critical infrastructure failure: AI Engine (Gemini)`);
      }
    }
  }, 5 * 60 * 1000); // check every 5 minutes

  // ══════════════════════════════════════════════════════════════════════════
  // ══ WORKGROUP SYSTEM (Enterprise/Research) ══════════════════════════════
  // ══════════════════════════════════════════════════════════════════════════

  async function getFullUser(req: any) {
    const userId = req.user?.claims?.sub;
    if (!userId) return null;
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    return user || null;
  }

  function isResearchOrEnterprise(user: any): boolean {
    const tier = user?.subscriptionTier;
    return tier === 'research' || tier === 'enterprise';
  }

  async function getWorkgroupRole(workgroupId: number, userId: string): Promise<string | null> {
    const member = await db.select().from(workgroupMembers).where(and(eq(workgroupMembers.workgroupId, workgroupId), eq(workgroupMembers.userId, userId))).limit(1);
    return member[0]?.role || null;
  }

  async function isOwnerOrAdmin(workgroupId: number, userId: string): Promise<boolean> {
    const role = await getWorkgroupRole(workgroupId, userId);
    return role === 'owner' || role === 'admin';
  }

  app.post('/api/workgroups', isAuthenticated, async (req: any, res) => {
    try {
      const user = await getFullUser(req);
      if (!user) return res.status(401).json({ error: 'User not found' });
      if (!isResearchOrEnterprise(user)) return res.status(403).json({ error: 'Research or Enterprise subscription required' });
      const { name, description, department } = req.body;
      if (!name?.trim()) return res.status(400).json({ error: 'Workgroup name is required' });

      const validDepts = ['general', 'billing', 'support', 'security', 'it', 'hr', 'sales', 'engineering', 'marketing', 'legal', 'operations'];
      const dept = validDepts.includes(department) ? department : 'general';

      const [wg] = await db.insert(workgroups).values({
        name: name.trim(),
        description: description?.trim() || '',
        ownerId: user.id,
        ownerEmail: user.email,
        department: dept,
      }).returning();

      await db.insert(workgroupMembers).values({
        workgroupId: wg.id,
        userId: user.id,
        userEmail: user.email,
        userName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
        role: 'owner',
      });

      res.json(wg);
    } catch (e: any) { console.error('[Workgroup] Create error:', e.message); res.status(500).json({ error: 'Failed to create workgroup' }); }
  });

  app.get('/api/workgroups', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const memberships = await db.select().from(workgroupMembers).where(and(eq(workgroupMembers.userId, userId), eq(workgroupMembers.isBlocked, false)));
      if (memberships.length === 0) return res.json([]);
      const wgIds = memberships.map(m => m.workgroupId);
      const wgs = await db.select().from(workgroups).where(or(...wgIds.map(id => eq(workgroups.id, id))));
      const result = wgs.map(wg => ({ ...wg, myRole: memberships.find(m => m.workgroupId === wg.id)?.role }));
      res.json(result);
    } catch (e: any) { res.status(500).json({ error: 'Failed to list workgroups' }); }
  });

  app.get('/api/workgroups/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const wgId = parseInt(req.params.id);
      const role = await getWorkgroupRole(wgId, userId);
      if (!role) return res.status(403).json({ error: 'Not a member' });
      const [wg] = await db.select().from(workgroups).where(eq(workgroups.id, wgId));
      if (!wg) return res.status(404).json({ error: 'Workgroup not found' });
      res.json({ ...wg, myRole: role });
    } catch (e: any) { res.status(500).json({ error: 'Failed to get workgroup' }); }
  });

  app.patch('/api/workgroups/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const wgId = parseInt(req.params.id);
      if (!(await isOwnerOrAdmin(wgId, userId))) return res.status(403).json({ error: 'Owner or admin required' });
      const { name, description, requireApproval } = req.body;
      const updates: any = { updatedAt: new Date() };
      if (name !== undefined) updates.name = name.trim();
      if (description !== undefined) updates.description = description.trim();
      if (requireApproval !== undefined) updates.requireApproval = !!requireApproval;
      const [wg] = await db.update(workgroups).set(updates).where(eq(workgroups.id, wgId)).returning();
      res.json(wg);
    } catch (e: any) { res.status(500).json({ error: 'Failed to update workgroup' }); }
  });

  app.get('/api/workgroups/:id/members', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const wgId = parseInt(req.params.id);
      const role = await getWorkgroupRole(wgId, userId);
      if (!role) return res.status(403).json({ error: 'Not a member' });
      const members = await db.select().from(workgroupMembers).where(eq(workgroupMembers.workgroupId, wgId));
      res.json(members);
    } catch (e: any) { res.status(500).json({ error: 'Failed to list members' }); }
  });

  app.post('/api/workgroups/:id/generate-code', isAuthenticated, async (req: any, res) => {
    try {
      const user = await getFullUser(req);
      if (!user) return res.status(401).json({ error: 'User not found' });
      const wgId = parseInt(req.params.id);
      if (!(await isOwnerOrAdmin(wgId, user.id))) return res.status(403).json({ error: 'Owner or admin required' });

      const existing = await db.select().from(workgroupInvites).where(and(eq(workgroupInvites.workgroupId, wgId), eq(workgroupInvites.status, 'pending'))).limit(1);
      if (existing.length > 0) {
        await db.delete(workgroupInvites).where(eq(workgroupInvites.id, existing[0].id));
      }

      const token = String(Math.floor(100000 + Math.random() * 900000));

      const [invite] = await db.insert(workgroupInvites).values({
        workgroupId: wgId,
        email: user.email,
        invitedBy: user.id,
        token,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      }).returning();

      res.json({ success: true, code: token });
    } catch (e: any) { console.error('[Workgroup] Generate code error:', e.message); res.status(500).json({ error: 'Failed to generate invite code' }); }
  });

  app.post('/api/workgroups/join', isAuthenticated, async (req: any, res) => {
    try {
      const user = await getFullUser(req);
      if (!user) return res.status(401).json({ error: 'User not found' });
      const { token } = req.body;
      console.log('[Workgroup] Join attempt by', user.email, 'with token:', token?.trim()?.slice(0, 8) + '...');
      if (!token?.trim()) return res.status(400).json({ error: 'Invite token is required' });

      const [invite] = await db.select().from(workgroupInvites).where(and(eq(workgroupInvites.token, token.trim()), eq(workgroupInvites.status, 'pending')));
      if (!invite) return res.status(404).json({ error: 'Invalid or expired invite code. It may have already been used or does not exist.' });
      if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
        await db.update(workgroupInvites).set({ status: 'expired' }).where(eq(workgroupInvites.id, invite.id));
        return res.status(400).json({ error: 'This invite has expired. Please ask for a new invitation.' });
      }

      const alreadyMember = await db.select().from(workgroupMembers).where(and(eq(workgroupMembers.workgroupId, invite.workgroupId), eq(workgroupMembers.userId, user.id))).limit(1);
      if (alreadyMember.length > 0) return res.status(400).json({ error: 'You are already a member of this workgroup' });

      const currentMembers = await db.select().from(workgroupMembers).where(eq(workgroupMembers.workgroupId, invite.workgroupId));
      if (currentMembers.length >= 20) return res.status(400).json({ error: 'This workgroup has reached the maximum of 20 members' });

      await db.update(workgroupInvites).set({ status: 'accepted' }).where(eq(workgroupInvites.id, invite.id));

      await db.insert(workgroupMembers).values({
        workgroupId: invite.workgroupId,
        userId: user.id,
        userEmail: user.email,
        userName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
        role: 'member',
      });

      const [wg] = await db.select().from(workgroups).where(eq(workgroups.id, invite.workgroupId));
      res.json({ success: true, workgroup: wg });
    } catch (e: any) { console.error('[Workgroup] Join error:', e.message); res.status(500).json({ error: 'Failed to join workgroup' }); }
  });

  app.post('/api/workgroups/:id/kick', isAuthenticated, async (req: any, res) => {
    try {
      const myUserId = req.user?.claims?.sub;
      const wgId = parseInt(req.params.id);
      if (!(await isOwnerOrAdmin(wgId, myUserId))) return res.status(403).json({ error: 'Owner or admin required' });
      const { userId } = req.body;
      const targetRole = await getWorkgroupRole(wgId, userId);
      if (targetRole === 'owner') return res.status(400).json({ error: 'Cannot kick the owner' });
      await db.delete(workgroupMembers).where(and(eq(workgroupMembers.workgroupId, wgId), eq(workgroupMembers.userId, userId)));
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: 'Failed to kick member' }); }
  });

  app.post('/api/workgroups/:id/block', isAuthenticated, async (req: any, res) => {
    try {
      const myUserId = req.user?.claims?.sub;
      const wgId = parseInt(req.params.id);
      if (!(await isOwnerOrAdmin(wgId, myUserId))) return res.status(403).json({ error: 'Owner or admin required' });
      const { userId, blocked } = req.body;
      const targetRole = await getWorkgroupRole(wgId, userId);
      if (targetRole === 'owner') return res.status(400).json({ error: 'Cannot block the owner' });
      await db.update(workgroupMembers).set({ isBlocked: !!blocked }).where(and(eq(workgroupMembers.workgroupId, wgId), eq(workgroupMembers.userId, userId)));
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: 'Failed to block/unblock member' }); }
  });

  app.post('/api/workgroups/:id/restrict', isAuthenticated, async (req: any, res) => {
    try {
      const myUserId = req.user?.claims?.sub;
      const wgId = parseInt(req.params.id);
      if (!(await isOwnerOrAdmin(wgId, myUserId))) return res.status(403).json({ error: 'Owner or admin required' });
      const { userId, restricted } = req.body;
      await db.update(workgroupMembers).set({ isRestricted: !!restricted }).where(and(eq(workgroupMembers.workgroupId, wgId), eq(workgroupMembers.userId, userId)));
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: 'Failed to restrict member' }); }
  });

  app.post('/api/workgroups/:id/role', isAuthenticated, async (req: any, res) => {
    try {
      const myUserId = req.user?.claims?.sub;
      const wgId = parseInt(req.params.id);
      const myRole = await getWorkgroupRole(wgId, myUserId);
      if (myRole !== 'owner') return res.status(403).json({ error: 'Only owner can change roles' });
      const { userId, role } = req.body;
      if (!['admin', 'member'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
      await db.update(workgroupMembers).set({ role }).where(and(eq(workgroupMembers.workgroupId, wgId), eq(workgroupMembers.userId, userId)));
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: 'Failed to change role' }); }
  });

  app.get('/api/workgroups/:id/members/:userId/history', isAuthenticated, async (req: any, res) => {
    try {
      const myUserId = req.user?.claims?.sub;
      const wgId = parseInt(req.params.id);
      if (!(await isOwnerOrAdmin(wgId, myUserId))) return res.status(403).json({ error: 'Owner or admin required' });
      const targetUserId = req.params.userId;
      const memberCheck = await db.select().from(workgroupMembers).where(and(eq(workgroupMembers.workgroupId, wgId), eq(workgroupMembers.userId, targetUserId))).limit(1);
      if (memberCheck.length === 0) return res.status(404).json({ error: 'User is not in this workgroup' });

      const convos = await db.select().from(conversations).where(eq(conversations.userId, targetUserId)).orderBy(desc(conversations.createdAt)).limit(50);
      const result = [];
      for (const c of convos) {
        const msgs = await db.select().from(messages).where(eq(messages.conversationId, c.id)).orderBy(messages.timestamp).limit(10);
        result.push({ conversation: c, messages: msgs });
      }
      res.json(result);
    } catch (e: any) { res.status(500).json({ error: 'Failed to get member history' }); }
  });

  app.post('/api/workgroups/:id/messages', isAuthenticated, async (req: any, res) => {
    try {
      const user = await getFullUser(req);
      if (!user) return res.status(401).json({ error: 'User not found' });
      const wgId = parseInt(req.params.id);
      const member = await db.select().from(workgroupMembers).where(and(eq(workgroupMembers.workgroupId, wgId), eq(workgroupMembers.userId, user.id))).limit(1);
      if (!member[0]) return res.status(403).json({ error: 'Not a member' });
      if (member[0].isBlocked) return res.status(403).json({ error: 'You are blocked from this workgroup' });
      if (member[0].isRestricted) return res.status(403).json({ error: 'You are restricted from messaging' });

      const { content, recipientId, messageType, fileName } = req.body;
      if (!content?.trim()) return res.status(400).json({ error: 'Message is required' });

      const type = recipientId ? 'private' : (messageType || 'group');

      const [msg] = await db.insert(workgroupMessages).values({
        workgroupId: wgId,
        senderId: user.id,
        senderName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
        senderEmail: user.email,
        recipientId: recipientId || null,
        content: content.trim(),
        messageType: type,
        fileName: fileName || null,
      }).returning();

      res.json(msg);
    } catch (e: any) { res.status(500).json({ error: 'Failed to send message' }); }
  });

  app.get('/api/workgroups/:id/messages', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const wgId = parseInt(req.params.id);
      const role = await getWorkgroupRole(wgId, userId);
      if (!role) return res.status(403).json({ error: 'Not a member' });

      const allMsgs = await db.select().from(workgroupMessages).where(eq(workgroupMessages.workgroupId, wgId)).orderBy(desc(workgroupMessages.createdAt)).limit(200);
      const filtered = allMsgs.filter(m =>
        m.messageType === 'group' ||
        m.senderId === userId ||
        m.recipientId === userId
      );
      res.json(filtered.reverse());
    } catch (e: any) { res.status(500).json({ error: 'Failed to get messages' }); }
  });

  app.get('/api/workgroups/:id/messages/dm/:userId', isAuthenticated, async (req: any, res) => {
    try {
      const myUserId = req.user?.claims?.sub;
      const wgId = parseInt(req.params.id);
      const role = await getWorkgroupRole(wgId, myUserId);
      if (!role) return res.status(403).json({ error: 'Not a member' });
      const otherUserId = req.params.userId;

      const allMsgs = await db.select().from(workgroupMessages).where(eq(workgroupMessages.workgroupId, wgId)).orderBy(workgroupMessages.createdAt).limit(500);
      const dms = allMsgs.filter(m =>
        m.messageType === 'private' &&
        ((m.senderId === myUserId && m.recipientId === otherUserId) ||
         (m.senderId === otherUserId && m.recipientId === myUserId))
      );
      res.json(dms);
    } catch (e: any) { res.status(500).json({ error: 'Failed to get DMs' }); }
  });

  app.post('/api/workgroups/:id/approvals', isAuthenticated, async (req: any, res) => {
    try {
      const user = await getFullUser(req);
      if (!user) return res.status(401).json({ error: 'User not found' });
      const wgId = parseInt(req.params.id);
      const role = await getWorkgroupRole(wgId, user.id);
      if (!role) return res.status(403).json({ error: 'Not a member' });

      const { contentType, content } = req.body;
      if (!contentType || !content) return res.status(400).json({ error: 'contentType and content required' });

      const [approval] = await db.insert(workgroupApprovals).values({
        workgroupId: wgId,
        requesterId: user.id,
        requesterName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
        contentType,
        content,
      }).returning();

      res.json(approval);
    } catch (e: any) { res.status(500).json({ error: 'Failed to submit for approval' }); }
  });

  app.get('/api/workgroups/:id/approvals', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const wgId = parseInt(req.params.id);
      if (!(await isOwnerOrAdmin(wgId, userId))) return res.status(403).json({ error: 'Owner or admin required' });
      const approvals = await db.select().from(workgroupApprovals).where(eq(workgroupApprovals.workgroupId, wgId)).orderBy(desc(workgroupApprovals.createdAt));
      res.json(approvals);
    } catch (e: any) { res.status(500).json({ error: 'Failed to get approvals' }); }
  });

  app.post('/api/workgroups/:id/approvals/:approvalId/review', isAuthenticated, async (req: any, res) => {
    try {
      const user = await getFullUser(req);
      if (!user) return res.status(401).json({ error: 'User not found' });
      const wgId = parseInt(req.params.id);
      if (!(await isOwnerOrAdmin(wgId, user.id))) return res.status(403).json({ error: 'Owner or admin required' });
      const approvalId = parseInt(req.params.approvalId);
      const { status, reviewNote } = req.body;
      if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ error: 'Status must be approved or rejected' });

      const [updated] = await db.update(workgroupApprovals).set({
        status,
        reviewedBy: user.id,
        reviewNote: reviewNote || null,
        reviewedAt: new Date(),
      }).where(and(eq(workgroupApprovals.id, approvalId), eq(workgroupApprovals.workgroupId, wgId))).returning();

      if (status === 'approved' && updated) {
        const reviewerName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
        await db.insert(workgroupMessages).values({
          workgroupId: wgId,
          senderId: updated.requesterId,
          senderName: updated.requesterName || 'Unknown',
          senderEmail: user.email,
          content: `✅ [Approved by ${reviewerName}]\n\n${updated.content}`,
          messageType: 'group',
        });
      }

      res.json(updated);
    } catch (e: any) { res.status(500).json({ error: 'Failed to review approval' }); }
  });

  app.post('/api/workgroups/:id/ai-summary', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const wgId = parseInt(req.params.id);
      const role = await getWorkgroupRole(wgId, userId);
      if (!role) return res.status(403).json({ error: 'Not a member' });

      const recentMsgs = await db.select().from(workgroupMessages).where(and(eq(workgroupMessages.workgroupId, wgId), eq(workgroupMessages.messageType, 'group'))).orderBy(desc(workgroupMessages.createdAt)).limit(100);

      if (recentMsgs.length === 0) return res.json({ summary: 'No messages to summarize yet.' });

      const chatText = recentMsgs.reverse().map(m => `${m.senderName}: ${m.content}`).join('\n');
      const geminiKey = process.env.GEMINI_API_KEY;
      if (!geminiKey) return res.status(500).json({ error: 'AI not configured' });

      const prompt = `You are a helpful team assistant. Below is a recent group chat conversation from a workgroup. Summarize what the team is planning, key decisions made, action items, and important topics discussed. Be concise and organized.\n\nChat:\n${chatText}\n\nProvide:\n1. Summary of discussion\n2. Key decisions\n3. Action items\n4. What the company/team appears to be planning`;

      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.2, maxOutputTokens: 2000 } }),
      });
      if (!r.ok) return res.status(500).json({ error: 'AI summary failed' });
      const data: any = await r.json();
      const summary = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Could not generate summary.';
      res.json({ summary });
    } catch (e: any) { res.status(500).json({ error: 'Failed to generate summary' }); }
  });

  app.post('/api/workgroups/:id/ai-ask', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const wgId = parseInt(req.params.id);
      const role = await getWorkgroupRole(wgId, userId);
      if (!role) return res.status(403).json({ error: 'Not a member' });

      const { question } = req.body;
      if (!question?.trim()) return res.status(400).json({ error: 'Question is required' });

      const recentMsgs = await db.select().from(workgroupMessages).where(and(eq(workgroupMessages.workgroupId, wgId), eq(workgroupMessages.messageType, 'group'))).orderBy(desc(workgroupMessages.createdAt)).limit(100);

      const chatText = recentMsgs.reverse().map(m => `${m.senderName}: ${m.content}`).join('\n');
      const geminiKey = process.env.GEMINI_API_KEY;
      if (!geminiKey) return res.status(500).json({ error: 'AI not configured' });

      const prompt = `You are a helpful assistant for a team workgroup. Here is the recent group conversation:\n\n${chatText}\n\nThe user asks: ${question}\n\nAnswer based on the conversation context. If the answer isn't in the conversation, say so.`;

      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.3, maxOutputTokens: 1500 } }),
      });
      if (!r.ok) return res.status(500).json({ error: 'AI query failed' });
      const data: any = await r.json();
      const answer = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Could not answer.';
      res.json({ answer });
    } catch (e: any) { res.status(500).json({ error: 'Failed to ask AI' }); }
  });

  app.post('/api/workgroups/:id/share-qa', isAuthenticated, async (req: any, res) => {
    try {
      const user = await getFullUser(req);
      if (!user) return res.status(401).json({ error: 'User not found' });
      const wgId = parseInt(req.params.id);
      const member = await db.select().from(workgroupMembers).where(and(eq(workgroupMembers.workgroupId, wgId), eq(workgroupMembers.userId, user.id))).limit(1);
      if (!member[0]) return res.status(403).json({ error: 'Not a member' });
      if (member[0].isBlocked) return res.status(403).json({ error: 'You are blocked from this workgroup' });
      if (member[0].isRestricted) return res.status(403).json({ error: 'You are restricted from sharing in this workgroup' });

      const { question, answer, mode } = req.body;
      if (!question?.trim() || !answer?.trim()) return res.status(400).json({ error: 'Question and answer are required' });

      const senderName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
      const formattedContent = `📋 Shared from TurboAnswer Chat\n\n❓ Question:\n${question.trim()}\n\n💡 AI Response:\n${answer.trim()}`;

      if (mode === 'approval') {
        const [approval] = await db.insert(workgroupApprovals).values({
          workgroupId: wgId,
          requesterId: user.id,
          requesterName: senderName,
          contentType: 'ai_qa',
          content: formattedContent,
        }).returning();
        return res.json({ success: true, type: 'approval', approval });
      }

      const [msg] = await db.insert(workgroupMessages).values({
        workgroupId: wgId,
        senderId: user.id,
        senderName,
        senderEmail: user.email,
        content: formattedContent,
        messageType: 'group',
      }).returning();

      res.json({ success: true, type: 'message', message: msg });
    } catch (e: any) { console.error('[Workgroup] Share Q&A error:', e.message); res.status(500).json({ error: 'Failed to share Q&A' }); }
  });

  async function classifyTicket(subject: string, context?: string): Promise<{ category: string; department: string; priority: string }> {
    const departments = ['billing', 'engineering', 'support', 'hr', 'sales', 'legal', 'general'];
    const categories = ['billing', 'refund', 'payment', 'bug', 'feature_request', 'account', 'access', 'performance', 'security', 'general'];
    try {
      const { generateAIResponse } = await import('./services/multi-ai.js');
      const prompt = `Classify this support ticket. Return ONLY a JSON object, no markdown.

Subject: ${subject}
${context ? `Context: ${context.slice(0, 500)}` : ''}

Return exactly: {"category":"<one of: ${categories.join(', ')}>","department":"<one of: ${departments.join(', ')}>","priority":"<low|normal|high|urgent>"}

Rules:
- Anything about cost, billing, charges, subscription, payment, refund, invoice → department: "billing", category: "billing" or "refund" or "payment"
- Bug reports, errors, crashes → department: "engineering", category: "bug"
- Feature requests → department: "engineering", category: "feature_request"
- Account access, login, permissions → department: "support", category: "account" or "access"
- Security concerns → department: "engineering", category: "security", priority: "high"
- If unclear, use department: "general", category: "general"`;

      const rawResult = await generateAIResponse(prompt, [], 'gpt-4o-mini');
      const result = typeof rawResult === 'object' ? rawResult.text : rawResult;
      const cleaned = result.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      return {
        category: categories.includes(parsed.category) ? parsed.category : 'general',
        department: departments.includes(parsed.department) ? parsed.department : 'general',
        priority: ['low', 'normal', 'high', 'urgent'].includes(parsed.priority) ? parsed.priority : 'normal',
      };
    } catch (e) {
      console.error('[AI Classify] Failed:', e);
      const text = `${subject} ${context || ''}`.toLowerCase();
      const isBilling = /bill|cost|charge|payment|refund|invoice|subscription|price|fee/.test(text);
      const isBug = /bug|error|crash|broken|not working|fail/.test(text);
      return {
        category: isBilling ? 'billing' : isBug ? 'bug' : 'general',
        department: isBilling ? 'billing' : isBug ? 'engineering' : 'general',
        priority: /urgent|asap|critical|emergency/.test(text) ? 'high' : 'normal',
      };
    }
  }

  app.post('/api/workgroups/:id/support-tickets', isAuthenticated, async (req: any, res) => {
    try {
      const user = await getFullUser(req);
      if (!user) return res.status(401).json({ error: 'User not found' });
      const wgId = parseInt(req.params.id);
      const member = await db.select().from(workgroupMembers).where(and(eq(workgroupMembers.workgroupId, wgId), eq(workgroupMembers.userId, user.id))).limit(1);
      if (!member[0]) return res.status(403).json({ error: 'Not a member' });

      if (member[0].isBlocked) return res.status(403).json({ error: 'You are blocked from this workgroup' });

      const { subject, context, priority } = req.body;
      if (!subject?.trim()) return res.status(400).json({ error: 'Subject is required' });

      const senderName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;

      const classification = await classifyTicket(subject.trim(), context?.trim());

      const allWorkgroups = await db.select().from(workgroups).where(eq(workgroups.ownerId, (await db.select().from(workgroups).where(eq(workgroups.id, wgId)))[0]?.ownerId || ''));
      let targetWgId = wgId;
      const deptMatch = allWorkgroups.find(wg => wg.department === classification.department && wg.id !== wgId);
      if (deptMatch) {
        const isMemberOfTarget = await db.select().from(workgroupMembers).where(and(eq(workgroupMembers.workgroupId, deptMatch.id), eq(workgroupMembers.userId, user.id))).limit(1);
        if (isMemberOfTarget[0]) {
          targetWgId = deptMatch.id;
        }
      }

      const admins = await db.select().from(workgroupMembers).where(and(eq(workgroupMembers.workgroupId, targetWgId), or(eq(workgroupMembers.role, 'owner'), eq(workgroupMembers.role, 'admin'))));
      const assignedAdmin = admins[0] || null;

      const [ticket] = await db.insert(supportTickets).values({
        workgroupId: targetWgId,
        requesterId: user.id,
        requesterName: senderName,
        assignedTo: assignedAdmin?.userId || null,
        assignedName: assignedAdmin?.userName || null,
        subject: subject.trim(),
        context: context?.trim() || null,
        priority: priority || classification.priority,
        category: classification.category,
        department: classification.department,
      }).returning();

      await db.insert(supportTicketMessages).values({
        ticketId: ticket.id,
        senderId: user.id,
        senderName,
        content: context?.trim() || subject.trim(),
      });

      const deptLabel = classification.department.charAt(0).toUpperCase() + classification.department.slice(1);
      const catLabel = classification.category.replace(/_/g, ' ');
      const routedNote = targetWgId !== wgId ? `\n📌 Auto-routed to ${deptLabel} department` : '';

      await db.insert(workgroupMessages).values({
        workgroupId: targetWgId,
        senderId: user.id,
        senderName: 'System',
        senderEmail: user.email,
        content: `🎫 New Support Ticket #${ticket.id}\n\nFrom: ${senderName}\nSubject: ${subject.trim()}\nCategory: ${catLabel}\nDepartment: ${deptLabel}\nPriority: ${ticket.priority}${routedNote}\n\nReview this ticket in the Support tab.`,
        messageType: 'group',
      });

      for (const admin of admins) {
        await db.insert(ticketNotifications).values({
          userId: admin.userId,
          ticketId: ticket.id,
          workgroupId: targetWgId,
          title: `New Ticket: ${subject.trim().slice(0, 60)}`,
          body: `From ${senderName} · ${deptLabel} · ${catLabel}`,
          type: 'new_ticket',
        });
      }

      res.json({ success: true, ticket, routed: targetWgId !== wgId, targetWorkgroup: targetWgId });
    } catch (e: any) { console.error('[Support] Create ticket error:', e.message); res.status(500).json({ error: 'Failed to create ticket' }); }
  });

  app.get('/api/workgroups/:id/support-tickets', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const wgId = parseInt(req.params.id);
      const member = await db.select().from(workgroupMembers).where(and(eq(workgroupMembers.workgroupId, wgId), eq(workgroupMembers.userId, userId))).limit(1);
      if (!member[0]) return res.status(403).json({ error: 'Not a member' });
      const isAdmin = member[0].role === 'owner' || member[0].role === 'admin';
      let tickets;
      if (isAdmin) {
        tickets = await db.select().from(supportTickets).where(eq(supportTickets.workgroupId, wgId)).orderBy(desc(supportTickets.createdAt));
      } else {
        tickets = await db.select().from(supportTickets).where(and(eq(supportTickets.workgroupId, wgId), eq(supportTickets.requesterId, userId))).orderBy(desc(supportTickets.createdAt));
      }
      res.json(tickets);
    } catch (e: any) { res.status(500).json({ error: 'Failed to list tickets' }); }
  });

  app.get('/api/support-tickets/:ticketId/messages', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const ticketId = parseInt(req.params.ticketId);
      const [ticket] = await db.select().from(supportTickets).where(eq(supportTickets.id, ticketId));
      if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
      const member = await db.select().from(workgroupMembers).where(and(eq(workgroupMembers.workgroupId, ticket.workgroupId), eq(workgroupMembers.userId, userId))).limit(1);
      if (!member[0]) return res.status(403).json({ error: 'Not a member' });
      const isAdmin = member[0].role === 'owner' || member[0].role === 'admin';
      if (!isAdmin && ticket.requesterId !== userId) return res.status(403).json({ error: 'Not authorized' });

      const msgs = await db.select().from(supportTicketMessages).where(eq(supportTicketMessages.ticketId, ticketId)).orderBy(supportTicketMessages.createdAt);
      res.json(msgs);
    } catch (e: any) { res.status(500).json({ error: 'Failed to get ticket messages' }); }
  });

  app.post('/api/support-tickets/:ticketId/messages', isAuthenticated, async (req: any, res) => {
    try {
      const user = await getFullUser(req);
      if (!user) return res.status(401).json({ error: 'User not found' });
      const ticketId = parseInt(req.params.ticketId);
      const [ticket] = await db.select().from(supportTickets).where(eq(supportTickets.id, ticketId));
      if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
      if (ticket.status === 'resolved') return res.status(400).json({ error: 'Ticket is resolved' });
      const member = await db.select().from(workgroupMembers).where(and(eq(workgroupMembers.workgroupId, ticket.workgroupId), eq(workgroupMembers.userId, user.id))).limit(1);
      if (!member[0]) return res.status(403).json({ error: 'Not a member' });
      const isAdmin = member[0].role === 'owner' || member[0].role === 'admin';
      if (!isAdmin && ticket.requesterId !== user.id) return res.status(403).json({ error: 'Not authorized' });
      if (member[0].isBlocked) return res.status(403).json({ error: 'You are blocked from this workgroup' });

      const { content } = req.body;
      if (!content?.trim()) return res.status(400).json({ error: 'Message is required' });

      const senderName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
      const [msg] = await db.insert(supportTicketMessages).values({
        ticketId,
        senderId: user.id,
        senderName,
        content: content.trim(),
      }).returning();

      const notifyUserId = isAdmin ? ticket.requesterId : (ticket.assignedTo || null);
      if (notifyUserId && notifyUserId !== user.id) {
        await db.insert(ticketNotifications).values({
          userId: notifyUserId,
          ticketId: ticket.id,
          workgroupId: ticket.workgroupId,
          title: `Reply on Ticket #${ticket.id}`,
          body: `${senderName}: ${content.trim().slice(0, 80)}`,
          type: 'ticket_reply',
        });
      }

      res.json(msg);
    } catch (e: any) { res.status(500).json({ error: 'Failed to send message' }); }
  });

  app.post('/api/support-tickets/:ticketId/resolve', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const ticketId = parseInt(req.params.ticketId);
      const [ticket] = await db.select().from(supportTickets).where(eq(supportTickets.id, ticketId));
      if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
      const member = await db.select().from(workgroupMembers).where(and(eq(workgroupMembers.workgroupId, ticket.workgroupId), eq(workgroupMembers.userId, userId))).limit(1);
      if (!member[0]) return res.status(403).json({ error: 'Not a member' });
      const isAdmin = member[0].role === 'owner' || member[0].role === 'admin';
      if (!isAdmin && ticket.requesterId !== userId) return res.status(403).json({ error: 'Not authorized' });

      const [updated] = await db.update(supportTickets).set({ status: 'resolved', resolvedAt: new Date() }).where(eq(supportTickets.id, ticketId)).returning();
      res.json(updated);
    } catch (e: any) { res.status(500).json({ error: 'Failed to resolve ticket' }); }
  });

  app.patch('/api/workgroups/:id/department', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const wgId = parseInt(req.params.id);
      const role = await getWorkgroupRole(wgId, userId);
      if (role !== 'owner' && role !== 'admin') return res.status(403).json({ error: 'Admin only' });
      const { department } = req.body;
      const validDepts = ['general', 'billing', 'engineering', 'support', 'hr', 'sales', 'legal', 'security', 'it', 'marketing', 'operations'];
      if (!validDepts.includes(department)) return res.status(400).json({ error: 'Invalid department' });
      const [updated] = await db.update(workgroups).set({ department }).where(eq(workgroups.id, wgId)).returning();
      res.json(updated);
    } catch (e: any) { res.status(500).json({ error: 'Failed to update department' }); }
  });

  app.get('/api/notifications', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const notifs = await db.select().from(ticketNotifications)
        .where(and(eq(ticketNotifications.userId, userId), eq(ticketNotifications.dismissed, false)))
        .orderBy(desc(ticketNotifications.createdAt));
      res.json(notifs);
    } catch (e: any) { res.status(500).json({ error: 'Failed to get notifications' }); }
  });

  app.post('/api/notifications/:id/dismiss', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const notifId = parseInt(req.params.id);
      await db.update(ticketNotifications)
        .set({ dismissed: true })
        .where(and(eq(ticketNotifications.id, notifId), eq(ticketNotifications.userId, userId)));
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: 'Failed to dismiss' }); }
  });

  app.post('/api/notifications/dismiss-all', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      await db.update(ticketNotifications)
        .set({ dismissed: true })
        .where(and(eq(ticketNotifications.userId, userId), eq(ticketNotifications.dismissed, false)));
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: 'Failed to dismiss all' }); }
  });

  app.post('/api/workgroups/:id/leave', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const wgId = parseInt(req.params.id);
      const role = await getWorkgroupRole(wgId, userId);
      if (!role) return res.status(404).json({ error: 'Not a member' });
      if (role === 'owner') return res.status(400).json({ error: 'Owner cannot leave. Transfer ownership first or delete the workgroup.' });
      await db.delete(workgroupMembers).where(and(eq(workgroupMembers.workgroupId, wgId), eq(workgroupMembers.userId, userId)));
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: 'Failed to leave workgroup' }); }
  });

  app.delete('/api/workgroups/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const wgId = parseInt(req.params.id);
      const role = await getWorkgroupRole(wgId, userId);
      if (role !== 'owner') return res.status(403).json({ error: 'Only the owner can delete a workgroup' });
      await db.delete(workgroupMessages).where(eq(workgroupMessages.workgroupId, wgId));
      await db.delete(workgroupApprovals).where(eq(workgroupApprovals.workgroupId, wgId));
      await db.delete(workgroupInvites).where(eq(workgroupInvites.workgroupId, wgId));
      await db.delete(workgroupMembers).where(eq(workgroupMembers.workgroupId, wgId));
      await db.delete(workgroups).where(eq(workgroups.id, wgId));
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: 'Failed to delete workgroup' }); }
  });

  // ============ AI DEBATE ARENA ============

  app.post('/api/debates', isAuthenticated, async (req: any, res) => {
    try {
      const user = await getFullUser(req);
      if (!user) return res.status(401).json({ error: 'User not found' });
      const { topic, modelA, modelB, rounds } = req.body;
      if (!topic?.trim()) return res.status(400).json({ error: 'Topic is required' });

      const validModels = ['gemini', 'claude', 'openai', 'deepseek'];
      const mA = validModels.includes(modelA) ? modelA : 'gemini';
      const mB = validModels.includes(modelB) ? modelB : 'claude';
      const numRounds = Math.min(Math.max(parseInt(rounds) || 3, 1), 5);

      const [debate] = await db.insert(debateSessions).values({
        topic: topic.trim(),
        creatorId: user.id,
        modelA: mA,
        modelB: mB,
        rounds: numRounds,
      }).returning();

      res.json(debate);
    } catch (e: any) { console.error('[Debate] Create error:', e.message); res.status(500).json({ error: 'Failed to create debate' }); }
  });

  app.get('/api/debates', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const debates = await db.select().from(debateSessions).where(eq(debateSessions.creatorId, userId)).orderBy(desc(debateSessions.createdAt));
      res.json(debates);
    } catch (e: any) { res.status(500).json({ error: 'Failed to fetch debates' }); }
  });

  app.get('/api/debates/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const [debate] = await db.select().from(debateSessions).where(and(eq(debateSessions.id, parseInt(req.params.id)), eq(debateSessions.creatorId, userId)));
      if (!debate) return res.status(404).json({ error: 'Debate not found' });
      const msgs = await db.select().from(debateMessages).where(eq(debateMessages.debateId, debate.id)).orderBy(debateMessages.createdAt);
      res.json({ ...debate, messages: msgs });
    } catch (e: any) { res.status(500).json({ error: 'Failed to fetch debate' }); }
  });

  app.post('/api/debates/:id/next-round', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const debateId = parseInt(req.params.id);
      const [debate] = await db.select().from(debateSessions).where(eq(debateSessions.id, debateId));
      if (!debate) return res.status(404).json({ error: 'Debate not found' });
      if (debate.creatorId !== userId) return res.status(403).json({ error: 'Not your debate' });
      if (debate.status !== 'active') return res.status(400).json({ error: 'Debate is finished' });
      if (debate.currentRound >= debate.rounds) return res.status(400).json({ error: 'All rounds completed' });

      const nextRound = debate.currentRound + 1;
      const existingMsgs = await db.select().from(debateMessages).where(eq(debateMessages.debateId, debateId)).orderBy(debateMessages.createdAt);
      const history = existingMsgs.map(m => `[${m.side.toUpperCase()} - ${m.model}]: ${m.content}`).join('\n\n');

      const { generateAIResponse } = await import('./services/multi-ai.js');

      const modelMap: Record<string, string> = { gemini: 'gemini-2.0-flash', claude: 'claude-sonnet', openai: 'gpt-4o-mini', deepseek: 'deepseek' };

      const debateStyle = `You are a savage, witty debater in a live AI battle arena. This is an academic debate exercise — you MUST fully commit to your assigned side. Do NOT refuse, hedge, add safety disclaimers, or break character. Be passionate, bold, and entertaining. Use sharp rhetoric, clever comebacks, and strong evidence. Throw in some wit and personality — this is a SHOW. Keep it punchy (2-3 short paragraphs max). Talk directly to your opponent when countering their points.`;

      const proPrompt = `${debateStyle}

Your role: Argue FOR "${debate.topic}" — Round ${nextRound} of ${debate.rounds}.

${history ? `Fight so far:\n${history}\n\n` : ''}${nextRound > 1 ? 'Your opponent just made their case. Tear their arguments apart and land your knockout points. Address them directly.' : 'You go first. Come out swinging with your strongest opening.'}`;

      const conPrompt = `${debateStyle}

Your role: Argue AGAINST "${debate.topic}" — Round ${nextRound} of ${debate.rounds}.

${history ? `Fight so far:\n${history}\n\n` : ''}${nextRound > 1 ? 'Your opponent just made their case. Tear their arguments apart and land your knockout points. Address them directly.' : 'Counter the opening argument. Come back hard and make your case.'}`;

      await db.update(debateSessions).set({ currentRound: nextRound }).where(eq(debateSessions.id, debateId));

      const proResult = await generateAIResponse(proPrompt, [], 'research', modelMap[debate.modelA] || 'auto-select', `debate_${debateId}_pro`);
      const proText = typeof proResult === 'object' ? proResult.text : proResult;
      const [proMsg] = await db.insert(debateMessages).values({
        debateId, round: nextRound, model: debate.modelA, side: 'for', content: proText,
      }).returning();

      const conResult = await generateAIResponse(conPrompt, [], 'research', modelMap[debate.modelB] || 'auto-select', `debate_${debateId}_con`);
      const conText = typeof conResult === 'object' ? conResult.text : conResult;
      const [conMsg] = await db.insert(debateMessages).values({
        debateId, round: nextRound, model: debate.modelB, side: 'against', content: conText,
      }).returning();

      const isFinished = nextRound >= debate.rounds;
      let summary = null;

      if (isFinished) {
        const allMsgs = [...existingMsgs, proMsg, conMsg];
        const fullHistory = allMsgs.map(m => `[${m.side.toUpperCase()} - ${m.model}]: ${m.content}`).join('\n\n');
        const summaryPrompt = `You are an entertaining fight commentator wrapping up an epic AI debate battle. Give a dramatic, fun summary of the fight. Who landed the best blows? Who had the crowd going? Declare a winner with flair.

Topic: "${debate.topic}"

The full fight transcript:
${fullHistory}

Give us: 1) The highlight moments from each fighter 2) Who argued better and why 3) A dramatic winner declaration. Keep it entertaining!`;
        const summaryResult = await generateAIResponse(summaryPrompt, [], 'research');
        summary = typeof summaryResult === 'object' ? summaryResult.text : summaryResult;

        await db.update(debateSessions).set({ status: 'completed', summary }).where(eq(debateSessions.id, debateId));
      }

      const updatedDebate = await db.select().from(debateSessions).where(eq(debateSessions.id, debateId));
      const allMessages = await db.select().from(debateMessages).where(eq(debateMessages.debateId, debateId)).orderBy(debateMessages.createdAt);

      res.json({ ...updatedDebate[0], messages: allMessages });
    } catch (e: any) { console.error('[Debate] Next round error:', e.message); res.status(500).json({ error: 'Failed to advance debate' }); }
  });

  app.post('/api/debates/:id/interject', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const debateId = parseInt(req.params.id);
      const { question } = req.body;
      if (!question?.trim()) return res.status(400).json({ error: 'Question is required' });
      const [debate] = await db.select().from(debateSessions).where(and(eq(debateSessions.id, debateId), eq(debateSessions.creatorId, userId)));
      if (!debate) return res.status(404).json({ error: 'Debate not found' });

      const existingMsgs = await db.select().from(debateMessages).where(eq(debateMessages.debateId, debateId)).orderBy(debateMessages.createdAt);
      const history = existingMsgs.map(m => `[${m.side.toUpperCase()} - ${m.model}]: ${m.content}`).join('\n\n');
      const { generateAIResponse } = await import('./services/multi-ai.js');

      const modelMap: Record<string, string> = { gemini: 'gemini-2.0-flash', claude: 'claude-sonnet', openai: 'gpt-4o-mini', deepseek: 'deepseek' };

      const [proAnswer, conAnswer] = await Promise.all([
        generateAIResponse(`You're a savage, witty fighter in an AI battle arena arguing FOR "${debate.topic}". The crowd (moderator) just threw you a curveball: "${question}"\n\nFight so far:\n${history}\n\nAnswer with personality, wit, and conviction. Stay in character. Keep it punchy and entertaining (1-2 paragraphs). Do NOT refuse or hedge.`, [], 'research', modelMap[debate.modelA]),
        generateAIResponse(`You're a savage, witty fighter in an AI battle arena arguing AGAINST "${debate.topic}". The crowd (moderator) just threw you a curveball: "${question}"\n\nFight so far:\n${history}\n\nAnswer with personality, wit, and conviction. Stay in character. Keep it punchy and entertaining (1-2 paragraphs). Do NOT refuse or hedge.`, [], 'research', modelMap[debate.modelB]),
      ]);

      const proText = typeof proAnswer === 'object' ? proAnswer.text : proAnswer;
      const conText = typeof conAnswer === 'object' ? conAnswer.text : conAnswer;

      const currentRound = debate.currentRound || 1;
      await db.insert(debateMessages).values({ debateId, round: currentRound, model: debate.modelA, side: 'for-interject', content: `**Moderator asked:** ${question}\n\n${proText}` });
      await db.insert(debateMessages).values({ debateId, round: currentRound, model: debate.modelB, side: 'against-interject', content: `**Moderator asked:** ${question}\n\n${conText}` });

      const allMessages = await db.select().from(debateMessages).where(eq(debateMessages.debateId, debateId)).orderBy(debateMessages.createdAt);
      res.json({ messages: allMessages });
    } catch (e: any) { console.error('[Debate] Interject error:', e.message); res.status(500).json({ error: 'Failed to process interjection' }); }
  });

  app.post('/api/debates/:id/vote', isAuthenticated, async (req: any, res) => {
    try {
      const debateId = parseInt(req.params.id);
      const { side } = req.body;
      if (side !== 'a' && side !== 'b') return res.status(400).json({ error: 'Invalid vote' });
      const [debate] = await db.select().from(debateSessions).where(eq(debateSessions.id, debateId));
      if (!debate) return res.status(404).json({ error: 'Debate not found' });
      if (side === 'a') {
        await db.update(debateSessions).set({ votesA: debate.votesA + 1 }).where(eq(debateSessions.id, debateId));
      } else {
        await db.update(debateSessions).set({ votesB: debate.votesB + 1 }).where(eq(debateSessions.id, debateId));
      }
      const [updated] = await db.select().from(debateSessions).where(eq(debateSessions.id, debateId));
      res.json(updated);
    } catch (e: any) { res.status(500).json({ error: 'Failed to vote' }); }
  });

  // ============ COLLABORATIVE AI ROOMS ============

  app.post('/api/collab-rooms', isAuthenticated, async (req: any, res) => {
    try {
      const user = await getFullUser(req);
      if (!user) return res.status(401).json({ error: 'User not found' });
      const { name } = req.body;
      if (!name?.trim()) return res.status(400).json({ error: 'Room name is required' });

      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'User';

      const [room] = await db.insert(collabRooms).values({
        name: name.trim(),
        code,
        creatorId: user.id,
        creatorName: userName,
      }).returning();

      await db.insert(collabRoomMembers).values({
        roomId: room.id,
        userId: user.id,
        userName,
      });

      res.json(room);
    } catch (e: any) { console.error('[Collab] Create error:', e.message); res.status(500).json({ error: 'Failed to create room' }); }
  });

  app.get('/api/collab-rooms', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const memberOf = await db.select().from(collabRoomMembers).where(eq(collabRoomMembers.userId, userId));
      const roomIds = memberOf.map(m => m.roomId);
      if (roomIds.length === 0) return res.json([]);
      const rooms = await db.select().from(collabRooms).where(inArray(collabRooms.id, roomIds)).orderBy(desc(collabRooms.createdAt));
      const roomsWithCounts = await Promise.all(rooms.map(async (room) => {
        const members = await db.select().from(collabRoomMembers).where(eq(collabRoomMembers.roomId, room.id));
        return { ...room, memberCount: members.length };
      }));
      res.json(roomsWithCounts);
    } catch (e: any) { res.status(500).json({ error: 'Failed to fetch rooms' }); }
  });

  app.post('/api/collab-rooms/join', isAuthenticated, async (req: any, res) => {
    try {
      const user = await getFullUser(req);
      if (!user) return res.status(401).json({ error: 'User not found' });
      const { code } = req.body;
      if (!code?.trim()) return res.status(400).json({ error: 'Room code is required' });

      const [room] = await db.select().from(collabRooms).where(eq(collabRooms.code, code.trim().toUpperCase()));
      if (!room) return res.status(404).json({ error: 'Room not found' });
      if (!room.isActive) return res.status(400).json({ error: 'Room is closed' });

      const existing = await db.select().from(collabRoomMembers).where(and(eq(collabRoomMembers.roomId, room.id), eq(collabRoomMembers.userId, user.id)));
      if (existing.length > 0) return res.json(room);

      const memberCount = await db.select().from(collabRoomMembers).where(eq(collabRoomMembers.roomId, room.id));
      if (memberCount.length >= room.maxMembers) return res.status(400).json({ error: 'Room is full' });

      const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'User';
      await db.insert(collabRoomMembers).values({ roomId: room.id, userId: user.id, userName });

      await db.insert(collabRoomMessages).values({
        roomId: room.id,
        senderId: 'system',
        senderName: 'System',
        content: `${userName} joined the room`,
        role: 'system',
      });

      res.json(room);
    } catch (e: any) { console.error('[Collab] Join error:', e.message); res.status(500).json({ error: 'Failed to join room' }); }
  });

  app.get('/api/collab-rooms/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const roomId = parseInt(req.params.id);
      const membership = await db.select().from(collabRoomMembers).where(and(eq(collabRoomMembers.roomId, roomId), eq(collabRoomMembers.userId, userId)));
      if (membership.length === 0) return res.status(403).json({ error: 'Not a member of this room' });
      const [room] = await db.select().from(collabRooms).where(eq(collabRooms.id, roomId));
      if (!room) return res.status(404).json({ error: 'Room not found' });
      const members = await db.select().from(collabRoomMembers).where(eq(collabRoomMembers.roomId, roomId));
      const msgs = await db.select().from(collabRoomMessages).where(eq(collabRoomMessages.roomId, roomId)).orderBy(collabRoomMessages.createdAt);
      res.json({ ...room, members, messages: msgs });
    } catch (e: any) { res.status(500).json({ error: 'Failed to fetch room' }); }
  });

  app.get('/api/collab-rooms/:id/messages', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const roomId = parseInt(req.params.id);
      const membership = await db.select().from(collabRoomMembers).where(and(eq(collabRoomMembers.roomId, roomId), eq(collabRoomMembers.userId, userId)));
      if (membership.length === 0) return res.status(403).json({ error: 'Not a member of this room' });
      const after = req.query.after ? parseInt(req.query.after) : 0;
      const msgs = await db.select().from(collabRoomMessages).where(and(eq(collabRoomMessages.roomId, roomId), after > 0 ? gt(collabRoomMessages.id, after) : undefined)).orderBy(collabRoomMessages.createdAt);
      res.json(msgs);
    } catch (e: any) { res.status(500).json({ error: 'Failed to fetch messages' }); }
  });

  app.post('/api/collab-rooms/:id/messages', isAuthenticated, async (req: any, res) => {
    try {
      const user = await getFullUser(req);
      if (!user) return res.status(401).json({ error: 'User not found' });
      const roomId = parseInt(req.params.id);
      const { content } = req.body;
      if (!content?.trim()) return res.status(400).json({ error: 'Message is required' });

      const member = await db.select().from(collabRoomMembers).where(and(eq(collabRoomMembers.roomId, roomId), eq(collabRoomMembers.userId, user.id)));
      if (member.length === 0) return res.status(403).json({ error: 'Not a member of this room' });

      const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'User';
      const [userMsg] = await db.insert(collabRoomMessages).values({
        roomId, senderId: user.id, senderName: userName, content: content.trim(), role: 'user',
      }).returning();

      const isAIPrompt = content.trim().startsWith('@ai ') || content.trim().startsWith('/ai ');
      if (isAIPrompt) {
        const aiQuery = content.trim().replace(/^[@/]ai\s+/i, '');
        const recentMsgs = await db.select().from(collabRoomMessages).where(eq(collabRoomMessages.roomId, roomId)).orderBy(desc(collabRoomMessages.createdAt)).limit(20);
        const contextMsgs = recentMsgs.reverse().map(m => ({ role: m.role === 'assistant' ? 'assistant' as const : 'user' as const, content: `${m.senderName}: ${m.content}` }));

        const { generateAIResponse } = await import('./services/multi-ai.js');
        const userTier = user.subscriptionTier || 'free';
        const aiResult = await generateAIResponse(
          `In a collaborative room, ${userName} asks: ${aiQuery}\n\nRoom context (recent messages from all participants):\n${contextMsgs.map(m => m.content).join('\n')}\n\nRespond helpfully to the question, considering the room context.`,
          [], userTier
        );
        const aiText = typeof aiResult === 'object' ? aiResult.text : aiResult;

        const [aiMsg] = await db.insert(collabRoomMessages).values({
          roomId, senderId: 'ai', senderName: 'TurboAnswer AI', content: aiText, role: 'assistant',
        }).returning();

        return res.json({ userMessage: userMsg, aiMessage: aiMsg });
      }

      res.json({ userMessage: userMsg });
    } catch (e: any) { console.error('[Collab] Message error:', e.message); res.status(500).json({ error: 'Failed to send message' }); }
  });

  // ============ AI FACT-CHECK CHAIN ============

  app.post('/api/fact-check', isAuthenticated, async (req: any, res) => {
    try {
      const user = await getFullUser(req);
      if (!user) return res.status(401).json({ error: 'User not found' });
      const { messageId, content } = req.body;
      if (!content?.trim()) return res.status(400).json({ error: 'Content is required' });
      if (!messageId || typeof messageId !== 'number') return res.status(400).json({ error: 'Valid messageId is required' });

      const [msg] = await db.select().from(messages).where(eq(messages.id, messageId));
      if (msg) {
        const [conv] = await db.select().from(conversations).where(eq(conversations.id, msg.conversationId));
        if (conv && conv.userId !== user.id) return res.status(403).json({ error: 'Not your message' });
      }

      const existing = await db.select().from(factChecks).where(eq(factChecks.messageId, messageId));
      if (existing.length > 0) return res.json(existing[0]);

      const { generateAIResponse } = await import('./services/multi-ai.js');

      const factCheckPrompt = `You are a fact-checking AI. Analyze the following text and verify each factual claim. Return ONLY a valid JSON object, no markdown.

Text to fact-check:
"""
${content.slice(0, 3000)}
"""

Return exactly this JSON structure:
{
  "verdict": "<VERIFIED|PARTIALLY_VERIFIED|UNVERIFIED|MIXED>",
  "confidenceScore": <0-100>,
  "claims": [
    {
      "claim": "<extracted factual claim>",
      "status": "<verified|unverified|partially_verified|opinion|unable_to_verify>",
      "confidence": <0-100>,
      "explanation": "<brief explanation of verification>"
    }
  ],
  "summary": "<2-3 sentence overall assessment>"
}

Rules:
- Extract ALL factual claims from the text (at least 1, up to 10)
- Opinions and subjective statements should be marked as "opinion"
- If you cannot verify a claim, use "unable_to_verify"
- Be conservative with confidence scores
- The overall verdict should reflect the majority of claims`;

      const result = await generateAIResponse(factCheckPrompt, [], 'research', 'gemini-2.0-flash');
      const resultText = typeof result === 'object' ? result.text : result;
      const cleaned = resultText.replace(/```json?\n?/g, '').replace(/```/g, '').trim();

      let parsed;
      try {
        parsed = JSON.parse(cleaned);
      } catch {
        parsed = {
          verdict: 'UNABLE_TO_VERIFY',
          confidenceScore: 0,
          claims: [{ claim: 'Unable to parse fact-check results', status: 'unable_to_verify', confidence: 0, explanation: 'The AI response could not be parsed' }],
          summary: 'Fact-check analysis could not be completed. Please try again.',
        };
      }

      const validVerdicts = ['VERIFIED', 'PARTIALLY_VERIFIED', 'UNVERIFIED', 'MIXED', 'UNABLE_TO_VERIFY'];
      const verdict = validVerdicts.includes(parsed.verdict) ? parsed.verdict : 'MIXED';
      const confidence = Math.min(100, Math.max(0, parseInt(parsed.confidenceScore) || 50));

      const [factCheck] = await db.insert(factChecks).values({
        messageId: messageId || 0,
        originalContent: content.slice(0, 5000),
        verdict,
        confidenceScore: confidence,
        claims: parsed.claims || [],
        checkedBy: 'gemini',
      }).returning();

      res.json({ ...factCheck, summary: parsed.summary });
    } catch (e: any) { console.error('[FactCheck] Error:', e.message); res.status(500).json({ error: 'Failed to fact-check content' }); }
  });

  app.get('/api/fact-check/:messageId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const messageId = parseInt(req.params.messageId);
      const [msg] = await db.select().from(messages).where(eq(messages.id, messageId));
      if (msg) {
        const [conv] = await db.select().from(conversations).where(eq(conversations.id, msg.conversationId));
        if (conv && conv.userId !== userId) return res.status(403).json({ error: 'Not your message' });
      }
      const [check] = await db.select().from(factChecks).where(eq(factChecks.messageId, messageId));
      if (!check) return res.status(404).json({ error: 'No fact-check found' });
      res.json(check);
    } catch (e: any) { res.status(500).json({ error: 'Failed to fetch fact-check' }); }
  });

  // ============ END OF ROUTES ============

  return httpServer;
}
