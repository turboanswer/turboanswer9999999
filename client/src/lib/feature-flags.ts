/**
 * Feature flags. Flip these to true once the underlying feature is rebuilt.
 *
 * TTS_ENABLED:
 *   The current text-to-speech uses the browser's built-in SpeechSynthesis
 *   API, which sounds robotic / "ghost-like" on most platforms. Hidden
 *   everywhere until we replace it with OpenAI Realtime Voice (WebRTC,
 *   ephemeral session tokens, mic ↔ speaker pipeline).
 */
export const TTS_ENABLED = false;
export const VOICE_TALK_ENABLED = false;
