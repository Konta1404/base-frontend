import { afterEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const session = vi.hoisted(() => ({ token: 'test-token' as string | undefined }));
vi.mock('../lib/auth/session', () => ({ getTokens: async () => ({ accessToken: session.token }) }));
import { GET, POST } from '../app/api/backend/[...path]/route';
afterEach(() => { vi.unstubAllGlobals(); session.token = 'test-token'; });
const ctx = (path: string[]) => ({ params: Promise.resolve({ path }) });
it('rejects anonymous calls without contacting the upstream', async () => {
  session.token = undefined;
  const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
  expect((await GET(new NextRequest('http://localhost:3000/api/backend/projects'), ctx(['projects']))).status).toBe(401);
  expect(fetch).not.toHaveBeenCalled();
});
it('does not expose auth endpoints through the proxy', async () => {
  expect((await GET(new NextRequest('http://localhost:3000/api/backend/auth/me'), ctx(['auth', 'me']))).status).toBe(400);
});
it('rejects cross-origin writes', async () => {
  expect((await POST(new NextRequest('http://localhost:3000/api/backend/projects', { method: 'POST', headers: { origin: 'https://other.example' } }), ctx(['projects']))).status).toBe(403);
});
it('forwards authorized requests without forwarding upstream cookies', async () => {
  const fetch = vi.fn().mockResolvedValue(Response.json({ projects: [] }, { headers: { 'set-cookie': 'bad=1' } }));
  vi.stubGlobal('fetch', fetch);
  const response = await GET(new NextRequest('http://localhost:3000/api/backend/projects'), ctx(['projects']));
  expect(response.status).toBe(200);
  expect(response.headers.get('set-cookie')).toBeNull();
  expect(fetch.mock.calls[0][1].headers.get('authorization')).toBe('Bearer test-token');
});
it('returns a controlled error for upstream network failure', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('unavailable')));
  expect((await GET(new NextRequest('http://localhost:3000/api/backend/projects'), ctx(['projects']))).status).toBe(502);
});
