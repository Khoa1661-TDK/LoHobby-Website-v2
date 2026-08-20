# Admin Console Data Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace every module-scope fixture in the 20 non-crawler admin console screens with real reads from Payload and Prisma, through a new `lib/console/` adapter layer.

**Architecture:** One adapter module per screen area under `lib/console/`. Each exports a **pure mapper** (`toXRow(doc) → XRow`) that is unit-tested against fixture documents, plus thin `async` readers that fetch and map. Server-component pages call a reader and hand the result to the existing presentational component as props. Adapters reuse an existing `lib/` helper wherever one exists; three areas (customers, media, campaigns) have none and query Prisma/Payload directly.

**Tech Stack:** Next.js 15 App Router (server components), Payload CMS 3.x (`getPayload({ config })`), Prisma (`@/lib/prisma`), TypeScript strict, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-20-console-data-layer-design.md`

---

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
14. **Prisma import paths are fixed:** the client is `import prisma from '@/lib/prisma'` (default export, carries the `server-only` guard); model types are `import type { Coupon } from '@/generated/prisma/client'`; enums are `import { CampaignStatus } from '@/generated/prisma/enums'`. Never import `@/lib/prisma-client` directly.

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

## File Structure

**Created:**

| File | Responsibility |
|---|---|
| `lib/console/format.ts` | VND, date, percent and order-code formatting shared by every adapter. No I/O. |
| `lib/console/orders.ts` | Orders list rows + order detail, from the Payload `orders` collection. |
| `lib/console/reviews.ts` | Review and contact-message queues, from Prisma. |
| `lib/console/settings.ts` | Brand panel facts, from the `store-settings` Payload global. |
| `lib/console/products.ts` | Products list rows + product editor facts, from the Payload `products` collection. |
| `lib/console/categories.ts` | Category tree rows with product counts. |
| `lib/console/media.ts` | Media library items, from the Payload `media` collection. |
| `lib/console/customers.ts` | Customer rows with order count and lifetime spend. |
| `lib/console/content.ts` | Pages, redirects and post-editor facts. |
| `lib/console/marketing.ts` | Coupons, gift cards, campaigns and auto-sale rows. |
| `lib/console/dashboard.ts` | KPIs, revenue series, funnel, traffic sources, top products, recent orders. |
| `lib/__tests__/console-*.test.ts` | One test file per adapter, covering the mapper's failure paths. |

**Modified:** the 16 pages under `app/(console)/admin/console/` (excluding `crawl/**`), and the components listed per task. Fixture consts are deleted from the components that hold them.

---

## Task Order and Ownership

Tasks 1–4 are written by hand — they set the pattern the rest copy. Tasks 5–12 are delegated one area per task. Task 13 is the integration gate.

Tasks 5–12 are **independent of each other** and depend only on Tasks 1–4. They may run in any order or concurrently.

---

### Task 1: Shared formatting helpers

**Files:**
- Create: `lib/console/format.ts`
- Test: `lib/__tests__/console-format.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `formatVndSymbol(amount: number | null | undefined): string` → `'450.000 ₫'`
  - `formatOrderCode(orderId: string | number | null | undefined): string` → `'#DH-2031'`
  - `formatDayMonth(iso: string | Date | null | undefined): string` → `'20/08'`
  - `formatDateTime(iso: string | Date | null | undefined): string` → `'20/08/2026, 09:14'`
  - `formatPercent(value: number | null | undefined, digits?: number): string` → `'7,6%'`
  - `formatCount(value: number | null | undefined): string` → `'4.120'`

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/console-format.test.ts`:

```ts
// lib/__tests__/console-format.test.ts
import { describe, it, expect } from 'vitest';
import {
  formatVndSymbol,
  formatOrderCode,
  formatDayMonth,
  formatDateTime,
  formatPercent,
  formatCount,
} from '@/lib/console/format';

describe('formatVndSymbol', () => {
  it('should render grouped dong with the currency symbol when given an integer', () => {
    expect(formatVndSymbol(450000)).toBe('450.000 ₫');
  });

  it('should render zero dong when given null', () => {
    expect(formatVndSymbol(null)).toBe('0 ₫');
  });

  it('should render zero dong when given NaN', () => {
    expect(formatVndSymbol(Number.NaN)).toBe('0 ₫');
  });
});

describe('formatOrderCode', () => {
  it('should prefix the order id when given a numeric string', () => {
    expect(formatOrderCode('2031')).toBe('#DH-2031');
  });

  it('should prefix the order id when given a number', () => {
    expect(formatOrderCode(2031)).toBe('#DH-2031');
  });

  it('should render an em dash when the order id is missing', () => {
    expect(formatOrderCode(null)).toBe('—');
  });
});

describe('formatDayMonth', () => {
  it('should render day slash month in Ho Chi Minh time when given an ISO string', () => {
    // 02:14 UTC is 09:14 on the same day in UTC+7.
    expect(formatDayMonth('2026-08-20T02:14:00Z')).toBe('20/08');
  });

  it('should roll over to the next local day when the UTC time is late evening', () => {
    // 18:00 UTC on the 19th is 01:00 on the 20th in UTC+7.
    expect(formatDayMonth('2026-08-19T18:00:00Z')).toBe('20/08');
  });

  it('should render an em dash when given null', () => {
    expect(formatDayMonth(null)).toBe('—');
  });

  it('should render an em dash when given an unparseable string', () => {
    expect(formatDayMonth('not-a-date')).toBe('—');
  });
});

describe('formatDateTime', () => {
  it('should render the full local date and time when given an ISO string', () => {
    expect(formatDateTime('2026-08-20T02:14:00Z')).toBe('20/08/2026, 09:14');
  });

  it('should render an em dash when given null', () => {
    expect(formatDateTime(null)).toBe('—');
  });
});

describe('formatPercent', () => {
  it('should render one decimal with a comma separator by default', () => {
    expect(formatPercent(7.6)).toBe('7,6%');
  });

  it('should render no decimals when digits is zero', () => {
    expect(formatPercent(15, 0)).toBe('15%');
  });

  it('should render zero percent when given null', () => {
    expect(formatPercent(null)).toBe('0,0%');
  });
});

describe('formatCount', () => {
  it('should group thousands with a dot when given a large number', () => {
    expect(formatCount(4120)).toBe('4.120');
  });

  it('should render zero when given null', () => {
    expect(formatCount(null)).toBe('0');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node_modules/.bin/vitest run lib/__tests__/console-format.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/console/format"`.

- [ ] **Step 3: Write the implementation**

Create `lib/console/format.ts`:

```ts
// lib/console/format.ts
//
// Formatting shared by every admin console adapter. The console renders
// pre-formatted strings, so all currency, date and percentage shaping happens
// here — never in a component.
//
// No regular expressions: Tailwind scans lib/ and a character class here has
// previously broken the whole stylesheet. Everything below is Intl plus string
// concatenation.

const TIME_ZONE = 'Asia/Ho_Chi_Minh';

const EM_DASH = '—';

const countFormatter = new Intl.NumberFormat('vi-VN');

// en-GB gives zero-padded 2-digit day/month/hour/minute parts and a 24-hour
// clock; the parts are reassembled by hand, so the locale's own separators
// never reach the output.
const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

type DateParts = {
  day: string;
  month: string;
  year: string;
  hour: string;
  minute: string;
};

function toDateParts(value: string | Date | null | undefined): DateParts | null {
  if (value === null || value === undefined) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const out: Record<string, string> = {};
  for (const part of dateFormatter.formatToParts(date)) {
    out[part.type] = part.value;
  }
  if (!out.day || !out.month || !out.year || !out.hour || !out.minute) return null;

  return {
    day: out.day,
    month: out.month,
    year: out.year,
    hour: out.hour,
    minute: out.minute,
  };
}

function safeNumber(value: number | null | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

/** Whole dong with the currency symbol the console design uses: '450.000 ₫'. */
export function formatVndSymbol(amount: number | null | undefined): string {
  return `${countFormatter.format(Math.round(safeNumber(amount)))} ₫`;
}

/** Payload stores the order code as a bare numeric string; the console shows '#DH-2031'. */
export function formatOrderCode(orderId: string | number | null | undefined): string {
  if (orderId === null || orderId === undefined) return EM_DASH;
  const text = String(orderId).trim();
  if (text.length === 0) return EM_DASH;
  return `#DH-${text}`;
}

/** List-column date: '20/08', in store-local time. */
export function formatDayMonth(iso: string | Date | null | undefined): string {
  const parts = toDateParts(iso);
  if (!parts) return EM_DASH;
  return `${parts.day}/${parts.month}`;
}

/** Order-detail header date: '20/08/2026, 09:14', in store-local time. */
export function formatDateTime(iso: string | Date | null | undefined): string {
  const parts = toDateParts(iso);
  if (!parts) return EM_DASH;
  return `${parts.day}/${parts.month}/${parts.year}, ${parts.hour}:${parts.minute}`;
}

