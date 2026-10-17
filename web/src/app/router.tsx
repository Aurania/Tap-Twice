import { createBrowserRouter, Navigate } from "react-router";
import { Splash } from "@/features/boot/Splash";
import { Confirm } from "@/features/check/Confirm";
import { CouldntRead, NotACart } from "@/features/check/ExtractProblem";
import { Logged } from "@/features/check/Logged";
import { PaylaterRealCost } from "@/features/check/PaylaterRealCost";
import { Reading } from "@/features/check/Reading";
import { Reality } from "@/features/check/Reality";
import { ComponentsPage } from "@/features/dev/ComponentsPage";
import { FutureMe } from "@/features/futureMe/FutureMe";
import { Home } from "@/features/home/Home";
import { GoalStep } from "@/features/onboarding/GoalStep";
import { InterestStep } from "@/features/onboarding/InterestStep";
import { MoneyStep } from "@/features/onboarding/MoneyStep";
import { OnboardingLayout } from "@/features/onboarding/OnboardingLayout";
import { Saved } from "@/features/saved/Saved";
import { Settings } from "@/features/settings/Settings";
import { Welcome } from "@/features/welcome/Welcome";
import { RootLayout } from "./RootLayout";

/** Routes from docs/frontend/SCREENS.md. Sheets are not routes. */
export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: "/", element: <Splash /> },
      { path: "/welcome/:step", element: <Welcome /> },
      {
        path: "/onboarding",
        element: <OnboardingLayout />,
        children: [
          { index: true, element: <Navigate to="money" replace /> },
          { path: "money", element: <MoneyStep /> },
          { path: "goal", element: <GoalStep /> },
          { path: "interest", element: <InterestStep /> },
        ],
      },
      { path: "/home", element: <Home /> },
      { path: "/check/reading", element: <Reading /> },
      { path: "/check/not-a-cart", element: <NotACart /> },
      { path: "/check/error", element: <CouldntRead /> },
      { path: "/check/confirm", element: <Confirm /> },
      { path: "/check/reality", element: <Reality /> },
      { path: "/check/logged", element: <Logged /> },
      { path: "/check/paylater", element: <PaylaterRealCost /> },
      { path: "/check/future-me", element: <FutureMe /> },
      { path: "/saved", element: <Saved /> },
      { path: "/settings", element: <Settings /> },
      { path: "/dev/components", element: <ComponentsPage /> },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);
