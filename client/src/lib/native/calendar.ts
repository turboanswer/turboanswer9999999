import { fail, WEB_FALLBACK_MESSAGE, nativePluginAvailable, PLUGIN, type NativeResult } from "./types";

export type SimpleEvent = {
  id: string;
  title: string;
  location: string | null;
  startDate: number;
  endDate: number;
  isAllDay?: boolean;
};

async function ensureReadAccess(): Promise<{ ok: true } | { ok: false; message: string }> {
  const { CapacitorCalendar, CalendarPermissionScope } = await import("@ebarooni/capacitor-calendar");
  const check = await CapacitorCalendar.checkPermission({ scope: CalendarPermissionScope.READ_CALENDAR });
  if (check.result === "granted") return { ok: true };
  const req = await CapacitorCalendar.requestReadOnlyCalendarAccess();
  if (req.result === "granted") return { ok: true };
  return { ok: false, message: "Permission to read your calendar was not granted." };
}

/** Reads upcoming device calendar events within the next `daysAhead` days. */
export async function getDeviceCalendarEvents(daysAhead = 14): Promise<NativeResult<SimpleEvent[]>> {
  if (!nativePluginAvailable(PLUGIN.calendar)) return fail("unavailable", WEB_FALLBACK_MESSAGE);
  try {
    const { CapacitorCalendar } = await import("@ebarooni/capacitor-calendar");
    const access = await ensureReadAccess();
    if (!access.ok) return fail("denied", access.message);
    const from = Date.now();
    const to = from + daysAhead * 24 * 60 * 60 * 1000;
    const res = await CapacitorCalendar.listEventsInRange({ from, to });
    const events: SimpleEvent[] = (res.result || [])
      .map((e) => ({
        id: e.id,
        title: e.title || "(untitled)",
        location: e.location ?? null,
        startDate: e.startDate,
        endDate: e.endDate,
        isAllDay: (e as any).isAllDay,
      }))
      .sort((a, b) => a.startDate - b.startDate);
    return { ok: true, data: events };
  } catch (e: any) {
    return fail("error", e?.message || "Could not read calendar.");
  }
}

/** Creates an event in the device calendar (after a full-access permission prompt). */
export async function createDeviceCalendarEvent(opts: {
  title: string;
  startDate: number;
  endDate: number;
  location?: string;
  description?: string;
}): Promise<NativeResult<{ id: string }>> {
  if (!nativePluginAvailable(PLUGIN.calendar)) return fail("unavailable", WEB_FALLBACK_MESSAGE);
  try {
    const { CapacitorCalendar } = await import("@ebarooni/capacitor-calendar");
    const req = await CapacitorCalendar.requestFullCalendarAccess();
    if (req.result !== "granted") return fail("denied", "Permission to edit your calendar was not granted.");
    const res = await CapacitorCalendar.createEvent({
      title: opts.title,
      startDate: opts.startDate,
      endDate: opts.endDate,
      location: opts.location,
      description: opts.description,
    });
    return { ok: true, data: { id: res.id } };
  } catch (e: any) {
    return fail("error", e?.message || "Could not create the calendar event.");
  }
}

/** Returns a compact text block of events for injecting into an AI prompt. */
export function eventsToContext(events: SimpleEvent[]): string {
  if (!events.length) return "Device calendar: no events in the upcoming window.";
  const fmt = (ms: number) =>
    new Date(ms).toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  const lines = events.map((e) => {
    const when = e.isAllDay ? `${new Date(e.startDate).toLocaleDateString()} (all day)` : `${fmt(e.startDate)} – ${fmt(e.endDate)}`;
    return `- ${e.title}${e.location ? ` @ ${e.location}` : ""} — ${when}`;
  });
  return `Upcoming device calendar events (${events.length}):\n${lines.join("\n")}`;
}
