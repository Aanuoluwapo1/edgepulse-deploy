import { NextResponse, type NextRequest } from 'next/server';
import { resolveVercelStage, validateAdminToken } from '@/lib/env-diagnostics';

export type ExperimentVariant = 'A' | 'B';

export const VARIANT_COOKIE_NAME = 'edgepulse_variant';

export function resolveExperimentVariant(
  queryVariant: string | null | undefined,
  cookieVariant: string | null | undefined,
): { variant: ExperimentVariant; fromQueryOverride: boolean } {
  const normalizedQuery = queryVariant?.trim().toUpperCase();
  if (normalizedQuery === 'A' || normalizedQuery === 'B') {
    return { variant: normalizedQuery, fromQueryOverride: true };
  }

  const normalizedCookie = cookieVariant?.trim().toUpperCase();
  if (normalizedCookie === 'A' || normalizedCookie === 'B') {
    return { variant: normalizedCookie, fromQueryOverride: false };
  }

  return { variant: 'A', fromQueryOverride: false };
}

function extractAdminToken(request: NextRequest): string | null {
  const headerToken = request.headers.get('x-edgepulse-admin-token');
  if (headerToken) {
    return headerToken;
  }

  const authHeader = request.headers.get('authorization');
  if (authHeader?.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice(7).trim();
  }

  // Allow query token override only outside production for interactive browser demos
  if (resolveVercelStage() !== 'production') {
    const queryToken = request.nextUrl.searchParams.get('token');
    if (queryToken) {
      return queryToken;
    }
  }

  return null;
}

export function middleware(request: NextRequest): NextResponse {
  const queryVariant = request.nextUrl.searchParams.get('variant');
  const cookieVariant = request.cookies.get(VARIANT_COOKIE_NAME)?.value;
  const { variant, fromQueryOverride } = resolveExperimentVariant(queryVariant, cookieVariant);
  const traceId = request.headers.get('x-vercel-id') ?? `ep-${crypto.randomUUID().slice(0, 12)}`;

  const pathname = request.nextUrl.pathname;
  if (pathname === '/status/admin' || pathname.startsWith('/status/admin/')) {
    const providedToken = extractAdminToken(request);
    const authCheck = validateAdminToken(providedToken);

    if (!authCheck.authorized) {
      const deniedResponse = NextResponse.json(
        {
          status: 'forbidden',
          error: authCheck.reason ?? 'Unauthorized access to /status/admin',
          path: pathname,
          requiredHeader: 'x-edgepulse-admin-token',
          hint:
            authCheck.mode === 'local-demo'
              ? 'Pass header `x-edgepulse-admin-token: local-admin-token` or `?token=local-admin-token` in local dev.'
              : 'Provide a valid `x-edgepulse-admin-token` header matching EDGEPULSE_ADMIN_TOKEN.',
        },
        { status: 401 },
      );
      deniedResponse.headers.set('x-edgepulse-middleware', 'active');
      deniedResponse.headers.set('x-edgepulse-variant', variant);
      deniedResponse.headers.set('x-edgepulse-trace-id', traceId);
      return deniedResponse;
    }
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-edgepulse-middleware', 'active');
  requestHeaders.set('x-edgepulse-variant', variant);
  requestHeaders.set('x-edgepulse-trace-id', traceId);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  response.headers.set('x-edgepulse-middleware', 'active');
  response.headers.set('x-edgepulse-variant', variant);
  response.headers.set('x-edgepulse-trace-id', traceId);

  if (fromQueryOverride) {
    response.cookies.set(VARIANT_COOKIE_NAME, variant, {
      path: '/',
      httpOnly: false,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
    });
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
