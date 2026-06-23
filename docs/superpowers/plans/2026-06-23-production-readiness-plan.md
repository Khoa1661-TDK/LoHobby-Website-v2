# Production-Readiness Plan — ShopNex storefront

Date: 2026-06-23
Author: Claude (overnight session)
Status: assessment + prioritized plan — **nothing here is implemented yet**, this is for you to review and approve.

---

## TL;DR

The app is in **good shape** for a self-hosted CMS shop — better than a prototype. You already have: a CI pipeline (tests + typecheck + build), a `/health` liveness probe, payment **webhook signature verification** (PayOS checksum + Stripe), API rate limiting, a documented Docker deploy, and 321 passing tests. 

The gaps that stand between "works" and "production-ready" are concentrated in **three areas**: observability (structured logs + error tracking), HTTP security headers, and fail-fast env validation. None are huge. I'd budget **~3–4 focused sessions** to clear P0+P1.

I did **not** implement any of this — you said to plan it for you to read. Pick what you want and I'll execute.

---

## What's already solid (don't redo)

- **CI** — `.github/workflows/ci.yml` runs `vitest` + `tsc` + `next build` on push/PR.
- **Payments** — `app/api/webhook/[provider]/route.ts` verifies webhooks via the provider (`verifyWebhook`, PayOS `checksumKey`). The money path is signature-checked, not trust-the-body.
- **Liveness** — `app/health/route.ts` returns `{status, version}` for uptime monitors.
- **Rate limiting** — `middleware.ts` + `lib/rate-limit.ts` (preset-based).
- **Deploy** — Dockerized; storefront is `force-dynamic` so the image builds without a DB (see DECISIONS.md 2026-06-13).
- **Secrets hygiene** — `.env` is gitignored; secrets come from env.

---

## Prioritized gaps

| # | Gap | Priority | Effort | Why it matters |
|---|-----|----------|--------|----------------|
| 1 | Structured logging + error tracking | **P0** | 1 session | 28 prod files use `console.*` (incl. checkout, webhook, register). In prod you can't answer "why did this order fail?" |
| 2 | HTTP security headers / CSP | **P0** | 0.5 session | No `headers()` in `next.config.mjs` — missing HSTS, CSP, X-Frame-Options, etc. |
| 3 | Fail-fast env validation | **P0** | 0.5 session | No startup validation. A missing `PAYOS_CHECKSUM_KEY` or `AUTH_SECRET` fails silently/late. |
| 4 | Rate-limit durability + auth-route coverage | **P1** | 0.5–1 session | `lib/rate-limit.ts` uses an in-memory `Map` — resets per instance, useless on multi-instance/serverless. Confirm login/register/forgot/reset are actually limited. |
| 5 | `/health/ready` deep probe | **P1** | 0.25 session | Current `/health` is liveness only; a readiness probe should verify DB connectivity so a degraded instance is pulled from rotation. |
| 6 | Webhook idempotency / replay safety | **P1** | 0.5 session | Verify a payment confirmation processed twice can't double-fulfill or double-decrement stock. |
| 7 | Automated DB backups + tested restore | **P1** | 0.5 session | The Postgres DB holds orders, products, content. No backup = no business. |
| 8 | Page-builder follow-ups (new blocks + preview) | **P2** | 1 session | QA the 8 new blocks visually; consider the "instant presentational preview" follow-up (DECISIONS.md 2026-06-23). |
| 9 | Dependabot + secret scanning + branch protection | **P2** | 0.25 session | Per your `oss-hygiene` rules, if the repo is/goes public. |
| 10 | Perf check on the all-dynamic storefront | **P2** | 0.5 session | Everything is `force-dynamic`; verify `unstable_cache` tag caching actually holds under load. |

---

## P0 detail

