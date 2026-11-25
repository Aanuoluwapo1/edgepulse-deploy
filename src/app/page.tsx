import Link from 'next/link';
import {
  ArrowRight,
  Clock,
  Cpu,
  GitCommit,
  Globe,
  Layers,
  RefreshCw,
  Server,
  Shield,
  Zap,
} from 'lucide-react';
import { RuntimeProbePanel } from '@/components/RuntimeProbePanel';
import { getDeploymentMetadata } from '@/lib/env-diagnostics';
import { getNodeRuntimeVersion } from '@/lib/node-runtime';

interface StrategyCard {
  code: 'SSG' | 'ISR' | 'SSR' | 'EDGE';
  title: string;
  subtitle: string;
  computeModel: string;
  cacheBehavior: string;
  ttfbProfile: string;
  idealWorkloads: string;
  liveDemoRoute: string;
  liveDemoLabel: string;
  accentClass: string;
}

const RENDERING_STRATEGIES: readonly StrategyCard[] = [
  {
    code: 'SSG',
    title: 'Static Site Generation',
    subtitle: 'Build-time HTML & RSC payload pre-computation',
    computeModel: 'Executed once during next build; zero origin compute at request time.',
    cacheBehavior: 'Immutable CDN Edge cache across all global PoPs until next deployment.',
    ttfbProfile: '5–20 ms global CDN cache hit',
    idealWorkloads: 'Architecture overviews, marketing landing pages, docs, public runbooks.',
    liveDemoRoute: '/',
    liveDemoLabel: 'Current Route (Static ○)',
    accentClass: 'border-cyan-500/30 bg-cyan-500/5 text-cyan-300',
  },
  {
    code: 'ISR',
    title: 'Incremental Static Regeneration',
    subtitle: 'Stale-while-revalidate + on-demand tag invalidation',
    computeModel: 'Serves cached HTML immediately; regenerates in background or via revalidateTag.',
    cacheBehavior: 'Vercel Data Cache tagged (release-feed) with sub-300ms global purge.',
    ttfbProfile: '10–25 ms cache hit; zero cold-start penalty for readers',
    idealWorkloads: 'Release feeds, CMS articles, product catalogs, pricing tables.',
    liveDemoRoute: '/isr-lab',
    liveDemoLabel: 'Open ISR Cache Lab',
    accentClass: 'border-indigo-500/30 bg-indigo-500/5 text-indigo-300',
  },
  {
    code: 'SSR',
    title: 'Dynamic Server Rendering',
    subtitle: 'Per-request Node.js Fluid Compute execution',
    computeModel: 'Full Node.js runtime (process, TCP sockets, native SDKs) per incoming request.',
    cacheBehavior: 'Cache-Control: no-store when reading headers(), cookies(), or live health.',
    ttfbProfile: '35–120 ms regional compute (co-located near data store)',
    idealWorkloads: 'Authenticated dashboards, live environment inspectors, transactional APIs.',
    liveDemoRoute: '/status',
    liveDemoLabel: 'Open Status Inspector',
    accentClass: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-300',
  },
  {
    code: 'EDGE',
    title: 'Edge Runtime & Middleware',
    subtitle: 'Web-standard V8 isolates & pre-cache request routing',
    computeModel: 'Lightweight WinterCG Web APIs (Request, Response, crypto, performance).',
    cacheBehavior: 'Middleware executes before CDN cache lookup to inject headers or gate routes.',
    ttfbProfile: '<5 ms middleware overhead at nearest PoP',
    idealWorkloads: 'A/B variant cookies, header injection, token gates, geo-header inspection.',
    liveDemoRoute: '/api/edge-probe',
    liveDemoLabel: 'Inspect /api/edge-probe JSON',
    accentClass: 'border-amber-500/30 bg-amber-500/5 text-amber-300',
  },
];

