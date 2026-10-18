import { useEffect } from "react";
import { Outlet, ScrollRestoration, useLocation, useNavigate } from "react-router";
import { setNoProfileHandler } from "@/api";
import { FutureMeProvider } from "@/features/futureMe/FutureMeProvider";
import { useI18n } from "@/i18n/I18nProvider";

/**
 * Mobile-first column: 390 px design width, centred in a 430 px column on desktop
 * (web/CLAUDE.md rule 8). Also routes `409 no_profile` from any API call to /welcome.
 */
export function RootLayout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { t } = useI18n();

  // Each screen has its own page title, for screen readers and the browser's history.
  useEffect(() => {
    document.title = pathname.startsWith("/welcome")
      ? t("title.welcome")
      : pathname.startsWith("/onboarding")
        ? t("title.onboarding")
        : pathname === "/home"
          ? t("title.home")
          : pathname === "/wishlist/real-cost"
            ? t("title.realCost")
            : pathname.startsWith("/wishlist")
              ? t("title.wishlist")
              : pathname.startsWith("/check")
                ? t("title.check")
                : t("app.name");
  }, [pathname, t]);

  useEffect(() => {
    setNoProfileHandler(() => navigate("/welcome/1", { replace: true }));
    return () => setNoProfileHandler(null);
  }, [navigate]);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-page shadow-sm">
      <FutureMeProvider>
        <Outlet />
      </FutureMeProvider>
      <ScrollRestoration />
    </div>
  );
}
