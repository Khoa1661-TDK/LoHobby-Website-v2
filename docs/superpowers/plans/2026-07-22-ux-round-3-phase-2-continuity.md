# UX Round 3 — Phase 2: Cart ↔ Checkout Continuity — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop the purchase flow from breaking mid-stream — the back button emptying the cart, redirects dropping the locale, an unbounded quantity, and a silent post-payment wait.

**Architecture:** Move cart-clearing from before the gateway redirect to after the order is confirmed (a small client component on the success page). Swap three navigation call sites from `next/navigation` to the locale-aware `@/i18n/navigation`. Tighten the quantity cap in the variant selector. Give the order-status poller visible feedback and a bounded timeout.

**Tech Stack:** Next.js 15 App Router, React 19 client components, next-intl, `@/i18n/navigation` (locale-aware `Link`/`useRouter`/`redirect`), Vitest.

## Global Constraints

- **Do not break CMS / page-builder preview.** No Phase-2 task adds `useTranslations` to a shared block component; the new success-page client component renders only on `/checkout/success`, which is inside the storefront provider tree.
- **Use `@/i18n/navigation` for in-app navigation** — never `next/navigation`'s `useRouter`/`redirect`/`Link`. `useSearchParams` and `usePathname`-for-reading are still imported from `next/navigation` where the i18n module doesn't export them (`useSearchParams` is not exported by `@/i18n/navigation`).
- **All new user-facing copy is translated** in BOTH `messages/en.json` and `messages/vi.json`.
- **Vitest test files MUST import `describe/expect/it/vi` from `vitest`.**
- **Conventional Commits**, atomic. Commit directly to `main`.

---

## File Structure

- `components/checkout-form.tsx` — MODIFY: remove pre-redirect `clearCartAction`; swap `useRouter` import (Tasks 1, 2).
- `components/checkout/clear-cart-on-confirmed.tsx` — CREATE: client component clearing the cart once an order is confirmed (Task 1).
- `app/[locale]/(storefront)/checkout/success/page.tsx` — MODIFY: mount the new component (Task 1).
- `app/[locale]/(storefront)/reset-password/reset-password-form.tsx` — MODIFY: swap `useRouter` import (Task 2).
- `components/layout/navbar/search.tsx` — MODIFY: split imports, `useRouter` from i18n (Task 2).
- `components/product/variant-selector.tsx` — MODIFY: quantity cap (Task 3).
- `lib/max-cart-quantity.ts` — CREATE: pure `maxSelectableQuantity(...)` helper (Task 3).
- `lib/__tests__/max-cart-quantity.test.ts` — CREATE (Task 3).
- `components/checkout/order-status-poller.tsx` — MODIFY: visible state + timeout (Task 4).
- `messages/en.json`, `messages/vi.json` — MODIFY (Tasks 3? no; Task 4 poller copy).

---

## Task 1: Clear the cart only after the order is confirmed (finding 2.1)

`components/checkout-form.tsx:252` runs `await clearCartAction()` before `window.location.assign(data.checkoutUrl)` (line 255). A shopper who backs out of the PayOS page returns to an empty cart. Reaching `/checkout/success` means an order document exists; the cart is safe to clear there — but only once the order is **confirmed** (status not still awaiting online payment), so a webhook-delayed gateway order doesn't clear prematurely. COD/transfer orders land already-committed (`PENDING_COD`/`PENDING_TRANSFER`), so they clear on arrival.

**Files:**
- Modify: `components/checkout-form.tsx` (remove line 252)
- Create: `components/checkout/clear-cart-on-confirmed.tsx`
- Modify: `app/[locale]/(storefront)/checkout/success/page.tsx` (mount it)

**Interfaces:**
- Consumes: `clearCartAction(): Promise<{} | { error: string }>` from `components/cart/actions.ts`.
- Produces: `<ClearCartOnConfirmed confirmed={boolean} />` — clears the cart once, on mount, when `confirmed` is true.

- [ ] **Step 1: Remove the pre-redirect clear**

In `components/checkout-form.tsx`, delete line 252 (`await clearCartAction();`). Leave the `import { clearCartAction }` in place only if still used elsewhere — otherwise remove the now-unused import (check with `grep -n clearCartAction components/checkout-form.tsx` after deletion; remove the import if it is the only reference).

- [ ] **Step 2: Create the confirm-and-clear client component**

```tsx
// components/checkout/clear-cart-on-confirmed.tsx
'use client';

import { useEffect, useRef, type ReactElement } from 'react';
import { clearCartAction } from '@/components/cart/actions';

/**
 * Clears the cart exactly once when an order is confirmed. Rendered on the
 * order-success page so the cart survives a gateway redirect the shopper backs
 * out of (finding 2.1): the cart is only emptied after the order document is
 * confirmed, never before the PayOS redirect.
 */
export default function ClearCartOnConfirmed({
  confirmed,
}: {
  confirmed: boolean;
}): ReactElement | null {
  const done = useRef(false);
  useEffect(() => {
    if (!confirmed || done.current) return;
    done.current = true;
    void clearCartAction();
  }, [confirmed]);
  return null;
}
```

