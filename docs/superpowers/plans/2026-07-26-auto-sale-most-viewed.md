# Auto-Sale for Most-Viewed Products — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A nightly Payload job that puts the five products with the most unique viewers in the last 7 days on a 10% sale, and takes them off again when they drop off the list, without ever disturbing a sale an admin set by hand.

**Architecture:** Two pure functions carry all the policy (`countUniqueViewers` ranks, `selectAutoSale` decides), an impure shell (`runAutoSale`) does the I/O, and a Payload jobs task schedules it in-process. A new `autoSaleManaged` flag on products records which sales the job owns, so its removal pass can only ever undo its own work.

**Tech Stack:** Next.js 15, Payload CMS 3.84 (Postgres adapter, `payload` schema), Prisma (analytics tables), Vitest, pnpm.

**Spec:** `docs/superpowers/specs/2026-07-26-auto-sale-most-viewed-design.md`

## Global Constraints

- **Package manager is pnpm, but `pnpm <script>` is broken in this repo** (`runDepsStatusCheck` fails). Call binaries directly: `node_modules/.bin/vitest run`, `node_modules/.bin/payload …`, `node_modules/.bin/tsc --noEmit`.
- **Test files must import `describe` / `it` / `expect` from `vitest` explicitly.** `globals: true` is runtime-only; `tsc --noEmit` breaks without the import.
- **Payload's Postgres schema is `payload`,** not `public`. Every hand-written migration statement must qualify tables as `"payload"."table_name"`.
- **`payload migrate:create` needs a real TTY** and will bundle unrelated destructive statements caused by pre-existing dev-database drift. Always hand-trim the generated output down to only the statements this feature needs, and add a header comment saying so — follow the precedent in `src/migrations/20260725_183829_block_icon_fields.ts`.
- **A new Payload field or collection without a migration throws `42P01` at runtime** on the storefront. Migrations are not optional.
- **Do not add a top-level `import config from '@payload-config'` to any lib module that a Payload collection imports.** It causes a TDZ crash on every Payload route. `lib/auto-sale/run.ts` therefore takes `payload` as a parameter, and `payload.config.ts` imports it dynamically inside the task handler.
- **Constants** (exact values, defined once in `lib/constants.ts`): `AUTO_SALE_COUNT = 5`, `AUTO_SALE_PERCENT = 10`, `AUTO_SALE_WINDOW_DAYS = 7`, `AUTO_SALE_MIN_VIEWERS = 5`.
- **Commit after every task.** Conventional Commits, lowercase imperative, no trailing period. Commit directly to `main` — this is a solo project.

## File Structure

| File | Responsibility |
|---|---|
| `lib/constants.ts` *(modify)* | The four auto-sale tuning constants |
| `lib/analytics/product-metrics.ts` *(modify)* | Add `countUniqueViewers` beside the existing pure aggregators |
| `lib/auto-sale/select.ts` *(create)* | Pure policy: eligibility rails, top-N pick, removal pass |
| `lib/auto-sale/run.ts` *(create)* | Impure shell: query → select → apply → summary |
| `lib/payload-hooks.ts` *(modify)* | `AUTO_SALE_CONTEXT` / `isAutoSaleWrite` marker |
| `src/payload/collections/Products.ts` *(modify)* | `autoSaleManaged` field + ownership-release hook |
| `src/payload/globals/AutoSaleSettings.ts` *(create)* | Enabled toggle, exclusion list, last-run summary |
| `payload.config.ts` *(modify)* | Register the global, the task, and the `autoRun` cron |
| `src/migrations/*` *(create ×3)* | Product column; settings global; jobs system tables |
| `lib/__tests__/auto-sale-select.test.ts` *(create)* | The bulk of the test weight |
| `lib/__tests__/auto-sale-viewers.test.ts` *(create)* | `countUniqueViewers` units |
| `lib/__tests__/auto-sale-ownership.test.ts` *(create)* | The manual-edit release rule |

---

### Task 1: Rank products by unique viewers

**Files:**
- Modify: `lib/constants.ts` (append at end)
- Modify: `lib/analytics/product-metrics.ts` (append a new section at end)
- Test: `lib/__tests__/auto-sale-viewers.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `AUTO_SALE_COUNT`, `AUTO_SALE_PERCENT`, `AUTO_SALE_WINDOW_DAYS`, `AUTO_SALE_MIN_VIEWERS` from `@/lib/constants`; `type ProductViewers = { productId: string; viewers: number; rawViews: number }` and `countUniqueViewers(pairs: ViewerPair[]): ProductViewers[]` from `@/lib/analytics/product-metrics`, where `ViewerPair = { productId: string; sessionId: string; _count: number }`.

`_count` is named with a leading underscore because the rows come straight from `prisma.productViewEvent.groupBy`, which returns that shape. Do not rename it — the shell passes Prisma's rows through untouched.

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/auto-sale-viewers.test.ts`:

```ts
// lib/__tests__/auto-sale-viewers.test.ts
import { describe, it, expect } from 'vitest';
import { countUniqueViewers } from '@/lib/analytics/product-metrics';

describe('countUniqueViewers', () => {
  it('should count one viewer per distinct session regardless of repeat views', () => {
    const rows = countUniqueViewers([
      { productId: 'p1', sessionId: 's1', _count: 40 },
      { productId: 'p1', sessionId: 's2', _count: 1 },
    ]);
    expect(rows).toEqual([{ productId: 'p1', viewers: 2, rawViews: 41 }]);
  });

  it('should rank a product with more unique viewers above one with more raw views', () => {
    const rows = countUniqueViewers([
      { productId: 'refresher', sessionId: 's1', _count: 99 },
      { productId: 'popular', sessionId: 's2', _count: 1 },
      { productId: 'popular', sessionId: 's3', _count: 1 },
    ]);
    expect(rows.map((r) => r.productId)).toEqual(['popular', 'refresher']);
  });

  it('should break viewer ties by raw views, then by productId', () => {
    const rows = countUniqueViewers([
      { productId: 'b', sessionId: 's1', _count: 1 },
      { productId: 'a', sessionId: 's2', _count: 1 },
      { productId: 'c', sessionId: 's3', _count: 5 },
    ]);
    expect(rows.map((r) => r.productId)).toEqual(['c', 'a', 'b']);
  });

  it('should ignore rows with an empty productId', () => {
    expect(countUniqueViewers([{ productId: '', sessionId: 's1', _count: 3 }])).toEqual([]);
  });

  it('should return an empty array for no events', () => {
    expect(countUniqueViewers([])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node_modules/.bin/vitest run lib/__tests__/auto-sale-viewers.test.ts`
