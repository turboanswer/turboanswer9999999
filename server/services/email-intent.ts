// Server-side email DRAFT generation for the main chat.
//
// When the user asks the assistant to email someone, we turn their request into
// a ready-to-send draft ({to, subject, body}) using the same Claude path as the
// rest of the text engine (via callDirect — Azure Foundry in prod). The client
// then renders the draft with "Open in Gmail / Outlook / Mail" buttons. We never
// send anything automatically; the user reviews and sends from their own mail.

import { callDirect } from './direct-router';

export interface EmailDraftResult {
  to: string;
  subject: string;
  body: string;
}

const EMAIL_SYSTEM =
  "You turn a user's request into a ready-to-send email draft.\n" +
  'Respond with ONLY compact JSON, no prose and no code fences:\n' +
  '{"isEmail": boolean, "to": string, "subject": string, "body": string}\n\n' +
  '- isEmail: true ONLY if the user is asking to write/send/compose/draft an ' +
  'email to someone. false for everything else (questions, "what is my email", ' +
  'checking an inbox, etc.).\n' +
  '- to: the recipient EMAIL ADDRESS only if the user clearly gave one; ' +
  'otherwise "". A name like "mom" or "my boss" is NOT an address — leave "to" ' +
  'empty and never invent an address.\n' +
  '- subject: a short, clear subject line.\n' +
  '- body: a complete, polite email written in the SAME language as the user. ' +
  'Plain text only (no markdown, no asterisks). Include a friendly greeting and ' +
  'a short sign-off. Avoid bracketed placeholders; if the sender name is ' +
  'unknown, just end with "Thanks!". Keep it concise.';

export async function draftEmail(
  message: string,
  opts: { timeoutMs?: number } = {},
): Promise<EmailDraftResult | null> {
  if (!message || !message.trim()) return null;
  try {
    const raw = await callDirect(
      'anthropic/claude-haiku',
      [
        { role: 'system', content: EMAIL_SYSTEM },
        { role: 'user', content: message.trim().slice(0, 2000) },
      ],
      { maxTokens: 800, temperature: 0.3, timeoutMs: opts.timeoutMs ?? 9000 },
    );
    if (!raw) return null;
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]);
    if (!parsed?.isEmail) return null;
    const to = typeof parsed.to === 'string' ? parsed.to.trim() : '';
    const subject = typeof parsed.subject === 'string' ? parsed.subject.trim() : '';
    const body = typeof parsed.body === 'string' ? parsed.body.trim() : '';
    if (!subject && !body) return null;
    return { to, subject, body };
  } catch (e: any) {
    console.warn(`[EmailIntent] draft failed: ${e?.message || e}`);
    return null;
  }
}
