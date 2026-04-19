import type { Retriever, Source } from './types';

// DuckDuckGo Instant Answer API — free, no key. Coverage is shallow but useful
// for definitions, calculations, and well-known entities. We complement with the
// HTML endpoint for related topics when the instant answer is empty.
export const duckduckgoRetriever: Retriever = {
  name: 'duckduckgo',
  isAvailable() { return true; },
  async search(query: string, limit = 3): Promise<Source[]> {
    try {
      const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1&t=turboanswer`;
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) return [];
      const data: any = await res.json();
      const out: Source[] = [];

      if (data?.AbstractText && data?.AbstractURL) {
        out.push({
          title: data.Heading || query,
          url: data.AbstractURL,
          snippet: String(data.AbstractText).slice(0, 320),
          provider: 'duckduckgo',
          score: 0.85,
          publishedAt: null,
        });
      }
      if (data?.Answer && data?.AnswerType) {
        out.push({
          title: `Instant: ${data.AnswerType}`,
          url: data.AbstractURL || `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
          snippet: String(data.Answer).slice(0, 280),
          provider: 'duckduckgo',
          score: 0.9,
          publishedAt: null,
        });
      }
      const related = Array.isArray(data?.RelatedTopics) ? data.RelatedTopics : [];
      for (const r of related) {
        if (out.length >= limit) break;
        if (r?.Text && r?.FirstURL) {
          out.push({
            title: String(r.Text).split(' - ')[0].slice(0, 120),
            url: r.FirstURL,
            snippet: String(r.Text).slice(0, 280),
            provider: 'duckduckgo',
            score: 0.6,
            publishedAt: null,
          });
        }
      }
      return out.slice(0, limit);
    } catch { return []; }
  },
};
