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
