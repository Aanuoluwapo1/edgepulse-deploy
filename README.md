# EdgePulse Deploy (`edgepulse-deploy`)

**Live Production URL:** https://edgepulse-deploy.vercel.app

**Vercel Edge Routing, Rendering Strategy & Deployment Observability Showcase** built with **Next.js (App Router)** and **TypeScript**.

## Highlights

- **Rendering & Compute Architecture (`/`)** — Side-by-side comparison of `SSG`, `ISR`, `Dynamic SSR`, and `Edge Runtime` execution with live `VERCEL_ENV`, `VERCEL_REGION`, `VERCEL_GIT_COMMIT_SHA` telemetry (with clean local fallbacks) and an interactive dual-runtime browser probe.
- **ISR Cache & On-Demand Revalidation Lab (`/isr-lab`)** — Server-rendered release feed cached via Next.js Data Cache tags (`tags: ['release-feed']`) with an interactive client trigger calling `POST /api/revalidate` (`revalidateTag('release-feed')`).
- **Deployment Health & Environment Inspector (`/status`)** — Audits required, optional, and platform environment variables with zero-leak secret masking, active runtime inspection, and live `/api/health` round-trip latency measurements.
- **Route Handlers (`src/app/api/`)** —
  - `GET /api/health` — Node.js health telemetry (`200 OK`, commit SHA, uptime, stage).
  - `GET /api/edge-probe` — Edge Runtime (`export const runtime = 'edge'`) header echo (`x-vercel-id`, `x-vercel-ip-country`) and sub-millisecond timing.
  - `POST /api/revalidate` — Token-authenticated cache tag invalidation (`401` on invalid token, `200` on purge).
- **Edge Middleware & Platform Config** —
  - `src/middleware.ts` injects `x-edgepulse-middleware: active`, sticky/override `x-edgepulse-variant: A|B`, and gates `/status/admin`.
  - `vercel.json` configures HSTS & security headers, `/healthz` -> `/api/health` redirects, immutable static asset caching, and explicit function regions/durations.
- **CI/CD & Operations Runbook** —
  - `.github/workflows/ci.yml` & `.github/workflows/vercel-deploy.yml` (`vercel pull`, `vercel build`, `vercel deploy --prebuilt` + `/api/health` smoke test).
  - [`docs/vercel-runbook.md`](./docs/vercel-runbook.md) covering env scoping, promotion/rollback, DNS/SSL, and 5 production troubleshooting scenarios.

## Quick Start

```bash
cp .env.example .env.local
npm install
npm run dev
```

## Verification Suite

```bash
npx tsc --noEmit
npm run lint
npm test
npm run build
```
