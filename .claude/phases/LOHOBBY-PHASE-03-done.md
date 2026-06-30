# Phase 03 — Block Features
Status: DONE

## Goal
Add the page-builder capabilities the mockup needs: enhanced Hero, enhanced FeatureGrid, and two new blocks (ProductShowcase, Reels), fully registered across all touchpoints.

## Tasks
- [x] Hero: add `eyebrow`, `secondaryCtaLabel`/`secondaryCtaHref`, `stats[]` (value+label), `collage[]` (floating images w/ bob animation)
- [x] FeatureGrid: add per-item `href` + `caption`, add `variant` (list | cards) to support category grid look
- [x] New `ProductShowcase` block: heading/subheading, product selection, client-side category tab filter + sort dropdown, badges, quick-add
- [x] New `Reels` block: eyebrow, heading, follow link, `tiles[]` (poster image/tag/caption/views/embed URL) + play modal
- [x] Register both new blocks: schema file, `blocks/index.ts` barrel, `REGISTERED_BLOCKS`, `Pages.ts` layoutBlocks, `RenderBlocks` import+switch, `PageBlock` union, animation preset mapping in `lib/animations/block-defaults.ts`

## Acceptance Criteria
- `pnpm build` / typecheck passes
- New blocks appear in the page-builder admin + AI assistant contract
- ProductShowcase filters/sorts client-side without reload
- Reels modal opens/closes, handles embeds + placeholder
- All existing blocks still render

## Decisions Made This Phase
(append as you go)
