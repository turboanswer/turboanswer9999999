/**
 * Connected Accounts — tool layer.
 *
 * The reasoning engine has no native function-calling, so we use PRE-FLIGHT
 * routing: a fast classifier decides whether a connected-account tool is needed.
 *  - READ tools run immediately and their result is injected into the system
 *    prompt as context before the normal streamed answer.
 *  - ACTION tools (send mail / create event) are NOT executed automatically;
 *    they return a proposal the user must confirm, which is then executed via
 *    executeAction().
 */
import crypto from "crypto";
import type { Provider } from "./oauth";
import { getValidAccessToken } from "./oauth";

export type ConnectedMap = Record<string, boolean>; // { google: true, microsoft: false }

// ── Signed action proposals ───────────────────────────────────────────────
// Side-effect actions (send email / create event) must NEVER run from a raw
// client payload — that would make "explicit confirmation" a UI-only control
// that any authenticated user could bypass. Instead, when the AI proposes an
// action we mint a short-lived HMAC token bound to {userId, provider, action,
// args}. The execute route requires this token and re-verifies it, so the
// server only runs actions it actually proposed, for the user it proposed them
// to, with the exact args it proposed — and each token is single-use.
function proposalSigningKey(): Buffer {
  const secret = process.env.CRISIS_ENCRYPTION_KEY;
  if (!secret) throw new Error("CRISIS_ENCRYPTION_KEY is required to sign connected-account actions");
  return crypto.createHash("sha256").update("connected-action-proposal:" + secret).digest();
}

function stableStringify(value: any): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value ?? null);
  if (Array.isArray(value)) return "[" + value.map(stableStringify).join(",") + "]";
  const keys = Object.keys(value).sort();
  return "{" + keys.map(k => JSON.stringify(k) + ":" + stableStringify(value[k])).join(",") + "}";
}

function argsHash(args: Record<string, any>): string {
  return crypto.createHash("sha256").update(stableStringify(args ?? {})).digest("hex");
}

const PROPOSAL_TTL_MS = 10 * 60 * 1000;
const usedProposalNonces = new Set<string>();

export function signActionProposal(p: {
  userId: string; provider: Provider; action: string; args: Record<string, any>; conversationId?: number;
}): string {
  const payload = {
    u: p.userId,
    pr: p.provider,
    a: p.action,
    h: argsHash(p.args),
    c: p.conversationId ?? null,
    e: Date.now() + PROPOSAL_TTL_MS,
    n: crypto.randomBytes(12).toString("hex"),
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", proposalSigningKey()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyActionProposal(
  token: unknown,
  ctx: { userId: string; provider: Provider; action: string; args: Record<string, any> },
): { ok: boolean; error?: string } {
  if (typeof token !== "string" || !token.includes(".")) return { ok: false, error: "Missing confirmation token" };
  const [body, sig] = token.split(".");
  if (!body || !sig) return { ok: false, error: "Malformed confirmation token" };
  const expected = crypto.createHmac("sha256", proposalSigningKey()).update(body).digest("base64url");
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return { ok: false, error: "Invalid confirmation token" };
  }
  let payload: any;
  try { payload = JSON.parse(Buffer.from(body, "base64url").toString()); } catch { return { ok: false, error: "Malformed confirmation token" }; }
  if (typeof payload?.e !== "number" || payload.e < Date.now()) return { ok: false, error: "This confirmation has expired — please ask again." };
  if (payload.u !== ctx.userId) return { ok: false, error: "This action wasn't proposed for your account." };
  if (payload.pr !== ctx.provider || payload.a !== ctx.action) return { ok: false, error: "Action does not match what was proposed." };
  if (payload.h !== argsHash(ctx.args)) return { ok: false, error: "The action details were changed after it was proposed." };
  if (usedProposalNonces.has(payload.n)) return { ok: false, error: "This action was already confirmed." };
  usedProposalNonces.add(payload.n);
  if (usedProposalNonces.size > 10000) usedProposalNonces.clear();
  return { ok: true };
}

export type ReadResult = { ok: boolean; context?: string; error?: string };

export type ActionProposal = {
  provider: Provider;
  action: string; // 'gmail_send' | 'calendar_create_event' | 'outlook_send' | 'ms_calendar_create_event'
  args: Record<string, any>;
  summary: string; // human-readable confirmation text
};

export type Classification =
  | { kind: "none" }
  | { kind: "read"; provider: Provider; tool: string; args: Record<string, any> }
  | { kind: "action"; provider: Provider; action: string; args: Record<string, any> };

// ── Low-level fetch helpers ──────────────────────────────────────────────────

async function googleFetch(token: string, url: string, init?: RequestInit) {
  const r = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init?.headers || {}) },
  });
  if (!r.ok) {
    const t = await r.text().catch(() => "");
    throw new Error(`Google API ${r.status}: ${t.slice(0, 300)}`);
  }
  return r;
}

