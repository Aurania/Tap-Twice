import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router";
import { api, ApiError } from "@/api";
import { useI18n } from "@/i18n/I18nProvider";
import { cx } from "@/lib/cx";
import { ai, AiError } from "@/services/ai";
import { useCheck } from "@/state/CheckProvider";
import { useProfile } from "@/state/ProfileProvider";
import { CheckIcon, Ripple } from "@/ui";
import { CheckHeader } from "./CheckHeader";

const MIN_STEP_MS = 450;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * 03 Reading. Three real steps: the AI spots the product and matches a pocket, reads the price,
 * and the server's numbers for the pocket are fetched. Failures go to the problem screen (N4, N6).
 */
export function Reading() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { profile } = useProfile();
  const check = useCheck();
  const { input, patch } = check;
  const [done, setDone] = useState(0); // steps finished: 0..3

  useEffect(() => {
    if (!input || !profile) return;
    const ctrl = new AbortController();
    patch({ problem: null, product: null, price: null }); // a retry starts clean
    const settle = async (started: number) => sleep(Math.max(0, MIN_STEP_MS - (performance.now() - started)));

    (async () => {
      try {
        let t0 = performance.now();
        const product = await ai.identifyProduct(input, profile.pockets.map(({ id, name }) => ({ id, name })), ctrl.signal);
        await settle(t0);
        patch({ product, pocketId: product.pocketId });
        setDone(1);

        t0 = performance.now();
        const priceReading = await ai.readPrice(input, ctrl.signal);
        await settle(t0);
        setDone(2);

        t0 = performance.now();
        const { summary } = await api.getSummary();
        await settle(t0);
        patch({ price: priceReading?.price ?? null, summary });
        setDone(3);

        await sleep(300);
        if (!ctrl.signal.aborted) navigate("/check/match", { replace: true });
      } catch (err) {
        if (ctrl.signal.aborted) return;
        if (err instanceof ApiError && err.code === "no_profile") return; // handled globally (→ /welcome)
        patch({ problem: err instanceof AiError && err.code === "not_a_product" ? "not_a_product" : "offline" });
        navigate("/check/problem", { replace: true });
      }
    })();

    return () => ctrl.abort();
  }, [input, profile, patch, navigate]);

  if (!input) return <Navigate to="/check" replace />;

  const pocketName = profile?.pockets.find((p) => p.id === check.product?.pocketId)?.name;
  const steps = [
    done >= 1 && check.product ? t("reading.step1Done", { name: check.product.name }) : t("reading.step1Active"),
    t("reading.step2"),
    pocketName ? t("reading.step3", { pocket: pocketName }) : t("reading.step3Pending"),
  ];

  return (
    <main className="relative flex flex-1 flex-col overflow-hidden bg-inverse px-5 pt-[max(12px,env(safe-area-inset-top))] pb-10 text-white">
      <CheckHeader onDark onBack={() => navigate("/home", { replace: true })} />

      <div aria-hidden className="relative mt-4 flex h-[300px] items-center justify-center">
        <Ripple size={460} rings={5} className="absolute text-white/15" />
        <div className="relative flex h-[120px] w-[220px] items-center justify-center overflow-hidden rounded-[20px] bg-page text-[56px] shadow-lg">
          {check.previewUrl ? <img src={check.previewUrl} alt="" className="size-full object-cover" /> : "🛍️"}
          <span className="tt-scan absolute inset-x-0 top-1/2 h-[3px] bg-highlight shadow-[0_0_14px_4px_var(--tt-color-action-highlight)]" />
        </div>
      </div>

      <h2 className="tt-h1 mt-6">{t("reading.title")}</h2>
      <p className="tt-body mt-2 text-white/95">{t("reading.body")}</p>

      <ol className="mt-6 space-y-3" aria-live="polite">
        {steps.map((label, i) => {
          const state = i < done ? "done" : i === done ? "active" : "pending";
          return (
            <li key={i} className={cx("tt-body-strong flex items-center gap-3", state === "pending" && "text-white/60")}>
              <span
                aria-hidden
                className={cx(
                  "inline-flex size-5 shrink-0 items-center justify-center rounded-pill",
                  state === "done" && "bg-highlight text-ink",
                  state === "active" && "border-2 border-highlight",
                  state === "pending" && "bg-white/20",
                )}
              >
                {state === "done" && <CheckIcon className="size-3" strokeWidth={3} />}
              </span>
              {label}
            </li>
          );
        })}
      </ol>
    </main>
  );
}
