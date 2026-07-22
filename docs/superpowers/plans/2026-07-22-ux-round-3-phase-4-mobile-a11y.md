# UX Round 3 — Phase 4: Mobile & Accessibility — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give phone shoppers access to filters, stop the sort control from rendering blank, keep the hidden sticky buy-bar out of the tab order, and make the empty-results state honest about what caused it.

**Architecture:** A mobile disclosure wraps the existing facet controls (no logic duplication — same component, a visibility toggle). The sort dropdown falls back to the first option's label. The variant selector's sticky bar becomes `inert` while hidden. The empty state takes a `hasActiveFilters` flag (from a new pure helper) and picks its copy and a clear-filters affordance accordingly.

**Tech Stack:** Next.js 15, React 19 (`inert` prop), next-intl, Tailwind, Vitest.

## Global Constraints

- **Depends on Phase 3** for the translated `search.filter.*` keys used by the facets and empty state. Run Phase 3 first. If a string referenced here is still hardcoded, that is a Phase-3 gap — fix it there, not here.
- **Do not break CMS / page-builder preview.** Phase-4 changes touch search + PDP surfaces, not shared block components; no new provider dependency.
- **All new copy is translated** in BOTH `messages/en.json` and `messages/vi.json`.
- **Vitest test files MUST import `describe/expect/it` from `vitest`.**
- **Conventional Commits**, atomic. Commit directly to `main`.

---

## File Structure

- `components/layout/search/filter/facets.tsx` — MODIFY: mobile disclosure toggle (Task 1).
- `components/layout/search/filter/dropdown.tsx` — MODIFY: fallback label (Task 2).
- `components/product/variant-selector.tsx` — MODIFY: `inert` sticky bar (Task 3).
- `lib/search-filters-active.ts` + test — CREATE: `hasActiveSearchFilters(...)` (Task 4).
- `components/layout/search/empty-state.tsx` — MODIFY: filter-aware copy + clear link (Task 4).
- `app/[locale]/(storefront)/search/page.tsx` — MODIFY: pass `hasActiveFilters` (Task 4).
- `messages/en.json`, `messages/vi.json` — MODIFY (Tasks 1, 4).

---

## Task 1: Give phone shoppers the filter panel (finding 4.1)

`facets.tsx:60` wraps the whole panel in `hidden md:block`, so on phones there is no price range, in-stock toggle, or clear-filters control. Fix: keep the desktop sidebar as-is and add a `md:hidden` toggle button that reveals the same panel on mobile.

**Files:**
- Modify: `components/layout/search/filter/facets.tsx`
- Modify: `messages/en.json`, `messages/vi.json` (`search.filter.toggle`)

**Interfaces:** none (self-contained client component).

- [ ] **Step 1: Add the toggle copy**

`messages/en.json` under `search.filter`: `"toggle": "Filters"`
`messages/vi.json` under `search.filter`: `"toggle": "Bộ lọc"`

(If Phase 3 Task 4 already created `search.filter.title` = "Filter", reuse the pattern; add `toggle` as the mobile button label.)

- [ ] **Step 2: Add mobile-open state and a toggle button**

In `facets.tsx`, add to the hooks:

```typescript
import { useTranslations } from 'next-intl'; // if not already present after Phase 3
const t = useTranslations('search'); // reuse Phase-3 translator scope
const [mobileOpen, setMobileOpen] = useState(false);
```

Replace the outer wrapper (line 60) so the panel is always visible on `md+` and toggleable on mobile. Wrap the current inner content and precede it with a mobile-only toggle:

```tsx
return (
  <div>
    <button
      type="button"
      aria-expanded={mobileOpen}
      onClick={() => setMobileOpen((open) => !open)}
      className="mb-3 flex w-full items-center justify-between rounded-xl border border-warm-200/80 bg-white px-4 py-2.5 text-sm font-semibold text-warm-700 md:hidden dark:border-warm-800/60 dark:bg-warm-900 dark:text-warm-300"
    >
      {t('filter.toggle')}
      <span aria-hidden>{mobileOpen ? '–' : '+'}</span>
    </button>

    <div className={clsx(mobileOpen ? 'block' : 'hidden', 'md:block')}>
      {/* existing h3 + price form + in-stock + clear-filters content, unchanged */}
    </div>
  </div>
);
```

Add `import clsx from 'clsx';` if absent. Move the existing children (the `<h3>` through the clear-filters button) inside the inner `<div>` — do not change their markup (their strings are already translated by Phase 3 Task 4).

- [ ] **Step 3: Typecheck** — `./node_modules/.bin/tsc --noEmit`. Expected: no errors.

- [ ] **Step 4: Manual verification (mobile viewport)**

On the deployed `/vi/search` at ≤767px width: a "Bộ lọc" button appears; tapping it reveals the price range, in-stock toggle, and (when filters are set) clear-filters. Applying a price filter navigates and updates results. On desktop the sidebar is unchanged.

- [ ] **Step 5: Commit**

