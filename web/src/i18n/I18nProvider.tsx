import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import type { Language } from "@/api";
import { en, type StringKey } from "./en";

type Vars = Record<string, string | number>;

type I18n = {
  /** Always "en": the app is English only (the EN | ID switch was removed). Kept so formatters keep one signature. */
  lang: Language;
  t: (key: StringKey, vars?: Vars) => string;
};

const I18nContext = createContext<I18n | null>(null);

/** English strings. Every user-facing string still goes through `t()`, so a language can come back later. */
export function I18nProvider({ children }: { children: ReactNode }) {
  const t = useCallback((key: StringKey, vars?: Vars) => {
    const template = en[key];
    if (!vars) return template;
    return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? String(vars[name]) : match));
  }, []);

  const value = useMemo<I18n>(() => ({ lang: "en", t }), [t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}
