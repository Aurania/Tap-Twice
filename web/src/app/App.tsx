import { RouterProvider } from "react-router/dom";
import { I18nProvider } from "@/i18n/I18nProvider";
import { ToastProvider } from "@/ui";
import { router } from "./router";

export function App() {
  return (
    <I18nProvider>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </I18nProvider>
  );
}