```bash
git add components/layout/search/filter/facets.tsx messages/en.json messages/vi.json
git commit -m "fix(search): expose the filter panel on mobile via a disclosure"
```

---

## Task 2: Stop the sort control rendering blank (finding 4.2)

`dropdown.tsx:17` initialises `active` to `''` and only fills it (line 31–32) when a `path`/`sort` matches. On an unsorted `/search` (`defaultSort.slug` is `null`), nothing matches and the button label is empty. Fix: fall back to the first list item's label.

**Files:**
- Modify: `components/layout/search/filter/dropdown.tsx`

**Interfaces:** Consumes `list: ListItem[]` (each item has a display label — `title` today, or a translated label after Phase 3 Task 4).

- [ ] **Step 1: Render a fallback label**

Replace the button label span (line 53) so an empty `active` falls back to the first item:

```tsx
<span>{active || firstLabel}</span>
```

Compute `firstLabel` from the first list item, using the same label source the items render. If Phase 3 Task 4 changed items to carry `labelKey`, resolve it: `const firstLabel = list[0] ? t(`sort.${list[0].labelKey}`) : '';` (with the `search` translator). If items still expose `.title`, use `const firstLabel = list[0]?.title ?? '';`. Match whichever the sibling `FilterItem` uses so the label is consistent.

- [ ] **Step 2: Also seed `active` on mount so it is correct before the effect runs**

Change the initial state (line 17):

```typescript
const [active, setActive] = useState('');
```

Leave the initial as `''` and rely on the render fallback (simplest, avoids a stale seed when the list changes). Confirm the effect (lines 29–34) still sets `active` on a real match.

- [ ] **Step 3: Typecheck** — `./node_modules/.bin/tsc --noEmit`. Expected: no errors.

- [ ] **Step 4: Manual verification**

Load `/vi/search` with no `sort` param on a mobile viewport → the sort button shows the default option's label (e.g. "Liên quan" / "Relevance") instead of an empty button.

- [ ] **Step 5: Commit**

```bash
git add components/layout/search/filter/dropdown.tsx
git commit -m "fix(search): show a default label on the sort control when unsorted"
```

---

## Task 3: Keep the hidden sticky buy-bar out of the tab order (finding 4.3)

`variant-selector.tsx:309-338` hides the mobile sticky bar with `aria-hidden={!showStickyBar}` and `translate-y-full`, but the duplicate `AddToCart` and wishlist controls stay focusable — keyboard users tab into an off-screen "Add to cart". Fix: mark the bar `inert` while hidden (React 19 supports the `inert` prop), which removes the whole subtree from focus and the a11y tree.

**Files:**
- Modify: `components/product/variant-selector.tsx`

**Interfaces:** none.

- [ ] **Step 1: Add `inert` to the sticky-bar container**

On the sticky-bar `<div ref={stickyBarRef} ...>` (line 309), add the `inert` attribute alongside the existing `aria-hidden`:

```tsx
<div
  ref={stickyBarRef}
  aria-hidden={!showStickyBar}
  inert={!showStickyBar}
  className={clsx(
    'fixed inset-x-0 bottom-0 z-30 ...', // unchanged
    showStickyBar ? 'translate-y-0' : 'translate-y-full',
  )}
>
```

If TypeScript rejects `inert={!showStickyBar}` (older `@types/react`), spread it conditionally instead:

```tsx
{...(!showStickyBar ? { inert: '' } : {})}
```

- [ ] **Step 2: Typecheck** — `./node_modules/.bin/tsc --noEmit`. Expected: no errors (React 19 / current `@types/react` accepts `inert`).

- [ ] **Step 3: Manual verification (keyboard)**

On a PDP mobile viewport, before scrolling (sticky bar hidden): press Tab repeatedly through the buy box — focus must NOT land on the off-screen sticky "Add to cart". After scrolling the buy box away (bar visible), the sticky controls become focusable again.

- [ ] **Step 4: Commit**

```bash
git add components/product/variant-selector.tsx
git commit -m "fix(a11y): make the hidden mobile buy-bar inert"
```

---

## Task 4: Make the empty-results state filter-aware (finding 4.4)

`empty-state.tsx:30` uses the SEO string `metaTitleWithQuery` ("Search: {query}") as the on-page heading and `:33` always renders `tryAdjustingFilter` — so a shopper with no filters set is told to adjust filters, and the filters that caused the empty page are invisible. The `noResults` / `noFilterResults` keys exist but are unused. Fix: take a `hasActiveFilters` flag, pick copy accordingly, and offer a clear-filters link when filters are active.

**Files:**
- Create: `lib/search-filters-active.ts`, `lib/__tests__/search-filters-active.test.ts`
- Modify: `components/layout/search/empty-state.tsx`
- Modify: `app/[locale]/(storefront)/search/page.tsx`

**Interfaces:**
- Produces: `hasActiveSearchFilters(params: Record<string, string | string[] | undefined>): boolean` — true when any of `price_min`, `price_max`, `in_stock` is set.
- Produces: `SearchEmptyState` gains `hasActiveFilters?: boolean`.

