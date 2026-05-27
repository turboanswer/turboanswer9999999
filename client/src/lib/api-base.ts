const AZURE_BACKEND = "https://turboanswergroup-dce0g0azd4bnanhs.westus2-01.azurewebsites.net";

function detectNative(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as any).Capacitor;
  if (cap && typeof cap.isNativePlatform === "function") {
    try { return !!cap.isNativePlatform(); } catch {}
  }
  if (typeof location !== "undefined") {
    if (location.protocol === "capacitor:" || location.protocol === "capacitor-electron:") return true;
    if (location.protocol === "file:") return true;
    if (location.protocol === "https:" && location.hostname === "localhost") return true;
  }
  return false;
}

export const IS_NATIVE = detectNative();
export const API_BASE = IS_NATIVE ? AZURE_BACKEND : "";

export function resolveApiUrl(url: string): string {
  if (!url) return url;
  if (/^https?:\/\//i.test(url)) return url;
  if (!API_BASE) return url;
  if (url.startsWith("/")) return `${API_BASE}${url}`;
  return url;
}
