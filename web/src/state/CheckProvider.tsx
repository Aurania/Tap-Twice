import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { Reality, Summary } from "@/api";
import type { ConvertedFrom, ForeignPrice, IdentifiedProduct, ProductInput } from "@/services/ai";

/** The failures that get their own screen. "not_a_product" is N4, "offline" is N6. */
export type CheckProblem = "not_a_product" | "offline";

type CheckState = {
  input: ProductInput | null;
  /** In-memory preview of the photo (object URL). Never stored anywhere. */
  previewUrl: string | null;
  product: IdentifiedProduct | null;
  /** Read from the photo or typed by the user. Null = not read yet (N5). */
  price: number | null;
  /** Set when the price was read in another currency and converted ("Converted from £50.02"). */
  priceFrom: ConvertedFrom | null;
  /** A price read in a currency with no rate: the person types it instead. */
  foreignPrice: ForeignPrice | null;
  pocketId: string | null;
  /** The server's numbers when the check started, for "left this month" on the match screen. */
  summary: Summary | null;
  reality: Reality | null;
  problem: CheckProblem | null;
};

const EMPTY: CheckState = { input: null, previewUrl: null, product: null, price: null, priceFrom: null, foreignPrice: null, pocketId: null, summary: null, reality: null, problem: null };

type CheckContextValue = CheckState & {
  /** Starts a new check from a photo, screenshot or link. */
  begin: (input: ProductInput, previewUrl?: string | null) => void;
  patch: (patch: Partial<CheckState>) => void;
  /** Forgets everything (leaving the flow). */
  reset: () => void;
};

const Ctx = createContext<CheckContextValue | null>(null);

/** State for one product check, shared by Snap → Reading → Match → Reality. */
export function CheckProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CheckState>(EMPTY);

  const revoke = (url: string | null) => {
    if (url) URL.revokeObjectURL(url);
  };

  const begin = useCallback((input: ProductInput, previewUrl: string | null = null) => {
    setState((s) => {
      revoke(s.previewUrl);
      return { ...EMPTY, input, previewUrl };
    });
  }, []);
  const patch = useCallback((p: Partial<CheckState>) => setState((s) => ({ ...s, ...p })), []);
  const reset = useCallback(() => {
    setState((s) => {
      revoke(s.previewUrl);
      return EMPTY;
    });
  }, []);

  const value = useMemo(() => ({ ...state, begin, patch, reset }), [state, begin, patch, reset]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCheck(): CheckContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCheck must be used inside <CheckProvider>");
  return ctx;
}
