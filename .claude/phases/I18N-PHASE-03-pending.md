# Phase 03 — Remaining Surfaces & Polish
Status: ACTIVE

## Goal
Translate the remaining storefront surfaces, finalize locale metadata, and
verify the build end-to-end.

## Tasks
- [ ] About / Contact / FAQ → `info` namespace
- [ ] Blog UI chrome (listing labels, pagination, post meta) → `blog` namespace
- [ ] Profile (orders/addresses/wishlist/settings labels) → `profile` namespace
- [ ] Search UI chrome (filters, sort, empty states) → `search` namespace
- [ ] Home sections (hero/categories/recs static copy) → `home` namespace
- [ ] Confirm `<html lang>` per locale; sanity-check OG `locale`
- [ ] Final test pass + `pnpm build` verification
- [ ] Manual smoke: `/`, `/vi`, `/en`, switcher, deep links

## Acceptance Criteria
- All in-scope storefront surfaces render correctly in VI and EN
- Tests pass; `pnpm build` succeeds
- No console hydration/i18n warnings in dev smoke

## Decisions Made This Phase
(append as you go)
