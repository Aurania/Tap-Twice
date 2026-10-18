/** localStorage keys this app owns. "Reset everything" clears all `tt.*` keys (BACKEND_GAPS.md #11). */
export const KEYS = {
  lang: "tt.lang", // UI language before onboarding (gaps #12)
} as const;

type Key = (typeof KEYS)[keyof typeof KEYS];

export function readKey(key: Key): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeKey(key: Key, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Private mode or storage blocked: the app still works, it just forgets.
  }
}

export function clearAppKeys(): void {
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith("tt.")) localStorage.removeItem(key);
    }
  } catch {
    // Ignore.
  }
}
