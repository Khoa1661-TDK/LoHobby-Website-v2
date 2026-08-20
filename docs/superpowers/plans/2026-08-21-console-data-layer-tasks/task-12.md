# Implementation task (from the console data layer plan)

Repo: /home/khoa1661/Ecommerce-Web — Next.js 15 App Router + Payload CMS 3 + Prisma, TypeScript strict.
Implement ONLY the task below. Do not commit. Report which files you changed.

## Global Constraints

Every task's requirements implicitly include this section.

1. **No character-class regex anywhere under `lib/`.** Tailwind scans `lib/`; a regex containing `[` `]` there has previously destroyed the entire stylesheet and 500'd every page. Use `Intl.NumberFormat` / `Intl.DateTimeFormat` and string methods only.
2. **No file under `src/payload/collections/` or `src/payload/globals/` may import from `lib/console/`.** `lib/console/*` top-level imports `@payload-config`; a collection importing it TDZ-crashes every Payload route with "Cannot access 'j' before initialization".
3. **Payload `join` fields return bare ids at `depth: 0`.** Any query that reads `product.variants.docs[].stock` must pass `depth: 1`.
4. **Payload relationship ids are numeric** (`defaultIDType = number`). Never write a `String()` id back to Payload. Reading is fine; console row `id` fields are strings, so `String(doc.id)` on the *way out* is correct.
5. **Test files must `import { describe, it, expect } from 'vitest'`.** `globals: true` is runtime-only; `tsc --noEmit` fails without the import.
6. **Tests live in `lib/__tests__/*.test.ts`.** A test outside the configured globs is silently skipped.
7. **Do not run `pnpm <script>`** — a `runDepsStatusCheck` wrapper fails. Call binaries directly: `node_modules/.bin/tsc --noEmit`, `node_modules/.bin/vitest run`.
8. **Component JSX text is frozen.** Every Vietnamese string, class name, `var(--adm-*)` token and element in `components/console/**` was verified against a design artboard at 96–100% fidelity. A task may add a props parameter and swap a module-const identifier for a prop. A task may **not** reword copy, change a class, or restructure markup. `git diff` on a component must show only the data-source change (plus the two documented wireframe exceptions in Tasks 6 and 7).
9. **No new Payload collection, field, or global, and no migration.** A new Payload field without a generated migration throws `42P01` at runtime here.
10. **No caching.** Console readers hit the database on every request; `app/(console)/admin/layout.tsx` already sets `dynamic = 'force-dynamic'`.
11. **Reads only.** No task adds a write, mutation, or server action. The tab strips, filter bars and pagination controls stay inert.
12. **The three crawler screens are untouched** (`app/(console)/admin/console/crawl/**`, `components/console/crawl/**`, `components/console/queue/**`). They keep their fixtures.
13. Every file this plan creates starts with a `// path/to/file.ts` comment line followed by a short purpose note, matching the existing console files.
14. **`lib/__tests__/vitest-setup.ts` mocks `@/lib/prisma-client`.** `lib/prisma-client.ts` builds the client at module scope and throws when `DATABASE_URL` is unset, so without the mock a test could not even import a Prisma-backed adapter. Consequence: only the **pure mappers** are unit-testable. Never write a unit test that calls an async reader.
15. **Prisma import paths are fixed:** the client is `import prisma from '@/lib/prisma'` (default export, carries the `server-only` guard); model types are `import type { Coupon } from '@/generated/prisma/client'`; enums are `import { CampaignStatus } from '@/generated/prisma/enums'`. Never import `@/lib/prisma-client` directly.

### Vocabulary the mappers must translate

| Source | Console |
|---|---|
| Payload `orderStatus: 'canceled'` (one L) | `OrderStatus: 'cancelled'` (two L) |
| Payload `Order.orderId` (numeric string, e.g. `'2031'`) | `'#DH-2031'` |
| Prisma `CampaignStatus.CANCELLED` | `CampaignStatus: 'cancelled'` (added in Task 11) |
| VND integer `450000` | `'450.000 ₫'` (U+20AB, **not** the `'450.000 VND'` that `lib/analytics/currency.ts` `formatVnd` returns) |
| ISO timestamp | `'20/08'` in lists, `'20/08/2026, 09:14'` in the order detail header |

