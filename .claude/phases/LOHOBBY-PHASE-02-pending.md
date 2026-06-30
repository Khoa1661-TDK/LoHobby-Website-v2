# Phase 02 — Global Chrome
Status: PENDING

## Goal
Retheme the shared storefront chrome (navbar, footer, cart drawer, product card, button primitives) to the mockup's monochrome look so every page — not just the homepage — matches.

## Tasks
- [ ] Navbar: Playfair italic logo + uppercase tag, pill nav links, pill search, round cart button with animated count badge
- [ ] Footer: display-caps column headings, muted links, bottom bar with secondary line
- [ ] Cart drawer / modal: header display caps, pill checkout, qty steppers, empty state
- [ ] ProductCard: square thumb, top-left text badge, hover quick-add fab, pill "Add to bag"
- [ ] Button primitives: pill black primary / outline ghost, match mockup `.btn`
- [ ] Announcement banner: align to new tokens

## Acceptance Criteria
- `pnpm build` / typecheck passes
- Navbar, footer, cart visually match the mockup on light theme
- No hardcoded hex — all via theme tokens
- Existing functionality (cart, search, nav dropdowns) unchanged

## Decisions Made This Phase
(append as you go)
