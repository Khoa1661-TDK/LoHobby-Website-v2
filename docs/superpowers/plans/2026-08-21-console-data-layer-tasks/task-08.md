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
