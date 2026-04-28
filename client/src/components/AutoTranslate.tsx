import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Globe, Check, Search, Loader2, ExternalLink } from "lucide-react";

const SUPPORTED = [
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "pt", name: "Português", flag: "🇵🇹" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "it", name: "Italiano", flag: "🇮🇹" },
  { code: "nl", name: "Nederlands", flag: "🇳🇱" },
  { code: "pl", name: "Polski", flag: "🇵🇱" },
  { code: "ru", name: "Русский", flag: "🇷🇺" },
  { code: "uk", name: "Українська", flag: "🇺🇦" },
  { code: "tr", name: "Türkçe", flag: "🇹🇷" },
  { code: "ar", name: "العربية", flag: "🇸🇦" },
  { code: "he", name: "עברית", flag: "🇮🇱" },
  { code: "fa", name: "فارسی", flag: "🇮🇷" },
  { code: "hi", name: "हिन्दी", flag: "🇮🇳" },
  { code: "bn", name: "বাংলা", flag: "🇧🇩" },
  { code: "pa", name: "ਪੰਜਾਬੀ", flag: "🇮🇳" },
  { code: "ur", name: "اردو", flag: "🇵🇰" },
  { code: "zh-CN", name: "中文 (简体)", flag: "🇨🇳" },
  { code: "zh-TW", name: "中文 (繁體)", flag: "🇹🇼" },
  { code: "ja", name: "日本語", flag: "🇯🇵" },
  { code: "ko", name: "한국어", flag: "🇰🇷" },
  { code: "vi", name: "Tiếng Việt", flag: "🇻🇳" },
  { code: "th", name: "ไทย", flag: "🇹🇭" },
  { code: "id", name: "Bahasa Indonesia", flag: "🇮🇩" },
  { code: "ms", name: "Bahasa Melayu", flag: "🇲🇾" },
  { code: "tl", name: "Filipino", flag: "🇵🇭" },
  { code: "sw", name: "Kiswahili", flag: "🇰🇪" },
  { code: "el", name: "Ελληνικά", flag: "🇬🇷" },
  { code: "cs", name: "Čeština", flag: "🇨🇿" },
  { code: "sv", name: "Svenska", flag: "🇸🇪" },
  { code: "no", name: "Norsk", flag: "🇳🇴" },
  { code: "da", name: "Dansk", flag: "🇩🇰" },
  { code: "fi", name: "Suomi", flag: "🇫🇮" },
  { code: "hu", name: "Magyar", flag: "🇭🇺" },
  { code: "ro", name: "Română", flag: "🇷🇴" },
  { code: "bg", name: "Български", flag: "🇧🇬" },
  { code: "hr", name: "Hrvatski", flag: "🇭🇷" },
  { code: "sk", name: "Slovenčina", flag: "🇸🇰" },
  { code: "sl", name: "Slovenščina", flag: "🇸🇮" },
  { code: "lt", name: "Lietuvių", flag: "🇱🇹" },
  { code: "lv", name: "Latviešu", flag: "🇱🇻" },
  { code: "et", name: "Eesti", flag: "🇪🇪" },
  { code: "ca", name: "Català", flag: "🇪🇸" },
  { code: "gl", name: "Galego", flag: "🇪🇸" },
  { code: "ta", name: "தமிழ்", flag: "🇮🇳" },
  { code: "te", name: "తెలుగు", flag: "🇮🇳" },
  { code: "ml", name: "മലയാളം", flag: "🇮🇳" },
  { code: "kn", name: "ಕನ್ನಡ", flag: "🇮🇳" },
  { code: "mr", name: "मराठी", flag: "🇮🇳" },
  { code: "gu", name: "ગુજરાતી", flag: "🇮🇳" },
  { code: "ne", name: "नेपाली", flag: "🇳🇵" },
  { code: "si", name: "සිංහල", flag: "🇱🇰" },
  { code: "my", name: "မြန်မာ", flag: "🇲🇲" },
  { code: "km", name: "ភាសាខ្មែរ", flag: "🇰🇭" },
  { code: "lo", name: "ລາວ", flag: "🇱🇦" },
  { code: "af", name: "Afrikaans", flag: "🇿🇦" },
  { code: "zu", name: "isiZulu", flag: "🇿🇦" },
  { code: "am", name: "አማርኛ", flag: "🇪🇹" },
  { code: "yo", name: "Yorùbá", flag: "🇳🇬" },
  { code: "ig", name: "Igbo", flag: "🇳🇬" },
  { code: "ha", name: "Hausa", flag: "🇳🇬" },
  { code: "ht", name: "Kreyòl Ayisyen", flag: "🇭🇹" },
  { code: "is", name: "Íslenska", flag: "🇮🇸" },
  { code: "ga", name: "Gaeilge", flag: "🇮🇪" },
  { code: "cy", name: "Cymraeg", flag: "🏴" },
  { code: "eo", name: "Esperanto", flag: "🌍" },
];

