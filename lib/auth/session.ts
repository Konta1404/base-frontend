import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authApi, BackendError } from "./backend";
import { ACCESS_COOKIE, LOGIN_PATH, REFRESH_COOKIE } from "./constants";
import { clearedCookies, tokenCookies } from "./tokens";
import type { AuthResponse, User } from "./types";

/** Persist tokens in httpOnly cookies. Call from Server Actions / Route Handlers only. */
export async function createSession(auth: AuthResponse) {
  const store = await cookies();
  for (const c of tokenCookies(auth)) store.set(c.name, c.value, c.options);
}

export async function deleteSession() {
  const store = await cookies();
  for (const c of clearedCookies()) store.set(c.name, c.value, c.options);
}

export async function getTokens() {
  const store = await cookies();
  return {
    accessToken: store.get(ACCESS_COOKIE)?.value,
    refreshToken: store.get(REFRESH_COOKIE)?.value,
  };
}

/**
 * Data Access Layer: returns the current user or null. Deduplicated per request
 * with React `cache`, so call it freely from layouts, pages and actions.
 * (Expired access tokens are refreshed beforehand by proxy.ts.)
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const { accessToken } = await getTokens();
  if (!accessToken) return null;
  try {
    return await authApi.me(accessToken);
  } catch (err) {
    if (err instanceof BackendError && (err.status === 401 || err.status === 403)) return null;
    throw err;
  }
});

/** Use in protected pages/actions: returns the user or redirects to login. */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect(LOGIN_PATH);
  return user;
}
