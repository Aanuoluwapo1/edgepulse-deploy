import { afterEach, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware, resolveExperimentVariant, VARIANT_COOKIE_NAME } from '@/middleware';

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe('Edge Middleware (src/middleware.ts)', () => {
  it('resolves variant priority: query override > cookie > default A', () => {
    expect(resolveExperimentVariant(null, null)).toEqual({
      variant: 'A',
      fromQueryOverride: false,
    });
    expect(resolveExperimentVariant(null, 'B')).toEqual({
      variant: 'B',
      fromQueryOverride: false,
    });
    expect(resolveExperimentVariant('b', 'A')).toEqual({
      variant: 'B',
      fromQueryOverride: true,
    });
  });

  it('injects x-edgepulse-middleware and x-edgepulse-variant headers on standard routes', () => {
    const req = new NextRequest('http://localhost:3000/isr-lab', {
      headers: {
        cookie: `${VARIANT_COOKIE_NAME}=B`,
      },
    });

    const res = middleware(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('x-edgepulse-middleware')).toBe('active');
    expect(res.headers.get('x-edgepulse-variant')).toBe('B');
    expect(res.headers.get('x-edgepulse-trace-id')).toBeTruthy();
  });

  it('persists variant cookie when ?variant=B query override is supplied', () => {
    const req = new NextRequest('http://localhost:3000/?variant=B');
    const res = middleware(req);

    expect(res.headers.get('x-edgepulse-variant')).toBe('B');
    const setCookieHeader = res.headers.get('set-cookie') ?? '';
    expect(setCookieHeader).toContain('edgepulse_variant=B');
  });

  it('blocks /status/admin with 401 when admin token is missing or invalid', async () => {
    process.env.EDGEPULSE_ADMIN_TOKEN = 'strict-admin-secret';

    const unauthReq = new NextRequest('https://pulse.example.com/status/admin');
    const unauthRes = middleware(unauthReq);

    expect(unauthRes.status).toBe(401);
    expect(unauthRes.headers.get('x-edgepulse-middleware')).toBe('active');

    const payload = (await unauthRes.json()) as { status: string; path: string };
    expect(payload.status).toBe('forbidden');
    expect(payload.path).toBe('/status/admin');
  });

  it('allows /status/admin when valid x-edgepulse-admin-token header is present', () => {
    process.env.EDGEPULSE_ADMIN_TOKEN = 'strict-admin-secret';

    const authReq = new NextRequest('https://pulse.example.com/status/admin', {
      headers: {
        'x-edgepulse-admin-token': 'strict-admin-secret',
      },
    });

    const authRes = middleware(authReq);
    expect(authRes.status).toBe(200);
    expect(authRes.headers.get('x-edgepulse-middleware')).toBe('active');
  });
});