- [ ] **Step 1: Write the failing test**

```typescript
// lib/__tests__/search-filters-active.test.ts
import { describe, expect, it } from 'vitest';
import { hasActiveSearchFilters } from '@/lib/search-filters-active';

describe('hasActiveSearchFilters', () => {
  it('should be false with no filter params', () => {
    expect(hasActiveSearchFilters({ q: 'keychain', sort: 'newest' })).toBe(false);
  });
  it('should be true when a price bound is set', () => {
    expect(hasActiveSearchFilters({ price_min: '100' })).toBe(true);
    expect(hasActiveSearchFilters({ price_max: '500' })).toBe(true);
  });
  it('should be true when in-stock is set', () => {
    expect(hasActiveSearchFilters({ in_stock: '1' })).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test** — `./node_modules/.bin/vitest run lib/__tests__/search-filters-active.test.ts`. Expected: FAIL (cannot resolve import).

- [ ] **Step 3: Implement the helper**

```typescript
// lib/search-filters-active.ts
/** True when the search request carries any facet filter (finding 4.4). */
export function hasActiveSearchFilters(
  params: Record<string, string | string[] | undefined>,
): boolean {
  const has = (key: string): boolean => {
    const v = params[key];
    return typeof v === 'string' ? v.trim().length > 0 : Array.isArray(v) && v.length > 0;
  };
  return has('price_min') || has('price_max') || has('in_stock');
}
```

- [ ] **Step 4: Run the test** — same command. Expected: PASS.

- [ ] **Step 5: Rework the empty state**

In `components/layout/search/empty-state.tsx`, add `hasActiveFilters?: boolean` to the props. Replace the heading (line 30) and body (lines 32–34):

```tsx
<h2 className="mt-6 text-xl font-bold text-warm-900 dark:text-warm-100">
  {t('noResults')}
</h2>
<p className="mt-2 max-w-md text-sm text-warm-500 dark:text-warm-400">
  {hasActiveFilters ? t('noFilterResults') : t('tryAdjustingFilter')}
</p>

{hasActiveFilters ? (
  <Link
    href={query ? `/search?q=${encodeURIComponent(query)}` : '/search'}
    className="mt-4 text-sm font-medium text-terracotta-600 underline-offset-4 hover:underline dark:text-terracotta-400"
  >
    {t('filter.clear')}
  </Link>
) : null}
```

(`search.filter.clear` was added in Phase 3 Task 4 — reuse it. The clear link drops the filter params but keeps the query, giving the shopper a one-tap escape. Keep the existing category chips and "all products" CTA below.)

- [ ] **Step 6: Pass the flag from the search page**

In `app/[locale]/(storefront)/search/page.tsx`, import the helper and compute the flag, then pass it to the empty state (line 116):

```tsx
import { hasActiveSearchFilters } from '@/lib/search-filters-active';
// after `const filters = parseProductFilters(searchParams);`
const filtersActive = hasActiveSearchFilters(searchParams as Record<string, string | string[] | undefined>);
// at the render site:
<SearchEmptyState query={trimmedQuery} hasActiveFilters={filtersActive} />
```

- [ ] **Step 7: Typecheck + tests** — `./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/vitest run lib/__tests__/search-filters-active.test.ts`. Expected: no errors; PASS.

- [ ] **Step 8: Manual verification**

- `/vi/search?q=zzzznonexistent` (no filters) → heading "No results found." / body "Try adjusting the filter." should now be the generic no-results body, and NO clear-filters link.
- `/vi/search?q=keychain&price_min=99999999` (filter causes empty) → body "No products match the filter." plus a "Clear filters" link that returns results.

- [ ] **Step 9: Commit**

```bash
git add lib/search-filters-active.ts lib/__tests__/search-filters-active.test.ts components/layout/search/empty-state.tsx "app/[locale]/(storefront)/search/page.tsx"
git commit -m "fix(search): make the empty state filter-aware with a clear-filters escape"
```

---

## Final verification

- [ ] `./node_modules/.bin/vitest run`
- [ ] `./node_modules/.bin/tsc --noEmit`
- [ ] JSON validity + key parity (see Phase 3 final-verification commands).
- [ ] Deployed manual pass at a mobile viewport: filter disclosure works; sort label non-blank; keyboard cannot reach the hidden buy-bar; empty state shows the right copy and a clear-filters link only when filters are active.

## Self-review notes

- **Spec coverage:** 4.1 (Task 1), 4.2 (Task 2), 4.3 (Task 3), 4.4 (Task 4). All Phase-4 findings covered.
- **Dependency:** Tasks 1, 2, 4 reuse `search.filter.*` keys and the label-key sort items from Phase 3 Task 4; run Phase 3 first.
- **Type consistency:** `hasActiveSearchFilters` signature matches its call in `search/page.tsx`; `SearchEmptyState`'s new prop matches the value passed.