Minus signs in discount copy are U+2212 `−`, not the ASCII hyphen — matching the existing fixtures (`'−15%'`, `'−45.000 ₫'`).

---

## Existing reference code — read these before writing
- `lib/console/orders.ts` — the pattern for a Payload-collection area (pure mapper + thin readers).
- `lib/console/reviews.ts` — the pattern for a Prisma-backed area.
- `lib/console/settings.ts` — the pattern for a Payload-global area.
- `lib/console/format.ts` — exports `formatVndSymbol`, `formatOrderCode`, `formatDayMonth`, `formatDateTime`, `formatPercent`, `formatCount`. Import from `./format`.

---

### Task 12: Dashboard adapter — DELEGATED

**Files:**
- Create: `lib/console/dashboard.ts`
- Test: `lib/__tests__/console-dashboard.test.ts`
- Modify: `components/console/dashboard/RecentOrders.tsx`
- Modify: `components/console/dashboard/TopProductsTable.tsx`
- Modify: `components/console/dashboard/TrafficSources.tsx`
- Modify: `components/console/dashboard/ConversionFunnel.tsx`
- Modify: `components/console/dashboard/RevenueChart.tsx`
- Modify: `app/(console)/admin/console/page.tsx`

This is the largest task. Five components become prop-driven and one adapter assembles six different metric shapes.

**Interfaces:**
- Consumes:
  - `getOrderAnalyticsSummary(rangeDays?: number): Promise<OrderAnalyticsSummary>` from `@/lib/analytics/orders`. Returns `{ rangeDays, from, to, orderCount, paidOrderCount, revenueVnd, averageOrderVnd, byPaymentStatus, byOrderStatus, dailyRevenue: Array<{ date: string; revenueVnd: number; orders: number }>, topProducts: Array<{ productId: string; title: string; quantity: number; revenueVnd: number }> }`.
  - `getTrafficBySource(start: Date, end: Date): Promise<SourceTraffic[]>` from `@/lib/analytics/traffic`. Inspect the `SourceTraffic` type before mapping it.
  - `prisma` from `@/lib/prisma` for the funnel counts.
  - `listOrderRows` is **not** reused here — the dashboard's `RecentOrder` shape differs from `OrderRow`. Call `listRecentOrders({ status: 'all', limit: 3 })` from `@/lib/payload-orders` directly.
  - `formatVndSymbol`, `formatCount`, `formatPercent`, `formatOrderCode`, `formatDayMonth` from `@/lib/console/format`.
  - The `Kpi` type from `@/components/console/dashboard/KpiCard`, and the `RecentOrder`, `TopProductRow`, `TrafficSource` types from their components.
- Produces:
  - `type DashboardData = { kpis: Kpi[]; revenue: RevenueSeries; funnel: FunnelStage[]; topProducts: TopProductRow[]; traffic: TrafficSource[]; recentOrders: RecentOrder[] }`
  - `type RevenueSeries = { points: string; area: string; days: string[] }`
  - `type FunnelStage = { label: string; value: string; width: string; drop?: string }` — **exported from `ConversionFunnel.tsx`**, which currently declares it privately. Add `export` to that interface; do not move it.
  - `buildRevenueSeries(daily: Array<{ date: string; revenueVnd: number }>): RevenueSeries` — pure, unit-tested.
  - `buildFunnel(views: number, addToCarts: number, purchases: number): FunnelStage[]` — pure, unit-tested.
  - `toRecentOrder(doc: Order): RecentOrder` — pure, unit-tested.
  - `getDashboardData(rangeDays?: number): Promise<DashboardData>`

