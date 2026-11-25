import type { Metadata } from 'next';
import Link from 'next/link';
import { headers } from 'next/headers';
import { AlertTriangle, CheckCircle2, Cpu, ExternalLink, Lock, ShieldCheck } from 'lucide-react';
import { AdminGateProbeCard } from '@/components/AdminGateProbeCard';
import { HealthLatencyCard } from '@/components/HealthLatencyCard';
import { inspectEnvironmentVariables, type EnvVarDiagnosticStatus } from '@/lib/env-diagnostics';
import { getNodeRuntimeVersion } from '@/lib/node-runtime';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Deployment Health & Environment Inspector',
};

export default async function StatusPage() {
  const diagnostics = inspectEnvironmentVariables();
  const nodeVersion = getNodeRuntimeVersion();
  const reqHeaders = await headers();

  const activeRuntime = typeof EdgeRuntime === 'string' ? 'Edge (V8 Isolate)' : 'Node.js';
  const middlewareHeader = reqHeaders.get('x-edgepulse-middleware') ?? 'inactive';
  const variantHeader = reqHeaders.get('x-edgepulse-variant') ?? 'A';

  const statusStyles: Record<EnvVarDiagnosticStatus, string> = {
    configured: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
    'fallback-active': 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300',
    'missing-required': 'border-rose-500/40 bg-rose-500/10 text-rose-300',
    'invalid-format': 'border-amber-500/40 bg-amber-500/10 text-amber-300',
    'optional-unset': 'border-slate-700 bg-slate-800/80 text-slate-400',
  };

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <div
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-xs ${
                diagnostics.healthy
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                  : 'border-rose-500/40 bg-rose-500/10 text-rose-300'
              }`}
            >
              {diagnostics.healthy ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />
              )}
              <span>
                {diagnostics.healthy
                  ? 'Environment Validation Passed'
                  : `${diagnostics.summary.missingRequired + diagnostics.summary.invalidFormat} Environment Issue(s) Detected`}
              </span>
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Deployment Health &amp; Environment Inspector
            </h1>
            <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-slate-300">
              Inspects the active server compute runtime, measures live{' '}
              <code className="rounded bg-slate-800 px-1.5 py-0.5 text-xs text-emerald-300">
                /api/health
              </code>{' '}
              latency, and audits required vs optional environment variables while masking sensitive
              secret values.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <Link
              href="/status/admin"
              prefetch={false}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3.5 py-2 text-xs font-medium text-rose-200 transition hover:bg-rose-500/20"
            >
              <Lock className="h-3.5 w-3.5" />
              Open /status/admin Directly (401)
            </Link>
            {diagnostics.stage !== 'production' ? (
              <Link
                href="/status/admin?token=local-admin-token"
                prefetch={false}
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3.5 py-2 text-xs font-medium text-emerald-200 transition hover:bg-emerald-500/20"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open /status/admin (Demo Token)
              </Link>
            ) : null}
          </div>
        </div>

        {/* Runtime Inspector Strip */}
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4">
            <span className="flex items-center gap-1.5 text-xs text-slate-400">
              <Cpu className="h-3.5 w-3.5 text-cyan-400" />
              Active RSC Runtime
            </span>
            <p className="mt-1 font-mono text-base font-semibold text-white">{activeRuntime}</p>
            <p className="mt-0.5 font-mono text-[11px] text-slate-400">
              {process.platform}/{process.arch} · {nodeVersion}
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4">
            <span className="text-xs text-slate-400">Middleware Chain</span>
            <p className="mt-1 font-mono text-base font-semibold text-indigo-300">
              {middlewareHeader} (Variant {variantHeader})
            </p>
            <p className="mt-0.5 font-mono text-[11px] text-slate-400">
              Header: x-edgepulse-middleware
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4">
            <span className="text-xs text-slate-400">Configured Variables</span>
            <p className="mt-1 font-mono text-base font-semibold text-emerald-300">
              {diagnostics.summary.configured} explicit · {diagnostics.summary.fallbackActive}{' '}
              fallback
            </p>
            <p className="mt-0.5 font-mono text-[11px] text-slate-400">
              Stage: {diagnostics.stage}
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4">
            <span className="text-xs text-slate-400">Secret Masking Policy</span>
            <p className="mt-1 font-mono text-base font-semibold text-white">
              Redacted (Zero-Leak)
            </p>
            <p className="mt-0.5 font-mono text-[11px] text-slate-400">
              Secrets never serialized raw
            </p>
          </div>
        </div>
      </section>

      <HealthLatencyCard />

      <AdminGateProbeCard isProductionStage={diagnostics.stage === 'production'} />

      {/* Environment Variable Audit Table */}
      <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50">
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold text-white">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
              Environment Variable Hygiene &amp; Scope Audit
            </h2>
            <p className="text-xs text-slate-400">
              Validates required server secrets, public build-time keys, and Vercel system metadata.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 bg-slate-950/70 font-mono uppercase text-slate-400">
              <tr>
                <th className="px-6 py-3">Variable Key</th>
                <th className="px-6 py-3">Category / Scope</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Safe Value Preview</th>
                <th className="px-6 py-3">Purpose</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 text-slate-200">
              {diagnostics.variables.map((item) => (
                <tr key={item.key} className="hover:bg-slate-900/80">
                  <td className="px-6 py-3.5 font-mono font-semibold text-white">{item.key}</td>
                  <td className="px-6 py-3.5 font-mono text-[11px] text-slate-300">
                    <span className="uppercase">{item.category}</span> · {item.scope}
                  </td>
                  <td className="px-6 py-3.5">
                    <span
                      className={`inline-block rounded-full border px-2.5 py-0.5 font-mono text-[11px] ${statusStyles[item.status]}`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 font-mono text-xs text-slate-300">
                    {item.maskedValue}
                  </td>
                  <td className="px-6 py-3.5 text-slate-400">{item.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

declare const EdgeRuntime: string | undefined;
