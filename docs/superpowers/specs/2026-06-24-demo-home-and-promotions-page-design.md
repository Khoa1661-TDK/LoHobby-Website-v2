# Demo Home Page + Promotions Page — Design

Date: 2026-06-24
Status: Approved

## Goal

Deliver two page-builder pages for the hobby 3D-printing shop (keychains, aircraft
models, figures, etc.):

1. A richer **demo home page** — the live front page at `/`.
2. A dedicated **promotions / sale page** at `/pages/sale` — promo banners, deal
   callouts, and the live discounted-items grid.

Both are authored as `pages`-collection block layouts via idempotent seed scripts,
matching the existing `seed-home-page.ts` pattern, and remain editable in the Payload
admin builder afterward.

## Background / Existing System

- Pages live in the Payload `pages` collection with a `layout` array of page-builder
  blocks, rendered by `RenderBlocks`. The `home` slug is special-cased as the front page.
- `lib/page-builder/home-seed.ts` (`buildHomeSeedLayout`) authors the current home layout;
  `scripts/seed-home-page.ts` (`ensureHomePage`) upserts it idempotently.
- `createDefaultBlock(slug)` instantiates a block from its schema defaults; the seed
  pattern is `{ ...createDefaultBlock(slug), ...overrides }`.
- A discount system already exists: products carry an `onSale` checkbox that auto-syncs
  them into an auto-managed **"On Sale" category** (slug `on-sale`, from
  `lib/default-categories.ts`), listed at `/search/on-sale`.
- `plainTextToLexical` (`lib/content-pages-migration.ts`) converts plain strings into the
  minimal Lexical state needed for richText fields (FAQ answers).

All blocks used below are already registered in the Pages collection schema, so **no new
migration is required** — only data is being seeded.

## CTA href clarification

A block's `ctaLabel`/`ctaHref` (or `primaryLabel`/`primaryUrl`, `linkLabel`/`url`) is a
button: the label is the visible text, the href is the destination URL. Examples used
here: home "See deals" → `/pages/sale`; sale hero "Shop the sale" → `/search/on-sale`.

## Design

### 1. Home page (`home`) — `buildHomeSeedLayout` enhancement

Block order (hero stays first; featuredProducts stays conditional on product ids;
newsletter stays present — preserves existing tests):

1. `hero` — "Printed to order." / keychains, aircraft, figures; CTA "Shop all" → `/search`.
2. `promoBanner` — placeholder deal strip; CTA "See deals" → `/pages/sale`.
3. `featuredCollection` — "Off the plate".
4. `featuredProducts` — "New drops" (live newest ids; omitted when none).
5. `steps` — "How we print" (Design → Slice → Print → Ship).
6. `stats` — playful maker stats.
7. `gallery` — print showcase.
8. `faq` — materials / lead time / shipping (answers via `plainTextToLexical`).
9. `newsletter` — capture.

### 2. Promotions page (`sale`) — `buildDealsSeedLayout`

New `lib/page-builder/deals-seed.ts`. Takes an optional `onSaleCategoryId` so the
FeaturedCollection can bind to the live on-sale category.

Block order:

1. `hero` — "Deals off the plate." promo headline; CTA "Shop the sale" → `/search/on-sale`.
2. `promoBanner` — placeholder limited-time banner with a `countdown` date.
3. `banner` — secondary placeholder promo strip (e.g. free-shipping threshold).
4. `featuredCollection` — bound to the `on-sale` category id → live discounted items.
   Title field omitted only if id unresolved is acceptable; block still renders.
5. `stats` — "up to X% off" placeholder figures.
6. `callToAction` — "Don't miss a drop" → primary `/search`, secondary `/pages/sale`.

New `scripts/seed-deals-page.ts` (`ensureDealsPage`): resolves the `on-sale` category id
(via `ON_SALE_CATEGORY_SLUG`), builds the layout, and upserts a published `sale` page —
mirroring `ensureHomePage` (create if absent, update existing to published).

## Components / Files

- `lib/page-builder/home-seed.ts` — expand `buildHomeSeedLayout`.
- `lib/page-builder/deals-seed.ts` — new `buildDealsSeedLayout(opts)`.
- `scripts/seed-home-page.ts` — unchanged logic (runs enhanced layout).
- `scripts/seed-deals-page.ts` — new `ensureDealsPage` + CLI runner.
- Tests: `lib/__tests__/home-seed.test.ts` (extend), `lib/__tests__/deals-seed.test.ts`
  (new), `scripts/__tests__/seed-deals-page.test.ts` (new).

## Testing

- Pure layout builders: assert block order, slug presence, conditional featuredProducts,
  on-sale category id wired into featuredCollection, FAQ answers are valid Lexical.
- Seed runners: mocked Payload `find`/`create`/`update` — create-when-absent and
  update-existing-to-published paths, and that the on-sale category lookup feeds the layout.

## Out of Scope / Notes

- No new blocks or migrations.
- Live grids (featuredProducts "New drops", on-sale FeaturedCollection) render empty until
  products exist / are marked `onSale`. The user must mark a few products on sale to
  populate the discount grid. Placeholder promo banners are intentionally static copy.
