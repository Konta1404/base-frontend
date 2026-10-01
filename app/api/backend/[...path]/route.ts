import type { NextRequest } from "next/server";
import { env } from "@/lib/env";
import { getTokens } from "@/lib/auth/session";

/**
 * Backend-for-frontend passthrough for Client Components:
 *   fetch("/api/backend/projects")  ->  ${API_URL}/projects  (+ Bearer token)
 * Tokens never reach the browser; the httpOnly cookie is swapped for a header here.
 */
async function handler(req: NextRequest, ctx: RouteContext<"/api/backend/[...path]">) {
  const { path } = await ctx.params;
  const { accessToken } = await getTokens();
  const target = `${env.apiUrl}/${path.map(encodeURIComponent).join("/")}${req.nextUrl.search}`;

  const headers = new Headers();
  for (const name of ["content-type", "accept", "accept-language"]) {
    const value = req.headers.get(name);
    if (value) headers.set(name, value);
  }
  if (accessToken) headers.set("authorization", `Bearer ${accessToken}`);

  const hasBody = !["GET", "HEAD"].includes(req.method);
  const upstream = await fetch(target, {
    method: req.method,
    headers,
    body: hasBody ? await req.arrayBuffer() : undefined,
    cache: "no-store",
    redirect: "manual",
  });

  const resHeaders = new Headers(upstream.headers);
  for (const h of [
    "set-cookie",
    "content-encoding",
    "content-length",
    "transfer-encoding",
    "connection",
  ]) {
    resHeaders.delete(h);
  }
  return new Response(upstream.body, { status: upstream.status, headers: resHeaders });
}

export { handler as GET, handler as POST, handler as PUT, handler as PATCH, handler as DELETE };
