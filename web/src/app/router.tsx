import { createBrowserRouter, Navigate } from "react-router";
import { ComponentsPage } from "@/features/dev/ComponentsPage";
import { Placeholder } from "@/features/dev/Placeholder";
import { RootLayout } from "./RootLayout";

/**
 * Routes from docs/frontend/SCREENS.md. Sheets are not routes.
 * Screens arrive in phase 2–4; until then each route shows a placeholder.
 */
export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: "/", element: <Placeholder screen="Splash / boot" phase={2} /> },
      { path: "/welcome/:step", element: <Placeholder screen="Welcome W1–W4" phase={2} /> },
      { path: "/onboarding/:step", element: <Placeholder screen="Onboarding 01a–01c" phase={2} /> },
      { path: "/home", element: <Placeholder screen="02 Home" phase={2} /> },
      { path: "/check/reading", element: <Placeholder screen="03 Reading" phase={2} /> },
      { path: "/check/not-a-cart", element: <Placeholder screen="03b Not a cart" phase={4} /> },
      { path: "/check/error", element: <Placeholder screen="03c Couldn't read it" phase={4} /> },
      { path: "/check/confirm", element: <Placeholder screen="04 Confirm items" phase={2} /> },
      { path: "/check/reality", element: <Placeholder screen="05 Reality card" phase={2} /> },
      { path: "/check/logged", element: <Placeholder screen="05f Bought · Logged" phase={2} /> },
      { path: "/check/paylater", element: <Placeholder screen="06 Paylater · Real cost" phase={3} /> },
      { path: "/check/future-me", element: <Placeholder screen="07 Future Me" phase={3} /> },
      { path: "/saved", element: <Placeholder screen="08 Saved for later" phase={2} /> },
      { path: "/settings", element: <Placeholder screen="10 Settings" phase={4} /> },
      { path: "/dev/components", element: <ComponentsPage /> },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);