**Key facts:**
- `RevenueChart` draws into a fixed `viewBox="0 0 560 200"` with `preserveAspectRatio="none"`. `buildRevenueSeries` must produce the same coordinate space: x spread evenly across `0…540`, y inverted so a higher revenue is a *smaller* y, clamped to `0…180`. `area` is `points` plus the two closing corners `540,200 0,200`. `days` is each `dailyRevenue[].date` run through `formatDayMonth`. When every day has the same revenue (including all-zero), there is no range to scale against: put every point at `y = 180`, the baseline. With fewer than two data points, return `{ points: '', area: '', days: [] }` and have the component render the empty `<svg>` — do not fabricate a line.
- `buildFunnel` reproduces the existing three stages exactly: labels `'Lượt xem sản phẩm'`, `'Thêm giỏ hàng'`, `'Mua hàng'`; `value` is `formatCount(...)`; `width` is `'100%'` for the first stage and `` `${Math.round((stage / views) * 100)}%` `` for the rest, floored at `'2%'` so a tiny stage is still visible; `drop` is `` `↓ ${formatPercent(dropPercent)}` `` on all but the last stage. When `views` is 0, every width is `'2%'` and every drop is omitted. `ConversionFunnel` keys its special-casing off `stage.label === 'Mua hàng'` — keep those labels byte-identical or the last bar loses its ok-tone fill.
- Funnel counts come from Prisma: `prisma.productViewEvent.count(...)`, `prisma.addToCartEvent.count(...)`, `prisma.purchaseEvent.count(...)`, each filtered `createdAt >= from`. Confirm the model and timestamp field names in `prisma/schema.prisma` before writing them.
- `RecentOrder` is `{ code: string; customer: string; amount: string; status: string; tone: PillTone }`. Reuse the console `ORDER_TONE` and `ORDER_LABEL` maps from `@/components/console/orders/types` after translating `'canceled'` to `'cancelled'` — the same translation Task 2 wrote. Import `toOrderRow` from `@/lib/console/orders` and derive from its output rather than repeating the status logic.
- `TopProductRow` is `{ name: string; impressions: string; clicks: string; ctr: string }`. `getOrderAnalyticsSummary().topProducts` carries quantity and revenue, **not** impressions and clicks. Impressions and clicks come from `prisma.productCtrDaily` (confirm the model name and its column names). Take the top 3 by CTR over the range. If `productCtrDaily` has no rows for the range, return an empty array and let the table render empty — do not substitute order data under CTR headings.
- The four KPI cards keep their exact labels: `'Doanh thu 7 ngày'`, `'Đơn hàng mới'`, `'Tỉ lệ chuyển đổi'`, `'Phiên truy cập'`. The first label's `7` must track the selected range — build it as `` `Doanh thu ${rangeDays} ngày` ``. `delta` strings keep the `'↑ '` / `'↓ '` prefix and the `'so với kỳ trước'` suffix; compute the comparison against the immediately preceding window of the same length. When there is no prior data, use `'—'` as the delta and `up: true`.
- The dashboard's crawler status banner (`Crawler: Máy trạm ngoại tuyến`, `Lần crawl gần nhất: …`) is **crawler UI and stays a fixture** — Global Constraint 12. Leave that entire block byte-identical.

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/console-dashboard.test.ts`:

```ts
// lib/__tests__/console-dashboard.test.ts
import { describe, it, expect } from 'vitest';
import type { Order } from '@/src/payload/payload-types';
import { buildFunnel, buildRevenueSeries, toRecentOrder } from '@/lib/console/dashboard';

describe('buildRevenueSeries', () => {
  it('should spread points evenly across the fixed 540-wide coordinate space', () => {
    const series = buildRevenueSeries([
      { date: '2026-08-19', revenueVnd: 0 },
      { date: '2026-08-20', revenueVnd: 100000 },
    ]);
    expect(series.points).toBe('0,180 540,0');
    expect(series.area).toBe('0,180 540,0 540,200 0,200');
    expect(series.days).toEqual(['19/08', '20/08']);
  });

  it('should render a flat line at the bottom when every day is zero', () => {
    const series = buildRevenueSeries([
      { date: '2026-08-19', revenueVnd: 0 },
      { date: '2026-08-20', revenueVnd: 0 },
    ]);
    expect(series.points).toBe('0,180 540,180');
  });

  it('should return an empty series when given a single day', () => {
    expect(buildRevenueSeries([{ date: '2026-08-20', revenueVnd: 5 }])).toEqual({
      points: '',
      area: '',
      days: [],
    });
  });

  it('should return an empty series when given no days', () => {
    expect(buildRevenueSeries([])).toEqual({ points: '', area: '', days: [] });
  });
});

