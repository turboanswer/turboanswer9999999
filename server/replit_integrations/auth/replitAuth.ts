import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import bcrypt from "bcryptjs";
import { authStorage } from "./storage";

import crypto from "crypto";

const smsVerificationCodes = new Map<string, { code: string; expiresAt: number; verified: boolean; attempts: number }>();
const smsSendLimits = new Map<string, { count: number; windowStart: number }>();
const SMS_MAX_ATTEMPTS = 5;
const SMS_SEND_LIMIT = 3;
const SMS_SEND_WINDOW = 15 * 60 * 1000;

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (digits.startsWith('+')) return phone.replace(/[^\d+]/g, '');
  return `+${digits}`;
}

async function sendTwilioSMS(to: string, body: string): Promise<boolean> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!accountSid || !authToken || !from) {
    console.error('[SMS] Twilio credentials not configured');
    return false;
  }
  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const params = new URLSearchParams({ To: to, From: from, Body: body });
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error('[SMS] Twilio error:', data.message || data);
      return false;
    }
    console.log(`[SMS] Sent to ${to}, SID: ${data.sid}`);
    return true;
  } catch (err: any) {
    console.error('[SMS] Send failed:', err.message);
    return false;
  }
}


async function sendBrevoOtpEmail(recipientEmail: string, recipientName: string, otp: string) {
  const brevoApiKey = process.env.BREVO_API_KEY;
  if (!brevoApiKey) {
    console.warn('[Email] BREVO_API_KEY not configured');
    return null;
  }
  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px;">
<div style="text-align:center;margin-bottom:24px;">
  <h2 style="color:#7c3aed;margin:0;">TurboAnswer Password Reset</h2>
</div>
<p>Hi ${recipientName},</p>
<p>We received a request to reset your TurboAnswer password. Use the verification code below to continue. This code expires in <strong>10 minutes</strong>.</p>
<div style="text-align:center;margin:32px 0;">
  <div style="display:inline-block;background:#1e1b4b;border-radius:12px;padding:24px 40px;">
    <p style="margin:0 0 8px;color:#a5b4fc;font-size:13px;letter-spacing:2px;text-transform:uppercase;">Your 2FA Code</p>
    <p style="margin:0;color:#fff;font-size:40px;font-weight:bold;letter-spacing:12px;">${otp}</p>
  </div>
</div>
<p>If you did not request a password reset, you can safely ignore this email. Your password will not change.</p>
<hr style="border:none;border-top:1px solid #ddd;margin:24px 0;">
<p style="font-size:13px;color:#666;margin:0;">TurboAnswer Support</p>
<p style="font-size:13px;color:#666;margin:2px 0;">Email: support@turboanswer.it.com | Phone: (866) 467-7269</p>
</body>
</html>`;
  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'accept': 'application/json', 'api-key': brevoApiKey, 'content-type': 'application/json' },
      body: JSON.stringify({
        sender: { name: 'TurboAnswer', email: 'support@turboanswer.it.com' },
        to: [{ email: recipientEmail, name: recipientName }],
        subject: `${otp} is your TurboAnswer verification code`,
        htmlContent: html,
        textContent: `Your TurboAnswer password reset code is: ${otp}\n\nThis code expires in 10 minutes.\n\nIf you did not request this, ignore this email.`,
      }),
    });
    const result = await response.json();
    if (!response.ok) { console.error('[Email] Brevo OTP error:', result); return null; }
    console.log(`[Email] OTP sent to ${recipientEmail}`);
    return result.messageId;
  } catch (err: any) {
    console.error('[Email] OTP send failed:', err.message);
    return null;
  }
}

async function sendBrevoWelcomeEmail(recipientEmail: string, firstName: string) {
  const brevoApiKey = process.env.BREVO_API_KEY;
  if (!brevoApiKey) { console.warn('[Email] BREVO_API_KEY not configured, skipping welcome email'); return; }
  const name = firstName || 'there';
  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;font-size:15px;line-height:1.7;color:#1e1b4b;max-width:600px;margin:0 auto;padding:0;">
<div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:40px 32px;text-align:center;border-radius:12px 12px 0 0;">
  <h1 style="color:#fff;margin:0;font-size:28px;letter-spacing:-0.5px;">Welcome to TurboAnswer!</h1>
  <p style="color:rgba(255,255,255,0.85);margin:10px 0 0;font-size:16px;">Your AI assistant is ready.</p>
</div>
<div style="background:#fff;padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
  <p style="margin:0 0 18px;">Hi ${name},</p>
  <p style="margin:0 0 18px;">Thanks for joining TurboAnswer! Here's how to get the most out of your account:</p>
  <div style="background:#f5f3ff;border-left:4px solid #7c3aed;border-radius:6px;padding:18px 20px;margin:0 0 22px;">
    <p style="margin:0 0 10px;font-weight:bold;color:#4f46e5;">🚀 Quick Start Guide</p>
    <p style="margin:0 0 8px;"><strong>1. Ask anything</strong> — Type any question in the chat and get an instant, expert-level answer across science, tech, law, finance, and more.</p>
    <p style="margin:0 0 8px;"><strong>2. Scan & Summarize</strong> — Use the AI Scanner (camera icon) to upload any image and let TurboAnswer read, transcribe, or summarize it for you.</p>
    <p style="margin:0 0 8px;"><strong>3. Code Studio</strong> — Open the Code Studio to write, run, and debug code in your browser with full AI assistance.</p>
    <p style="margin:0 0 8px;"><strong>4. Upgrade anytime</strong> — Free accounts get daily questions. Upgrade to Pro, Research, or Enterprise for unlimited access and advanced AI models.</p>
    <p style="margin:0;"><strong>5. Settings</strong> — Customize your response style, language, and notification preferences in Settings.</p>
  </div>
  <div style="text-align:center;margin:28px 0;">
    <a href="https://turbo-answer.replit.app" style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;text-decoration:none;padding:14px 36px;border-radius:8px;font-size:16px;font-weight:bold;">Start Chatting Now</a>
  </div>
  <p style="margin:0 0 6px;color:#6b7280;font-size:13px;">Need help? Reply to this email or visit our support page.</p>
  <p style="margin:0;color:#6b7280;font-size:13px;">We're excited to have you onboard!</p>
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
  <p style="font-size:12px;color:#9ca3af;margin:0;">TurboAnswer · support@turboanswer.it.com · (866) 467-7269</p>
</div>
</body>
</html>`;
  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'accept': 'application/json', 'api-key': brevoApiKey, 'content-type': 'application/json' },
      body: JSON.stringify({
        sender: { name: 'TurboAnswer', email: 'support@turboanswer.it.com' },
        to: [{ email: recipientEmail, name: firstName }],
        subject: `Welcome to TurboAnswer, ${name}! 🚀`,
        htmlContent: html,
        textContent: `Hi ${name},\n\nWelcome to TurboAnswer! Here's how to get started:\n\n1. Ask anything — get expert-level answers in seconds.\n2. AI Scanner — upload images to read, transcribe, or summarize them.\n3. Code Studio — write and run code with full AI help.\n4. Upgrade — go Pro, Research, or Enterprise for unlimited access.\n5. Settings — customize your language, response style, and more.\n\nVisit https://turbo-answer.replit.app to start chatting.\n\n-- TurboAnswer Support\nsupport@turboanswer.it.com | (866) 467-7269`,
      }),
    });
    const result = await response.json();
    if (!response.ok) { console.error('[Email] Welcome email error:', result); return; }
    console.log(`[Email] Welcome email sent to ${recipientEmail}`);
  } catch (err: any) {
    console.error('[Email] Welcome email failed:', err.message);
  }
}

