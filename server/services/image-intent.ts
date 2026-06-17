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

// Lookup triggers: "what does X look like", "real/actual photo of X". These have
// no image noun, so the noun gate alone would miss them.
const LOOKUP_RE =
  '(?:\\bwhat\\b[\\s\\S]{0,40}?\\blooks?\\s+like\\b)' +
  '|(?:\\b(?:real|actual|true)\\s+(?:photo|picture|image|pic|photograph)s?\\b)' +
  '|(?:\\b(?:find|look\\s*up|search\\s+for)\\b[\\s\\S]{0,30}?\\b(?:photo|picture|image|pic|photograph)s?\\b)';

// Gate: fire the classifier only when a message plausibly asks for an image —
//   (a) a slash command (/image, /img, /draw, /art, /gen ...), OR
//   (b) a strong image noun appears anywhere, OR
//   (c) the message leads with a literal drawing verb, OR
//   (d) a "what does X look like" / "real photo of X" lookup phrasing.
// Generic verbs (make/create/generate/design/render) intentionally do NOT fire
// on their own — they only matter when paired with an image noun, caught by (b).
const IMAGE_GATE_RE = new RegExp(
  '(?:^\\s*/(?:image|img|draw|art|gen(?:erate)?)\\b)' +
    `|(?:\\b(?:${IMAGE_NOUNS})s?\\b)` +
    '|(?:^\\s*(?:please\\s+|hey\\s+|ok(?:ay)?\\s+)?(?:(?:can|could|would|will|pls|plz)\\s+(?:you\\s+)?)?(?:draw|paint|sketch|illustrate)\\b)' +
    `|(?:${LOOKUP_RE})`,
  'i',
);

export function mightBeImageRequest(message: string): boolean {
  if (!message) return false;
  const t = message.trim();
  if (!t || t.length > 1000) return false; // long pastes aren't image prompts
  return IMAGE_GATE_RE.test(t);
}

const CLASSIFIER_SYSTEM =
  'You are a strict intent classifier for an AI assistant that can BOTH generate ' +
  'new images AND look up real existing photos. Classify the intent:\n\n' +
  '- "generate": the user wants the assistant to CREATE / DRAW / PAINT a ' +
  'BRAND-NEW image, logo, illustration, or artwork from a description. ' +
  'e.g. "draw a cat astronaut", "make me a logo for my cafe", "generate a ' +
  'sunset wallpaper", "/image neon city at night", "I want a picture of mars".\n' +
  '- "lookup": the user wants to SEE a REAL, existing photo of something real. ' +
  'e.g. "what does the Eiffel Tower look like", "show me a real photo of a red ' +
  'panda", "find a picture of the Tesla Cybertruck", "what does a capybara look ' +
  'like".\n' +
  '- "none": factual or text questions; asking ABOUT an uploaded image; editing ' +
  'an attached photo; or figurative uses ("draw a conclusion", "the art of war", ' +
  '"paint a picture with words", "picture this", "it looks like rain").\n\n' +
  'Respond with ONLY compact JSON, no prose and no code fences: ' +
  '{"intent": "generate"|"lookup"|"none", "query": string}. For "generate", ' +
  '"query" is a concise image description (subject + key style). For "lookup", ' +
  '"query" is the real-world subject to find a photo of. Use "" when "none".';

export interface ImageAction {
  mode: 'generate' | 'lookup';
  query: string;
}

/**
 * Classify a chat message as an image GENERATE request, a real-photo LOOKUP
 * request, or neither. Gated by a cheap regex so normal chat is untouched; the
 * (cheap, Haiku) classifier only runs when a message plausibly involves images.
 */
export async function detectImageAction(
  message: string,
  opts: { timeoutMs?: number } = {},
): Promise<ImageAction | null> {
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
    const intent = parsed?.intent;
    const query = typeof parsed?.query === 'string' ? parsed.query.trim() : '';
    if (intent === 'generate') return { mode: 'generate', query: query || message.trim() };
    if (intent === 'lookup' && query) return { mode: 'lookup', query };
    return null;
  } catch (e: any) {
    console.warn(`[ImageIntent] classify failed: ${e?.message || e}`);
    return null;
  }
}

/**
 * Backward-compatible helper: returns a clean image-generation prompt when the
 * message is a GENERATE request, or null otherwise.
 */
export async function detectImageRequest(
  message: string,
  opts: { timeoutMs?: number } = {},
): Promise<string | null> {
  const action = await detectImageAction(message, opts);
  return action && action.mode === 'generate' ? action.query : null;
}
