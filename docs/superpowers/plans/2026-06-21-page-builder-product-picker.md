# Page Builder Product Picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a relationship picker to the custom visual page-builder panel so editors can manually pick products/categories for the Featured Products, Featured Collection, Recommended-for-you, and Recently-viewed blocks.

**Architecture:** The builder panel (`FieldRenderer`) renders editable controls from serializable field descriptors (`block-schemas.ts`). Today it has no case for `relationship` or `number`, so those fields show a placeholder. We add a `RelationshipPicker` modal (mirroring the existing `MediaPicker`), teach the schema descriptor to carry relationship metadata, render relationship + number controls in the panel, and give the two "auto" blocks an optional pinned-products override. The picker stores bare IDs; Payload populates them to full docs at read time (`depth:2`).

**Tech Stack:** Next.js 15 (App Router), Payload CMS 3.x (Postgres), React 19 client components, Vitest + @testing-library/react (jsdom), Tailwind 4.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-06-21-page-builder-product-picker-design.md`.
- Run tests with the binary directly, never the pnpm script: `node_modules/.bin/vitest run <file>` (the `pnpm test` wrapper fails via the repo's deps-status check).
- Run typecheck with `node_modules/.bin/tsc --noEmit -p tsconfig.json`.
- Both `products` and `categories` are `payloadPublicReadAdminWrite` — REST read is allowed with the admin session cookie (`credentials: 'same-origin'`).
- The picker stores **IDs only** in the layout JSON. Never store populated docs.
- Payload 3.84 blocks have **no** `admin.description`; put help text in a field's `label`.
- Adding a new relationship field to a block may require a generated Payload migration (`src/migrations/`), or the storefront throws `42P01` at runtime. Generating one needs the Postgres DB reachable (Docker; may need `sudo`).
- This branch: `feature/hobby-shop-visual-foundation`. Commit after every task.

---

## File map

- Modify `lib/page-builder/block-schemas.ts` — relationship descriptor (`relationTo` + `hasMany`).
- Modify `lib/page-builder/default-block.ts` — relationship default value.
- Create `components/page-builder/RelationshipPicker.tsx` — search/select modal.
- Modify `components/page-builder/FieldRenderer.tsx` — `relationship` + `number` controls.
- Modify `src/payload/blocks/Recommendations.ts`, `src/payload/blocks/RecentlyViewed.ts` — optional `products` field.
- Modify `components/blocks/Recommendations.tsx`, `components/blocks/RecentlyViewed.tsx` — render pinned products.
- Create migration under `src/migrations/` (generated).
- Tests: `lib/__tests__/block-schemas.test.ts`, `lib/__tests__/default-block.test.ts`, `components/page-builder/__tests__/RelationshipPicker.test.tsx`, `components/page-builder/__tests__/FieldRenderer-relationship.test.tsx`, `components/blocks/__tests__/recommendations-override.test.tsx`.

> **No change needed for Featured Products / Featured Collection components.** They already have their relationship fields and already resolve them at render. Tasks 1–4 make them editable in the panel automatically. Task 7 verifies this end-to-end.

---

### Task 1: Relationship metadata in the schema descriptor

**Files:**
- Modify: `lib/page-builder/block-schemas.ts`
- Test: `lib/__tests__/block-schemas.test.ts`

**Interfaces:**
- Produces: `FieldDescriptor` gains `hasMany?: boolean`. `describeField` emits `relationTo` and `hasMany` for `type: 'relationship'` fields (previously `relationTo` was emitted only for `upload`).

- [ ] **Step 1: Write the failing test**

Append to `lib/__tests__/block-schemas.test.ts`:

```ts
import { getBlockSchema } from '@/lib/page-builder/block-schemas';

