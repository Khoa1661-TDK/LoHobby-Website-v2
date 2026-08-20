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
