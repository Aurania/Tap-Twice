import { Navigate, useNavigate } from "react-router";
import { useI18n } from "@/i18n/I18nProvider";
import { useCheck } from "@/state/CheckProvider";
import { Button, CheckIcon, ImageIcon, RefreshIcon, Ripple } from "@/ui";
import { CheckHeader } from "./CheckHeader";

/** N4 (not a product / blurry) and N6 (offline or timed out), on one screen. */
export function Problem() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const check = useCheck();
  if (!check.problem) return <Navigate to="/check" replace />;

  const notProduct = check.problem === "not_a_product";
  const home = () => {
    check.reset();
    navigate("/home", { replace: true });
  };

  return (
    <main className="flex flex-1 flex-col bg-page px-5 pt-[max(12px,env(safe-area-inset-top))] pb-[max(32px,env(safe-area-inset-bottom))]">
      <CheckHeader mark onBack={() => navigate(notProduct ? "/check" : "/home", { replace: true })} />

      <div aria-hidden className="relative -mx-5 mt-2 flex h-[260px] items-center justify-center overflow-hidden">
        <Ripple size={420} rings={5} className="absolute text-action/20" />
        <span className="relative inline-flex size-[60px] items-center justify-center rounded-pill bg-action text-white ring-4 ring-soft">
          {notProduct ? <ImageIcon className="size-6" /> : <RefreshIcon className="size-6" />}
        </span>
      </div>

      <h2 className="tt-h1 text-center">{notProduct ? t("problem.notProductTitle") : t("problem.offlineTitle")}</h2>
      <p className="tt-body mx-auto mt-2 max-w-[300px] text-center text-ink-2">{notProduct ? t("problem.notProductBody") : t("problem.offlineBody")}</p>

      {notProduct && (
        <section className="mt-5 rounded-card bg-surface p-4">
          <p className="tt-body-strong">{t("problem.goodPhoto")}</p>
          <ul className="mt-3 space-y-2.5">
            {(["problem.good1", "problem.good2", "problem.good3"] as const).map((key) => (
              <li key={key} className="tt-body flex items-center gap-3">
                <CheckIcon aria-hidden className="size-4 shrink-0" strokeWidth={2.5} />
                {t(key)}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-auto flex flex-col gap-2.5 pt-8">
        {notProduct ? (
          <Button onClick={() => navigate("/check", { replace: true })}>{t("problem.tryPhoto")}</Button>
        ) : (
          <Button
            onClick={() => navigate("/check/reading", { replace: true })}
          >
            {t("problem.tryAgain")}
          </Button>
        )}
        <Button variant="secondary" onClick={home}>
          {t("problem.home")}
        </Button>
      </div>
    </main>
  );
}
