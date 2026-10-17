import { useRef } from "react";
import { Navigate, useNavigate } from "react-router";
import { useI18n } from "@/i18n/I18nProvider";
import { monthName } from "@/lib/dates";
import { formatIDR } from "@/lib/format";
import { useCartCheck } from "@/state/CartCheckProvider";
import { Button, CheckIcon, Chip, Ripple, ScreenHeader, WarningIcon } from "@/ui";

/** 05f Bought · Logged. Celebrates; mentions going over the joy budget without shaming. */
export function Logged() {
  const navigate = useNavigate();
  const { t, lang } = useI18n();
  const { cart, result, reset } = useCartCheck();
  // Set while leaving so clearing the cart doesn't trigger the guard redirect below.
  const leaving = useRef(false);

  if (!cart || !result) return leaving.current ? null : <Navigate to="/home" replace />;

  const leftAfter = result.cost.joy.leftAfter;
  const over = leftAfter < 0;
  const done = (pick: boolean) => {
    leaving.current = true;
    navigate("/home", { replace: true, state: pick ? { pick: true } : null });
    reset();
  };

  return (
    <main className="flex flex-1 flex-col bg-action px-5 pt-[max(12px,env(safe-area-inset-top))] pb-[max(32px,env(safe-area-inset-bottom))] text-white">
      <ScreenHeader onBlue onBack={() => done(false)} />
      <p className="tt-body-strong -mt-10 text-center">{t("logged.header")}</p>

      <div aria-hidden className="relative mx-auto mt-8 flex size-[300px] items-center justify-center">
        <Ripple size={300} rings={5} className="tt-ripple-out absolute text-white/70" />
        <span className="tt-pop inline-flex size-[58px] items-center justify-center rounded-pill bg-surface text-ink ring-2 ring-white/60 [animation-delay:300ms]">
          <CheckIcon className="size-6" />
        </span>
      </div>

      <div className="mt-6 text-center">
        <p className="tt-hero">{formatIDR(cart.total)}</p>
        <h1 className="tt-h1 mt-3">{t("logged.title")}</h1>
        <p className="tt-body mt-3 text-white/90">
          {over ? t("logged.over", { month: monthName(lang, 1) }) : t("logged.within", { left: formatIDR(leftAfter) })}
        </p>
        {over && (
          <Chip tone="highlight" className="mt-3" icon={<WarningIcon className="size-3.5" />}>
            {t("logged.overChip", { amount: formatIDR(-leftAfter), month: monthName(lang) })}
          </Chip>
        )}
      </div>

      <div className="mt-auto space-y-3 pt-8 text-center">
        <Button variant="secondary" onClick={() => done(false)}>
          {t("common.backToHome")}
        </Button>
        <button type="button" className="tt-link !text-white underline underline-offset-2" onClick={() => done(true)}>
          {t("logged.checkAnother")}
        </button>
      </div>
    </main>
  );
}