const STORAGE_KEY = "turbo_translate_lang";
const SUPPRESSED_KEY = "turbo_translate_suppressed";
const PENDING_KEY = "turbo_translate_pending";
const RELOADED_KEY = "turbo_translate_reloaded";

function readCookie(name: string): string {
  const m = document.cookie.match(new RegExp("(^|;\\s*)" + name + "=([^;]*)"));
  return m ? decodeURIComponent(m[2]) : "";
}

function setGoogtransCookie(targetLang: string) {
  const value = `/en/${targetLang}`;
  const host = window.location.hostname;
  const opts = "; path=/; max-age=31536000; SameSite=Lax";
  document.cookie = `googtrans=${value}${opts}`;
  document.cookie = `googtrans=${value}; domain=${host}${opts}`;
  const root = host.split(".").slice(-2).join(".");
  if (root && root !== host && root.includes(".")) {
    document.cookie = `googtrans=${value}; domain=.${root}${opts}`;
  }
}

function clearGoogtransCookie() {
  const host = window.location.hostname;
  const expire = "; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  document.cookie = `googtrans=${expire}`;
  document.cookie = `googtrans=${expire}; domain=${host}`;
  const root = host.split(".").slice(-2).join(".");
  if (root && root !== host && root.includes(".")) {
    document.cookie = `googtrans=${expire}; domain=.${root}`;
  }
}

function detectBrowserLang(): string {
  const raw = (navigator.language || (navigator as any).userLanguage || "en").trim();
  if (!raw) return "en";
  const lower = raw.toLowerCase();
  if (lower.startsWith("zh-tw") || lower.startsWith("zh-hk")) return "zh-TW";
  if (lower.startsWith("zh")) return "zh-CN";
  const base = lower.split("-")[0];
  if (SUPPORTED.some(l => l.code.toLowerCase() === lower)) return SUPPORTED.find(l => l.code.toLowerCase() === lower)!.code;
  if (SUPPORTED.some(l => l.code === base)) return base;
  return "en";
}

let scriptLoadAttempted = false;

function ensureMountTarget() {
  let el = document.getElementById("google_translate_element");
  if (!el) {
    el = document.createElement("div");
    el.id = "google_translate_element";
    // Off-screen positioning instead of display:none — Google's widget
    // refuses to attach to a display:none container.
    el.style.position = "fixed";
    el.style.top = "-9999px";
    el.style.left = "-9999px";
    el.style.width = "1px";
    el.style.height = "1px";
    el.style.overflow = "hidden";
    document.body.appendChild(el);
  }
  return el;
}

function loadGoogleScript(onReady: (ok: boolean) => void) {
  if (scriptLoadAttempted) {
    // Already attempted; just check if it's there.
    onReady(!!(window as any).google?.translate?.TranslateElement);
    return;
  }
  scriptLoadAttempted = true;
  ensureMountTarget();

  (window as any).googleTranslateElementInit = function () {
    try {
      const g = (window as any).google;
      if (g?.translate?.TranslateElement) {
        new g.translate.TranslateElement(
          {
            pageLanguage: "en",
            includedLanguages: SUPPORTED.map(l => l.code).join(","),
            autoDisplay: false,
            layout: g.translate.TranslateElement.InlineLayout.SIMPLE,
          },
          "google_translate_element",
        );
        onReady(true);
      } else {
        onReady(false);
      }
    } catch (err) {
      console.warn("[AutoTranslate] init failed:", err);
      onReady(false);
    }
  };

  const s = document.createElement("script");
  s.id = "google-translate-script";
  s.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
  s.async = true;
  s.onerror = () => {
    console.warn("[AutoTranslate] Google Translate script failed to load");
    onReady(false);
  };
  document.body.appendChild(s);
}

// Trigger Google Translate to re-scan after dynamic content updates (SPA route changes).
function nudgeTranslator() {
  // Dispatch a few "fake" mutations that Google's MutationObserver picks up.
  const root = document.body;
  if (!root) return;
  const marker = document.createElement("span");
  marker.style.display = "none";
  marker.textContent = " ";
  root.appendChild(marker);
  setTimeout(() => marker.remove(), 50);
}

