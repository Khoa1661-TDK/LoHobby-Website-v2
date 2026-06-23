# Demo / Test Payment Gate — Design

**Date:** 2026-06-23
**Status:** Approved (pending spec review)

## Problem

While building and configuring a shop, the operator needs to verify the full
checkout flow works — order creation, the payment redirect, the post-payment
"paid" outcome — **without** completing a real transaction through PayOS, Stripe,
or any other live gateway.

The page-builder preview iframe (`/[locale]/build/[slug]/preview`) only renders
content blocks; it does not host the live checkout. So the dummy gate is not
literally "inside the builder" — it is a **selectable Demo payment provider** the
operator assigns as a payment method while building, and disables (or leaves
production-guarded) before launch.

## Goal

Add a `demo` payment provider that behaves like a real `gateway`-kind method but
charges nothing: checkout redirects to an internal dummy gate page, "Pay now"
runs the real paid-transition path, and the order lands on `/checkout/success`
marked PAID. Block its use in production unless an explicit env flag enables it.

## Non-Goals

- Tagging/labelling demo orders as test orders. (Explicitly declined — demo
  orders are indistinguishable from real sales in `/admin/orders`; cleanup is
  manual. The production guard is the safety net.)
- Threading a preview/draft context flag from the page builder into
  `/api/checkout`.
- Any change to real gateway providers (PayOS, Stripe, MoMo, ZaloPay, VNPay,
  ShopeePay).

## Decisions (from brainstorming)

- **Scope:** a selectable Demo provider in the existing provider registry — not a
  global toggle, not preview-context detection.
- **Fidelity:** a **visible dummy gateway page**. Checkout redirects to an
  internal `/checkout/demo` screen with "Pay now / Cancel"; the operator sees the
  full redirect → pay → confirm → success loop.
- **Order outcome:** **Marked PAID via the full happy path** — same transition
  real webhooks use (`applyVerifiedWebhookPayment`): paymentStatus PAID,
  inventory committed, dropship/seller-notify fired.
- **Safety:** **blocked in production** unless `ALLOW_DEMO_PAYMENTS=true`.

## Architecture (Approach 1: Demo as a first-class `gateway` provider)

The demo provider plugs into the existing provider abstraction
(`lib/payment-providers.ts` registry + `lib/payment-provider-catalog.ts`
metadata). Checkout treats it identically to any other gateway; the only
differences are an internal `checkoutUrl`, a no-credentials resolution branch,
and the production guard.

Two rejected alternatives:

- **Special-case `'demo'` in the checkout route** — scatters demo logic into the
  hot checkout path and fights the uniform provider model.
- **Route demo through the real `/api/webhook/[provider]` endpoint with an
  internal HMAC** — invents signing for an all-internal flow; no payoff.

## Components

### 1. Catalog & types
- `lib/payment-provider-catalog.ts`: add `'demo'` to `PAYMENT_PROVIDER_IDS`; add
  catalog entry `demo: { label: 'Demo / Test (no real payment)', requiredFields: [] }`.
  The CMS provider dropdown (`PAYMENT_PROVIDER_OPTIONS`) picks this up
  automatically; with no `requiredFields`, the PaymentMethods `beforeChange` hook
  stores no credential blob.
- `lib/payment-provider-types.ts`: add `DemoCredentials = { provider: 'demo' }`
  to the `GatewayCredentials` union.

### 2. Provider implementation — `lib/providers/demo.ts`
- `id: 'demo'`.
- `createPaymentLink(args)` returns
  `{ checkoutUrl: `${args.origin}/checkout/demo?orderCode=${args.orderCode}` }`.
  Mirrors the existing non-locale-prefixed `returnUrl` convention; next-intl
  middleware adds the locale prefix.
- `verifyWebhook()` throws — `demo` never flows through the external webhook
  route. Defensive only.

### 3. Credential resolution — `lib/payment-gateway-credentials.ts`
- When `provider === 'demo'`, short-circuit to
  `{ credentials: { provider: 'demo' }, sandboxMode: true }` without requiring a
  stored blob or env keys. (Without this, the existing "gateway not configured"
  branch would cancel the order.)

### 4. Production guard — `lib/feature-flags.ts`
(co-located with the existing `isGiftCardsEnabled` flag.)
- `isDemoPaymentAllowed(): boolean` =
  `process.env.NODE_ENV !== 'production' || process.env.ALLOW_DEMO_PAYMENTS === 'true'`.
