export const runtime = 'edge';

export async function GET(request: Request): Promise<Response> {
  const startedAt = performance.now();

  try {
    const headers = request.headers;
    const vercelId = headers.get('x-vercel-id') || 'local::dev1::edge-simulated';
    const ipCountry = headers.get('x-vercel-ip-country') || 'LOCAL';
    const ipRegion = headers.get('x-vercel-ip-country-region') || 'DEV';
    const ipCity = headers.get('x-vercel-ip-city') || 'Localhost';
    const middlewareState = headers.get('x-edgepulse-middleware') || 'bypassed-direct';
    const experimentVariant = headers.get('x-edgepulse-variant') || 'A';
    const vercelRegion = process.env.VERCEL_REGION || 'edge-local';
    const vercelEnv = process.env.VERCEL_ENV || 'development';

    const executionTimeMs = Number((performance.now() - startedAt).toFixed(3));

    return Response.json(
      {
        status: 'ok',
        runtime: 'edge',
        environment: vercelEnv,
        computeRegion: vercelRegion,
        echoedHeaders: {
          'x-vercel-id': vercelId,
          'x-vercel-ip-country': ipCountry,
          'x-vercel-ip-country-region': ipRegion,
          'x-vercel-ip-city': ipCity,
          'x-edgepulse-middleware': middlewareState,
          'x-edgepulse-variant': experimentVariant,
        },
        timing: {
          executionTimeMs,
          timestamp: new Date().toISOString(),
        },
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, max-age=0',
          'x-edgepulse-runtime': 'edge',
        },
      },
    );
  } catch (error) {
    console.error('[edgepulse-deploy] GET /api/edge-probe failed:', error);
    return Response.json(
      {
        status: 'error',
        runtime: 'edge',
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
