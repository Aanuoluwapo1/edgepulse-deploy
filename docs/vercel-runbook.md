# Vercel Operations & Deployment Runbook — `edgepulse-deploy`

This engineering runbook documents environment variable governance, CI/CD promotion mechanics, custom domain DNS & TLS setup, and production troubleshooting procedures for **`edgepulse-deploy`**.

---

## 1. Environment Variable Scoping & Secret Hygiene

### 1.1 Vercel Environment Scopes

Vercel isolates configuration across three primary deployment targets (plus optional Git branch overrides):

| Scope             | When Injected                                 | Secret Policy & Guidance                                                                                                                                                                   |
| :---------------- | :-------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`Production`**  | Pushes to `main` or `vercel deploy --prod`    | Use unique, high-entropy credentials (`REVALIDATE_SECRET`, `EDGEPULSE_ADMIN_TOKEN`). Enable **Separate Production Secret Values** so production secrets cannot be shared with Preview/Dev. |
| **`Preview`**     | Feature branch pushes & Pull Requests         | Point to isolated staging/preview webhooks and non-production tokens. Scope branch-specific overrides with `vercel env add KEY preview --git-branch=staging`.                              |
| **`Development`** | `vercel dev` and `vercel env pull .env.local` | Developer-safe sandbox credentials. Never copy production secrets into `.env.local`.                                                                                                       |

### 1.2 Variable Visibility Types & `NEXT_PUBLIC_` Rules

1. **Server-Only Secrets (`Secret` type):**
   - Keys without `NEXT_PUBLIC_` (`REVALIDATE_SECRET`, `EDGEPULSE_ADMIN_TOKEN`, `OBSERVABILITY_WEBHOOK_URL`) are only accessible on the server (Route Handlers, Server Components, and Middleware).
   - Store them as **Secret** (`vercel env add REVALIDATE_SECRET production --type secret < secret.txt`) so values cannot be read back via dashboard or `vercel env pull` for Production/Preview.
   - Avoid `echo "secret" | vercel env add` or `--token` CLI flags, which leak credentials into shell history and OS process tables.
2. **Browser-Safe Config (`Config` type / `NEXT_PUBLIC_*`):**
   - Keys prefixed with `NEXT_PUBLIC_` (`NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_DEPLOYMENT_CHANNEL`) are **statically inlined into client JavaScript bundles at `next build` time**.
   - **Never** place tokens, API keys, or internal URLs in `NEXT_PUBLIC_*` variables.
3. **Zero-Leak Inspection (`/status`):**
   - `src/lib/env-diagnostics.ts` validates required vs. optional variables and masks secret values (`re••••••••et (26 chars)`) so `/status` can verify configuration completeness without exposing secret plaintext.

### 1.3 Local Developer Bootstrap

```bash
# Link workspace to the Vercel project
vercel link --yes

# Pull Development environment variables into .env.local (gitignored)
vercel env pull .env.local --yes
```

---

## 2. Branch-Based Preview Deployments & Git CI/CD Promotion Flow

### 2.1 Architecture of the Prebuilt CI/CD Pipeline

`edgepulse-deploy` separates verification from deployment across two workflows in `.github/workflows/`:

1. **Continuous Integration (`ci.yml`):**
   - Triggered on every `push` and `pull_request`.
   - Enforces strict TypeScript (`npx tsc --noEmit`), zero-warning linting (`npm run lint`), automated unit/route tests (`npm test`), and a clean Next.js production build (`npm run build`).
2. **Prebuilt Vercel Deployment (`vercel-deploy.yml`):**
   - Uses `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` stored in GitHub Actions Secrets.
   - Executes deterministic prebuilt deployments so the exact artifact compiled in CI is uploaded to Vercel without rebuilding remotely:
     ```bash
     # Preview (Pull Requests)
     vercel pull --yes --environment=preview
     vercel build
     DEPLOY_URL=$(vercel deploy --prebuilt)

     # Production (Pushes to main)
     vercel pull --yes --environment=production
     vercel build --prod
     DEPLOY_URL=$(vercel deploy --prebuilt --prod)
     ```
   - Runs an automated HTTP smoke check against `${DEPLOY_URL}/api/health` verifying HTTP `200` and `{"status":"ok"}`.

### 2.2 Safe Production Promotion & Instant Rollback

