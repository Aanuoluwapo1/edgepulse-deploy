export type VercelEnvironmentStage = 'production' | 'preview' | 'development';

export interface DeploymentMetadata {
  appName: string;
  deploymentChannel: string;
  vercelEnv: VercelEnvironmentStage;
  vercelRegion: string;
  commitSha: string;
  shortSha: string;
  commitRef: string;
  deploymentUrl: string;
  isVercelRuntime: boolean;
}

export type EnvVarCategory = 'required' | 'optional' | 'system';
export type EnvVarScope = 'server-secret' | 'server-config' | 'public-build' | 'platform';
export type EnvVarDiagnosticStatus =
  'configured' | 'fallback-active' | 'missing-required' | 'optional-unset';

export interface EnvVarDiagnosticItem {
  key: string;
  category: EnvVarCategory;
  scope: EnvVarScope;
  isSecret: boolean;
  status: EnvVarDiagnosticStatus;
  maskedValue: string;
  description: string;
}

export interface EnvironmentDiagnosticsReport {
  healthy: boolean;
  stage: VercelEnvironmentStage;
  summary: {
    total: number;
    configured: number;
    fallbackActive: number;
    missingRequired: number;
    optionalUnset: number;
  };
  variables: EnvVarDiagnosticItem[];
}

export interface TokenValidationResult {
  authorized: boolean;
  mode: 'configured-secret' | 'local-demo' | 'unconfigured-production';
  reason?: string;
}

export const LOCAL_DEMO_REVALIDATE_SECRET = 'local-demo-secret';
export const LOCAL_DEMO_ADMIN_TOKEN = 'local-admin-token';

type EnvMap = Record<string, string | undefined>;

export function resolveVercelStage(env: EnvMap = process.env): VercelEnvironmentStage {
  const raw = env.VERCEL_ENV?.trim().toLowerCase();
  if (raw === 'production' || raw === 'preview' || raw === 'development') {
    return raw;
  }
  return 'development';
}

export function maskSecretValue(value: string | undefined): string {
  if (!value || value.trim().length === 0) {
    return '(unset)';
  }
  const trimmed = value.trim();
  if (trimmed.length <= 6) {
    return `${'*'.repeat(trimmed.length)} (${trimmed.length} chars)`;
  }
  const prefix = trimmed.slice(0, 2);
  const suffix = trimmed.slice(-2);
  return `${prefix}${'•'.repeat(8)}${suffix} (${trimmed.length} chars)`;
}

export function getDeploymentMetadata(env: EnvMap = process.env): DeploymentMetadata {
  const vercelEnv = resolveVercelStage(env);
  const isVercelRuntime = Boolean(env.VERCEL === '1' || env.VERCEL_ENV || env.VERCEL_REGION);
  const commitSha = env.VERCEL_GIT_COMMIT_SHA?.trim() || 'local-working-tree-0000000';
  const shortSha = commitSha.startsWith('local-') ? 'local-dev' : commitSha.slice(0, 7);

  return {
    appName: env.NEXT_PUBLIC_APP_NAME?.trim() || 'EdgePulse Deploy',
    deploymentChannel: env.NEXT_PUBLIC_DEPLOYMENT_CHANNEL?.trim() || 'local-observability',
    vercelEnv,
    vercelRegion: env.VERCEL_REGION?.trim() || 'local-dev1',
    commitSha,
    shortSha,
    commitRef: env.VERCEL_GIT_COMMIT_REF?.trim() || 'local/head',
    deploymentUrl: env.VERCEL_URL ? `https://${env.VERCEL_URL.trim()}` : 'http://localhost:3000',
    isVercelRuntime,
  };
}

function timingSafeStringEqual(left: string, right: string): boolean {
  const maxLen = Math.max(left.length, right.length);
  let mismatch = left.length ^ right.length;
  for (let i = 0; i < maxLen; i += 1) {
    const leftChar = i < left.length ? left.charCodeAt(i) : 0;
    const rightChar = i < right.length ? right.charCodeAt(i) : 0;
    mismatch |= leftChar ^ rightChar;
  }
  return mismatch === 0;
}