describe('buildFunnel', () => {
  it('should render three stages with widths and drop-offs', () => {
    const stages = buildFunnel(8204, 2610, 227);
    expect(stages).toHaveLength(3);
    expect(stages[0].label).toBe('Lượt xem sản phẩm');
    expect(stages[0].value).toBe('8.204');
    expect(stages[0].width).toBe('100%');
    expect(stages[1].label).toBe('Thêm giỏ hàng');
    expect(stages[1].width).toBe('32%');
    expect(stages[2].label).toBe('Mua hàng');
    expect(stages[2].drop).toBeUndefined();
  });

  it('should express the drop-off from views to carts as a percentage', () => {
    expect(buildFunnel(8204, 2610, 227)[0].drop).toBe('↓ 68,2%');
  });

  it('should floor a tiny stage width so the bar stays visible', () => {
    expect(buildFunnel(10000, 5000, 1)[2].width).toBe('2%');
  });

  it('should render zero counts and no drop-offs when there is no traffic', () => {
    const stages = buildFunnel(0, 0, 0);
    expect(stages.map((s) => s.value)).toEqual(['0', '0', '0']);
    expect(stages.map((s) => s.drop)).toEqual([undefined, undefined, undefined]);
  });
});

describe('toRecentOrder', () => {
  function makeOrder(overrides: Partial<Order> = {}): Order {
    return {
      id: 1,
      orderId: '2031',
      totalAmount: 450000,
      currency: 'VND',
      paymentStatus: 'paid',
      orderStatus: 'pending',
      customerName: 'Nguyễn Thị Hương',
      createdAt: '2026-08-20T02:14:00Z',
      updatedAt: '2026-08-20T02:14:00Z',
      ...overrides,
    } as Order;
  }

  it('should map a pending order to a wait-tone row', () => {
    expect(toRecentOrder(makeOrder())).toEqual({
      code: '#DH-2031',
      customer: 'Nguyễn Thị Hương',
      amount: '450.000 ₫',
      status: 'Đang chờ',
      tone: 'wait',
    });
  });

  it('should map a shipped order to a busy-tone row', () => {
    const row = toRecentOrder(makeOrder({ orderStatus: 'shipped' }));
    expect(row.status).toBe('Đang giao');
    expect(row.tone).toBe('busy');
  });

  it('should map a canceled order to a fail-tone cancelled row', () => {
    const row = toRecentOrder(makeOrder({ orderStatus: 'canceled' }));
    expect(row.status).toBe('Đã huỷ');
    expect(row.tone).toBe('fail');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node_modules/.bin/vitest run lib/__tests__/console-dashboard.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `lib/console/dashboard.ts`**

Implement the exports listed under **Produces** per the key facts above. Write the three pure builders first and get the tests green before touching the async assembly.

- [ ] **Step 4: Run the test to verify it passes**

Run: `node_modules/.bin/vitest run lib/__tests__/console-dashboard.test.ts`
Expected: PASS.

- [ ] **Step 5: Make the five components prop-driven**

Each keeps its card title, class names and markup exactly. Only the data source changes:

- `RecentOrders({ orders }: { orders: RecentOrder[] })` — delete the `ORDERS` const, map `orders`.
- `TopProductsTable({ rows }: { rows: TopProductRow[] })` — delete the `ROWS` const, map `rows`. `HEADERS` stays.
- `TrafficSources({ sources }: { sources: TrafficSource[] })` — delete the `SOURCES` const, map `sources`.
- `ConversionFunnel({ stages }: { stages: FunnelStage[] })` — delete the `STAGES` const, `export` the `FunnelStage` interface, map `stages`. The `stage.label === 'Mua hàng'` special-casing stays.
- `RevenueChart({ series }: { series: RevenueSeries })` — delete `POINTS`, `AREA` and `DAYS`; read `series.points`, `series.area`, `series.days`. Import `RevenueSeries` type-only from `@/lib/console/dashboard`.

- [ ] **Step 6: Wire the dashboard page**

In `app/(console)/admin/console/page.tsx`, make the component `async`, delete the `KPIS` const, call `getDashboardData(7)`, and pass each slice to its component. The crawler banner block stays byte-identical. `RangeSelector` stays inert.

- [ ] **Step 7: Verify and commit**

Run: `node_modules/.bin/tsc --noEmit` — expected: no errors.
Run: `node_modules/.bin/vitest run lib/__tests__/console-dashboard.test.ts` — expected: PASS.

```bash
git add lib/console/dashboard.ts lib/__tests__/console-dashboard.test.ts components/console/dashboard app/\(console\)/admin/console/page.tsx
git commit -m "feat(console): read dashboard metrics from analytics"
```
