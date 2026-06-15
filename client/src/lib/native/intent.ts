import * as chrono from "chrono-node";
import { IS_NATIVE } from "@/lib/api-base";
import { getDeviceContacts, contactsToContext } from "./contacts";
import { getDeviceCalendarEvents, eventsToContext } from "./calendar";
import { addReminder, remindersAvailable } from "./reminders";

const REMINDER_RE = /\b(remind me|set (?:a |an |the )?(?:reminder|alarm)|wake me|alert me)\b/i;
const CONTACTS_RE = /\b(my contacts?|phone number|address book|contact list|number for|number of|email (for|of)|who('?s| is) in my contacts)\b/i;
const CALENDAR_RE = /\b(my calendar|my schedule|my agenda|my events?|appointments?|am i (free|busy)|free time|what('?s| is| do i have).{0,20}(schedule|calendar|agenda|today|tomorrow|week))\b/i;

export type DevicePrep = {
  deviceContext?: string;
  toast?: { title: string; description?: string };
};

function extractTitle(content: string, chronoText: string): string {
  let t = content.replace(chronoText, " ").replace(REMINDER_RE, " ").replace(/\s+/g, " ").trim();
  t = t.replace(/^(to|that|about|for|me to|i need to|i have to|i should)\s+/i, "").trim();
  t = t.replace(/[.,;:!?]+$/g, "").trim();
  return t || "Reminder";
}

/**
 * Native-only: inspects the outgoing chat message and, when relevant, reads
 * on-device data (contacts/calendar) and/or schedules a reminder, returning a
 * compact context string to inject into the AI prompt. No-op on web.
 */
export async function prepareDeviceContext(content: string): Promise<DevicePrep> {
  if (!IS_NATIVE) return {};
  const parts: string[] = [];
  let toast: DevicePrep["toast"];

  if (REMINDER_RE.test(content)) {
    if (remindersAvailable()) {
      // Real device notifications are in this build — schedule a persisted alarm.
      try {
        const results = chrono.parse(content, new Date(), { forwardDate: true });
        const when = results[0]?.start?.date();
        if (when && when.getTime() > Date.now() + 5000) {
          const title = extractTitle(content, results[0].text);
          const res = await addReminder({ title, fireAt: when.getTime() });
          if (res.ok) {
            toast = { title: "Reminder set", description: `“${title}” · ${when.toLocaleString()}` };
            parts.push(`A device reminder was just scheduled on the user's phone: "${title}" at ${when.toLocaleString()}. Confirm this to the user.`);
          } else if (res.reason !== "unavailable") {
            parts.push(`The user asked to set a reminder but it could not be scheduled (${res.message}). Let them know.`);
          }
        } else {
          parts.push(`The user seems to want a reminder, but no clear future time was found. Ask them what time to set it for, or point them to Device Tools.`);
        }
      } catch {
        /* ignore parse errors */
      }
    } else {
      // Older app build without the native notifications plugin: don't pretend to
      // schedule. Briefly steer the user to their connected calendar instead.
      parts.push(`The user appears to want a reminder/alarm, but on-device alarms aren't available in this app version. Briefly offer to add it to their connected calendar (Google/Outlook) if linked, or suggest they update the app for real device reminders. Keep it to one short sentence.`);
    }
  }

  // Contacts/calendar: only inject when we actually got data or hit a real
  // permission/runtime error. When the native plugin isn't in this build the
  // result is "unavailable" — skip silently so the server's cloud-connector
  // path (Google/Outlook) handles the request instead.
  if (CONTACTS_RE.test(content)) {
    const res = await getDeviceContacts();
    if (res.ok) parts.push(contactsToContext(res.data));
    else if (res.reason !== "unavailable") parts.push(`An attempt to read the user's phone contacts failed (${res.message}).`);
  }

  if (CALENDAR_RE.test(content)) {
    const res = await getDeviceCalendarEvents(21);
    if (res.ok) parts.push(eventsToContext(res.data));
    else if (res.reason !== "unavailable") parts.push(`An attempt to read the user's device calendar failed (${res.message}).`);
  }

  if (!parts.length) return { toast };
  return {
    deviceContext: `\n\nON-DEVICE DATA (from the user's phone, retrieved just now for THIS request — use it directly and reference specifics; do not claim you lack access):\n${parts.join("\n\n")}`,
    toast,
  };
}
