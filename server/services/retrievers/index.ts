import type { Retriever, Source } from './types';
import { wikipediaRetriever } from './wikipedia';
import { duckduckgoRetriever } from './duckduckgo';
import { braveRetriever } from './brave';
import { tavilyRetriever } from './tavily';

export type { Retriever, Source } from './types';

const ALL_RETRIEVERS: Retriever[] = [
  braveRetriever,
  tavilyRetriever,
  duckduckgoRetriever,
  wikipediaRetriever,
];

const CACHE_TTL_MS = 30 * 60 * 1000;
const cache = new Map<string, { sources: Source[]; ts: number }>();

// Per-provider rate limiting: drop calls when over limit in window
const RATE_WINDOW_MS = 60_000;
const RATE_LIMITS: Record<string, number> = {
  brave: 50,
  tavily: 50,
  duckduckgo: 30,
  wikipedia: 60,
};
const rateBuckets = new Map<string, number[]>();

function allowCall(name: string): boolean {
  const now = Date.now();
  const limit = RATE_LIMITS[name] ?? 60;
  const arr = (rateBuckets.get(name) || []).filter(t => now - t < RATE_WINDOW_MS);
  if (arr.length >= limit) { rateBuckets.set(name, arr); return false; }
  arr.push(now);
  rateBuckets.set(name, arr);
  return true;
}

function normalizeUrl(u: string): string {
  try {
    const p = new URL(u);
    p.hash = '';
    // Strip common tracking params
    ['utm_source','utm_medium','utm_campaign','utm_term','utm_content','ref','ref_src'].forEach(k => p.searchParams.delete(k));
    let s = p.toString();
    if (s.endsWith('/')) s = s.slice(0, -1);
    return s.toLowerCase();
  } catch { return u.toLowerCase(); }
}

function dedupAndRank(all: Source[]): Source[] {
  const byUrl = new Map<string, Source>();
  for (const s of all) {
    if (!s.url) continue;
    const k = normalizeUrl(s.url);
    const prev = byUrl.get(k);
    if (!prev) { byUrl.set(k, s); continue; }
    // Keep the higher-scored entry; merge a longer snippet if available
    const winner = (prev.score ?? 0) >= (s.score ?? 0) ? prev : s;
    const loser = winner === prev ? s : prev;
    if ((loser.snippet?.length || 0) > (winner.snippet?.length || 0)) {
      winner.snippet = loser.snippet;
    }
    byUrl.set(k, winner);
  }
  return Array.from(byUrl.values()).sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
}

export function listRetrievers(): { name: string; available: boolean }[] {
  return ALL_RETRIEVERS.map(r => ({ name: r.name, available: r.isAvailable() }));
}

export async function retrieveSources(query: string, opts?: { limit?: number; perProviderLimit?: number }): Promise<Source[]> {
  const limit = opts?.limit ?? 6;
  const per = opts?.perProviderLimit ?? 3;
  const key = query.toLowerCase().trim().slice(0, 200);
  const cached = cache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return cached.sources.slice(0, limit);
  }

  const active = ALL_RETRIEVERS.filter(r => r.isAvailable() && allowCall(r.name));
  const settled = await Promise.allSettled(active.map(r =>
    r.search(query, per).then(srcs => srcs.map(s => ({ ...s, provider: s.provider || r.name })))
  ));
  const all: Source[] = [];
  for (const s of settled) if (s.status === 'fulfilled') all.push(...s.value);

  const ranked = dedupAndRank(all).slice(0, limit);
  if (ranked.length) cache.set(key, { sources: ranked, ts: Date.now() });
  return ranked;
}
