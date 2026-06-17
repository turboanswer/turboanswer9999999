// Email compose deep links. We don't auto-send; instead we open the user's
// webmail (Gmail / Outlook) or default mail app with a PRE-FILLED compose
// window (to / subject / body). Works on web and inside the Capacitor app
// without needing any OAuth connection.

export interface EmailDraft {
  to?: string;
  cc?: string;
  bcc?: string;
  subject?: string;
  body?: string;
}

const enc = (s?: string) => encodeURIComponent(s || "");

export function gmailComposeUrl(d: EmailDraft): string {
  const p: string[] = ["view=cm", "fs=1"];
  if (d.to) p.push(`to=${enc(d.to)}`);
  if (d.cc) p.push(`cc=${enc(d.cc)}`);
  if (d.bcc) p.push(`bcc=${enc(d.bcc)}`);
  if (d.subject) p.push(`su=${enc(d.subject)}`);
  if (d.body) p.push(`body=${enc(d.body)}`);
  return `https://mail.google.com/mail/?${p.join("&")}`;
}

export function outlookComposeUrl(d: EmailDraft): string {
  const p: string[] = [];
  if (d.to) p.push(`to=${enc(d.to)}`);
  if (d.cc) p.push(`cc=${enc(d.cc)}`);
  if (d.bcc) p.push(`bcc=${enc(d.bcc)}`);
  if (d.subject) p.push(`subject=${enc(d.subject)}`);
  if (d.body) p.push(`body=${enc(d.body)}`);
  const qs = p.length ? `?${p.join("&")}` : "";
  return `https://outlook.live.com/mail/0/deeplink/compose${qs}`;
}

export function mailtoUrl(d: EmailDraft): string {
  const p: string[] = [];
  if (d.subject) p.push(`subject=${enc(d.subject)}`);
  if (d.body) p.push(`body=${enc(d.body)}`);
  if (d.cc) p.push(`cc=${enc(d.cc)}`);
  if (d.bcc) p.push(`bcc=${enc(d.bcc)}`);
  return `mailto:${enc(d.to)}${p.length ? `?${p.join("&")}` : ""}`;
}

// Open a URL in a new tab / the system browser / the mail app. Using a
// programmatic anchor click is the most reliable path across desktop browsers
// and the Capacitor WebView (it also handles mailto: without navigating away
// from the single-page app).
export function openExternal(url: string): void {
  const a = document.createElement("a");
  a.href = url;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

// UTF-8 safe base64 for embedding a draft inside a chat message as
// [[EMAIL_DRAFT]]<base64>[[/EMAIL_DRAFT]]. Uses TextEncoder/TextDecoder so
// accented names, emoji, and non-Latin bodies round-trip correctly.
export function encodeEmailDraft(d: EmailDraft): string {
  const bytes = new TextEncoder().encode(JSON.stringify(d));
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

export function decodeEmailDraft(s: string): EmailDraft | null {
  try {
    const bin = atob((s || "").trim());
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    const parsed = JSON.parse(new TextDecoder().decode(bytes));
    return parsed && typeof parsed === "object" ? (parsed as EmailDraft) : null;
  } catch {
    return null;
  }
}

// Loose client-side gate for "the user wants to write/send an email". The
// server (Claude) makes the final decision and returns isEmail:false for
// non-compose phrasings, so this only needs to catch the common cases.
// The connector word must appear AFTER "email" so "tell me about email
// marketing" / "what's my email address" don't trip the gate, while
// "email a picture of X to Bob" (email … to) and "email mom about dinner"
// (email … about) still route to a draft instead of image generation.
export function isEmailRequest(text: string): boolean {
  const t = (text || "").trim().toLowerCase();
  if (!t || t.length > 1000) return false;
  if (/\b(send|write|compose|draft|shoot|fire off|prepare)\b[^.?!]{0,30}\b(e-?mail|message|note)\b/.test(t)) {
    return true;
  }
  if (/\be-?mail\b[\s\S]{0,60}\b(to|about|regarding|saying|telling|asking|inviting|thanking|apolog|reminding|re:|letting|that)\b/.test(t)) {
    return true;
  }
  return false;
}
