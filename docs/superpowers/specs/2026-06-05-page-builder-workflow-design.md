# Page Builder Workflow Redesign — Design

**Date:** 2026-06-05
**Status:** Approved (pending implementation plan)
**Author:** brainstorming session

## Problem

The Payload admin page builder is confusing to use for two compounding reasons:

1. **No visual preview.** The "Add Section" drawer lists 13 block types as plain text labels (Hero, FeaturedCollection, ImageWithText, PromoBanner…). There is no way to recognize what a block looks like before adding it, and no way to see the rendered page output without saving and visiting the storefront.
2. **Two overlapping page systems.** Two separate collections both present as "make a page":
   - `pages` (collection slug `pages`) — 13 rich blocks, appearance controls, rendered at `/p/[slug]`.
   - `content-pages` — 3 lightweight blocks (hero, richText, cta), rendered at `/pages/[slug]`, gated behind `ENABLE_CONTENT_PAGES`.

   The lightweight `content-pages` was a Phase-3 stub later superseded by the full `pages` builder. Nothing in nav/footer links to `/pages/[slug]`. Keeping both forces the editor to choose between two tools with no guidance.

## Goal

Deliver one self-explanatory page builder with recognizable block thumbnails and a live side-by-side preview, so building a page stops "feeling blind."

## Scope

In scope:
- Consolidate to a single page system (retire `content-pages`).
- Native block-picker thumbnails (subtle per-block color tint) + descriptions for all 13 blocks.
- Payload Live Preview panel with device breakpoints + near-real-time refresh (Approach 2).
- Workflow-clarity touches (collection/block/status descriptions, meaningful row labels).

Out of scope (flagged, not done):
- Native Payload versioning / autosave / drafts table.
- Scheduled publishing.
- Per-block visibility toggles.
- Full per-keystroke field-level live preview (rejected Approach 3 — would require rewriting all 13 server-rendered blocks as client components, fighting the RSC architecture).

## Design

### Part 1 — Consolidation (single page system)

- **Keep** the `pages` collection (13 blocks) as the one page builder.
- **Retire** the `content-pages` collection, its `/pages/[slug]` route, the `lib/content-pages.ts` data layer, and the `ENABLE_CONTENT_PAGES` / `isContentPagesEnabled()` feature flag.
- **One-time migration script** (`scripts/`): copy any existing `content-pages` rows into `pages`, mapping blocks `hero → Hero`, `richText → RichText`, `cta → PromoBanner`. Preserve `slug`, `title`, and published state (`published: true → status: 'published'`). If the table is empty (expected — unlinked stub), the script is a safe no-op. Run before removing the collection.
- **Route move:** the surviving builder's public route moves from `/p/[slug]` to `/pages/[slug]`. The route handler renders the `pages` collection via the existing `components/blocks/RenderBlocks.tsx` — same blocks, same output, new path.
- **Redirect:** permanent redirect `/p/[slug] → /pages/[slug]` in `next.config.mjs` so existing/bookmarked/SEO URLs keep working.

**Data flow (unchanged except path):** server component → `lib/page-builder.ts` `getPageBySlug` (cached, `status: published`) → `RenderBlocks`.

### Part 2 — Block picker thumbnails

- Use Payload's **native** `Block.imageURL` + `imageAltText`. Payload renders the thumbnail in the block-selector drawer automatically — no custom drawer component.
- Create **13 SVG wireframe thumbnails** in `public/admin/block-previews/` (`hero.svg`, `featured-collection.svg`, `featured-products.svg`, `rich-text.svg`, `image-with-text.svg`, `gallery.svg`, `testimonials.svg`, `logo-cloud.svg`, `newsletter.svg`, `faq.svg`, `promo-banner.svg`, `video-embed.svg`, `divider.svg`). Each shows the block's layout *shape* with a **subtle per-block-type color tint** (light background tint distinct per block) over grayscale wireframe elements, for faster visual scanning. No external images, no build step.
- Set `imageURL`/`imageAltText` on each of the 13 `Block` definitions in `src/payload/blocks/`.
- Add a one-line `admin.description` to each block (e.g. Hero → "Large banner with headline, CTA and image").

**Rationale:** abstract wireframes communicate shape (what you choose in the picker) and never go stale when styling changes, unlike screenshots.

### Part 3 — Live preview (Approach 2)

**Admin (`src/payload/collections/Pages.ts`):**
- Add `admin.livePreview` with device breakpoints (mobile 375px, tablet 768px, desktop). Payload renders the side-by-side iframe + device toggle.
- Preview `url` builds the storefront draft URL for the current doc: `/{locale}/pages/{slug}` entered through the draft-mode handler.

