import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useI18n } from "@/i18n/I18nProvider";
import { useProfile } from "@/state/ProfileProvider";
import { Button, Ripple } from "@/ui";

const MIN_SPLASH_MS = 1200; // two taps: dot (0.6 s), then the ring ripples out (0.9 s)

/** 00a / 00b Splash. Runs while sign-in and GET /api/profile load, then routes by profile. */
export function Splash() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { state, reload } = useProfile();
  const [minDone, setMinDone] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setMinDone(true), MIN_SPLASH_MS);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!minDone || state.status !== "ready") return;
    navigate(state.profile ? "/home" : "/welcome/1", { replace: true });
  }, [minDone, state, navigate]);

  return (
    <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden bg-action text-white">
      <div className="relative flex size-[200px] items-center justify-center">
        <Ripple size={200} rings={4} className="tt-ripple-out absolute text-white/70 [animation-delay:600ms]" />
        <span className="tt-pop size-8 rounded-pill bg-highlight" />
      </div>
      <p className="tt-rise tt-h1 mt-8 [animation-delay:700ms]">{t("app.name")}</p>
      <p className="tt-small absolute bottom-[max(40px,env(safe-area-inset-bottom))] text-white/95">{t("app.tagline")}</p>

      {state.status === "error" && minDone && (
        <div className="tt-rise absolute inset-x-5 bottom-24 space-y-3 text-center">
          <p className="tt-body">{t("splash.error")}</p>
          <Button variant="secondary" onClick={reload}>
            {t("common.tryAgain")}
          </Button>
        </div>
      )}
    </main>
  );
}
