import { fail, WEB_FALLBACK_MESSAGE, nativePluginAvailable, PLUGIN, type NativeResult } from "./types";

const CHANNEL_ID = "reminders";
let channelEnsured = false;

async function ensureChannel(): Promise<void> {
  if (channelEnsured) return;
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    // createChannel is a no-op on Android < 8 and on platforms without channels.
    await LocalNotifications.createChannel({
      id: CHANNEL_ID,
      name: "Reminders & Alarms",
      description: "Scheduled reminders and alarms you set in Turbo Answer",
      importance: 5,
      visibility: 1,
      vibration: true,
    });
    channelEnsured = true;
  } catch {
    // Channel creation is best-effort; scheduling still works on the default channel.
  }
}

/** Ensures the OS notification permission is granted (prompts once if needed). */
export async function ensureNotificationPermission(): Promise<NativeResult<true>> {
  if (!nativePluginAvailable(PLUGIN.notifications)) return fail("unavailable", WEB_FALLBACK_MESSAGE);
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    let perm = await LocalNotifications.checkPermissions();
    if (perm.display !== "granted") {
      perm = await LocalNotifications.requestPermissions();
    }
    if (perm.display !== "granted") {
      return fail("denied", "Notification permission was not granted.");
    }
    await ensureChannel();
    return { ok: true, data: true };
  } catch (e: any) {
    return fail("error", e?.message || "Could not request notification permission.");
  }
}

/** Schedules a single local notification at the given epoch-ms time. */
export async function scheduleNotification(opts: {
  id: number;
  title: string;
  body?: string;
  fireAt: number;
}): Promise<NativeResult<true>> {
  if (!nativePluginAvailable(PLUGIN.notifications)) return fail("unavailable", WEB_FALLBACK_MESSAGE);
  if (opts.fireAt <= Date.now()) return fail("error", "That time is in the past.");
  const perm = await ensureNotificationPermission();
  if (!perm.ok) return perm;
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    await LocalNotifications.schedule({
      notifications: [
        {
          id: opts.id,
          title: opts.title,
          body: opts.body || "",
          schedule: { at: new Date(opts.fireAt), allowWhileIdle: true },
          channelId: CHANNEL_ID,
        },
      ],
    });
    return { ok: true, data: true };
  } catch (e: any) {
    return fail("error", e?.message || "Could not schedule the notification.");
  }
}

/** Cancels a previously scheduled notification by id. */
export async function cancelNotification(id: number): Promise<void> {
  if (!nativePluginAvailable(PLUGIN.notifications)) return;
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    await LocalNotifications.cancel({ notifications: [{ id }] });
  } catch {
    // ignore
  }
}
