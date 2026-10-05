import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { safeRedirect } from '../lib/auth/constants';
import { tokenCookies, refreshTokens } from '../lib/auth/tokens';
import { AuthResponseSchema } from '../lib/auth/schemas';
import { proxy } from '../proxy';

afterEach(() => vi.unstubAllGlobals());
describe('authentication boundaries', () => {
  it.each(['https://evil.example', '//evil.example', '/\\evil.example', '/\tevil.example', '/x\\evil'])('rejects unsafe redirect %s', path => {
    expect(safeRedirect(path)).toBe('/dashboard');
  });
  it('keeps a local destination and query', () => expect(safeRedirect('/dashboard?view=all')).toBe('/dashboard?view=all'));
  it('expires short-lived cookies before their token', () => {
    const cookies = tokenCookies({ accessToken: 'short', expiresIn: 10 });
    expect(cookies[0].options.maxAge).toBe(9);
    expect(cookies[0].options.httpOnly).toBe(true);
  });
  it.each([{ accessToken: '' }, { accessToken: 'a', expiresIn: -1 }, { accessToken: 42 }])('rejects malformed auth response %j', body => {
    expect(AuthResponseSchema.safeParse(body).success).toBe(false);
  });
  it('does not accept malformed refresh responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ accessToken: 42 })));
    expect(await refreshTokens('r')).toBeNull();
  });
  it('keeps the login page reachable for a revoked-but-present cookie', async () => {
    const result = await proxy(new NextRequest('http://localhost:3000/login', { headers: { cookie: 'access_token=revoked' } }));
    expect(result.headers.get('location')).toBeNull();
  });
  it('clears cookies and redirects on failed refresh', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 401 })));
    const result = await proxy(new NextRequest('http://localhost:3000/dashboard', { headers: { cookie: 'refresh_token=bad' } }));
    expect(result.headers.get('location')).toContain('/login?next=');
    expect(result.cookies.get('refresh_token')?.value).toBe('');
  });
});