Expected: FAIL — `countUniqueViewers is not a function` / no matching export.

- [ ] **Step 3: Add the constants**

Append to `lib/constants.ts`:

```ts
// --- Auto-sale (most-viewed products) -------------------------------------
// See docs/superpowers/specs/2026-07-26-auto-sale-most-viewed-design.md

/** Maximum products the auto-sale job keeps on sale at once. */
export const AUTO_SALE_COUNT = 5;

/** Discount applied to every auto-sale product, in percent. */
export const AUTO_SALE_PERCENT = 10;

/** Rolling window of view data used to rank products, in days. */
export const AUTO_SALE_WINDOW_DAYS = 7;

/**
 * Minimum unique viewers before a product is eligible. Without this floor, a
 * quiet week where three products drew one visitor each would discount all
 * three on the strength of a single page load.
 */
export const AUTO_SALE_MIN_VIEWERS = 5;
```

- [ ] **Step 4: Implement `countUniqueViewers`**

Append to `lib/analytics/product-metrics.ts`:

```ts
// ---------------------------------------------------------------------------
// Unique-viewer ranking (auto-sale)
// ---------------------------------------------------------------------------

/** One distinct (product, session) pair with how many raw events it covered. */
export type ViewerPair = {
  productId: string;
  sessionId: string;
  _count: number;
};

export type ProductViewers = {
  productId: string;
  viewers: number;
  rawViews: number;
};

/**
 * Fold distinct (productId, sessionId) pairs into per-product unique-viewer
 * counts, ranked descending.
 *
 * Distinct sessions rather than raw events: a view costs the visitor nothing,
 * so one shopper refreshing or one crawler sweeping the catalogue would
 * otherwise outrank genuine interest. `rawViews` is retained only to break
 * ties deterministically.
 *
 * Kept separate from `aggregateAttention`, which counts raw events on purpose
 * for the analytics dashboard's "attention" figure.
 */
export function countUniqueViewers(pairs: ViewerPair[]): ProductViewers[] {
  const map = new Map<string, ProductViewers>();

  for (const pair of pairs) {
    if (!pair.productId) continue;
    const entry = map.get(pair.productId) ?? {
      productId: pair.productId,
      viewers: 0,
      rawViews: 0,
    };
    entry.viewers += 1;
    entry.rawViews += Number.isFinite(pair._count) ? pair._count : 0;
    map.set(pair.productId, entry);
  }

  return [...map.values()].sort(
    (a, b) =>
      b.viewers - a.viewers ||
      b.rawViews - a.rawViews ||
      a.productId.localeCompare(b.productId),
  );
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `node_modules/.bin/vitest run lib/__tests__/auto-sale-viewers.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 6: Type-check and commit**

```bash
node_modules/.bin/tsc --noEmit
git add lib/constants.ts lib/analytics/product-metrics.ts lib/__tests__/auto-sale-viewers.test.ts
git commit -m "feat(auto-sale): rank products by unique viewers"
```

---

### Task 2: The selector — all policy, no I/O

**Files:**
- Create: `lib/auto-sale/select.ts`
- Test: `lib/__tests__/auto-sale-select.test.ts`

**Interfaces:**
- Consumes: `ProductViewers` from `@/lib/analytics/product-metrics`; the four constants from `@/lib/constants`.
- Produces, from `@/lib/auto-sale/select`:
  - `type AutoSaleCandidate = { productId: string; title: string; available: boolean; stock: number | null; variantStocks: number[]; onSale: boolean; salePercent: number | null; autoSaleManaged: boolean }`
  - `type AutoSalePlan = { toEnable: { productId: string; title: string; salePercent: number }[]; toDisable: { productId: string; title: string }[]; skippedCount: number }`
  - `hasStock(candidate: AutoSaleCandidate): boolean`
  - `selectAutoSale(ranked: ProductViewers[], candidates: AutoSaleCandidate[], excludedProductIds: string[]): AutoSalePlan`

`stock: null` means unlimited (matches the Payload field, where empty = unlimited). `variantStocks` is empty for products without variants; when non-empty it takes precedence over `stock`, mirroring `lib/inventory.ts`.

The spec sketched `toDisable` as `string[]`; it carries titles here so the run summary can name products without a second lookup.

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/auto-sale-select.test.ts`:

```ts
// lib/__tests__/auto-sale-select.test.ts
import { describe, it, expect } from 'vitest';
import { selectAutoSale, hasStock, type AutoSaleCandidate } from '@/lib/auto-sale/select';
import type { ProductViewers } from '@/lib/analytics/product-metrics';

/** A product that passes every rail, so each test can vary one thing. */
function candidate(overrides: Partial<AutoSaleCandidate> = {}): AutoSaleCandidate {
  return {
    productId: 'p1',
    title: 'Product 1',
    available: true,
    stock: 10,
    variantStocks: [],
    onSale: false,
    salePercent: null,
    autoSaleManaged: false,
    ...overrides,
  };
}

/** Ranked entry with enough viewers to clear the floor. */
function ranked(productId: string, viewers = 50): ProductViewers {
  return { productId, viewers, rawViews: viewers };
}

describe('hasStock', () => {
  it('should treat null stock as unlimited', () => {
    expect(hasStock(candidate({ stock: null }))).toBe(true);
  });

  it('should be false when plain stock is zero', () => {
    expect(hasStock(candidate({ stock: 0 }))).toBe(false);
  });

  it('should use variant stock when variants exist, ignoring the product-level field', () => {
    expect(hasStock(candidate({ stock: 0, variantStocks: [0, 3] }))).toBe(true);
    expect(hasStock(candidate({ stock: 99, variantStocks: [0, 0] }))).toBe(false);
  });
});

