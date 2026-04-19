import type { Retriever, Source } from './types';

export const wikipediaRetriever: Retriever = {
  name: 'wikipedia',
  isAvailable() { return true; },
  async search(query: string, limit = 3): Promise<Source[]> {
    try {
      const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&format=json&srsearch=${encodeURIComponent(query)}&srlimit=${limit}&srprop=snippet|timestamp&origin=*`;
      const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
      if (!res.ok) return [];
      const data: any = await res.json();
      const hits = data?.query?.search || [];
      return hits.slice(0, limit).map((h: any, i: number) => ({
        title: h.title,
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(h.title.replace(/ /g, '_'))}`,
        snippet: (h.snippet || '').replace(/<[^>]+>/g, '').slice(0, 280),
        publishedAt: h.timestamp || null,
        provider: 'wikipedia',
        score: 0.7 - i * 0.05,
      }));
    } catch { return []; }
  },
};