/** Percentages use the Vietnamese decimal comma: '7,6%'. */
export function formatPercent(value: number | null | undefined, digits = 1): string {
  const formatter = new Intl.NumberFormat('vi-VN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  return `${formatter.format(safeNumber(value))}%`;
}

/** Grouped integers: '4.120'. */
export function formatCount(value: number | null | undefined): string {
  return countFormatter.format(Math.round(safeNumber(value)));
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node_modules/.bin/vitest run lib/__tests__/console-format.test.ts`
Expected: PASS, 16 tests.

- [ ] **Step 5: Typecheck**

Run: `node_modules/.bin/tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add lib/console/format.ts lib/__tests__/console-format.test.ts
git commit -m "feat(console): add shared adapter formatting helpers"
```

---

### Task 2: Orders adapter (reference — Payload collection)

**Files:**
- Create: `lib/console/orders.ts`
- Test: `lib/__tests__/console-orders.test.ts`
- Modify: `app/(console)/admin/console/orders/page.tsx`
- Modify: `app/(console)/admin/console/orders/[id]/page.tsx`
- Delete: `components/console/orders/data.ts`

**Interfaces:**
- Consumes: `lib/console/format.ts` (Task 1); `listRecentOrders({ status, limit }): Promise<Order[]>` and `getPayloadOrderById(id: string | number): Promise<Order | null>` from `@/lib/payload-orders`.
- Produces:
  - `toOrderRow(doc: Order): OrderRow`
  - `toOrderDetail(doc: Order): OrderDetail`
  - `listOrderRows(limit?: number): Promise<OrderRow[]>`
  - `countOrders(): Promise<{ total: number; unshipped: number }>`
  - `getOrderDetail(id: string): Promise<OrderDetail | null>`

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/console-orders.test.ts`:

```ts
// lib/__tests__/console-orders.test.ts
import { describe, it, expect } from 'vitest';
import type { Order } from '@/src/payload/payload-types';
import { toOrderRow, toOrderDetail } from '@/lib/console/orders';

function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 1,
    orderId: '2031',
    totalAmount: 450000,
    currency: 'VND',
    paymentStatus: 'paid',
    orderStatus: 'pending',
    customerName: 'Nguyễn Thị Hương',
    buyerEmail: 'huong.nguyen@email.com',
    phoneNumber: '0912 345 678',
    createdAt: '2026-08-20T02:14:00Z',
    updatedAt: '2026-08-20T02:14:00Z',
    ...overrides,
  } as Order;
}

describe('toOrderRow', () => {
  it('should map a fully populated order to its console row', () => {
    expect(toOrderRow(makeOrder())).toEqual({
      code: '#DH-2031',
      customer: 'Nguyễn Thị Hương',
      total: '450.000 ₫',
      payment: 'paid',
      order: 'pending',
      date: '20/08',
    });
  });

  it('should translate the Payload single-l canceled status to the console double-l spelling', () => {
    expect(toOrderRow(makeOrder({ orderStatus: 'canceled' })).order).toBe('cancelled');
  });

  it('should fall back to the related customer name when customerName is unset', () => {
    const doc = makeOrder({
      customerName: null,
      customer: { id: 7, email: 'lan@email.com', name: 'Vũ Thị Lan' } as never,
    });
    expect(toOrderRow(doc).customer).toBe('Vũ Thị Lan');
  });

  it('should fall back to the buyer email when the customer relationship is an unresolved id', () => {
    const doc = makeOrder({ customerName: null, customer: 7 as never });
    expect(toOrderRow(doc).customer).toBe('huong.nguyen@email.com');
  });

  it('should render the guest label when no customer identity is present at all', () => {
    const doc = makeOrder({ customerName: null, buyerEmail: null, customer: null });
    expect(toOrderRow(doc).customer).toBe('Khách vãng lai');
  });

  it('should render zero dong when the total is null', () => {
    expect(toOrderRow(makeOrder({ totalAmount: null as never })).total).toBe('0 ₫');
  });

  it('should fall back to the pending status when the order status is unrecognised', () => {
    expect(toOrderRow(makeOrder({ orderStatus: 'weird' as never })).order).toBe('pending');
  });

  it('should fall back to the pending payment status when the payment status is unrecognised', () => {
    expect(toOrderRow(makeOrder({ paymentStatus: 'weird' as never })).payment).toBe('pending');
  });
});

describe('toOrderDetail', () => {
  it('should map line items, totals and the customer block from a populated order', () => {
    const detail = toOrderDetail(
      makeOrder({
        subtotalAmount: 451000,
        shippingAmount: 25000,
        discountAmount: 45000,
        giftCardAmount: 20000,
        taxAmount: 39000,
        couponCode: 'LOHOBBY10',
        shippingAddress: '123 Đường Nguyễn Trãi, P.7, Q.5, TP.HCM',
        shippingCarrier: 'Giao hàng tiêu chuẩn (GHN)',
        paymentKind: 'Chuyển khoản ngân hàng · VietQR',
        inventoryAdjusted: true,
        lineItems: [
          {
            productId: '1',
            productTitle: 'Móc Khóa Game Minecraft Totem Hồi Sinh',
            variantName: 'Màu: Đen',
            quantity: 2,
            unitPrice: 129000,
          },
        ],
      }),
    );

    expect(detail.code).toBe('#DH-2031');
    expect(detail.createdAt).toBe('20/08/2026, 09:14');
    expect(detail.grandTotal).toBe('450.000 ₫');
    expect(detail.items).toEqual([
      {
        name: 'Móc Khóa Game Minecraft Totem Hồi Sinh',
        meta: 'Màu: Đen · SL 2',
        price: '258.000 ₫',
      },
    ]);
    expect(detail.customer).toEqual({
      name: 'Nguyễn Thị Hương',
      email: 'huong.nguyen@email.com',
      phone: '0912 345 678',
    });
    expect(detail.shipping.address).toBe('123 Đường Nguyễn Trãi, P.7, Q.5, TP.HCM');
    expect(detail.stock).toBe('Đã trừ kho');
  });

  it('should omit the discount total line when there is no discount', () => {
    const detail = toOrderDetail(makeOrder({ discountAmount: 0, giftCardAmount: 0 }));
    const labels = detail.totals.map((t) => t.label);
    expect(labels).not.toContain('Mã giảm giá');
    expect(labels).not.toContain('Thẻ quà tặng');
  });

  it('should render the discount as a negative fail-tone amount with its coupon code', () => {
    const detail = toOrderDetail(makeOrder({ discountAmount: 45000, couponCode: 'LOHOBBY10' }));
    expect(detail.totals).toContainEqual({
      label: 'Mã giảm giá',
      amount: '−45.000 ₫',
      tone: 'fail',
      code: 'LOHOBBY10',
    });
  });

  it('should render an empty item list when lineItems is null', () => {
    expect(toOrderDetail(makeOrder({ lineItems: null })).items).toEqual([]);
  });

  it('should mark the paid timeline step done and leave later steps pending', () => {
    const detail = toOrderDetail(makeOrder({ paidAt: '2026-08-20T02:14:00Z' }));
    expect(detail.timeline[0]).toEqual({
      label: 'Đã thanh toán',
      done: true,
      time: '20/08 09:14',
    });
    expect(detail.timeline[1]).toEqual({ label: 'Đã xác nhận', done: false, time: '—' });
  });

  it('should say stock is not yet deducted when inventoryAdjusted is false', () => {
    expect(toOrderDetail(makeOrder({ inventoryAdjusted: false })).stock).toBe('Chưa trừ kho');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node_modules/.bin/vitest run lib/__tests__/console-orders.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/console/orders"`.

- [ ] **Step 3: Write the implementation**

Create `lib/console/orders.ts`:

```ts
// lib/console/orders.ts
//
// Orders adapter for the admin console. The reference implementation for a
// Payload-collection-backed area: a pure mapper the tests exercise, plus thin
// readers that fetch and map.
//
// The Payload order status vocabulary is not the console's: Payload spells the
// terminal state 'canceled', the console (and its design) spells it
// 'cancelled'. That translation lives here, not in a component.

import config from '@payload-config';
import { getPayload } from 'payload';
import type { Order } from '@/src/payload/payload-types';
import { getPayloadOrderById, listRecentOrders } from '@/lib/payload-orders';
import type {
  OrderDetail,
  OrderLineItem,
  OrderRow,
  OrderStatus,
  OrderTimelineStep,
  OrderTotalLine,
  PaymentStatus,
} from '@/components/console/orders/types';
import {
  formatDateTime,
  formatDayMonth,
  formatOrderCode,
  formatVndSymbol,
} from './format';

const PAYMENT_STATUSES: PaymentStatus[] = ['paid', 'pending', 'failed', 'refunded'];

const ORDER_STATUSES: OrderStatus[] = [
  'pending',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
];

const GUEST_LABEL = 'Khách vãng lai';

const EM_DASH = '—';

function toPaymentStatus(value: unknown): PaymentStatus {
  return PAYMENT_STATUSES.includes(value as PaymentStatus)
    ? (value as PaymentStatus)
    : 'pending';
}

function toOrderStatus(value: unknown): OrderStatus {
  if (value === 'canceled') return 'cancelled';
  return ORDER_STATUSES.includes(value as OrderStatus) ? (value as OrderStatus) : 'pending';
}

function resolveCustomerName(doc: Order): string {
  if (doc.customerName) return doc.customerName;
  const related = doc.customer;
  if (related && typeof related === 'object') {
    if (related.name) return related.name;
    if (related.email) return related.email;
  }
  if (doc.buyerEmail) return doc.buyerEmail;
  return GUEST_LABEL;
}

function resolveCustomerEmail(doc: Order): string {
  if (doc.buyerEmail) return doc.buyerEmail;
  const related = doc.customer;
  if (related && typeof related === 'object' && related.email) return related.email;
  return EM_DASH;
}

function resolveCustomerPhone(doc: Order): string {
  if (doc.phoneNumber) return doc.phoneNumber;
  const related = doc.customer;
  if (related && typeof related === 'object' && related.phone) return related.phone;
  return EM_DASH;
}

/** '20/08 09:14' — the compact stamp the detail timeline uses. */
function formatTimelineStamp(iso: string | null | undefined): string {
  if (!iso) return EM_DASH;
  const day = formatDayMonth(iso);
  if (day === EM_DASH) return EM_DASH;
  const full = formatDateTime(iso);
  const time = full.slice(full.length - 5);
  return `${day} ${time}`;
}

export function toOrderRow(doc: Order): OrderRow {
  return {
    code: formatOrderCode(doc.orderId),
    customer: resolveCustomerName(doc),
    total: formatVndSymbol(doc.totalAmount),
    payment: toPaymentStatus(doc.paymentStatus),
    order: toOrderStatus(doc.orderStatus),
    date: formatDayMonth(doc.createdAt),
  };
}

function toLineItems(doc: Order): OrderLineItem[] {
  const lines = doc.lineItems ?? [];
  return lines.map((line) => {
    const metaParts: string[] = [];
    if (line.variantName) metaParts.push(line.variantName);
    metaParts.push(`SL ${line.quantity}`);
    return {
      name: line.productTitle ?? line.productHandle ?? line.productId,
      meta: metaParts.join(' · '),
      price: formatVndSymbol(line.unitPrice * line.quantity),
    };
  });
}

function toTotals(doc: Order): OrderTotalLine[] {
  const totals: OrderTotalLine[] = [];

  if (doc.subtotalAmount) {
    totals.push({ label: 'Tạm tính', amount: formatVndSymbol(doc.subtotalAmount), tone: 'ink' });
  }
  if (doc.shippingAmount) {
    totals.push({
      label: 'Phí vận chuyển',
      amount: formatVndSymbol(doc.shippingAmount),
      tone: 'ink',
    });
  }
  if (doc.discountAmount) {
    const line: OrderTotalLine = {
      label: 'Mã giảm giá',
      amount: `−${formatVndSymbol(doc.discountAmount)}`,
      tone: 'fail',
    };
    if (doc.couponCode) line.code = doc.couponCode;
    totals.push(line);
  }
  if (doc.giftCardAmount) {
    totals.push({
      label: 'Thẻ quà tặng',
      amount: `−${formatVndSymbol(doc.giftCardAmount)}`,
      tone: 'fail',
    });
  }
  if (doc.taxAmount) {
    totals.push({ label: 'Thuế', amount: formatVndSymbol(doc.taxAmount), tone: 'ink' });
  }

  return totals;
}

function toTimeline(doc: Order): OrderTimelineStep[] {
  return [
    { label: 'Đã thanh toán', done: Boolean(doc.paidAt), time: formatTimelineStamp(doc.paidAt) },
    {
      label: 'Đã xác nhận',
      done: Boolean(doc.confirmedAt),
      time: formatTimelineStamp(doc.confirmedAt),
    },
    {
      label: 'Đã giao vận chuyển',
      done: Boolean(doc.shippedAt),
      time: formatTimelineStamp(doc.shippedAt),
    },
    {
      label: 'Đã nhận hàng',
      done: Boolean(doc.deliveredAt),
      time: formatTimelineStamp(doc.deliveredAt),
    },
  ];
}

function toNotice(doc: Order): string {
  const payment = toPaymentStatus(doc.paymentStatus);
  const order = toOrderStatus(doc.orderStatus);
  if (payment === 'paid' && (order === 'pending' || order === 'processing')) {
    return 'Đã thanh toán, chưa giao hàng — cần xử lý';
  }
  if (payment === 'pending') return 'Chờ thanh toán';
  if (payment === 'failed') return 'Thanh toán thất bại';
  if (payment === 'refunded') return 'Đã hoàn tiền';
  return '';
}

export function toOrderDetail(doc: Order): OrderDetail {
  return {
    code: formatOrderCode(doc.orderId),
    payment: toPaymentStatus(doc.paymentStatus),
    order: toOrderStatus(doc.orderStatus),
    createdAt: formatDateTime(doc.createdAt),
    notice: toNotice(doc),
    items: toLineItems(doc),
    totals: toTotals(doc),
    grandTotal: formatVndSymbol(doc.totalAmount),
    timeline: toTimeline(doc),
    customer: {
      name: resolveCustomerName(doc),
      email: resolveCustomerEmail(doc),
      phone: resolveCustomerPhone(doc),
    },
    shipping: {
      method: doc.shippingCarrier ?? (doc.deliveryMethod === 'PICKUP' ? 'Nhận tại cửa hàng' : EM_DASH),
      address: doc.shippingAddress ?? EM_DASH,
    },
    paymentMethod: doc.paymentKind ?? doc.paymentMethodKey ?? EM_DASH,
    stock: doc.inventoryAdjusted ? 'Đã trừ kho' : 'Chưa trừ kho',
  };
}

export async function listOrderRows(limit = 25): Promise<OrderRow[]> {
  const docs = await listRecentOrders({ status: 'all', limit });
  return docs.map(toOrderRow);
}

/**
 * The list header shows the full order count and how many are paid but not yet
 * shipped. Both are counted server-side with `limit: 0` so no documents are
 * transferred.
 */
export async function countOrders(): Promise<{ total: number; unshipped: number }> {
  const payload = await getPayload({ config });
  const [all, unshipped] = await Promise.all([
    payload.count({ collection: 'orders' }),
    payload.count({
      collection: 'orders',
      where: {
        and: [
          { paymentStatus: { equals: 'paid' } },
          { orderStatus: { in: ['pending', 'processing'] } },
        ],
      },
    }),
  ]);
  return { total: all.totalDocs, unshipped: unshipped.totalDocs };
}

export async function getOrderDetail(id: string): Promise<OrderDetail | null> {
  const doc = await getPayloadOrderById(id);
  return doc ? toOrderDetail(doc) : null;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node_modules/.bin/vitest run lib/__tests__/console-orders.test.ts`
Expected: PASS.

- [ ] **Step 5: Wire the orders list page**

Replace the body of `app/(console)/admin/console/orders/page.tsx`. Only the data source changes — every string, class and element below is unchanged from the current file except `TOTAL`, `UNSHIPPED_NOTICE` and the row source:

```tsx
// app/(console)/admin/console/orders/page.tsx
//
// Orders list. Server component; the AppShell chrome comes from the group
// layout, so this page only supplies the content stack.

import { PageHeader } from '@/components/console/ui/PageHeader';
import {
  OrdersList,
  OrdersToolbar,
  OrdersFooter,
} from '@/components/console/orders/OrdersList';
import { countOrders, listOrderRows } from '@/lib/console/orders';

export default async function OrdersPage() {
  const [rows, counts] = await Promise.all([listOrderRows(25), countOrders()]);
  const unshippedNotice = `${counts.unshipped} đã thanh toán, chưa giao`;

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Đơn hàng"
        meta={
          <span className="flex items-center gap-2">
            <span className="rounded-[var(--adm-radius)] bg-[var(--adm-raised)] px-2 py-1 font-mono text-[11px] font-semibold text-[var(--adm-ink-3)]">
              {counts.total}
            </span>
            <span className="text-[12px] text-[var(--adm-ink-3)]">{unshippedNotice}</span>
          </span>
        }
      />
      <div className="mt-4 flex min-h-0 flex-1 flex-col overflow-hidden rounded-[var(--adm-radius)] border border-[var(--adm-line)] bg-[var(--adm-surface)]">
        <div className="border-b border-[var(--adm-line)] px-4 py-3">
          <OrdersToolbar />
        </div>
        <OrdersList rows={rows} />
        <OrdersFooter shown={`1–${rows.length}`} total={counts.total} />
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Wire the order detail page**

Replace `app/(console)/admin/console/orders/[id]/page.tsx`:

```tsx
// app/(console)/admin/console/orders/[id]/page.tsx
//
// Order detail. Server component; the AppShell chrome comes from the group
// layout, so this page only supplies the content stack.

import { notFound } from 'next/navigation';
import { OrderDetail } from '@/components/console/orders/OrderDetail';
import { getOrderDetail } from '@/lib/console/orders';

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getOrderDetail(id);
  if (!order) notFound();

  return (
    <div className="flex h-full flex-col">
      <OrderDetail order={order} />
    </div>
  );
}
```

- [ ] **Step 7: Delete the fixture module**

```bash
git rm components/console/orders/data.ts
```

Then confirm nothing else imports it:

```bash
grep -rn "orders/data" app components lib || echo "no remaining importers"
```
Expected: `no remaining importers`.

- [ ] **Step 8: Typecheck**

Run: `node_modules/.bin/tsc --noEmit`
Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add -A lib/console app/\(console\) components/console/orders lib/__tests__
git commit -m "feat(console): read orders from payload instead of fixtures"
```

---

### Task 3: Reviews adapter (reference — Prisma)

**Files:**
- Create: `lib/console/reviews.ts`
- Test: `lib/__tests__/console-reviews.test.ts`
- Modify: `app/(console)/admin/console/reviews/page.tsx`
- Modify: `components/console/reviews/ReviewQueue.tsx` (delete `REVIEW_ROWS`)
- Modify: `components/console/reviews/MessageQueue.tsx` (delete `MESSAGE_ROWS`)

**Interfaces:**
- Consumes: `@/lib/prisma` default export `prisma`.
- Produces:
  - `toReviewRow(doc: ReviewWithUser): ReviewRow`
  - `toMessageRow(doc: ContactMessage): MessageRow`
  - `listPendingReviewRows(limit?: number): Promise<ReviewRow[]>`
  - `listMessageRows(limit?: number): Promise<MessageRow[]>`
  - `type ReviewWithUser = Review & { user: { name: string | null; email: string } | null }`

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/console-reviews.test.ts`:

```ts
// lib/__tests__/console-reviews.test.ts
import { describe, it, expect } from 'vitest';
import { toMessageRow, toReviewRow, type ReviewWithUser } from '@/lib/console/reviews';

function makeReview(overrides: Partial<ReviewWithUser> = {}): ReviewWithUser {
  return {
    id: 'rev1',
    userId: 'u1',
    productId: '12',
    productHandle: 'moc-khoa-totem',
    rating: 4,
    title: null,
    body: 'Mô hình rất chi tiết, đóng gói cẩn thận. Giao nhanh.',
    approved: false,
    createdAt: new Date('2026-08-20T02:14:00Z'),
    updatedAt: new Date('2026-08-20T02:14:00Z'),
    user: { name: 'Lê Minh Anh', email: 'anh@email.com' },
    ...overrides,
  } as ReviewWithUser;
}

describe('toReviewRow', () => {
  it('should map a review with a named author to its console row', () => {
    expect(toReviewRow(makeReview())).toEqual({
      id: 'rev1',
      author: 'Lê Minh Anh',
      rating: 4,
      body: 'Mô hình rất chi tiết, đóng gói cẩn thận. Giao nhanh.',
    });
  });

  it('should fall back to the author email when the user has no name', () => {
    const row = toReviewRow(makeReview({ user: { name: null, email: 'anh@email.com' } }));
    expect(row.author).toBe('anh@email.com');
  });

  it('should render the anonymous label when the user relation is null', () => {
    expect(toReviewRow(makeReview({ user: null })).author).toBe('Khách ẩn danh');
  });

  it('should clamp a rating above five down to five', () => {
    expect(toReviewRow(makeReview({ rating: 9 })).rating).toBe(5);
  });

  it('should clamp a negative rating up to zero', () => {
    expect(toReviewRow(makeReview({ rating: -2 })).rating).toBe(0);
  });
});

describe('toMessageRow', () => {
  it('should use the order code as the subject when the message references an order', () => {
    const row = toMessageRow({
      id: 'msg1',
      name: 'Trần Văn Đức',
      email: 'duc@email.com',
      orderCode: '2030',
      message: 'Đơn của tôi khi nào giao?',
      createdAt: new Date('2026-08-20T02:14:00Z'),
    });
    expect(row).toEqual({
      id: 'msg1',
      sender: 'Trần Văn Đức',
      subject: 'Về đơn #DH-2030',
      body: 'Đơn của tôi khi nào giao?',
    });
  });

  it('should use the sender email as the subject when there is no order code', () => {
    const row = toMessageRow({
      id: 'msg2',
      name: 'Vũ Thị Lan',
      email: 'lan@email.com',
      orderCode: null,
      message: 'Shop còn hàng không ạ?',
      createdAt: new Date('2026-08-20T02:14:00Z'),
    });
    expect(row.subject).toBe('lan@email.com');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node_modules/.bin/vitest run lib/__tests__/console-reviews.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `lib/console/reviews.ts`:

```ts
// lib/console/reviews.ts
//
// Reviews and contact-message adapter for the admin console. The reference
// implementation for a Prisma-backed area.
//
// The reviews queue shows what is awaiting moderation, so it reads
// `approved: false` only. Moderation itself is a write and stays in the
// existing Payload admin page for now.

import prisma from '@/lib/prisma';
import type { ContactMessage, Review } from '@/generated/prisma/client';
import type { MessageRow, ReviewRow } from '@/components/console/reviews/types';
import { formatOrderCode } from './format';

export type ReviewWithUser = Review & {
  user: { name: string | null; email: string } | null;
};

const ANONYMOUS_LABEL = 'Khách ẩn danh';

export function toReviewRow(doc: ReviewWithUser): ReviewRow {
  const author = doc.user?.name ?? doc.user?.email ?? ANONYMOUS_LABEL;
  return {
    id: doc.id,
    author,
    rating: Math.max(0, Math.min(5, Math.round(doc.rating))),
    body: doc.body,
  };
}

export function toMessageRow(doc: ContactMessage): MessageRow {
  return {
    id: doc.id,
    sender: doc.name,
    subject: doc.orderCode ? `Về đơn ${formatOrderCode(doc.orderCode)}` : doc.email,
    body: doc.message,
  };
}

export async function listPendingReviewRows(limit = 50): Promise<ReviewRow[]> {
  const docs = await prisma.review.findMany({
    where: { approved: false },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { user: { select: { name: true, email: true } } },
  });
  return docs.map(toReviewRow);
}

export async function listMessageRows(limit = 50): Promise<MessageRow[]> {
  const docs = await prisma.contactMessage.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  return docs.map(toMessageRow);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node_modules/.bin/vitest run lib/__tests__/console-reviews.test.ts`
Expected: PASS.

- [ ] **Step 5: Delete the two fixture consts**

In `components/console/reviews/ReviewQueue.tsx`, delete the `export const REVIEW_ROWS: ReviewRow[] = [ … ];` block. Keep the `import type { ReviewRow } from './types'` — the props type still uses it. `Stars` and the card markup are unchanged.

In `components/console/reviews/MessageQueue.tsx`, delete `export const MESSAGE_ROWS: MessageRow[] = [];`. Nothing else changes.

- [ ] **Step 6: Wire the page**

Replace `app/(console)/admin/console/reviews/page.tsx`. Only the imports and the two `rows=` expressions change:

```tsx
// app/(console)/admin/console/reviews/page.tsx
//
// Reviews & messages queues (board 15b). Server component; the AppShell chrome
// comes from the group layout, so this page only supplies the content stack.
// The tab strip is the one client component; the two queues are server
// components passed as children, so the client boundary stays minimal.

import { PageHeader } from '@/components/console/ui/PageHeader';
import { ReviewTabs } from '@/components/console/reviews/ReviewTabs';
import { ReviewQueue } from '@/components/console/reviews/ReviewQueue';
import { MessageQueue } from '@/components/console/reviews/MessageQueue';
import { listMessageRows, listPendingReviewRows } from '@/lib/console/reviews';

function EmptyQueue({ label }: { label: string }) {
  return (
    <div className="rounded-[var(--adm-radius)] border border-[var(--adm-line)] bg-[var(--adm-surface)] p-3 text-[12px] text-[var(--adm-ink-3)]">
      {label}
    </div>
  );
}

export default async function ReviewsPage() {
  const [reviewRows, messageRows] = await Promise.all([
    listPendingReviewRows(),
    listMessageRows(),
  ]);

  return (
    <div className="flex min-h-full flex-col gap-3.5">
      <PageHeader title="Đánh giá & tin nhắn" />
      <ReviewTabs
        panels={{
          reviews: <ReviewQueue rows={reviewRows} />,
          favourites: <EmptyQueue label="Chưa có mục yêu thích" />,
          newsletter: <EmptyQueue label="Chưa có đăng ký bản tin" />,
          messages: <MessageQueue rows={messageRows} />,
        }}
      />
    </div>
  );
}
```

- [ ] **Step 7: Typecheck and commit**

Run: `node_modules/.bin/tsc --noEmit` — expected: no errors.

```bash
git add lib/console/reviews.ts lib/__tests__/console-reviews.test.ts components/console/reviews app/\(console\)/admin/console/reviews
git commit -m "feat(console): read reviews and messages from prisma"
```

---

### Task 4: Settings adapter (reference — Payload global)

**Files:**
- Create: `lib/console/settings.ts`
- Test: `lib/__tests__/console-settings.test.ts`
- Modify: `components/console/settings/BrandPanel.tsx`
- Modify: `app/(console)/admin/console/settings/page.tsx`

**Design deviation, deliberate:** `BrandPanel` is currently a pure wireframe — two empty bordered boxes and three fixed swatch colours. A wireframe wired to real data is still a fixture, so this task fills the boxes with the real store name and subtitle and paints the swatches from the real brand colours. The layout, sizes, spacing and the "Cửa hàng & thương hiệu" heading are unchanged. The swatch colours become inline `style={{ backgroundColor: … }}` values: these are *data* read from the database, not design tokens, so the no-inline-colour rule does not apply.

**Interfaces:**
- Consumes: `getPayload({ config })`, global slug `'store-settings'`.
- Produces:
  - `type BrandFacts = { storeName: string; storeSubtitle: string; logoUrl: string | null; logoAlt: string; colors: { primary: string; secondary: string; accent: string } }`
  - `toBrandFacts(doc: unknown): BrandFacts`
  - `getBrandFacts(): Promise<BrandFacts>`

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/console-settings.test.ts`:

```ts
// lib/__tests__/console-settings.test.ts
import { describe, it, expect } from 'vitest';
import { toBrandFacts } from '@/lib/console/settings';

describe('toBrandFacts', () => {
  it('should map a fully populated global to brand facts', () => {
    expect(
      toBrandFacts({
        storeName: 'Lô Hobby',
        storeSubtitle: 'Mô hình & móc khóa in 3D',
        logo: { url: '/media/logo.png', alt: 'Lô Hobby' },
        primaryColor: '#111111',
        secondaryColor: '#f5f5f5',
        accentColor: '#146138',
      }),
    ).toEqual({
      storeName: 'Lô Hobby',
      storeSubtitle: 'Mô hình & móc khóa in 3D',
      logoUrl: '/media/logo.png',
      logoAlt: 'Lô Hobby',
      colors: { primary: '#111111', secondary: '#f5f5f5', accent: '#146138' },
    });
  });

  it('should fall back to placeholder copy when the global is empty', () => {
    expect(toBrandFacts({})).toEqual({
      storeName: 'Chưa đặt tên cửa hàng',
      storeSubtitle: 'Chưa có mô tả ngắn',
      logoUrl: null,
      logoAlt: '',
      colors: { primary: '#000000', secondary: '#737373', accent: '#146138' },
    });
  });

  it('should return no logo url when the logo relationship is an unresolved id', () => {
    expect(toBrandFacts({ logo: 12 }).logoUrl).toBeNull();
  });

  it('should tolerate a null global', () => {
    expect(toBrandFacts(null).storeName).toBe('Chưa đặt tên cửa hàng');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node_modules/.bin/vitest run lib/__tests__/console-settings.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

The global's tabs and collapsibles are **unnamed**, so `storeName`, `storeSubtitle`, `logo`, `primaryColor`, `secondaryColor` and `accentColor` all sit at the top level of the document — verified against `StoreSetting` in `src/payload/payload-types.ts`. There is no `theme` group.

Create `lib/console/settings.ts`:

```ts
// lib/console/settings.ts
//
// Settings adapter for the admin console. The reference implementation for a
// Payload-global-backed area.
//
// The mapper takes `unknown` rather than a generated type: Payload globals with
// tab layouts produce a wide, deeply optional generated interface, and the
// console needs six fields out of it. Narrowing by hand here keeps the mapper
// unit-testable with a plain object literal.

import config from '@payload-config';
import { getPayload } from 'payload';

export type BrandFacts = {
  storeName: string;
  storeSubtitle: string;
  logoUrl: string | null;
  logoAlt: string;
  colors: { primary: string; secondary: string; accent: string };
};

// Matches the defaultValue on each field in src/payload/globals/StoreSettings.ts.
// accentColor is a hidden legacy field with no default, so the console falls back
// to the brand green.
const DEFAULT_COLORS = {
  primary: '#000000',
  secondary: '#737373',
  accent: '#146138',
};

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function asText(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
}

function readColors(doc: Record<string, unknown>): BrandFacts['colors'] {
  return {
    primary: asText(doc.primaryColor, DEFAULT_COLORS.primary),
    secondary: asText(doc.secondaryColor, DEFAULT_COLORS.secondary),
    accent: asText(doc.accentColor, DEFAULT_COLORS.accent),
  };
}

export function toBrandFacts(value: unknown): BrandFacts {
  const doc = asRecord(value);
  // An upload relationship is a populated Media object at depth >= 1 and a bare
  // numeric id at depth 0. Only the object form carries a url.
  const logo = asRecord(doc.logo);

  return {
    storeName: asText(doc.storeName, 'Chưa đặt tên cửa hàng'),
    storeSubtitle: asText(doc.storeSubtitle, 'Chưa có mô tả ngắn'),
    logoUrl: typeof logo.url === 'string' ? logo.url : null,
    logoAlt: asText(logo.alt, ''),
    colors: readColors(doc),
  };
}

export async function getBrandFacts(): Promise<BrandFacts> {
  const payload = await getPayload({ config });
  const doc = await payload.findGlobal({ slug: 'store-settings', depth: 1 });
  return toBrandFacts(doc);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node_modules/.bin/vitest run lib/__tests__/console-settings.test.ts`
Expected: PASS.

- [ ] **Step 5: Make BrandPanel prop-driven**

Replace `components/console/settings/BrandPanel.tsx`. The container classes and the heading are byte-identical to the current file; only the three placeholder regions gain content:

```tsx
// components/console/settings/BrandPanel.tsx
//
// "Cửa hàng & thương hiệu" panel (board 17): the store logo slot, two form
// field slots (one full width, one at 60%), and the brand colour swatches.
// The controls are read-only — writes stay in the Payload admin for now.

import type { BrandFacts } from '@/lib/console/settings';

export function BrandPanel({ facts }: { facts: BrandFacts }) {
  return (
    <div className="flex flex-col gap-3.5">
      <div className="text-[18px] font-bold leading-none text-[var(--adm-ink)]">
        Cửa hàng &amp; thương hiệu
      </div>
      <div className="flex gap-4">
        <div className="h-[100px] w-[100px] flex-none bg-[var(--adm-placeholder)]">
          {facts.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={facts.logoUrl}
              alt={facts.logoAlt}
              className="h-full w-full object-contain"
            />
          ) : null}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2.5">
          <div className="flex h-9 items-center truncate border border-[var(--adm-line)] px-2.5 text-[12px] text-[var(--adm-ink)]">
            {facts.storeName}
          </div>
          <div className="flex h-9 w-[60%] items-center truncate border border-[var(--adm-line)] px-2.5 text-[12px] text-[var(--adm-ink-3)]">
            {facts.storeSubtitle}
          </div>
        </div>
      </div>
      <div className="flex gap-2.5">
        <div className="h-8 w-8" style={{ backgroundColor: facts.colors.primary }} />
        <div
          className="h-8 w-8 border border-[var(--adm-line)]"
          style={{ backgroundColor: facts.colors.secondary }}
        />
        <div className="h-8 w-8" style={{ backgroundColor: facts.colors.accent }} />
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Wire the settings page**

Replace `app/(console)/admin/console/settings/page.tsx`:

```tsx
// app/(console)/admin/console/settings/page.tsx
//
// Settings (board 17). Server component; the AppShell chrome comes from the
// group layout, so this page only supplies the content. The settings rail
// groups by how often a setting is touched, and the "Cửa hàng & thương hiệu"
// panel is the first group item.

import { SettingsNav } from '@/components/console/settings/SettingsNav';
import { BrandPanel } from '@/components/console/settings/BrandPanel';
import { getBrandFacts } from '@/lib/console/settings';

export default async function SettingsPage() {
  const facts = await getBrandFacts();

  return (
    <div className="flex min-h-full gap-7">
      <SettingsNav activeId="store-brand" />
      <div className="min-w-0 flex-1">
        <BrandPanel facts={facts} />
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Typecheck and commit**

Run: `node_modules/.bin/tsc --noEmit` — expected: no errors.

```bash
git add lib/console/settings.ts lib/__tests__/console-settings.test.ts components/console/settings app/\(console\)/admin/console/settings
git commit -m "feat(console): read store branding from the payload global"
```

---

### Task 5: Products adapter — DELEGATED

**Files:**
- Create: `lib/console/products.ts`
- Test: `lib/__tests__/console-products.test.ts`
- Modify: `app/(console)/admin/console/products/page.tsx`
- Modify: `app/(console)/admin/console/products/[id]/page.tsx`
- Modify: `components/console/products/ProductRowType.ts` (delete `PRODUCT_ROWS`)

**Interfaces:**
- Consumes: `formatVndSymbol`, `formatDayMonth` from `@/lib/console/format`; the `ProductRow` / `ProductStatus` types from `@/components/console/products/ProductRowType`; the `ProductEditorFacts` type from `@/components/console/products/ProductEditor`.
- Produces:
  - `toProductRow(doc: Product): ProductRow`
  - `listProductRows(limit?: number): Promise<ProductRow[]>`
  - `countProducts(): Promise<number>`
  - `toProductEditorFacts(doc: Product): ProductEditorFacts`
  - `getProductEditorFacts(id: string): Promise<ProductEditorFacts | null>`

**Reference:** `lib/console/orders.ts` is the pattern to copy — pure mapper, then thin readers.

**Key facts:**
- `Product` is `import type { Product } from '@/src/payload/payload-types'`. Relevant fields: `id: number`, `title: string`, `category: (number | Category)[]`, `price: number`, `onSale?: boolean | null`, `salePercent?: number | null`, `autoSaleManaged?: boolean | null`, `autoSaleReleasedAt?: string | null`, `available?: boolean | null`, `stock?: number | null`, `variants?: { docs?: (number | ProductVariant)[] }`.
- `variants` is a **join field**. It returns bare numeric ids unless the query passes `depth: 1`. `ProductVariant` has `stock?: number | null`.
- `ProductRow` (already defined, do not change it) is:
  ```ts
  { id: string; name: string; category: string; price: number; stock: number;
    promo: string | null; autoDiscountNote: string | null;
    status: 'listed' | 'draft'; selected: boolean }
  ```
  `price` and `stock` are **numbers**, not formatted strings — `ProductsTable` formats them itself.
- Mapping rules:
  - `id`: `String(doc.id)`
  - `name`: `doc.title`
  - `category`: the title of the first populated category, or `'—'` if the array is empty or holds only bare ids.
  - `price`: `doc.price ?? 0`
  - `stock`: `doc.stock` when it is a number; otherwise the sum of `stock` over populated variant docs; `0` when neither is available.
  - `promo`: `'Tự động -15%'` when `doc.onSale` and `doc.autoSaleManaged` are both true (substituting the real `doc.salePercent`); `'-15%'` when `onSale` is true but not auto-managed; `null` when not on sale. Use the ASCII hyphen here — the existing fixture string is `'Tự động -15%'`.
  - `autoDiscountNote`: `'Quản lý bởi hệ thống tự động giảm giá'` when `doc.autoSaleManaged` is true, else `null`.
  - `status`: `doc.available === false ? 'draft' : 'listed'`
  - `selected`: always `false` — selection is client state the console does not have yet.
- `ProductEditorFacts` is `{ title: string; autoSaleManaged: string; autoSaleReleasedAt: string }`. The two fact chips are literal debug strings in the design: produce `` `autoSaleManaged: ${Boolean(doc.autoSaleManaged)}` `` and `` `autoSaleReleasedAt: ${doc.autoSaleReleasedAt ? formatDayMonth(doc.autoSaleReleasedAt) : '—'}` ``.
- Readers use `getPayload({ config })` from `payload` and `@payload-config`, exactly as `lib/console/orders.ts` does:
  ```ts
  const payload = await getPayload({ config });
  const found = await payload.find({
    collection: 'products', sort: '-updatedAt', limit, pagination: false, depth: 1,
  });
  ```
  `countProducts` uses `payload.count({ collection: 'products' })` and returns `totalDocs`.
- `getProductEditorFacts(id)` uses `payload.findByID({ collection: 'products', id: Number(id), depth: 1 })` inside a try/catch returning `null` on a missing document.

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/console-products.test.ts`:

```ts
// lib/__tests__/console-products.test.ts
import { describe, it, expect } from 'vitest';
import type { Product } from '@/src/payload/payload-types';
import { toProductEditorFacts, toProductRow } from '@/lib/console/products';

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 12,
    title: 'Móc Khóa Game Minecraft Totem Hồi Sinh',
    category: [{ id: 3, title: 'Móc khóa' }],
    price: 129000,
    available: true,
    stock: 21,
    updatedAt: '2026-08-20T02:14:00Z',
    createdAt: '2026-08-01T02:14:00Z',
    ...overrides,
  } as Product;
}

describe('toProductRow', () => {
  it('should map a plain listed product to its console row', () => {
    expect(toProductRow(makeProduct())).toEqual({
      id: '12',
      name: 'Móc Khóa Game Minecraft Totem Hồi Sinh',
      category: 'Móc khóa',
      price: 129000,
      stock: 21,
      promo: null,
      autoDiscountNote: null,
      status: 'listed',
      selected: false,
    });
  });

  it('should render an em dash category when the category array is empty', () => {
    expect(toProductRow(makeProduct({ category: [] })).category).toBe('—');
  });

  it('should render an em dash category when the relationship is an unresolved id', () => {
    expect(toProductRow(makeProduct({ category: [3] as never })).category).toBe('—');
  });

  it('should sum variant stock when the product has no own stock value', () => {
    const doc = makeProduct({
      stock: null,
      variants: { docs: [{ id: 1, stock: 4 }, { id: 2, stock: 6 }] } as never,
    });
    expect(toProductRow(doc).stock).toBe(10);
  });

  it('should report zero stock when variants came back as bare ids', () => {
    const doc = makeProduct({ stock: null, variants: { docs: [1, 2] } as never });
    expect(toProductRow(doc).stock).toBe(0);
  });

  it('should label an auto-managed sale with the auto prefix and the managed note', () => {
    const doc = makeProduct({ onSale: true, salePercent: 15, autoSaleManaged: true });
    const row = toProductRow(doc);
    expect(row.promo).toBe('Tự động -15%');
    expect(row.autoDiscountNote).toBe('Quản lý bởi hệ thống tự động giảm giá');
  });

  it('should label a hand-set sale without the auto prefix or the note', () => {
    const doc = makeProduct({ onSale: true, salePercent: 20, autoSaleManaged: false });
    const row = toProductRow(doc);
    expect(row.promo).toBe('-20%');
    expect(row.autoDiscountNote).toBeNull();
  });

  it('should mark an unavailable product as a draft', () => {
    expect(toProductRow(makeProduct({ available: false })).status).toBe('draft');
  });
});

describe('toProductEditorFacts', () => {
  it('should render the auto-sale debug chips for a managed product', () => {
    const facts = toProductEditorFacts(
      makeProduct({ autoSaleManaged: true, autoSaleReleasedAt: null }),
    );
    expect(facts).toEqual({
      title: 'Móc Khóa Game Minecraft Totem Hồi Sinh',
      autoSaleManaged: 'autoSaleManaged: true',
      autoSaleReleasedAt: 'autoSaleReleasedAt: —',
    });
  });

  it('should render the release date when the product was released from auto management', () => {
    const facts = toProductEditorFacts(
      makeProduct({ autoSaleManaged: false, autoSaleReleasedAt: '2026-08-20T02:14:00Z' }),
    );
    expect(facts.autoSaleManaged).toBe('autoSaleManaged: false');
    expect(facts.autoSaleReleasedAt).toBe('autoSaleReleasedAt: 20/08');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node_modules/.bin/vitest run lib/__tests__/console-products.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `lib/console/products.ts`**

Implement the five exports listed under **Produces**, following the mapping rules above and the structure of `lib/console/orders.ts`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `node_modules/.bin/vitest run lib/__tests__/console-products.test.ts`
Expected: PASS.

- [ ] **Step 5: Delete the fixture and wire the list page**

Delete the whole `export const PRODUCT_ROWS: ProductRow[] = [ … ];` block from `components/console/products/ProductRowType.ts`. The `ProductStatus` and `ProductRow` declarations stay exactly as they are.

In `app/(console)/admin/console/products/page.tsx`, replace the `PRODUCT_ROWS` import and the `const TOTAL = 118;` line. The component becomes `async`, and:

```tsx
const [rows, total] = await Promise.all([listProductRows(30), countProducts()]);
const selectedCount = rows.filter((r) => r.selected).length;
```

Every other line of that file — the `PageHeader`, the inline `svg`, the class names, `Hiển thị 1–{rows.length} trong {total} sản phẩm` — stays as written, with `PRODUCT_ROWS` swapped for `rows` and `TOTAL` for `total`.

- [ ] **Step 6: Wire the editor page**

In `app/(console)/admin/console/products/[id]/page.tsx`, delete the `const FACTS = { … }` block and replace it with a `getProductEditorFacts(id)` call. Call `notFound()` from `next/navigation` when it returns `null`. The returned JSX is unchanged apart from `facts={FACTS}` becoming `facts={facts}`.

- [ ] **Step 7: Verify**

Run: `node_modules/.bin/tsc --noEmit` — expected: no errors.
Run: `node_modules/.bin/vitest run lib/__tests__/console-products.test.ts` — expected: PASS.
Run: `grep -rn "PRODUCT_ROWS" app components lib` — expected: no matches.

- [ ] **Step 8: Commit**

```bash
git add lib/console/products.ts lib/__tests__/console-products.test.ts components/console/products app/\(console\)/admin/console/products
git commit -m "feat(console): read products from payload instead of fixtures"
```

---

### Task 6: Categories adapter — DELEGATED

**Files:**
- Create: `lib/console/categories.ts`
- Test: `lib/__tests__/console-categories.test.ts`
- Modify: `components/console/categories/CategoryList.tsx`
- Modify: `app/(console)/admin/console/categories/page.tsx`

**Design deviation, deliberate — read this before writing code.** `CategoryRow` currently has no name field: the artboard drew each category name as a grey placeholder bar, and the component reproduced the bar (`nameBarWidth`, `nameBar`). A placeholder bar fed by real data is still a fixture, so this task replaces the bar with the real category title. The row height, borders, indent, glyph, spacing and the mono count column are unchanged. `nameBarWidth` and `nameBar` are removed from `CategoryRow`, and `BAR_TONE` is deleted.

**Interfaces:**
- Consumes: `getPayload({ config })` on the `categories` collection.
- Produces:
  - `CategoryRow` stays exported from `components/console/categories/CategoryList.tsx` — do not move it into `lib/`. Its new shape is `{ id: string; name: string; count: number; child: boolean }`. The adapter imports it type-only.
  - `listCategoryRows(): Promise<CategoryRow[]>`
  - `toCategoryRows(categories: Category[], counts: Map<number, number>): CategoryRow[]` — pure, unit-tested.

**Key facts:**
- `import type { Category } from '@/src/payload/payload-types'`. Relevant fields: `id: number`, `title: string`, `slug?: string | null`. Inspect `src/payload/collections/Categories.ts` for a parent-relationship field; if there is one, use it to set `child`. **If there is no parent field, every row has `child: false`** — do not invent hierarchy.
- Product counts come from one `payload.find({ collection: 'products', limit: 0, pagination: false, depth: 0, select: { category: true } })`-style pass, or from a `payload.count` per category. Prefer a single `find` with `depth: 0` and tally the numeric category ids into a `Map<number, number>` — one query, not N.
- Sort categories by `title` ascending unless the collection defines an explicit order field.

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/console-categories.test.ts`:

```ts
// lib/__tests__/console-categories.test.ts
import { describe, it, expect } from 'vitest';
import type { Category } from '@/src/payload/payload-types';
import { toCategoryRows } from '@/lib/console/categories';

function makeCategory(id: number, title: string): Category {
  return { id, title, updatedAt: '', createdAt: '' } as Category;
}

describe('toCategoryRows', () => {
  it('should pair each category with its product count', () => {
    const rows = toCategoryRows(
      [makeCategory(1, 'Mô hình'), makeCategory(2, 'Móc khóa')],
      new Map([
        [1, 27],
        [2, 14],
      ]),
    );
    expect(rows).toEqual([
      { id: '1', name: 'Mô hình', count: 27, child: false },
      { id: '2', name: 'Móc khóa', count: 14, child: false },
    ]);
  });

  it('should report zero for a category with no products', () => {
    const rows = toCategoryRows([makeCategory(1, 'Mô hình')], new Map());
    expect(rows[0].count).toBe(0);
  });

  it('should render a placeholder name when the title is empty', () => {
    const rows = toCategoryRows([makeCategory(1, '')], new Map());
    expect(rows[0].name).toBe('Chưa đặt tên');
  });

  it('should return an empty list when there are no categories', () => {
    expect(toCategoryRows([], new Map())).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node_modules/.bin/vitest run lib/__tests__/console-categories.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Change `CategoryRow` and the row body**

In `components/console/categories/CategoryList.tsx`:

```tsx
export interface CategoryRow {
  id: string;
  name: string;
  count: number;
  /** Indented under the top-level row. */
  child: boolean;
}
```

Delete `CATEGORY_ROWS` and `BAR_TONE`. Inside the `rows.map`, replace the placeholder `<div className={...BAR_TONE...} style={{ maxWidth }} />` with:

```tsx
<span className="min-w-0 flex-1 truncate text-[12px] font-medium text-[var(--adm-ink)]">
  {row.name}
</span>
```

`ListGlyph`, the wrapper `div` classes (`flex items-center gap-2 border …`), the `child` indent logic and the count `<span>` are unchanged.

- [ ] **Step 4: Write `lib/console/categories.ts`**

Implement `toCategoryRows` and `listCategoryRows` per the key facts above.

- [ ] **Step 5: Run the test to verify it passes**

Run: `node_modules/.bin/vitest run lib/__tests__/console-categories.test.ts`
Expected: PASS.

- [ ] **Step 6: Wire the page**

In `app/(console)/admin/console/categories/page.tsx`, make the component `async`, drop the `CATEGORY_ROWS` import, and pass `rows={await listCategoryRows()}`. The `PageHeader title="Danh mục"` and the `Kéo để sắp xếp lại / đổi cấp cha` hint line are unchanged.

- [ ] **Step 7: Verify and commit**

Run: `node_modules/.bin/tsc --noEmit` — expected: no errors.
Run: `grep -rn "CATEGORY_ROWS\|nameBarWidth" app components lib` — expected: no matches.

```bash
git add lib/console/categories.ts lib/__tests__/console-categories.test.ts components/console/categories app/\(console\)/admin/console/categories
git commit -m "feat(console): read categories and product counts from payload"
```

---

### Task 7: Media adapter — DELEGATED

**Files:**
- Create: `lib/console/media.ts`
- Test: `lib/__tests__/console-media.test.ts`
- Modify: `components/console/media/MediaGrid.tsx`
- Modify: `app/(console)/admin/console/media/page.tsx`

**Design deviation, deliberate.** `MediaItem` currently has only `{ id, kind }` and the grid draws flat grey squares — the artboard's stand-in for thumbnails. This task adds `url` and `alt` and renders the real image. The 6-column grid, the `aspect-square`, the gap, the `--adm-placeholder` background (now the backdrop behind a loading image) and the video play glyph are all unchanged. The play glyph now sits **over** the thumbnail rather than on an empty square.

**Interfaces:**
- Consumes: `getPayload({ config })` on the `media` collection.
- Produces:
  - `type MediaItem = { id: string; kind: 'image' | 'video'; url: string | null; alt: string }` — stays exported from `components/console/media/MediaGrid.tsx`; the adapter imports it type-only.
  - `toMediaItem(doc: Media): MediaItem`
  - `listMediaItems(limit?: number): Promise<MediaItem[]>`

**Key facts:**
- `import type { Media } from '@/src/payload/payload-types'`. Fields: `id: number`, `alt: string`, `url?: string | null`, `thumbnailURL?: string | null`, `mimeType?: string | null`, `filename?: string | null`.
- `kind` is `'video'` when `mimeType` starts with `'video/'`, else `'image'`. Use `String(doc.mimeType ?? '').startsWith('video/')` — **no regex**.
- Prefer `thumbnailURL` over `url` when present; `null` when neither exists.
- Sort `-createdAt`, default `limit` 60.
- Render with a plain `<img>` and an `// eslint-disable-next-line @next/next/no-img-element` comment. Do **not** use `next/image`: Payload media URLs follow the request host, and an http LAN-IP source 400s through the image optimizer unless `remotePatterns` covers it. A plain `<img>` sidesteps that entirely and this is an admin grid, not a storefront page.

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/console-media.test.ts`:

```ts
// lib/__tests__/console-media.test.ts
import { describe, it, expect } from 'vitest';
import type { Media } from '@/src/payload/payload-types';
import { toMediaItem } from '@/lib/console/media';

function makeMedia(overrides: Partial<Media> = {}): Media {
  return {
    id: 5,
    alt: 'Móc khóa Totem',
    url: '/media/totem.png',
    mimeType: 'image/png',
    updatedAt: '',
    createdAt: '',
    ...overrides,
  } as Media;
}

describe('toMediaItem', () => {
  it('should map an image upload to an image item', () => {
    expect(toMediaItem(makeMedia())).toEqual({
      id: '5',
      kind: 'image',
      url: '/media/totem.png',
      alt: 'Móc khóa Totem',
    });
  });

  it('should classify a video mime type as a video item', () => {
    expect(toMediaItem(makeMedia({ mimeType: 'video/mp4' })).kind).toBe('video');
  });

  it('should prefer the generated thumbnail over the full-size url', () => {
    const item = toMediaItem(makeMedia({ thumbnailURL: '/media/totem-300.png' }));
    expect(item.url).toBe('/media/totem-300.png');
  });

  it('should return a null url when the upload has neither url nor thumbnail', () => {
    expect(toMediaItem(makeMedia({ url: null, thumbnailURL: null })).url).toBeNull();
  });

  it('should fall back to the filename for alt text when alt is empty', () => {
    const item = toMediaItem(makeMedia({ alt: '', filename: 'totem.png' }));
    expect(item.alt).toBe('totem.png');
  });

  it('should classify a missing mime type as an image', () => {
    expect(toMediaItem(makeMedia({ mimeType: null })).kind).toBe('image');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node_modules/.bin/vitest run lib/__tests__/console-media.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Extend `MediaItem` and render the thumbnail**

In `components/console/media/MediaGrid.tsx`, extend the interface, delete `MEDIA_ITEMS`, and change only the inside of the grid cell:

```tsx
export interface MediaItem {
  id: string;
  kind: 'image' | 'video';
  url: string | null;
  alt: string;
}
```

```tsx
{items.map((item) => (
  <div
    key={item.id}
    className="relative flex aspect-square items-center justify-center overflow-hidden bg-[var(--adm-placeholder)]"
  >
    {item.url ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={item.url} alt={item.alt} className="h-full w-full object-cover" />
    ) : null}
    {item.kind === 'video' ? (
      <span className="absolute inset-0 flex items-center justify-center">
        <PlayGlyph />
      </span>
    ) : null}
  </div>
))}
```

`PlayGlyph` and the grid wrapper `<div className="grid flex-1 grid-cols-6 gap-2.5 overflow-hidden">` are unchanged.

- [ ] **Step 4: Write `lib/console/media.ts`**

Implement `toMediaItem` and `listMediaItems` per the key facts above.

- [ ] **Step 5: Run the test to verify it passes**

Run: `node_modules/.bin/vitest run lib/__tests__/console-media.test.ts`
Expected: PASS.

- [ ] **Step 6: Wire the page**

In `app/(console)/admin/console/media/page.tsx`, make the component `async`, drop the `MEDIA_ITEMS` import, pass `items={await listMediaItems()}`. The `Ảnh` / `Video` tab buttons and the `Kéo thả tệp để tải lên` drop zone are unchanged and stay inert.

- [ ] **Step 7: Verify and commit**

Run: `node_modules/.bin/tsc --noEmit` — expected: no errors.
Run: `grep -rn "MEDIA_ITEMS" app components lib` — expected: no matches.

```bash
git add lib/console/media.ts lib/__tests__/console-media.test.ts components/console/media app/\(console\)/admin/console/media
git commit -m "feat(console): read the media library from payload"
```

---

### Task 8: Customers adapter — DELEGATED

**Files:**
- Create: `lib/console/customers.ts`
- Test: `lib/__tests__/console-customers.test.ts`
- Modify: `components/console/customers/CustomerList.tsx` (delete `CUSTOMER_ROWS`)
- Modify: `app/(console)/admin/console/customers/page.tsx`

**Interfaces:**
- Consumes: `formatVndSymbol` from `@/lib/console/format`; `getPayload({ config })` on `store-customers` and `orders`; the `CustomerRow` type exported by `components/console/customers/CustomerList.tsx`.
- Produces:
  - `type CustomerTotals = { orderCount: number; totalSpentVnd: number }`
  - `toCustomerRow(doc: StoreCustomer, totals: CustomerTotals | undefined): CustomerRow`
  - `listCustomerRows(limit?: number): Promise<CustomerRow[]>`

**Key facts:**
- There is no existing helper for this area; query directly. This is expected and permitted by the spec.
- `import type { StoreCustomer } from '@/src/payload/payload-types'`: `{ id: number; email: string; name?: string | null; phone?: string | null; prismaUserId?: string | null }`.
- `CustomerRow` (already defined, do not change) is `{ id: string; name: string; contact: string; orderCount: number; totalSpent: string }` — `totalSpent` is a **formatted string**, `orderCount` a number.
- `contact` is the email, falling back to the phone, falling back to `'—'`.
- `name` falls back to the email, then to `'Khách vãng lai'`.
- Order totals come from Payload `orders`, not Prisma — Payload is the order source of truth in this repo. Fetch orders once (`depth: 0`, `pagination: false`, `limit: 5000`), then tally per `customer` id. Count only orders with `paymentStatus === 'paid'` and `orderStatus !== 'canceled'` toward `totalSpentVnd`; `orderCount` counts every non-canceled order.
- The `customer` field on an order is `number | StoreCustomer | null` — at `depth: 0` it is a number. Read it with `typeof value === 'number' ? value : value?.id`.
- Sort customers `-createdAt`, default `limit` 100.

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/console-customers.test.ts`:

```ts
// lib/__tests__/console-customers.test.ts
import { describe, it, expect } from 'vitest';
import type { StoreCustomer } from '@/src/payload/payload-types';
import { toCustomerRow } from '@/lib/console/customers';

function makeCustomer(overrides: Partial<StoreCustomer> = {}): StoreCustomer {
  return {
    id: 4,
    email: 'huong.nguyen@email.com',
    name: 'Nguyễn Thị Hương',
    updatedAt: '',
    createdAt: '',
    ...overrides,
  } as StoreCustomer;
}

describe('toCustomerRow', () => {
  it('should map a customer with orders to a fully populated row', () => {
    expect(toCustomerRow(makeCustomer(), { orderCount: 6, totalSpentVnd: 1240000 })).toEqual({
      id: '4',
      name: 'Nguyễn Thị Hương',
      contact: 'huong.nguyen@email.com',
      orderCount: 6,
      totalSpent: '1.240.000 ₫',
    });
  });

  it('should report zero orders and zero spend when the customer has no totals', () => {
    const row = toCustomerRow(makeCustomer(), undefined);
    expect(row.orderCount).toBe(0);
    expect(row.totalSpent).toBe('0 ₫');
  });

  it('should fall back to the email as the display name when name is unset', () => {
    const row = toCustomerRow(makeCustomer({ name: null }), undefined);
    expect(row.name).toBe('huong.nguyen@email.com');
  });

  it('should fall back to the phone number as contact when there is no email', () => {
    const row = toCustomerRow(
      makeCustomer({ email: '' as never, phone: '0912 345 678' }),
      undefined,
    );
    expect(row.contact).toBe('0912 345 678');
  });

  it('should render the guest label when the customer has neither name nor email', () => {
    const row = toCustomerRow(makeCustomer({ name: null, email: '' as never }), undefined);
    expect(row.name).toBe('Khách vãng lai');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node_modules/.bin/vitest run lib/__tests__/console-customers.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `lib/console/customers.ts`**

Implement `toCustomerRow` and `listCustomerRows` per the key facts above. Keep the order-tallying logic in a small exported-or-private helper so `listCustomerRows` reads as: fetch customers, fetch orders, tally, map.

- [ ] **Step 4: Run the test to verify it passes**

Run: `node_modules/.bin/vitest run lib/__tests__/console-customers.test.ts`
Expected: PASS.

- [ ] **Step 5: Delete the fixture and wire the page**

Delete `export const CUSTOMER_ROWS: CustomerRow[] = [ … ];` from `components/console/customers/CustomerList.tsx`. The `CustomerRow` interface, `TH_CLASS`, `TD_CLASS` and the table markup are unchanged.

In `app/(console)/admin/console/customers/page.tsx`, make the component `async` and pass `rows={await listCustomerRows()}`. The `PageHeader title="Khách hàng"` line is unchanged.

- [ ] **Step 6: Verify and commit**

Run: `node_modules/.bin/tsc --noEmit` — expected: no errors.
Run: `grep -rn "CUSTOMER_ROWS" app components lib` — expected: no matches.

```bash
git add lib/console/customers.ts lib/__tests__/console-customers.test.ts components/console/customers app/\(console\)/admin/console/customers
git commit -m "feat(console): read customers and lifetime spend from payload"
```

---

### Task 9: Content adapter — DELEGATED

**Files:**
- Create: `lib/console/content.ts`
- Test: `lib/__tests__/console-content.test.ts`
- Modify: `components/console/content/PagesList.tsx` (delete `PAGE_ROWS`)
- Modify: `components/console/content/RedirectsList.tsx` (delete `REDIRECT_ROWS`)
- Modify: `components/console/content/PostEditor.tsx`
- Modify: `app/(console)/admin/console/content/page.tsx`
- Modify: `app/(console)/admin/console/content/posts/[id]/page.tsx`

**Design deviation, deliberate.** `PostEditor` is a pure wireframe with `PostEditorProps = { id: string }` and no rendered copy. Building a rich-text editor is out of scope, so this task adds `title: string` and renders it as text where the `--adm-fill-2` title bar is drawn. Every other bar in that wireframe stays a bar.

**Interfaces:**
- Consumes: `getPayload({ config })` on `pages`, `redirects` and `posts`.
- Produces:
  - `toPageRow(doc: Page): PageRow`
  - `toRedirectRow(doc: Redirect): RedirectRow`
  - `listPageRows(limit?: number): Promise<PageRow[]>`
  - `listRedirectRows(limit?: number): Promise<RedirectRow[]>`
  - `getPostEditorProps(id: string): Promise<{ id: string; title: string } | null>`

**Key facts:**
- `PageRow` (already defined in `PagesList.tsx`, do not change) is `{ id: string; title: string; path: string; status: 'published' | 'draft' }`.
- `import type { Page } from '@/src/payload/payload-types'`: `{ id: number; title: string; slug?: string | null; … }`. Inspect `src/payload/collections/Pages.ts` for the published/draft field. If the collection uses Payload drafts (`_status`), read `(doc as { _status?: string })._status === 'published'`; if it has an explicit `status` field like `Posts` does, read that. Check before writing.
- `path` is `'/'` when the slug is empty or `'home'`, else `` `/${slug}` ``. Do not double the leading slash.
- `RedirectRow` (already defined in `RedirectsList.tsx`) is `{ id: string; from: string; to: string }`. `Redirect` is `{ id: number; from: string; to: string; type: '301' | '302'; enabled?: boolean | null }`. List only `enabled !== false`, sorted `-createdAt`.
- `import type { Post } from '@/src/payload/payload-types'`: `{ id: number; title: string; status: 'draft' | 'published' }`. `getPostEditorProps` uses `payload.findByID({ collection: 'posts', id: Number(id), depth: 0 })` in a try/catch returning `null`.

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/console-content.test.ts`:

```ts
// lib/__tests__/console-content.test.ts
import { describe, it, expect } from 'vitest';
import type { Page, Redirect } from '@/src/payload/payload-types';
import { toPageRow, toRedirectRow } from '@/lib/console/content';

function makePage(overrides: Partial<Page> = {}): Page {
  return { id: 2, title: 'Giới thiệu', slug: 'gioi-thieu', updatedAt: '', createdAt: '', ...overrides } as Page;
}

describe('toPageRow', () => {
  it('should map a published page to its console row', () => {
    const row = toPageRow(makePage({ _status: 'published' } as never));
    expect(row).toEqual({ id: '2', title: 'Giới thiệu', path: '/gioi-thieu', status: 'published' });
  });

  it('should render the root path when the slug is home', () => {
    expect(toPageRow(makePage({ slug: 'home' })).path).toBe('/');
  });

  it('should render the root path when the slug is missing', () => {
    expect(toPageRow(makePage({ slug: null })).path).toBe('/');
  });

  it('should not double the leading slash when the slug already has one', () => {
    expect(toPageRow(makePage({ slug: '/doi-tra' })).path).toBe('/doi-tra');
  });

  it('should default an unpublished page to draft', () => {
    expect(toPageRow(makePage()).status).toBe('draft');
  });

  it('should render a placeholder title when the page has none', () => {
    expect(toPageRow(makePage({ title: '' })).title).toBe('Chưa đặt tiêu đề');
  });
});

describe('toRedirectRow', () => {
  it('should map a redirect to its console row', () => {
    const doc = {
      id: 9,
      from: '/khuyen-mai-cu',
      to: '/khuyen-mai',
      type: '301',
      enabled: true,
      updatedAt: '',
      createdAt: '',
    } as Redirect;
    expect(toRedirectRow(doc)).toEqual({ id: '9', from: '/khuyen-mai-cu', to: '/khuyen-mai' });
  });
});
```

If `Pages` turns out not to use Payload drafts, change the first test's `_status` to whatever field the collection actually has and keep the assertion.

- [ ] **Step 2: Run the test to verify it fails**

Run: `node_modules/.bin/vitest run lib/__tests__/console-content.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `lib/console/content.ts`**

Implement the five exports per the key facts above.

- [ ] **Step 4: Run the test to verify it passes**

Run: `node_modules/.bin/vitest run lib/__tests__/console-content.test.ts`
Expected: PASS.

- [ ] **Step 5: Delete the two fixtures**

Delete `PAGE_ROWS` from `PagesList.tsx` and `REDIRECT_ROWS` from `RedirectsList.tsx`. The interfaces, `STATUS_LABEL`, `Arrow` and both tables are unchanged.

- [ ] **Step 6: Add the post title to the editor wireframe**

In `components/console/content/PostEditor.tsx`:

```tsx
export interface PostEditorProps {
  id: string;
  title: string;
}

export function PostEditor({ title }: PostEditorProps) {
```

Replace the first `<Bar height={30} width="60%" tone="bg-[var(--adm-fill-2)]" />` with:

```tsx
<div className="text-[22px] font-bold leading-none text-[var(--adm-ink)]">{title}</div>
```

Every other `Bar`, the divider, the 300px rail, the `Danh mục blog` and `SEO` labels are unchanged. `Bar` is still used by the remaining bars, so keep it.

- [ ] **Step 7: Wire both pages**

In `app/(console)/admin/console/content/page.tsx`, make the component `async`, drop the two fixture imports, and fetch both lists with `Promise.all` before the `return`. Pass `rows={pageRows}` and `rows={redirectRows}`. The `ContentTabs`, both `PageHeader`/heading blocks and both `Button`s are unchanged and stay inert.

In `app/(console)/admin/console/content/posts/[id]/page.tsx`, call `getPostEditorProps(id)`, `notFound()` on `null`, and spread the result into `<PostEditor {...post} />`.

- [ ] **Step 8: Verify and commit**

Run: `node_modules/.bin/tsc --noEmit` — expected: no errors.
Run: `grep -rn "PAGE_ROWS\|REDIRECT_ROWS" app components lib` — expected: no matches.

```bash
git add lib/console/content.ts lib/__tests__/console-content.test.ts components/console/content app/\(console\)/admin/console/content
git commit -m "feat(console): read pages, redirects and posts from payload"
```

---

### Task 10: Marketing adapter — coupons and gift cards — DELEGATED

**Files:**
- Create: `lib/console/marketing.ts`
- Test: `lib/__tests__/console-marketing.test.ts`
- Modify: `components/console/marketing/CouponsPanel.tsx`
- Modify: `components/console/marketing/GiftCardsPanel.tsx`
- Modify: `components/console/marketing/MarketingTabs.tsx`
- Modify: `app/(console)/admin/console/marketing/page.tsx`

**Structural note.** `MarketingTabs` is a `'use client'` component that renders the four panels itself from a `PANELS` lookup. A client component cannot call an async server adapter, so this task inverts it: the **page** fetches all four panels' data and passes the four rendered panels in as a `panels` prop, exactly as `ReviewTabs` and `ContentTabs` already do on the reviews and content screens. Task 11 fills in the other two panels. Follow the `ReviewTabs` signature:

```tsx
export function MarketingTabs({ panels }: { panels: Record<MarketingTabId, ReactNode> }) {
```

The `TABS` array, the button classes, the active-state styling and the `useState` are unchanged; only `PANELS` and `<ActivePanel />` are replaced by `{panels[active]}`.

Because Task 11 modifies the same two files (`MarketingTabs.tsx`, `marketing/page.tsx`), **Task 10 must land before Task 11.**

**Interfaces:**
- Consumes: `listCouponsForAdmin(limit?: number): Promise<Coupon[]>` from `@/lib/coupons`; `listGiftCardsForAdmin(limit?: number): Promise<GiftCard[]>` from `@/lib/gift-cards`; `formatVndSymbol`, `formatDayMonth` from `@/lib/console/format`.
- Produces (this task):
  - `toCouponRow(doc: Coupon): CouponRow`
  - `toGiftCardRow(doc: GiftCard): GiftCardRow`
  - `listCouponRows(): Promise<CouponRow[]>`
  - `listGiftCardRows(): Promise<GiftCardRow[]>`

**Key facts:**
- Prisma `Coupon`: `{ id: string; code: string; discountType: 'PERCENT' | 'FIXED'; discountValue: number; maxUses: number | null; usedCount: number; expiresAt: Date | null; enabled: boolean }`. Confirm the `CouponDiscountType` enum member spellings in `prisma/schema.prisma` before relying on them.
- `CouponRow` (already defined in `CouponsPanel.tsx`, do not change) is `{ id: string; code: string; value: string; validity: string; used: string }` — all strings.
  - `value`: `'10%'` for a percent coupon, `formatVndSymbol(discountValue)` for a fixed one.
  - `validity`: `` `đến ${formatDayMonth(expiresAt)}` `` when `expiresAt` is set, `'không giới hạn'` when null, `'đã tắt'` when `enabled` is false.
  - `used`: `String(usedCount)` when `maxUses` is null, else `` `${usedCount}/${maxUses}` ``.
- Prisma `GiftCard`: `{ id: string; code: string; initialBalance: number; balance: number; usedAmount: number; enabled: boolean }`.
- `GiftCardRow` (already defined in `GiftCardsPanel.tsx`, do not change) is `{ id: string; code: string; value: string; note: string; exhausted: boolean }`.
  - `value`: `formatVndSymbol(initialBalance)`
  - `exhausted`: `balance <= 0`
  - `note`: `'đã dùng hết'` when exhausted, else `` `còn ${formatVndSymbol(balance)}` ``.
- Both panels take no props today. Give them `{ rows }`: `CouponsPanel({ rows }: { rows: CouponRow[] })` and `GiftCardsPanel({ rows }: { rows: GiftCardRow[] })`, delete the two fixture consts, and swap the const identifier for `rows` inside the map. Their `PageHeader`s, `Button`s, `HEAD_CELLS`, class names and the fail-tone note styling are unchanged.

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/console-marketing.test.ts`:

```ts
// lib/__tests__/console-marketing.test.ts
import { describe, it, expect } from 'vitest';
import { toCouponRow, toGiftCardRow } from '@/lib/console/marketing';

const BASE_COUPON = {
  id: 'c1',
  code: 'LOHOBBY10',
  discountType: 'PERCENT' as const,
  discountValue: 10,
  minOrderAmount: 0,
  maxUses: null,
  usedCount: 214,
  expiresAt: new Date('2026-08-31T02:14:00Z'),
  enabled: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('toCouponRow', () => {
  it('should render a percent coupon with its expiry and redemption count', () => {
    expect(toCouponRow(BASE_COUPON as never)).toEqual({
      id: 'c1',
      code: 'LOHOBBY10',
      value: '10%',
      validity: 'đến 31/08',
      used: '214',
    });
  });

  it('should render a fixed coupon value in dong', () => {
    const row = toCouponRow({
      ...BASE_COUPON,
      discountType: 'FIXED',
      discountValue: 50000,
    } as never);
    expect(row.value).toBe('50.000 ₫');
  });

  it('should say unlimited when the coupon has no expiry', () => {
    expect(toCouponRow({ ...BASE_COUPON, expiresAt: null } as never).validity).toBe(
      'không giới hạn',
    );
  });

  it('should say disabled when the coupon is turned off', () => {
    expect(toCouponRow({ ...BASE_COUPON, enabled: false } as never).validity).toBe('đã tắt');
  });

  it('should show the redemption cap when one is set', () => {
    expect(toCouponRow({ ...BASE_COUPON, maxUses: 500 } as never).used).toBe('214/500');
  });
});

describe('toGiftCardRow', () => {
  it('should show the remaining balance on a partly spent card', () => {
    expect(
      toGiftCardRow({
        id: 'g1',
        code: 'GC-88213',
        initialBalance: 200000,
        balance: 120000,
        usedAmount: 80000,
        expiresAt: null,
        enabled: true,
        note: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never),
    ).toEqual({
      id: 'g1',
      code: 'GC-88213',
      value: '200.000 ₫',
      note: 'còn 120.000 ₫',
      exhausted: false,
    });
  });

  it('should mark a zero-balance card exhausted', () => {
    const row = toGiftCardRow({
      id: 'g2',
      code: 'GC-88190',
      initialBalance: 100000,
      balance: 0,
      usedAmount: 100000,
      expiresAt: null,
      enabled: true,
      note: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);
    expect(row.exhausted).toBe(true);
    expect(row.note).toBe('đã dùng hết');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node_modules/.bin/vitest run lib/__tests__/console-marketing.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `lib/console/marketing.ts`**

Implement the four exports listed under **Produces** per the key facts above.

- [ ] **Step 4: Run the test to verify it passes**

Run: `node_modules/.bin/vitest run lib/__tests__/console-marketing.test.ts`
Expected: PASS.

- [ ] **Step 5: Make both panels prop-driven**

Per the key facts above.

- [ ] **Step 6: Invert `MarketingTabs` and wire the page**

Change `MarketingTabs` to the `panels` signature shown in the structural note. In `app/(console)/admin/console/marketing/page.tsx`, make the component `async`, fetch the coupon and gift-card rows with `Promise.all`, and pass:

```tsx
<MarketingTabs
  panels={{
    coupons: <CouponsPanel rows={couponRows} />,
    'gift-cards': <GiftCardsPanel rows={giftCardRows} />,
    campaigns: <CampaignsPanel />,
    'auto-sale': <AutoSalePanel />,
  }}
/>
```

`CampaignsPanel` and `AutoSalePanel` still take no props at this point — Task 11 changes them.

- [ ] **Step 7: Verify and commit**

Run: `node_modules/.bin/tsc --noEmit` — expected: no errors.
Run: `grep -rn "COUPON_ROWS\|GIFT_CARD_ROWS" app components lib` — expected: no matches.

```bash
git add lib/console/marketing.ts lib/__tests__/console-marketing.test.ts components/console/marketing app/\(console\)/admin/console/marketing
git commit -m "feat(console): read coupons and gift cards from prisma"
```

---

### Task 11: Marketing adapter — campaigns and auto-sale — DELEGATED

**Depends on Task 10.** Both tasks modify `lib/console/marketing.ts`, `MarketingTabs.tsx` and `marketing/page.tsx`.

**Files:**
- Modify: `lib/console/marketing.ts`
- Modify: `lib/__tests__/console-marketing.test.ts`
- Modify: `components/console/marketing/CampaignsPanel.tsx`
- Modify: `components/console/marketing/AutoSalePanel.tsx`
- Modify: `app/(console)/admin/console/marketing/page.tsx`

**Design deviation, deliberate.** Prisma's `CampaignStatus` has four members — `DRAFT`, `SCHEDULED`, `SENT`, `CANCELLED` — while the console's `CampaignStatus` has three. Mapping `CANCELLED` onto `draft` would label a cancelled campaign "Bản nháp", which is false. This task adds a fourth member, `'cancelled'`, with the existing `fail` tone and the label `'Đã huỷ'` — the same tone and wording the orders screens already use for a cancelled order, so no new design vocabulary is introduced.

**Interfaces:**
- Consumes: `prisma` from `@/lib/prisma`; `getPayload({ config })` on `products` and the `auto-sale-settings` global; `formatVndSymbol` from `@/lib/console/format`.
- Produces (added to `lib/console/marketing.ts`):
  - `toCampaignRow(doc: EmailCampaign): CampaignRow`
  - `listCampaignRows(limit?: number): Promise<CampaignRow[]>`
  - `type AutoSaleFacts = { enabled: boolean; managedCount: number; rows: AutoSaleProductRow[] }`
  - `getAutoSaleFacts(): Promise<AutoSaleFacts>`
  - `toAutoSaleProductRow(doc: Product): AutoSaleProductRow`

**Key facts:**
- Prisma `EmailCampaign`: `{ id: string; name: string; subject: string; body: string; status: CampaignStatus; scheduledAt: Date | null; sentAt: Date | null; recipientCount: number }`.
- `CampaignRow` is `{ id: string; subject: string; status: CampaignStatus }` where `CampaignStatus` is declared in `CampaignsPanel.tsx`. Extend it to `'sent' | 'scheduled' | 'draft' | 'cancelled'` and add the two map entries:
  ```ts
  const STATUS_TONE: Record<CampaignStatus, PillTone> = { …, cancelled: 'fail' };
  const STATUS_LABEL: Record<CampaignStatus, string> = { …, cancelled: 'Đã huỷ' };
  ```
  `sent: 'ok'`, `scheduled: 'busy'`, `draft: 'neutral'` and their labels stay exactly as written.
- `toCampaignRow` lowercases the Prisma enum: `SENT → 'sent'`, `SCHEDULED → 'scheduled'`, `CANCELLED → 'cancelled'`, anything else → `'draft'`. Use an explicit lookup object, not `String.toLowerCase()`, so an unknown value falls through to `'draft'`.
- List campaigns `orderBy: { createdAt: 'desc' }`, default `limit` 50. Precedent for querying `prisma.emailCampaign` directly is `app/(payload)/admin/campaigns/page.tsx`.
- `AutoSaleProductRow` (already defined in `AutoSalePanel.tsx`, do not change) is `{ id: string; title: string; price: string; discount: string }`.
  - `price`: `formatVndSymbol(doc.price)`
  - `discount`: `` `−${doc.salePercent ?? 0}%` `` — U+2212 minus, matching the existing fixture `'−15%'`.
- `getAutoSaleFacts` reads `payload.findGlobal({ slug: 'auto-sale-settings' })` for `enabled`, and `payload.find({ collection: 'products', where: { autoSaleManaged: { equals: true } }, depth: 0, limit: 50, pagination: false })` for the rows. `managedCount` is the row count. Confirm the global's slug string in `src/payload/globals/AutoSaleSettings.ts` before writing it.
- `AutoSalePanel` currently hardcodes an on-toggle and a managed count. Give it `{ facts }: { facts: AutoSaleFacts }`, delete `AUTO_SALE_PRODUCT_ROWS`, drive the toggle's on/off appearance from `facts.enabled` (keep the existing `ToggleOn` markup for the on state; for off, move the knob to `left-[2px]` and use `bg-[var(--adm-line)]` for the track), show `facts.managedCount` where the count is, and map `facts.rows` in the table.
- `CampaignsPanel` gets `{ rows }: { rows: CampaignRow[] }` and its fixture const is deleted. Its `PageHeader`, `Button` and pill markup are unchanged.

- [ ] **Step 1: Add the failing tests**

Append to `lib/__tests__/console-marketing.test.ts`:

```ts
describe('toCampaignRow', () => {
  const BASE_CAMPAIGN = {
    id: 'm1',
    name: 'Tháng 8',
    subject: 'Khuyến mãi tháng 8 — giảm 15%',
    body: '',
    status: 'SENT' as const,
    scheduledAt: null,
    sentAt: new Date('2026-08-20T02:14:00Z'),
    recipientCount: 480,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('should map a sent campaign to the sent status', () => {
    expect(toCampaignRow(BASE_CAMPAIGN as never)).toEqual({
      id: 'm1',
      subject: 'Khuyến mãi tháng 8 — giảm 15%',
      status: 'sent',
    });
  });

  it('should map a scheduled campaign to the scheduled status', () => {
    expect(toCampaignRow({ ...BASE_CAMPAIGN, status: 'SCHEDULED' } as never).status).toBe(
      'scheduled',
    );
  });

  it('should map a cancelled campaign to the cancelled status rather than to draft', () => {
    expect(toCampaignRow({ ...BASE_CAMPAIGN, status: 'CANCELLED' } as never).status).toBe(
      'cancelled',
    );
  });

  it('should fall back to draft when the status is unrecognised', () => {
    expect(toCampaignRow({ ...BASE_CAMPAIGN, status: 'WEIRD' } as never).status).toBe('draft');
  });

  it('should fall back to the campaign name when the subject is empty', () => {
    expect(toCampaignRow({ ...BASE_CAMPAIGN, subject: '' } as never).subject).toBe('Tháng 8');
  });
});

describe('toAutoSaleProductRow', () => {
  it('should render the price and the applied discount', () => {
    expect(
      toAutoSaleProductRow({
        id: 12,
        title: 'Móc Khóa Game Minecraft Totem Hồi Sinh',
        category: [],
        price: 129000,
        salePercent: 15,
        updatedAt: '',
        createdAt: '',
      } as never),
    ).toEqual({
      id: '12',
      title: 'Móc Khóa Game Minecraft Totem Hồi Sinh',
      price: '129.000 ₫',
      discount: '−15%',
    });
  });

  it('should render a zero discount when salePercent is unset', () => {
    const row = toAutoSaleProductRow({
      id: 13,
      title: 'Mô Hình Máy Bay Tiêm Kích J20',
      category: [],
      price: 269000,
      salePercent: null,
      updatedAt: '',
      createdAt: '',
    } as never);
    expect(row.discount).toBe('−0%');
  });
});
```

Add `toAutoSaleProductRow` and `toCampaignRow` to the file's existing import from `@/lib/console/marketing`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node_modules/.bin/vitest run lib/__tests__/console-marketing.test.ts`
Expected: FAIL — `toCampaignRow is not a function` (or an import error).

- [ ] **Step 3: Extend `lib/console/marketing.ts`**

Add the five exports listed under **Produces** per the key facts above.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node_modules/.bin/vitest run lib/__tests__/console-marketing.test.ts`
Expected: PASS, including the Task 10 tests.

- [ ] **Step 5: Extend `CampaignStatus` and make both panels prop-driven**

Per the key facts above.

- [ ] **Step 6: Wire the page**

In `app/(console)/admin/console/marketing/page.tsx`, extend the existing `Promise.all` to four fetches and pass `<CampaignsPanel rows={campaignRows} />` and `<AutoSalePanel facts={autoSaleFacts} />`.

- [ ] **Step 7: Verify and commit**

Run: `node_modules/.bin/tsc --noEmit` — expected: no errors.
Run: `grep -rn "CAMPAIGN_ROWS\|AUTO_SALE_PRODUCT_ROWS" app components lib` — expected: no matches.

```bash
git add lib/console/marketing.ts lib/__tests__/console-marketing.test.ts components/console/marketing app/\(console\)/admin/console/marketing
git commit -m "feat(console): read email campaigns and auto-sale state"
```

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

---

### Task 13: Integration gate

**Files:** none created; this task only verifies and fixes.

- [ ] **Step 1: Confirm no fixture survives outside the crawler screens**

```bash
grep -rn "PRODUCT_ROWS\|ORDER_ROWS\|ORDER_DETAIL\|CATEGORY_ROWS\|MEDIA_ITEMS\|CUSTOMER_ROWS\|REVIEW_ROWS\|MESSAGE_ROWS\|PAGE_ROWS\|REDIRECT_ROWS\|COUPON_ROWS\|GIFT_CARD_ROWS\|CAMPAIGN_ROWS\|AUTO_SALE_PRODUCT_ROWS" app components lib
```
Expected: no matches. Anything found is an unfinished task.

- [ ] **Step 2: Confirm no collection or global imports the console adapters**

```bash
grep -rn "lib/console" src/payload/collections src/payload/globals
```
Expected: no matches. A match means a Payload-route TDZ crash at runtime, which `tsc` will not catch.

- [ ] **Step 3: Confirm the crawler screens are untouched**

```bash
git diff --stat main -- 'app/(console)/admin/console/crawl' components/console/crawl components/console/queue
```
Expected: no changes.

- [ ] **Step 4: Full typecheck**

Run: `node_modules/.bin/tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Full test suite**

Run: `node_modules/.bin/vitest run`
Expected: all suites pass. Run the whole suite, not just the console tests — an i18n or route test elsewhere can break on an import change.

- [ ] **Step 6: Production build**

Run: `node_modules/.bin/next build`
Expected: success. This is the only check that catches an illegal page export (a Next.js page may export only `default` plus a fixed set of route names) — `tsc` passes those cleanly.

- [ ] **Step 7: Smoke the console against the real database**

Run: `node_modules/.bin/next dev` and open each route:

`/admin/console`, `/admin/console/products`, `/admin/console/orders`, `/admin/console/categories`, `/admin/console/media`, `/admin/console/customers`, `/admin/console/reviews`, `/admin/console/content`, `/admin/console/marketing`, `/admin/console/settings`, plus one `/admin/console/orders/<real-id>` and one `/admin/console/products/<real-id>`.

Each must render real store data. An empty table for a genuinely empty collection is a pass; an exception, a hydration error, or a screen still showing `Nguyễn Thị Hương` when that customer is not in the database is a failure.

- [ ] **Step 8: Commit any fixes**

```bash
git commit -am "fix(console): resolve data layer integration issues"
```

---

## Out of Scope

Named here so nobody mistakes them for gaps:

- **The crawler subsystem** — the job launcher, live progress and review queue screens keep their fixtures. There is no backend for them and building one is a separate project.
- **Every write** — approve/hide a review, toggle a coupon, change an order status, save settings. The existing `app/(payload)/admin/*` pages keep those actions.
- **Filter, tab and pagination interactivity** — counts and totals become real; the controls stay inert.
- **Retiring the duplicate Payload admin pages** — they hold the writes and stay until the console reaches parity.

## Success Criteria

- `grep` in Task 13 Step 1 returns nothing.
- `node_modules/.bin/tsc --noEmit`, `node_modules/.bin/vitest run` and `node_modules/.bin/next build` all pass.
- Every adapter has a mapper test covering, at minimum: an unresolved relationship, a null or missing value, an unknown enum value, and an empty list.
- Opening `/admin/console` against the real database shows real products, orders, customers and revenue.
- `git diff` on any `components/console/**` file shows only a props parameter, a deleted fixture const, or one of the three documented wireframe changes (Tasks 6, 7, and the `BrandPanel`/`PostEditor` changes in Tasks 4 and 9).
