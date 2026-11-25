'use client';

import { useCallback, useEffect, useState } from 'react';
import { Activity, RefreshCw } from 'lucide-react';

interface LiveHealthState {
  status: string;
  httpCode: number;
  latencyMs: number;
  environment: string;
  region: string;
  commitSha: string;
  nodeVersion: string;
  timestamp: string;
}

export function HealthLatencyCard() {
  const [health, setHealth] = useState<LiveHealthState | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const runHealthCheck = useCallback(async () => {
    setLoading(true);
    setError(null);
    const start = performance.now();
    try {
      const res = await fetch('/api/health', { cache: 'no-store' });
      const latencyMs = Math.round((performance.now() - start) * 10) / 10;
      const json = (await res.json()) as {
        status?: string;
        environment?: string;
        region?: string;
        shortSha?: string;
        nodeVersion?: string;
        timestamp?: string;
      };
      setHealth({
        status: json.status ?? 'unknown',
        httpCode: res.status,
        latencyMs,
        environment: json.environment ?? 'development',
        region: json.region ?? 'local-dev1',
        commitSha: json.shortSha ?? 'local-dev',
        nodeVersion: json.nodeVersion ?? 'unknown',
        timestamp: json.timestamp ?? new Date().toISOString(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reach /api/health');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void runHealthCheck();
  }, [runHealthCheck]);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-400">
            <Activity className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-white">
              Live Endpoint Telemetry (`GET /api/health`)
            </h2>
            <p className="text-xs text-slate-400">
              Measured browser-to-origin round-trip latency and structured health status.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void runHealthCheck()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-emerald-500/50 hover:text-white disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Re-measure Latency
        </button>
      </div>

      {error ? (
        <div className="mt-4 rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-200">
          {error}
        </div>
      ) : null}

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-3.5">
          <span className="text-xs text-slate-400">HTTP Health Status</span>
          <p className="mt-1 font-mono text-lg font-semibold text-emerald-400">
            {health ? `${health.httpCode} ${health.status.toUpperCase()}` : 'Measuring...'}
          </p>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-3.5">
          <span className="text-xs text-slate-400">Round-Trip Latency</span>
          <p className="mt-1 font-mono text-lg font-semibold text-cyan-300">
            {health ? `${health.latencyMs} ms` : '—'}
          </p>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-3.5">
          <span className="text-xs text-slate-400">Active Runtime / Region</span>
          <p className="mt-1 font-mono text-sm font-semibold text-white">
            {health ? `Node ${health.nodeVersion} · ${health.region}` : '—'}
          </p>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-3.5">
          <span className="text-xs text-slate-400">Server Timestamp</span>
          <p className="mt-1 truncate font-mono text-xs font-semibold text-slate-200">
            {health ? health.timestamp : '—'}
          </p>
        </div>
      </div>
    </div>
  );
}