export default function HomePage() {
  const meta = getDeploymentMetadata();
  const nodeVersion = getNodeRuntimeVersion();
  const builtAt = new Date().toISOString();

  return (
    <div className="space-y-8">
      {/* Hero & Live Runtime Telemetry Banner */}
      <section className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900/95 to-slate-950 p-6 shadow-xl sm:p-8">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div className="max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 font-mono text-xs text-cyan-300">
              <Zap className="h-3.5 w-3.5" />
              <span>Vercel Edge Routing · Rendering Strategy · CI/CD Observability</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              EdgePulse Deployment &amp; Rendering Architecture
            </h1>
            <p className="text-sm leading-relaxed text-slate-300 sm:text-base">
              End-to-end Next.js App Router reference platform comparing{' '}
              <span className="font-semibold text-white">SSG</span>,{' '}
              <span className="font-semibold text-white">ISR</span> (
              <code className="rounded bg-slate-800/90 px-1.5 py-0.5 text-xs text-indigo-300">
                revalidateTag
              </code>
              ), <span className="font-semibold text-white">Dynamic Node.js SSR</span>, and{' '}
              <span className="font-semibold text-white">Edge Runtime / Middleware</span> execution
              with live platform metadata and safe local development fallbacks.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/isr-lab"
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-indigo-400"
            >
              <RefreshCw className="h-4 w-4" />
              Launch ISR Cache Lab
            </Link>
            <Link
              href="/status"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-sm font-semibold text-slate-100 transition hover:border-slate-600 hover:bg-slate-800"
            >
              <Shield className="h-4 w-4 text-emerald-400" />
              Inspect Health &amp; Env
            </Link>
          </div>
        </div>

        {/* Platform Metadata Strip */}
        <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-800/90 bg-slate-950/70 p-4">
            <div className="flex items-center justify-between font-mono text-xs text-slate-400">
              <span>VERCEL_ENV</span>
              <Server className="h-4 w-4 text-cyan-400" />
            </div>
            <p className="mt-1.5 font-mono text-lg font-semibold uppercase text-white">
              {meta.vercelEnv}
            </p>
            <p className="mt-0.5 font-mono text-[11px] text-slate-400">
              {meta.isVercelRuntime ? 'Vercel Managed Runtime' : 'Local Safe Fallback Mode'}
            </p>
          </div>

          <div className="rounded-xl border border-slate-800/90 bg-slate-950/70 p-4">
            <div className="flex items-center justify-between font-mono text-xs text-slate-400">
              <span>VERCEL_REGION</span>
              <Globe className="h-4 w-4 text-indigo-400" />
            </div>
            <p className="mt-1.5 font-mono text-lg font-semibold text-white">{meta.vercelRegion}</p>
            <p className="mt-0.5 font-mono text-[11px] text-slate-400">
              Node {nodeVersion} · {meta.deploymentChannel}
            </p>
          </div>

          <div className="rounded-xl border border-slate-800/90 bg-slate-950/70 p-4">
            <div className="flex items-center justify-between font-mono text-xs text-slate-400">
              <span>VERCEL_GIT_COMMIT_SHA</span>
              <GitCommit className="h-4 w-4 text-emerald-400" />
            </div>
            <p className="mt-1.5 truncate font-mono text-lg font-semibold text-white">
              {meta.shortSha}
            </p>
            <p
              className="mt-0.5 truncate font-mono text-[11px] text-slate-400"
              title={meta.commitSha}
            >
              ref: {meta.commitRef}
            </p>
          </div>

          <div className="rounded-xl border border-slate-800/90 bg-slate-950/70 p-4">
            <div className="flex items-center justify-between font-mono text-xs text-slate-400">
              <span>EDGE MIDDLEWARE</span>
              <Cpu className="h-4 w-4 text-amber-400" />
            </div>
            <p className="mt-1.5 font-mono text-lg font-semibold text-white">
              x-edgepulse-middleware
            </p>
            <p className="mt-0.5 truncate font-mono text-[11px] text-slate-400">
              Variant A|B + /status/admin gate
            </p>
          </div>
        </div>
      </section>

      {/* Rendering Strategy Cards */}
      <section className="space-y-4">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-semibold text-white">
              <Layers className="h-5 w-5 text-cyan-400" />
              Rendering &amp; Compute Strategy Comparison
            </h2>
            <p className="text-sm text-slate-400">
              Choose the right Next.js App Router rendering primitive per route based on data
              freshness, latency budget, and Node.js API requirements.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 font-mono text-xs text-slate-400">
            <Clock className="h-3.5 w-3.5 text-slate-500" />
            SSG Prerendered: {builtAt}
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {RENDERING_STRATEGIES.map((strategy) => (
            <article
              key={strategy.code}
              className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-900/60 p-5 transition hover:border-slate-700"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`rounded-md border px-2.5 py-0.5 font-mono text-xs font-semibold ${strategy.accentClass}`}
                  >
                    {strategy.code}
                  </span>
                  <span className="font-mono text-xs text-slate-400">{strategy.ttfbProfile}</span>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-white">{strategy.title}</h3>
                  <p className="text-xs text-slate-400">{strategy.subtitle}</p>
                </div>

                <dl className="space-y-2 border-t border-slate-800/80 pt-3 text-xs">
                  <div>
                    <dt className="font-semibold text-slate-300">Compute Model</dt>
                    <dd className="text-slate-400">{strategy.computeModel}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-300">Cache Semantics</dt>
                    <dd className="text-slate-400">{strategy.cacheBehavior}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-300">Best Fit</dt>
                    <dd className="text-slate-400">{strategy.idealWorkloads}</dd>
                  </div>
                </dl>
              </div>

              <div className="mt-4 border-t border-slate-800/80 pt-3">
                <Link
                  href={strategy.liveDemoRoute}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-400 transition hover:text-cyan-300"
                >
                  <span>{strategy.liveDemoLabel}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Tradeoff Decision Matrix Table */}
      <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50">
        <div className="border-b border-slate-800 px-6 py-4">
          <h2 className="text-base font-semibold text-white">
            Platform Primitives Matrix (<code className="text-sm text-cyan-300">vercel.json</code> +
            Next.js App Router)
          </h2>
          <p className="text-xs text-slate-400">
            How requests flow through Vercel Edge Network headers, Middleware, Cache, and Route
            Handlers in this project.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 bg-slate-950/60 font-mono uppercase text-slate-400">
              <tr>
                <th className="px-6 py-3">Layer / Route</th>
                <th className="px-6 py-3">Runtime</th>
                <th className="px-6 py-3">Cache / Invalidation</th>
                <th className="px-6 py-3">Security &amp; Headers</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 text-slate-300">
              <tr>
                <td className="px-6 py-3 font-mono text-cyan-300">src/middleware.ts</td>
                <td className="px-6 py-3">Edge Middleware</td>
                <td className="px-6 py-3">Pre-cache interception on matched routes</td>
                <td className="px-6 py-3">
                  Injects <code>x-edgepulse-middleware</code>, <code>x-edgepulse-variant</code>,
                  gates <code>/status/admin</code>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-3 font-mono text-indigo-300">/isr-lab</td>
                <td className="px-6 py-3">Node.js RSC + Data Cache</td>
                <td className="px-6 py-3">
                  <code>tags: [&apos;release-feed&apos;]</code>, <code>revalidate: 60</code>
                </td>
                <td className="px-6 py-3">
                  Purged via authenticated <code>POST /api/revalidate</code>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-3 font-mono text-emerald-300">/api/health (/healthz)</td>
                <td className="px-6 py-3">Node.js Fluid Compute</td>
                <td className="px-6 py-3">
                  <code>Cache-Control: no-store, max-age=0</code>
                </td>
                <td className="px-6 py-3">
                  Redirected from <code>/healthz</code> in <code>vercel.json</code>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-3 font-mono text-amber-300">/api/edge-probe</td>
                <td className="px-6 py-3">
                  <code>runtime = &apos;edge&apos;</code>
                </td>
                <td className="px-6 py-3">
                  <code>Cache-Control: no-store, max-age=0</code>
                </td>
                <td className="px-6 py-3">
                  Echoes <code>x-vercel-id</code>, <code>x-vercel-ip-country</code> &amp; isolate
                  timing
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Live Interactive Probe */}
      <RuntimeProbePanel />
    </div>
  );
}
