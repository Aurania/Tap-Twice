import { useState } from "react";
import { useNavigate } from "react-router";
import { api, type Cost } from "@/api";
import { useI18n } from "@/i18n/I18nProvider";
import { formatDecimal, formatIDR } from "@/lib/format";
import { KEYS, readKey } from "@/lib/storage";
import { cartTitle, useCartCheck } from "@/state/CartCheckProvider";
import { BagIcon, BottomSheet, Button, CalendarIcon, ChevronIcon, Chip, OptionRow, WarningIcon } from "@/ui";

/**
 * 05e "How are you paying?" Pay in full is first and selected (rule 6). Log it →
 * POST /api/decisions { action: "buy" } → 05f Logged.
 */
export function PaySheet({ open, onClose, cost }: { open: boolean; onClose: () => void; cost: Cost }) {
  const navigate = useNavigate();
  const { t, lang } = useI18n();
  const { cart, paylater } = useCartCheck();
  const [choice, setChoice] = useState<"full" | "later">("full");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const avoidInterest = readKey(KEYS.avoidInterest) === "true";
  const plan = cost.paylater;

  if (!cart) return null;

  const logIt = async () => {
    setBusy(true);
    setError(false);
    try {
      await api.addDecision({
        action: "buy",
        title: cartTitle(cart, t),
        total: cart.total,
        paylater: choice === "later" ? paylater : null,
      });
      onClose();
      navigate("/check/logged", { replace: true });
    } catch {
      setError(true);
      setBusy(false);
    }
  };

  return (
    <BottomSheet open={open} onClose={onClose} title={t("pay.title")} description={t("pay.body")}>
      <div className="space-y-2.5">
        <OptionRow
          selected={choice === "full"}
          onClick={() => setChoice("full")}
          icon={<BagIcon className="size-5" />}
          title={t("pay.inFull")}
          detail={t("pay.inFullDetail")}
          trailing={formatIDR(cart.total)}
        />
        {plan && paylater ? (
          <OptionRow
            selected={choice === "later"}
            onClick={() => setChoice("later")}
            icon={<CalendarIcon className="size-5" />}
            title={t("pay.paylaterMonths", { n: plan.tenorMonths })}
            detail={t("pay.paylaterDetail", { monthly: formatIDR(plan.monthlyInstallment), rate: formatDecimal(paylater.monthlyRatePct, lang, 2) })}
            trailing={formatIDR(plan.totalPaid)}
          />
        ) : (
          // No plan yet: open the paylater picker (BACKEND_GAPS.md #17).
          <OptionRow
            selected={false}
            onClick={() => {
              onClose();
              navigate("/check/paylater");
            }}
            icon={<CalendarIcon className="size-5" />}
            title={t("pay.paylaterPick")}
            detail={t("pay.paylaterPickDetail")}
            trailing={<ChevronIcon aria-hidden className="size-5" />}
          />
        )}
        {plan && avoidInterest && plan.extraCost > 0 && (
          <Chip tone="highlight" icon={<WarningIcon className="size-3.5" />}>
            {t("pay.paylaterContainsInterest")}
          </Chip>
        )}
        {error && (
          <p role="alert" className="tt-small text-warn">
            {t("pay.error")}
          </p>
        )}
        <div className="space-y-2.5 pt-1">
          <Button onClick={logIt} disabled={busy}>
            {busy ? t("common.loading") : t("pay.logIt")}
          </Button>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            {t("pay.notYet")}
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
}
