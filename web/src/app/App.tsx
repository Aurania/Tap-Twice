import { RouterProvider } from "react-router/dom";
import { I18nProvider } from "@/i18n/I18nProvider";
import { CheckProvider } from "@/state/CheckProvider";
import { PayProvider } from "@/state/PayProvider";
import { ProfileProvider } from "@/state/ProfileProvider";
import { ToastProvider } from "@/ui";
import { router } from "./router";

export function App() {
  return (
    <I18nProvider>
      <ProfileProvider>
        <ToastProvider>
          <CheckProvider>
            <PayProvider>
              <RouterProvider router={router} />
            </PayProvider>
          </CheckProvider>
        </ToastProvider>
      </ProfileProvider>
    </I18nProvider>
  );
}
