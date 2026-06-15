/**
 * Connected Accounts — per-user OAuth for Google & Microsoft.
 *
 * Multi-tenant: every app user connects their OWN account. Tokens are stored
 * ENCRYPTED at rest and a fresh access token is minted (via refresh) on demand.
 * Uses raw fetch to the providers' token endpoints — no SDKs.
 */
import type { Request } from "express";
import { db } from "../../db";
import { userOauthConnections } from "@shared/schema";
import { and, eq } from "drizzle-orm";
import { encrypt, decrypt } from "../encryption";

export type Provider = "google" | "microsoft";

type ProviderConfig = {
  authUrl: string;
  tokenUrl: string;
  scopes: string[];
  clientIdEnv: string;
  clientSecretEnv: string;
  /** Endpoint that returns the connected account's email/name. */
  userInfo: (accessToken: string) => Promise<{ email?: string; name?: string }>;
  extraAuthParams: Record<string, string>;
};

async function googleUserInfo(accessToken: string) {
  const r = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!r.ok) return {};
  const d: any = await r.json();
  return { email: d.email, name: d.name };
}

async function microsoftUserInfo(accessToken: string) {
  const r = await fetch("https://graph.microsoft.com/v1.0/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!r.ok) return {};
  const d: any = await r.json();
  return { email: d.mail || d.userPrincipalName, name: d.displayName };
}

export const PROVIDERS: Record<Provider, ProviderConfig> = {
  google: {
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    clientIdEnv: "GOOGLE_OAUTH_CLIENT_ID",
    clientSecretEnv: "GOOGLE_OAUTH_CLIENT_SECRET",
    scopes: [
      "openid",
      "email",
      "profile",
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/gmail.compose",
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/calendar.readonly",
      "https://www.googleapis.com/auth/drive.readonly",
      "https://www.googleapis.com/auth/documents.readonly",
    ],
    userInfo: googleUserInfo,
    extraAuthParams: { access_type: "offline", prompt: "consent", include_granted_scopes: "true" },
  },
  microsoft: {
    authUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    clientIdEnv: "MICROSOFT_OAUTH_CLIENT_ID",
    clientSecretEnv: "MICROSOFT_OAUTH_CLIENT_SECRET",
    scopes: [
      "openid",
      "email",
      "profile",
      "offline_access",
      "User.Read",
      "Mail.Read",
      "Mail.Send",
      "Calendars.ReadWrite",
      "Contacts.Read",
      "Files.Read",
    ],
    userInfo: microsoftUserInfo,
    extraAuthParams: { response_mode: "query", prompt: "select_account" },
  },
};

export function isProvider(v: string): v is Provider {
  return v === "google" || v === "microsoft";
}

export function providerConfigured(provider: Provider): boolean {
  const cfg = PROVIDERS[provider];
  return !!process.env[cfg.clientIdEnv] && !!process.env[cfg.clientSecretEnv];
}

/** Build the redirect URI from the live request host so dev & prod both work. */
export function getRedirectUri(req: Request, provider: Provider): string {
  const host = req.get("host") || process.env.REPLIT_DOMAINS?.split(",")[0] || "turboanswer.it.com";
  const proto = host.includes("localhost") ? "http" : "https";
  return `${proto}://${host}/api/connections/${provider}/callback`;
}

export function buildAuthUrl(provider: Provider, redirectUri: string, state: string): string {
  const cfg = PROVIDERS[provider];
  const params = new URLSearchParams({
    client_id: process.env[cfg.clientIdEnv] || "",
    redirect_uri: redirectUri,
    response_type: "code",
    scope: cfg.scopes.join(" "),
    state,
    ...cfg.extraAuthParams,
  });
  return `${cfg.authUrl}?${params.toString()}`;
}

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
};

