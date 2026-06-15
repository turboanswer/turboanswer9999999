import { IS_NATIVE } from "@/lib/api-base";
import { fail, type NativeResult } from "./types";
import { scheduleNotification, cancelNotification } from "./notifications";

export type Reminder = {
  id: number; // also the native notification id
  title: string;
  body?: string;
  fireAt: number; // epoch ms
  createdAt: number;
};

const KEY = "turbo_reminders_v1";

function load(): Reminder[] {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as Reminder[]) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function persist(list: Reminder[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // ignore quota errors
  }
}

function newId(): number {
  // 32-bit positive int — native notification ids must fit a Java int.
  return Math.floor(Math.random() * 2_000_000_000) + 1;
}

/** All stored reminders (upcoming first). */
export function listReminders(): Reminder[] {
  return load().sort((a, b) => a.fireAt - b.fireAt);
}

/**
 * Creates a reminder: persists it and schedules a real device notification.
 * Persisted in localStorage so it can be re-scheduled after an app restart.
 */
export async function addReminder(opts: {
  title: string;
  body?: string;
  fireAt: number;
}): Promise<NativeResult<Reminder>> {
  if (!IS_NATIVE) return fail("unavailable", "Reminders with real device alerts work in the installed mobile app.");
  if (opts.fireAt <= Date.now()) return fail("error", "Please pick a time in the future.");
  const reminder: Reminder = {
    id: newId(),
    title: opts.title.trim() || "Reminder",
    body: opts.body,
    fireAt: opts.fireAt,
    createdAt: Date.now(),
  };
  const res = await scheduleNotification({
    id: reminder.id,
    title: reminder.title,
    body: reminder.body,
    fireAt: reminder.fireAt,
  });
  if (!res.ok) return res;
  const list = load();
  list.push(reminder);
  persist(list);
  return { ok: true, data: reminder };
}

/** Cancels a reminder's notification and removes it from storage. */
export async function removeReminder(id: number): Promise<void> {
  await cancelNotification(id);
  persist(load().filter((r) => r.id !== id));
}

/**
 * Re-schedules all future reminders and prunes past ones. Call on app launch so
 * reminders survive restarts even if the OS dropped the scheduled alarms.
 */
export async function rescheduleStoredReminders(): Promise<void> {
  if (!IS_NATIVE) return;
  const now = Date.now();
  const list = load();
  const upcoming = list.filter((r) => r.fireAt > now);
  // Drop reminders that have already fired.
  if (upcoming.length !== list.length) persist(upcoming);
  for (const r of upcoming) {
    await scheduleNotification({ id: r.id, title: r.title, body: r.body, fireAt: r.fireAt });
  }
}