export default function AutoTranslate() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [current, setCurrent] = useState<string>("en");
  const [pending, setPending] = useState<string | null>(null);
  const [scriptFailed, setScriptFailed] = useState(false);
  const [widgetReady, setWidgetReady] = useState(false);
  const reTranslateRef = useRef<number | null>(null);
  const [location] = useLocation();

  // Close menu on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // First-mount: detect device locale and apply if not already set, then load Google widget.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const suppressed = localStorage.getItem(SUPPRESSED_KEY) === "1";
      const cookie = readCookie("googtrans");
      const cookieLang = cookie?.startsWith("/en/") ? cookie.slice(4) : "";
      const pendingLang = sessionStorage.getItem(PENDING_KEY);

      let initial = stored || cookieLang || "";

      if (!initial && !suppressed) {
        const detected = detectBrowserLang();
        if (detected && detected !== "en") {
          initial = detected;
          localStorage.setItem(STORAGE_KEY, detected);
          setGoogtransCookie(detected);
          if (!sessionStorage.getItem(RELOADED_KEY)) {
            sessionStorage.setItem(RELOADED_KEY, "1");
            sessionStorage.setItem(PENDING_KEY, detected);
            window.location.reload();
            return;
          }
        }
      }

      // Sync cookie ↔ storage in BOTH directions so they never disagree.
      if (initial && initial !== "en" && cookieLang !== initial) {
        setGoogtransCookie(initial);
      }
      if ((!initial || initial === "en") && cookieLang && cookieLang !== "en") {
        clearGoogtransCookie();
      }

      setCurrent(initial || "en");
      if (pendingLang) {
        // We just reloaded after a language switch; keep the indicator until the widget runs.
        setPending(pendingLang);
        sessionStorage.removeItem(PENDING_KEY);
      }
    } catch (err) {
      console.warn("[AutoTranslate] mount error:", err);
    }

    // Load the widget. Give it a 6-second deadline; if it doesn't load, surface a fallback.
    let resolved = false;
    const timeout = window.setTimeout(() => {
      if (!resolved) {
        setScriptFailed(true);
        setPending(null);
      }
    }, 6000);

    loadGoogleScript((ok) => {
      resolved = true;
      window.clearTimeout(timeout);
      if (!ok) {
        setScriptFailed(true);
        setPending(null);
      } else {
        // Late success — clear any stale fallback flag from earlier timeout.
        setScriptFailed(false);
        setWidgetReady(true);
        // Give the widget ~1.2 s to apply translations, then drop the indicator.
        window.setTimeout(() => setPending(null), 1200);
      }
    });

    // Low-frequency safety-net nudge in case route-change nudges miss something.
    reTranslateRef.current = window.setInterval(() => {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && stored !== "en") nudgeTranslator();
    }, 15000) as unknown as number;

    return () => {
      if (reTranslateRef.current) window.clearInterval(reTranslateRef.current);
    };
  }, []);

  // Route-aware nudges: when the SPA route changes and a non-English language is active,
  // poke the DOM so Google Translate's MutationObserver re-translates the new content.
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored || stored === "en") return;
    if (!widgetReady) return;
    // Two nudges: immediately, then again after 600ms (after React has likely settled).
    nudgeTranslator();
    const t = window.setTimeout(() => nudgeTranslator(), 600);
    return () => window.clearTimeout(t);
  }, [location, widgetReady]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return SUPPORTED;
    return SUPPORTED.filter(l => l.name.toLowerCase().includes(q) || l.code.toLowerCase().includes(q));
  }, [search]);

  const choose = (code: string) => {
    setOpen(false);
    setSearch("");
    setCurrent(code);
    if (code === "en") {
      localStorage.setItem(STORAGE_KEY, "en");
      localStorage.setItem(SUPPRESSED_KEY, "1");
      clearGoogtransCookie();
      sessionStorage.removeItem(PENDING_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, code);
      localStorage.removeItem(SUPPRESSED_KEY);
      setGoogtransCookie(code);
      sessionStorage.setItem(PENDING_KEY, code);
    }
    sessionStorage.removeItem(RELOADED_KEY);
    // Small delay so the cookie is committed before reload (some browsers race).
    window.setTimeout(() => window.location.reload(), 80);
  };

  const openInGoogleTranslate = (code: string) => {
    const target = code === "en" ? "es" : code;
    const url = `https://translate.google.com/translate?sl=en&tl=${target}&u=${encodeURIComponent(window.location.href)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const currentLang = SUPPORTED.find(l => l.code === current) || SUPPORTED[0];
  const pendingLang = pending ? SUPPORTED.find(l => l.code === pending) : null;

  return (
    <>
      <div
        className="notranslate"
        translate="no"
        style={{
          position: "fixed",
          bottom: 16,
          left: 16,
          zIndex: 9998,
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <button
          onClick={() => setOpen(o => !o)}
          aria-label="Change language"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls="auto-translate-menu"
          data-testid="button-translate"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 12px",
            background: "rgba(20, 20, 25, 0.92)",
            color: "white",
            border: "1px solid rgba(168, 85, 247, 0.5)",
            borderRadius: 999,
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 600,
            boxShadow: "0 4px 14px rgba(0,0,0,0.4)",
            backdropFilter: "blur(8px)",
          }}
        >
          {pending ? <Loader2 size={14} className="animate-spin" /> : <Globe size={14} />}
          <span>{currentLang.flag}</span>
          <span style={{ display: window.innerWidth < 480 ? "none" : "inline" }}>
            {pending ? `Translating…` : currentLang.name}
          </span>
        </button>

        {open && (
          <div
            id="auto-translate-menu"
            role="menu"
            style={{
              position: "absolute",
              bottom: 48,
              left: 0,
              width: 280,
              maxHeight: 400,
              background: "rgba(15, 15, 20, 0.98)",
              border: "1px solid rgba(168, 85, 247, 0.4)",
              borderRadius: 12,
              boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
              backdropFilter: "blur(12px)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <div style={{ padding: "10px 12px", borderBottom: "1px solid #333" }}>
              <div style={{ position: "relative" }}>
                <Search size={13} style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", color: "#888" }} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search language…"
                  data-testid="input-translate-search"
                  style={{
                    width: "100%",
                    padding: "6px 8px 6px 26px",
                    background: "#1a1a1f",
                    border: "1px solid #333",
                    borderRadius: 6,
                    color: "white",
                    fontSize: 13,
                    outline: "none",
                  }}
                  autoFocus
                />
              </div>
            </div>
            <div style={{ overflowY: "auto", flex: 1 }}>
              {filtered.map(lang => (
                <div
                  key={lang.code}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    background: lang.code === current ? "rgba(168,85,247,0.15)" : "transparent",
                  }}
                >
                  <button
                    onClick={() => choose(lang.code)}
                    data-testid={`option-translate-${lang.code}`}
                    style={{
                      flex: 1,
                      padding: "8px 12px",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      background: "transparent",
                      border: "none",
                      color: lang.code === current ? "#c4b5fd" : "white",
                      cursor: "pointer",
                      fontSize: 13,
                      textAlign: "left",
                    }}
                    onMouseEnter={e => {
                      if (lang.code !== current) (e.currentTarget.parentElement as HTMLElement).style.background = "rgba(255,255,255,0.05)";
                    }}
                    onMouseLeave={e => {
                      if (lang.code !== current) (e.currentTarget.parentElement as HTMLElement).style.background = "transparent";
                    }}
                  >
                    <span style={{ fontSize: 16 }}>{lang.flag}</span>
                    <span style={{ flex: 1 }}>{lang.name}</span>
                    {lang.code === current && <Check size={14} color="#a78bfa" />}
                  </button>
                  {scriptFailed && lang.code !== "en" && (
                    <button
                      onClick={() => openInGoogleTranslate(lang.code)}
                      title="Open in Google Translate"
                      aria-label={`Open in Google Translate: ${lang.name}`}
                      style={{
                        padding: "6px 8px",
                        background: "transparent",
                        border: "none",
                        color: "#888",
                        cursor: "pointer",
                      }}
                    >
                      <ExternalLink size={12} />
                    </button>
                  )}
                </div>
              ))}
              {filtered.length === 0 && (
                <div style={{ padding: 16, textAlign: "center", color: "#888", fontSize: 13 }}>
                  No matches
                </div>
              )}
            </div>
            <div style={{ padding: "8px 12px", borderTop: "1px solid #333", fontSize: 11, color: "#888", textAlign: "center" }}>
              {scriptFailed
                ? "Translator blocked — click ↗ to open in Google Translate"
                : "Powered by Google Translate"}
            </div>
          </div>
        )}
      </div>

      {pending && pendingLang && (
        <div
          className="notranslate"
          translate="no"
          style={{
            position: "fixed",
            top: 16,
            right: 16,
            zIndex: 9999,
            background: "rgba(20, 20, 25, 0.95)",
            color: "white",
            padding: "8px 14px",
            borderRadius: 999,
            border: "1px solid rgba(168,85,247,0.5)",
            boxShadow: "0 4px 14px rgba(0,0,0,0.4)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 13,
            fontWeight: 500,
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          <Loader2 size={14} className="animate-spin" />
          <span>Translating to {pendingLang.flag} {pendingLang.name}…</span>
        </div>
      )}
    </>
  );
}
