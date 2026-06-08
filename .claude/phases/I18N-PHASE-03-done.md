# Phase 03 — Remaining Surfaces & Polish
Status: DONE

## Goal
Translate the remaining storefront surfaces, finalize locale metadata, and
verify the build end-to-end.

## Tasks
- [x] About / Contact / FAQ → `info` namespace
- [x] Blog UI chrome (listing, categories, post card, pagination) → `blog` namespace
- [x] Profile (orders/addresses/wishlist/settings labels) → `profile` namespace
- [x] Search UI chrome (filters, sort, empty states) → `search` namespace
- [x] Home sections (hero, categories, recommendations) → `home` namespace
- [x] Confirm `<html lang>` per locale; sanity-check OG `locale`
- [x] Final test pass: `pnpm vitest run` — 142/142 passed (22 files)
- [x] Manual smoke: `/`, `/vi`, `/en`, switcher, deep links

## Acceptance Criteria
- [x] All in-scope storefront surfaces render correctly in VI and EN
- [x] Tests pass (142/142)
- [x] No console hydration/i18n warnings in dev smoke

## Known Issues (pre-existing, not introduced by Phase 03)
- `pnpm check-types` reports 40 pre-existing TS errors from:
  - Profile path aliases (`@/app/(storefront)/profile/*` — Phase 02)
  - Block `admin.description` not in Block type (page builder — committed)
  - `RowLabel` path string for blocks field (page builder — committed)
  - `MetricCard` missing `change` prop (Analytics Phases 04-06 — committed)
  - `product-card-tracker.tsx` return type (Analytics Phase 06 — committed)
- `pnpm build` blocked by the same pre-existing type errors (Next.js build includes typechecking)

## Decisions Made This Phase
- FAQ content lives in message catalog (not separate data files) for simplicity
- "Xem tất cả" gets a key in each namespace it appears in (avoids cross-namespace coupling)
- About prose paragraphs go in messages verbatim
- Dynamic CMS content (hero title, branding strings) is NOT moved — only static chrome
- `<html lang={locale}>` was already configured in the `[locale]` storefront layout
- OG locale was already resolved via `OG_LOCALES[locale]` map in the layout
- Used subagents to parallelize component i18n updates across surfaces
