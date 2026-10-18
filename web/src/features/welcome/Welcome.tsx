import { useRef, type ReactNode, type TouchEvent } from "react";
import { Navigate, useNavigate, useParams } from "react-router";
import { useI18n } from "@/i18n/I18nProvider";
import { cx } from "@/lib/cx";
import { Button, ChatBubble, FutureMeRobot, Mark, Ripple, Sticker } from "@/ui";

/** W1–W4 Welcome (first time only). Copy is v2 (single product, sample $89.90 = 5 hours, fits Fashion); Figma still shows the v1 cart copy. Swipe or Next; Skip jumps to W4; Get started → onboarding. */
export function Welcome() {
  const { step } = useParams();
  const n = Number(step);
  const navigate = useNavigate();
  const touchX = useRef<number | null>(null);

  if (![1, 2, 3, 4].includes(n)) return <Navigate to="/welcome/1" replace />;

  const go = (to: number) => navigate(to === 5 ? "/onboarding/money" : `/welcome/${to}`);
  const swipe = {
    onTouchStart: (e: TouchEvent) => (touchX.current = e.touches[0]?.clientX ?? null),
    onTouchEnd: (e: TouchEvent) => {
      const start = touchX.current;
      const end = e.changedTouches[0]?.clientX;
      touchX.current = null;
      if (start === null || end === undefined) return;
      if (start - end > 50 && n < 4) go(n + 1);
      if (end - start > 50 && n > 1) navigate(-1);
    },
  };

  return (
    <div {...swipe} className="flex flex-1 flex-col">
      {n === 1 && <W1 onNext={() => go(2)} />}
      {n === 2 && <W2 onNext={() => go(3)} onSkip={() => go(4)} />}
      {n === 3 && <W3 onNext={() => go(4)} onSkip={() => go(4)} />}
      {n === 4 && <W4 onStart={() => go(5)} />}
    </div>
  );
}

function Pager({ index, onBlue = false }: { index: number; onBlue?: boolean }) {
  const { t } = useI18n();
  return (
    <div className="flex items-center gap-1.5" role="img" aria-label={t("common.stepOf", { n: index + 1, total: 3 })}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={cx(
            "h-1.5 rounded-pill transition-all duration-200",
            i === index ? "w-7" : "w-1.5",
            onBlue ? (i === index ? "bg-white/60" : "bg-white/50") : i === index ? "bg-action" : "bg-ink-2/30",
          )}
        />
      ))}
    </div>
  );
}

function Header({ onBlue = false, right }: { onBlue?: boolean; right?: ReactNode }) {
  const { t } = useI18n();
  return (
    <header className="flex h-14 items-center justify-between">
      <span className={cx("tt-body-strong inline-flex items-center gap-2", onBlue ? "text-white" : "text-ink")}>
        <Mark size={20} tone={onBlue ? "highlight" : "action"} />
        {t("app.name")}
      </span>
      {right}
    </header>
  );
}

function SkipButton({ onSkip }: { onSkip: () => void }) {
  const { t } = useI18n();
  return (
    <button type="button" onClick={onSkip} className="tt-body-strong rounded-sm px-2 py-1 text-ink-2">
      {t("common.skip")}
    </button>
  );
}

const pad = "px-5 pt-[max(12px,env(safe-area-inset-top))] pb-[max(36px,env(safe-area-inset-bottom))]";

function W1({ onNext }: { onNext: () => void }) {
  const { t } = useI18n();
  return (
    <main className={cx("relative flex flex-1 flex-col overflow-hidden bg-action text-white", pad)}>
      <Ripple size={780} rings={6} inner={56} dot className="absolute top-[400px] left-1/2 -translate-x-1/2 -translate-y-1/2 text-white/60" />
      <div className="relative">
        <Header onBlue />
      </div>
      <div aria-hidden className="relative flex-1">
        <Sticker tone="white" rotate={4} className="absolute top-[180px] left-0">
          {t("welcome.w1Sticker1")}
        </Sticker>
        <Sticker rotate={-5} className="absolute top-[370px] right-2">
          {t("welcome.w1Sticker2")}
        </Sticker>
      </div>
      <div className="relative">
        <h1 className="tt-hero whitespace-pre-line">{t("welcome.w1Title")}</h1>
        <p className="tt-body-strong mt-3">{t("welcome.w1Body")}</p>
        <div className="mt-8 mb-6">
          <Pager index={0} onBlue />
        </div>
        <Button variant="secondary" onClick={onNext}>
          {t("common.next")}
        </Button>
      </div>
    </main>
  );
}

