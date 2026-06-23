# Demo / Test Payment Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a selectable `demo` payment provider that runs the full checkout happy path (order → gate → PAID) with no real charge, blocked in production unless explicitly enabled.

**Architecture:** `demo` is a first-class `gateway`-kind provider in the existing registry/catalog. Its `createPaymentLink` returns an internal `/checkout/demo` URL; a dummy gate page confirms via `/api/checkout/demo/confirm`, which reuses the centralized `applyVerifiedWebhookPayment` paid-path. A single feature flag (`ALLOW_DEMO_PAYMENTS`) gates it in production, enforced at the storefront method list, the checkout route, the gate page, and the confirm endpoint.

**Tech Stack:** Next.js 15 App Router, Payload CMS, next-intl, Vitest. TypeScript strict.

## Global Constraints

- Package manager is pnpm. **Run scripts via `node_modules/.bin/<bin>` directly** — `pnpm <script>` fails on a deps-status precheck. Run tests with `node_modules/.bin/vitest run <path>`.
- TypeScript strict — no `any` leaking across exports; narrow with the existing type guards.
- Frontend rule: **no hardcoded UI strings**. All gate-page copy goes through next-intl message catalogs (`messages/en.json`, `messages/vi.json`) under a new `checkout.demo` namespace. No inline styles/colors — use existing Tailwind utility classes as the storefront does.
- Storefront navigation in client components uses `@/i18n/navigation` (locale-aware), not `next/navigation`.
- `lib/logger.ts` must NOT be re-given `import 'server-only'`; modules imported at top level by `src/payload/**` config must not transitively import a `server-only` module. Touched libs here (`payment-methods`, `feature-flags`, providers, credential resolver) are already safe — keep them so.
- Demo identifier string is exactly `demo` everywhere (catalog id, credentials `provider`, method `provider` field).
- Env flag is exactly `ALLOW_DEMO_PAYMENTS`. Allowed-in-production rule: `NODE_ENV !== 'production' || ALLOW_DEMO_PAYMENTS` truthy.
- Commit after each task with a Conventional Commit message ending with the `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>` trailer. Solo project — commit directly to `main`.

---

## File Structure

- `lib/payment-provider-catalog.ts` (modify) — add `demo` id + metadata.
- `lib/payment-provider-types.ts` (modify) — add `DemoCredentials` to the union.
- `lib/providers/demo.ts` (create) — the provider implementation.
- `lib/payment-providers.ts` (modify) — register `demo` in the registry.
- `lib/payment-gateway-credentials.ts` (modify) — no-credentials resolution branch.
- `lib/feature-flags.ts` (modify) — `isDemoPaymentAllowed()`.
- `lib/payment-methods.ts` (modify) — `isPaymentMethodOfferable()` + use it in `getCheckoutPaymentMethods`.
- `app/api/checkout/route.ts` (modify) — gate the method with `isPaymentMethodOfferable`.
- `app/api/checkout/demo/confirm/route.ts` (create) — confirm endpoint.
- `app/[locale]/(storefront)/checkout/demo/page.tsx` (create) — dummy gate page.
- `app/[locale]/(storefront)/checkout/demo/DemoGateActions.tsx` (create) — client Pay/Cancel actions.
- `messages/en.json`, `messages/vi.json` (modify) — `checkout.demo` copy.
- Tests under `lib/__tests__/` and `app/api/checkout/demo/__tests__/`.

---

## Task 1: Register the `demo` provider (catalog, types, registry, impl)

**Files:**
- Modify: `lib/payment-provider-catalog.ts`
- Modify: `lib/payment-provider-types.ts`
- Create: `lib/providers/demo.ts`
- Modify: `lib/payment-providers.ts`
- Test: `lib/__tests__/demo-provider.test.ts`

**Interfaces:**
- Consumes: `PaymentProvider`, `CreatePaymentArgs`, `CreatePaymentResult`, `GatewayCredentials` from `@/lib/payment-provider-types`.
- Produces:
  - `'demo'` added to `PAYMENT_PROVIDER_IDS` (so `isPaymentProviderId('demo') === true` and the CMS dropdown gains a "Demo / Test" option).
  - `DemoCredentials = { provider: 'demo' }` in the `GatewayCredentials` union.
  - `demoProvider: PaymentProvider` with `id: 'demo'`, registered in the registry.

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/demo-provider.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { demoProvider } from '@/lib/providers/demo';
import { getPaymentProvider, isPaymentProviderId } from '@/lib/payment-providers';
import type { CreatePaymentArgs } from '@/lib/payment-provider-types';

const baseArgs: CreatePaymentArgs = {
  orderCode: 4242,
  amount: 150_000,
  description: 'Đơn hàng 4242',
  items: [{ name: 'Item', quantity: 1, price: 150_000 }],
  returnUrl: 'https://shop.example/checkout/success?orderCode=4242',
  cancelUrl: 'https://shop.example/checkout/cancel?orderCode=4242',
  origin: 'https://shop.example',
  sandboxMode: true,
};

