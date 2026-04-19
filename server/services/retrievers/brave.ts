import type { Retriever, Source } from './types';

// Brave Search — gated on BRAVE_SEARCH_API_KEY. Free tier available.
export const braveRetriever: Retriever = {
  name: 'brave',
  isAvailable() { return !!process.env.BRAVE_SEARCH_API_KEY; },
  async search(query: string, limit = 5): Promise<Source[]> {
    const key = process.env.BRAVE_SEARCH_API_KEY;
    if (!key) return [];
    try {
      const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${limit}`;
      const res = await fetch(url, {
        headers: { 'Accept': 'application/json', 'X-Subscription-Token': key },
        signal: AbortSignal.timeout(7000),
      });
      if (!res.ok) return [];
      const data: any = await res.json();
      const hits = data?.web?.results || [];
      return hits.slice(0, limit).map((h: any, i: number) => ({
        title: String(h.title || '').slice(0, 160),
        url: h.url,
        snippet: String(h.description || '').replace(/<[^>]+>/g, '').slice(0, 320),
        publishedAt: h.age || h.page_age || null,
        provider: 'brave',
        score: 0.95 - i * 0.03,
      }));
    } catch { return []; }
  },
};
