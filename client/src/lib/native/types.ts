import { IS_NATIVE } from "@/lib/api-base";

export type NativeFailReason = "unavailable" | "denied" | "error";

export const PLUGIN = {
  contacts: "Contacts",
  calendar: "CapacitorCalendar",
  notifications: "LocalNotifications",
} as const;

/**
 * True only when running in the installed app AND the named native plugin was
 * actually compiled into this build. In an older app build that predates these
 * plugins, this returns false even though IS_NATIVE is true — so callers cleanly
 * fall back to the cloud-connector path instead of showing broken features.
 */
export function nativePluginAvailable(name: string): boolean {
  if (!IS_NATIVE) return false;
  try {
    const cap = (window as any).Capacitor;
    return !!(cap && typeof cap.isPluginAvailable === "function" && cap.isPluginAvailable(name));
  } catch {
    return false;
  }
}

export type NativeResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: NativeFailReason; message: string };

export function fail(reason: NativeFailReason, message: string): { ok: false; reason: NativeFailReason; message: string } {
  return { ok: false, reason, message };
}

export const WEB_FALLBACK_MESSAGE =
  "This works in the installed mobile app. On the web, connect your Google or Microsoft account under Settings → Connections instead.";
