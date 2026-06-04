# Analytics Extensions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dashboard time-range selector + discounted-item report, cart-abandonment reporting, and product click-through-rate to the existing first-party analytics.

**Architecture:** Pure aggregation functions in `lib/analytics/*-metrics.ts` (unit-tested, no DB), thin data layers in `lib/analytics/products.ts` that fetch then delegate, consent-gated Node capture routes under `app/api/track/*` (always return 204), and new sections on the Payload custom dashboard. Two new Prisma models: `AddToCartEvent` (per-event) and `ProductCtrDaily` (daily rollup — deliberately not per-event because impressions are high volume).

**Tech Stack:** Next.js 15 App Router, Payload CMS 3, Prisma (Postgres), Vitest, TypeScript strict.

**Branch:** Create `feature/analytics-extensions` off the current analytics work. Do NOT work on `main` (it has uncommitted i18n changes — leave them alone).

**Conventions to mirror (read these first):**
- Capture route pattern: `app/api/track/session/route.ts`, `app/api/track/view/route.ts`
- Client beacon helpers: `lib/analytics/track-client.ts` (`beacon`, `getAnonId`, `getSession`)
- Server validation helpers: `lib/analytics/track-server.ts` (`boundedString`, `requestHasConsent`)
- Pure aggregation style: `lib/analytics/product-metrics.ts`
- Data layer style: `lib/analytics/products.ts`, `lib/analytics/traffic.ts`, `lib/analytics/dashboard.ts`
- Tests live in `lib/__tests__/*.test.ts`; run with `pnpm vitest run <path>`
- Dashboard: `src/payload/components/AnalyticsDashboard.tsx`, table component `src/payload/components/analytics/RankingTable.tsx`

---

## File Structure

**New files**
- `lib/analytics/period.ts` — `resolvePeriod` / `previousPeriod` (pure)
- `lib/analytics/cart-metrics.ts` — `computeCartAbandonment` / `computeAtcFunnel` (pure)
- `src/payload/components/analytics/PeriodSelector.tsx` — client time-range selector
- `components/product/product-card-tracker.tsx` — client impression+click tracker
- `app/api/track/cart/route.ts` — add-to-cart capture
- `app/api/track/impressions/route.ts` — batched impression capture
- `app/api/track/click/route.ts` — click capture
- `lib/__tests__/analytics-period.test.ts`
- `lib/__tests__/analytics-discounted.test.ts`
- `lib/__tests__/analytics-cart.test.ts`
- `lib/__tests__/analytics-ctr.test.ts`

**Modified files**
- `prisma/schema.prisma` — `AddToCartEvent`, `ProductCtrDaily` models
- `lib/analytics/product-metrics.ts` — `joinDiscountedItems`, `computeCtr` + types
- `lib/analytics/products.ts` — `getDiscountedItemPerformance`, `getProductCtr`
- `lib/analytics/cart.ts` consumers untouched; new `lib/analytics/carts-data.ts` for cart queries (or extend `products.ts`)
- `src/payload/components/AnalyticsDashboard.tsx` — selector, window threading, three new sections
- `components/cart/add-to-cart.tsx` — fire add-to-cart beacon on success
- `components/product/product-card.tsx` — render the tracker
- `DECISIONS.md` — log CTR rollup + selector-plumbing decisions

---

# PHASE 04 — Time-Range Selector + Discounted-Item Report

No new capture. Pure data work over existing Products + Orders + the new period helper.

## Task 4.1: `resolvePeriod` pure helper

**Files:**
- Create: `lib/analytics/period.ts`
- Test: `lib/__tests__/analytics-period.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// lib/__tests__/analytics-period.test.ts — unit tests for period resolution
import { describe, it, expect } from 'vitest';
import { resolvePeriod, previousPeriod } from '@/lib/analytics/period';

const NOW = new Date('2026-06-15T10:30:00.000Z');

describe('resolvePeriod', () => {
  it('should default to the current calendar month when no params are given', () => {
    const p = resolvePeriod({}, NOW);
    expect(p.key).toBe('month');
    expect(p.start.toISOString()).toBe('2026-06-01T00:00:00.000Z');
    // end is last ms of the month
    expect(p.end.getUTCMonth()).toBe(5); // June (0-indexed)
    expect(p.end.getUTCDate()).toBe(30);
  });

  it('should resolve period=7d to a rolling 7-day window ending now', () => {
    const p = resolvePeriod({ period: '7d' }, NOW);
    expect(p.key).toBe('7d');
    expect(p.start.toISOString()).toBe('2026-06-09T00:00:00.000Z'); // 7 days inclusive of today
    expect(p.end.toISOString()).toBe('2026-06-15T23:59:59.999Z');
  });

  it('should resolve period=30d to a rolling 30-day window', () => {
    const p = resolvePeriod({ period: '30d' }, NOW);
    expect(p.start.toISOString()).toBe('2026-05-17T00:00:00.000Z');
    expect(p.end.toISOString()).toBe('2026-06-15T23:59:59.999Z');
  });

  it('should fall back to current month on an unknown period value', () => {
    const p = resolvePeriod({ period: 'bogus' }, NOW);
    expect(p.key).toBe('month');
  });

  it('should resolve a valid custom from/to range', () => {
    const p = resolvePeriod({ from: '2026-03-01', to: '2026-03-31' }, NOW);
    expect(p.key).toBe('custom');
    expect(p.start.toISOString()).toBe('2026-03-01T00:00:00.000Z');
    expect(p.end.toISOString()).toBe('2026-03-31T23:59:59.999Z');
  });

  it('should fall back to month when custom range is invalid (to before from)', () => {
    const p = resolvePeriod({ from: '2026-03-31', to: '2026-03-01' }, NOW);
    expect(p.key).toBe('month');
  });

  it('should fall back to month when a custom date is unparseable', () => {
    const p = resolvePeriod({ from: 'not-a-date', to: '2026-03-01' }, NOW);
    expect(p.key).toBe('month');
  });

  it('should fall back to month when custom range exceeds the 366-day cap', () => {
    const p = resolvePeriod({ from: '2024-01-01', to: '2026-01-01' }, NOW);
    expect(p.key).toBe('month');
  });
});

describe('previousPeriod', () => {
  it('should return the equally-long window immediately before the given one', () => {
    const p = resolvePeriod({ period: '7d' }, NOW); // 2026-06-09 .. 2026-06-15
    const prev = previousPeriod(p);
    expect(prev.end.getTime()).toBeLessThan(p.start.getTime());
    // same span (~7 days)
    const span = p.end.getTime() - p.start.getTime();
    expect(prev.end.getTime() - prev.start.getTime()).toBeCloseTo(span, -3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run lib/__tests__/analytics-period.test.ts`
