import type { Retriever, Source } from './types';

// Tavily Search — gated on TAVILY_API_KEY.
export const tavilyRetriever: Retriever = {
  name: 'tavily',
  isAvailable() { return !!process.env.TAVILY_API_KEY; },
  async search(query: string, limit = 5): Promise<Source[]> {
    const key = process.env.TAVILY_API_KEY;
    if (!key) return [];
    try {
      const res = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: key,
          query,
          max_results: limit,
          include_answer: false,
          search_depth: 'basic',
        }),
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) return [];
      const data: any = await res.json();
      const hits = data?.results || [];
      return hits.slice(0, limit).map((h: any, i: number) => ({
        title: String(h.title || '').slice(0, 160),
        url: h.url,
        snippet: String(h.content || '').slice(0, 320),
        publishedAt: h.published_date || null,
        provider: 'tavily',
        score: typeof h.score === 'number' ? h.score : (0.9 - i * 0.05),
      }));
    } catch { return []; }
  },
};