**Storefront:**
- **Draft-mode route handlers:**
  - `app/api/preview/route.ts` — validates `PREVIEW_SECRET`, calls `draftMode().enable()`, redirects to the target page.
  - `app/api/exit-preview/route.ts` — calls `draftMode().disable()`.
- **Render route branch** (`app/[locale]/(storefront)/pages/[slug]/page.tsx`): if `draftMode().isEnabled`, fetch via a new **uncached, status-agnostic** `fetchPageBySlugDraft` (bypasses `unstable_cache` and the `status: published` filter so unpublished edits render); otherwise use the existing cached published path.
- **Auto-refresh:** render `@payloadcms/live-preview-react`'s `<RefreshRouteOnSave>` only when draft mode is enabled. It listens for Payload preview postMessages and calls `router.refresh()`, re-rendering the server components with the latest draft data — near-real-time without rewriting blocks.

**Security:** draft content is only served behind the `PREVIEW_SECRET` token; no token → no draft. `RefreshRouteOnSave` validates the server URL origin.

**New dependency:** `@payloadcms/live-preview-react` (matches Payload `^3.84.1`).

### Part 4 — Workflow clarity touches

- **Collection description** on `pages`: "Build storefront pages by stacking sections. Use the live preview on the right to see your changes."
- **Block labels + descriptions:** clear human label + one-line description per block (from Part 2) so the picker reads like a menu.
- **Section row labels:** each added block shows a meaningful summary (e.g. Hero → its headline) via `admin.components.RowLabel`, following the existing `HeaderTabRowLabel.tsx` pattern.
- **Status clarity:** keep the `draft`/`published` select; add a description noting draft pages are visible only in preview.

## Error Handling

- **Missing/invalid preview token:** `/api/preview` returns 401; never enables draft mode.
- **Page not found in draft:** draft fetch returns `null` → route renders `notFound()` as today.
- **Empty `content-pages` table:** migration script logs "nothing to migrate" and exits 0.
- **Slug collision during migration:** if a `content-pages` slug already exists in `pages`, the script skips it and logs a warning rather than overwriting (manual reconciliation).
- **Missing thumbnail file:** Payload falls back to the text label (no hard failure).

## Testing

- **Migration script:** unit test the block-mapping function (`hero/richText/cta → Hero/RichText/PromoBanner`) with a fixture row; assert slug-collision skip behavior.
- **Draft fetch:** test `fetchPageBySlugDraft` returns unpublished pages and bypasses cache, while published path still filters `status: published`.
- **Preview handlers:** test `/api/preview` rejects missing/invalid token and enables draft mode on valid token.
- **Redirect:** assert `/p/[slug]` redirects to `/pages/[slug]`.
- Manual: verify live preview panel renders, device toggles work, and edits refresh the iframe.

## Affected Files (indicative)

- `src/payload/collections/Pages.ts` — livePreview config, descriptions.
- `src/payload/collections/ContentPages.ts` — remove (after migration).
- `src/payload/blocks/*.ts` — `imageURL`/`imageAltText`/`description` on all 13.
- `public/admin/block-previews/*.svg` — 13 new thumbnails.
- `app/[locale]/(storefront)/pages/[slug]/page.tsx` — render `pages` via RenderBlocks + draft branch.
- `app/[locale]/(storefront)/p/[slug]/page.tsx` — remove (replaced by redirect).
- `app/api/preview/route.ts`, `app/api/exit-preview/route.ts` — new.
- `lib/page-builder.ts` — add `fetchPageBySlugDraft`.
- `lib/content-pages.ts` — remove.
- `lib/feature-flags.ts` — remove `isContentPagesEnabled`.
- `next.config.mjs` — `/p/:slug` → `/pages/:slug` redirect.
- `payload.config.ts`, `src/payload/plugins.ts` — drop `content-pages` references.
- `scripts/migrate-content-pages.ts` — new one-time migration.
- `.env` — add `PREVIEW_SECRET`.
- DB migration in `src/migrations/` — drop `content_pages*` tables after data migration.

## Decisions Made This Session

- **Consolidate onto `pages`, retire `content-pages`.** Two overlapping builders were the root confusion; one system is the biggest clarity win.
- **Public route `/pages/[slug]` with redirect from `/p/[slug]`.** The cleaner URL was held by the retired stub; reclaim it, redirect the old path.
- **Live preview Approach 2 (livePreview panel + RefreshRouteOnSave), not Approach 3.** Delivers the side-by-side device preview within Payload's supported patterns without rewriting RSC blocks; full per-keystroke preview not worth the refactor cost/risk.
- **Wireframe thumbnails with subtle per-block color tint, not screenshots.** Communicate shape, never go stale, tint speeds scanning.