describe('selectAutoSale', () => {
  it('should enable the top products at the auto rate', () => {
    const plan = selectAutoSale(
      [ranked('p1', 90), ranked('p2', 80)],
      [candidate({ productId: 'p1' }), candidate({ productId: 'p2', title: 'Product 2' })],
      [],
    );
    expect(plan.toEnable).toEqual([
      { productId: 'p1', title: 'Product 1', salePercent: 10 },
      { productId: 'p2', title: 'Product 2', salePercent: 10 },
    ]);
  });

  it('should cap the sale set at AUTO_SALE_COUNT', () => {
    const ids = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
    const plan = selectAutoSale(
      ids.map((id, i) => ranked(id, 100 - i)),
      ids.map((id) => candidate({ productId: id })),
      [],
    );
    expect(plan.toEnable.map((e) => e.productId)).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('should skip products below the unique-viewer floor', () => {
    const plan = selectAutoSale([ranked('p1', 4)], [candidate({ productId: 'p1' })], []);
    expect(plan.toEnable).toEqual([]);
  });

  it('should skip unavailable products', () => {
    const plan = selectAutoSale([ranked('p1')], [candidate({ available: false })], []);
    expect(plan.toEnable).toEqual([]);
  });

  it('should skip out-of-stock products', () => {
    const plan = selectAutoSale([ranked('p1')], [candidate({ stock: 0 })], []);
    expect(plan.toEnable).toEqual([]);
  });

  it('should skip excluded products', () => {
    const plan = selectAutoSale([ranked('p1')], [candidate()], ['p1']);
    expect(plan.toEnable).toEqual([]);
  });

  it('should never enable or disable a manually-set sale', () => {
    const manual = candidate({ onSale: true, salePercent: 25, autoSaleManaged: false });
    const plan = selectAutoSale([ranked('p1')], [manual], []);
    expect(plan.toEnable).toEqual([]);
    expect(plan.toDisable).toEqual([]);
  });

  it('should skip products already discounted deeper than the auto rate', () => {
    const plan = selectAutoSale(
      [ranked('p1')],
      [candidate({ onSale: true, salePercent: 30, autoSaleManaged: true })],
      [],
    );
    expect(plan.toEnable).toEqual([]);
  });

  it('should treat a product already in the target state as a no-op', () => {
    const settled = candidate({ onSale: true, salePercent: 10, autoSaleManaged: true });
    const plan = selectAutoSale([ranked('p1')], [settled], []);
    expect(plan.toEnable).toEqual([]);
    expect(plan.toDisable).toEqual([]);
  });

  it('should disable auto-managed products that fell off the list', () => {
    const stale = candidate({
      productId: 'old',
      title: 'Old',
      onSale: true,
      salePercent: 10,
      autoSaleManaged: true,
    });
    const plan = selectAutoSale(
      [ranked('p1')],
      [candidate({ productId: 'p1' }), stale],
      [],
    );
    expect(plan.toDisable).toEqual([{ productId: 'old', title: 'Old' }]);
  });

  it('should reach further down the ranking when higher candidates are knocked out', () => {
    const ids = ['a', 'b', 'c', 'd', 'e', 'f'];
    const plan = selectAutoSale(
      ids.map((id, i) => ranked(id, 100 - i)),
      ids.map((id) => candidate({ productId: id, stock: id === 'b' ? 0 : 10 })),
      [],
    );
    expect(plan.toEnable.map((e) => e.productId)).toEqual(['a', 'c', 'd', 'e', 'f']);
  });

  it('should count already-settled products against the cap', () => {
    const settled = candidate({
      productId: 'settled',
      onSale: true,
      salePercent: 10,
      autoSaleManaged: true,
    });
    const fresh = ['a', 'b', 'c', 'd', 'e'];
    const plan = selectAutoSale(
      [ranked('settled', 100), ...fresh.map((id, i) => ranked(id, 90 - i))],
      [settled, ...fresh.map((id) => candidate({ productId: id }))],
      [],
    );
    expect(plan.toEnable).toHaveLength(4);
    expect(plan.toDisable).toEqual([]);
  });

  it('should not touch a manual sale set below the auto rate', () => {
    const manual = candidate({ onSale: true, salePercent: 5, autoSaleManaged: false });
    const plan = selectAutoSale([ranked('p1')], [manual], []);
    expect(plan.toEnable).toEqual([]);
    expect(plan.toDisable).toEqual([]);
  });

  it('should under-fill when too few products are eligible at all', () => {
    const plan = selectAutoSale(
      [ranked('a', 90), ranked('b', 80), ranked('c', 70)],
      [
        candidate({ productId: 'a' }),
        candidate({ productId: 'b', stock: 0 }),
        candidate({ productId: 'c' }),
      ],
      ['c'],
    );
    expect(plan.toEnable.map((e) => e.productId)).toEqual(['a']);
  });

  it('should ignore ranked products that no longer exist in the catalogue', () => {
    const plan = selectAutoSale([ranked('ghost')], [candidate({ productId: 'p1' })], []);
    expect(plan.toEnable).toEqual([]);
  });

  it('should count knocked-out candidates as skipped', () => {
    const plan = selectAutoSale(
      [ranked('a'), ranked('b')],
      [candidate({ productId: 'a', stock: 0 }), candidate({ productId: 'b' })],
      [],
    );
    expect(plan.skippedCount).toBe(1);
  });

  it('should produce an empty plan when nothing was viewed', () => {
    expect(selectAutoSale([], [candidate()], [])).toEqual({
      toEnable: [],
      toDisable: [],
      skippedCount: 0,
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node_modules/.bin/vitest run lib/__tests__/auto-sale-select.test.ts`
Expected: FAIL — cannot resolve `@/lib/auto-sale/select`.

- [ ] **Step 3: Implement the selector**

Create `lib/auto-sale/select.ts`:

```ts
// lib/auto-sale/select.ts — PURE auto-sale policy: no DB, no Payload, no clock.
//
// Every eligibility rule lives here so it can be tested exhaustively without
// touching a database. See
// docs/superpowers/specs/2026-07-26-auto-sale-most-viewed-design.md.
import {
  AUTO_SALE_COUNT,
  AUTO_SALE_MIN_VIEWERS,
  AUTO_SALE_PERCENT,
} from '@/lib/constants';
import type { ProductViewers } from '@/lib/analytics/product-metrics';

/** A product as the selector sees it. `stock: null` means unlimited. */
export type AutoSaleCandidate = {
  productId: string;
  title: string;
  available: boolean;
  stock: number | null;
  /** Empty when the product has no variants; otherwise takes precedence over `stock`. */
  variantStocks: number[];
  onSale: boolean;
  salePercent: number | null;
  autoSaleManaged: boolean;
};

export type AutoSalePlan = {
  toEnable: { productId: string; title: string; salePercent: number }[];
  toDisable: { productId: string; title: string }[];
  /** Ranked products that cleared the viewer floor but failed a later rail. */
  skippedCount: number;
};

/** Mirrors lib/inventory.ts: variant stock wins when variants exist. */
export function hasStock(candidate: AutoSaleCandidate): boolean {
  if (candidate.variantStocks.length > 0) {
    return candidate.variantStocks.some((stock) => stock > 0);
  }
  if (candidate.stock === null) return true;
  return candidate.stock > 0;
}

/** A sale an admin set by hand — the job must neither create nor clear it. */
function isManualSale(candidate: AutoSaleCandidate): boolean {
  return candidate.onSale && !candidate.autoSaleManaged;
}

export function selectAutoSale(
  ranked: ProductViewers[],
  candidates: AutoSaleCandidate[],
  excludedProductIds: string[],
): AutoSalePlan {
  const byId = new Map(candidates.map((c) => [c.productId, c]));
  const excluded = new Set(excludedProductIds);

  const toEnable: AutoSalePlan['toEnable'] = [];
  const chosen = new Set<string>();
  let skippedCount = 0;

  for (const entry of ranked) {
    if (chosen.size >= AUTO_SALE_COUNT) break;
    if (entry.viewers < AUTO_SALE_MIN_VIEWERS) break; // ranked descending — the rest are worse

    const candidate = byId.get(entry.productId);
    if (!candidate) continue; // ranked but no longer in the catalogue

    if (
      !candidate.available ||
      !hasStock(candidate) ||
      excluded.has(candidate.productId) ||
      isManualSale(candidate) ||
      (candidate.salePercent ?? 0) > AUTO_SALE_PERCENT
    ) {
      skippedCount += 1;
      continue;
    }

    // Backfill is intended: the whole ranking is filtered, so knocking out a
    // high-ranked product lets a lower one take its slot (user decision,
    // 2026-07-26). `chosen` — not `toEnable` — is what the cap counts, so a
    // product already in the target state still occupies one of the slots.
    chosen.add(candidate.productId);

    const alreadySettled =
      candidate.onSale &&
      candidate.autoSaleManaged &&
      candidate.salePercent === AUTO_SALE_PERCENT;
    if (alreadySettled) continue; // no-op, but it still holds its slot

    toEnable.push({
      productId: candidate.productId,
      title: candidate.title,
      salePercent: AUTO_SALE_PERCENT,
    });
  }

  // Removal pass. Scoped to autoSaleManaged so it is structurally incapable of
  // clearing a sale the job did not create.
  const toDisable = candidates
    .filter((c) => c.autoSaleManaged && !chosen.has(c.productId))
    .map((c) => ({ productId: c.productId, title: c.title }));

  return { toEnable, toDisable, skippedCount };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node_modules/.bin/vitest run lib/__tests__/auto-sale-select.test.ts`
Expected: PASS, 20 tests.

- [ ] **Step 5: Type-check and commit**

```bash
node_modules/.bin/tsc --noEmit
git add lib/auto-sale/select.ts lib/__tests__/auto-sale-select.test.ts
git commit -m "feat(auto-sale): add pure selector for most-viewed sale set"
```

---

### Task 3: Ownership marker on products

**Files:**
- Modify: `lib/payload-hooks.ts` (append after the existing context constants and predicates)
- Modify: `src/payload/collections/Products.ts`
- Create: `src/migrations/<timestamp>_auto_sale_managed.ts`
- Test: `lib/__tests__/auto-sale-ownership.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `AUTO_SALE_CONTEXT` and `isAutoSaleWrite(req)` from `@/lib/payload-hooks`; `shouldReleaseAutoSale(args)` from `@/lib/auto-sale/select`; the `autoSaleManaged` boolean field on the `products` collection.

This is the task the whole safety story rests on. Without the release hook, un-ticking a sale by hand would be silently re-ticked that night.

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/auto-sale-ownership.test.ts`:

```ts
// lib/__tests__/auto-sale-ownership.test.ts
import { describe, it, expect } from 'vitest';
import { shouldReleaseAutoSale } from '@/lib/auto-sale/select';
import { AUTO_SALE_CONTEXT, isAutoSaleWrite } from '@/lib/payload-hooks';

describe('isAutoSaleWrite', () => {
  it('should recognise the job context', () => {
    expect(isAutoSaleWrite({ context: { ...AUTO_SALE_CONTEXT } })).toBe(true);
  });

  it('should be false for an ordinary admin request', () => {
    expect(isAutoSaleWrite({ context: {} })).toBe(false);
    expect(isAutoSaleWrite({})).toBe(false);
  });
});

describe('shouldReleaseAutoSale', () => {
  it('should release when an admin unticks the sale', () => {
    expect(
      shouldReleaseAutoSale({
        incoming: { onSale: false },
        original: { onSale: true, salePercent: 10 },
        isJobWrite: false,
      }),
    ).toBe(true);
  });

  it('should release when an admin changes the discount', () => {
    expect(
      shouldReleaseAutoSale({
        incoming: { salePercent: 25 },
        original: { onSale: true, salePercent: 10 },
        isJobWrite: false,
      }),
    ).toBe(true);
  });

  it('should not release when the job itself writes the sale', () => {
    expect(
      shouldReleaseAutoSale({
        incoming: { onSale: true, salePercent: 10 },
        original: { onSale: false, salePercent: null },
        isJobWrite: true,
      }),
    ).toBe(false);
  });

  it('should not release when an admin edits an unrelated field', () => {
    expect(
      shouldReleaseAutoSale({
        incoming: { title: 'New title' },
        original: { onSale: true, salePercent: 10 },
        isJobWrite: false,
      }),
    ).toBe(false);
  });

  it('should not release when the submitted sale values are unchanged', () => {
    expect(
      shouldReleaseAutoSale({
        incoming: { onSale: true, salePercent: 10 },
        original: { onSale: true, salePercent: 10 },
        isJobWrite: false,
      }),
    ).toBe(false);
  });

  it('should not release on create, where there is no original doc', () => {
    expect(
      shouldReleaseAutoSale({
        incoming: { onSale: true, salePercent: 20 },
        original: undefined,
        isJobWrite: false,
      }),
    ).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node_modules/.bin/vitest run lib/__tests__/auto-sale-ownership.test.ts`
Expected: FAIL — `shouldReleaseAutoSale` and `isAutoSaleWrite` are not exported.

- [ ] **Step 3: Add the context marker**

Append to `lib/payload-hooks.ts`, after `SKIP_ORDER_INVENTORY_HOOK_CONTEXT`:

```ts
/** Passed on product updates made by the auto-sale job — keeps ownership with the job. */
export const AUTO_SALE_CONTEXT = { fromAutoSale: true } as const;
```

And after `isSkipOrderInventoryHook`:

```ts
export function isAutoSaleWrite(req: { context?: Record<string, unknown> }): boolean {
  return req.context?.fromAutoSale === true;
}
```

- [ ] **Step 4: Add the pure release rule**

Append to `lib/auto-sale/select.ts`:

```ts
/**
 * Whether a product save should hand ownership of its sale back to the admin.
 *
 * Any human edit to `onSale` or `salePercent` takes the product out of the
 * job's control, so the job never silently re-applies a sale someone removed
 * by hand. Writes made by the job itself are exempt.
 */
export function shouldReleaseAutoSale(args: {
  incoming: { onSale?: unknown; salePercent?: unknown };
  original: { onSale?: unknown; salePercent?: unknown } | undefined;
  isJobWrite: boolean;
}): boolean {
  const { incoming, original, isJobWrite } = args;
  if (isJobWrite || !original) return false;

  const onSaleChanged = incoming.onSale !== undefined && incoming.onSale !== original.onSale;
  const percentChanged =
    incoming.salePercent !== undefined && incoming.salePercent !== original.salePercent;

  return onSaleChanged || percentChanged;
}
```

- [ ] **Step 5: Wire the hook and field into the collection**

In `src/payload/collections/Products.ts`, extend the import from `@/lib/payload-hooks` (currently lines 18–23) to also pull in `isAutoSaleWrite`, and add a new import:

```ts
import { shouldReleaseAutoSale } from '@/lib/auto-sale/select';
```

Add this hook definition next to `syncOnSaleCategory` (after it, before `normalizeCategoryIds`):

```ts
/**
 * Hand a product's sale back to the admin the moment they touch it by hand.
 *
 * The auto-sale job only ever removes sales where `autoSaleManaged` is true, so
 * clearing the flag here is what makes a manual edit permanent.
 */
const releaseAutoSaleOnManualEdit: CollectionBeforeChangeHook = ({ data, originalDoc, req }) => {
  if (!data || isMediaResync(req) || isSnapshotBackfill(req)) return data;

  if (
    shouldReleaseAutoSale({
      incoming: data,
      original: originalDoc,
      isJobWrite: isAutoSaleWrite(req),
    })
  ) {
    data.autoSaleManaged = false;
  }

  return data;
};
```

Register it in `hooks.beforeChange` (line 345), directly after `syncOnSaleCategory`:

```ts
    beforeChange: [
      autoSlugFromTitle,
      syncOnSaleCategory,
      releaseAutoSaleOnManualEdit,
      normalizeCategoryIds,
      dedupeGalleryOnMainImageChange,
      stripSnapshotsFromIncomingSave,
    ],
```

Add the field immediately after the `salePercent` field definition (which ends around line 435):

```ts
    {
      name: 'autoSaleManaged',
      type: 'checkbox',
      defaultValue: false,
      label: 'Sale set automatically',
      admin: {
        hidden: true,
        readOnly: true,
        description:
          'Set by the auto-sale job. Editing the sale by hand clears this and the job stops managing this product.',
      },
    },
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `node_modules/.bin/vitest run lib/__tests__/auto-sale-ownership.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 7: Regenerate Payload types**

Run: `node_modules/.bin/payload generate:types`
Expected: `src/payload/payload-types.ts` gains `autoSaleManaged?: boolean | null` on the `Product` interface. Verify with `grep -n "autoSaleManaged" src/payload/payload-types.ts`.

`generate:types` is also the only thing that catches a field-name collision — `tsc` will not.

- [ ] **Step 8: Create the migration**

Check the ledger first, since this repo has had migration drift:

```bash
node_modules/.bin/payload migrate:status
```

Create `src/migrations/20260726_120000_auto_sale_managed.ts`. The change is a single additive column, so write it by hand rather than fighting `migrate:create`'s drift bundling:

```ts
import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Adds the `autoSaleManaged` ownership flag to products. Written by hand rather
// than generated: `payload migrate:create` bundles unrelated destructive
// statements caused by pre-existing dev-database drift, and this change is one
// additive column. See the header of 20260725_183829_block_icon_fields.ts.

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload"."products" ADD COLUMN IF NOT EXISTS "auto_sale_managed" boolean DEFAULT false;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload"."products" DROP COLUMN IF EXISTS "auto_sale_managed";
  `)
}
```

Register it in `src/migrations/index.ts` following the existing entries' format (import + append to the exported array, in timestamp order).

- [ ] **Step 9: Run the migration**

Run: `yes | node_modules/.bin/payload migrate`

The `yes |` is required — `payload migrate` blocks on a dev-mode data-loss prompt that `--force-accept-warning` does not suppress.

Verify the column landed:

```bash
node_modules/.bin/payload migrate:status
```

Expected: the new migration listed as run.

- [ ] **Step 10: Full test suite and commit**

```bash
node_modules/.bin/vitest run
node_modules/.bin/tsc --noEmit
git add lib/payload-hooks.ts lib/auto-sale/select.ts src/payload/collections/Products.ts src/payload/payload-types.ts src/migrations/ lib/__tests__/auto-sale-ownership.test.ts
git commit -m "feat(auto-sale): track job-owned sales with autoSaleManaged"
```

---

### Task 4: Auto-sale settings global

**Files:**
- Create: `src/payload/globals/AutoSaleSettings.ts`
- Modify: `payload.config.ts` (import at line ~22, `globals` array at line 96)
- Create: `src/migrations/<timestamp>_auto_sale_settings.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: the `auto-sale-settings` global, read by `runAutoSale` in Task 5 via `payload.findGlobal({ slug: 'auto-sale-settings' })`. Fields: `enabled` (boolean), `excludedProducts` (hasMany relationship to `products`), and a `lastRun` group with `ranAt`, `enabledCount`, `disabledCount`, `skippedCount`, `errorCount`, `enabledProducts`, `disabledProducts`, `error`.

Product name lists are stored as comma-joined `text`, not arrays — they are a human-readable record, and text keeps the migration to one table with no join rows.

- [ ] **Step 1: Create the global**

Create `src/payload/globals/AutoSaleSettings.ts`:

```ts
// src/payload/globals/AutoSaleSettings.ts
import type { GlobalConfig } from 'payload';
import { payloadAdminAccess } from '@/lib/payload-access';
import { groups } from '@/src/payload/groups';

export const AutoSaleSettings: GlobalConfig = {
  slug: 'auto-sale-settings',
  label: 'Automatic sale',
  admin: {
    description:
      'A nightly job puts the 5 most-viewed products of the last 7 days on a 10% sale, and removes them when they drop off. Sales you set by hand are never touched.',
    group: groups.settings.name,
  },
  access: {
    read: () => true,
    update: payloadAdminAccess,
  },
  fields: [
    {
      name: 'enabled',
      type: 'checkbox',
      label: 'Run the automatic sale',
      defaultValue: true,
      admin: {
        description: 'Unticking stops the job. Products already on auto-sale stay as they are.',
      },
    },
    {
      name: 'excludedProducts',
      type: 'relationship',
      relationTo: 'products',
      hasMany: true,
      label: 'Never auto-discount',
      admin: {
        description: 'Protected or low-margin products the job must skip, however popular they get.',
      },
    },
    {
      name: 'lastRun',
      type: 'group',
      label: 'Last run',
      admin: {
        description: 'Written by the job. Read-only.',
      },
      fields: [
        { name: 'ranAt', type: 'text', label: 'Ran at', admin: { readOnly: true } },
        { name: 'enabledCount', type: 'number', label: 'Put on sale', admin: { readOnly: true } },
        { name: 'disabledCount', type: 'number', label: 'Taken off sale', admin: { readOnly: true } },
        { name: 'skippedCount', type: 'number', label: 'Skipped', admin: { readOnly: true } },
        { name: 'errorCount', type: 'number', label: 'Failed updates', admin: { readOnly: true } },
        { name: 'enabledProducts', type: 'text', label: 'Put on sale', admin: { readOnly: true } },
        { name: 'disabledProducts', type: 'text', label: 'Taken off sale', admin: { readOnly: true } },
        { name: 'error', type: 'text', label: 'Error', admin: { readOnly: true } },
      ],
    },
  ],
};
```

- [ ] **Step 2: Register it**

In `payload.config.ts`, add the import beside the other globals (alphabetically, before `DropshipSettings` at line 22):

```ts
import { AutoSaleSettings } from './src/payload/globals/AutoSaleSettings';
```

And extend the `globals` array (line 96):

```ts
  globals: [SiteHeader, Navigation, StoreSettings, ShippingSettings, DropshipSettings, NotificationSettings, AutoSaleSettings],
```

- [ ] **Step 3: Regenerate types and confirm no field-name collision**

Run: `node_modules/.bin/payload generate:types`
Expected: succeeds, and `src/payload/payload-types.ts` gains an `AutoSaleSetting` interface. Verify with `grep -n "AutoSaleSetting" src/payload/payload-types.ts`.

If this errors on a duplicate field name, rename the offending field before continuing — `tsc` will not catch it.

- [ ] **Step 4: Generate the migration**

A global with a `hasMany` relationship needs both a settings table and a `_rels` join table, which is more than is worth hand-writing. Generate it in a real terminal (the command prompts, so it needs a TTY):

```bash
node_modules/.bin/payload migrate:create auto_sale_settings
```

Then **open the generated file and delete every statement that is not about `auto_sale_settings`.** Expect drift-induced `DROP TABLE` / `DROP COLUMN` statements against unrelated tables — those are the known trap, not your changes. Keep only statements matching this shape, and add a header comment recording the trim:

```sql
CREATE TABLE IF NOT EXISTS "payload"."auto_sale_settings" (...);
CREATE TABLE IF NOT EXISTS "payload"."auto_sale_settings_rels" (...);
ALTER TABLE "payload"."auto_sale_settings_rels" ADD CONSTRAINT ... FOREIGN KEY ...;
CREATE INDEX IF NOT EXISTS ... ON "payload"."auto_sale_settings_rels" ...;
```

The `down` migration should drop only those two tables.

- [ ] **Step 5: Run the migration**

```bash
yes | node_modules/.bin/payload migrate
node_modules/.bin/payload migrate:status
```

Expected: the new migration listed as run, no errors.

- [ ] **Step 6: Verify in the admin panel**

Start the dev server (`node_modules/.bin/next dev --turbo`), open `/admin`, and confirm **Settings → Automatic sale** loads, shows the toggle and the product picker, and saves without error. A `42P01` here means the migration did not cover the schema.

- [ ] **Step 7: Commit**

```bash
node_modules/.bin/vitest run
node_modules/.bin/tsc --noEmit
git add src/payload/globals/AutoSaleSettings.ts payload.config.ts src/payload/payload-types.ts src/migrations/
git commit -m "feat(auto-sale): add auto-sale settings global"
```

---

### Task 5: The run shell

**Files:**
- Create: `lib/auto-sale/run.ts`

**Interfaces:**
- Consumes: `countUniqueViewers`, `ProductViewers` (Task 1); `selectAutoSale`, `AutoSaleCandidate` (Task 2); `AUTO_SALE_CONTEXT` (Task 3); the `auto-sale-settings` global (Task 4); `AUTO_SALE_WINDOW_DAYS` from `@/lib/constants`.
- Produces: `type AutoSaleRunSummary` and `runAutoSale(payload: Payload): Promise<AutoSaleRunSummary>` from `@/lib/auto-sale/run`, called by the task handler in Task 6.

No unit test — this is I/O wiring, and mocking Payload plus Prisma to assert on call ordering would test the mocks. It is verified end-to-end in Task 7.

`runAutoSale` takes `payload` as a parameter and must **not** import `@payload-config`, to avoid the import-cycle TDZ crash documented in the Global Constraints.

- [ ] **Step 1: Implement the shell**

Create `lib/auto-sale/run.ts`:

```ts
// lib/auto-sale/run.ts — impure shell for the auto-sale job.
//
// Query -> rank -> select -> apply -> summarise. All policy lives in
// ./select.ts; this file only does I/O.
//
// Takes `payload` as a parameter rather than importing `@payload-config`:
// a top-level config import here would create a cycle through Products.ts
// (which imports ./select.ts) and TDZ-crash every Payload route.
import type { Payload } from 'payload';
import { prisma } from '@/lib/prisma';
import { countUniqueViewers } from '@/lib/analytics/product-metrics';
import { AUTO_SALE_WINDOW_DAYS } from '@/lib/constants';
import { AUTO_SALE_CONTEXT } from '@/lib/payload-hooks';
import { selectAutoSale, type AutoSaleCandidate } from '@/lib/auto-sale/select';

export type AutoSaleRunSummary = {
  ranAt: string;
  enabledCount: number;
  disabledCount: number;
  skippedCount: number;
  errorCount: number;
  enabledProducts: string;
  disabledProducts: string;
  error: string;
};

const EMPTY_SUMMARY = (): AutoSaleRunSummary => ({
  ranAt: new Date().toISOString(),
  enabledCount: 0,
  disabledCount: 0,
  skippedCount: 0,
  errorCount: 0,
  enabledProducts: '',
  disabledProducts: '',
  error: '',
});

function relationshipId(value: unknown): string | null {
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (value && typeof value === 'object' && 'id' in value) {
    const id = (value as { id?: unknown }).id;
    if (typeof id === 'string' || typeof id === 'number') return String(id);
  }
  return null;
}

function toNumberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/** Ranked (productId, viewers) for the configured window, most-viewed first. */
async function rankByViewers(): Promise<ReturnType<typeof countUniqueViewers>> {
  const since = new Date(Date.now() - AUTO_SALE_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  // groupBy rather than findMany: ProductViewEvent is a high-write-volume table
  // and the database can do the dedupe without shipping a week of rows here.
  const pairs = await prisma.productViewEvent.groupBy({
    by: ['productId', 'sessionId'],
    where: { createdAt: { gte: since } },
    _count: true,
  });

  return countUniqueViewers(
    pairs.map((row) => ({
      productId: row.productId,
      sessionId: row.sessionId,
      _count: typeof row._count === 'number' ? row._count : 0,
    })),
  );
}

/** Every product, flattened into the shape the pure selector expects. */
async function loadCandidates(payload: Payload): Promise<AutoSaleCandidate[]> {
  const result = await payload.find({
    collection: 'products',
    limit: 0,
    pagination: false,
    depth: 1, // hydrate the `variants` join so per-variant stock is visible
  });

  return result.docs.map((doc) => {
    const variantDocs = Array.isArray((doc.variants as { docs?: unknown[] })?.docs)
      ? ((doc.variants as { docs: unknown[] }).docs as { stock?: unknown }[])
      : [];

    return {
      productId: String(doc.id),
      title: typeof doc.title === 'string' ? doc.title : String(doc.id),
      available: doc.available !== false,
      stock: toNumberOrNull(doc.stock),
      variantStocks: variantDocs.map((v) => toNumberOrNull(v.stock) ?? 0),
      onSale: doc.onSale === true,
      salePercent: toNumberOrNull(doc.salePercent),
      autoSaleManaged: doc.autoSaleManaged === true,
    } satisfies AutoSaleCandidate;
  });
}

async function writeSummary(payload: Payload, summary: AutoSaleRunSummary): Promise<void> {
  try {
    await payload.updateGlobal({
      slug: 'auto-sale-settings',
      data: { lastRun: summary },
      depth: 0,
    });
  } catch (error) {
    console.error('[auto-sale] failed to write run summary:', error);
  }
}

/**
 * Reconcile the auto-sale set. Idempotent: it computes the desired state and
 * applies the difference, so a partial run self-heals on the next one.
 */
export async function runAutoSale(payload: Payload): Promise<AutoSaleRunSummary> {
  const summary = EMPTY_SUMMARY();

  let excludedProductIds: string[] = [];
  try {
    const settings = await payload.findGlobal({ slug: 'auto-sale-settings', depth: 0 });
    if (settings?.enabled === false) {
      console.info('[auto-sale] disabled in settings — skipping run');
      return summary;
    }
    excludedProductIds = Array.isArray(settings?.excludedProducts)
      ? settings.excludedProducts.map(relationshipId).filter((id): id is string => id !== null)
      : [];
  } catch (error) {
    summary.error = `settings load failed: ${(error as Error).message}`;
    console.error('[auto-sale] settings load failed:', error);
    // Record it too — the console lives inside a container, so the admin's
    // Last run panel is the only place the owner would see a dead night.
    await writeSummary(payload, summary);
    return summary;
  }

  // Ranking and catalogue load happen before any write, so a failure here
  // leaves the catalogue untouched.
  let plan;
  try {
    const [ranked, candidates] = await Promise.all([rankByViewers(), loadCandidates(payload)]);
    plan = selectAutoSale(ranked, candidates, excludedProductIds);
  } catch (error) {
    summary.error = `ranking failed: ${(error as Error).message}`;
    console.error('[auto-sale] ranking failed:', error);
    await writeSummary(payload, summary);
    return summary;
  }

  summary.skippedCount = plan.skippedCount;

  // Disables first: a product leaving the sale set never briefly holds both
  // states, and the On Sale category churns once per product.
  for (const item of plan.toDisable) {
    try {
      await payload.update({
        collection: 'products',
        id: item.productId,
        data: { onSale: false, salePercent: null, autoSaleManaged: false },
        context: { ...AUTO_SALE_CONTEXT },
        depth: 0,
      });
      summary.disabledCount += 1;
    } catch (error) {
      summary.errorCount += 1;
      console.error(`[auto-sale] failed to clear sale on ${item.productId}:`, error);
    }
  }

  for (const item of plan.toEnable) {
    try {
      await payload.update({
        collection: 'products',
        id: item.productId,
        data: { onSale: true, salePercent: item.salePercent, autoSaleManaged: true },
        context: { ...AUTO_SALE_CONTEXT },
        depth: 0,
      });
      summary.enabledCount += 1;
    } catch (error) {
      summary.errorCount += 1;
      console.error(`[auto-sale] failed to set sale on ${item.productId}:`, error);
    }
  }

  summary.enabledProducts = plan.toEnable.map((i) => i.title).join(', ');
  summary.disabledProducts = plan.toDisable.map((i) => i.title).join(', ');

  console.info(
    `[auto-sale] enabled ${summary.enabledCount}, disabled ${summary.disabledCount}, skipped ${summary.skippedCount}, errors ${summary.errorCount}`,
  );

  await writeSummary(payload, summary);
  return summary;
}
```

- [ ] **Step 2: Type-check**

Run: `node_modules/.bin/tsc --noEmit`
Expected: clean. If `doc.autoSaleManaged` or `slug: 'auto-sale-settings'` errors as unknown, `payload generate:types` was not re-run in Task 3 or 4 — run it now.

- [ ] **Step 3: Run the full suite and commit**

```bash
node_modules/.bin/vitest run
git add lib/auto-sale/run.ts
git commit -m "feat(auto-sale): add job shell that applies the sale plan"
```

---

### Task 6: Schedule the job

**Files:**
- Modify: `payload.config.ts` (add a `jobs` block after `plugins`)
- Create: `src/migrations/<timestamp>_payload_jobs.ts`

**Interfaces:**
- Consumes: `runAutoSale` from `@/lib/auto-sale/run` (Task 5), imported dynamically.
- Produces: the running system. Nothing depends on this task.

**Important:** `autoRun` only *drains* a queue — it does not create jobs (`payload/dist/index.js:236-262`). The task needs its own `schedule` block to be enqueued. Both are required. Enabling the jobs system also adds a `payload-jobs` collection and a `payload-jobs-stats` global, i.e. real tables — hence the migration.

- [ ] **Step 1: Register the task and the cron**

In `payload.config.ts`, add a `jobs` block inside `buildConfig({ … })` after `plugins: shopnexPlugins,`:

```ts
  jobs: {
    tasks: [
      {
        slug: 'autoSale',
        label: 'Automatic sale (most-viewed products)',
        // Queues itself nightly at 03:10. `autoRun` below is what drains it.
        schedule: [{ cron: '10 3 * * *', queue: 'nightly' }],
        retries: 0,
        inputSchema: [],
        outputSchema: [],
        handler: async ({ req }) => {
          // Dynamic import: a top-level import of lib/auto-sale/run here would
          // pull lib/auto-sale/select.ts into the config module graph alongside
          // Products.ts and risk the known import-cycle TDZ crash.
          const { runAutoSale } = await import('@/lib/auto-sale/run');
          await runAutoSale(req.payload);
          return { output: {} };
        },
      },
    ],
    // Fires every 5 minutes: each tick first enqueues any task whose `schedule`
    // cron is due, then runs the queue. Latency after 03:10 is under 5 minutes.
    autoRun: [{ cron: '*/5 * * * *', queue: 'nightly', limit: 1 }],
    deleteJobOnComplete: true,
  },
```

`jobs.scheduling` is derived automatically by Payload when a task declares a `schedule` — do not set it by hand.

- [ ] **Step 2: Regenerate types**

Run: `node_modules/.bin/payload generate:types`
Expected: `src/payload/payload-types.ts` gains a `PayloadJob` interface and an `autoSale` entry under the jobs task types.

- [ ] **Step 3: Generate the jobs-system migration**

The jobs collection and stats global create several tables and enums — generate rather than hand-write. Needs a real TTY:

```bash
node_modules/.bin/payload migrate:create payload_jobs
```

Trim as in Task 4: keep only statements creating `payload"."payload_jobs*` tables, the `payload_jobs_stats` global table, their enums, indexes and constraints, plus any `ALTER TABLE "payload"."payload_locked_documents_rels" ADD COLUMN "payload_jobs_id"` that Payload adds to track locks. Delete unrelated drops. Add the header comment recording the trim.

- [ ] **Step 4: Run the migration**

```bash
yes | node_modules/.bin/payload migrate
node_modules/.bin/payload migrate:status
```

Expected: listed as run, no errors.

- [ ] **Step 5: Confirm the scheduler starts**

Start the dev server and watch the logs for at least one `autoRun` tick (up to 5 minutes):

```bash
node_modules/.bin/next dev --turbo
```

Expected: no `Error in job queue cron job handler` in the output, and `/admin` still loads. A TDZ error (`Cannot access 'X' before initialization`) on any admin or storefront route means the dynamic import in Step 1 was replaced with a top-level one — revert that.

- [ ] **Step 6: Commit**

```bash
node_modules/.bin/vitest run
node_modules/.bin/tsc --noEmit
git add payload.config.ts src/payload/payload-types.ts src/migrations/
git commit -m "feat(auto-sale): schedule the nightly auto-sale job"
```

---

### Task 7: End-to-end verification

**Files:** none — verification only, no production code.

**Interfaces:**
- Consumes: everything above.
- Produces: nothing.

This is the only place `runAutoSale` is exercised against a real database. Do not skip it — Tasks 5 and 6 have no automated coverage.

- [ ] **Step 1: Write a throwaway trigger script**

Create `scripts/run-auto-sale-once.ts` (a permanent operator tool — a manual run is the only way to trigger the job without waiting for 03:10):

```ts
// scripts/run-auto-sale-once.ts — run the auto-sale reconciliation immediately.
import config from '@payload-config';
import { getPayload } from 'payload';
import { runAutoSale } from '@/lib/auto-sale/run';

async function main(): Promise<void> {
  const payload = await getPayload({ config });
  const summary = await runAutoSale(payload);
  console.log(JSON.stringify(summary, null, 2));
  process.exit(0);
}

void main();
```

Add to `package.json` scripts, beside the other `payload:*` entries:

```json
    "auto-sale:run": "tsx scripts/run-auto-sale-once.ts",
```

- [ ] **Step 2: Confirm the storefront has view data**

```bash
node_modules/.bin/tsx -e "import {prisma} from './lib/prisma'; prisma.productViewEvent.groupBy({by:['productId'],_count:true}).then(r=>{console.log(r.length,'products with views');process.exit(0)})"
```

If this reports 0, browse a few product pages on the dev storefront with cookie consent accepted, then re-check. With no view data the job correctly does nothing, which does not verify anything.

- [ ] **Step 3: Run the job**

Run: `node_modules/.bin/tsx scripts/run-auto-sale-once.ts`
Expected: JSON summary printed with `enabledCount` between 0 and 5 and `errorCount: 0`.

**Assert explicitly, do not let it pass incidentally:** `errorCount` must be `0` AND
`enabledCount` must be greater than 0 on a database that has view data. `runAutoSale`
passes `id: item.productId` as a **string** while this project's Payload ids are
numeric, and this repo has previously hit failures from `String()`-ing ids on Payload
writes. A non-zero `errorCount` with `enabledCount: 0` is the signature of that bug —
check the logged per-product error before assuming the catalogue simply had no
eligible products. Confirm in the report which of the two you observed.

- [ ] **Step 4: Verify the effects in admin**

Check each of these:
- **Settings → Automatic sale → Last run** shows the same numbers as the printed summary.
- Each product named in `enabledProducts` has **On Sale** ticked and **Discount (%)** = 10.
- Those products now carry the **On Sale** category (added by the existing `syncOnSaleCategory` hook).
- `/search/on-sale` on the storefront lists them, with the original price struck through.

- [ ] **Step 5: Verify manual ownership — the critical rail**

1. Open one of the auto-discounted products in admin, untick **On Sale**, save.
2. Re-run: `node_modules/.bin/tsx scripts/run-auto-sale-once.ts`
3. **Expected: the product stays off sale.** If the job re-ticks it, `releaseAutoSaleOnManualEdit` is not firing — recheck that it is registered in `hooks.beforeChange` in `Products.ts`.

Then the converse:

4. Pick a product that is *not* a top viewer, tick **On Sale** with 40% by hand, save.
5. Re-run the job.
6. **Expected: it stays on sale at 40%,** untouched by the removal pass.

- [ ] **Step 6: Verify the exclusion list**

1. Add one currently auto-discounted product to **Never auto-discount** in the settings global.
2. Re-run the job.
3. Expected: it is taken off sale (it is auto-managed and no longer selected), and stays off on subsequent runs.

- [ ] **Step 7: Verify idempotency**

Run the job twice in a row with no changes in between. Expected: the second run reports `enabledCount: 0`, `disabledCount: 0` — every product is already in its target state.

- [ ] **Step 8: Commit**

```bash
node_modules/.bin/vitest run
node_modules/.bin/tsc --noEmit
git add scripts/run-auto-sale-once.ts package.json
git commit -m "feat(auto-sale): add manual trigger script for the auto-sale job"
```

---

## Deployment note

The job runs in-process via `autoRun`, so it only fires while the container is up. After deploying, confirm from the VPS container logs that an `autoRun` tick occurs, and check **Settings → Automatic sale → Last run** the morning after the first 03:10 to confirm the schedule fired in production and not just in dev.

The three migrations must run against the production database before the new code serves traffic, or the storefront will throw `42P01`.
