import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, signOut, type User } from "firebase/auth";
import { config } from "@/config";

// Auth only. The browser never talks to Firestore or Gemini (web/CLAUDE.md rule 2).
const app = initializeApp(config.firebase);
export const auth = getAuth(app);

let signingIn: Promise<User> | null = null;

/** Returns the anonymous user, signing in once if this browser has none yet. */
export async function ensureUser(): Promise<User> {
  await auth.authStateReady();
  if (auth.currentUser) return auth.currentUser;
  signingIn ??= signInAnonymously(auth)
    .then((cred) => cred.user)
    .finally(() => {
      signingIn = null;
    });
  return signingIn;
}

/** A fresh ID token for the Authorization header. The SDK refreshes it when needed. */
export async function getIdToken(): Promise<string> {
  const user = await ensureUser();
  return user.getIdToken();
}

/**
 * After a 401: force a token refresh, or start a new anonymous session if the old
 * user no longer exists (e.g. deleted server-side).
 */
export async function reauthenticate(): Promise<void> {
  const user = auth.currentUser;
  if (user) {
    try {
      await user.getIdToken(true);
      return;
    } catch {
      await signOut(auth);
    }
  }
  await ensureUser();
}

/** Used by "Reset everything": drop this anonymous user so the next visit starts fresh. */
export async function endSession(): Promise<void> {
  await signOut(auth);
}
