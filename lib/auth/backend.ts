import "server-only";
import { env } from "@/lib/env";
import { AUTH_ENDPOINTS } from "./constants";
import { AuthResponseSchema, UserSchema } from "./schemas";
import type { z } from "zod";

export class BackendError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: unknown,
  ) {
    super(message);
  }
}

async function call<T>(path: string, init: RequestInit & { token?: string } = {}): Promise<T> {
  const { token, headers, ...rest } = init;
  let res: Response;
  try {
    res = await fetch(`${env.apiUrl}${path}`, {
      ...rest,
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
    });
  } catch (err) {
    console.error(`[auth] backend unreachable at ${env.apiUrl}${path}`, err);
    throw new BackendError(503, "Authentication service is unavailable. Try again shortly.");
  }

  const text = await res.text();
  const body = text ? safeJson(text) : undefined;
  if (!res.ok) {
    const message =
      (body && typeof body === "object" && "message" in body && String(body.message)) ||
      res.statusText ||
      "Request failed";
    throw new BackendError(res.status, message, body);
  }
  return body as T;
}

function safeJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function validated<T>(schema: z.ZodType<T>, path: string, init?: RequestInit & { token?: string }): Promise<T> {
  const result = schema.safeParse(await call<unknown>(path, init));
  if (!result.success) throw new BackendError(502, "Authentication service returned an invalid response.");
  return result.data;
}

export const authApi = {
  login: (email: string, password: string) =>
    validated(AuthResponseSchema, AUTH_ENDPOINTS.login, {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  register: (name: string, email: string, password: string) =>
    validated(AuthResponseSchema, AUTH_ENDPOINTS.register, {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    }),
  google: (idToken: string) =>
    validated(AuthResponseSchema, AUTH_ENDPOINTS.google, {
      method: "POST",
      body: JSON.stringify({ idToken }),
    }),
  logout: (token?: string, refreshToken?: string) =>
    call<unknown>(AUTH_ENDPOINTS.logout, {
      method: "POST",
      token,
      body: JSON.stringify({ refreshToken }),
    }),
  me: (token: string) => validated(UserSchema, AUTH_ENDPOINTS.me, { token }),
};
