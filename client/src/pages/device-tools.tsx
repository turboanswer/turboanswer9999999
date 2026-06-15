import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "wouter";
import {
  Clock, Timer as TimerIcon, BellRing, Plus, Trash2, Play, Pause, RotateCcw,
  Smartphone, Globe, CalendarDays, Users, ArrowRight,
} from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { IS_NATIVE } from "@/lib/api-base";
import {
  listReminders, addReminder, removeReminder, rescheduleStoredReminders, type Reminder,
} from "@/lib/native/reminders";
import { getDeviceContacts } from "@/lib/native/contacts";
import { getDeviceCalendarEvents } from "@/lib/native/calendar";
import turboLogo from "@assets/file_000000007ff071f8a754520ac27c6ba4_1770423239509.png";

const WORLD_CLOCKS: { label: string; tz: string }[] = [
  { label: "Local", tz: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC" },
  { label: "New York", tz: "America/New_York" },
  { label: "London", tz: "Europe/London" },
  { label: "Dubai", tz: "Asia/Dubai" },
  { label: "Tokyo", tz: "Asia/Tokyo" },
  { label: "Sydney", tz: "Australia/Sydney" },
];

function fmtTime(d: Date, tz: string) {
  return d.toLocaleTimeString(undefined, { timeZone: tz, hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
function fmtDate(d: Date, tz: string) {
  return d.toLocaleDateString(undefined, { timeZone: tz, weekday: "short", month: "short", day: "numeric" });
}

export default function DeviceTools() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { toast } = useToast();

  const card = isDark ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200";
  const heading = isDark ? "text-white" : "text-slate-900";
  const muted = isDark ? "text-slate-400" : "text-slate-500";
  const inputCls = `w-full rounded-xl px-3 py-2.5 text-sm outline-none border ${isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"}`;

  // ── World clock ──────────────────────────────────────────────
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // ── Countdown timer ──────────────────────────────────────────
  const [timerInput, setTimerInput] = useState({ h: 0, m: 5, s: 0 });
  const [remaining, setRemaining] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = () => {
    const total = timerInput.h * 3600 + timerInput.m * 60 + timerInput.s;
    if (total <= 0) {
      toast({ title: "Set a duration first", variant: "destructive" });
      return;
    }
    setRemaining(total);
    setTimerRunning(true);
  };
  useEffect(() => {
    if (!timerRunning) return;
    timerRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          setTimerRunning(false);
          toast({ title: "⏰ Timer finished" });
          try { new Audio("data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQ==").play().catch(() => {}); } catch {}
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerRunning, toast]);

  const fmtRemaining = (s: number) => {
    const hh = Math.floor(s / 3600);
    const mm = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    return [hh, mm, ss].map((v) => String(v).padStart(2, "0")).join(":");
  };

  // ── Reminders ────────────────────────────────────────────────
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [remTitle, setRemTitle] = useState("");
  const [remWhen, setRemWhen] = useState("");
  const refreshReminders = useCallback(() => setReminders(listReminders()), []);
  useEffect(() => {
    refreshReminders();
    if (IS_NATIVE) rescheduleStoredReminders().then(refreshReminders);
  }, [refreshReminders]);

  const onAddReminder = async () => {
    if (!remTitle.trim()) { toast({ title: "Add a title", variant: "destructive" }); return; }
    if (!remWhen) { toast({ title: "Pick a date & time", variant: "destructive" }); return; }
    const fireAt = new Date(remWhen).getTime();
    const res = await addReminder({ title: remTitle.trim(), fireAt });
    if (!res.ok) { toast({ title: "Couldn't set reminder", description: res.message, variant: "destructive" }); return; }
    toast({ title: "Reminder set", description: `“${res.data.title}” at ${new Date(fireAt).toLocaleString()}` });
    setRemTitle(""); setRemWhen(""); refreshReminders();
  };
  const onRemoveReminder = async (id: number) => { await removeReminder(id); refreshReminders(); };

  // ── On-device contacts / calendar quick peek ─────────────────
  const [peek, setPeek] = useState<{ kind: "contacts" | "calendar"; lines: string[] } | null>(null);
  const [peekLoading, setPeekLoading] = useState<"contacts" | "calendar" | null>(null);

  const peekContacts = async () => {
    setPeekLoading("contacts");
    const res = await getDeviceContacts();
    setPeekLoading(null);
    if (!res.ok) { toast({ title: "Contacts unavailable", description: res.message, variant: "destructive" }); return; }
    setPeek({ kind: "contacts", lines: res.data.slice(0, 25).map((c) => `${c.name}${c.phones[0] ? " · " + c.phones[0] : ""}`) });
  };
  const peekCalendar = async () => {
    setPeekLoading("calendar");
    const res = await getDeviceCalendarEvents(14);
    setPeekLoading(null);
    if (!res.ok) { toast({ title: "Calendar unavailable", description: res.message, variant: "destructive" }); return; }
    setPeek({ kind: "calendar", lines: res.data.slice(0, 25).map((e) => `${e.title} · ${new Date(e.startDate).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`) });
  };

  return (
    <div className={`min-h-screen ${isDark ? "bg-gradient-to-b from-slate-950 via-indigo-950/10 to-slate-950" : "bg-gradient-to-b from-white via-indigo-50/20 to-white"}`}>
      <div className="max-w-4xl mx-auto px-4 py-6" style={{ paddingTop: "max(24px, env(safe-area-inset-top))" }}>
        <div className="flex items-center justify-between mb-6">
          <Link href="/">
            <Button variant="ghost" className={isDark ? "text-indigo-300" : "text-indigo-600"}>&larr; Back</Button>
          </Link>
          <img src={turboLogo} alt="TurboAnswer" className="h-8 w-8 rounded-lg" />
        </div>

        <div className="mb-8">
          <h1 className={`text-3xl font-bold mb-1 flex items-center gap-2 ${heading}`}>
            <Smartphone className="h-7 w-7 text-indigo-500" /> Device Tools
          </h1>
          <p className={muted}>World clock, timers, and reminders — plus quick access to your phone’s contacts and calendar.</p>
        </div>

        {/* World Clock */}
        <section className={`rounded-2xl border p-5 mb-6 ${card}`}>
          <h2 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${heading}`}><Globe className="h-5 w-5 text-indigo-500" /> World Clock</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {WORLD_CLOCKS.map((c) => (
              <div key={c.label} className={`rounded-xl p-3 ${isDark ? "bg-slate-800/60" : "bg-slate-50"}`}>
                <div className={`text-xs font-medium ${muted}`}>{c.label}</div>
                <div className={`text-xl font-bold tabular-nums ${heading}`}>{fmtTime(now, c.tz)}</div>
                <div className={`text-xs ${muted}`}>{fmtDate(now, c.tz)}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Timer */}
        <section className={`rounded-2xl border p-5 mb-6 ${card}`}>
          <h2 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${heading}`}><TimerIcon className="h-5 w-5 text-indigo-500" /> Countdown Timer</h2>
          {remaining > 0 || timerRunning ? (
            <div className="flex flex-col items-center gap-4">
              <div className={`text-5xl font-bold tabular-nums ${heading}`}>{fmtRemaining(remaining)}</div>
              <div className="flex gap-2">
                <Button onClick={() => setTimerRunning((p) => !p)} variant="secondary">
                  {timerRunning ? <><Pause className="h-4 w-4 mr-1" /> Pause</> : <><Play className="h-4 w-4 mr-1" /> Resume</>}
                </Button>
                <Button onClick={() => { setTimerRunning(false); setRemaining(0); }} variant="ghost"><RotateCcw className="h-4 w-4 mr-1" /> Reset</Button>
              </div>
            </div>
          ) : (
            <div className="flex items-end gap-3">
              {(["h", "m", "s"] as const).map((u) => (
                <div key={u} className="flex-1">
                  <label className={`text-xs ${muted}`}>{u === "h" ? "Hours" : u === "m" ? "Minutes" : "Seconds"}</label>
                  <input type="number" min={0} max={u === "h" ? 99 : 59} value={timerInput[u]}
                    onChange={(e) => setTimerInput((p) => ({ ...p, [u]: Math.max(0, parseInt(e.target.value) || 0) }))}
                    className={inputCls} />
                </div>
              ))}
              <Button onClick={startTimer} className="bg-indigo-600 hover:bg-indigo-700 text-white"><Play className="h-4 w-4 mr-1" /> Start</Button>
            </div>
          )}
        </section>

        {/* Reminders */}
        <section className={`rounded-2xl border p-5 mb-6 ${card}`}>
          <h2 className={`text-lg font-semibold mb-1 flex items-center gap-2 ${heading}`}><BellRing className="h-5 w-5 text-indigo-500" /> Reminders & Alarms</h2>
          <p className={`text-sm mb-4 ${muted}`}>
            {IS_NATIVE ? "These fire as real device notifications and survive app restarts." : "Open the mobile app to set reminders that fire as real device notifications."}
          </p>
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <input value={remTitle} onChange={(e) => setRemTitle(e.target.value)} placeholder="Remind me to…" className={inputCls} />
            <input type="datetime-local" value={remWhen} onChange={(e) => setRemWhen(e.target.value)} className={`${inputCls} sm:w-56`} />
            <Button onClick={onAddReminder} disabled={!IS_NATIVE} className="bg-indigo-600 hover:bg-indigo-700 text-white shrink-0"><Plus className="h-4 w-4 mr-1" /> Set</Button>
          </div>
          {reminders.length === 0 ? (
            <p className={`text-sm ${muted}`}>No reminders yet.</p>
          ) : (
            <ul className="space-y-2">
              {reminders.map((r) => (
                <li key={r.id} className={`flex items-center justify-between rounded-xl px-3 py-2.5 ${isDark ? "bg-slate-800/60" : "bg-slate-50"}`}>
                  <div className="min-w-0">
                    <div className={`font-medium truncate ${heading}`}>{r.title}</div>
                    <div className={`text-xs ${muted}`}>{new Date(r.fireAt).toLocaleString()}</div>
                  </div>
                  <button onClick={() => onRemoveReminder(r.id)} className="text-red-500 p-2 shrink-0"><Trash2 className="h-4 w-4" /></button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* On-device contacts & calendar */}
        <section className={`rounded-2xl border p-5 mb-10 ${card}`}>
          <h2 className={`text-lg font-semibold mb-1 flex items-center gap-2 ${heading}`}><CalendarDays className="h-5 w-5 text-indigo-500" /> Phone Contacts & Calendar</h2>
          {IS_NATIVE ? (
            <>
              <p className={`text-sm mb-4 ${muted}`}>Grant access so the assistant can use what’s on your phone. You can also ask in chat, e.g. “what’s on my calendar this week?”.</p>
              <div className="flex gap-2 mb-4">
                <Button onClick={peekContacts} disabled={peekLoading === "contacts"} variant="secondary"><Users className="h-4 w-4 mr-1" /> {peekLoading === "contacts" ? "Loading…" : "View Contacts"}</Button>
                <Button onClick={peekCalendar} disabled={peekLoading === "calendar"} variant="secondary"><CalendarDays className="h-4 w-4 mr-1" /> {peekLoading === "calendar" ? "Loading…" : "View Calendar"}</Button>
              </div>
              {peek && (
                <div className={`rounded-xl p-3 max-h-64 overflow-y-auto ${isDark ? "bg-slate-800/60" : "bg-slate-50"}`}>
                  <div className={`text-xs font-semibold mb-2 ${muted}`}>{peek.kind === "contacts" ? "Contacts" : "Upcoming events"}</div>
                  {peek.lines.length === 0 ? <div className={`text-sm ${muted}`}>Nothing found.</div> :
                    <ul className="space-y-1">{peek.lines.map((l, i) => <li key={i} className={`text-sm ${heading}`}>{l}</li>)}</ul>}
                </div>
              )}
            </>
          ) : (
            <>
              <p className={`text-sm mb-4 ${muted}`}>Reading your phone’s contacts and calendar is available in the installed mobile app. On the web, connect your cloud accounts instead.</p>
              <Link href="/ai-settings?tab=connections">
                <Button variant="secondary">Connect Google / Microsoft <ArrowRight className="h-4 w-4 ml-1" /></Button>
              </Link>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
