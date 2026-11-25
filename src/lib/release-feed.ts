import { unstable_cache } from 'next/cache';
import { getDeploymentMetadata } from '@/lib/env-diagnostics';

export const RELEASE_FEED_CACHE_TAG = 'release-feed';
export const RELEASE_FEED_REVALIDATE_SECONDS = 60;

export interface ReleaseNoteEntry {
  id: string;
  version: string;
  title: string;
  channel: 'stable' | 'canary' | 'security';
  summary: string;
  regionRollout: string;
  publishedOffsetMinutes: number;
}

export interface ReleaseFeedPayload {
  cacheTag: string;
  revalidateWindowSeconds: number;
  generatedAt: string;
  revision: number;
  source: 'fetch-data-cache' | 'unstable-cache-fallback';
  environment: string;
  region: string;
  commitShortSha: string;
  entries: ReleaseNoteEntry[];
}

declare global {
  var __edgepulseReleaseRevision: number | undefined;
}

export function getReleaseFeedRevision(): number {
  if (typeof globalThis.__edgepulseReleaseRevision !== 'number') {
    globalThis.__edgepulseReleaseRevision = 1;
  }
  return globalThis.__edgepulseReleaseRevision;
}

export function incrementReleaseFeedRevision(): number {
  const next = getReleaseFeedRevision() + 1;
  globalThis.__edgepulseReleaseRevision = next;
  return next;
}

const BASE_RELEASE_ENTRIES: readonly ReleaseNoteEntry[] = [
  {
    id: 'rel-2026-11-edge-headers',
    version: 'v2.8.4',
    title: 'Zero-Downtime Edge Variant Routing & Sticky Experiment Cookies',
    channel: 'stable',
    summary:
      'Added deterministic A/B request header propagation (`x-edgepulse-variant`) before CDN cache lookup with query-string override support.',
    regionRollout: 'Global Anycast -> iad1, sfo1, fra1',
    publishedOffsetMinutes: 14,
  },
  {
    id: 'rel-2026-11-isr-tags',
    version: 'v2.8.3',
    title: 'Granular Tag-Based Cache Invalidation (`release-feed`)',
    channel: 'canary',
    summary:
      'Migrated path-wide revalidation to targeted `revalidateTag` purges, keeping unrelated static routes warm across global edge PoPs.',
    regionRollout: 'All Vercel Edge PoPs (<300ms purge propagation)',
    publishedOffsetMinutes: 95,
  },
  {
    id: 'rel-2026-11-hsts-headers',
    version: 'v2.8.2',
    title: 'Hardened Security Headers & Prebuilt CI Smoke Gate',
    channel: 'security',
    summary:
      'Enforced HSTS, X-Frame-Options DENY, nosniff, and automated `/api/health` post-deploy verification in GitHub Actions.',
    regionRollout: 'Production + Preview Branches',
    publishedOffsetMinutes: 260,
  },
];

export function createReleaseFeedSnapshot(
  source: ReleaseFeedPayload['source'] = 'fetch-data-cache',
): ReleaseFeedPayload {
  const meta = getDeploymentMetadata();
  const revision = getReleaseFeedRevision();
  const nowIso = new Date().toISOString();

  return {
    cacheTag: RELEASE_FEED_CACHE_TAG,
    revalidateWindowSeconds: RELEASE_FEED_REVALIDATE_SECONDS,
    generatedAt: nowIso,
    revision,
    source,
    environment: meta.vercelEnv,
    region: meta.vercelRegion,
    commitShortSha: meta.shortSha,
    entries: BASE_RELEASE_ENTRIES.map((entry, idx) =>
      idx === 0 && revision > 1
        ? {
            ...entry,
            title: `${entry.title} (Purge #${revision - 1})`,
          }
        : entry,
    ),
  };
}

const getFallbackCachedFeed = unstable_cache(
  async (): Promise<ReleaseFeedPayload> => createReleaseFeedSnapshot('unstable-cache-fallback'),
  ['edgepulse-release-feed-snapshot'],
  {
    tags: [RELEASE_FEED_CACHE_TAG],
    revalidate: RELEASE_FEED_REVALIDATE_SECONDS,
  },
);

function resolveInternalOrigin(): string | null {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, '')}`;
  }
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return null;
  }
  const port = process.env.PORT || '3000';
  return `http://127.0.0.1:${port}`;
}

export async function fetchTaggedReleaseFeed(): Promise<ReleaseFeedPayload> {
  const origin = resolveInternalOrigin();

  if (origin) {
    try {
      const response = await fetch(`${origin}/api/release-feed`, {
        next: {
          tags: [RELEASE_FEED_CACHE_TAG],
          revalidate: RELEASE_FEED_REVALIDATE_SECONDS,
        },
      });
      if (response.ok) {
        const data = (await response.json()) as ReleaseFeedPayload;
        return data;
      }
    } catch {
      // During static prerender or isolated offline execution without a bound port,
      // fall back to Next.js Data Cache tagged with the identical `release-feed` tag.
    }
  }

  return getFallbackCachedFeed();
}