const ADMIN_EMAILS = ["support@turboanswer.it.com", "lanetschantret12@gmail.com"];

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000;
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET || "turbo-answer-secret-key-change-in-production",
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.REPL_SLUG ? true : process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      maxAge: sessionTtl,
    },
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());

  app.post("/api/sms/send-verification", async (req, res) => {
    try {
      const { phoneNumber } = req.body;
      if (!phoneNumber || !phoneNumber.trim()) {
        return res.status(400).json({ message: "Phone number is required" });
      }
      const normalized = normalizePhone(phoneNumber.trim());
      const digits = normalized.replace(/\D/g, '');
      if (digits.length < 10 || digits.length > 15) {
        return res.status(400).json({ message: "Please enter a valid phone number" });
      }

      const sendLimit = smsSendLimits.get(normalized);
      if (sendLimit) {
        if (Date.now() - sendLimit.windowStart < SMS_SEND_WINDOW) {
          if (sendLimit.count >= SMS_SEND_LIMIT) {
            return res.status(429).json({ message: "Too many code requests. Please wait 15 minutes before trying again." });
          }
        } else {
          smsSendLimits.set(normalized, { count: 0, windowStart: Date.now() });
        }
      }

      const existing = smsVerificationCodes.get(normalized);
      if (existing && existing.expiresAt > Date.now() && (existing.expiresAt - Date.now()) > 4 * 60 * 1000) {
        return res.status(429).json({ message: "A code was just sent. Please wait before requesting another." });
      }

      const code = crypto.randomInt(100000, 999999).toString();
      smsVerificationCodes.set(normalized, { code, expiresAt: Date.now() + 5 * 60 * 1000, verified: false, attempts: 0 });

      const limit = smsSendLimits.get(normalized);
      if (limit) { limit.count++; } else { smsSendLimits.set(normalized, { count: 1, windowStart: Date.now() }); }

      const sent = await sendTwilioSMS(normalized, `Your TurboAnswer verification code is: ${code}. It expires in 5 minutes.`);
      if (!sent) {
        smsVerificationCodes.delete(normalized);
        return res.status(500).json({ message: "Failed to send verification code. Please check your phone number and try again." });
      }

      res.json({ message: "Verification code sent", expiresIn: 300 });
    } catch (error: any) {
      console.error("[SMS] Send verification error:", error);
      res.status(500).json({ message: "Failed to send verification code" });
    }
  });

  app.post("/api/sms/verify", async (req, res) => {
    try {
      const { phoneNumber, code } = req.body;
      if (!phoneNumber || !code) {
        return res.status(400).json({ message: "Phone number and code are required" });
      }
      const normalized = normalizePhone(phoneNumber.trim());
      const entry = smsVerificationCodes.get(normalized);

      if (!entry) {
        return res.status(400).json({ message: "No verification code found. Please request a new one." });
      }
      if (Date.now() > entry.expiresAt) {
        smsVerificationCodes.delete(normalized);
        return res.status(400).json({ message: "Code has expired. Please request a new one." });
      }
      if (entry.attempts >= SMS_MAX_ATTEMPTS) {
        smsVerificationCodes.delete(normalized);
        return res.status(429).json({ message: "Too many failed attempts. Please request a new code." });
      }
      if (entry.code !== code.trim()) {
        entry.attempts++;
        const remaining = SMS_MAX_ATTEMPTS - entry.attempts;
        return res.status(400).json({ message: `Incorrect code. ${remaining > 0 ? `${remaining} attempt${remaining > 1 ? 's' : ''} remaining.` : 'Please request a new code.'}` });
      }

      entry.verified = true;
      entry.expiresAt = Date.now() + 15 * 60 * 1000;
      res.json({ success: true, message: "Phone number verified" });
    } catch (error: any) {
      console.error("[SMS] Verify error:", error);
      res.status(500).json({ message: "Verification failed" });
    }
  });

  app.post("/api/register", async (req, res) => {
    try {
      const { email, password, firstName, lastName, phoneNumber, inviteToken } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      if (!firstName || !firstName.trim()) {
        return res.status(400).json({ message: "First name is required" });
      }

      if (!lastName || !lastName.trim()) {
        return res.status(400).json({ message: "Last name is required" });
      }

      // SMS verification temporarily disabled — phone number is optional
      // TODO: Re-enable SMS verification when Twilio is resolved

      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Please enter a valid email address" });
      }

      const existing = await authStorage.getUserByEmail(email.toLowerCase());
      if (existing) {
        return res.status(400).json({ message: "An account with this email already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      const isAdminEmail = ADMIN_EMAILS.some(e => e.toLowerCase() === email.toLowerCase());

      let grantAdminFromInvite = false;
      let validatedInviteId: number | null = null;
      if (inviteToken && !isAdminEmail) {
        try {
          const { db } = await import('../db');
          const { adminInviteTokens } = await import('@shared/schema');
          const { eq } = await import('drizzle-orm');
          const [tokenRow] = await db.select().from(adminInviteTokens).where(eq(adminInviteTokens.token, inviteToken));
          if (tokenRow && !tokenRow.isRevoked) {
            const notExpired = !tokenRow.expiresAt || new Date() <= new Date(tokenRow.expiresAt);
            const notExhausted = !tokenRow.maxUses || (tokenRow.currentUses ?? 0) < tokenRow.maxUses;
            if (notExpired && notExhausted) {
              grantAdminFromInvite = true;
              validatedInviteId = tokenRow.id;
            }
          }
        } catch (e) {
          console.error('Invite token validation error:', e);
        }
      }

      const grantAdmin = isAdminEmail || grantAdminFromInvite;

      // Check if this email has an approved beta application
      let isBetaTester = false;
      try {
        const { db } = await import('../db');
        const { betaApplications } = await import('@shared/schema');
        const { eq, and } = await import('drizzle-orm');
        const [approvedApp] = await db.select().from(betaApplications)
          .where(and(eq(betaApplications.email, email.toLowerCase()), eq(betaApplications.status, 'approved')))
          .limit(1);
        if (approvedApp) isBetaTester = true;
      } catch (e) {
        console.error('Beta tester check error:', e);
      }

      const user = await authStorage.upsertUser({
        email: email.toLowerCase(),
        password: hashedPassword,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phoneNumber: phoneNumber?.trim() || null,
        isEmployee: grantAdmin,
        employeeRole: grantAdmin ? "super_admin" : "basic",
        canViewAllChats: grantAdmin,
        canBanUsers: grantAdmin,
        isBetaTester,
      });

      if (validatedInviteId) {
        try {
          const { db } = await import('../db');
          const { adminInviteTokens } = await import('@shared/schema');
          const { eq, sql: sqlExpr } = await import('drizzle-orm');
          await db.update(adminInviteTokens)
            .set({ currentUses: sqlExpr`${adminInviteTokens.currentUses} + 1` })
            .where(eq(adminInviteTokens.id, validatedInviteId));
        } catch (e) {
          console.error('Failed to increment invite token use:', e);
        }
      }

      sendBrevoWelcomeEmail(user.email!, user.firstName || '').catch(() => {});

      (req.session as any).userId = user.id;
      res.json({ id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, isEmployee: user.isEmployee });
    } catch (error: any) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed. Please try again." });
    }
  });

  app.post("/api/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      const user = await authStorage.getUserByEmail(email.toLowerCase());
      if (!user || !user.password) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      if (user.isBanned) {
        if (user.banExpiresAt && new Date(user.banExpiresAt) <= new Date()) {
          await authStorage.unbanUser(user.id);
        } else {
          const banMsg = user.banExpiresAt 
            ? `This account is banned until ${new Date(user.banExpiresAt).toLocaleDateString()}.`
            : "This account has been permanently banned.";
          return res.status(403).json({ message: banMsg });
        }
      }

      const isAdminEmail = ADMIN_EMAILS.some(e => e.toLowerCase() === user.email.toLowerCase());
      if (isAdminEmail && !user.isEmployee) {
        await authStorage.upsertUser({
          ...user,
          isEmployee: true,
          employeeRole: "super_admin",
          canViewAllChats: true,
          canBanUsers: true,
        });
        user.isEmployee = true;
      }

      await authStorage.updateLastLogin(user.id);
      (req.session as any).userId = user.id;
      res.json({ id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, isEmployee: user.isEmployee });
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed. Please try again." });
    }
  });

  app.get("/api/logout", (req, res) => {
    req.session.destroy((err) => {
      res.redirect("/");
    });
  });

  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ message: "Email is required" });

      const user = await authStorage.getUserByEmail(email.toLowerCase());
      if (!user) {
        return res.json({ message: "If that email exists, a code has been sent." });
      }

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      await authStorage.setPasswordResetOtp(user.id, otp, expiresAt);

      const name = user.firstName || email;
      await sendBrevoOtpEmail(email.toLowerCase(), name, otp);

      res.json({ message: "If that email exists, a code has been sent." });
    } catch (error: any) {
      console.error("Forgot password error:", error);
      res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  app.post("/api/auth/verify-reset-otp", async (req, res) => {
    try {
      const { email, otp } = req.body;
      if (!email || !otp) return res.status(400).json({ message: "Email and code are required" });

      const user = await authStorage.getUserByEmail(email.toLowerCase());
      if (!user || !user.passwordResetOtp || !user.passwordResetOtpExpires) {
        return res.status(400).json({ message: "Invalid or expired code" });
      }

      if (new Date() > new Date(user.passwordResetOtpExpires)) {
        await authStorage.clearPasswordResetOtp(user.id);
        return res.status(400).json({ message: "Code has expired. Please request a new one." });
      }

      if (user.passwordResetOtp !== otp.trim()) {
        return res.status(400).json({ message: "Incorrect code. Please try again." });
      }

      const verifiedExpires = new Date(Date.now() + 15 * 60 * 1000);
      await authStorage.markPasswordResetVerified(user.id, verifiedExpires);

      res.json({ success: true, userId: user.id });
    } catch (error: any) {
      console.error("Verify OTP error:", error);
      res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { userId, newPassword } = req.body;
      if (!userId || !newPassword) return res.status(400).json({ message: "Missing required fields" });

      if (newPassword.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }

      const user = await authStorage.getUser(userId);
      if (!user || !user.passwordResetVerified || !user.passwordResetVerifiedExpires) {
        return res.status(400).json({ message: "Verification required. Please start over." });
      }

      if (new Date() > new Date(user.passwordResetVerifiedExpires)) {
        await authStorage.clearPasswordResetOtp(userId);
        return res.status(400).json({ message: "Session expired. Please start over." });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 12);
      await authStorage.updatePassword(userId, hashedPassword);

      res.json({ success: true, message: "Password updated successfully." });
    } catch (error: any) {
      console.error("Reset password error:", error);
      res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const userId = (req.session as any)?.userId;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  (req as any).user = {
    claims: { sub: userId },
  };

  next();
};

export const isAdmin: RequestHandler = async (req, res, next) => {
  const userId = (req.session as any)?.userId;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const user = await authStorage.getUser(userId);
  if (!user || !user.isEmployee) {
    return res.status(403).json({ message: "Access denied. Admin only." });
  }

  (req as any).user = {
    claims: { sub: userId },
  };

  next();
};
