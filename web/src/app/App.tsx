import { RouterProvider } from "react-router/dom";
import { I18nProvider } from "@/i18n/I18nProvider";
import { CartCheckProvider } from "@/state/CartCheckProvider";
import { ProfileProvider } from "@/state/ProfileProvider";
import { ToastProvider } from "@/ui";
import { router } from "./router";

export function App() {
  return (
    <I18nProvider>
      <ProfileProvider>
        <CartCheckProvider>
          <ToastProvider>
            <RouterProvider router={router} />
          </ToastProvider>
        </CartCheckProvider>
      </ProfileProvider>
    </I18nProvider>
  );
}
