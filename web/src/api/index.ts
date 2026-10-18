import { config } from "@/config";

export { ApiError, setNoProfileHandler } from "./client";
export type * from "./types";
export type * from "./v2";
export { CURRENCIES, WEEKDAYS, apiV2 as api } from "./v2";

/** No auth. Used by /dev/components to check the API is up. */
export async function health(): Promise<{ ok: boolean; model: string }> {
  const res = await fetch(`${config.apiUrl}/api/health`);
  if (!res.ok) throw new Error(`health ${res.status}`);
  return res.json();
}