export function validateRevalidateToken(
  providedToken: string | null | undefined,
  env: EnvMap = process.env,
): TokenValidationResult {
  const candidate = providedToken?.trim() ?? '';
  const configuredSecret = env.REVALIDATE_SECRET?.trim();
  const stage = resolveVercelStage(env);

  if (configuredSecret && configuredSecret.length > 0) {
    if (!candidate) {
      return {
        authorized: false,
        mode: 'configured-secret',
        reason: 'Missing revalidation token',
      };
    }
    const matches = timingSafeStringEqual(candidate, configuredSecret);
    return matches
      ? { authorized: true, mode: 'configured-secret' }
      : {
          authorized: false,
          mode: 'configured-secret',
          reason: 'Invalid revalidation token',
        };
  }

  if (stage === 'production') {
    return {
      authorized: false,
      mode: 'unconfigured-production',
      reason: 'REVALIDATE_SECRET is not configured in production',
    };
  }

  if (!candidate) {
    return {
      authorized: false,
      mode: 'local-demo',
      reason: 'Missing token (use local-demo-secret in non-production demo mode)',
    };
  }

  const matchesDemo = timingSafeStringEqual(candidate, LOCAL_DEMO_REVALIDATE_SECRET);
  return matchesDemo
    ? { authorized: true, mode: 'local-demo' }
    : {
        authorized: false,
        mode: 'local-demo',
        reason: 'Invalid token for local demo mode',
      };
}

export function validateAdminToken(
  providedToken: string | null | undefined,
  env: EnvMap = process.env,
): TokenValidationResult {
  const candidate = providedToken?.trim() ?? '';
  const configuredSecret = env.EDGEPULSE_ADMIN_TOKEN?.trim();
  const stage = resolveVercelStage(env);

  if (configuredSecret && configuredSecret.length > 0) {
    if (!candidate) {
      return {
        authorized: false,
        mode: 'configured-secret',
        reason: 'Missing x-edgepulse-admin-token credential',
      };
    }
    return timingSafeStringEqual(candidate, configuredSecret)
      ? { authorized: true, mode: 'configured-secret' }
      : {
          authorized: false,
          mode: 'configured-secret',
          reason: 'Invalid admin token',
        };
  }

  if (stage === 'production') {
    return {
      authorized: false,
      mode: 'unconfigured-production',
      reason: 'EDGEPULSE_ADMIN_TOKEN is not configured in production',
    };
  }

  if (!candidate) {
    return {
      authorized: false,
      mode: 'local-demo',
      reason: 'Missing admin token (use local-admin-token in non-production demo mode)',
    };
  }

  return timingSafeStringEqual(candidate, LOCAL_DEMO_ADMIN_TOKEN)
    ? { authorized: true, mode: 'local-demo' }
    : {
        authorized: false,
        mode: 'local-demo',
        reason: 'Invalid admin token',
      };
}

interface EnvVarSpec {
  key: string;
  category: EnvVarCategory;
  scope: EnvVarScope;
  isSecret: boolean;
  allowLocalFallback: boolean;
  fallbackLabel?: string;
  description: string;
}

