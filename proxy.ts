import { NextResponse, type NextRequest } from "next/server";
import {
  ACCESS_COOKIE,
  AFTER_LOGIN_PATH,
  AUTH_ROUTES,
  LOGIN_PATH,
  PROTECTED_ROUTES,
  REFRESH_COOKIE,
} from "@/lib/auth/constants";
import { clearedCookies, refreshTokens, tokenCookies, type TokenCookie } from "@/lib/auth/tokens";

/**
 * 1. Silently refreshes the access token when it has expired (access cookie
 *    gone, refresh cookie present) — once, here, before any page renders.
 * 2. Optimistic route guards based on cookie presence. The real check happens
 *    in the (protected) layout via `requireUser()`.
 */
export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  let access = req.cookies.get(ACCESS_COOKIE)?.value;
  const refresh = req.cookies.get(REFRESH_COOKIE)?.value;
  let toSet: TokenCookie[] = [];

  if (!access && refresh) {
    const tokens = await refreshTokens(refresh);
    toSet = tokens ? tokenCookies(tokens) : clearedCookies();
    access = tokens?.accessToken;
    // Make the fresh cookies visible to this request's Server Components too.
    for (const c of toSet) {
      if (c.value) req.cookies.set(c.name, c.value);
      else req.cookies.delete(c.name);
    }
  }

  const matches = (routes: string[]) =>
    routes.some((r) => pathname === r || pathname.startsWith(`${r}/`));

  let res: NextResponse;
  if (!access && matches(PROTECTED_ROUTES)) {
    const url = new URL(LOGIN_PATH, req.url);
    url.searchParams.set("next", pathname + search);
    res = NextResponse.redirect(url);
  } else if (access && matches(AUTH_ROUTES)) {
    res = NextResponse.redirect(new URL(AFTER_LOGIN_PATH, req.url));
  } else {
    res = NextResponse.next({ request: { headers: req.headers } });
  }

  for (const c of toSet) res.cookies.set(c.name, c.value, c.options);
  return res;
}

export const config = {
  // Skip static assets, images and auth endpoints that manage cookies themselves.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/auth|api/health|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)",
  ],
};
