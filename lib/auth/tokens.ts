/**
 * Token/cookie helpers shared by proxy.ts, route handlers and server actions.
 * No `server-only` / `next/headers` imports here so the proxy can use it.
 */
import {
  ACCESS_COOKIE,
  AUTH_ENDPOINTS,
  DEFAULT_ACCESS_TTL,
  DEFAULT_REFRESH_TTL,
  REFRESH_COOKIE,
} from "./constants";
import type { AuthResponse } from "./types";

type CookieOptions = {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax";
  path: string;
  maxAge: number;
};

export type TokenCookie = { name: string; value: string; options: CookieOptions };

function isSecure() {
  if (process.env.COOKIE_SECURE) return process.env.COOKIE_SECURE === "true";
  return (process.env.APP_URL ?? "").startsWith("https://");
}

function opts(maxAge: number): CookieOptions {
  return { httpOnly: true, secure: isSecure(), sameSite: "lax", path: "/", maxAge };
}

/**
 * Cookies to set after a successful login/refresh. The access cookie expires
 * together with the access token, so "no access cookie + refresh cookie"
 * means "time to refresh" — works for JWTs and opaque tokens alike.
 */
export function tokenCookies(auth: AuthResponse): TokenCookie[] {
  const cookies: TokenCookie[] = [
    {
      name: ACCESS_COOKIE,
      value: auth.accessToken,
      options: opts(Math.max(30, (auth.expiresIn ?? DEFAULT_ACCESS_TTL) - 30)),
    },
  ];
  if (auth.refreshToken) {
    cookies.push({
      name: REFRESH_COOKIE,
      value: auth.refreshToken,
      options: opts(DEFAULT_REFRESH_TTL),
    });
  }
  return cookies;
}

export function clearedCookies(): TokenCookie[] {
  return [ACCESS_COOKIE, REFRESH_COOKIE].map((name) => ({ name, value: "", options: opts(0) }));
}

/** Exchange a refresh token for a new token pair. Returns null on any failure. */
export async function refreshTokens(refreshToken: string): Promise<AuthResponse | null> {
  const apiUrl = (process.env.API_URL ?? "http://localhost:4000").replace(/\/$/, "");
  try {
    const res = await fetch(`${apiUrl}${AUTH_ENDPOINTS.refresh}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ refreshToken }),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as AuthResponse;
    return data?.accessToken ? data : null;
  } catch (err) {
    console.error("[auth] token refresh failed", err);
    return null;
  }
}
