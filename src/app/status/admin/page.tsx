import Link from 'next/link';
import { headers } from 'next/headers';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { getDeploymentMetadata } from '@/lib/env-diagnostics';

export const dynamic = 'force-dynamic';

export default async function ProtectedAdminStatusPage() {
  const reqHeaders = await headers();
  const meta = getDeploymentMetadata();

  return (
    <div className="mx-auto max-w-3xl space-y-6 rounded-2xl border border-emerald-500/30 bg-slate-900/70 p-6 sm:p-8">
      <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 font-mono text-xs text-emerald-300">
        <ShieldCheck className="h-4 w-4" />
        <span>Middleware Gate Authorized (x-edgepulse-admin-token)</span>
      </div>

      <h1 className="text-2xl font-bold text-white">Protected Deployment Admin Gate</h1>
      <p className="text-sm leading-relaxed text-slate-300">
        Your request passed{' '}
        <code className="rounded bg-slate-800 px-1.5 py-0.5 text-xs text-cyan-300">
          src/middleware.ts
        </code>{' '}
        token validation before reaching this Next.js Server Component. Unauthenticated requests to{' '}
        <code className="rounded bg-slate-800 px-1.5 py-0.5 text-xs text-amber-300">
          /status/admin
        </code>{' '}
        are short-circuited at the Edge with an HTTP <code className="text-rose-300">401</code> JSON
        payload.
      </p>

      <dl className="grid gap-3 rounded-xl border border-slate-800 bg-slate-950/80 p-4 font-mono text-xs sm:grid-cols-2">
        <div>
          <dt className="text-slate-400">x-edgepulse-middleware</dt>
          <dd className="mt-1 text-emerald-300">
            {reqHeaders.get('x-edgepulse-middleware') ?? 'active'}
          </dd>
        </div>
        <div>
          <dt className="text-slate-400">x-edgepulse-variant</dt>
          <dd className="mt-1 text-indigo-300">{reqHeaders.get('x-edgepulse-variant') ?? 'A'}</dd>
        </div>
        <div>
          <dt className="text-slate-400">x-edgepulse-trace-id</dt>
          <dd className="mt-1 text-slate-200">{reqHeaders.get('x-edgepulse-trace-id') ?? 'n/a'}</dd>
        </div>
        <div>
          <dt className="text-slate-400">Deployment Stage / Region</dt>
          <dd className="mt-1 text-slate-200">
            {meta.vercelEnv} / {meta.vercelRegion}
          </dd>
        </div>
      </dl>

      <Link
        href="/status"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-400 hover:text-cyan-300"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Deployment Status Inspector
      </Link>
    </div>
  );
}