function W2({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  const { t } = useI18n();
  return (
    <main className={cx("flex flex-1 flex-col bg-page", pad)}>
      <Header right={<SkipButton onSkip={onSkip} />} />
      <div aria-hidden className="relative mt-2 h-[360px] overflow-hidden rounded-sheet bg-surface">
        <Ripple size={300} rings={3} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-line" />
        <div className="absolute top-[64px] left-[38px] w-[186px] rotate-[4deg] rounded-md bg-page p-4 shadow-md">
          <p className="tt-body-strong">{t("welcome.w2Item")}</p>
          <div className="mt-3 space-y-2">
            <span className="block h-2.5 w-[150px] rounded-pill bg-surface" />
            <span className="block h-2.5 w-[118px] rounded-pill bg-surface" />
            <span className="block h-2.5 w-[90px] rounded-pill bg-surface" />
          </div>
          <p className="tt-body-strong mt-4">{t("welcome.w2Price")}</p>
        </div>
        <span className="tt-body-strong absolute top-[196px] right-[44px] -rotate-[4deg] rounded-pill bg-action px-4 py-2 text-white shadow-md">
          {t("welcome.w2Hours")}
        </span>
        <Sticker rotate={3} className="absolute top-[284px] right-[40px]">
          {t("welcome.w2Fit")}
        </Sticker>
      </div>
      <h1 className="tt-h1 mt-8 whitespace-pre-line">{t("welcome.w2Title")}</h1>
      <p className="tt-body mt-3 text-ink-2">{t("welcome.w2Body")}</p>
      <div className="mt-auto pt-8">
        <div className="mb-6">
          <Pager index={1} />
        </div>
        <Button onClick={onNext}>{t("common.next")}</Button>
      </div>
    </main>
  );
}

function W3({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  const { t } = useI18n();
  return (
    <main className={cx("relative flex flex-1 flex-col overflow-hidden bg-soft", pad)}>
      <Ripple size={360} rings={4} className="absolute top-[30px] -left-[70px] text-action/25" />
      <div className="relative">
        <Header right={<SkipButton onSkip={onSkip} />} />
      </div>
      <div aria-hidden className="relative h-[360px]">
        <span className="absolute top-[100px] left-[52px] inline-flex size-[74px] items-center justify-center rounded-pill bg-action">
          <Mark size={34} tone="white" />
          <FutureMeRobot size={30} className="absolute -right-2 -bottom-2" />
        </span>
        <div className="absolute top-[60px] right-0 w-[230px]">
          <ChatBubble from="model">{t("welcome.w3Bubble1")}</ChatBubble>
        </div>
        <div className="absolute top-[190px] right-[20px] w-[200px]">
          <ChatBubble from="user">{t("welcome.w3Bubble2")}</ChatBubble>
        </div>
        <div className="absolute top-[280px] left-[50px] w-[240px]">
          <ChatBubble from="model">{t("welcome.w3Bubble3")}</ChatBubble>
        </div>
      </div>
      <div className="relative mt-8">
        <h1 className="tt-h1">{t("welcome.w3Title")}</h1>
        <p className="tt-body mt-3 text-ink-2">{t("welcome.w3Body")}</p>
      </div>
      <div className="relative mt-auto pt-8">
        <div className="mb-6">
          <Pager index={2} />
        </div>
        <Button onClick={onNext}>{t("common.next")}</Button>
      </div>
    </main>
  );
}

function W4({ onStart }: { onStart: () => void }) {
  const { t } = useI18n();
  return (
    <main className={cx("relative flex flex-1 flex-col overflow-hidden bg-inverse text-white", pad)}>
      <div aria-hidden className="absolute -top-[150px] -right-[100px]">
        <Ripple size={480} rings={5} className="text-white/35" />
        <span className="absolute top-1/2 left-1/2 size-[50px] -translate-x-1/2 -translate-y-1/2 rounded-pill bg-highlight/55" />
      </div>
      <div className="relative mt-auto">
        <h1 className="tt-hero whitespace-pre-line">{t("welcome.w4Title")}</h1>
        <ul className="mt-6 space-y-3">
          {(["welcome.w4Point1", "welcome.w4Point2", "welcome.w4Point3"] as const).map((key) => (
            <li key={key} className="tt-body-strong flex items-center gap-3">
              <span aria-hidden className="size-2.5 rounded-pill bg-highlight" />
              {t(key)}
            </li>
          ))}
        </ul>
        <Button className="mt-8" onClick={onStart}>
          {t("welcome.getStarted")}
        </Button>
        <p className="tt-caption mt-4 text-center text-white/90">{t("disclaimer.advice")}</p>
      </div>
    </main>
  );
}