describe('demo payment provider', () => {
  it('should be a recognised provider id', () => {
    expect(isPaymentProviderId('demo')).toBe(true);
    expect(getPaymentProvider('demo')).toBe(demoProvider);
  });

  it('should return an internal demo gate checkout url keyed by order code', async () => {
    const result = await demoProvider.createPaymentLink(baseArgs, { provider: 'demo' });
    expect(result.checkoutUrl).toBe('https://shop.example/checkout/demo?orderCode=4242');
    expect(result.qrCode).toBeUndefined();
  });

  it('should reject mismatched credentials', async () => {
    await expect(
      demoProvider.createPaymentLink(baseArgs, { provider: 'payos' } as never),
    ).rejects.toThrow();
  });

  it('should throw if asked to verify a webhook (demo has no external webhook)', async () => {
    await expect(
      demoProvider.verifyWebhook(
        { body: {}, rawBody: '', headers: new Headers() },
        { provider: 'demo' },
      ),
    ).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node_modules/.bin/vitest run lib/__tests__/demo-provider.test.ts`
Expected: FAIL — cannot resolve `@/lib/providers/demo`, and `isPaymentProviderId('demo')` is `false`.

- [ ] **Step 3: Add `demo` to the catalog**

In `lib/payment-provider-catalog.ts`, add `'demo'` to the `PAYMENT_PROVIDER_IDS` array (append after `'shopeepay'`):

```typescript
export const PAYMENT_PROVIDER_IDS = [
  'payos',
  'stripe',
  'momo',
  'zalopay',
  'vnpay',
  'shopeepay',
  'demo',
] as const;
```

In the same file, add a `demo` entry at the end of `PAYMENT_PROVIDER_CATALOG`:

```typescript
  demo: {
    label: 'Demo / Test (no real payment)',
    requiredFields: [],
  },
```

- [ ] **Step 4: Add `DemoCredentials` to the union**

In `lib/payment-provider-types.ts`, add the type and extend the union:

```typescript
export type DemoCredentials = {
  provider: 'demo';
};
```

```typescript
export type GatewayCredentials =
  | PayOSCredentials
  | StripeCredentials
  | MoMoCredentials
  | ZaloPayCredentials
  | VNPayCredentials
  | ShopeePayCredentials
  | DemoCredentials;
```

- [ ] **Step 5: Create the provider implementation**

Create `lib/providers/demo.ts`:

```typescript
// lib/providers/demo.ts — no-charge gateway for verifying the checkout happy path.
// createPaymentLink returns an INTERNAL gate URL; the gate confirms via
// /api/checkout/demo/confirm, which reuses applyVerifiedWebhookPayment. This
// provider intentionally never touches an external API and has no webhook.
import type {
  CreatePaymentResult,
  GatewayCredentials,
  PaymentProvider,
} from '@/lib/payment-provider-types';

function assertDemo(credentials: GatewayCredentials) {
  if (credentials.provider !== 'demo') {
    throw new Error('Invalid credentials for demo provider');
  }
  return credentials;
}

export const demoProvider: PaymentProvider = {
  id: 'demo',
  async createPaymentLink(args, credentials): Promise<CreatePaymentResult> {
    assertDemo(credentials);
    // Non-locale-prefixed path mirrors the real returnUrl convention; next-intl
    // middleware adds the active locale prefix on navigation.
    return {
      checkoutUrl: `${args.origin}/checkout/demo?orderCode=${args.orderCode}`,
    };
  },
  async verifyWebhook() {
    throw new Error('demo provider has no external webhook');
  },
};
```

- [ ] **Step 6: Register the provider**

In `lib/payment-providers.ts`, add the import (alphabetical with the others):

```typescript
import { demoProvider } from '@/lib/providers/demo';
```

Add it to the `REGISTRY`:

```typescript
const REGISTRY: Record<PaymentProviderId, PaymentProvider> = {
  payos: payosProvider,
  stripe: stripeProvider,
  momo: momoProvider,
  zalopay: zalopayProvider,
  vnpay: vnpayProvider,
  shopeepay: shopeepayProvider,
  demo: demoProvider,
};
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `node_modules/.bin/vitest run lib/__tests__/demo-provider.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 8: Typecheck the touched files**

Run: `node_modules/.bin/tsc --noEmit`
Expected: no new errors. (The `GatewayCredentials` union now includes `demo`; later tasks add the resolution branch — `tsc` should still pass because `credentialsFromBlob`/`credentialsFromEnv` switch on `requiredFields`, which is empty for demo.)

- [ ] **Step 9: Commit**

```bash
git add lib/payment-provider-catalog.ts lib/payment-provider-types.ts lib/providers/demo.ts lib/payment-providers.ts lib/__tests__/demo-provider.test.ts
git commit -m "$(printf 'feat(payments): register demo/test payment provider\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

## Task 2: Resolve demo credentials without stored keys

**Files:**
- Modify: `lib/payment-gateway-credentials.ts`
- Test: `lib/__tests__/payment-gateway-credentials-demo.test.ts`

**Interfaces:**
- Consumes: `getGatewayConfigForMethod(key: string): Promise<ResolvedGatewayConfig | null>` (existing).
- Produces: when the method's `provider` field is `demo`, returns `{ credentials: { provider: 'demo' }, sandboxMode: true }` regardless of stored/env credentials (otherwise checkout's "gateway not configured" branch would cancel demo orders).

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/payment-gateway-credentials-demo.test.ts`:

```typescript
import { afterEach, describe, expect, it, vi } from 'vitest';

const findMock = vi.fn();

vi.mock('@payload-config', () => ({ default: {} }));
vi.mock('payload', () => ({
  getPayload: vi.fn(async () => ({ find: findMock })),
}));

import { getGatewayConfigForMethod } from '@/lib/payment-gateway-credentials';

afterEach(() => {
  vi.clearAllMocks();
});

describe('getGatewayConfigForMethod for the demo provider', () => {
  it('should resolve trivial demo credentials with no stored blob', async () => {
    findMock.mockResolvedValueOnce({
      docs: [{ provider: 'demo', gatewayCredentials: { credentialsEnc: null } }],
    });

    const config = await getGatewayConfigForMethod('demo');

    expect(config).toEqual({ credentials: { provider: 'demo' }, sandboxMode: true });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node_modules/.bin/vitest run lib/__tests__/payment-gateway-credentials-demo.test.ts`
Expected: FAIL — `getGatewayConfigForMethod` returns `null` for demo (no blob, no env fallback).

- [ ] **Step 3: Add the demo short-circuit**

In `lib/payment-gateway-credentials.ts`, inside `getGatewayConfigForMethod`, immediately after the line that computes `const provider = isPaymentProviderId(providerRaw) ? providerRaw : null;`, insert:

```typescript
  // Demo/test provider charges nothing and needs no credentials.
  if (provider === 'demo') {
    return { credentials: { provider: 'demo' }, sandboxMode: true };
  }
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node_modules/.bin/vitest run lib/__tests__/payment-gateway-credentials-demo.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/payment-gateway-credentials.ts lib/__tests__/payment-gateway-credentials-demo.test.ts
git commit -m "$(printf 'feat(payments): resolve demo provider without gateway credentials\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

## Task 3: Production guard feature flag

**Files:**
- Modify: `lib/feature-flags.ts`
- Test: `lib/__tests__/demo-payment-flag.test.ts`

**Interfaces:**
- Produces: `isDemoPaymentAllowed(): boolean` — `true` when `NODE_ENV !== 'production'`, or when `ALLOW_DEMO_PAYMENTS` is truthy (`1`/`true`/`yes`, case-insensitive). Used by Tasks 4, 5, 6.

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/demo-payment-flag.test.ts`:

```typescript
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { isDemoPaymentAllowed } from '@/lib/feature-flags';

const original = { ...process.env };

beforeEach(() => {
  delete process.env.ALLOW_DEMO_PAYMENTS;
});

afterEach(() => {
  process.env = { ...original };
});

describe('isDemoPaymentAllowed', () => {
  it('should allow demo payments outside production by default', () => {
    process.env.NODE_ENV = 'development';
    expect(isDemoPaymentAllowed()).toBe(true);
  });

  it('should block demo payments in production by default', () => {
    process.env.NODE_ENV = 'production';
    expect(isDemoPaymentAllowed()).toBe(false);
  });

  it('should allow demo payments in production when explicitly enabled', () => {
    process.env.NODE_ENV = 'production';
    process.env.ALLOW_DEMO_PAYMENTS = 'true';
    expect(isDemoPaymentAllowed()).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node_modules/.bin/vitest run lib/__tests__/demo-payment-flag.test.ts`
Expected: FAIL — `isDemoPaymentAllowed` is not exported.

- [ ] **Step 3: Add the flag**

In `lib/feature-flags.ts`, append (after `isGiftCardsEnabled`):

```typescript
/**
 * Demo/test payment provider: a no-charge gateway for verifying checkout.
 * Always available outside production; in production only when explicitly
 * enabled via ALLOW_DEMO_PAYMENTS (so a forgotten demo method cannot hand out
 * free orders to real customers).
 */
export function isDemoPaymentAllowed(): boolean {
  return process.env.NODE_ENV !== 'production' || envFlag('ALLOW_DEMO_PAYMENTS', false);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node_modules/.bin/vitest run lib/__tests__/demo-payment-flag.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/feature-flags.ts lib/__tests__/demo-payment-flag.test.ts
git commit -m "$(printf 'feat(payments): add ALLOW_DEMO_PAYMENTS production guard flag\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

## Task 4: Gate the demo method (storefront list + checkout route)

**Files:**
- Modify: `lib/payment-methods.ts`
- Modify: `app/api/checkout/route.ts`
- Test: `lib/__tests__/payment-method-offerable.test.ts`

**Interfaces:**
- Consumes: `isDemoPaymentAllowed()` from `@/lib/feature-flags`; `ResolvedPaymentMethod` (has `enabled: boolean` and `provider: string | null`).
- Produces: `isPaymentMethodOfferable(method: { enabled: boolean; provider: string | null }): boolean` — `false` for disabled methods, `false` for a `demo` provider when demo isn't allowed, else `true`. Used by `getCheckoutPaymentMethods` (storefront) and `app/api/checkout/route.ts` (server-side guard).

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/payment-method-offerable.test.ts`:

```typescript
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { isPaymentMethodOfferable } from '@/lib/payment-methods';

const original = { ...process.env };

beforeEach(() => {
  delete process.env.ALLOW_DEMO_PAYMENTS;
});

afterEach(() => {
  process.env = { ...original };
});

describe('isPaymentMethodOfferable', () => {
  it('should reject disabled methods', () => {
    expect(isPaymentMethodOfferable({ enabled: false, provider: 'payos' })).toBe(false);
  });

  it('should accept a normal enabled gateway', () => {
    expect(isPaymentMethodOfferable({ enabled: true, provider: 'payos' })).toBe(true);
  });

  it('should accept the demo method outside production', () => {
    process.env.NODE_ENV = 'development';
    expect(isPaymentMethodOfferable({ enabled: true, provider: 'demo' })).toBe(true);
  });

  it('should hide the demo method in production unless explicitly enabled', () => {
    process.env.NODE_ENV = 'production';
    expect(isPaymentMethodOfferable({ enabled: true, provider: 'demo' })).toBe(false);
    process.env.ALLOW_DEMO_PAYMENTS = 'true';
    expect(isPaymentMethodOfferable({ enabled: true, provider: 'demo' })).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node_modules/.bin/vitest run lib/__tests__/payment-method-offerable.test.ts`
Expected: FAIL — `isPaymentMethodOfferable` is not exported.

- [ ] **Step 3: Add the predicate and use it in the storefront list**

In `lib/payment-methods.ts`, add the import near the top (with the other `@/lib` imports):

```typescript
import { isDemoPaymentAllowed } from '@/lib/feature-flags';
```

Add the exported predicate (place it just above `getCheckoutPaymentMethods`):

```typescript
/**
 * Whether a method may be offered at checkout. Demo/test methods are hidden
 * unless demo payments are allowed in this environment.
 */
export function isPaymentMethodOfferable(method: {
  enabled: boolean;
  provider: string | null;
}): boolean {
  if (!method.enabled) return false;
  if (method.provider === 'demo' && !isDemoPaymentAllowed()) return false;
  return true;
}
```

In `getCheckoutPaymentMethods`, replace the existing filter:

```typescript
  return methods
    .filter((method) => method.enabled)
```

with:

```typescript
  return methods
    .filter(isPaymentMethodOfferable)
```

- [ ] **Step 4: Gate the method in the checkout route**

In `app/api/checkout/route.ts`, add the import to the existing `@/lib/payment-methods` import line so it reads:

```typescript
import { getPaymentMethodByKey, isPaymentMethodOfferable, type PaymentMethodKind } from '@/lib/payment-methods';
```

Replace the existing method guard:

```typescript
  const method = await getPaymentMethodByKey(body.paymentMethodKey);
  if (!method || !method.enabled) {
    return NextResponse.json(
      { error: 'Hình thức thanh toán không khả dụng.' },
      { status: 400 },
    );
  }
```

with:

```typescript
  const method = await getPaymentMethodByKey(body.paymentMethodKey);
  if (!method || !isPaymentMethodOfferable(method)) {
    return NextResponse.json(
      { error: 'Hình thức thanh toán không khả dụng.' },
      { status: 400 },
    );
  }
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `node_modules/.bin/vitest run lib/__tests__/payment-method-offerable.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Typecheck**

Run: `node_modules/.bin/tsc --noEmit`
Expected: no new errors.

- [ ] **Step 7: Commit**

```bash
git add lib/payment-methods.ts app/api/checkout/route.ts lib/__tests__/payment-method-offerable.test.ts
git commit -m "$(printf 'feat(payments): hide/block demo method when demo payments disallowed\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

## Task 5: Demo confirm endpoint

**Files:**
- Create: `app/api/checkout/demo/confirm/route.ts`
- Test: `app/api/checkout/demo/__tests__/confirm.test.ts`

**Interfaces:**
- Consumes: `enforceRateLimit`, `RATE_LIMIT_PRESETS.checkout`, `auth`, `getPayloadOrderByCode`, `getPaymentMethodByKey`, `ownsPayloadOrder`, `mapPayloadOrderToStorefrontStatus`, `isAdminEmail`, `applyVerifiedWebhookPayment`, `isDemoPaymentAllowed`.
- Produces: `POST /api/checkout/demo/confirm` accepting `{ orderCode: number }`. On a valid, owned, pending demo order it calls `applyVerifiedWebhookPayment({ orderCode, amount: order.totalAmount, success: true })` and returns `{ success: true }`. Status codes: 429 rate-limited, 403 demo-not-allowed / not-owner, 401 unauthenticated, 400 bad body / non-demo method, 404 order not found.

- [ ] **Step 1: Write the failing test**

Create `app/api/checkout/demo/__tests__/confirm.test.ts`:

```typescript
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api-guard', () => ({ enforceRateLimit: vi.fn(() => null) }));
vi.mock('@/lib/feature-flags', () => ({ isDemoPaymentAllowed: vi.fn(() => true) }));
vi.mock('@/auth', () => ({ auth: vi.fn() }));
vi.mock('@/lib/payload-orders', () => ({ getPayloadOrderByCode: vi.fn() }));
vi.mock('@/lib/payment-methods', () => ({ getPaymentMethodByKey: vi.fn() }));
vi.mock('@/lib/payload-order-storefront', () => ({
  ownsPayloadOrder: vi.fn(() => true),
  mapPayloadOrderToStorefrontStatus: vi.fn(() => 'PENDING_ONLINE'),
}));
vi.mock('@/lib/admin-emails', () => ({ isAdminEmail: vi.fn(() => false) }));
vi.mock('@/lib/payment-webhook-handler', () => ({
  applyVerifiedWebhookPayment: vi.fn(async () => ({ matched: true })),
}));

import { POST } from '@/app/api/checkout/demo/confirm/route';
import { auth } from '@/auth';
import { isDemoPaymentAllowed } from '@/lib/feature-flags';
import { getPayloadOrderByCode } from '@/lib/payload-orders';
import { getPaymentMethodByKey } from '@/lib/payment-methods';
import { ownsPayloadOrder } from '@/lib/payload-order-storefront';
import { applyVerifiedWebhookPayment } from '@/lib/payment-webhook-handler';

const authMock = vi.mocked(auth);
const allowedMock = vi.mocked(isDemoPaymentAllowed);
const orderMock = vi.mocked(getPayloadOrderByCode);
const methodMock = vi.mocked(getPaymentMethodByKey);
const ownsMock = vi.mocked(ownsPayloadOrder);
const applyMock = vi.mocked(applyVerifiedWebhookPayment);

function post(body: unknown): Request {
  return new Request('http://localhost/api/checkout/demo/confirm', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const session = { user: { id: 'u1', email: 'buyer@example.com' } };
const demoOrder = { paymentMethodKey: 'demo', totalAmount: 150_000 };

afterEach(() => {
  vi.clearAllMocks();
  allowedMock.mockReturnValue(true);
  ownsMock.mockReturnValue(true);
});

describe('POST /api/checkout/demo/confirm', () => {
  it('should reject when demo payments are not allowed', async () => {
    allowedMock.mockReturnValue(false);
    const res = await POST(post({ orderCode: 4242 }) as never);
    expect(res.status).toBe(403);
    expect(applyMock).not.toHaveBeenCalled();
  });

  it('should reject an unauthenticated request', async () => {
    authMock.mockResolvedValue(null as never);
    const res = await POST(post({ orderCode: 4242 }) as never);
    expect(res.status).toBe(401);
  });

  it('should reject a foreign order', async () => {
    authMock.mockResolvedValue(session as never);
    orderMock.mockResolvedValue(demoOrder as never);
    methodMock.mockResolvedValue({ provider: 'demo' } as never);
    ownsMock.mockReturnValue(false);
    const res = await POST(post({ orderCode: 4242 }) as never);
    expect(res.status).toBe(403);
    expect(applyMock).not.toHaveBeenCalled();
  });

  it('should reject a non-demo order', async () => {
    authMock.mockResolvedValue(session as never);
    orderMock.mockResolvedValue({ paymentMethodKey: 'payos', totalAmount: 1 } as never);
    methodMock.mockResolvedValue({ provider: 'payos' } as never);
    const res = await POST(post({ orderCode: 4242 }) as never);
    expect(res.status).toBe(400);
    expect(applyMock).not.toHaveBeenCalled();
  });

  it('should mark a valid demo order paid via the real paid path', async () => {
    authMock.mockResolvedValue(session as never);
    orderMock.mockResolvedValue(demoOrder as never);
    methodMock.mockResolvedValue({ provider: 'demo' } as never);
    const res = await POST(post({ orderCode: 4242 }) as never);
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ success: true });
    expect(applyMock).toHaveBeenCalledWith({
      orderCode: 4242,
      amount: 150_000,
      success: true,
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node_modules/.bin/vitest run app/api/checkout/demo/__tests__/confirm.test.ts`
Expected: FAIL — cannot resolve `@/app/api/checkout/demo/confirm/route`.

- [ ] **Step 3: Create the route handler**

Create `app/api/checkout/demo/confirm/route.ts`:

```typescript
// app/api/checkout/demo/confirm/route.ts — confirms a demo/test payment.
// Runs the SAME paid transition real gateway webhooks use, with no external call.
// Hard-guarded so it can never settle a real customer's order in production.
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { enforceRateLimit } from '@/lib/api-guard';
import { RATE_LIMIT_PRESETS } from '@/lib/rate-limit';
import { isDemoPaymentAllowed } from '@/lib/feature-flags';
import { isAdminEmail } from '@/lib/admin-emails';
import { getPayloadOrderByCode } from '@/lib/payload-orders';
import { getPaymentMethodByKey } from '@/lib/payment-methods';
import {
  mapPayloadOrderToStorefrontStatus,
  ownsPayloadOrder,
} from '@/lib/payload-order-storefront';
import { applyVerifiedWebhookPayment } from '@/lib/payment-webhook-handler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const limited = enforceRateLimit(req, 'checkout', RATE_LIMIT_PRESETS.checkout);
  if (limited) return limited;

  if (!isDemoPaymentAllowed()) {
    return NextResponse.json({ error: 'Demo payments are disabled.' }, { status: 403 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
  const orderCode = Number((body as { orderCode?: unknown })?.orderCode);
  if (!Number.isInteger(orderCode)) {
    return NextResponse.json({ error: 'Invalid order code' }, { status: 400 });
  }

  const order = await getPayloadOrderByCode(orderCode);
  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  const isOwner = ownsPayloadOrder(order, {
    userId: session.user.id,
    email: session.user.email,
  });
  if (!isOwner && !isAdminEmail(session.user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const method = order.paymentMethodKey
    ? await getPaymentMethodByKey(order.paymentMethodKey)
    : null;
  if (method?.provider !== 'demo') {
    return NextResponse.json({ error: 'Not a demo order' }, { status: 400 });
  }

  // Already settled — idempotent success (the buyer may have double-clicked).
  if (mapPayloadOrderToStorefrontStatus(order) === 'PAID') {
    return NextResponse.json({ success: true }, { status: 200 });
  }

  const amount = typeof order.totalAmount === 'number' ? order.totalAmount : 0;
  await applyVerifiedWebhookPayment({ orderCode, amount, success: true });

  return NextResponse.json({ success: true }, { status: 200 });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node_modules/.bin/vitest run app/api/checkout/demo/__tests__/confirm.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Typecheck**

Run: `node_modules/.bin/tsc --noEmit`
Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add app/api/checkout/demo/confirm/route.ts app/api/checkout/demo/__tests__/confirm.test.ts
git commit -m "$(printf 'feat(payments): add demo payment confirm endpoint\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

## Task 6: Dummy gate page + copy

**Files:**
- Create: `app/[locale]/(storefront)/checkout/demo/page.tsx`
- Create: `app/[locale]/(storefront)/checkout/demo/DemoGateActions.tsx`
- Modify: `messages/en.json`
- Modify: `messages/vi.json`

**Interfaces:**
- Consumes: `auth`, `getPayloadOrderByCode`, `getPaymentMethodByKey`, `ownsPayloadOrder`, `mapPayloadOrderToStorefrontStatus`, `isAdminEmail`, `isDemoPaymentAllowed`, the confirm endpoint from Task 5, `useRouter`/`Link` from `@/i18n/navigation`, `getTranslations`/`useTranslations` from next-intl.
- Produces: a server page at `/[locale]/checkout/demo?orderCode=…` and its client actions component. No new exports consumed by other tasks.

- [ ] **Step 1: Add the `checkout.demo` copy (en)**

In `messages/en.json`, inside the `"checkout"` object, add a `"demo"` key after the `"cancel"` block (keep valid JSON — add a comma after the `cancel` object's closing brace):

```json
    "demo": {
      "metaTitle": "Demo payment",
      "badge": "DEMO — no real charge",
      "heading": "Demo payment gate",
      "body": "This is a test checkout. No money will be charged. Confirm to simulate a successful payment and see the full order flow.",
      "orderCode": "Order code",
      "amount": "Amount",
      "payNow": "Pay now (simulate success)",
      "cancel": "Cancel",
      "processing": "Processing…",
      "error": "Could not complete the demo payment. Please try again.",
      "blockedHeading": "Demo payments are disabled",
      "blockedBody": "The demo payment gate is not available in this environment.",
      "backToCatalog": "Back to catalog"
    }
```

- [ ] **Step 2: Add the `checkout.demo` copy (vi)**

In `messages/vi.json`, inside the `"checkout"` object, add the matching `"demo"` key after its `"cancel"` block:

```json
    "demo": {
      "metaTitle": "Thanh toán thử",
      "badge": "DEMO — không thu tiền thật",
      "heading": "Cổng thanh toán thử",
      "body": "Đây là phiên thanh toán thử. Sẽ không có khoản tiền nào bị trừ. Xác nhận để mô phỏng thanh toán thành công và xem toàn bộ luồng đơn hàng.",
      "orderCode": "Mã đơn hàng",
      "amount": "Số tiền",
      "payNow": "Thanh toán ngay (mô phỏng thành công)",
      "cancel": "Hủy",
      "processing": "Đang xử lý…",
      "error": "Không thể hoàn tất thanh toán thử. Vui lòng thử lại.",
      "blockedHeading": "Thanh toán thử đang bị tắt",
      "blockedBody": "Cổng thanh toán thử không khả dụng trong môi trường này.",
      "backToCatalog": "Về trang sản phẩm"
    }
```

- [ ] **Step 3: Verify both message files are valid JSON**

Run: `node_modules/.bin/tsx -e "JSON.parse(require('fs').readFileSync('messages/en.json','utf8')); JSON.parse(require('fs').readFileSync('messages/vi.json','utf8')); console.log('ok')"`
Expected: prints `ok`. (If it throws, fix the trailing/missing comma where the `demo` block was inserted.)

- [ ] **Step 4: Create the client actions component**

Create `app/[locale]/(storefront)/checkout/demo/DemoGateActions.tsx`:

```tsx
'use client';

import { useState, type ReactElement } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';

type Props = { orderCode: number };

export default function DemoGateActions({ orderCode }: Props): ReactElement {
  const t = useTranslations('checkout.demo');
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  async function pay(): Promise<void> {
    setPending(true);
    setError(false);
    try {
      const res = await fetch('/api/checkout/demo/confirm', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ orderCode }),
      });
      if (!res.ok) {
        setError(true);
        setPending(false);
        return;
      }
      router.push(`/checkout/success?orderCode=${orderCode}`);
    } catch {
      setError(true);
      setPending(false);
    }
  }

  return (
    <div className="mt-6 flex flex-col gap-3">
      {error ? <p className="text-sm text-red-600">{t('error')}</p> : null}
      <button
        type="button"
        onClick={pay}
        disabled={pending}
        className="rounded-md bg-black px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? t('processing') : t('payNow')}
      </button>
      <button
        type="button"
        onClick={() => router.push(`/checkout/cancel?orderCode=${orderCode}`)}
        disabled={pending}
        className="rounded-md border border-neutral-300 px-4 py-3 text-sm font-medium text-neutral-700 disabled:opacity-60"
      >
        {t('cancel')}
      </button>
    </div>
  );
}
```

- [ ] **Step 5: Create the gate page**

Create `app/[locale]/(storefront)/checkout/demo/page.tsx`:

```tsx
// app/[locale]/(storefront)/checkout/demo/page.tsx — dummy payment gate for the
// demo/test provider. Confirms via /api/checkout/demo/confirm (no real charge).
import type { Metadata } from 'next';
import type { ReactElement } from 'react';
import { redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { auth } from '@/auth';
import { isAdminEmail } from '@/lib/admin-emails';
import { isDemoPaymentAllowed } from '@/lib/feature-flags';
import { getPaymentMethodByKey } from '@/lib/payment-methods';
import { getPayloadOrderByCode } from '@/lib/payload-orders';
import {
  mapPayloadOrderToStorefrontStatus,
  ownsPayloadOrder,
} from '@/lib/payload-order-storefront';
import type { Locale } from '@/i18n/routing';
import DemoGateActions from './DemoGateActions';

type Props = {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ orderCode?: string }>;
};

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('checkout.demo');
  return { title: t('metaTitle'), robots: { index: false, follow: false } };
}

export default async function DemoGatePage(props: Props): Promise<ReactElement> {
  const { locale } = await props.params;
  setRequestLocale(locale);
  const t = await getTranslations('checkout.demo');

  if (!isDemoPaymentAllowed()) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-xl font-semibold">{t('blockedHeading')}</h1>
        <p className="mt-2 text-sm text-neutral-600">{t('blockedBody')}</p>
        <Link href="/search" className="mt-6 inline-block text-sm underline">
          {t('backToCatalog')}
        </Link>
      </main>
    );
  }

  const { orderCode } = await props.searchParams;
  const code = Number(orderCode);
  if (!Number.isInteger(code)) redirect('/');

  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=/checkout/demo?orderCode=${code}`);
  }

  const order = await getPayloadOrderByCode(code);
  if (!order) redirect('/');

  const isOwner = ownsPayloadOrder(order, {
    userId: session.user.id,
    email: session.user.email,
  });
  if (!isOwner && !isAdminEmail(session.user.email)) redirect('/');

  const method = order.paymentMethodKey
    ? await getPaymentMethodByKey(order.paymentMethodKey)
    : null;
  if (method?.provider !== 'demo') redirect('/');

  // Already paid — skip the gate.
  if (mapPayloadOrderToStorefrontStatus(order) === 'PAID') {
    redirect(`/checkout/success?orderCode=${code}`);
  }

  const amount = typeof order.totalAmount === 'number' ? order.totalAmount : 0;
  const formattedAmount = new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);

  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <span className="inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-800">
        {t('badge')}
      </span>
      <h1 className="mt-4 text-2xl font-semibold">{t('heading')}</h1>
      <p className="mt-2 text-sm text-neutral-600">{t('body')}</p>

      <dl className="mt-6 divide-y divide-neutral-200 rounded-lg border border-neutral-200">
        <div className="flex items-center justify-between px-4 py-3">
          <dt className="text-sm text-neutral-500">{t('orderCode')}</dt>
          <dd className="text-sm font-medium">{code}</dd>
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <dt className="text-sm text-neutral-500">{t('amount')}</dt>
          <dd className="text-sm font-medium">{formattedAmount}</dd>
        </div>
      </dl>

      <DemoGateActions orderCode={code} />
    </main>
  );
}
```

- [ ] **Step 6: Typecheck**

Run: `node_modules/.bin/tsc --noEmit`
Expected: no new errors. (If `Locale` is not exported from `@/i18n/routing`, check the import the success/preview pages use — `app/[locale]/build/[slug]/preview/page.tsx` imports `type { Locale } from '@/i18n/routing'`, so this matches.)

- [ ] **Step 7: Run the whole demo test suite**

Run: `node_modules/.bin/vitest run lib/__tests__/demo-provider.test.ts lib/__tests__/payment-gateway-credentials-demo.test.ts lib/__tests__/demo-payment-flag.test.ts lib/__tests__/payment-method-offerable.test.ts app/api/checkout/demo/__tests__/confirm.test.ts`
Expected: all PASS.

- [ ] **Step 8: Verify the build (importmap included)**

Run: `node_modules/.bin/next build && node_modules/.bin/payload generate:importmap`
Expected: build succeeds; importmap step prints no error (guards against accidentally pulling `server-only` into the config path).

- [ ] **Step 9: Commit**

```bash
git add "app/[locale]/(storefront)/checkout/demo/page.tsx" "app/[locale]/(storefront)/checkout/demo/DemoGateActions.tsx" messages/en.json messages/vi.json
git commit -m "$(printf 'feat(payments): add demo payment gate page and copy\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

## Manual verification (after all tasks)

1. In `/admin`, create a Payment Method: kind **Gateway**, provider **Demo / Test (no real payment)**, enabled, no credentials. Save.
2. On the storefront (dev), add an item, go to checkout, pick the demo method, place the order.
3. Confirm the browser lands on `/<locale>/checkout/demo` showing the DEMO badge, order code, and amount.
4. Click **Pay now** → lands on `/checkout/success` with status **PAID**.
5. In `/admin/orders`, confirm the order is paid and inventory decremented.
6. Click **Cancel** on a fresh demo order instead → lands on `/checkout/cancel`, order not paid.
7. Set `NODE_ENV=production` (or build) with `ALLOW_DEMO_PAYMENTS` unset → the demo method is absent from checkout, and hitting `/checkout/demo` shows the "disabled" notice.

---

## Self-Review

**Spec coverage:**
- Catalog/types/registry demo provider → Task 1. ✓
- Internal `checkoutUrl` to `/checkout/demo` → Task 1 (`demoProvider.createPaymentLink`). ✓
- No-credentials resolution → Task 2. ✓
- Production guard helper + 4 enforcement points → Task 3 (helper), Task 4 (storefront list + checkout route), Task 5 (confirm endpoint), Task 6 (gate page). ✓
- Visible dummy gate page with Pay/Cancel → Task 6. ✓
- Full PAID happy path via `applyVerifiedWebhookPayment` → Task 5. ✓
- Ownership/auth checks mirroring success page → Tasks 5 & 6. ✓
- Tests for provider URL, confirm behavior (non-demo/foreign/allowed), production guard, credential branch → Tasks 1–5. ✓
- CMS setup (no code) → Manual verification step 1. ✓

**Placeholder scan:** No TBD/TODO; every code step has complete code. ✓

**Type consistency:** `isDemoPaymentAllowed` (Tasks 3–6), `isPaymentMethodOfferable({ enabled, provider })` (Task 4), `demoProvider`/`DemoCredentials`/`'demo'` (Task 1), `applyVerifiedWebhookPayment({ orderCode, amount, success })` (Task 5, matches existing `VerifiedWebhook`), `getPayloadOrderByCode`/`order.totalAmount`/`order.paymentMethodKey` (existing shapes) — consistent across tasks. ✓

**Note on the no-test gate page (Task 6):** the page is presentational + redirect glue over already-tested helpers; its logic (auth/ownership/demo-provider/paid redirect) duplicates the confirm endpoint's guards, which are unit-tested in Task 5. Manual verification covers the end-to-end click path.
