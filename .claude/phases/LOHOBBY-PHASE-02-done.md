# Phase 02 — Global Chrome
Status: DONE

## Goal
Retheme the shared storefront chrome (navbar, footer, cart drawer, product card, button primitives) to the mockup's monochrome look so every page — not just the homepage — matches.

## Tasks
- [x] Navbar: Playfair italic logo + uppercase tag, pill nav links, pill search, round cart button with animated count badge
- [x] Footer: display-caps column headings, muted links, bottom bar with secondary line
- [x] Cart drawer / modal: header display caps, pill checkout, qty steppers, empty state
- [x] ProductCard: square thumb, top-left text badge, hover quick-add fab, pill "Add to bag"
- [x] Button primitives: pill black primary / outline ghost, match mockup `.btn`
- [x] Announcement banner: align to new tokens

## Acceptance Criteria
- `pnpm build` / typecheck passes
- Navbar, footer, cart visually match the mockup on light theme
- No hardcoded hex — all via theme tokens
- Existing functionality (cart, search, nav dropdowns) unchanged

## Decisions Made This Phase
- BrandLogo now renders a Playfair Display italic wordmark (store name + uppercase tag) as the default identity when no custom logo image is uploaded. Added `hasCustomLogo` to `StoreBranding` — true when a CMS logo or an explicit `NEXT_PUBLIC_DEFAULT_LOGO` env is set; the hardcoded `/brand/lo-logo.png` fallback triggers the wordmark. White-label uploads still render as images.
- Rethemed chrome reuses the existing `warm-*`/`terracotta-*` Tailwind classes (retuned to monochrome in Phase 1) rather than rewriting every className to semantic tokens — smaller diff, same monochrome result. Shape changes (pills via `rounded-full`, round cart via `rounded-full`, `rounded-card`) are the substantive edits.
- Accent surfaces that were terracotta (cart badge, remove-hover, product price/discount badge, search-suggestion price) switched to ink (`warm-900`/`warm-100`) for a true no-color-pop monochrome look.
