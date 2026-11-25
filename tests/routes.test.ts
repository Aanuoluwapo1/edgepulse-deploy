import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/cache', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('next/cache');
  return {
    ...actual,
    revalidateTag: vi.fn(),
  };
});

import { revalidateTag } from 'next/cache';
import { GET as getEdgeProbe, runtime as edgeProbeRuntime } from '@/app/api/edge-probe/route';
import { GET as getHealth } from '@/app/api/health/route';
import { POST as postRevalidate } from '@/app/api/revalidate/route';

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.clearAllMocks();
});

describe('Route Handlers (/api/health, /api/edge-probe, /api/revalidate)', () => {
  it('GET /api/health returns 200 structured JSON with local fallbacks', async () => {
    delete process.env.VERCEL_ENV;
    delete process.env.VERCEL_REGION;
    delete process.env.VERCEL_GIT_COMMIT_SHA;

    const response = await getHealth();
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('no-store');

    const body = (await response.json()) as {
      status: string;
      service: string;
      runtime: string;
      environment: string;
      region: string;
      shortSha: string;
      timestamp: string;
    };

    expect(body.status).toBe('ok');
    expect(body.service).toBe('edgepulse-deploy');
    expect(body.runtime).toBe('nodejs');
    expect(body.environment).toBe('development');
    expect(body.region).toBe('local-dev1');
    expect(body.shortSha).toBe('local-dev');
    expect(() => new Date(body.timestamp).toISOString()).not.toThrow();
  });

  it('GET /api/health reflects Vercel deployment metadata when set', async () => {
    process.env.VERCEL_ENV = 'production';
    process.env.VERCEL_REGION = 'iad1';
    process.env.VERCEL_GIT_COMMIT_SHA = '9f8e7d6c5b4a32109f8e7d6c5b4a32109f8e7d6c';

    const response = await getHealth();
    const body = (await response.json()) as {
      environment: string;
      region: string;
      commitSha: string;
      shortSha: string;
      isVercelRuntime: boolean;
    };

    expect(response.status).toBe(200);
    expect(body.environment).toBe('production');
    expect(body.region).toBe('iad1');
    expect(body.shortSha).toBe('9f8e7d6');
    expect(body.isVercelRuntime).toBe(true);
  });

  it('GET /api/edge-probe declares edge runtime and echoes request headers & timing', async () => {
    expect(edgeProbeRuntime).toBe('edge');

    const req = new Request('https://pulse.example.com/api/edge-probe', {
      headers: {
        'x-vercel-id': 'iad1::sfo1::req-12345',
        'x-vercel-ip-country': 'US',
        'x-vercel-ip-city': 'Ashburn',
        'x-edgepulse-middleware': 'active',
        'x-edgepulse-variant': 'B',
      },
    });

    const response = await getEdgeProbe(req);
    expect(response.status).toBe(200);
    expect(response.headers.get('x-edgepulse-runtime')).toBe('edge');

    const body = (await response.json()) as {
      status: string;
      runtime: string;
      echoedHeaders: Record<string, string>;
      timing: { executionTimeMs: number; timestamp: string };
    };

    expect(body.status).toBe('ok');
    expect(body.runtime).toBe('edge');
    expect(body.echoedHeaders['x-vercel-id']).toBe('iad1::sfo1::req-12345');
    expect(body.echoedHeaders['x-vercel-ip-country']).toBe('US');
    expect(body.echoedHeaders['x-edgepulse-variant']).toBe('B');
    expect(typeof body.timing.executionTimeMs).toBe('number');
    expect(body.timing.executionTimeMs).toBeGreaterThanOrEqual(0);
  });

  it('GET /api/edge-probe falls back cleanly when Vercel geo headers are absent', async () => {
    const req = new Request('http://localhost:3000/api/edge-probe');
    const response = await getEdgeProbe(req);
    const body = (await response.json()) as {
      echoedHeaders: Record<string, string>;
    };

    expect(response.status).toBe(200);
    expect(body.echoedHeaders['x-vercel-id']).toBe('local::dev1::edge-simulated');
    expect(body.echoedHeaders['x-vercel-ip-country']).toBe('LOCAL');
  });

  it('POST /api/revalidate rejects missing or invalid tokens with 401', async () => {
    process.env.REVALIDATE_SECRET = 'prod-revalidate-secret-xyz';

    const missingRes = await postRevalidate(
      new Request('http://localhost:3000/api/revalidate', { method: 'POST' }),
    );
    expect(missingRes.status).toBe(401);
    expect(revalidateTag).not.toHaveBeenCalled();

    const wrongRes = await postRevalidate(
      new Request('http://localhost:3000/api/revalidate', {
        method: 'POST',
        headers: { Authorization: 'Bearer wrong-secret' },
      }),
    );
    expect(wrongRes.status).toBe(401);
    const wrongJson = (await wrongRes.json()) as { revalidated: boolean };
    expect(wrongJson.revalidated).toBe(false);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it('POST /api/revalidate purges release-feed tag and returns 200 on valid secret', async () => {
    process.env.REVALIDATE_SECRET = 'prod-revalidate-secret-xyz';

    const validRes = await postRevalidate(
      new Request('http://localhost:3000/api/revalidate', {
        method: 'POST',
        headers: { Authorization: 'Bearer prod-revalidate-secret-xyz' },
      }),
    );

    expect(validRes.status).toBe(200);
    const body = (await validRes.json()) as {
      revalidated: boolean;
      tag: string;
      authMode: string;
      revision: number;
    };

    expect(body.revalidated).toBe(true);
    expect(body.tag).toBe('release-feed');
    expect(body.authMode).toBe('configured-secret');
    expect(body.revision).toBeGreaterThan(1);
    expect(revalidateTag).toHaveBeenCalledWith('release-feed');
  });

  it('POST /api/revalidate supports local-demo-secret outside production but blocks in production', async () => {
    delete process.env.REVALIDATE_SECRET;
    process.env.VERCEL_ENV = 'development';

    const devDemoRes = await postRevalidate(
      new Request('http://localhost:3000/api/revalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'local-demo-secret' }),
      }),
    );
    expect(devDemoRes.status).toBe(200);

    process.env.VERCEL_ENV = 'production';
    const prodUnconfiguredRes = await postRevalidate(
      new Request('https://pulse.example.com/api/revalidate', {
        method: 'POST',
        headers: { Authorization: 'Bearer local-demo-secret' },
      }),
    );
    expect(prodUnconfiguredRes.status).toBe(401);
  });
});
