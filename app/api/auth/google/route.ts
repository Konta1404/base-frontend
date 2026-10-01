import { NextResponse, type NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import { env } from "@/lib/env";
import { OAUTH_STATE_COOKIE, safeRedirect } from "@/lib/auth/constants";

/** Starts Google sign-in: GET /api/auth/google?next=/dashboard */
export async function GET(req: NextRequest) {
  if (!env.googleEnabled) {
    return NextResponse.redirect(`${env.appUrl}/login?error=google_not_configured`);
  }

  const state = randomBytes(24).toString("base64url");
  const next = safeRedirect(req.nextUrl.searchParams.get("next"));

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: env.googleClientId,
    redirect_uri: `${env.appUrl}/api/auth/google/callback`,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  }).toString();

  const res = NextResponse.redirect(url);
  res.cookies.set(OAUTH_STATE_COOKIE, JSON.stringify({ state, next }), {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: "lax",
    path: "/api/auth/google",
    maxAge: 600,
  });
  return res;
}
