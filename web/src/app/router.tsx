import { createBrowserRouter, Navigate, type RouteObject } from "react-router";
import { Splash } from "@/features/boot/Splash";
import { Home } from "@/features/home/Home";
import { Welcome } from "@/features/welcome/Welcome";
import { RootLayout } from "./RootLayout";

/**
 * Routes from docs/frontend/SCREENS.md. Sheets are not routes.
 * Splash, Welcome and Home load up front; the rest load on demand (and are precached by the service worker).
 */
const onboarding = () => import("@/features/onboarding");
const check = () => import("@/features/check");

const devRoutes: RouteObject[] = import.meta.env.DEV
  ? [{ path: "/dev/components", lazy: () => import("@/features/dev/ComponentsPage").then((m) => ({ Component: m.ComponentsPage })) }]
  : [];

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: "/", element: <Splash /> },
      { path: "/welcome/:step", element: <Welcome /> },
      {
        path: "/onboarding",
        lazy: () => onboarding().then((m) => ({ Component: m.OnboardingLayout })),
        children: [
          { index: true, element: <Navigate to="money" replace /> },
          { path: "money", lazy: () => onboarding().then((m) => ({ Component: m.MoneyStep })) },
          { path: "goal", lazy: () => onboarding().then((m) => ({ Component: m.GoalStep })) },
          { path: "interest", lazy: () => onboarding().then((m) => ({ Component: m.InterestStep })) },
        ],
      },
      { path: "/home", element: <Home /> },
      { path: "/check/reading", lazy: () => check().then((m) => ({ Component: m.Reading })) },
      { path: "/check/not-a-cart", lazy: () => check().then((m) => ({ Component: m.NotACart })) },
      { path: "/check/error", lazy: () => check().then((m) => ({ Component: m.CouldntRead })) },
      { path: "/check/confirm", lazy: () => check().then((m) => ({ Component: m.Confirm })) },
      { path: "/check/reality", lazy: () => check().then((m) => ({ Component: m.Reality })) },
      { path: "/check/logged", lazy: () => check().then((m) => ({ Component: m.Logged })) },
      { path: "/check/paylater", lazy: () => check().then((m) => ({ Component: m.PaylaterRealCost })) },
      { path: "/check/future-me", lazy: () => import("@/features/futureMe/FutureMe").then((m) => ({ Component: m.FutureMe })) },
      { path: "/saved", lazy: () => import("@/features/saved/Saved").then((m) => ({ Component: m.Saved })) },
      { path: "/settings", lazy: () => import("@/features/settings/Settings").then((m) => ({ Component: m.Settings })) },
      ...devRoutes,
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);