const ENV_SPECIFICATIONS: readonly EnvVarSpec[] = [
  {
    key: 'NEXT_PUBLIC_APP_NAME',
    category: 'required',
    scope: 'public-build',
    isSecret: false,
    allowLocalFallback: true,
    fallbackLabel: 'EdgePulse Deploy (default)',
    description: 'Browser-exposed application identifier embedded at Next.js build time.',
  },
  {
    key: 'REVALIDATE_SECRET',
    category: 'required',
    scope: 'server-secret',
    isSecret: true,
    allowLocalFallback: true,
    fallbackLabel: 'local-demo-secret (non-prod demo)',
    description: 'Server-only bearer token authorizing POST /api/revalidate cache invalidation.',
  },
  {
    key: 'EDGEPULSE_ADMIN_TOKEN',
    category: 'required',
    scope: 'server-secret',
    isSecret: true,
    allowLocalFallback: true,
    fallbackLabel: 'local-admin-token (non-prod demo)',
    description: 'Edge Middleware token gating access to /status/admin diagnostics.',
  },
  {
    key: 'NEXT_PUBLIC_DEPLOYMENT_CHANNEL',
    category: 'optional',
    scope: 'public-build',
    isSecret: false,
    allowLocalFallback: false,
    description: 'Optional release ring label surfaced in UI telemetry headers.',
  },
  {
    key: 'OBSERVABILITY_WEBHOOK_URL',
    category: 'optional',
    scope: 'server-secret',
    isSecret: true,
    allowLocalFallback: false,
    description: 'Optional webhook endpoint for post-deploy synthetic alert forwarding.',
  },
  {
    key: 'LOG_SAMPLING_RATE',
    category: 'optional',
    scope: 'server-config',
    isSecret: false,
    allowLocalFallback: false,
    description: 'Optional server-side structured trace sampling ratio between 0.0 and 1.0.',
  },
  {
    key: 'VERCEL_ENV',
    category: 'system',
    scope: 'platform',
    isSecret: false,
    allowLocalFallback: true,
    fallbackLabel: 'development (local fallback)',
    description: 'Vercel system target stage: production, preview, or development.',
  },
  {
    key: 'VERCEL_REGION',
    category: 'system',
    scope: 'platform',
    isSecret: false,
    allowLocalFallback: true,
    fallbackLabel: 'local-dev1 (local fallback)',
    description: 'Execution compute region identifier (e.g., iad1, sfo1, fra1).',
  },
  {
    key: 'VERCEL_GIT_COMMIT_SHA',
    category: 'system',
    scope: 'platform',
    isSecret: false,
    allowLocalFallback: true,
    fallbackLabel: 'local-working-tree-0000000',
    description: 'Git commit SHA associated with the active deployment artifact.',
  },
];

export function inspectEnvironmentVariables(
  env: EnvMap = process.env,
): EnvironmentDiagnosticsReport {
  const stage = resolveVercelStage(env);
  let configured = 0;
  let fallbackActive = 0;
  let missingRequired = 0;
  let optionalUnset = 0;

  const variables: EnvVarDiagnosticItem[] = ENV_SPECIFICATIONS.map((spec) => {
    const rawValue = env[spec.key]?.trim();
    const hasValue = Boolean(rawValue && rawValue.length > 0);

    if (hasValue) {
      configured += 1;
      return {
        key: spec.key,
        category: spec.category,
        scope: spec.scope,
        isSecret: spec.isSecret,
        status: 'configured',
        maskedValue: spec.isSecret ? maskSecretValue(rawValue) : (rawValue as string),
        description: spec.description,
      };
    }

    if (spec.category === 'required') {
      if (stage !== 'production' && spec.allowLocalFallback) {
        fallbackActive += 1;
        return {
          key: spec.key,
          category: spec.category,
          scope: spec.scope,
          isSecret: spec.isSecret,
          status: 'fallback-active',
          maskedValue: spec.isSecret
            ? maskSecretValue(
                spec.key === 'REVALIDATE_SECRET'
                  ? LOCAL_DEMO_REVALIDATE_SECRET
                  : LOCAL_DEMO_ADMIN_TOKEN,
              )
            : (spec.fallbackLabel ?? '(fallback)'),
          description: spec.description,
        };
      }
      missingRequired += 1;
      return {
        key: spec.key,
        category: spec.category,
        scope: spec.scope,
        isSecret: spec.isSecret,
        status: 'missing-required',
        maskedValue: '(missing in production)',
        description: spec.description,
      };
    }

    if (spec.category === 'system') {
      fallbackActive += 1;
      return {
        key: spec.key,
        category: spec.category,
        scope: spec.scope,
        isSecret: false,
        status: 'fallback-active',
        maskedValue: spec.fallbackLabel ?? '(local fallback)',
        description: spec.description,
      };
    }

    optionalUnset += 1;
    return {
      key: spec.key,
      category: spec.category,
      scope: spec.scope,
      isSecret: spec.isSecret,
      status: 'optional-unset',
      maskedValue: '(not set)',
      description: spec.description,
    };
  });

  return {
    healthy: missingRequired === 0,
    stage,
    summary: {
      total: variables.length,
      configured,
      fallbackActive,
      missingRequired,
      optionalUnset,
    },
    variables,
  };
}
