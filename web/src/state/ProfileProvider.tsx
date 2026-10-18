import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, type ProfileV2 } from "@/api";
import { ensureUser } from "@/auth/firebase";
import { useI18n } from "@/i18n/I18nProvider";

type ProfileState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; profile: ProfileV2 | null };

type ProfileContextValue = {
  state: ProfileState;
  /** Profile once loaded; null while loading or when the user has none yet. */
  profile: ProfileV2 | null;
  reload: () => void;
  save: (profile: ProfileV2) => Promise<ProfileV2>;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

/** Signs in anonymously and loads `GET /api/profile` once at start (Splash waits for it). */
export function ProfileProvider({ children }: { children: ReactNode }) {
  const { setLang } = useI18n();
  const [state, setState] = useState<ProfileState>({ status: "loading" });

  const load = useCallback(() => {
    setState({ status: "loading" });
    ensureUser()
      .then(() => api.getProfile())
      .then(({ profile }) => {
        // After onboarding, profile.language wins over the local choice (gaps #12).
        if (profile) setLang(profile.language);
        setState({ status: "ready", profile });
      })
      .catch(() => setState({ status: "error" }));
  }, [setLang]);

  useEffect(load, [load]);

  const save = useCallback(async (profile: ProfileV2) => {
    const res = await api.putProfile(profile);
    setState({ status: "ready", profile: res.profile });
    return res.profile;
  }, []);

  const value = useMemo<ProfileContextValue>(
    () => ({ state, profile: state.status === "ready" ? state.profile : null, reload: load, save }),
    [state, load, save],
  );
  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used inside <ProfileProvider>");
  return ctx;
}
