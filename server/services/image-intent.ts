// Server-side image-generation intent detection for the main chat.
//
// The text engine is Claude-only and Claude cannot draw pixels. The client
// already detects most "make me a picture" phrasings with a regex and calls
// /api/generate-image directly. This module is the SERVER-SIDE backstop: when a
// chat message reaches the streaming route (because the client regex missed the
// phrasing), a cheap Haiku classifier decides whether the user is asking to
// CREATE a NEW image and, if so, returns a clean image prompt. The streaming
// route then generates the image instead of letting Claude reply with text it
// physically can't draw.
//
// Same philosophy as claude-tools.ts: a broad regex GATE keeps normal chat on
// the fast path; the (cheap, Haiku) classifier only runs when a message
// plausibly asks for an image. The classifier goes through callDirect so it uses
// the SAME Claude path as the rest of the text engine (Azure Foundry in prod),
// rather than a direct Anthropic key that prod may not have.

import { callDirect } from './direct-router';

// Strong image nouns (mirrors the client's CONNECT_NOUNS). Deliberately EXCLUDES
// ambiguous words (art, design, visual, scene, icon) so informational queries
// like "the art of war" or "design patterns" do NOT trip the gate.
const IMAGE_NOUNS =
  'image|picture|pic|photo|photograph|drawing|illustration|painting|portrait|' +
  'wallpaper|poster|avatar|sticker|banner|logo|mockup|headshot|artwork|render|rendering';

// Gate: fire the classifier only when a message plausibly asks for an image —
//   (a) a slash command (/image, /img, /draw, /art, /gen ...), OR
//   (b) a strong image noun appears anywhere, OR
//   (c) the message leads with a literal drawing verb.
// Generic verbs (make/create/generate/design/render) intentionally do NOT fire
// on their own — they only matter when paired with an image noun, caught by (b).
const IMAGE_GATE_RE = new RegExp(
  '(?:^\\s*/(?:image|img|draw|art|gen(?:erate)?)\\b)' +
    `|(?:\\b(?:${IMAGE_NOUNS})s?\\b)` +
    '|(?:^\\s*(?:please\\s+|hey\\s+|ok(?:ay)?\\s+)?(?:(?:can|could|would|will|pls|plz)\\s+(?:you\\s+)?)?(?:draw|paint|sketch|illustrate)\\b)',
  'i',
);

export function mightBeImageRequest(message: string): boolean {
  if (!message) return false;
  const t = message.trim();
  if (!t || t.length > 1000) return false; // long pastes aren't image prompts
  return IMAGE_GATE_RE.test(t);
}

const CLASSIFIER_SYSTEM =
  'You are a strict intent classifier for an AI assistant. Decide whether the ' +
  "user's message is asking the assistant to CREATE / GENERATE / DRAW / PAINT a " +
  'BRAND-NEW image, picture, logo, illustration, or artwork from a text ' +
  'description.\n\n' +
  'IS an image request: "draw a cat astronaut", "make me a logo for my cafe", ' +
  '"generate a sunset wallpaper", "/image neon city at night", "I want a picture ' +
  'of mars".\n' +
  'NOT an image request: factual or text questions; asking ABOUT an existing or ' +
  'uploaded image; editing an attached photo; or figurative uses ("draw a ' +
  'conclusion", "the art of war", "paint a picture with words", "picture this").\n\n' +
  'Respond with ONLY compact JSON, no prose and no code fences: ' +
  '{"isImage": boolean, "prompt": string}. "prompt" is a concise description of ' +
  'the image to generate (subject + key style/details), or "" when isImage is false.';

/**
 * Returns a clean image-generation prompt when the message is an image request,
 * or null otherwise. Gated by a cheap regex so normal chat is untouched.
 */
export async function detectImageRequest(
  message: string,
  opts: { timeoutMs?: number } = {},
): Promise<string | null> {
  if (!mightBeImageRequest(message)) return null;
  try {
    const raw = await callDirect(
      'anthropic/claude-haiku',
      [
        { role: 'system', content: CLASSIFIER_SYSTEM },
        { role: 'user', content: message.trim().slice(0, 1000) },
      ],
      { maxTokens: 200, temperature: 0, timeoutMs: opts.timeoutMs ?? 6000 },
    );
    if (!raw) return null;
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]);
    if (parsed && parsed.isImage === true) {
      const prompt = typeof parsed.prompt === 'string' ? parsed.prompt.trim() : '';
      return prompt || message.trim();
    }
    return null;
  } catch (e: any) {
    console.warn(`[ImageIntent] classify failed: ${e?.message || e}`);
    return null;
  }
}