- **Staged Production Promotion (Zero-Rebuild):**
  To run extended synthetic or Playwright E2E checks against a production build _before_ shifting live domain traffic:

  ```bash
  # 1. Deploy production artifact without assigning production domain aliases
  STAGED_URL=$(vercel deploy --prebuilt --prod --skip-domain)

  # 2. Validate health and ISR routes against $STAGED_URL
  curl -fsSL "${STAGED_URL}/api/health"

  # 3. Atomically assign production domains (no rebuild)
  vercel promote "${STAGED_URL}" --yes
  ```

  > **Important:** Always promote a staged `--prod` deployment rather than promoting a Preview deployment. Promoting a Preview deployment triggers a rebuild with Production environment variables, invalidating build-artifact parity.

- **Emergency Instant Rollback:**
  ```bash
  # Inspect recent deployments
  vercel ls

  # Instantly re-point production alias to a known-good deployment ID/URL
  vercel rollback <previous-production-deployment-url> --yes
  ```
  _(Note: Rolling back pauses automatic domain assignment on subsequent pushes until `vercel promote` re-enables normal progression.)_

---

## 3. Custom Domain DNS Configuration & SSL Certificate Verification

### 3.1 Attaching Domains & DNS Records

Add custom domains via **Project Settings -> Domains** or `vercel domains add pulse.example.com`:

| Domain Type                                | Host / Name     | Record Type | Target / Value          | Notes                                                                                       |
| :----------------------------------------- | :-------------- | :---------- | :---------------------- | :------------------------------------------------------------------------------------------ |
| **Apex / Root Domain** (`example.com`)     | `@`             | `A`         | `76.76.21.21`           | Vercel Anycast IPv4 edge VIP (or project-assigned IP shown in Dashboard).                   |
| **Subdomain** (`pulse.example.com`, `www`) | `pulse` / `www` | `CNAME`     | `cname.vercel-dns.com.` | Prefer the project-specific `*.vercel-dns-017.com` target if displayed in Project Settings. |

- **Proxy / CDN Cloud Icons (e.g., Cloudflare):** If using an external DNS proxy in front of Vercel, ensure ACME HTTP-01 challenge paths (`/.well-known/acme-challenge/*`) are unblocked and SSL mode is set to **Full (Strict)** to prevent redirect loops.
- **CAA Records:** If your DNS zone enforces `CAA` records, permit Let's Encrypt issuance:
  ```text
  example.com.  CAA  0 issue "letsencrypt.org"
  ```

### 3.2 Verifying DNS Propagation, TLS, & Security Headers

```bash
# 1. Verify DNS resolution
dig +short pulse.example.com CNAME
dig +short example.com A

# 2. Verify TLS certificate chain & issuer
openssl s_client -connect pulse.example.com:443 -servername pulse.example.com </dev/null 2>/dev/null | openssl x509 -noout -issuer -dates -subject

# 3. Verify vercel.json HSTS, security headers, & Edge Middleware headers
curl -sSI https://pulse.example.com/api/health | grep -iE "strict-transport|x-frame|x-content-type|x-edgepulse"
```

---

## 4. Troubleshooting Guide: 5 Common Vercel & Next.js Operational Issues

### Issue 1: Stale ISR Cache After Content Update

- **Symptom:** `/isr-lab` continues serving an old `generatedAt` timestamp even after upstream data changes or `POST /api/revalidate` is called.
- **Root Causes:**
  1. Tag mismatch between `fetch(..., { next: { tags: ['release-feed'] } })` and `revalidateTag('...')`.
  2. Custom `Cache-Control: public, max-age=31536000` accidentally applied to HTML/RSC routes in `vercel.json`, causing browsers/CDNs to bypass Next.js ISR revalidation headers (`s-maxage`).
  3. Calling `/api/revalidate` without a valid `Authorization: Bearer <REVALIDATE_SECRET>` token (returning `401`).
- **Resolution:**
  - Centralize tag constants (`RELEASE_FEED_CACHE_TAG = 'release-feed'` in `src/lib/release-feed.ts`).
  - Scope immutable `Cache-Control` headers strictly to `/_next/static/(.*)` and `/static/(.*)` in `vercel.json`.
  - Inspect `x-vercel-cache` response header (`HIT`, `STALE`, `REVALIDATED`, `MISS`) via `curl -I`.

### Issue 2: Edge Runtime Unsupported Node.js APIs

