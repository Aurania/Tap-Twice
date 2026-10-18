import { Navigate, Outlet } from "react-router";
import { useProfile } from "@/state/ProfileProvider";

/**
 * Wraps every screen that needs a profile. It waits while the profile loads, so reloading a deep link
 * such as /wishlist stays on that screen instead of bouncing through the splash to Home.
 * No profile means onboarding; a failed load goes to the splash, which shows "Try again".
 */
export function RequireProfile() {
  const { state } = useProfile();
  if (state.status === "loading") {
    return (
      <main aria-busy="true" className="flex flex-1 items-center justify-center bg-action">
        <span aria-hidden className="size-8 rounded-pill bg-highlight" />
      </main>
    );
  }
  if (state.status === "error") return <Navigate to="/" replace />;
  if (!state.profile) return <Navigate to="/welcome/1" replace />;
  return <Outlet />;
}
