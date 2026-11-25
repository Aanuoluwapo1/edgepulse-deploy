import { NextResponse } from 'next/server';
import { getDeploymentMetadata } from '@/lib/env-diagnostics';
import { getNodeRuntimeVersion } from '@/lib/node-runtime';

export async function GET(): Promise<NextResponse> {
  try {
    const metadata = getDeploymentMetadata();

    return NextResponse.json(
      {
        status: 'ok',
        service: 'edgepulse-deploy',
        runtime: 'nodejs',
        nodeVersion: getNodeRuntimeVersion(),
        environment: metadata.vercelEnv,
        region: metadata.vercelRegion,
        commitSha: metadata.commitSha,
        shortSha: metadata.shortSha,
        commitRef: metadata.commitRef,
        isVercelRuntime: metadata.isVercelRuntime,
        uptimeSeconds: Math.round(process.uptime() * 100) / 100,
        timestamp: new Date().toISOString(),
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      },
    );
  } catch (error) {
    console.error('[edgepulse-deploy] GET /api/health failed:', error);
    return NextResponse.json(
      {
        status: 'error',
        service: 'edgepulse-deploy',
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
