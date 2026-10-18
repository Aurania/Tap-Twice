import { getIdToken, reauthenticate } from "@/auth/firebase";
import { config } from "@/config";
import type { ApiErrorCode } from "./types";

export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;

  constructor(status: number, code: ApiErrorCode) {
    super(`API ${status}: ${code}`);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

let onNoProfile: (() => void) | null = null;

/** The app registers a redirect to /welcome for `409 no_profile` (`api/src/schemas.ts`). */
export function setNoProfileHandler(handler: (() => void) | null): void {
  onNoProfile = handler;
}

type Method = "GET" | "POST" | "PUT" | "DELETE";

/**
 * Sends an authenticated request. On 401 it re-authenticates and retries once.
 * Returns the raw Response when it is OK; throws ApiError otherwise.
 */
export async function send(
  method: Method,
  path: string,
  body?: unknown,
  signal?: AbortSignal,
): Promise<Response> {
  const attempt = async () => {
    const token = await getIdToken();
    return fetch(`${config.apiUrl}${path}`, {
      method,
      signal,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  };

  let res = await attempt();
  if (res.status === 401) {
    await reauthenticate();
    res = await attempt();
  }
  if (res.ok) return res;

  const code = await readErrorCode(res);
  if (res.status === 409 && code === "no_profile") onNoProfile?.();
  throw new ApiError(res.status, code);
}

export async function request<T>(method: Method, path: string, body?: unknown): Promise<T> {
  const res = await send(method, path, body);
  return (await res.json()) as T;
}

async function readErrorCode(res: Response): Promise<ApiErrorCode> {
  try {
    const data = (await res.json()) as { error?: unknown };
    if (typeof data.error === "string") return data.error;
  } catch {
    // Not JSON (e.g. a proxy error page).
  }
  return res.status === 401 ? "unauthenticated" : "internal";
}

/** Reads a `text/event-stream` body and yields each event's parsed `data:` JSON. */
export async function* readEventStream<T>(res: Response): AsyncGenerator<T> {
  if (!res.body) return;
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += value;
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (line.startsWith("data:")) yield JSON.parse(line.slice(5)) as T;
      }
    }
    if (buffer.startsWith("data:")) yield JSON.parse(buffer.slice(5)) as T;
  } finally {
    reader.releaseLock();
  }
}
