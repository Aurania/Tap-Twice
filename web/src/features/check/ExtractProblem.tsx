import { useState, type ReactNode } from "react";
import { Navigate, useNavigate } from "react-router";
import { useI18n } from "@/i18n/I18nProvider";
import { useCartCheck } from "@/state/CartCheckProvider";
import { Button, CheckIcon, ImageIcon, RefreshIcon, Ripple, ScreenHeader } from "@/ui";
import { ScreenshotPicker } from "./ScreenshotPicker";

/** 03b Not a cart: `extraction.is_cart === false`. Try another → pick sheet. */
export function NotACart() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [pickerOpen, setPickerOpen] = useState(false);
  const good = [t("notCart.good1"), t("notCart.good2"), t("notCart.good3")];
  return (
    <ProblemScreen
      icon={<ImageIcon className="size-6" />}
      title={t("notCart.title")}
      body={t("notCart.body")}
      primary={{ label: t("notCart.tryAnother"), onClick: () => setPickerOpen(true) }}
      onHome={() => navigate("/home", { replace: true })}
    >
      <section className="mt-6 rounded-card bg-surface p-4">
        <h2 className="tt-body-strong">{t("notCart.goodTitle")}</h2>
        <ul className="mt-2 space-y-1.5">
          {good.map((line) => (
            <li key={line} className="tt-small flex items-center gap-2 text-ink">
              <CheckIcon aria-hidden className="size-4 shrink-0" />
              {line}
            </li>
          ))}
        </ul>
      </section>
      <ScreenshotPicker open={pickerOpen} onClose={() => setPickerOpen(false)} />
    </ProblemScreen>
  );
}

/** 03c Couldn't read it: `502 extraction_failed` or a network error. Try again re-sends the same image. */
export function CouldntRead() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { file } = useCartCheck();
  if (!file) return <Navigate to="/home" replace />;
  return (
    <ProblemScreen
      icon={<RefreshIcon className="size-6" />}
      title={t("couldntRead.title")}
      body={t("couldntRead.body")}
      primary={{ label: t("common.tryAgain"), onClick: () => navigate("/check/reading", { replace: true }) }}
      onHome={() => navigate("/home", { replace: true })}
    />
  );
}

function ProblemScreen({
  icon,
  title,
  body,
  primary,
  onHome,
  children,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  primary: { label: string; onClick: () => void };
  onHome: () => void;
  children?: ReactNode;
}) {
  const { t } = useI18n();
  return (
    <main className="flex flex-1 flex-col bg-page px-5 pt-[max(12px,env(safe-area-inset-top))] pb-[max(24px,env(safe-area-inset-bottom))]">
      <ScreenHeader title={t("check.header")} onBack={onHome} />
      <div aria-hidden className="relative mx-auto mt-4 flex size-[220px] items-center justify-center">
        <Ripple size={220} rings={4} inner={36} className="absolute text-action/25" />
        <span className="inline-flex size-14 items-center justify-center rounded-pill bg-action text-white ring-4 ring-soft">{icon}</span>
      </div>
      <h1 className="tt-h2 mt-4 text-center !text-[24px]">{title}</h1>
      <p className="tt-body mt-2 text-center text-ink-2">{body}</p>
      {children}
      <div className="mt-auto space-y-2.5 pt-8">
        <Button onClick={primary.onClick}>{primary.label}</Button>
        <Button variant="secondary" onClick={onHome}>
          {t("common.backToHome")}
        </Button>
      </div>
    </main>
  );
}
