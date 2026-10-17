import { useRef, useState } from "react";
import { useNavigate } from "react-router";
import { api } from "@/api";
import { useI18n } from "@/i18n/I18nProvider";
import { cartTitle, useCartCheck } from "@/state/CartCheckProvider";
import { useToast } from "@/ui";

/**
 * Save for later: wishlist item + a "save" decision (BACKEND_GAPS.md #7), then Saved with the toast.
 * `leaving` is set before the cart is cleared, so screens can skip their "no cart" redirect.
 */
export function useSaveForLater() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const toast = useToast();
  const { cart, reset } = useCartCheck();
  const [saving, setSaving] = useState(false);
  const leaving = useRef(false);

  const save = async () => {
    if (!cart || saving) return;
    setSaving(true);
    const title = cartTitle(cart, t);
    try {
      await Promise.all([
        api.addWishlist({ name: title, price: cart.total, merchant: cart.merchant ?? null }),
        api.addDecision({ action: "save", title, total: cart.total }),
      ]);
      leaving.current = true;
      navigate("/saved", { replace: true, state: { justSaved: true } });
      reset();
    } catch {
      setSaving(false);
      toast({ message: t("saved.saveError"), position: "bottom" });
    }
  };

  return { save, saving, leaving };
}
