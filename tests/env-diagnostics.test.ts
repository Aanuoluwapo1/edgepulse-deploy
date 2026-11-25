import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { inspectEnvironmentVariables, maskSecretValue } from '@/lib/env-diagnostics';
import { createReleaseFeedSnapshot } from '@/lib/release-feed';

describe('Environment Diagnostics & vercel.json Platform Contract', () => {
  it('generates unique snapshotId and clean prose on release feed snapshots', () => {
    const snap = createReleaseFeedSnapshot('fetch-data-cache');
    expect(snap.snapshotId).toMatch(/^snap-[a-z0-9]+$/);
    expect(snap.entries.every((e) => !e.title.includes('`') && !e.summary.includes('`'))).toBe(
      true,
    );
  });

  it('classifies non-NEXT_PUBLIC server config as server-config and validates LOG_SAMPLING_RATE range', () => {
    const report = inspectEnvironmentVariables({ VERCEL_ENV: 'development' });
    const logSampling = report.variables.find((v) => v.key === 'LOG_SAMPLING_RATE');
    expect(logSampling?.scope).toBe('server-config');

    const validRateReport = inspectEnvironmentVariables({
      VERCEL_ENV: 'development',
      LOG_SAMPLING_RATE: '0.25',
    });
    expect(validRateReport.healthy).toBe(true);
    expect(validRateReport.summary.invalidFormat).toBe(0);
    expect(validRateReport.variables.find((v) => v.key === 'LOG_SAMPLING_RATE')?.status).toBe(
      'configured',
    );

    const invalidRateReport = inspectEnvironmentVariables({
      VERCEL_ENV: 'development',
      LOG_SAMPLING_RATE: '2.5',
    });
    expect(invalidRateReport.healthy).toBe(false);
    expect(invalidRateReport.summary.invalidFormat).toBe(1);
    expect(invalidRateReport.variables.find((v) => v.key === 'LOG_SAMPLING_RATE')?.status).toBe(
      'invalid-format',
    );
  });
  it('masks secret values without leaking raw credentials', () => {
    expect(maskSecretValue(undefined)).toBe('(unset)');
    expect(maskSecretValue('short')).toBe('***** (5 chars)');

    const rawSecret = 'super-sensitive-prod-secret-998877';
    const masked = maskSecretValue(rawSecret);
    expect(masked).not.toContain('sensitive');
    expect(masked).toContain('su••••••••77');
    expect(masked).toContain('34 chars');
  });

  it('flags missing required secrets in production while keeping local dev healthy via fallbacks', () => {
    const devReport = inspectEnvironmentVariables({
      VERCEL_ENV: 'development',
    });
    expect(devReport.healthy).toBe(true);
    expect(devReport.summary.missingRequired).toBe(0);

    const prodMissingReport = inspectEnvironmentVariables({
      VERCEL_ENV: 'production',
      NEXT_PUBLIC_APP_NAME: 'EdgePulse Deploy',
    });
    expect(prodMissingReport.healthy).toBe(false);
    expect(prodMissingReport.summary.missingRequired).toBe(2);

    const prodHealthySecret = 'top-secret-revalidate-token-2026';
    const prodAdminSecret = 'top-secret-admin-gate-token-2026';
    const prodConfiguredReport = inspectEnvironmentVariables({
      VERCEL_ENV: 'production',
      VERCEL_REGION: 'iad1',
      VERCEL_GIT_COMMIT_SHA: 'abcdef1234567890abcdef1234567890abcdef12',
      NEXT_PUBLIC_APP_NAME: 'EdgePulse Deploy',
      REVALIDATE_SECRET: prodHealthySecret,
      EDGEPULSE_ADMIN_TOKEN: prodAdminSecret,
    });

    expect(prodConfiguredReport.healthy).toBe(true);
    const serialized = JSON.stringify(prodConfiguredReport);
    expect(serialized).not.toContain(prodHealthySecret);
    expect(serialized).not.toContain(prodAdminSecret);
  });

  it('validates vercel.json security headers, /healthz redirect, and static cache rules', () => {
    const vercelJsonPath = path.resolve(process.cwd(), 'vercel.json');
    const raw = fs.readFileSync(vercelJsonPath, 'utf-8');
    const parsed = JSON.parse(raw) as {
      redirects: Array<{ source: string; destination: string }>;
      headers: Array<{ source: string; headers: Array<{ key: string; value: string }> }>;
      regions: string[];
    };

    expect(parsed.regions).toContain('iad1');
    expect(
      parsed.redirects.some((r) => r.source === '/healthz' && r.destination === '/api/health'),
    ).toBe(true);

    const globalHeaderRule = parsed.headers.find((h) => h.source === '/(.*)');
    expect(globalHeaderRule).toBeDefined();
    const headerKeys = globalHeaderRule?.headers.map((h) => h.key) ?? [];
    expect(headerKeys).toEqual(
      expect.arrayContaining([
        'X-Content-Type-Options',
        'X-Frame-Options',
        'Referrer-Policy',
        'Strict-Transport-Security',
      ]),
    );

    const staticAssetRule = parsed.headers.find((h) => h.source === '/_next/static/(.*)');
    expect(staticAssetRule?.headers[0]?.value).toContain('immutable');
  });
});