### 1. Structured logging + error tracking
- Add a tiny structured logger (`lib/logger.ts`) emitting JSON to stdout with `timestamp` (ISO), `level`, `message`, and request-scoped context (`request_id`, `route`, `user_id`, `duration_ms`). Per your `observability.md`, Node default is `pino`.
- Replace `console.*` in the **money/auth paths first**: `app/api/checkout/route.ts`, `app/api/webhook/[provider]/route.ts`, `app/api/register/route.ts`, `app/api/auth/forgot-password/route.ts`, `app/api/auth/reset-password/route.ts`, `lib/order-fulfillment.ts`. Then the rest of the 28 files.
- Add error tracking: Sentry (or self-hosted GlitchTip/Bugsink). Wrap route handlers + a Next `instrumentation.ts` `onRequestError`.
- **Never log** secrets/PII/tokens (checkout + webhook handle payment data — audit those log lines).

### 2. Security headers / CSP
- Add a `headers()` block in `next.config.mjs`: `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN` (note: the builder `/build/*/preview` uses an iframe — keep it SAMEORIGIN, the preview is same-origin), `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, and a `Content-Security-Policy`.
- Set `poweredByHeader: false`.
- **CSP caveat:** the page-builder preview injects server-rendered HTML via `dangerouslySetInnerHTML` in `BlockSlot.tsx`. That markup is same-origin and server-generated (not user-script), so a CSP without `unsafe-inline` for scripts is fine, but test the `/admin` (Payload) and storefront under CSP before enforcing — start with `Content-Security-Policy-Report-Only`.

### 3. Env validation
- Add `lib/env.ts` with a zod schema validated once at startup: `DATABASE_URL`, `AUTH_SECRET` (≥32 chars), `PAYLOAD_SECRET` (≥32), `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SITE_URL`, and payment vars (`PAYOS_CLIENT_ID/API_KEY/CHECKSUM_KEY`) — required only when PayOS is enabled.
- Import it in `next.config.mjs` / `instrumentation.ts` so a bad prod env crashes loudly at boot, not at first checkout.

---

## P1 detail

- **4. Rate limiting:** decide the deploy topology. Single VPS instance → the in-memory `Map` is acceptable (document it). Multi-instance/serverless → move to Upstash Redis or Postgres-backed counters. Either way, write a test confirming `/api/register`, `/api/auth/forgot-password`, `/api/auth/reset-password`, and login are rate-limited (the middleware currently scopes storefront paths; confirm the auth API routes are covered or add per-route limits).
- **5. `/health/ready`:** new route doing a cheap `SELECT 1` against Postgres; 503 when it fails. Point the container/compose healthcheck at it; keep `/health` for liveness.
- **6. Webhook idempotency:** confirm `app/api/webhook/[provider]/route.ts` → order-fulfillment is idempotent on `orderCode` (a retried/duplicated PayOS callback must be a no-op if already `PAID`). Add a test that double-delivers a webhook and asserts single fulfillment.
- **7. Backups:** automated `pg_dump` (or managed-Postgres snapshots — your DB is `db.prisma.io`, check their backup guarantees) + a **tested restore**. An untested backup is not a backup.

---

## P2 detail
- **8. Page-builder:** open `/admin` → a page → the builder, drop each of the 8 new blocks (Spacer, Columns, CallToAction, Stats, Quote, CardGrid, Banner, Steps), confirm fields + rendering + the new image/promo links. Optional bigger item: make presentational edits *instant* in the preview by extracting `blockAppearanceClasses`/types out of `lib/page-builder.ts` into a client-safe module so those blocks can render in the iframe's client bundle (see DECISIONS.md 2026-06-23 — this is the deferred "alt 3").
- **9.** Per `oss-hygiene.md`: Dependabot (grouped), secret scanning + push protection, branch/tag rulesets — if public.
- **10.** Load-test a few hot storefront routes; confirm cache tags (`products`, `categories`, `header`, …) prevent per-request DB stampedes.

---

## Suggested order
1. **P0 bundle** (1 session): env validation + security headers + logger scaffold — all low-risk, high-leverage.
2. **Observability** (1 session): error tracking + replace `console.*` in money/auth paths.
3. **P1 money-path safety** (1 session): webhook idempotency test + `/health/ready` + rate-limit coverage test + backups.
4. **P2** as time allows.

Tell me which bundle to start with and I'll execute it the same way as tonight — branch/commit per concern, tests + build green before each commit.
