import "server-only";
import { env } from "@/lib/env";
import { getTokens } from "@/lib/auth/session";
import { BackendError } from "@/lib/auth/backend";

/**
 * Authenticated fetch to your backend from Server Components, Server Actions
 * and Route Handlers. Attaches the user's access token automatically.
 *
 *   const projects = await api<Project[]>("/projects");
 *   await api("/projects", { method: "POST", json: { name } });
 */
export async function api<T = unknown>(
  path: string,
  init: RequestInit & { json?: unknown } = {},
): Promise<T> {
  const { accessToken } = await getTokens();
  const { json, headers, ...rest } = init;
  const res = await fetch(`${env.apiUrl}${path.startsWith("/") ? path : `/${path}`}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
    ...rest,
    body: json !== undefined ? JSON.stringify(json) : rest.body,
    headers: {
      Accept: "application/json",
      ...(json !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
  });
  const text = await res.text();
  let body: unknown = text;
  try {
    body = text ? JSON.parse(text) : undefined;
  } catch {}
  if (!res.ok) {
    const message =
      typeof body === "object" && body !== null && "message" in body
        ? String((body as { message: unknown }).message)
        : res.statusText;
    throw new BackendError(res.status, message, body);
  }
  return body as T;
}
