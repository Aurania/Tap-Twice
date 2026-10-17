import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { Cart, ExtractResponse, Paylater, ReflectResponse } from "@/api";
import { paylaterFromExtraction } from "@/lib/paylater";

export type CartRow = { id: string; name: string; quantity: number; unitPrice: number };

export type CartDraft = {
  merchant: string | null;
  paymentMethod: string | null;
  items: CartRow[];
  shipping: number | null;
  /** Vouchers and discounts as a positive number. */
  discounts: number | null;
  /** Total read from the screenshot (rupiah), or null. */
  readTotal: number | null;
  /** True once the user edits any row (BACKEND_GAPS.md #15). */
  edited: boolean;
  /** When the currency has no rate (`idr === null`), the user types the rupiah total. */
  typedTotal: number | null;
};

type CartCheckState = {
  /** The picked screenshot. Kept in memory only so "Try again" can resend it; never stored. */
  file: File | null;
  extract: ExtractResponse | null;
  draft: CartDraft | null;
  /** The confirmed cart sent to /api/reflect. */
  cart: Cart | null;
  paylater: Paylater | null;
  result: ReflectResponse | null;
};

const EMPTY: CartCheckState = { file: null, extract: null, draft: null, cart: null, paylater: null, result: null };

let rowSeq = 0;
const newRowId = () => `row-${++rowSeq}`;

/** Total shown on Confirm (BACKEND_GAPS.md #15). Summing a list for display, not money math. */
export function draftTotal(draft: CartDraft, idrMissing: boolean): number {
  if (idrMissing) return draft.typedTotal ?? 0;
  if (!draft.edited && draft.readTotal !== null) return draft.readTotal;
  const items = draft.items.reduce((sum, r) => sum + r.quantity * r.unitPrice, 0);
  return Math.max(0, items + (draft.shipping ?? 0) - (draft.discounts ?? 0));
}

function draftFromExtract(res: ExtractResponse): CartDraft {
  const src = res.idr ?? res.extraction;
  const items = src.items.map((it) => ({
    id: newRowId(),
    name: it.name,
    quantity: Math.max(1, Math.round(it.quantity) || 1),
    unitPrice: res.idr ? Math.max(0, Math.round(it.unit_price)) : 0,
  }));
  return {
    merchant: src.merchant,
    paymentMethod: src.payment_method,
    items,
    shipping: res.idr && src.shipping ? Math.round(src.shipping) : null,
    discounts: res.idr && src.discounts ? Math.abs(Math.round(src.discounts)) : null,
    readTotal: res.idr && src.total !== null ? Math.round(src.total) : null,
    edited: false,
    typedTotal: null,
  };
}

type CartCheckValue = CartCheckState & {
  start: (file: File) => void;
  setExtract: (res: ExtractResponse) => void;
  updateDraft: (patch: Partial<Omit<CartDraft, "items">>) => void;
  updateRow: (id: string, patch: Partial<Omit<CartRow, "id">>) => void;
  removeRow: (id: string) => void;
  addRow: (row: Omit<CartRow, "id">) => void;
  /** Freezes the edited draft into the cart for the reality card. */
  confirm: () => Cart | null;
  setPaylater: (p: Paylater | null) => void;
  setResult: (r: ReflectResponse | null) => void;
  reset: () => void;
};

const CartCheckContext = createContext<CartCheckValue | null>(null);

export function CartCheckProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CartCheckState>(EMPTY);

  const start = useCallback((file: File) => setState({ ...EMPTY, file }), []);

  const setExtract = useCallback(
    (res: ExtractResponse) => setState((s) => ({ ...s, extract: res, draft: draftFromExtract(res), cart: null, result: null })),
    [],
  );

  const updateDraft = useCallback(
    (patch: Partial<Omit<CartDraft, "items">>) =>
      setState((s) => (s.draft ? { ...s, draft: { ...s.draft, ...patch, edited: true } } : s)),
    [],
  );

  const updateRow = useCallback(
    (id: string, patch: Partial<Omit<CartRow, "id">>) =>
      setState((s) =>
        s.draft
          ? { ...s, draft: { ...s.draft, edited: true, items: s.draft.items.map((r) => (r.id === id ? { ...r, ...patch } : r)) } }
          : s,
      ),
    [],
  );

  const removeRow = useCallback(
    (id: string) =>
      setState((s) => (s.draft ? { ...s, draft: { ...s.draft, edited: true, items: s.draft.items.filter((r) => r.id !== id) } } : s)),
    [],
  );

  const addRow = useCallback(
    (row: Omit<CartRow, "id">) =>
      setState((s) => (s.draft ? { ...s, draft: { ...s.draft, edited: true, items: [...s.draft.items, { ...row, id: newRowId() }] } } : s)),
    [],
  );

  const confirm = useCallback(() => {
    const { draft, extract } = state;
    if (!draft || !extract) return null;
    const total = draftTotal(draft, extract.idr === null);
    if (total <= 0) return null;
    const cart: Cart = {
      merchant: draft.merchant?.slice(0, 80) ?? null,
      paymentMethod: draft.paymentMethod?.slice(0, 80) ?? null,
      items: draft.items
        .filter((r) => r.name.trim() && r.quantity >= 1)
        .slice(0, 50)
        .map((r) => ({ name: r.name.trim().slice(0, 200), quantity: Math.round(r.quantity), unitPrice: Math.max(0, r.unitPrice) })),
      total,
    };
    const paylater = extract.idr ? paylaterFromExtraction(extract.idr, total) : null;
    setState((s) => ({ ...s, cart, paylater: s.paylater ?? paylater, result: null }));
    return cart;
  }, [state]);

  const setPaylater = useCallback((paylater: Paylater | null) => setState((s) => ({ ...s, paylater })), []);
  const setResult = useCallback((result: ReflectResponse | null) => setState((s) => ({ ...s, result })), []);
  const reset = useCallback(() => setState(EMPTY), []);

  const value = useMemo<CartCheckValue>(
    () => ({ ...state, start, setExtract, updateDraft, updateRow, removeRow, addRow, confirm, setPaylater, setResult, reset }),
    [state, start, setExtract, updateDraft, updateRow, removeRow, addRow, confirm, setPaylater, setResult, reset],
  );
  return <CartCheckContext.Provider value={value}>{children}</CartCheckContext.Provider>;
}

export function useCartCheck(): CartCheckValue {
  const ctx = useContext(CartCheckContext);
  if (!ctx) throw new Error("useCartCheck must be used inside <CartCheckProvider>");
  return ctx;
}

/** Decision / wishlist title: first item name, or "{n} items from {merchant}" (gaps #7). */
export function cartTitle(cart: Cart, t: (key: "cart.titleMany" | "cart.titleManyNoMerchant", vars: Record<string, string | number>) => string): string {
  const first = cart.items[0]?.name;
  if (cart.items.length <= 1 && first) return first;
  const n = cart.items.length || 1;
  return cart.merchant ? t("cart.titleMany", { n, merchant: cart.merchant }) : t("cart.titleManyNoMerchant", { n });
}
