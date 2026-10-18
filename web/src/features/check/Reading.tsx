import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router";
import { api, ApiError, type ExtractResponse } from "@/api";
import { useI18n } from "@/i18n/I18nProvider";
import { cx } from "@/lib/cx";
import { toUpload } from "@/lib/upload";
import { useCartCheck } from "@/state/CartCheckProvider";
import { BackIcon, CheckIcon, CircleButton, Ripple } from "@/ui";

const STEP_MS = 650;

/** 03 Cart Check · Reading. Sends the screenshot once to POST /api/extract; steps tick in sequence. */
export function Reading() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { file, setExtract } = useCartCheck();
  const [done, setDone] = useState(0); // steps completed: 0..3
  // One request per picked file, even when React re-runs the effect (StrictMode in dev).
  const job = useRef<{ file: File; startedAt: number; request: Promise<ExtractResponse> } | null>(null);

  useEffect(() => {
    if (!file) return;
    if (job.current?.file !== file) {
      job.current = { file, startedAt: performance.now(), request: toUpload(file).then((img) => api.extract(img)) };
    }
    const { request, startedAt: t0 } = job.current;
    let alive = true;
    const timers = [window.setTimeout(() => alive && setDone((d) => Math.max(d, 1)), STEP_MS), window.setTimeout(() => alive && setDone((d) => Math.max(d, 2)), STEP_MS * 2)];

    (async () => {
      try {
        const res = await request;
        const wait = Math.max(0, STEP_MS * 2 - (performance.now() - t0));
        await new Promise((r) => setTimeout(r, wait));
        if (!alive) return;
        setDone(3);
        await new Promise((r) => setTimeout(r, 350));
        if (!alive) return;
        if (!res.extraction.is_cart) {
          navigate("/check/not-a-cart", { replace: true });
          return;
        }
        setExtract(res);
        navigate("/check/confirm", { replace: true });
      } catch (err) {
        if (!alive) return;
        if (err instanceof ApiError && err.code === "no_profile") return; // handled globally (→ /welcome)
        navigate("/check/error", { replace: true });
      }
    })();

    return () => {
      alive = false;
      timers.forEach(clearTimeout);
    };
  }, [file, navigate, setExtract]);

  if (!file) return <Navigate to="/home" replace />;

  const steps = [t("reading.step1"), t("reading.step2"), t("reading.step3")];

  return (
    <main className="relative flex flex-1 flex-col overflow-hidden bg-inverse px-5 pt-[max(12px,env(safe-area-inset-top))] pb-10 text-white">
      <header className="relative z-10 grid h-14 grid-cols-[40px_1fr_40px] items-center">
        <CircleButton label={t("common.back")} icon={<BackIcon className="size-5" />} onClick={() => navigate("/home", { replace: true })} />
        <p className="tt-body-strong text-center">{t("check.header")}</p>
      </header>

      <div aria-hidden className="relative mt-4 flex h-[300px] items-center justify-center">
        <Ripple size={460} rings={5} className="absolute text-white/15" />
        <div className="relative w-[220px] overflow-hidden rounded-[20px] bg-page p-4 text-ink shadow-lg">
          <p className="tt-body-strong">{t("reading.cart")}</p>
          <div className="mt-3 space-y-2.5">
            {[90, 66, 90].map((w, i) => (
              <div key={i} className="flex justify-between">
                <span className="h-2.5 rounded-pill bg-surface" style={{ width: w }} />
                <span className="h-2.5 w-11 rounded-pill bg-surface" />
              </div>
            ))}
          </div>
          <span className="tt-scan absolute inset-x-0 top-1/2 h-[3px] bg-highlight shadow-[0_0_14px_4px_var(--tt-color-action-highlight)]" />
        </div>
      </div>

      <h1 className="tt-h2 mt-6 !text-[24px]">{t("reading.title")}</h1>
      <p className="tt-body mt-2 text-white/85">{t("reading.body")}</p>

      <ol className="mt-6 space-y-3" aria-live="polite">
        {steps.map((label, i) => {
          const state = i < done ? "done" : i === done ? "active" : "pending";
          return (
            <li key={label} className={cx("tt-body-strong flex items-center gap-3", state === "pending" && "text-white/60")}>
              <span
                aria-hidden
                className={cx(
                  "inline-flex size-5 items-center justify-center rounded-pill",
                  state === "done" && "bg-highlight",
                  state === "active" && "border-2 border-highlight",
                  state === "pending" && "bg-white/20",
                )}
              />
              {label}
              {state === "done" && <CheckIcon aria-hidden className="size-4" />}
            </li>
          );
        })}
      </ol>
    </main>
  );
}
