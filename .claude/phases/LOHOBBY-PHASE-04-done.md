# Phase 04 — Assemble + Verify
Status: DONE

## Goal
Assemble the Lô Hobby homepage from the new/enhanced blocks via the home seed, add tests, and verify the whole build.

## Tasks
- [x] Rebuild `lib/page-builder/home-seed.ts` into the Lô Hobby layout (hero w/ stats+collage, category FeatureGrid, ProductShowcase, Reels, trust FeatureGrid, newsletter)
- [x] Add Vitest tests: schema round-trip for ProductShowcase + Reels, ProductShowcase filter/sort logic, home-seed builds without null blocks
- [x] Run `pnpm build` + typecheck
- [x] Run `pnpm test`
- [x] Update CLAUDE.md "Current Phase" pointer

## Acceptance Criteria
- Homepage renders the mockup layout end to end
- All tests pass
- Build is clean

## Decisions Made This Phase
- Rebuilt home-seed into the Lô Hobby layout: stat-backed Hero → category FeatureGrid (cards) → ProductShowcase → Reels → trust FeatureGrid (list) → Newsletter. Dropped the maker/3D-print copy and the promoBanner/testimonials/steps/quote/stats/faq blocks (still available in the builder; just not in the default seed).
- Left media-dependent fields (hero collage, reel poster/embed URLs) empty in the seed — the blocks degrade gracefully (collage hidden, reels render posters/placeholders) so the owner fills them in admin without a broken first render.
- Caught + fixed a wiring bug: ProductShowcase schema field was `showFilters` while the component/seed used `showTabs` — the CMS toggle never reached the component. Renamed the schema field to `showTabs` and regenerated payload-types.
- Updated existing home-seed tests to the new layout and added `new-blocks.test.ts` (schema round-trip + filter/sort logic). Final: build clean, 574 tests pass.
