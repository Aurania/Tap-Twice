import { RouterProvider } from "react-router/dom";
import { I18nProvider } from "@/i18n/I18nProvider";
import { ProfileProvider } from "@/state/ProfileProvider";
import { ToastProvider } from "@/ui";
import { router } from "./router";

export function App() {
  return (
    <I18nProvider>
      <ProfileProvider>
        <ToastProvider>
          <RouterProvider router={router} />
        </ToastProvider>
      </ProfileProvider>
    </I18nProvider>
  );
}
