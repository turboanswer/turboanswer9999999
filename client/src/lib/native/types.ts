export type NativeFailReason = "unavailable" | "denied" | "error";

export type NativeResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: NativeFailReason; message: string };

export function fail(reason: NativeFailReason, message: string): { ok: false; reason: NativeFailReason; message: string } {
  return { ok: false, reason, message };
}

export const WEB_FALLBACK_MESSAGE =
  "This works in the installed mobile app. On the web, connect your Google or Microsoft account under Settings → Connections instead.";
