import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { validateRevalidateToken } from '@/lib/env-diagnostics';
import { incrementReleaseFeedRevision, RELEASE_FEED_CACHE_TAG } from '@/lib/release-feed';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
} as const;

async function extractCandidateToken(request: Request): Promise<string | null> {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.toLowerCase().startsWith('bearer ')) {
    const bearer = authHeader.slice(7).trim();
    if (bearer) {
      return bearer;
    }
  }

  const customHeader = request.headers.get('x-revalidate-token')?.trim();
  if (customHeader) {
    return customHeader;
  }

  const contentType = request.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    try {
      const body = (await request.json()) as { token?: unknown };
      if (typeof body.token === 'string' && body.token.trim().length > 0) {
        return body.token.trim();
      }
    } catch {
      return null;
    }
  }

  return null;
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const providedToken = await extractCandidateToken(request);
    const validation = validateRevalidateToken(providedToken);

    if (!validation.authorized) {
      return NextResponse.json(
        {
          revalidated: false,
          tag: RELEASE_FEED_CACHE_TAG,
          authMode: validation.mode,
          error: validation.reason ?? 'Unauthorized revalidation request',
        },
        { status: 401, headers: NO_STORE_HEADERS },
      );
    }

    const nextRevision = incrementReleaseFeedRevision();

    try {
      revalidateTag(RELEASE_FEED_CACHE_TAG);
    } catch (cacheError) {
      // When invoked in standalone unit tests outside a Next.js incrementalCache request store,
      // log only unexpected errors while keeping route handler unit-testable.
      const message = cacheError instanceof Error ? cacheError.message : String(cacheError);
      if (!message.includes('static generation store') && !message.includes('incrementalCache')) {
        throw cacheError;
      }
    }

    return NextResponse.json(
      {
        revalidated: true,
        tag: RELEASE_FEED_CACHE_TAG,
        authMode: validation.mode,
        revision: nextRevision,
        revalidatedAt: new Date().toISOString(),
      },
      { status: 200, headers: NO_STORE_HEADERS },
    );
  } catch (error) {
    console.error('[edgepulse-deploy] POST /api/revalidate failed:', error);
    return NextResponse.json(
      {
        revalidated: false,
        error: 'Internal error while purging cache tag',
      },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }
}
