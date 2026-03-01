import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { STORAGE_KEYS, TEXT } from "../gameData";
import type { Lang, LanguageContextValue } from "../types";

const LanguageContext = createContext<LanguageContextValue | null>(null);

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => readStorage<Lang>(STORAGE_KEYS.lang, "zh"));

  const setLang = useCallback((nextLang: Lang) => {
    setLangState(nextLang);
    writeStorage(STORAGE_KEYS.lang, nextLang);
  }, []);

  const t = useCallback(
    (path: string) => {
      const langPack = TEXT[lang] || TEXT.zh;
      return path.split(".").reduce((acc: any, part: string) => (acc ? acc[part] : undefined), langPack as any);
    },
    [lang]
  );

  const tr = useCallback(
    (zhText: string, enText: string) => (lang === "zh" ? zhText : enText),
    [lang]
  );

  const value = useMemo(() => ({ lang, setLang, t, tr }), [lang, setLang, t, tr]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
