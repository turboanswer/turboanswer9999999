// Lightweight manual persistence for React Query so the app shows the user's
// conversations (and the last-opened conversation's messages) INSTANTLY on a
// cold start, instead of a blank screen while the network request runs.
//
// We deliberately avoid the @tanstack/query-persist packages (can't add deps)
// and we never write big base64 image payloads to localStorage (≈5MB quota) —
// inline `data:` URLs are replaced with a tiny marker before saving. On boot we
// hydrate the cache, then the chat page invalidates once so fresh data (with
// real images) is refetched in the background.

import { queryClient } from "./queryClient";

const LS_KEY = "ta_qcache_v1";
const MAX_BYTES = 1_500_000; // stay well under the localStorage quota

// Replace inline data: URLs (base64 images) so persisted JSON stays small.
function stripHeavy(value: any): any {
  if (typeof value === "string") {
    return value.replace(/data:[^;,\s]+;base64,[A-Za-z0-9+/=]+/g, "[image]");
  }
  if (Array.isArray(value)) return value.map(stripHeavy);
  if (value && typeof value === "object") {
    const out: Record<string, any> = {};
    for (const k of Object.keys(value)) out[k] = stripHeavy(value[k]);
    return out;
  }
  return value;
}

interface PersistedEntry {
  key: unknown[];
  data: unknown;
}

// Only persist conversation-related queries (list + per-conversation messages).
function shouldPersist(key: readonly unknown[]): boolean {
  return Array.isArray(key) && key[0] === "/api/conversations";
}

export function hydratePersistedCache(): void {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as { entries?: PersistedEntry[] };
    if (!parsed?.entries) return;
    for (const e of parsed.entries) {
      if (e && Array.isArray(e.key) && e.data !== undefined) {
        queryClient.setQueryData(e.key, e.data);
      }
    }
  } catch {
    /* ignore corrupt cache */
  }
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

function saveNow(): void {
  try {
    const all = queryClient.getQueryCache().getAll();
    const entries: PersistedEntry[] = [];
    for (const q of all) {
      const key = q.queryKey as unknown[];
      if (!shouldPersist(key)) continue;
      const data = q.state.data;
      if (data === undefined) continue;
      entries.push({ key, data: stripHeavy(data) });
    }
    let payload = JSON.stringify({ ts: Date.now(), entries });
    // If still too big, keep only the conversation LIST (key length 1).
    if (payload.length > MAX_BYTES) {
      const listOnly = entries.filter((e) => e.key.length === 1);
      payload = JSON.stringify({ ts: Date.now(), entries: listOnly });
    }
    if (payload.length <= MAX_BYTES) {
      localStorage.setItem(LS_KEY, payload);
    }
  } catch {
    /* quota or serialization error — skip this save */
  }
}

export function startPersistingCache(): void {
  queryClient.getQueryCache().subscribe(() => {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(saveNow, 400);
  });
}
