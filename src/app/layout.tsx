import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '@/components/Navbar';
import { getDeploymentMetadata } from '@/lib/env-diagnostics';

export const metadata: Metadata = {
  title: {
    default: 'EdgePulse Deploy — Vercel Routing, Rendering & Observability Showcase',
    template: '%s | EdgePulse Deploy',
  },
  description:
    'Production-grade Next.js App Router showcase demonstrating SSG, ISR with revalidateTag, Dynamic SSR, Edge Runtime probes, Middleware routing, and Vercel CI/CD automation.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const deployMeta = getDeploymentMetadata();

  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500..800&family=JetBrains+Mono:wght@400;500;600&family=Space+Grotesk:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="flex min-h-screen flex-col">
        <Navbar />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </main>
        <footer className="border-t border-slate-800/80 bg-slate-950/90 py-6 text-xs text-slate-400">
          <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-3 px-4 sm:flex-row sm:items-center sm:px-6 lg:px-8">
            <p>
              <span className="font-display font-semibold text-slate-200">edgepulse-deploy</span> —
              Next.js App Router + Vercel Platform Primitives Showcase
            </p>
            <div className="flex flex-wrap items-center gap-4 font-mono">
              <span>env: {deployMeta.vercelEnv}</span>
              <span>region: {deployMeta.vercelRegion}</span>
              <span>sha: {deployMeta.shortSha}</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