- [ ] **Step 3: Mount it on the success page**

In `app/[locale]/(storefront)/checkout/success/page.tsx`, add the import near the other component imports:

```typescript
import ClearCartOnConfirmed from '@/components/checkout/clear-cart-on-confirmed';
```

Derive a `confirmed` flag from the already-computed `status` (after line 79 `const shouldPoll = ...`):

```typescript
// The order is committed (safe to clear the cart) once it is no longer merely
// awaiting online payment. COD/transfer land already-committed.
const cartConfirmed = status !== 'PENDING' && status !== 'PENDING_ONLINE';
```

Render the component next to the poller (line 95):

```tsx
{shouldPoll && <OrderStatusPoller orderCode={code} initialStatus={status} />}
<ClearCartOnConfirmed confirmed={cartConfirmed} />
```

(When the poller detects payment and calls `router.refresh()`, the page re-renders with `status === 'PAID'`, `cartConfirmed` flips true, and the cart clears then.)

- [ ] **Step 4: Typecheck**

Run: `./node_modules/.bin/tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Manual verification against the deployed instance**

- COD checkout → success page → cart badge shows 0 afterward.
- Gateway checkout → on the PayOS page press back/cancel → returning to the store, the cart still holds the items (was previously emptied). Completing a gateway payment → success page → cart clears once status is PAID.

- [ ] **Step 6: Commit**

```bash
git add components/checkout-form.tsx components/checkout/clear-cart-on-confirmed.tsx "app/[locale]/(storefront)/checkout/success/page.tsx"
git commit -m "fix(checkout): clear the cart only after the order is confirmed"
```

---

## Task 2: Preserve the locale on post-submit navigations (finding 2.26)

`checkout-form.tsx`, `reset-password-form.tsx`, and `navbar/search.tsx` import `useRouter` from `next/navigation`, so their `router.push`/`router.replace` calls drop the `/en` (or `/vi`) prefix and bounce through middleware to the cookie/default locale. Fix: use `@/i18n/navigation`'s `useRouter`, which is locale-aware.

**Files:**
- Modify: `components/checkout-form.tsx` (import swap)
- Modify: `app/[locale]/(storefront)/reset-password/reset-password-form.tsx` (import swap)
- Modify: `components/layout/navbar/search.tsx` (split imports)

**Interfaces:** none (drop-in `useRouter` with the same `.push`/`.replace` surface).

- [ ] **Step 1: Swap the import in `checkout-form.tsx`**

Change line 5 from `import { useRouter } from 'next/navigation';` to `import { useRouter } from '@/i18n/navigation';`. No call-site change needed (`router.replace('/checkout/success?...')` now stays locale-prefixed).

- [ ] **Step 2: Swap the import in `reset-password-form.tsx`**

Change line 3 from `import { useRouter } from 'next/navigation';` to `import { useRouter } from '@/i18n/navigation';`. `router.push('/login')` (line 42) now stays on-locale.

- [ ] **Step 3: Split the import in `navbar/search.tsx`**

`useSearchParams` is NOT exported by `@/i18n/navigation`, so keep it on `next/navigation` and take only `useRouter` from i18n. Replace line 7:

```typescript
import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/i18n/navigation';
```

The `router.push('/product/...')` (line 116) and `router.push('/search?...')` (line 130) now stay locale-prefixed.

- [ ] **Step 4: Typecheck**

Run: `./node_modules/.bin/tsc --noEmit`
Expected: no errors. (The i18n `useRouter` types accept the same string-path calls.)

- [ ] **Step 5: Manual verification**

Visit `/en/search`, submit a search → the URL stays under `/en/...`. From `/en`, complete a COD checkout → success page stays under `/en/...`. Reset-password success → `/en/login`.

- [ ] **Step 6: Commit**

```bash
git add components/checkout-form.tsx "app/[locale]/(storefront)/reset-password/reset-password-form.tsx" components/layout/navbar/search.tsx
git commit -m "fix(i18n): keep the locale prefix on post-submit navigations"
```

---

## Task 3: Cap the quantity to real stock, require a variant first (finding 2.6)

`variant-selector.tsx:70-73` sets `maxQuantity` to the variant stock only when a variant with `stock > 0` is selected; otherwise it falls back to `99`. So before choosing a variant — or when stock is unknown — a shopper can dial 40 units on a 3-in-stock item. Fix: a pure helper that returns the real cap, and `1` when a selection is still required.

**Files:**
- Create: `lib/max-cart-quantity.ts`
- Create: `lib/__tests__/max-cart-quantity.test.ts`
- Modify: `components/product/variant-selector.tsx` (use the helper)

**Interfaces:**
- Produces: `maxSelectableQuantity(input: { hasVariants: boolean; variantSelected: boolean; stock: number | null; fallback?: number }): number`.

- [ ] **Step 1: Write the failing test**

```typescript
// lib/__tests__/max-cart-quantity.test.ts
import { describe, expect, it } from 'vitest';
import { maxSelectableQuantity } from '@/lib/max-cart-quantity';

