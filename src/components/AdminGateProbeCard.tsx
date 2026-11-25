'use client';

import { useState } from 'react';
import { CheckCircle2, Lock, ShieldAlert, Unlock } from 'lucide-react';
import { LOCAL_DEMO_ADMIN_TOKEN } from '@/lib/env-diagnostics';

interface GateProbeResult {
  httpStatus: number;
  latencyMs: number;
  middlewareHeader: string;
  preview: string;
}

export function AdminGateProbeCard({ isProductionStage }: { isProductionStage: boolean }) {
  const [adminToken, setAdminToken] = useState<string>(
    isProductionStage ? '' : LOCAL_DEMO_ADMIN_TOKEN,
  );
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GateProbeResult | null>(null);

  async function probeAdminGate(sendToken: boolean) {
    setLoading(true);
    const start = performance.now();
    try {
      const headers: Record<string, string> = {};
      if (sendToken && adminToken.trim()) {
        headers['x-edgepulse-admin-token'] = adminToken.trim();
      }
      const res = await fetch('/status/admin', {
        method: 'GET',
        headers,
        cache: 'no-store',
      });
      const latencyMs = Math.round((performance.now() - start) * 10) / 10;
      const contentType = res.headers.get('content-type') ?? '';
      let preview = '';
      if (contentType.includes('application/json')) {
        const json = (await res.json()) as Record<string, unknown>;
        preview = JSON.stringify(json, null, 2);
      } else {
        preview = 'Authorized HTML response rendered by ProtectedAdminStatusPage (/status/admin).';
      }
      setResult({
        httpStatus: res.status,
        latencyMs,
        middlewareHeader: res.headers.get('x-edgepulse-middleware') ?? 'inactive',
        preview,
      });
    } catch (err) {
      setResult({
        httpStatus: 500,
        latencyMs: Math.round((performance.now() - start) * 10) / 10,
        middlewareHeader: 'error',
        preview: err instanceof Error ? err.message : 'Request failed',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-white">
            <Lock className="h-4 w-4 text-amber-400" />
            Edge Middleware Auth Gate Verifier (
            <code className="text-sm text-amber-300">/status/admin</code>)
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Test pre-render request interception using the{' '}
            <code className="text-slate-300">x-edgepulse-admin-token</code> header without leaving
            this inspector.
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="password"
          aria-label="x-edgepulse-admin-token value"
          value={adminToken}
          onChange={(e) => setAdminToken(e.target.value)}
          placeholder={
            isProductionStage
              ? 'Enter EDGEPULSE_ADMIN_TOKEN to test 200 pass-through'
              : 'local-admin-token'
          }
          className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-xs text-slate-100 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none"
        />

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={loading}
            onClick={() => void probeAdminGate(false)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3.5 py-2 text-xs font-medium text-rose-200 transition hover:bg-rose-500/20 disabled:opacity-50"
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            Probe Without Token (401)
          </button>

          <button
            type="button"
            disabled={loading || !adminToken.trim()}
            onClick={() => void probeAdminGate(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-3.5 py-2 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-500/25 disabled:opacity-50"
          >
            <Unlock className="h-3.5 w-3.5" />
            Probe With Header Token
          </button>
        </div>
      </div>

      {result ? (
        <div
          className={`mt-4 rounded-lg border p-3.5 text-xs ${
            result.httpStatus === 200
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
              : 'border-amber-500/40 bg-amber-500/10 text-amber-200'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 font-mono">
            <span className="inline-flex items-center gap-1.5 font-semibold">
              {result.httpStatus === 200 ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              ) : (
                <ShieldAlert className="h-4 w-4 text-amber-400" />
              )}
              HTTP {result.httpStatus} · x-edgepulse-middleware: {result.middlewareHeader}
            </span>
            <span>{result.latencyMs} ms</span>
          </div>
          <pre className="mt-2 overflow-x-auto rounded bg-slate-950/80 p-2.5 font-mono text-[11px] text-slate-200">
            {result.preview}
          </pre>
        </div>
      ) : null}
    </div>
  );
}
