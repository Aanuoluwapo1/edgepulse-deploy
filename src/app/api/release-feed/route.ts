import { NextResponse } from 'next/server';
import { createReleaseFeedSnapshot } from '@/lib/release-feed';

export async function GET(): Promise<NextResponse> {
  try {
    const payload = createReleaseFeedSnapshot('fetch-data-cache');
    return NextResponse.json(payload, {
      status: 200,
    });
  } catch (error) {
    console.error('[edgepulse-deploy] GET /api/release-feed failed:', error);
    return NextResponse.json({ error: 'Failed to generate release feed' }, { status: 500 });
  }
}
