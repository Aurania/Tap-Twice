import { useEffect } from "react";
import { Outlet, ScrollRestoration, useNavigate } from "react-router";
import { setNoProfileHandler } from "@/api";

/**
 * Mobile-first column: 390 px design width, centred in a 430 px column on desktop
 * (web/CLAUDE.md rule 8). Also routes `409 no_profile` from any API call to /welcome.
 */
export function RootLayout() {
  const navigate = useNavigate();

  useEffect(() => {
    setNoProfileHandler(() => navigate("/welcome/1", { replace: true }));
    return () => setNoProfileHandler(null);
  }, [navigate]);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-page shadow-sm">
      <Outlet />
      <ScrollRestoration />
    </div>
  );
}
