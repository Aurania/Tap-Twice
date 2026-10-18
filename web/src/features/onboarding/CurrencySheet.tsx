import { useMemo, useState } from "react";
import { CURRENCIES, type Currency } from "@/api";
import { useI18n } from "@/i18n/I18nProvider";
import { cx } from "@/lib/cx";
import { BottomSheet, CheckIcon } from "@/ui";

/** Country behind each currency, for the flag and for searching by country. */
const REGION: Record<Currency, string> = { USD: "US", IDR: "ID", INR: "IN", SGD: "SG", EUR: "EU", GBP: "GB", JPY: "JP", AUD: "AU" };

const flag = (region: string) => String.fromCodePoint(...[...region].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));

/** Display name for a currency in the UI language, e.g. "US Dollar". */
export function currencyName(currency: Currency, lang: "en" | "id"): string {
  return new Intl.DisplayNames(lang === "id" ? "id-ID" : "en-US", { type: "currency" }).of(currency) ?? currency;
}

export const currencyFlag = (currency: Currency) => flag(REGION[currency]);

type Props = { open: boolean; onClose: () => void; value: Currency; onPick: (currency: Currency) => void };

/** 01a-s Pick currency: searchable list of the 8 supported currencies. */
export function CurrencySheet({ open, onClose, value, onPick }: Props) {
  const { t, lang } = useI18n();
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const regions = new Intl.DisplayNames(lang === "id" ? "id-ID" : "en-US", { type: "region" });
    const q = query.trim().toLowerCase();
    return CURRENCIES.filter((c) => {
      if (!q) return true;
      const haystack = `${c} ${currencyName(c, lang)} ${regions.of(REGION[c]) ?? ""}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [query, lang]);

  return (
    <BottomSheet open={open} onClose={onClose} title={t("onboarding.currencySheetTitle")}>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("onboarding.currencySearch")}
        aria-label={t("onboarding.currencySearch")}
        className="tt-body-lg h-[52px] w-full rounded-md border border-line bg-page px-4 text-ink outline-none placeholder:text-ink-2/70 focus:border-action"
      />
      <ul className="mt-3 max-h-[52dvh] space-y-1 overflow-y-auto">
        {rows.map((c) => (
          <li key={c}>
            <button
              type="button"
              aria-pressed={c === value}
              onClick={() => {
                onPick(c);
                setQuery("");
                onClose();
              }}
              className={cx("tt-body-strong flex h-12 w-full items-center gap-3 rounded-md px-3 text-left", c === value ? "bg-surface" : "bg-page")}
            >
              <span aria-hidden className="text-lg">{currencyFlag(c)}</span>
              <span className="flex-1">
                {c} · {currencyName(c, lang)}
              </span>
              {c === value && <CheckIcon aria-hidden className="size-5 text-action" />}
            </button>
          </li>
        ))}
        {rows.length === 0 && <li className="tt-body px-3 py-4 text-ink-2">{t("onboarding.currencyNone")}</li>}
      </ul>
    </BottomSheet>
  );
}
