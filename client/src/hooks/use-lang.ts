import { useState, useEffect } from "react";
import t, { LangCode, LANGUAGES } from "@/lib/translations";

const STORAGE_KEY = "turbo_lang";

function detectBrowserLang(): LangCode {
  const codes = LANGUAGES.map(l => l.code);
  const nav = navigator.language?.toLowerCase() || "";
  if (nav.startsWith("es")) return "es";
  if (nav.startsWith("fr")) return "fr";
  if (nav.startsWith("de")) return "de";
  if (nav.startsWith("it")) return "it";
  if (nav.startsWith("pt")) return "pt";
  if (nav.startsWith("zh")) return "zh";
  if (nav.startsWith("ja")) return "ja";
  if (nav.startsWith("ar")) return "ar";
  if (nav.startsWith("ko")) return "ko";
  return "en";
}

export function useLang() {
  const [lang, setLangState] = useState<LangCode>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as LangCode;
      if (stored && LANGUAGES.find(l => l.code === stored)) return stored;
    } catch {}
    return detectBrowserLang();
  });

  useEffect(() => {
    const meta = LANGUAGES.find(l => l.code === lang);
    document.documentElement.dir = meta?.rtl ? "rtl" : "ltr";
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = (code: LangCode) => {
    setLangState(code);
    try { localStorage.setItem(STORAGE_KEY, code); } catch {}
  };

  const tr = t[lang];
  const langMeta = LANGUAGES.find(l => l.code === lang)!;

  return { lang, setLang, tr, langMeta, LANGUAGES };
}