export async function exchangeCodeForTokens(
  provider: Provider,
  code: string,
  redirectUri: string
): Promise<TokenResponse> {
  const cfg = PROVIDERS[provider];
  const body = new URLSearchParams({
    client_id: process.env[cfg.clientIdEnv] || "",
    client_secret: process.env[cfg.clientSecretEnv] || "",
    code,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
  });
  const r = await fetch(cfg.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const d: any = await r.json();
  if (!r.ok) throw new Error(d.error_description || d.error || "Token exchange failed");
  return d;
}

export async function refreshAccessToken(provider: Provider, refreshToken: string): Promise<TokenResponse> {
  const cfg = PROVIDERS[provider];
  const body = new URLSearchParams({
    client_id: process.env[cfg.clientIdEnv] || "",
    client_secret: process.env[cfg.clientSecretEnv] || "",
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });
  if (provider === "microsoft") body.set("scope", cfg.scopes.join(" "));
  const r = await fetch(cfg.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const d: any = await r.json();
  if (!r.ok) throw new Error(d.error_description || d.error || "Token refresh failed");
  return d;
}

// ── Storage (encrypted at rest) ──────────────────────────────────────────────

export async function saveConnection(
  userId: string,
  provider: Provider,
  tokens: TokenResponse,
  account: { email?: string; name?: string }
): Promise<void> {
  const expiresAt = tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null;
  const existing = await getConnectionRow(userId, provider);
  const encAccess = encrypt(tokens.access_token);
  // Google omits refresh_token on re-consent sometimes; keep the prior one.
  const encRefresh = tokens.refresh_token
    ? encrypt(tokens.refresh_token)
    : existing?.refreshToken || null;

  if (existing) {
    await db
      .update(userOauthConnections)
      .set({
        accessToken: encAccess,
        refreshToken: encRefresh,
        expiresAt,
        scopes: tokens.scope || existing.scopes,
        accountEmail: account.email || existing.accountEmail,
        accountName: account.name || existing.accountName,
        updatedAt: new Date(),
      })
      .where(eq(userOauthConnections.id, existing.id));
  } else {
    await db.insert(userOauthConnections).values({
      userId,
      provider,
      accessToken: encAccess,
      refreshToken: encRefresh,
      expiresAt,
      scopes: tokens.scope || null,
      accountEmail: account.email || null,
      accountName: account.name || null,
    });
  }
}

export async function getConnectionRow(userId: string, provider: Provider) {
  const [row] = await db
    .select()
    .from(userOauthConnections)
    .where(and(eq(userOauthConnections.userId, userId), eq(userOauthConnections.provider, provider)));
  return row || null;
}

export async function listConnectionStatuses(userId: string) {
  const rows = await db
    .select()
    .from(userOauthConnections)
    .where(eq(userOauthConnections.userId, userId));
  const byProvider: Record<string, { connected: boolean; email?: string | null; name?: string | null }> = {};
  for (const r of rows) {
    byProvider[r.provider] = { connected: true, email: r.accountEmail, name: r.accountName };
  }
  return byProvider;
}

export async function deleteConnection(userId: string, provider: Provider): Promise<void> {
  await db
    .delete(userOauthConnections)
    .where(and(eq(userOauthConnections.userId, userId), eq(userOauthConnections.provider, provider)));
}

/** Returns a valid (refreshed if needed) decrypted access token, or null if not connected. */
export async function getValidAccessToken(userId: string, provider: Provider): Promise<string | null> {
  const row = await getConnectionRow(userId, provider);
  if (!row) return null;

  const notExpired = row.expiresAt && row.expiresAt.getTime() - 60_000 > Date.now();
  if (notExpired) {
    try {
      return decrypt(row.accessToken);
    } catch {
      return null;
    }
  }

  // Expired (or no expiry recorded) → refresh.
  if (!row.refreshToken) {
    // No refresh token; try the stored access token as a last resort.
    try {
      return decrypt(row.accessToken);
    } catch {
      return null;
    }
  }

  try {
    const refresh = decrypt(row.refreshToken);
    const tokens = await refreshAccessToken(provider, refresh);
    const expiresAt = tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null;
    await db
      .update(userOauthConnections)
      .set({
        accessToken: encrypt(tokens.access_token),
        refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : row.refreshToken,
        expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(userOauthConnections.id, row.id));
    return tokens.access_token;
  } catch (e) {
    console.error(`[ConnectedAccounts] refresh failed for ${provider}:`, (e as any)?.message || e);
    return null;
  }
}
