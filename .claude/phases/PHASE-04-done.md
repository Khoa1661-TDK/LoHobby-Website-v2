# Phase 04 — Time-Range Selector + Discounted-Item Report
Status: DONE

## Goal
Add a dashboard time-range selector and discounted-item report to the existing first-party analytics.

## Tasks
- [x] Task 4.1: `resolvePeriod` pure helper + period tests
- [x] Task 4.2: `joinDiscountedItems` pure aggregation + discounted tests
- [x] Task 4.3: `getDiscountedItemPerformance` data layer in `products.ts`
- [x] Task 4.4: `PeriodSelector` client component
- [x] Task 4.5: Thread the window through the dashboard + add discounted section
- [x] Task 4.6: Verify Phase 04 end-to-end (all tests green, no new TS errors)

## Acceptance Criteria
- [x] Dashboard accepts `?period=7d`, `?period=30d`, `?period=90d`, or custom `?from=...&to=...`
- [x] All dashboard sections recompute for the selected window
- [x] Discounted-items table lists on-sale products with correct units/revenue
- [x] `pnpm vitest run` passes (138 tests, 21 files)
- [x] Decision logged in `DECISIONS.md`

## Decisions Made This Phase
- searchParams-vs-cookie: Used Payload 3 `searchParams` (no cookie fallback needed). Logged in DECISIONS.md.