async function graphFetch(token: string, path: string, init?: RequestInit) {
  const r = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init?.headers || {}) },
  });
  if (!r.ok) {
    const t = await r.text().catch(() => "");
    throw new Error(`Graph API ${r.status}: ${t.slice(0, 300)}`);
  }
  return r;
}

function header(headers: any[], name: string): string {
  return headers?.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value || "";
}

// ── Google read tools ────────────────────────────────────────────────────────

async function gmailSearch(token: string, query: string, maxResults = 8): Promise<string> {
  const listUrl =
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}` +
    (query ? `&q=${encodeURIComponent(query)}` : "");
  const list: any = await (await googleFetch(token, listUrl)).json();
  const ids: string[] = (list.messages || []).map((m: any) => m.id);
  if (!ids.length) return "No matching emails found.";
  const lines: string[] = [];
  for (const id of ids.slice(0, maxResults)) {
    const msg: any = await (
      await googleFetch(
        token,
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`
      )
    ).json();
    const h = msg.payload?.headers || [];
    lines.push(
      `- From: ${header(h, "From")} | Subject: ${header(h, "Subject")} | Date: ${header(h, "Date")}\n  Snippet: ${(msg.snippet || "").slice(0, 200)}`
    );
  }
  return lines.join("\n");
}

async function calendarList(token: string, daysAhead = 14, maxResults = 12): Promise<string> {
  const timeMin = new Date().toISOString();
  const timeMax = new Date(Date.now() + daysAhead * 86400000).toISOString();
  const url =
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?singleEvents=true&orderBy=startTime` +
    `&timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&maxResults=${maxResults}`;
  const d: any = await (await googleFetch(token, url)).json();
  const items: any[] = d.items || [];
  if (!items.length) return "No upcoming events in this period.";
  return items
    .map((e) => {
      const start = e.start?.dateTime || e.start?.date || "";
      const end = e.end?.dateTime || e.end?.date || "";
      return `- ${e.summary || "(no title)"} | ${start} → ${end}${e.location ? ` | ${e.location}` : ""}`;
    })
    .join("\n");
}

async function driveSearch(token: string, query: string, maxResults = 10): Promise<string> {
  const q = query ? `name contains '${query.replace(/'/g, "")}' and trashed = false` : "trashed = false";
  const url =
    `https://www.googleapis.com/drive/v3/files?pageSize=${maxResults}` +
    `&q=${encodeURIComponent(q)}&fields=${encodeURIComponent("files(id,name,mimeType,modifiedTime,webViewLink)")}`;
  const d: any = await (await googleFetch(token, url)).json();
  const files: any[] = d.files || [];
  if (!files.length) return "No matching files found in Google Drive.";
  return files.map((f) => `- ${f.name} (${f.mimeType}) modified ${f.modifiedTime}`).join("\n");
}

async function docsRead(token: string, query: string): Promise<string> {
  // Find the doc by name, then export as plain text.
  const q = `name contains '${(query || "").replace(/'/g, "")}' and mimeType = 'application/vnd.google-apps.document' and trashed = false`;
  const url = `https://www.googleapis.com/drive/v3/files?pageSize=1&q=${encodeURIComponent(q)}&fields=${encodeURIComponent("files(id,name)")}`;
  const d: any = await (await googleFetch(token, url)).json();
  const file = (d.files || [])[0];
  if (!file) return "No matching Google Doc found.";
  const exp = await googleFetch(
    token,
    `https://www.googleapis.com/drive/v3/files/${file.id}/export?mimeType=text/plain`
  );
  const text = await exp.text();
  return `Document "${file.name}":\n${text.slice(0, 4000)}`;
}

// ── Microsoft read tools ─────────────────────────────────────────────────────

async function outlookSearch(token: string, query: string, maxResults = 8): Promise<string> {
  const path = query
    ? `/me/messages?$search="${encodeURIComponent(query)}"&$top=${maxResults}&$select=subject,from,receivedDateTime,bodyPreview`
    : `/me/messages?$top=${maxResults}&$orderby=receivedDateTime desc&$select=subject,from,receivedDateTime,bodyPreview`;
  const d: any = await (await graphFetch(token, path)).json();
  const items: any[] = d.value || [];
  if (!items.length) return "No matching Outlook emails found.";
  return items
    .map(
      (m) =>
        `- From: ${m.from?.emailAddress?.address || ""} | Subject: ${m.subject} | Date: ${m.receivedDateTime}\n  Snippet: ${(m.bodyPreview || "").slice(0, 200)}`
    )
    .join("\n");
}

