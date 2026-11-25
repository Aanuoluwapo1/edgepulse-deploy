'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, KeyRound, RefreshCw, ShieldAlert } from 'lucide-react';
import { LOCAL_DEMO_REVALIDATE_SECRET } from '@/lib/env-diagnostics';

interface RevalidateResult {
  httpStatus: number;
  latencyMs: number;
  body: {
    revalidated?: boolean;
    tag?: string;
    authMode?: string;
    revision?: number;
    revalidatedAt?: string;
    error?: string;
  };
}

export function RevalidateControls({ isProductionStage }: { isProductionStage: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [tokenInput, setTokenInput] = useState<string>(
    isProductionStage ? '' : LOCAL_DEMO_REVALIDATE_SECRET,
  );
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<RevalidateResult | null>(null);

  async function triggerRevalidation(overrideToken?: string) {
    const tokenToSend = overrideToken !== undefined ? overrideToken : tokenInput;
    setSubmitting(true);
    const start = performance.now();

    try {
      const response = await fetch('/api/revalidate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(tokenToSend ? { Authorization: `Bearer ${tokenToSend}` } : {}),
        },
        body: JSON.stringify({ token: tokenToSend }),
      });

      const latencyMs = Math.round((performance.now() - start) * 10) / 10;
      const body = (await response.json()) as RevalidateResult['body'];
      setResult({
        httpStatus: response.status,
        latencyMs,
        body,
      });

      if (response.ok) {
        startTransition(() => {
          router.refresh();
        });
      }
    } catch (err) {
      setResult({
        httpStatus: 500,
        latencyMs: Math.round((performance.now() - start) * 10) / 10,
        body: {
          revalidated: false,
          error: err instanceof Error ? err.message : 'Network failure calling /api/revalidate',
        },
      });
    } finally {
      setSubmitting(false);
    }
  }

  const busy = submitting || isPending;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
            <KeyRound className="h-5 w-5 text-indigo-400" />
            On-Demand Cache Purge Trigger (`POST /api/revalidate`)
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Validates `Authorization: Bearer &lt;token&gt;` against `REVALIDATE_SECRET` (or
            `local-demo-secret` outside production) and executes
            `revalidateTag(&apos;release-feed&apos;)`.
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <div>
          <label
            htmlFor="revalidate-token-input"
            className="block font-mono text-xs text-slate-300"
          >
            Bearer Token / REVALIDATE_SECRET
          </label>
          <input
            id="revalidate-token-input"
            type="text"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            placeholder="Enter REVALIDATE_SECRET or local-demo-secret"
            className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-xs text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            disabled={busy}
            onClick={() => void triggerRevalidation()}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-indigo-400 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${busy ? 'animate-spin' : ''}`} />
            {busy ? 'Purging Cache Tag...' : 'Purge release-feed Cache'}
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={() => void triggerRevalidation('invalid-tampered-token')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3.5 py-2 text-xs font-medium text-rose-200 transition hover:bg-rose-500/20 disabled:opacity-50"
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            Test Invalid Token (Expect 401)
          </button>
        </div>
      </div>

      {result ? (
        <div
          className={`mt-4 rounded-lg border p-3.5 text-xs ${
            result.httpStatus === 200
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
              : 'border-rose-500/40 bg-rose-500/10 text-rose-200'
          }`}
        >
          <div className="flex items-center justify-between font-mono">
            <span className="inline-flex items-center gap-1.5 font-semibold">
              {result.httpStatus === 200 ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              ) : (
                <ShieldAlert className="h-4 w-4 text-rose-400" />
              )}
              HTTP {result.httpStatus}
            </span>
            <span>{result.latencyMs} ms</span>
          </div>
          <pre className="mt-2 overflow-x-auto rounded bg-slate-950/80 p-2.5 font-mono text-[11px] text-slate-200">
            {JSON.stringify(result.body, null, 2)}
          </pre>
        </div>
      ) : null}
    </div>
  );
}
