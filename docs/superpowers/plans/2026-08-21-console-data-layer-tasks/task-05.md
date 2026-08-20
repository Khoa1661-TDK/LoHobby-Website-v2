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