async function contactsSearch(token: string, query: string, maxResults = 10): Promise<string> {
  const path = query
    ? `/me/contacts?$search="${encodeURIComponent(query)}"&$top=${maxResults}&$select=displayName,emailAddresses,mobilePhone`
    : `/me/contacts?$top=${maxResults}&$select=displayName,emailAddresses,mobilePhone`;
  const d: any = await (await graphFetch(token, path)).json();
  const items: any[] = d.value || [];
  if (!items.length) return "No matching contacts found.";
  return items
    .map(
      (c) =>
        `- ${c.displayName || "(no name)"} | ${(c.emailAddresses || []).map((e: any) => e.address).join(", ")}${c.mobilePhone ? ` | ${c.mobilePhone}` : ""}`
    )
    .join("\n");
}

async function msCalendarList(token: string, daysAhead = 14, maxResults = 12): Promise<string> {
  const start = new Date().toISOString();
  const end = new Date(Date.now() + daysAhead * 86400000).toISOString();
  const path =
    `/me/calendarView?startDateTime=${encodeURIComponent(start)}&endDateTime=${encodeURIComponent(end)}` +
    `&$orderby=start/dateTime&$top=${maxResults}&$select=subject,start,end,location`;
  const d: any = await (await graphFetch(token, path)).json();
  const items: any[] = d.value || [];
  if (!items.length) return "No upcoming Outlook calendar events in this period.";
  return items
    .map((e) => `- ${e.subject || "(no title)"} | ${e.start?.dateTime} → ${e.end?.dateTime}${e.location?.displayName ? ` | ${e.location.displayName}` : ""}`)
    .join("\n");
}

async function onedriveSearch(token: string, query: string, maxResults = 10): Promise<string> {
  const path = query
    ? `/me/drive/root/search(q='${encodeURIComponent(query)}')?$top=${maxResults}&$select=name,size,lastModifiedDateTime,webUrl`
    : `/me/drive/root/children?$top=${maxResults}&$select=name,size,lastModifiedDateTime,webUrl`;
  const d: any = await (await graphFetch(token, path)).json();
  const items: any[] = d.value || [];
  if (!items.length) return "No matching OneDrive files found.";
  return items.map((f) => `- ${f.name} (${f.size || 0} bytes) modified ${f.lastModifiedDateTime}`).join("\n");
}

// ── READ dispatcher ──────────────────────────────────────────────────────────

export async function runReadTool(
  userId: string,
  provider: Provider,
  tool: string,
  args: Record<string, any>
): Promise<ReadResult> {
  const token = await getValidAccessToken(userId, provider);
  if (!token) return { ok: false, error: `${provider} account is not connected or needs re-authorization.` };
  try {
    let context = "";
    switch (tool) {
      case "gmail_search":
        context = await gmailSearch(token, args.query || "", args.maxResults || 8);
        break;
      case "calendar_list":
        context = await calendarList(token, args.daysAhead || 14);
        break;
      case "drive_search":
        context = await driveSearch(token, args.query || "");
        break;
      case "docs_read":
        context = await docsRead(token, args.query || "");
        break;
      case "outlook_search":
        context = await outlookSearch(token, args.query || "", args.maxResults || 8);
        break;
      case "contacts_search":
        context = await contactsSearch(token, args.query || "");
        break;
      case "ms_calendar_list":
        context = await msCalendarList(token, args.daysAhead || 14);
        break;
      case "onedrive_search":
        context = await onedriveSearch(token, args.query || "");
        break;
      default:
        return { ok: false, error: `Unknown read tool: ${tool}` };
    }
    return { ok: true, context };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Tool execution failed" };
  }
}

// ── ACTION executors ─────────────────────────────────────────────────────────

