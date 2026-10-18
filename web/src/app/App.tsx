import { RouterProvider } from "react-router/dom";
import { I18nProvider } from "@/i18n/I18nProvider";
import { CheckProvider } from "@/state/CheckProvider";
import { ProfileProvider } from "@/state/ProfileProvider";
import { ToastProvider } from "@/ui";
import { router } from "./router";

export function App() {
  return (
    <I18nProvider>
      <ProfileProvider>
        <ToastProvider>
          <CheckProvider>
            <RouterProvider router={router} />
          </CheckProvider>
        </ToastProvider>
      </ProfileProvider>
    </I18nProvider>
  );
}
