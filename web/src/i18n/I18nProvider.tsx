import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Language } from "@/api";
import { KEYS, readKey, writeKey } from "@/lib/storage";
import { en, type StringKey } from "./en";
import { id } from "./id";

const dictionaries: Record<Language, Record<StringKey, string>> = { en, id };

type Vars = Record<string, string | number>;

type I18n = {
  lang: Language;
  /** Before onboarding the choice lives in localStorage; after it, profile.language wins (gaps #12). */
  setLang: (lang: Language) => void;
  t: (key: StringKey, vars?: Vars) => string;
};

const I18nContext = createContext<I18n | null>(null);

function initialLang(): Language {
  return readKey(KEYS.lang) === "id" ? "id" : "en"; // English by default (submission language)
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(initialLang);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next: Language) => {
    setLangState(next);
    writeKey(KEYS.lang, next);
  }, []);

  const t = useCallback(
    (key: StringKey, vars?: Vars) => {
      const template = dictionaries[lang][key];
      if (!vars) return template;
      return template.replace(/\{(\w+)\}/g, (match, name: string) =>
        name in vars ? String(vars[name]) : match,
      );
    },
    [lang],
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}
