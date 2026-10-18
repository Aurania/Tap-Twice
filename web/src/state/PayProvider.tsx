import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { WishlistItemV2 } from "@/api";
import type { RateSource } from "@/lib/paylater";

/** The plan being looked at. The rate is already worked out by the server when it was typed from a monthly payment. */
export type PayTerms = { tenorMonths: number; monthlyRatePct: number; adminFee: number; source: RateSource };

export type PayStep = "closed" | "pay" | "providers" | "plans" | "enter";

type PayState = {
  item: (WishlistItemV2 & { pocketName: string }) | null;
  step: PayStep;
  choice: "full" | "later";
  providerId: string | null;
  providerName: string | null;
  terms: PayTerms | null;
};

const CLOSED: PayState = { item: null, step: "closed", choice: "full", providerId: null, providerName: null, terms: null };

type PayControl = PayState & {
  /** Starts paying for a wishlist item: opens "How are you paying?". */
  start: (item: PayState["item"]) => void;
  patch: (patch: Partial<PayState>) => void;
  close: () => void;
};

const Ctx = createContext<PayControl | null>(null);

/** State for paying a wishlist item: 05e → 06a → 06b / 06c → 06 Real cost → back to 05e. */
export function PayProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PayState>(CLOSED);
  const start = useCallback((item: PayState["item"]) => setState({ ...CLOSED, item, step: "pay" }), []);
  const patch = useCallback((p: Partial<PayState>) => setState((s) => ({ ...s, ...p })), []);
  const close = useCallback(() => setState(CLOSED), []);
  const value = useMemo(() => ({ ...state, start, patch, close }), [state, start, patch, close]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePay(): PayControl {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePay must be used inside <PayProvider>");
  return ctx;
}