Expected: FAIL — `Cannot find module '@/lib/analytics/period'`.

- [ ] **Step 3: Write the implementation**

```ts
// lib/analytics/period.ts — resolve the dashboard time window from URL params.
// Pure & dependency-free so it is unit-testable and reusable on client + server.

export type PeriodKey = 'month' | '7d' | '30d' | '90d' | 'custom';

export type ResolvedPeriod = {
  key: PeriodKey;
  start: Date;
  end: Date;
  /** Vietnamese label for the dashboard header. */
  label: string;
};

type Params = Record<string, string | string[] | undefined>;

const MAX_CUSTOM_DAYS = 366;
const DAY_MS = 24 * 60 * 60 * 1000;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

function endOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));
}

function currentMonth(now: Date): ResolvedPeriod {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));
  return { key: 'month', start, end, label: 'Tháng này' };
}

function rolling(now: Date, days: number, key: PeriodKey, label: string): ResolvedPeriod {
  const end = endOfUtcDay(now);
  const start = startOfUtcDay(new Date(now.getTime() - (days - 1) * DAY_MS));
  return { key, start, end, label };
}

export function resolvePeriod(params: Params, now = new Date()): ResolvedPeriod {
  const period = first(params.period);

  if (period === '7d') return rolling(now, 7, '7d', '7 ngày qua');
  if (period === '30d') return rolling(now, 30, '30d', '30 ngày qua');
  if (period === '90d') return rolling(now, 90, '90d', '90 ngày qua');

  const from = first(params.from);
  const to = first(params.to);
  if (from && to) {
    const fromDate = new Date(`${from}T00:00:00.000Z`);
    const toDate = new Date(`${to}T00:00:00.000Z`);
    const valid =
      !Number.isNaN(fromDate.getTime()) &&
      !Number.isNaN(toDate.getTime()) &&
      toDate.getTime() >= fromDate.getTime() &&
      toDate.getTime() - fromDate.getTime() <= MAX_CUSTOM_DAYS * DAY_MS;
    if (valid) {
      return {
        key: 'custom',
        start: startOfUtcDay(fromDate),
        end: endOfUtcDay(toDate),
        label: `${from} → ${to}`,
      };
    }
  }

  return currentMonth(now);
}

/** The equally-long window immediately preceding `p` — for period-over-period deltas. */
export function previousPeriod(p: ResolvedPeriod): { start: Date; end: Date } {
  const span = p.end.getTime() - p.start.getTime();
  const end = new Date(p.start.getTime() - 1);
  const start = new Date(end.getTime() - span);
  return { start, end };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run lib/__tests__/analytics-period.test.ts`
