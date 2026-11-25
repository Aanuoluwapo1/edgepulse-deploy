'use client';

import { useState } from 'react';
import { Activity, Globe, Play, Sparkles } from 'lucide-react';
import { VARIANT_CHANGE_EVENT } from '@/components/MiddlewareVariantPill';

interface ProbeSnapshot {
  endpoint: string;
  httpStatus: number;
  roundTripMs: number;
  middlewareHeader: string;
  variantHeader: string;
  payload: Record<string, unknown>;
}

export function RuntimeProbePanel() {
  const [nodeProbe, setNodeProbe] = useState<ProbeSnapshot | null>(null);
  const [edgeProbe, setEdgeProbe] = useState<ProbeSnapshot | null>(null);
  const [loadingTarget, setLoadingTarget] = useState<'both' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function runSingleProbe(url: string): Promise<ProbeSnapshot> {
    const start = performance.now();
    const res = await fetch(url, { cache: 'no-store' });
    const roundTripMs = Math.round((performance.now() - start) * 10) / 10;
    const payload = (await res.json()) as Record<string, unknown>;
    return {
      endpoint: url,
      httpStatus: res.status,
      roundTripMs,
      middlewareHeader: res.headers.get('x-edgepulse-middleware') ?? 'not-present',
      variantHeader: res.headers.get('x-edgepulse-variant') ?? 'A',
      payload,
    };
  }

  async function handleRunBoth(variantOverride?: 'A' | 'B') {
    setLoadingTarget('both');
    setErrorMessage(null);
    try {
      const suffix = variantOverride ? `?variant=${variantOverride}` : '';
      const [nodeResult, edgeResult] = await Promise.all([
        runSingleProbe(`/api/health${suffix}`),
        runSingleProbe(`/api/edge-probe${suffix}`),
      ]);
      setNodeProbe(nodeResult);
      setEdgeProbe(edgeResult);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent(VARIANT_CHANGE_EVENT, {
            detail: edgeResult.variantHeader,
          }),
        );
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to execute runtime probes');
    } finally {
      setLoadingTarget(null);
    }
  }

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-800 pb-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
            <Sparkles className="h-5 w-5 text-cyan-400" />
            Interactive Node.js vs Edge Runtime Probe
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Execute live requests through Edge Middleware into both compute runtimes and inspect
            injected observability headers.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void handleRunBoth()}
            disabled={loadingTarget !== null}
            className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-3.5 py-2 text-xs font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-50"
          >
            <Play className="h-3.5 w-3.5" />
            {loadingTarget ? 'Probing...' : 'Probe Both Runtimes'}
          </button>
          <button
            type="button"
            onClick={() => void handleRunBoth('A')}
            disabled={loadingTarget !== null}
            className="rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 font-mono text-xs text-slate-200 transition hover:border-cyan-500/50 hover:text-white disabled:opacity-50"
          >
            Force ?variant=A
          </button>
          <button
            type="button"
            onClick={() => void handleRunBoth('B')}
            disabled={loadingTarget !== null}
            className="rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 font-mono text-xs text-slate-200 transition hover:border-indigo-500/50 hover:text-white disabled:opacity-50"
          >
            Force ?variant=B
          </button>
        </div>
      </div>

      {errorMessage ? (
        <div className="mt-4 rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-200">
          {errorMessage}
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-4">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-300">
              <Activity className="h-4 w-4" />
              GET /api/health (Node.js Runtime)
            </span>
            {nodeProbe ? (
              <span className="rounded bg-emerald-500/15 px-2 py-0.5 font-mono text-xs text-emerald-300">
                {nodeProbe.httpStatus} · {nodeProbe.roundTripMs} ms
              </span>
            ) : (
              <span className="font-mono text-xs text-slate-500">Idle</span>
            )}
          </div>
          {nodeProbe ? (
            <div className="mt-3 space-y-2">
              <div className="flex flex-wrap gap-2 font-mono text-[11px] text-slate-300">
                <span className="rounded border border-slate-800 bg-slate-900 px-2 py-0.5">
                  x-edgepulse-middleware: {nodeProbe.middlewareHeader}
                </span>
                <span className="rounded border border-slate-800 bg-slate-900 px-2 py-0.5">
                  x-edgepulse-variant: {nodeProbe.variantHeader}
                </span>
              </div>
              <pre className="max-h-52 overflow-auto rounded-md border border-slate-800/80 bg-slate-900/90 p-3 font-mono text-xs text-slate-200">
                {JSON.stringify(nodeProbe.payload, null, 2)}
              </pre>
            </div>
          ) : (
            <p className="mt-3 text-xs text-slate-400">
              Click <span className="font-semibold text-slate-200">Probe Both Runtimes</span> to
              inspect live Node.js health metadata, process uptime, and commit SHA.
            </p>
          )}
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-4">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-300">
              <Globe className="h-4 w-4" />
              GET /api/edge-probe (Edge Runtime)
            </span>
            {edgeProbe ? (
              <span className="rounded bg-indigo-500/15 px-2 py-0.5 font-mono text-xs text-indigo-300">
                {edgeProbe.httpStatus} · {edgeProbe.roundTripMs} ms
              </span>
            ) : (
              <span className="font-mono text-xs text-slate-500">Idle</span>
            )}
          </div>
          {edgeProbe ? (
            <div className="mt-3 space-y-2">
              <div className="flex flex-wrap gap-2 font-mono text-[11px] text-slate-300">
                <span className="rounded border border-slate-800 bg-slate-900 px-2 py-0.5">
                  x-edgepulse-middleware: {edgeProbe.middlewareHeader}
                </span>
                <span className="rounded border border-slate-800 bg-slate-900 px-2 py-0.5">
                  x-edgepulse-variant: {edgeProbe.variantHeader}
                </span>
              </div>
              <pre className="max-h-52 overflow-auto rounded-md border border-slate-800/80 bg-slate-900/90 p-3 font-mono text-xs text-slate-200">
                {JSON.stringify(edgeProbe.payload, null, 2)}
              </pre>
            </div>
          ) : (
            <p className="mt-3 text-xs text-slate-400">
              Click <span className="font-semibold text-slate-200">Probe Both Runtimes</span> to
              inspect echoed Vercel geo/request headers (
              <code className="text-slate-300">x-vercel-id</code>,{' '}
              <code className="text-slate-300">x-vercel-ip-country</code>) and isolate timing.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
