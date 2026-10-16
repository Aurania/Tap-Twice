const env = process.env;

export const config = {
  port: Number(env.PORT ?? 8080),
  projectId: env.GOOGLE_CLOUD_PROJECT ?? "tap-twice-aurania",
  // The named database holds the project's Firestore free tier (not "(default)").
  firestoreDatabase: env.FIRESTORE_DATABASE ?? "tap-twice-db",
  // Gemini 3.5 Flash-Lite is served from the global endpoint, not from Jakarta.
  geminiLocation: env.GEMINI_LOCATION ?? "global",
  geminiModel: env.GEMINI_MODEL ?? "gemini-3.5-flash-lite",
  // Optional override, e.g. to move only extraction to Flash if accuracy is too low.
  extractModel: env.GEMINI_EXTRACT_MODEL ?? env.GEMINI_MODEL ?? "gemini-3.5-flash-lite",
  allowedOrigins: (env.ALLOWED_ORIGINS ?? "http://localhost:5173").split(",").map((s) => s.trim()),
  // Local testing only: accept an `x-dev-uid` header instead of a Firebase token.
  // Never active on Cloud Run (K_SERVICE is set there).
  devAuthBypass: env.DEV_AUTH_BYPASS === "1" && !env.K_SERVICE,
};