function buildRawEmail(to: string, subject: string, body: string): string {
  const lines = [`To: ${to}`, `Subject: ${subject}`, "Content-Type: text/plain; charset=utf-8", "", body];
  return Buffer.from(lines.join("\r\n")).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function describeAction(provider: Provider, action: string, args: Record<string, any>): string {
  switch (action) {
    case "gmail_send":
    case "outlook_send":
      return `Send an email via ${provider === "google" ? "Gmail" : "Outlook"} to ${args.to}\nSubject: ${args.subject}\n\n${args.body}`;
    case "calendar_create_event":
    case "ms_calendar_create_event":
      return `Create a calendar event "${args.summary || args.subject}"\nWhen: ${args.start} → ${args.end}${args.attendees?.length ? `\nAttendees: ${(args.attendees || []).join(", ")}` : ""}`;
    default:
      return `Perform ${action}`;
  }
}

export async function executeAction(userId: string, proposal: ActionProposal): Promise<{ ok: boolean; message: string }> {
  const token = await getValidAccessToken(userId, proposal.provider);
  if (!token) return { ok: false, message: `${proposal.provider} account is not connected.` };
  const { action, args } = proposal;
  try {
    switch (action) {
      case "gmail_send": {
        const raw = buildRawEmail(args.to, args.subject || "", args.body || "");
        await googleFetch(token, "https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ raw }),
        });
        return { ok: true, message: `Email sent to ${args.to}.` };
      }
      case "outlook_send": {
        await graphFetch(token, "/me/sendMail", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: {
              subject: args.subject || "",
              body: { contentType: "Text", content: args.body || "" },
              toRecipients: [{ emailAddress: { address: args.to } }],
            },
            saveToSentItems: true,
          }),
        });
        return { ok: true, message: `Email sent to ${args.to}.` };
      }
      case "calendar_create_event": {
        await googleFetch(token, "https://www.googleapis.com/calendar/v3/calendars/primary/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            summary: args.summary || args.subject || "Event",
            description: args.description || "",
            start: { dateTime: args.start },
            end: { dateTime: args.end },
            attendees: (args.attendees || []).map((email: string) => ({ email })),
          }),
        });
        return { ok: true, message: `Event "${args.summary || args.subject}" created.` };
      }
      case "ms_calendar_create_event": {
        await graphFetch(token, "/me/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subject: args.subject || args.summary || "Event",
            body: { contentType: "Text", content: args.description || "" },
            start: { dateTime: args.start, timeZone: "UTC" },
            end: { dateTime: args.end, timeZone: "UTC" },
            attendees: (args.attendees || []).map((email: string) => ({
              emailAddress: { address: email },
              type: "required",
            })),
          }),
        });
        return { ok: true, message: `Event "${args.subject || args.summary}" created.` };
      }
      default:
        return { ok: false, message: `Unknown action: ${action}` };
    }
  } catch (e: any) {
    return { ok: false, message: e?.message || "Action failed" };
  }
}

// ── Intent classifier (fast Gemini JSON) ─────────────────────────────────────

const TOOL_CATALOG = `
GOOGLE (only if google connected):
  read: gmail_search {query?}, calendar_list {daysAhead?}, drive_search {query}, docs_read {query}
  action: gmail_send {to, subject, body}, calendar_create_event {summary, start(ISO), end(ISO), attendees?[], description?}
MICROSOFT (only if microsoft connected):
  read: outlook_search {query?}, contacts_search {query}, ms_calendar_list {daysAhead?}, onedrive_search {query}
  action: outlook_send {to, subject, body}, ms_calendar_create_event {subject, start(ISO), end(ISO), attendees?[], description?}
`;

export async function classifyIntent(message: string, connected: ConnectedMap): Promise<Classification> {
  const apiKey = process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.AZURE_OPENAI_API_KEY;
  const available = Object.entries(connected)
    .filter(([, v]) => v)
    .map(([k]) => k);
  if (!apiKey || available.length === 0) return { kind: "none" };

  const nowIso = new Date().toISOString();
  const prompt = `You route a user's chat message to at most ONE connected-account tool. Connected providers: ${available.join(", ")}. Current time (UTC): ${nowIso}.

Available tools:${TOOL_CATALOG}

Rules:
- Only use tools for a provider that is connected.
- If the message just needs information from the account (emails, events, files, contacts, docs) choose a READ tool.
- If the message asks to SEND an email or CREATE/SCHEDULE an event, choose an ACTION tool and fill ALL args. Convert relative times (e.g. "tomorrow 3pm") to absolute ISO 8601 using the current time. Assume 1 hour duration if no end given.
- If no connected-account tool is clearly needed, return {"kind":"none"}.
- Respond with ONLY JSON, no prose.

JSON shape: {"kind":"none"} OR {"kind":"read","provider":"google|microsoft","tool":"...","args":{...}} OR {"kind":"action","provider":"google|microsoft","action":"...","args":{...}}

User message: """${message.slice(0, 1500)}"""`;

  try {
    const { callDirect } = await import("../direct-router.js");
    const raw = await callDirect("anthropic/claude-haiku", [{ role: "user", content: prompt }], { temperature: 0, maxTokens: 500, jsonMode: true });
    const text = (raw || "{}").replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim() || "{}";
    const parsed = JSON.parse(text);
    if (parsed?.kind === "read" && isProviderConnected(parsed.provider, connected) && parsed.tool) {
      return { kind: "read", provider: parsed.provider, tool: parsed.tool, args: parsed.args || {} };
    }
    if (parsed?.kind === "action" && isProviderConnected(parsed.provider, connected) && parsed.action) {
      return { kind: "action", provider: parsed.provider, action: parsed.action, args: parsed.args || {} };
    }
    return { kind: "none" };
  } catch {
    return { kind: "none" };
  }
}

function isProviderConnected(provider: string, connected: ConnectedMap): boolean {
  return (provider === "google" || provider === "microsoft") && !!connected[provider];
}