describe('relationship field descriptors', () => {
  it('should expose relationTo and hasMany for a hasMany relationship (featuredProducts.products)', () => {
    const schema = getBlockSchema('featuredProducts');
    const products = schema?.fields.find((f) => f.name === 'products');
    expect(products).toMatchObject({ type: 'relationship', relationTo: 'products', hasMany: true });
  });

  it('should expose relationTo and hasMany=false for a single relationship (featuredCollection.collection)', () => {
    const schema = getBlockSchema('featuredCollection');
    const collection = schema?.fields.find((f) => f.name === 'collection');
    expect(collection).toMatchObject({ type: 'relationship', relationTo: 'categories', hasMany: false });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node_modules/.bin/vitest run lib/__tests__/block-schemas.test.ts`
Expected: FAIL — `relationTo`/`hasMany` undefined on the relationship descriptor.

- [ ] **Step 3: Implement the descriptor change**

In `lib/page-builder/block-schemas.ts`, add `hasMany` to the type (after `relationTo?: string;`):

```ts
  relationTo?: string;
  /** Present for `relationship` fields. */
  hasMany?: boolean;
```

In `describeField`, replace the upload-only `relationTo` block with handling for both upload and relationship:

```ts
  if (
    (field.type === 'upload' || field.type === 'relationship') &&
    'relationTo' in field &&
    typeof field.relationTo === 'string'
  ) {
    base.relationTo = field.relationTo;
  }
  if (field.type === 'relationship') {
    base.hasMany = 'hasMany' in field && field.hasMany === true;
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node_modules/.bin/vitest run lib/__tests__/block-schemas.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/page-builder/block-schemas.ts lib/__tests__/block-schemas.test.ts
git commit -m "feat(page-builder): describe relationship fields in block schema"
```

---

### Task 2: Relationship default value

**Files:**
- Modify: `lib/page-builder/default-block.ts`
- Test: `lib/__tests__/default-block.test.ts`

**Interfaces:**
- Consumes: `FieldDescriptor.hasMany` from Task 1.
- Produces: `defaultForField` returns `[]` for a `hasMany` relationship and `null` for a single relationship.

- [ ] **Step 1: Write the failing test**

Append to `lib/__tests__/default-block.test.ts`:

```ts
import { defaultForField } from '@/lib/page-builder/default-block';

describe('relationship defaults', () => {
  it('should default a hasMany relationship to an empty array', () => {
    expect(defaultForField({ name: 'products', type: 'relationship', relationTo: 'products', hasMany: true })).toEqual([]);
  });

  it('should default a single relationship to null', () => {
    expect(defaultForField({ name: 'collection', type: 'relationship', relationTo: 'categories', hasMany: false })).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node_modules/.bin/vitest run lib/__tests__/default-block.test.ts`
Expected: FAIL — hasMany relationship returns `null`, not `[]`.

- [ ] **Step 3: Implement**

In `lib/page-builder/default-block.ts`, inside `defaultForField`, add before the final `return null;`:

```ts
  if (field.type === 'relationship') return field.hasMany ? [] : null;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node_modules/.bin/vitest run lib/__tests__/default-block.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/page-builder/default-block.ts lib/__tests__/default-block.test.ts
git commit -m "feat(page-builder): default relationship fields to empty/null"
```

---

### Task 3: RelationshipPicker modal

**Files:**
- Create: `components/page-builder/RelationshipPicker.tsx`
- Test: `components/page-builder/__tests__/RelationshipPicker.test.tsx`

**Interfaces:**
- Produces:
  - `export type RelationItem = { id: string | number; title: string };`
  - `export default function RelationshipPicker(props: { relationTo: 'products' | 'categories'; onSelect: (item: RelationItem) => void; onClose: () => void }): ReactElement`
  - Fetches `GET /api/{relationTo}?limit=20&depth=0[&where[title][like]=<q>]`.

- [ ] **Step 1: Write the failing test**

Create `components/page-builder/__tests__/RelationshipPicker.test.tsx`:

```tsx
/// <reference types="vitest" />
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import RelationshipPicker from '@/components/page-builder/RelationshipPicker';

afterEach(() => vi.restoreAllMocks());

function mockFetchOnce(docs: { id: string | number; title?: string }[]) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    json: async () => ({ docs }),
  } as Response);
}

describe('RelationshipPicker', () => {
  it('should query the products REST endpoint and list results', async () => {
    const fetchSpy = mockFetchOnce([{ id: 7, title: 'Bench Plate' }]);
    render(<RelationshipPicker relationTo="products" onSelect={() => {}} onClose={() => {}} />);
    await waitFor(() => expect(screen.getByText('Bench Plate')).toBeInTheDocument());
    expect(String(fetchSpy.mock.calls[0][0])).toContain('/api/products');
  });

  it('should call onSelect with the chosen item', async () => {
    mockFetchOnce([{ id: 7, title: 'Bench Plate' }]);
    const onSelect = vi.fn();
    render(<RelationshipPicker relationTo="products" onSelect={onSelect} onClose={() => {}} />);
    const button = await screen.findByText('Bench Plate');
    fireEvent.click(button);
    expect(onSelect).toHaveBeenCalledWith({ id: 7, title: 'Bench Plate' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node_modules/.bin/vitest run components/page-builder/__tests__/RelationshipPicker.test.tsx`
Expected: FAIL — module `RelationshipPicker` does not exist.

- [ ] **Step 3: Implement the component**

Create `components/page-builder/RelationshipPicker.tsx`:

```tsx
// components/page-builder/RelationshipPicker.tsx — search + select a Payload
// products/categories relationship, mirroring MediaPicker.
'use client';
import { useEffect, useState, type ReactElement } from 'react';

export type RelationItem = { id: string | number; title: string };

type Props = {
  relationTo: 'products' | 'categories';
  onSelect: (item: RelationItem) => void;
  onClose: () => void;
};

export default function RelationshipPicker({ relationTo, onSelect, onClose }: Props): ReactElement {
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<RelationItem[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ limit: '20', depth: '0' });
    if (query.trim()) params.set('where[title][like]', query.trim());
    fetch(`/api/${relationTo}?${params.toString()}`, {
      credentials: 'same-origin',
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data) => {
        const docs = Array.isArray(data?.docs) ? data.docs : [];
        setItems(
          docs.map((d: { id: string | number; title?: string }) => ({
            id: d.id,
            title: typeof d.title === 'string' ? d.title : `#${d.id}`,
          })),
        );
      })
      .catch(() => {
        /* aborted or failed — keep current list */
      });
    return () => controller.abort();
  }, [relationTo, query]);

  const noun = relationTo === 'products' ? 'product' : 'collection';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="max-h-[80vh] w-[560px] overflow-auto rounded-lg bg-white p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Select {noun}</h2>
          <input
            autoFocus
            type="search"
            placeholder="Search…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="rounded border border-warm-300 px-2 py-1 text-sm"
          />
        </div>
        <ul className="flex flex-col gap-1">
          {items.map((it) => (
            <li key={it.id}>
              <button
                type="button"
                onClick={() => onSelect(it)}
                className="w-full rounded border border-warm-200 px-2 py-1 text-left text-sm hover:border-blue-400"
              >
                {it.title}
              </button>
            </li>
          ))}
          {items.length === 0 && <li className="px-1 text-xs text-warm-400">No results.</li>}
        </ul>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node_modules/.bin/vitest run components/page-builder/__tests__/RelationshipPicker.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add components/page-builder/RelationshipPicker.tsx components/page-builder/__tests__/RelationshipPicker.test.tsx
git commit -m "feat(page-builder): add RelationshipPicker search modal"
```

---

### Task 4: Render relationship + number controls in FieldRenderer

**Files:**
- Modify: `components/page-builder/FieldRenderer.tsx`
- Test: `components/page-builder/__tests__/FieldRenderer-relationship.test.tsx`

**Interfaces:**
- Consumes: `RelationshipPicker`, `RelationItem` (Task 3); `FieldDescriptor.relationTo`/`hasMany` (Task 1).
- Produces: `FieldRenderer` renders a number input for `number` fields and a chip-list + picker for `relationship` fields. On selecting an item, `onChange(field.name, value)` fires with an **ID array** (hasMany) or a **single ID** (single). On a number change it fires with a `number` (or `null` when cleared).

- [ ] **Step 1: Write the failing test**

Create `components/page-builder/__tests__/FieldRenderer-relationship.test.tsx`:

```tsx
/// <reference types="vitest" />
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import FieldRenderer from '@/components/page-builder/FieldRenderer';
import type { BlockSchema } from '@/lib/page-builder/block-schemas';

afterEach(() => vi.restoreAllMocks());

const productsSchema: BlockSchema = {
  slug: 'featuredProducts',
  label: 'Featured Products',
  fields: [{ name: 'products', type: 'relationship', relationTo: 'products', hasMany: true }],
};

const limitSchema: BlockSchema = {
  slug: 'recommendations',
  label: 'Recommendations',
  fields: [{ name: 'limit', type: 'number' }],
};

describe('FieldRenderer relationship + number', () => {
  it('should add an id to the value when a product is picked', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      json: async () => ({ docs: [{ id: 7, title: 'Bench Plate' }] }),
    } as Response);
    const onChange = vi.fn();
    render(<FieldRenderer schema={productsSchema} values={{ products: [] }} onChange={onChange} />);
    fireEvent.click(screen.getByText('+ Add product'));
    const result = await screen.findByText('Bench Plate');
    fireEvent.click(result);
    expect(onChange).toHaveBeenCalledWith('products', ['7']);
  });

  it('should emit a number when the number input changes', () => {
    const onChange = vi.fn();
    render(<FieldRenderer schema={limitSchema} values={{ limit: 8 }} onChange={onChange} />);
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '12' } });
    expect(onChange).toHaveBeenCalledWith('limit', 12);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node_modules/.bin/vitest run components/page-builder/__tests__/FieldRenderer-relationship.test.tsx`
Expected: FAIL — relationship renders the placeholder; no "+ Add product" button; number renders placeholder, not a spinbutton.

- [ ] **Step 3: Implement**

In `components/page-builder/FieldRenderer.tsx`, add imports at the top (with the other imports):

```tsx
import { useEffect, useMemo, useState, type ReactElement } from 'react';
import RelationshipPicker, { type RelationItem } from './RelationshipPicker';
```

(The file already imports `useState`/`type ReactElement` from `'react'`; replace that import line with the one above so `useEffect`/`useMemo` are available.)

Add a `number` case and a `relationship` case to the `switch (field.type)` in the inner `Field` component, before `default:`:

```tsx
      case 'number':
        return (
          <input
            id={id}
            type="number"
            className="rounded border border-warm-300 bg-warm-50 px-2 py-1 text-sm text-warm-900 dark:border-warm-700 dark:bg-warm-900 dark:text-warm-100"
            value={typeof value === 'number' ? value : ''}
            disabled={disabled}
            onChange={(e) => set(e.target.value === '' ? null : Number(e.target.value))}
          />
        );
      case 'relationship':
        return <RelationshipField field={field} value={value} disabled={disabled} onChange={set} />;
```

Add the `RelationshipField` component to the same file (e.g. above the `Field` function):

```tsx
function RelationshipField({
  field,
  value,
  disabled,
  onChange,
}: {
  field: FieldDescriptor;
  value: unknown;
  disabled: boolean;
  onChange: (v: unknown) => void;
}): ReactElement {
  const relationTo: 'products' | 'categories' =
    field.relationTo === 'categories' ? 'categories' : 'products';
  const hasMany = field.hasMany ?? false;
  const [pickerOpen, setPickerOpen] = useState(false);
  const [labels, setLabels] = useState<Record<string, string>>({});

  const ids = useMemo<string[]>(() => {
    const raw = hasMany
      ? Array.isArray(value)
        ? value
        : []
      : value != null && value !== ''
        ? [value]
        : [];
    return raw
      .map((item) =>
        item && typeof item === 'object' && 'id' in item
          ? String((item as { id: string | number }).id)
          : String(item),
      )
      .filter((s) => s && s !== 'null' && s !== 'undefined');
  }, [value, hasMany]);

  // Seed labels from populated docs that arrive in the initial value (depth:2 load).
  useEffect(() => {
    const raw = hasMany ? (Array.isArray(value) ? value : []) : value != null ? [value] : [];
    const seed: Record<string, string> = {};
    for (const item of raw) {
      if (item && typeof item === 'object' && 'id' in item) {
        const o = item as { id: string | number; title?: string };
        if (typeof o.title === 'string') seed[String(o.id)] = o.title;
      }
    }
    if (Object.keys(seed).length) setLabels((prev) => ({ ...seed, ...prev }));
  }, [value, hasMany]);

  // Fetch labels for ids we don't yet have a title for (e.g. bare-id values).
  useEffect(() => {
    const missing = ids.filter((id) => !labels[id]);
    if (missing.length === 0) return;
    const params = new URLSearchParams({ depth: '0', limit: String(missing.length) });
    missing.forEach((id) => params.append('where[id][in][]', id));
    fetch(`/api/${relationTo}?${params.toString()}`, { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((data) => {
        const docs = Array.isArray(data?.docs) ? data.docs : [];
        const next: Record<string, string> = {};
        for (const d of docs) {
          if (d && d.id != null) next[String(d.id)] = typeof d.title === 'string' ? d.title : `#${d.id}`;
        }
        if (Object.keys(next).length) setLabels((prev) => ({ ...prev, ...next }));
      })
      .catch(() => {
        /* ignore */
      });
  }, [ids, labels, relationTo]);

  const commit = (nextIds: string[]) => onChange(hasMany ? nextIds : (nextIds[0] ?? null));

  const add = (item: RelationItem) => {
    setLabels((prev) => ({ ...prev, [String(item.id)]: item.title }));
    if (hasMany) {
      if (!ids.includes(String(item.id))) commit([...ids, String(item.id)]);
    } else {
      commit([String(item.id)]);
    }
    setPickerOpen(false);
  };

  const remove = (id: string) => commit(ids.filter((x) => x !== id));

  const move = (from: number, to: number) => {
    if (to < 0 || to >= ids.length) return;
    const next = [...ids];
    const [m] = next.splice(from, 1);
    next.splice(to, 0, m);
    commit(next);
  };

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col gap-1">
        {ids.map((id, index) => (
          <li
            key={id}
            className="flex items-center gap-1 rounded border border-warm-200 px-2 py-1 text-sm"
          >
            <span className="truncate">{labels[id] ?? `#${id}`}</span>
            {hasMany && (
              <span className="ml-auto flex gap-1">
                <button
                  type="button"
                  disabled={disabled || index === 0}
                  onClick={() => move(index, index - 1)}
                  aria-label="Move up"
                  className="text-xs"
                >
                  ↑
                </button>
                <button
                  type="button"
                  disabled={disabled || index === ids.length - 1}
                  onClick={() => move(index, index + 1)}
                  aria-label="Move down"
                  className="text-xs"
                >
                  ↓
                </button>
              </span>
            )}
            <button
              type="button"
              disabled={disabled}
              onClick={() => remove(id)}
              aria-label="Remove"
              className={(hasMany ? '' : 'ml-auto ') + 'text-xs text-red-500'}
            >
              ✕
            </button>
          </li>
        ))}
        {ids.length === 0 && <li className="px-1 text-xs text-warm-400">None selected.</li>}
      </ul>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setPickerOpen(true)}
        className="rounded border border-warm-300 px-2 py-1 text-xs"
      >
        {relationTo === 'products' ? '+ Add product' : 'Choose collection'}
      </button>
      {pickerOpen && (
        <RelationshipPicker
          relationTo={relationTo}
          onSelect={add}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node_modules/.bin/vitest run components/page-builder/__tests__/FieldRenderer-relationship.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Typecheck**

Run: `node_modules/.bin/tsc --noEmit -p tsconfig.json`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add components/page-builder/FieldRenderer.tsx components/page-builder/__tests__/FieldRenderer-relationship.test.tsx
git commit -m "feat(page-builder): edit relationship and number fields in panel"
```

---

### Task 5: Add optional pinned `products` field to the auto blocks + migration

**Files:**
- Modify: `src/payload/blocks/Recommendations.ts`
- Modify: `src/payload/blocks/RecentlyViewed.ts`
- Create: a migration in `src/migrations/` (generated)
- Test: `lib/__tests__/block-schemas.test.ts`

**Interfaces:**
- Produces: `recommendations` and `recentlyViewed` block schemas each expose a `products` relationship field (`relationTo: 'products'`, `hasMany: true`). The render components (Task 6) read `props.products`.

- [ ] **Step 1: Write the failing test**

Append to `lib/__tests__/block-schemas.test.ts`:

```ts
describe('pinned products on auto blocks', () => {
  it.each(['recommendations', 'recentlyViewed'])(
    'should expose an optional products relationship on %s',
    (slug) => {
      const products = getBlockSchema(slug)?.fields.find((f) => f.name === 'products');
      expect(products).toMatchObject({ type: 'relationship', relationTo: 'products', hasMany: true });
    },
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node_modules/.bin/vitest run lib/__tests__/block-schemas.test.ts`
Expected: FAIL — `products` field not found on `recommendations`/`recentlyViewed`.

- [ ] **Step 3: Add the field to both blocks**

In `src/payload/blocks/Recommendations.ts`, add this field to the `fields` array immediately after the `limit` field (before `...appearanceFields`):

```ts
    {
      name: 'products',
      label: 'Pinned products — overrides the auto list when set',
      type: 'relationship',
      relationTo: 'products',
      hasMany: true,
      maxRows: 12,
    },
```

Make the identical change in `src/payload/blocks/RecentlyViewed.ts` (same field, same position).

- [ ] **Step 4: Run test to verify it passes**

Run: `node_modules/.bin/vitest run lib/__tests__/block-schemas.test.ts`
Expected: PASS.

- [ ] **Step 5: Regenerate Payload types**

Run: `node_modules/.bin/payload generate:types`
Expected: updates `payload-types.ts` with the new `products` fields. (If it cannot reach the DB, continue — the block components cast loosely and do not depend on regenerated types. Note this in the commit if skipped.)

- [ ] **Step 6: Generate the migration**

Run: `node_modules/.bin/payload migrate:create add_pinned_products_to_auto_blocks`
Expected: a new `src/migrations/<timestamp>_add_pinned_products_to_auto_blocks.ts` (+ `.json`) capturing the relationship column/constraint changes.

> Requires the Postgres DB running (Docker; you may need `! sudo docker compose up -d db`). If `migrate:create` reports **no schema changes** (hasMany relationships route through the existing `pages_rels` table), that is an acceptable outcome — skip creating an empty migration and note it in the commit message.

- [ ] **Step 7: Commit**

```bash
git add src/payload/blocks/Recommendations.ts src/payload/blocks/RecentlyViewed.ts lib/__tests__/block-schemas.test.ts payload-types.ts src/migrations/
git commit -m "feat(blocks): add optional pinned products to recommendations/recently-viewed"
```

---

### Task 6: Render pinned products in the auto blocks

**Files:**
- Modify: `components/blocks/Recommendations.tsx`
- Modify: `components/blocks/RecentlyViewed.tsx`
- Test: `components/blocks/__tests__/recommendations-override.test.tsx`

**Interfaces:**
- Consumes: `getPayloadProductsByIds(ids: string[]): Promise<Product[]>` from `@/lib/payload-products`.
- Produces: each block is now an `async` server component. When `products` is non-empty it renders a `ProductCard` grid of the resolved products; when empty it renders the existing auto/placeholder output.

- [ ] **Step 1: Write the failing test**

Create `components/blocks/__tests__/recommendations-override.test.tsx`:

```tsx
/// <reference types="vitest" />
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

// Stub ProductCard so the test does not need intl/wishlist providers.
vi.mock('@/components/product/product-card', () => ({
  default: ({ product }: { product: { id: string; title: string } }) => <div>card:{product.title}</div>,
}));

vi.mock('@/lib/payload-products', () => ({
  getPayloadProductsByIds: vi.fn(async (ids: string[]) =>
    ids.map((id) => ({ id, title: `Product ${id}` })),
  ),
}));

import RecommendationsBlock from '@/components/blocks/Recommendations';

describe('RecommendationsBlock pinned override', () => {
  it('should render a ProductCard grid when products are pinned', async () => {
    const ui = await RecommendationsBlock({ title: 'Picks', products: ['1', '2'] });
    const html = renderToStaticMarkup(ui);
    expect(html).toContain('card:Product 1');
    expect(html).toContain('card:Product 2');
  });

  it('should fall back to the auto placeholder when no products are pinned', async () => {
    const ui = await RecommendationsBlock({ title: 'Picks', products: [] });
    const html = renderToStaticMarkup(ui);
    expect(html).not.toContain('card:');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node_modules/.bin/vitest run components/blocks/__tests__/recommendations-override.test.tsx`
Expected: FAIL — `RecommendationsBlock` is not async / does not accept `products`, no `card:` output.

- [ ] **Step 3: Implement Recommendations.tsx**

Replace the contents of `components/blocks/Recommendations.tsx`:

```tsx
// components/blocks/Recommendations.tsx
import type { ReactElement } from 'react';
import ProductCard from '@/components/product/product-card';
import type { BlockAppearance } from '@/lib/page-builder';
import { blockAppearanceClasses } from '@/lib/page-builder';
import { getPayloadProductsByIds } from '@/lib/payload-products';

type ProductRef = { id: string | number } | string | number;

type Props = {
  title?: string | null;
  limit?: number | null;
  products?: ProductRef[] | null;
} & BlockAppearance;

function toId(ref: ProductRef): string {
  return typeof ref === 'object' && ref !== null ? String(ref.id) : String(ref);
}

export default async function RecommendationsBlock(props: Props): Promise<ReactElement> {
  const { title, limit = 8, products } = props;
  const { section, container } = blockAppearanceClasses({ background: 'theme' });

  const ids = (products ?? []).map(toId).filter(Boolean);
  const pinned = ids.length > 0 ? await getPayloadProductsByIds(ids) : [];

  if (pinned.length > 0) {
    return (
      <section className={section}>
        <div className={container}>
          {title && <h2 className="mb-6 font-display text-2xl font-bold text-ink">{title}</h2>}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {pinned.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={section}>
      <div className={container}>
        {title && <h2 className="mb-6 font-display text-2xl font-bold text-ink">{title}</h2>}
        <p className="text-sm text-ink/60">
          Personalized recommendations for {limit} items (client-side)
        </p>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Implement RecentlyViewed.tsx**

Replace the contents of `components/blocks/RecentlyViewed.tsx` with the same structure, keeping its placeholder copy:

```tsx
// components/blocks/RecentlyViewed.tsx
import type { ReactElement } from 'react';
import ProductCard from '@/components/product/product-card';
import type { BlockAppearance } from '@/lib/page-builder';
import { blockAppearanceClasses } from '@/lib/page-builder';
import { getPayloadProductsByIds } from '@/lib/payload-products';

type ProductRef = { id: string | number } | string | number;

type Props = {
  title?: string | null;
  limit?: number | null;
  products?: ProductRef[] | null;
} & BlockAppearance;

function toId(ref: ProductRef): string {
  return typeof ref === 'object' && ref !== null ? String(ref.id) : String(ref);
}

export default async function RecentlyViewedBlock(props: Props): Promise<ReactElement> {
  const { title, limit = 8, products } = props;
  const { section, container } = blockAppearanceClasses({ background: 'theme' });

  const ids = (products ?? []).map(toId).filter(Boolean);
  const pinned = ids.length > 0 ? await getPayloadProductsByIds(ids) : [];

  if (pinned.length > 0) {
    return (
      <section className={section}>
        <div className={container}>
          {title && <h2 className="mb-6 font-display text-2xl font-bold text-ink">{title}</h2>}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {pinned.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={section}>
      <div className={container}>
        {title && <h2 className="mb-6 font-display text-2xl font-bold text-ink">{title}</h2>}
        <p className="text-sm text-ink/60">Recently viewed items for {limit} items (client-side)</p>
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node_modules/.bin/vitest run components/blocks/__tests__/recommendations-override.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 6: Typecheck**

Run: `node_modules/.bin/tsc --noEmit -p tsconfig.json`
Expected: exit 0. (`RenderBlocks` already renders async block components — no change needed there.)

- [ ] **Step 7: Commit**

```bash
git add components/blocks/Recommendations.tsx components/blocks/RecentlyViewed.tsx components/blocks/__tests__/recommendations-override.test.tsx
git commit -m "feat(blocks): render pinned products in recommendations/recently-viewed"
```

---

### Task 7: Full-suite verification and manual smoke test

**Files:** none (verification only).

- [ ] **Step 1: Run the full test suite**

Run: `node_modules/.bin/vitest run`
Expected: all tests pass (no regressions in `block-schemas`, `default-block`, page-builder, blocks).

- [ ] **Step 2: Typecheck the whole project**

Run: `node_modules/.bin/tsc --noEmit -p tsconfig.json`
Expected: exit 0.

- [ ] **Step 3: Manual smoke test (requires the app running; Docker may need `sudo`)**

1. Rebuild/start the app, open `/<locale>/build/home` in the visual builder.
2. Select the **Featured Products** block → confirm the panel now shows a chip list + "+ Add product"; add 2–3 products, reorder, remove one.
3. Select **Featured Collection** → confirm "Choose collection" picks a single category.
4. Select **Recommended for you** → add 1–2 pinned products; confirm the preview iframe (`/<locale>/build/home/preview`) renders those ProductCards instead of the placeholder text, and returns HTTP 200.
5. Clear the pinned products on **Recommended for you** → confirm it returns to the auto placeholder.
6. Confirm the public storefront `/<locale>` still renders home at 200.

Expected: each block is curatable; pinned products render in preview and storefront; no 500s.

- [ ] **Step 4: Final confirmation**

Report results. If `migrate:create` produced a migration in Task 5, confirm it has been applied (`node_modules/.bin/payload migrate`) before declaring done.
```
