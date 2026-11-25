import Link from 'next/link';
import { Activity, Cpu, Layers, Lock, RefreshCw, ShieldCheck } from 'lucide-react';
import { MiddlewareVariantPill } from '@/components/MiddlewareVariantPill';
import { getDeploymentMetadata } from '@/lib/env-diagnostics';

export function Navbar() {
  const meta = getDeploymentMetadata();

  const stageStyles: Record<string, string> = {
    production: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
    preview: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
    development: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300',
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3.5 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <Link href="/" className="group flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-500/40 bg-cyan-500/10 text-cyan-400 transition group-hover:border-cyan-400 group-hover:bg-cyan-500/20">
              <Activity className="h-5 w-5" />
            </span>
            <div>
              <span className="font-display block text-sm font-bold tracking-tight text-white">
                {meta.appName}
              </span>
              <span className="block font-mono text-[11px] text-slate-400">
                Vercel Edge &amp; Runtime Observability
              </span>
            </div>
          </Link>
        </div>

        <nav aria-label="Primary" className="flex flex-wrap items-center gap-1.5 text-sm">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium text-slate-300 transition hover:bg-slate-800/70 hover:text-white"
          >
            <Layers className="h-4 w-4 text-cyan-400" />
            <span>Architecture</span>
          </Link>
          <Link
            href="/isr-lab"
            className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium text-slate-300 transition hover:bg-slate-800/70 hover:text-white"
          >
            <RefreshCw className="h-4 w-4 text-indigo-400" />
            <span>ISR Lab</span>
          </Link>
          <Link
            href="/status"
            className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium text-slate-300 transition hover:bg-slate-800/70 hover:text-white"
          >
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span>Status &amp; Env</span>
          </Link>
          <Link
            href="/status/admin"
            prefetch={false}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-800 bg-slate-900/70 px-2.5 py-1.5 text-xs font-medium text-slate-400 transition hover:border-amber-500/40 hover:text-amber-200"
          >
            <Lock className="h-3.5 w-3.5 text-amber-400" />
            <span>Admin Gate</span>
          </Link>
        </nav>

        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          <span
            className={`rounded-full border px-2.5 py-0.5 uppercase tracking-wider ${stageStyles[meta.vercelEnv] ?? stageStyles.development}`}
          >
            {meta.vercelEnv}
          </span>
          <span className="hidden items-center gap-1 rounded-full border border-slate-800 bg-slate-900 px-2.5 py-0.5 text-slate-300 sm:inline-flex">
            <Cpu className="h-3.5 w-3.5 text-slate-400" />
            {meta.vercelRegion}
          </span>
          <MiddlewareVariantPill />
        </div>
      </div>
    </header>
  );
}
