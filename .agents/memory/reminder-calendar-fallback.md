---
name: Reminder → calendar fallback (server-side)
description: How "remind me at 5pm" becomes a real event on the user's connected calendar when no native alarm is possible, plus the two traps that bite this path.
---

# Reminder fallback (web / old-app builds)

When a build can't set a native device alarm (web, or older Android without the local-notifications plugin), the chat stream route creates a REAL timed event on the user's connected Google/Microsoft calendar instead. Detection is server-side in the connected-accounts pre-flight of `POST /api/conversations/:id/messages/stream`. The native client (intent.ts) injects a `device reminder was just scheduled` marker into deviceContext when it schedules an on-device alarm; the server checks for that marker and SKIPS the calendar fallback to avoid double-booking.

## Decision: reminders auto-execute (no signed-proposal confirmation)
Other connected-account write-actions (send email, create event from a general request) require a server-signed single-use HMAC confirmation token before `executeAction` runs. The reminder fallback deliberately calls `executeAction` DIRECTLY, with no confirm step.
**Why:** a reminder is the user's own explicit request ("remind me…"), the event is self-only / no-attendees / on the user's own calendar, and args are 100% server-constructed (title from the user's own message, start/end from the parsed time) — the user cannot inject attendees or target another account. Two architect reviews accepted this as a well-scoped exception, not a security regression.
**How to apply:** keep this exception narrow. If you ever let reminder args carry attendees, free-form bodies, or a client-chosen provider/connection, re-introduce the signed-proposal confirmation.

## Trap 1: timezone offset must NOT use Intl hour12:false
The server runs in UTC, so "5pm" must be parsed in the USER's timezone (`user.timezone`). Deriving the offset by formatting parts with `hour12:false` and diffing `Date.UTC(...)` is BROKEN: ICU returns hour `"24"` at midnight, inflating the offset by a full day (e.g. Tokyo → +1980 min instead of +540) and scheduling reminders a day off.
**Fix in use:** derive the offset from `Intl.DateTimeFormat(..., { timeZoneName: 'longOffset' })` → parse "GMT+09:00" → ±minutes (plain "GMT"/"UTC" → 0). Pass that to `chrono.parse(text, { instant, timezone: offsetMinutes }, { forwardDate: true })`.

## Trap 2: provider datetime formats differ
Google `calendar_create_event` takes a full ISO with `Z` (`start.dateTime` only). Microsoft `ms_calendar_create_event` tags the value `timeZone:"UTC"`, so it needs a UTC-naive datetime (`...slice(0,19)`, no `Z`). Mixing these up shifts or rejects the event.

## Routing note
Reminder intent only "owns the turn" (skips the generic tool classifier) when REMINDER_RE matches AND a read-question guard (`what's/when/do i have/…`) does NOT — so "remind me what's on my calendar tomorrow" still routes to a calendar READ, not an event CREATE. The shared REMINDER_RE lives in BOTH `server/routes.ts` and `client/src/lib/native/intent.ts`; keep them identical or native-vs-server behavior diverges.
