import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { authApi } from "@/lib/auth/backend";
import { OAUTH_STATE_COOKIE, safeRedirect } from "@/lib/auth/constants";
import { tokenCookies } from "@/lib/auth/tokens";

/**
 * Google redirects here with ?code&state. We exchange the code for an ID token
 * (server-side, using the client secret) and hand the ID token to the backend,
 * which verifies it and returns our own access/refresh tokens.
 */
export async function GET(req: NextRequest) {
  const fail = (error: string) => {
    const res = NextResponse.redirect(`${env.appUrl}/login?error=${error}`);
    res.cookies.delete({ name: OAUTH_STATE_COOKIE, path: "/api/auth/google" });
    return res;
  };

  const params = req.nextUrl.searchParams;
  if (params.get("error")) return fail("google_denied");

  let saved: { state?: string; next?: string } = {};
  try {
    saved = JSON.parse(req.cookies.get(OAUTH_STATE_COOKIE)?.value ?? "{}");
  } catch {}
  const code = params.get("code");
  if (!code || !saved.state || saved.state !== params.get("state")) return fail("invalid_state");

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: env.googleClientId,
        client_secret: env.googleClientSecret,
        redirect_uri: `${env.appUrl}/api/auth/google/callback`,
        grant_type: "authorization_code",
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    if (!tokenRes.ok) {
      console.error("[auth] google token exchange failed", await tokenRes.text());
      return fail("google_failed");
    }
    const { id_token } = (await tokenRes.json()) as { id_token?: string };
    if (!id_token) return fail("google_failed");

    const auth = await authApi.google(id_token);
    const res = NextResponse.redirect(`${env.appUrl}${safeRedirect(saved.next)}`);
    for (const c of tokenCookies(auth)) res.cookies.set(c.name, c.value, c.options);
    res.cookies.delete({ name: OAUTH_STATE_COOKIE, path: "/api/auth/google" });
    return res;
  } catch (err) {
    console.error("[auth] google sign-in failed", err);
    return fail("google_failed");
  }
}
