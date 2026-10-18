/** Runtime config from web/.env.local (see REPO_CONTEXT.md, "Frontend setup notes"). */

function required(name: keyof ImportMetaEnv): string {
  const value = import.meta.env[name];
  if (!value) throw new Error(`Missing ${name} in web/.env.local`);
  return value;
}

export const config = {
  apiUrl: required("VITE_API_URL").replace(/\/+$/, ""),
  firebase: {
    apiKey: required("VITE_FIREBASE_API_KEY"),
    authDomain: required("VITE_FIREBASE_AUTH_DOMAIN"),
    projectId: required("VITE_FIREBASE_PROJECT_ID"),
    // Optional for anonymous auth.
    appId: import.meta.env.VITE_FIREBASE_APP_ID || undefined,
  },
} as const;