- **Symptom:** Build or runtime crash in `src/middleware.ts` or `src/app/api/edge-probe/route.ts` with `The edge runtime does not support Node.js 'fs' module` or `Dynamic Code Evaluation (e.g. 'eval', 'new Function') not allowed in Edge Runtime`.
- **Root Causes:**
  - Importing Node-specific modules (`node:fs`, `node:net`, `process.uptime()`, TCP database drivers, or heavy C++ addons) inside routes marked `export const runtime = 'edge'` or inside Edge Middleware.
- **Resolution:**
  - Restrict Edge handlers and Middleware to WinterCG Web APIs (`Request`, `Response`, `Headers`, `URL`, `crypto.randomUUID()`, `performance.now()`).
  - Move heavy SDKs, database queries, and Node APIs to default **Node.js Fluid Compute** Route Handlers (`src/app/api/health/route.ts`), which support full Node.js APIs, streaming, and instance reuse.

### Issue 3: Missing `NEXT_PUBLIC_` Build-Time vs. Runtime Variables

- **Symptom:** Updating `NEXT_PUBLIC_APP_NAME` in the Vercel Dashboard works on Server Components after a cold start, or remains `undefined`/stale in client components (`'use client'`).
- **Root Causes:**
  - Next.js replaces `process.env.NEXT_PUBLIC_*` references at **build time** (`next build` / `vercel build`) via static AST substitution.
  - Using `--prebuilt` in CI without running `vercel pull --environment=<target>` beforehand causes `vercel build` to inline empty `NEXT_PUBLIC_*` values, and Vercel system build vars may be absent unless pulled/passed.
- **Resolution:**
  - Always run `vercel pull --yes --environment=preview|production` _before_ `vercel build` in CI (`vercel-deploy.yml`).
  - Trigger a fresh deployment whenever any `NEXT_PUBLIC_*` variable changes. For dynamic runtime configuration that should update without rebuilding, read server-side env vars in a dynamic Server Component or Route Handler instead.

### Issue 4: Preview URL CORS, Auth Callback, & Deployment Protection Mismatches

- **Symptom:** Browser `fetch` or OAuth login fails on PR preview URLs (`edgepulse-deploy-git-feat-xyz-team.vercel.app`), or CI post-deploy smoke tests receive HTTP `401`/`403` HTML login pages instead of JSON from `/api/health`.
- **Root Causes:**
  1. Hardcoding `NEXT_PUBLIC_SITE_URL=https://pulse.example.com` in Preview environments causes cross-origin requests from ephemeral `*.vercel.app` preview URLs.
  2. Vercel **Deployment Protection** (Vercel Authentication) blocks unauthenticated `curl` calls in GitHub Actions.
- **Resolution:**
  - Use relative URLs (`fetch('/api/health')`) in client components, and resolve `process.env.VERCEL_URL` dynamically on the server (`src/lib/release-feed.ts`).
  - Configure **Protection Bypass for Automation** in Vercel Project Settings -> Deployment Protection, store `VERCEL_AUTOMATION_BYPASS_SECRET` in GitHub Secrets, and send `-H "x-vercel-protection-bypass: ${VERCEL_AUTOMATION_BYPASS_SECRET}"` in CI smoke tests (pre-wired in `.github/workflows/vercel-deploy.yml`).

### Issue 5: Build Output Size, Serverless Bundle & Build Memory Limits

- **Symptom:** Deployment fails with `Serverless Function has exceeded the unzipped maximum size of 250 MB`, Edge function exceeds gzipped size limit (`1 MB` Hobby / `2 MB` Pro), or `next build` exits with `FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory`.
- **Root Causes:**
  - Barrel-file imports pulling entire icon/chart/SDK packages into an API route or Middleware, accidental inclusion of test fixtures/binaries in file tracing, or unbounded concurrent static page generation.
- **Resolution:**
  - Keep `devDependencies` (`vitest`, `eslint`, `typescript`, `prettier`) separate from runtime `dependencies`.
  - Exclude non-runtime assets via `outputFileTracingExcludes` in `next.config.mjs` if large local fixtures exist.
  - Keep `src/middleware.ts` dependency-free (zero heavy third-party packages).
  - If build-time TypeScript/bundler memory spikes on large monorepos, set `NODE_OPTIONS="--max-old-space-size=4096"` in build env and audit bundle size locally via `@next/bundle-analyzer`.
