// Keyless "real photo" lookup for "what does X look like" requests.
// Order: Wikipedia PageImages (best for real entities/landmarks/animals/people)
//   → Wikimedia Commons file search → Brave image search (only when
//   BRAVE_SEARCH_API_KEY is set). All keyless except the optional Brave step.

export interface ImageHit {
  url: string;
  title: string;
  source: string;
  sourceUrl: string;
}

const UA =
  "TurboAnswer/1.0 (https://turboanswer.it.com; support@turboanswer.it.com)";

async function getJson(url: string, timeoutMs = 8000): Promise<any | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "application/json" },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function isImageUrl(u: string): boolean {
  return /^https?:\/\//.test(u) && /\.(jpe?g|png|gif|webp)(\?|$)/i.test(u);
}

async function fromWikipedia(q: string): Promise<ImageHit | null> {
  const api =
    "https://en.wikipedia.org/w/api.php?action=query&format=json&redirects=1" +
    "&generator=search&gsrlimit=3&gsrnamespace=0" +
    "&prop=pageimages|info&inprop=url&piprop=original|thumbnail&pithumbsize=900" +
    "&gsrsearch=" +
    encodeURIComponent(q);
  const data = await getJson(api);
  const pages = data?.query?.pages;
  if (!pages) return null;
  const list = (Object.values(pages) as any[]).sort(
    (a, b) => (a?.index ?? 99) - (b?.index ?? 99),
  );
  for (const p of list) {
    const src = p?.original?.source || p?.thumbnail?.source;
    if (src && isImageUrl(src)) {
      return {
        url: src,
        title: p.title || q,
        source: "Wikipedia",
        sourceUrl:
          p.fullurl ||
          `https://en.wikipedia.org/wiki/${encodeURIComponent(p.title || q)}`,
      };
    }
  }
  return null;
}

async function fromCommons(q: string): Promise<ImageHit | null> {
  const api =
    "https://commons.wikimedia.org/w/api.php?action=query&format=json" +
    "&generator=search&gsrnamespace=6&gsrlimit=8" +
    "&prop=imageinfo&iiprop=url|mime&iiurlwidth=900" +
    "&gsrsearch=" +
    encodeURIComponent(q);
  const data = await getJson(api);
  const pages = data?.query?.pages;
  if (!pages) return null;
  const list = (Object.values(pages) as any[]).sort(
    (a, b) => (a?.index ?? 99) - (b?.index ?? 99),
  );
  for (const p of list) {
    const ii = p?.imageinfo?.[0];
    if (!ii) continue;
    const mime = ii.mime || "";
    if (!/^image\/(jpeg|png|webp|gif)$/.test(mime)) continue;
    const url = ii.thumburl || ii.url;
    if (url) {
      return {
        url,
        title: String(p.title || q)
          .replace(/^File:/i, "")
          .replace(/\.[a-z0-9]+$/i, ""),
        source: "Wikimedia Commons",
        sourceUrl: ii.descriptionurl || url,
      };
    }
  }
  return null;
}

async function fromBrave(q: string): Promise<ImageHit | null> {
  const key = process.env.BRAVE_SEARCH_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(
      "https://api.search.brave.com/res/v1/images/search?count=3&q=" +
        encodeURIComponent(q),
      {
        headers: { "X-Subscription-Token": key, Accept: "application/json" },
        signal: AbortSignal.timeout(8000),
      },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const first = (data?.results || []).find(
      (r: any) => r?.properties?.url || r?.thumbnail?.src,
    );
    const url = first?.properties?.url || first?.thumbnail?.src;
    if (url) {
      return {
        url,
        title: first?.title || q,
        source: first?.source || "Web",
        sourceUrl: first?.url || url,
      };
    }
  } catch {
    /* ignore */
  }
  return null;
}

export async function searchRealPhoto(query: string): Promise<ImageHit | null> {
  const q = (query || "").trim().slice(0, 200);
  if (!q) return null;
  return (await fromWikipedia(q)) || (await fromCommons(q)) || (await fromBrave(q));
}