Expected: PASS (all 9 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/analytics/period.ts lib/__tests__/analytics-period.test.ts
git commit -m "feat(analytics): add resolvePeriod time-window helper"
```

## Task 4.2: `joinDiscountedItems` pure aggregation

**Files:**
- Modify: `lib/analytics/product-metrics.ts` (append)
- Test: `lib/__tests__/analytics-discounted.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// lib/__tests__/analytics-discounted.test.ts
import { describe, it, expect } from 'vitest';
import { joinDiscountedItems } from '@/lib/analytics/product-metrics';
import type { ProductSales } from '@/lib/analytics/product-metrics';

const onSale = [
  { productId: 'p1', slug: 'p1', title: 'Áo thun', salePercent: 20 },
  { productId: 'p2', slug: 'p2', title: 'Quần jean', salePercent: 50 },
];

const sales: ProductSales[] = [
  { productId: 'p1', productHandle: 'p1', productTitle: 'Áo thun', units: 3, revenueVnd: 300000 },
  { productId: 'p9', productHandle: 'p9', productTitle: 'Khác', units: 99, revenueVnd: 999 },
];

describe('joinDiscountedItems', () => {
  it('should pair on-sale products with their sales in the window', () => {
    const rows = joinDiscountedItems(onSale, sales);
    const p1 = rows.find((r) => r.productId === 'p1');
    expect(p1).toEqual({ productId: 'p1', slug: 'p1', title: 'Áo thun', salePercent: 20, units: 3, revenueVnd: 300000 });
  });

  it('should include on-sale products with zero sales so dead promos are visible', () => {
    const rows = joinDiscountedItems(onSale, sales);
    const p2 = rows.find((r) => r.productId === 'p2');
    expect(p2).toEqual({ productId: 'p2', slug: 'p2', title: 'Quần jean', salePercent: 50, units: 0, revenueVnd: 0 });
  });

  it('should not include non-sale products even if they sold', () => {
    const rows = joinDiscountedItems(onSale, sales);
    expect(rows.find((r) => r.productId === 'p9')).toBeUndefined();
  });

  it('should sort by revenue descending', () => {
    const rows = joinDiscountedItems(onSale, sales);
    expect(rows[0]?.productId).toBe('p1');
  });

  it('should return empty array when nothing is on sale', () => {
    expect(joinDiscountedItems([], sales)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run lib/__tests__/analytics-discounted.test.ts`
Expected: FAIL — `joinDiscountedItems` not exported.

- [ ] **Step 3: Append the implementation to `lib/analytics/product-metrics.ts`**

```ts
// ---------------------------------------------------------------------------
// Discounted-item report
// ---------------------------------------------------------------------------

export type OnSaleProduct = {
  productId: string;
  slug: string;
  title: string;
  salePercent: number;
};

export type DiscountedItemRow = {
  productId: string;
  slug: string;
  title: string;
  salePercent: number;
  units: number;
  revenueVnd: number;
};

/**
 * Pair on-sale products with their sales in the window. On-sale products with
 * no sales are kept (units/revenue 0) so underperforming promotions are visible.
 * Sorted by revenue descending.
 */
export function joinDiscountedItems(
  onSale: OnSaleProduct[],
  sales: ProductSales[],
): DiscountedItemRow[] {
  const salesMap = new Map(sales.map((s) => [s.productId, s]));
  return onSale
    .map((p) => {
      const s = salesMap.get(p.productId);
      return {
        productId: p.productId,
        slug: p.slug,
        title: p.title,
        salePercent: p.salePercent,
        units: s?.units ?? 0,
        revenueVnd: s?.revenueVnd ?? 0,
      };
    })
    .sort((a, b) => b.revenueVnd - a.revenueVnd);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run lib/__tests__/analytics-discounted.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/analytics/product-metrics.ts lib/__tests__/analytics-discounted.test.ts
git commit -m "feat(analytics): add joinDiscountedItems aggregation"
```

## Task 4.3: `getDiscountedItemPerformance` data layer

**Files:**
- Modify: `lib/analytics/products.ts`

- [ ] **Step 1: Add the data function** (no unit test — it touches Payload; covered by manual verification in Task 4.6)

Append to `lib/analytics/products.ts`:

```ts
import { joinDiscountedItems, type DiscountedItemRow, type OnSaleProduct } from '@/lib/analytics/product-metrics';
import config from '@payload-config';
import { getPayload } from 'payload';

export async function getDiscountedItemPerformance(
  start: Date,
  end: Date,
): Promise<DiscountedItemRow[]> {
  const payload = await getPayload({ config });
  const [onSaleResult, orders] = await Promise.all([
    payload.find({
      collection: 'products',
      where: { onSale: { equals: true } },
      pagination: false,
      limit: 1000,
      select: { title: true, slug: true, salePercent: true },
    }),
    fetchOrdersInRange(start, end),
  ]);

  const onSale: OnSaleProduct[] = onSaleResult.docs.map((d) => ({
    productId: String(d.id),
    slug: (d as { slug?: string }).slug ?? '',
    title: (d as { title?: string }).title ?? '',
    salePercent: (d as { salePercent?: number }).salePercent ?? 0,
  }));

  const sales = aggregateSales(orders.filter(isRevenueOrder));
  return joinDiscountedItems(onSale, sales);
}
```

> Note: `aggregateSales` and `isRevenueOrder` are already imported at the top of `products.ts`. Add only the imports not already present (`joinDiscountedItems`, types, `getPayload`, `config`). Verify imports don't duplicate.

- [ ] **Step 2: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: no new errors from `products.ts`.

- [ ] **Step 3: Commit**

```bash
git add lib/analytics/products.ts
git commit -m "feat(analytics): add getDiscountedItemPerformance data layer"
```

## Task 4.4: `PeriodSelector` client component

**Files:**
- Create: `src/payload/components/analytics/PeriodSelector.tsx`

- [ ] **Step 1: Implement** (UI component — verified visually in Task 4.6)

```tsx
'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { ReactElement } from 'react';

const PRESETS: { key: string; label: string }[] = [
  { key: 'month', label: 'Tháng này' },
  { key: '7d', label: '7 ngày' },
  { key: '30d', label: '30 ngày' },
  { key: '90d', label: '90 ngày' },
];

export function PeriodSelector(): ReactElement {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const active = params.get('period') ?? (params.get('from') ? 'custom' : 'month');

  const select = (key: string): void => {
    const next = new URLSearchParams(params.toString());
    next.delete('from');
    next.delete('to');
    if (key === 'month') next.delete('period');
    else next.set('period', key);
    router.replace(`${pathname}?${next.toString()}`);
  };

  return (
    <div className="dash__period-selector" role="group" aria-label="Khoảng thời gian">
      {PRESETS.map((p) => (
        <button
          key={p.key}
          type="button"
          aria-pressed={active === p.key}
          className={active === p.key ? 'is-active' : ''}
          onClick={() => select(p.key)}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

export default PeriodSelector;
```

- [ ] **Step 2: Commit**

```bash
git add src/payload/components/analytics/PeriodSelector.tsx
git commit -m "feat(analytics): add dashboard period selector"
```

## Task 4.5: Thread the window through the dashboard + add discounted section

**Files:**
- Modify: `src/payload/components/AnalyticsDashboard.tsx`

- [ ] **Step 1: Accept searchParams and resolve the window**

Replace the hardcoded month range. The Payload dashboard view receives `searchParams`. Change the component signature/body:

```tsx
import { resolvePeriod, previousPeriod } from '@/lib/analytics/period';
import { getDiscountedItemPerformance } from '@/lib/analytics/products';
import { PeriodSelector } from '@/src/payload/components/analytics/PeriodSelector';

type DashboardProps = {
  payload: PayloadRequest['payload'];
  searchParams?: Record<string, string | string[] | undefined>;
};

export async function AnalyticsDashboard(props: DashboardProps): Promise<ReactElement> {
  const now = new Date();
  const period = resolvePeriod(props.searchParams ?? {}, now);
  const prev = previousPeriod(period);

  const [currentOrders, lastOrders, trafficBySource, productPerformance, discounted] =
    await Promise.all([
      fetchOrdersInRange(period.start, period.end),
      fetchOrdersInRange(prev.start, prev.end),
      getTrafficBySource(period.start, period.end),
      getProductPerformance(period.start, period.end),
      getDiscountedItemPerformance(period.start, period.end),
    ]);
  // ...rest unchanged, but replace `monthLabelFormatter.format(now)` in the
  // header <span className="dash__period"> with {period.label}, and render
  // <PeriodSelector /> next to it.
```

Remove the now-unused `getMonthRange` import and the `currentStart/currentEnd/lastStart/lastEnd` lines.

- [ ] **Step 2: Render the selector in the header**

In the `<header className="dash__header">`, replace the period `<span>` with:

```tsx
<div className="dash__period-wrap">
  <span className="dash__period">{period.label}</span>
  <PeriodSelector />
</div>
```

- [ ] **Step 3: Add the discounted-items section** (after the top/bottom sellers `dash__split` block)

```tsx
<section className="dash-table-group">
  <header className="dash__shortcuts-head">
    <h2 className="dash__shortcuts-title">Sản phẩm khuyến mãi</h2>
    <p className="dash__shortcuts-subtitle">
      Hiệu quả của các sản phẩm đang giảm giá trong kỳ.
    </p>
  </header>
  <RankingTable
    title="Sản phẩm đang giảm giá"
    columns={[
      { key: 'product', label: 'Sản phẩm' },
      { key: 'salePercent', label: 'Giảm', align: 'right' },
      { key: 'units', label: 'Đã bán', align: 'right' },
      { key: 'revenue', label: 'Doanh thu', align: 'right' },
    ]}
    rows={discounted.map((d) => ({
      product: d.title || d.slug,
      salePercent: `${d.salePercent}%`,
      units: d.units.toLocaleString('vi-VN'),
      revenue: formatVnd(d.revenueVnd),
    }))}
    emptyLabel="Chưa có sản phẩm nào đang giảm giá."
  />
</section>
```

- [ ] **Step 4: Add minimal styles** for `.dash__period-selector` buttons + `.dash__period-wrap` in the dashboard's SCSS (`app/(payload)/custom.scss` — match existing `.dash__*` styling).

- [ ] **Step 5: Commit**

```bash
git add src/payload/components/AnalyticsDashboard.tsx 'app/(payload)/custom.scss'
git commit -m "feat(analytics): time-window selector + discounted-item dashboard section"
```

## Task 4.6: Verify Phase 04 end-to-end

- [ ] **Step 1: Confirm Payload passes `searchParams` to the dashboard view.** Run the app, open `/admin`, and append `?period=7d`. If the header label changes to "7 ngày qua" and tables recompute, plumbing works. If NOT, implement the cookie fallback: `PeriodSelector` writes a `dash_period` cookie then `router.refresh()`, and `AnalyticsDashboard` reads the cookie via `next/headers` `cookies()` instead of `searchParams`. Log whichever path was taken in `DECISIONS.md`.
- [ ] **Step 2:** Verify the discounted-items table lists products with `onSale === true` and correct units/revenue for the selected window.
- [ ] **Step 3:** `pnpm vitest run` — all analytics tests green.
- [ ] **Step 4:** Mark `.claude/phases/PHASE-04-active.md` → `PHASE-04-done.md`. Append the searchParams-vs-cookie decision to `DECISIONS.md`.

---

# PHASE 05 — Cart Abandonment

Carts-based headline (existing data) + new `add_to_cart` event funnel.

## Task 5.1: `computeCartAbandonment` + `computeAtcFunnel` pure functions

**Files:**
- Create: `lib/analytics/cart-metrics.ts`
- Test: `lib/__tests__/analytics-cart.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// lib/__tests__/analytics-cart.test.ts
import { describe, it, expect } from 'vitest';
import { computeCartAbandonment, computeAtcFunnel } from '@/lib/analytics/cart-metrics';

describe('computeCartAbandonment', () => {
  it('should count abandoned vs completed and compute the rate', () => {
    const r = computeCartAbandonment([
      { completed: false, itemCount: 2 },
      { completed: false, itemCount: 1 },
      { completed: true, itemCount: 3 },
    ]);
    expect(r).toEqual({ abandoned: 2, completed: 1, abandonmentPct: 66.7 });
  });

  it('should ignore empty carts (no items)', () => {
    const r = computeCartAbandonment([
      { completed: false, itemCount: 0 },
      { completed: true, itemCount: 1 },
    ]);
    expect(r).toEqual({ abandoned: 0, completed: 1, abandonmentPct: 0 });
  });

  it('should return zero rate when there are no carts', () => {
    expect(computeCartAbandonment([])).toEqual({ abandoned: 0, completed: 0, abandonmentPct: 0 });
  });

  it('should report 100% when every cart with items is abandoned', () => {
    const r = computeCartAbandonment([{ completed: false, itemCount: 1 }]);
    expect(r.abandonmentPct).toBe(100);
  });
});

describe('computeAtcFunnel', () => {
  it('should compute add-to-cart sessions and converted share', () => {
    const sessions = [
      { sessionId: 's1', customerId: 'c1' },
      { sessionId: 's2', customerId: 'c2' },
      { sessionId: 's3', customerId: null },
    ];
    const converted = new Set(['c1']);
    expect(computeAtcFunnel(sessions, converted)).toEqual({
      atcSessions: 3,
      convertedSessions: 1,
      conversionPct: 33.3,
    });
  });

  it('should return zeros when no sessions added to cart', () => {
    expect(computeAtcFunnel([], new Set())).toEqual({
      atcSessions: 0,
      convertedSessions: 0,
      conversionPct: 0,
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run lib/__tests__/analytics-cart.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// lib/analytics/cart-metrics.ts — PURE cart-abandonment + add-to-cart funnel math.

export type CartAbandonment = {
  abandoned: number;
  completed: number;
  /** abandoned / (abandoned + completed), 0–100, one decimal. */
  abandonmentPct: number;
};

export type AtcFunnel = {
  atcSessions: number;
  convertedSessions: number;
  /** convertedSessions / atcSessions, 0–100, one decimal. */
  conversionPct: number;
};

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Carts with items only. `completed` carts checked out; the rest are abandoned. */
export function computeCartAbandonment(
  carts: { completed: boolean; itemCount: number }[],
): CartAbandonment {
  const withItems = carts.filter((c) => c.itemCount > 0);
  const completed = withItems.filter((c) => c.completed).length;
  const abandoned = withItems.length - completed;
  const denom = abandoned + completed;
  return {
    abandoned,
    completed,
    abandonmentPct: denom > 0 ? round1((abandoned / denom) * 100) : 0,
  };
}

/** Of the distinct sessions that added to cart, how many belong to a converted customer. */
export function computeAtcFunnel(
  sessions: { sessionId: string; customerId: string | null }[],
  convertedCustomerIds: Set<string>,
): AtcFunnel {
  const atcSessions = sessions.length;
  const convertedSessions = sessions.filter(
    (s) => s.customerId && convertedCustomerIds.has(s.customerId),
  ).length;
  return {
    atcSessions,
    convertedSessions,
    conversionPct: atcSessions > 0 ? round1((convertedSessions / atcSessions) * 100) : 0,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run lib/__tests__/analytics-cart.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/analytics/cart-metrics.ts lib/__tests__/analytics-cart.test.ts
git commit -m "feat(analytics): add cart-abandonment + add-to-cart funnel math"
```

## Task 5.2: `AddToCartEvent` Prisma model + migration

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add the model** (place near `ProductViewEvent`)

```prisma
/**
 * A single add-to-cart action. Consent-gated, pseudonymous. `customerId` is set
 * server-side from the auth session (never trusted from the client body) so the
 * add-to-cart → purchase funnel can join against converted customers.
 */
model AddToCartEvent {
  id            String   @id @default(cuid())
  anonId        String
  sessionId     String
  customerId    String?
  productId     String
  productHandle String   @default("")
  quantity      Int      @default(1)
  createdAt     DateTime @default(now())

  @@index([sessionId])
  @@index([productId])
  @@index([createdAt])
}
```

- [ ] **Step 2: Create and apply the migration**

Run: `pnpm exec prisma migrate dev --name add_to_cart_event`
Expected: migration created under `prisma/migrations/`, client regenerated.

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(analytics): add AddToCartEvent model + migration"
```

## Task 5.3: `/api/track/cart` capture route

**Files:**
- Create: `app/api/track/cart/route.ts`

- [ ] **Step 1: Implement** (mirror `app/api/track/session/route.ts` — derive customerId from auth, never the body)

```ts
// app/api/track/cart/route.ts — record one add-to-cart action.
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { boundedString, requestHasConsent } from '@/lib/analytics/track-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const noContent = (): NextResponse => new NextResponse(null, { status: 204 });

export async function POST(req: Request): Promise<NextResponse> {
  if (!requestHasConsent(req)) return noContent();

  let raw: Record<string, unknown>;
  try {
    raw = (await req.json()) as Record<string, unknown>;
  } catch {
    return noContent();
  }

  const anonId = boundedString(raw.anonId, 64);
  const sessionId = boundedString(raw.sessionId, 64);
  const productId = boundedString(raw.productId, 128);
  if (!anonId || !sessionId || !productId) return noContent();

  const productHandle = boundedString(raw.productHandle, 256) ?? '';
  const qtyRaw = typeof raw.quantity === 'number' ? raw.quantity : Number(raw.quantity);
  const quantity = Number.isFinite(qtyRaw) && qtyRaw > 0 ? Math.min(Math.round(qtyRaw), 999) : 1;

  const session = await auth();
  const customerId = session?.user?.id ?? null;

  try {
    await prisma.addToCartEvent.create({
      data: { anonId, sessionId, customerId, productId, productHandle, quantity },
    });
  } catch {
    // Swallow — dropped analytics write, not a client-facing failure.
  }

  return noContent();
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/track/cart/route.ts
git commit -m "feat(analytics): add /api/track/cart capture route"
```

## Task 5.4: Fire the add-to-cart beacon

**Files:**
- Modify: `components/cart/add-to-cart.tsx`

- [ ] **Step 1:** Import the beacon helpers and fire on the success path (after `toast.success`, before/after `router.refresh()`):

```tsx
import { beacon, getAnonId, getSession } from '@/lib/analytics/track-client';
```

Inside the `startTransition` success branch (after a successful add):

```tsx
beacon('/api/track/cart', {
  anonId: getAnonId(),
  sessionId: getSession().id,
  productId: product.id,
  productHandle: product.handle,
  quantity,
});
```

`beacon` is a no-op without consent, so no extra gating is needed.

- [ ] **Step 2: Commit**

```bash
git add components/cart/add-to-cart.tsx
git commit -m "feat(analytics): beacon add-to-cart events from the add button"
```

## Task 5.5: Cart-abandonment data layer

**Files:**
- Create: `lib/analytics/carts-data.ts`

- [ ] **Step 1: Implement** (queries Payload `carts` + Prisma `addToCartEvent`; reuses the converted-customer join pattern from `traffic.ts`)

```ts
// lib/analytics/carts-data.ts — DATA layer for cart abandonment + ATC funnel.
import config from '@payload-config';
import { getPayload } from 'payload';
import { prisma } from '@/lib/prisma';
import { fetchOrdersInRange, isRevenueOrder } from '@/lib/analytics/dashboard';
import {
  computeCartAbandonment,
  computeAtcFunnel,
  type CartAbandonment,
  type AtcFunnel,
} from '@/lib/analytics/cart-metrics';

async function fetchConvertedCustomerIds(start: Date, end: Date): Promise<Set<string>> {
  const orders = await fetchOrdersInRange(start, end);
  const paidEmails = new Set(
    orders
      .filter(isRevenueOrder)
      .map((o) => o.buyerEmail?.trim().toLowerCase())
      .filter((e): e is string => Boolean(e)),
  );
  if (paidEmails.size === 0) return new Set();
  const users = await prisma.user.findMany({
    where: { email: { in: [...paidEmails] } },
    select: { id: true },
  });
  return new Set(users.map((u) => u.id));
}

export async function getCartAbandonment(
  start: Date,
  end: Date,
): Promise<{ abandonment: CartAbandonment; funnel: AtcFunnel }> {
  const payload = await getPayload({ config });

  const [cartsResult, atcEvents, convertedCustomerIds] = await Promise.all([
    payload.find({
      collection: 'carts',
      where: { updatedAt: { greater_than: start.toISOString(), less_than: end.toISOString() } },
      pagination: false,
      limit: 5000,
      select: { completed: true, cartItems: true },
    }),
    prisma.addToCartEvent.findMany({
      where: { createdAt: { gte: start, lte: end } },
      select: { sessionId: true, customerId: true },
    }),
    fetchConvertedCustomerIds(start, end),
  ]);

  const carts = cartsResult.docs.map((c) => ({
    completed: (c as { completed?: boolean }).completed === true,
    itemCount: ((c as { cartItems?: unknown[] }).cartItems ?? []).length,
  }));

  // Distinct ATC sessions, keeping the first non-null customerId seen.
  const sessionMap = new Map<string, string | null>();
  for (const e of atcEvents) {
    const existing = sessionMap.get(e.sessionId);
    if (existing === undefined || (existing === null && e.customerId)) {
      sessionMap.set(e.sessionId, e.customerId ?? null);
    }
  }
  const sessions = [...sessionMap.entries()].map(([sessionId, customerId]) => ({ sessionId, customerId }));

  return {
    abandonment: computeCartAbandonment(carts),
    funnel: computeAtcFunnel(sessions, convertedCustomerIds),
  };
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add lib/analytics/carts-data.ts
git commit -m "feat(analytics): add cart-abandonment data layer"
```

## Task 5.6: Cart-abandonment dashboard section

**Files:**
- Modify: `src/payload/components/AnalyticsDashboard.tsx`

- [ ] **Step 1:** Import and fetch in the `Promise.all`:

```tsx
import { getCartAbandonment } from '@/lib/analytics/carts-data';
// add to Promise.all:  getCartAbandonment(period.start, period.end)  → const cart
```

- [ ] **Step 2:** Add a metric-card row + a small funnel line after the discounted section:

```tsx
<section className="dash-table-group">
  <header className="dash__shortcuts-head">
    <h2 className="dash__shortcuts-title">Giỏ hàng bị bỏ quên</h2>
    <p className="dash__shortcuts-subtitle">
      Số giỏ có sản phẩm nhưng chưa thanh toán trong kỳ.
    </p>
  </header>
  <ul className="dash__metrics">
    <li><MetricCard tone="orders" icon={<ShoppingBag size={18} aria-hidden />} title="Giỏ bị bỏ" value={cart.abandonment.abandoned.toLocaleString('vi-VN')} /></li>
    <li><MetricCard tone="paid" icon={<Wallet2 size={18} aria-hidden />} title="Giỏ hoàn tất" value={cart.abandonment.completed.toLocaleString('vi-VN')} /></li>
    <li><MetricCard tone="value" icon={<Receipt size={18} aria-hidden />} title="Tỉ lệ bỏ giỏ" value={`${cart.abandonment.abandonmentPct}%`} /></li>
    <li><MetricCard tone="revenue" icon={<Wallet size={18} aria-hidden />} title="Thêm giỏ → mua" value={`${cart.funnel.conversionPct}%`} /></li>
  </ul>
</section>
```

- [ ] **Step 3: Commit**

```bash
git add src/payload/components/AnalyticsDashboard.tsx
git commit -m "feat(analytics): cart-abandonment dashboard section"
```

## Task 5.7: Verify Phase 05

- [ ] **Step 1:** `pnpm vitest run` — cart tests green.
- [ ] **Step 2:** With analytics consent accepted, add an item to cart; confirm a row lands in `AddToCartEvent` (`pnpm exec prisma studio` or a `SELECT`). With consent absent/declined, confirm NO row is written.
- [ ] **Step 3:** Confirm the dashboard cart section shows non-zero counts after seeding a few abandoned/completed carts.
- [ ] **Step 4:** Rename `PHASE-05-active.md` → `PHASE-05-done.md`.

---

# PHASE 06 — Product Click-Through Rate

Listing impression → PDP click, stored as a daily rollup.

## Task 6.1: `computeCtr` pure aggregation

**Files:**
- Modify: `lib/analytics/product-metrics.ts` (append)
- Test: `lib/__tests__/analytics-ctr.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// lib/__tests__/analytics-ctr.test.ts
import { describe, it, expect } from 'vitest';
import { computeCtr } from '@/lib/analytics/product-metrics';

describe('computeCtr', () => {
  it('should compute ctrPct = clicks / impressions', () => {
    const rows = computeCtr([{ productId: 'p1', impressions: 200, clicks: 10 }]);
    expect(rows[0]).toEqual({ productId: 'p1', impressions: 200, clicks: 10, ctrPct: 5 });
  });

  it('should sort by impressions descending', () => {
    const rows = computeCtr([
      { productId: 'a', impressions: 10, clicks: 1 },
      { productId: 'b', impressions: 100, clicks: 1 },
    ]);
    expect(rows[0]?.productId).toBe('b');
  });

  it('should drop products below the min-impression threshold', () => {
    const rows = computeCtr(
      [
        { productId: 'a', impressions: 5, clicks: 5 },
        { productId: 'b', impressions: 100, clicks: 1 },
      ],
      { minImpressions: 20 },
    );
    expect(rows.map((r) => r.productId)).toEqual(['b']);
  });

  it('should report 0% ctr when impressions are zero (filtered out by default threshold)', () => {
    const rows = computeCtr([{ productId: 'a', impressions: 0, clicks: 0 }], { minImpressions: 0 });
    expect(rows[0]?.ctrPct).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run lib/__tests__/analytics-ctr.test.ts`
Expected: FAIL — `computeCtr` not exported.

- [ ] **Step 3: Append to `lib/analytics/product-metrics.ts`**

```ts
// ---------------------------------------------------------------------------
// Click-through rate
// ---------------------------------------------------------------------------

export type CtrRow = {
  productId: string;
  impressions: number;
  clicks: number;
  /** clicks / impressions, 0–100, one decimal. */
  ctrPct: number;
};

/**
 * Compute CTR per product from summed impression/click counts, sorted by
 * impressions descending. Products below `minImpressions` (default 20) are
 * dropped to suppress noisy ratios from tiny sample sizes.
 */
export function computeCtr(
  rows: { productId: string; impressions: number; clicks: number }[],
  opts?: { minImpressions?: number },
): CtrRow[] {
  const minImpressions = opts?.minImpressions ?? 20;
  return rows
    .filter((r) => r.impressions >= minImpressions)
    .map((r) => ({
      productId: r.productId,
      impressions: r.impressions,
      clicks: r.clicks,
      ctrPct: r.impressions > 0 ? round1((r.clicks / r.impressions) * 100) : 0,
    }))
    .sort((a, b) => b.impressions - a.impressions);
}
```

> `round1` already exists at the top of `product-metrics.ts` — reuse it, don't redefine.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run lib/__tests__/analytics-ctr.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/analytics/product-metrics.ts lib/__tests__/analytics-ctr.test.ts
git commit -m "feat(analytics): add computeCtr aggregation"
```

## Task 6.2: `ProductCtrDaily` Prisma model + migration

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add the model**

```prisma
/**
 * Daily rollup of product-card impressions and clicks. NOT per-event:
 * impressions are far higher volume than page views, so endpoints
 * upsert-and-increment one row per (product, day). CTR = clicks / impressions.
 */
model ProductCtrDaily {
  id          String   @id @default(cuid())
  productId   String
  day         DateTime @db.Date
  impressions Int      @default(0)
  clicks      Int      @default(0)

  @@unique([productId, day])
  @@index([day])
}
```

- [ ] **Step 2: Migrate**

Run: `pnpm exec prisma migrate dev --name product_ctr_daily`
Expected: migration applied, client regenerated.

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(analytics): add ProductCtrDaily rollup model + migration"
```

## Task 6.3: Impression + click capture routes

**Files:**
- Create: `app/api/track/impressions/route.ts`
- Create: `app/api/track/click/route.ts`

- [ ] **Step 1: Implement the impressions route** (batched array; upsert-increment per product for the current UTC day)

```ts
// app/api/track/impressions/route.ts — batched product-card impressions.
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { boundedString, requestHasConsent } from '@/lib/analytics/track-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const noContent = (): NextResponse => new NextResponse(null, { status: 204 });

function utcDay(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
}

export async function POST(req: Request): Promise<NextResponse> {
  if (!requestHasConsent(req)) return noContent();

  let raw: Record<string, unknown>;
  try {
    raw = (await req.json()) as Record<string, unknown>;
  } catch {
    return noContent();
  }

  const items = Array.isArray(raw.items) ? raw.items : [];
  const ids = items
    .map((it) => boundedString((it as { productId?: unknown })?.productId, 128))
    .filter((id): id is string => Boolean(id))
    .slice(0, 200); // cap batch size
  if (ids.length === 0) return noContent();

  const day = utcDay();
  try {
    await prisma.$transaction(
      ids.map((productId) =>
        prisma.productCtrDaily.upsert({
          where: { productId_day: { productId, day } },
          create: { productId, day, impressions: 1, clicks: 0 },
          update: { impressions: { increment: 1 } },
        }),
      ),
    );
  } catch {
    // Swallow — dropped analytics write.
  }

  return noContent();
}
```

- [ ] **Step 2: Implement the click route**

```ts
// app/api/track/click/route.ts — one product-card click-through.
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { boundedString, requestHasConsent } from '@/lib/analytics/track-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const noContent = (): NextResponse => new NextResponse(null, { status: 204 });

function utcDay(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
}

export async function POST(req: Request): Promise<NextResponse> {
  if (!requestHasConsent(req)) return noContent();

  let raw: Record<string, unknown>;
  try {
    raw = (await req.json()) as Record<string, unknown>;
  } catch {
    return noContent();
  }

  const productId = boundedString(raw.productId, 128);
  if (!productId) return noContent();

  const day = utcDay();
  try {
    await prisma.productCtrDaily.upsert({
      where: { productId_day: { productId, day } },
      create: { productId, day, impressions: 0, clicks: 1 },
      update: { clicks: { increment: 1 } },
    });
  } catch {
    // Swallow.
  }

  return noContent();
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/track/impressions/route.ts app/api/track/click/route.ts
git commit -m "feat(analytics): add impression + click capture routes"
```

## Task 6.4: `ProductCardTracker` client component + wiring

**Files:**
- Create: `components/product/product-card-tracker.tsx`
- Modify: `components/product/product-card.tsx`

- [ ] **Step 1: Implement the tracker** (observes its parent `<a>` card; counts one impression at ≥50% visible for ≥1s; batches via a module-level queue flushed on pagehide; clicks beacon immediately)

```tsx
'use client';

import { useEffect, useRef } from 'react';
import { beacon, getAnonId, getSession } from '@/lib/analytics/track-client';
import { hasAnalyticsConsent } from '@/components/cookie-consent';

type Props = { productId: string; productHandle: string };

// Module-level queue: batch impressions across all cards on the page, flush once.
const queue = new Set<string>();
let flushBound = false;

function flush(): void {
  if (queue.size === 0) return;
  const items = [...queue].map((productId) => ({ productId }));
  queue.clear();
  beacon('/api/track/impressions', {
    anonId: getAnonId(),
    sessionId: getSession().id,
    items,
  });
}

function ensureFlushBound(): void {
  if (flushBound || typeof window === 'undefined') return;
  flushBound = true;
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
}

const VISIBLE_RATIO = 0.5;
const DWELL_MS = 1000;

export default function ProductCardTracker({ productId, productHandle }: Props): null {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!hasAnalyticsConsent()) return;
    ensureFlushBound();
    const card = ref.current?.closest('a');
    if (!card) return;

    let counted = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= VISIBLE_RATIO) {
            if (!counted && timer === null) {
              timer = setTimeout(() => {
                if (!counted) {
                  counted = true;
                  queue.add(productId);
                }
              }, DWELL_MS);
            }
          } else if (timer !== null) {
            clearTimeout(timer);
            timer = null;
          }
        }
      },
      { threshold: [VISIBLE_RATIO] },
    );
    io.observe(card);

    const onClick = (): void => {
      beacon('/api/track/click', {
        anonId: getAnonId(),
        sessionId: getSession().id,
        productId,
        productHandle,
      });
    };
    card.addEventListener('click', onClick);

    return () => {
      io.disconnect();
      card.removeEventListener('click', onClick);
      if (timer !== null) clearTimeout(timer);
    };
  }, [productId, productHandle]);

  return <span ref={ref} aria-hidden style={{ display: 'none' }} />;
}
```

- [ ] **Step 2: Render it inside the ProductCard `<Link>`** (add near `<WishlistButton …/>`, inside the link so `closest('a')` resolves):

```tsx
import ProductCardTracker from '@/components/product/product-card-tracker';
// ...inside the <Link>, e.g. just after the image <div> opens or near WishlistButton:
<ProductCardTracker productId={product.id} productHandle={product.handle} />
```

- [ ] **Step 3: Commit**

```bash
git add components/product/product-card-tracker.tsx components/product/product-card.tsx
git commit -m "feat(analytics): track product-card impressions + clicks"
```

## Task 6.5: `getProductCtr` data layer

**Files:**
- Modify: `lib/analytics/products.ts`

- [ ] **Step 1: Implement** (sum daily rollup rows across the window, resolve titles)

```ts
import { computeCtr, type CtrRow } from '@/lib/analytics/product-metrics';

export async function getProductCtr(start: Date, end: Date): Promise<CtrRow[]> {
  const daily = await prisma.productCtrDaily.findMany({
    where: { day: { gte: start, lte: end } },
    select: { productId: true, impressions: true, clicks: true },
  });

  const map = new Map<string, { impressions: number; clicks: number }>();
  for (const row of daily) {
    const e = map.get(row.productId) ?? { impressions: 0, clicks: 0 };
    e.impressions += row.impressions;
    e.clicks += row.clicks;
    map.set(row.productId, e);
  }

  return computeCtr(
    [...map.entries()].map(([productId, v]) => ({ productId, ...v })),
  );
}
```

- [ ] **Step 2: Type-check & commit**

Run: `pnpm exec tsc --noEmit` → no new errors.

```bash
git add lib/analytics/products.ts
git commit -m "feat(analytics): add getProductCtr data layer"
```

## Task 6.6: CTR dashboard section

**Files:**
- Modify: `src/payload/components/AnalyticsDashboard.tsx`

- [ ] **Step 1:** Import `getProductCtr`, add to `Promise.all` (`const ctr`). To show product titles, build a lookup from `productPerformance.viewToBuy` (each row already has `productId` and `productTitle`/`productHandle`), defined just before the `return`:

```tsx
const titleMap = new Map(
  productPerformance.viewToBuy.map((v) => [v.productId, v.productTitle || v.productHandle]),
);
const titleFor = (id: string): string => titleMap.get(id) || id;
```

- [ ] **Step 2:** Add the section after the cart section:

```tsx
<section className="dash-table-group">
  <header className="dash__shortcuts-head">
    <h2 className="dash__shortcuts-title">Tỷ lệ nhấp (CTR)</h2>
    <p className="dash__shortcuts-subtitle">
      Lượt hiển thị trong danh sách so với lượt nhấp vào sản phẩm.
    </p>
  </header>
  <RankingTable
    title="Tỷ lệ nhấp theo sản phẩm"
    columns={[
      { key: 'product', label: 'Sản phẩm' },
      { key: 'impressions', label: 'Hiển thị', align: 'right' },
      { key: 'clicks', label: 'Nhấp', align: 'right' },
      { key: 'ctr', label: 'CTR', align: 'right' },
    ]}
    rows={ctr.map((c) => ({
      product: titleFor(c.productId), // helper built in Step 1; fallback to productId
      impressions: c.impressions.toLocaleString('vi-VN'),
      clicks: c.clicks.toLocaleString('vi-VN'),
      ctr: `${c.ctrPct}%`,
    }))}
    emptyLabel="Chưa đủ dữ liệu hiển thị."
  />
</section>
```

- [ ] **Step 3: Commit**

```bash
git add src/payload/components/AnalyticsDashboard.tsx
git commit -m "feat(analytics): CTR dashboard section"
```

## Task 6.7: Verify Phase 06 + log decisions

- [ ] **Step 1:** `pnpm vitest run` — full suite green.
- [ ] **Step 2:** With consent accepted, scroll a product grid; confirm `ProductCtrDaily` impressions increment (one per card per page view, not per scroll). Click a card; confirm `clicks` increments. With consent declined, confirm nothing is written.
- [ ] **Step 3:** Confirm the dashboard CTR table renders with sensible ratios for the selected window.
- [ ] **Step 4:** Append to `DECISIONS.md`: the CTR daily-rollup-vs-per-event decision (volume rationale) and the searchParams-vs-cookie plumbing outcome from Phase 04.
- [ ] **Step 5:** Rename `PHASE-06-active.md` → `PHASE-06-done.md`.

---

## Final verification

- [ ] `pnpm vitest run` — all analytics tests pass.
- [ ] `pnpm exec tsc --noEmit` — no new type errors.
- [ ] `pnpm build` succeeds.
- [ ] Manual: consent OFF → zero rows written across all three capture routes; consent ON → rows written and dashboard reflects them for the selected window.
- [ ] Use superpowers:requesting-code-review before merging.
