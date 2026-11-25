import type { Metadata } from 'next';
import { Clock, Database, RefreshCw, Tag, Terminal } from 'lucide-react';
import { RevalidateControls } from '@/components/RevalidateControls';
import { resolveVercelStage } from '@/lib/env-diagnostics';
import { fetchTaggedReleaseFeed } from '@/lib/release-feed';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'ISR Cache & On-Demand Revalidation Lab',
};

export default async function IsrLabPage() {
  const feed = await fetchTaggedReleaseFeed();
  const isProductionStage = resolveVercelStage() === 'production';

  const channelBadge: Record<string, string> = {
    stable: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
    canary: 'border-indigo-500/40 bg-indigo-500/10 text-indigo-300',
    security: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  };

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 font-mono text-xs text-indigo-300">
          <Tag className="h-3.5 w-3.5" />
          <span>Data Cache Tag: {feed.cacheTag}</span>
        </div>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">
          ISR Cache &amp; On-Demand `revalidateTag` Lab
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-300">
          This route renders release notes cached with Next.js Data Cache tags (
          <code className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-xs text-indigo-300">
            next: &#123; tags: [&apos;release-feed&apos;], revalidate: 60 &#125;
          </code>
          ). Reloading the page serves the cached snapshot timestamp until the 60-second background
          window elapses or you trigger an authenticated on-demand purge below.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4">
            <span className="flex items-center gap-1.5 text-xs text-slate-400">
              <Clock className="h-3.5 w-3.5 text-indigo-400" />
              Cached Snapshot Timestamp
            </span>
            <p className="mt-1.5 font-mono text-sm font-semibold text-white">{feed.generatedAt}</p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4">
            <span className="flex items-center gap-1.5 text-xs text-slate-400">
              <RefreshCw className="h-3.5 w-3.5 text-cyan-400" />
              Feed Revision Counter
            </span>
            <p className="mt-1.5 font-mono text-lg font-semibold text-cyan-300">
              Revision #{feed.revision}
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4">
            <span className="flex items-center gap-1.5 text-xs text-slate-400">
              <Database className="h-3.5 w-3.5 text-emerald-400" />
              Cache Adapter Source
            </span>
            <p className="mt-1.5 font-mono text-sm font-semibold text-emerald-300">{feed.source}</p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4">
            <span className="text-xs text-slate-400">TTL Revalidation Window</span>
            <p className="mt-1.5 font-mono text-lg font-semibold text-white">
              {feed.revalidateWindowSeconds}s + On-Demand
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-7">
          <h2 className="text-lg font-semibold text-white">
            Server-Rendered Release Notes (`tags: [&apos;release-feed&apos;]`)
          </h2>
          {feed.entries.map((entry) => (
            <article
              key={entry.id}
              className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 transition hover:border-slate-700"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-white">{entry.version}</span>
                  <span
                    className={`rounded-full border px-2.5 py-0.5 font-mono text-[11px] uppercase ${channelBadge[entry.channel] ?? channelBadge.stable}`}
                  >
                    {entry.channel}
                  </span>
                </div>
                <span className="font-mono text-xs text-slate-400">{entry.regionRollout}</span>
              </div>
              <h3 className="mt-2 text-base font-semibold text-slate-100">{entry.title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-300">{entry.summary}</p>
              <div className="mt-3 flex items-center justify-between border-t border-slate-800/80 pt-2.5 font-mono text-[11px] text-slate-400">
                <span>Cached at: {feed.generatedAt}</span>
                <span>Commit: {feed.commitShortSha}</span>
              </div>
            </article>
          ))}
        </div>

        <div className="space-y-6 lg:col-span-5">
          <RevalidateControls isProductionStage={isProductionStage} />

          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
              <Terminal className="h-4 w-4 text-cyan-400" />
              Webhook / CLI Purge Example
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              Trigger tag invalidation from a CMS webhook or GitHub Actions release job:
            </p>
            <pre className="mt-3 overflow-x-auto rounded-lg border border-slate-800 bg-slate-950 p-3 font-mono text-[11px] text-slate-200">
              {`curl -X POST http://localhost:3000/api/revalidate \\
  -H "Authorization: Bearer $REVALIDATE_SECRET" \\
  -H "Content-Type: application/json"`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