- Enforced in four places:
  1. **Checkout route** — if the selected method's provider is `demo` and demo is
     not allowed, cancel the created order and return an error (mirrors the
     existing "gateway not configured" cancel/return shape).
  2. **Demo gate page** — render a blocked notice / `notFound()` when not allowed.
  3. **Confirm endpoint** — reject with 403 when not allowed.
  4. **Storefront payment-method list** — filter `demo` out of the options shown
     to customers when not allowed, so it never appears in production checkout UI.

### 5. Dummy gate page — `app/[locale]/(storefront)/checkout/demo/page.tsx`
- Server component. Reads `orderCode`; requires an authenticated session that
  **owns** the order (same ownership rule as the success page — redirect to login
  otherwise).
- Loads the order summary (code + stored amount). Renders a clearly-labelled
  "DEMO PAYMENT — no real charge" panel using theme tokens (no inline styles).
- Two actions:
  - **Pay now (simulate success)** → POST `/api/checkout/demo/confirm`, then on
    success redirect to `/checkout/success?orderCode=…`.
  - **Cancel** → existing `/checkout/cancel?orderCode=…`.
- Honors the production guard.

### 6. Confirm endpoint — `app/api/checkout/demo/confirm/route.ts` (POST)
- `runtime = 'nodejs'`, `dynamic = 'force-dynamic'`. Rate-limited via the same
  `enforceRateLimit` / preset used by `/api/checkout`.
- Validates, in order: demo allowed (guard) → authenticated session → order
  exists and belongs to the session user → `method.provider === 'demo'` → order
  still pending (not already paid/canceled).
- On success, calls
  `applyVerifiedWebhookPayment({ orderCode, amount: <order's stored amount>, success: true })`
  — the centralized paid path (marks PAID → commits inventory → dropship/seller
  notify). **Never** trusts a client-supplied amount.
- Returns `{ success: true }` or an appropriate 4xx.

### 7. CMS setup (no code)
Admin creates a PaymentMethod: kind `gateway`, provider `Demo / Test`, no
credentials. Available automatically via the catalog.

## Data Flow

```
cart
 └─> POST /api/checkout            (order created PENDING, provider=demo)
       └─> demo.createPaymentLink  → checkoutUrl = /checkout/demo?orderCode=…
             └─> browser redirect to dummy gate page
                   ├─ "Cancel"  → /checkout/cancel?orderCode=…
                   └─ "Pay now" → POST /api/checkout/demo/confirm
                                    └─> applyVerifiedWebhookPayment(success)
                                          → order PAID, inventory, dropship
                                    └─> redirect /checkout/success?orderCode=…
```

Identical to a real gateway, with an internal gate and zero external calls.

## Error Handling

- **Demo not allowed in production:** checkout cancels the order and returns the
  standard error JSON; the gate page and confirm endpoint refuse independently
  (defense in depth); the method is hidden from the storefront list.
- **Foreign / missing / already-paid order at confirm:** 4xx, no state change.
  `applyVerifiedWebhookPayment` already no-ops on an unmatched/duplicate paid
  order (`markPayloadOrderPaid` returns `matched: false`).
- **Credential-resolution branch absent:** would fall through to the existing
  "Cổng thanh toán chưa được cấu hình" cancel — so the demo resolution branch is
  required, covered by a test.

## Testing

- `demo.createPaymentLink` returns the expected internal `checkoutUrl` shape.
- Confirm endpoint: marks a pending demo order PAID via
  `applyVerifiedWebhookPayment`; rejects (a) a non-demo order, (b) an order owned
  by another user, (c) an already-paid order.
- Production guard: with `NODE_ENV=production` and `ALLOW_DEMO_PAYMENTS` unset,
  the checkout route rejects+cancels a demo order, the confirm endpoint returns
  403, and the storefront method list omits `demo`. With the flag set, all allow.
- Credential resolution: `getGatewayConfigForMethod` returns
  `{ provider: 'demo' }` for a demo method with no stored credentials.

## Risks / Trade-offs

- **Demo orders look real.** No test tag (declined). They pollute `/admin/orders`
  and revenue reports; the operator must delete them. Mitigated by the production
  guard being strict by default.
- **`server-only` / importmap:** any new lib touched here must follow the
  established rule — modules imported at top level by `src/payload/**` config
  must not transitively import `server-only`. The demo provider impl and
  credential branch are server-side and not in the config import path, so this is
  low risk, but verify `payload generate:importmap` after wiring.

## Revisit If

- The operator later wants demo orders excluded from reports → add the test
  tag/flag variant that was declined here.
- A global "whole shop in test mode" need emerges → revisit the global-toggle
  approach instead of a per-method provider.