describe('maxSelectableQuantity', () => {
  it('should cap to the selected variant stock', () => {
    expect(maxSelectableQuantity({ hasVariants: true, variantSelected: true, stock: 3 })).toBe(3);
  });

  it('should force 1 when a variant product has no selection yet', () => {
    expect(maxSelectableQuantity({ hasVariants: true, variantSelected: false, stock: null })).toBe(1);
  });

  it('should use the fallback for a no-variant product with unknown stock', () => {
    expect(maxSelectableQuantity({ hasVariants: false, variantSelected: false, stock: null, fallback: 99 })).toBe(99);
  });

  it('should cap to stock for a no-variant product with known stock', () => {
    expect(maxSelectableQuantity({ hasVariants: false, variantSelected: false, stock: 5 })).toBe(5);
  });

  it('should never return less than 1', () => {
    expect(maxSelectableQuantity({ hasVariants: true, variantSelected: true, stock: 0 })).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `./node_modules/.bin/vitest run lib/__tests__/max-cart-quantity.test.ts`
Expected: FAIL — cannot resolve import.

- [ ] **Step 3: Implement the helper**

```typescript
// lib/max-cart-quantity.ts
const DEFAULT_FALLBACK = 99;

/**
 * The maximum quantity the stepper should allow. Returns real stock when known,
 * forces 1 while a variant product still needs a selection, and only falls back
 * to a generous default when stock is genuinely unknown (finding 2.6).
 */
export function maxSelectableQuantity(input: {
  hasVariants: boolean;
  variantSelected: boolean;
  stock: number | null;
  fallback?: number;
}): number {
  const { hasVariants, variantSelected, stock, fallback = DEFAULT_FALLBACK } = input;
  if (hasVariants && !variantSelected) return 1;
  if (typeof stock === 'number' && Number.isFinite(stock)) {
    return Math.max(1, Math.floor(stock));
  }
  return Math.max(1, fallback);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `./node_modules/.bin/vitest run lib/__tests__/max-cart-quantity.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Use the helper in the variant selector**

In `components/product/variant-selector.tsx`, add the import:

```typescript
import { maxSelectableQuantity } from '@/lib/max-cart-quantity';
```

Replace the `maxQuantity` computation (lines 70–73):

```typescript
const maxQuantity = maxSelectableQuantity({
  hasVariants: variants.length > 0,
  variantSelected: Boolean(selectedVariant),
  stock: selectedVariant?.stock ?? null,
});
```

- [ ] **Step 6: Typecheck + tests**

Run: `./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/vitest run lib/__tests__/max-cart-quantity.test.ts`
Expected: no errors; PASS.

- [ ] **Step 7: Manual verification**

On a 3-in-stock variant product: before selecting, the "+" is capped at 1; after selecting the variant, the stepper caps at 3.

- [ ] **Step 8: Commit**

```bash
git add lib/max-cart-quantity.ts lib/__tests__/max-cart-quantity.test.ts components/product/variant-selector.tsx
git commit -m "fix(product): cap quantity to real stock and require variant selection"
```

---

## Task 4: Visible feedback and a bounded timeout on the payment poller (finding 2.14 / 2.11)

`components/checkout/order-status-poller.tsx` renders `null`, polls every 3s forever, and never times out. After paying, the success page sits on "pending" copy with no spinner and no escape. Fix: render a status line, and after a bounded number of attempts show a "still processing — we'll email you" message and stop polling. (Finding 2.11's error focus/scroll lives in the checkout form; see Step 6.)

**Files:**
- Modify: `components/checkout/order-status-poller.tsx`
- Modify: `components/checkout-form.tsx` (focus/scroll the error — finding 2.11)
- Modify: `messages/en.json`, `messages/vi.json` (`checkout.success.checkingPayment`, `checkout.success.paymentTimeout`)

**Interfaces:** unchanged props (`orderCode`, `initialStatus`).

- [ ] **Step 1: Add poller copy**

`messages/en.json` under `checkout.success`:

```json
"checkingPayment": "Confirming your payment…",
"paymentTimeout": "Still processing. This can take a few minutes — we'll email you when it's confirmed."
```

`messages/vi.json` under `checkout.success`:

```json
"checkingPayment": "Đang xác nhận thanh toán…",
"paymentTimeout": "Vẫn đang xử lý. Việc này có thể mất vài phút — chúng tôi sẽ gửi email khi thanh toán được xác nhận."
```

- [ ] **Step 2: Rewrite the poller with visible state and a timeout**

```tsx
// components/checkout/order-status-poller.tsx
'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type ReactElement } from 'react';

type OrderStatus =
  | 'PENDING'
  | 'PENDING_COD'
  | 'PENDING_ONLINE'
  | 'PENDING_TRANSFER'
  | 'PAID'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED';

type Props = {
  orderCode: number;
  initialStatus: OrderStatus;
};

const PENDING_STATUSES: ReadonlySet<OrderStatus> = new Set(['PENDING', 'PENDING_ONLINE']);
const POLL_INTERVAL_MS = 3000;
const MAX_ATTEMPTS = 40; // ~2 minutes

export default function OrderStatusPoller({ orderCode, initialStatus }: Props): ReactElement | null {
  const router = useRouter();
  const t = useTranslations('checkout.success');
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!PENDING_STATUSES.has(initialStatus)) return;

    let cancelled = false;
    let attempts = 0;
    const interval = window.setInterval(async () => {
      attempts += 1;
      if (attempts > MAX_ATTEMPTS) {
        window.clearInterval(interval);
        if (!cancelled) setTimedOut(true);
        return;
      }
      try {
        const res = await fetch(`/api/orders/${orderCode}`, { cache: 'no-store' });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { status: OrderStatus };
        if (!PENDING_STATUSES.has(data.status)) {
          window.clearInterval(interval);
          router.refresh();
        }
      } catch {
        /* retry on next tick */
      }
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [orderCode, initialStatus, router]);

  if (!PENDING_STATUSES.has(initialStatus)) return null;

  return (
    <p
      role="status"
      aria-live="polite"
      className="mb-4 flex items-center gap-2 rounded-xl border border-line bg-surface-raised px-4 py-3 text-sm text-warm-600 dark:text-warm-400"
    >
      {timedOut ? (
        t('paymentTimeout')
      ) : (
        <>
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-warm-400 border-t-transparent" aria-hidden />
          {t('checkingPayment')}
        </>
      )}
    </p>
  );
}
```

(The component still renders inside the success page's `{shouldPoll && ...}` guard, so it only mounts for gateway orders awaiting payment.)

- [ ] **Step 3: Focus and scroll the checkout error (finding 2.11)**

In `components/checkout-form.tsx`, the single error alert renders after all sections (~line 487) with no focus. Add a ref and scroll it into view when set. Near the other hooks (after `const [error, setError] = useState<string | null>(null);` at line 124) add:

```typescript
import { useEffect, useRef } from 'react'; // ensure useRef/useEffect are imported

const errorRef = useRef<HTMLDivElement>(null);
useEffect(() => {
  if (error && errorRef.current) {
    errorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    errorRef.current.focus();
  }
}, [error]);
```

Attach the ref and make the alert focusable — find the error alert element (search `{error && (` or the element that renders `error`) and add `ref={errorRef}` plus `tabIndex={-1}` and `role="alert"` to its container.

- [ ] **Step 4: Typecheck**

Run: `./node_modules/.bin/tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Manual verification**

- On the success page for a gateway order still pending, a spinner + "Confirming your payment…" shows; leave it running past ~2 minutes → it switches to the timeout message and stops polling (check the Network tab stops hitting `/api/orders/...`).
- Trigger a checkout error on a long mobile viewport (e.g. empty required field forced server-side) → the page scrolls to the error and focuses it.

- [ ] **Step 6: Commit**

```bash
git add components/checkout/order-status-poller.tsx components/checkout-form.tsx messages/en.json messages/vi.json
git commit -m "fix(checkout): show payment-wait feedback with a timeout and focus errors"
```

---

## Final verification

- [ ] `./node_modules/.bin/vitest run`
- [ ] `./node_modules/.bin/tsc --noEmit`
- [ ] JSON validity: `node -e "JSON.parse(require('fs').readFileSync('messages/en.json'));JSON.parse(require('fs').readFileSync('messages/vi.json'));console.log('ok')"`
- [ ] Deployed manual pass: gateway back-button keeps the cart; COD clears it; locale preserved through search + checkout; quantity capped to stock; poller shows feedback and times out.

## Self-review notes

- **Spec coverage:** 2.1 (Task 1), 2.26 (Task 2), 2.6 (Task 3), 2.14 + 2.11 (Task 4). All Phase-2 findings covered.
- **CMS constraint:** the new `clear-cart-on-confirmed` and the poller render only on `/checkout/success`, inside the storefront provider tree; no shared block component gains a new provider dependency.
- **Type consistency:** `maxSelectableQuantity` input object matches its single call site; `ClearCartOnConfirmed` prop `confirmed` matches the `cartConfirmed` value passed.
