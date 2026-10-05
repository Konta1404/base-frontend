import type { NextRequest } from 'next/server';
import { env } from '@/lib/env';
import { getTokens } from '@/lib/auth/session';

// Upstream must independently authorize every resource operation.
async function handler(req: NextRequest, ctx: RouteContext<'/api/backend/[...path]'>) {
  const { path } = await ctx.params;
  // Authentication endpoints must use the dedicated server-side auth handlers:
  // forwarding them could return tokens in a JavaScript-readable response body.
  if (!path.length || path[0] === 'auth' || path.some(p => p === '.' || p === '..' || /[\\/]/.test(p))) {
    return Response.json({ message: 'Unsupported backend path.' }, { status: 400 });
  }
  const mutation = !['GET', 'HEAD'].includes(req.method);
  if (mutation && req.headers.get('origin') !== new URL(env.appUrl).origin) {
    return Response.json({ message: 'Invalid request origin.' }, { status: 403 });
  }
  const { accessToken } = await getTokens();
  if (!accessToken) return Response.json({ message: 'Sign in required.' }, { status: 401 });
  const target = `${env.apiUrl}/${path.map(encodeURIComponent).join('/')}${req.nextUrl.search}`;
  const headers = new Headers({ authorization: `Bearer ${accessToken}` });
  for (const name of ['content-type', 'accept', 'accept-language']) {
    const value = req.headers.get(name);
    if (value) headers.set(name, value);
  }
  try {
    const upstream = await fetch(target, {
      method: req.method, headers,
      body: mutation ? await req.arrayBuffer() : undefined,
      cache: 'no-store', redirect: 'manual', signal: AbortSignal.timeout(10000),
    });
    if (upstream.status >= 300 && upstream.status < 400) {
      return Response.json({ message: 'Unexpected upstream redirect.' }, { status: 502 });
    }
    const responseHeaders = new Headers({ 'Cache-Control': 'no-store' });
    for (const name of ['content-type', 'content-disposition']) {
      const value = upstream.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }
    return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
  } catch {
    return Response.json({ message: 'Backend unavailable. Please retry.' }, { status: 502 });
  }
}
export { handler as GET, handler as POST, handler as PUT, handler as PATCH, handler as DELETE };
