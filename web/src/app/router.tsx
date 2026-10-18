import { createBrowserRouter, Navigate, type RouteObject } from "react-router";
import { Splash } from "@/features/boot/Splash";
import { Home } from "@/features/home/Home";
import { Welcome } from "@/features/welcome/Welcome";
import { RootLayout } from "./RootLayout";

/**
 * Routes. Sheets are not routes. Check, Future Me and Settings come back in later v2 phases.
 * Splash, Welcome and Home load up front; the rest load on demand (and are precached by the service worker).
 */
const onboarding = () => import("@/features/onboarding");

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
          { path: "work", lazy: () => onboarding().then((m) => ({ Component: m.WorkStep })) },
          { path: "pockets", lazy: () => onboarding().then((m) => ({ Component: m.PocketsStep })) },
          { path: "goal", lazy: () => onboarding().then((m) => ({ Component: m.GoalStep })) },
        ],
      },
      { path: "/home", element: <Home /> },
      { path: "/wishlist", lazy: () => import("@/features/wishlist/Wishlist").then((m) => ({ Component: m.Wishlist })) },
      ...devRoutes,
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);
