# Phase 02 — Aggregation + Admin Dashboard
Status: DONE

## Goal
Surface traffic sources, best/worst sellers, and view→buy on the existing admin dashboard.

## Tasks
- [x] `lib/analytics/traffic.ts` — sessions per source + conversion (join paid Orders)
- [x] `lib/analytics/products.ts` — top/bottom sellers (Payload Orders lineItems), attention (views + avg dwell), view→buy flag
- [x] Ranking-table component under `src/payload/components/analytics/`
- [x] Extend `AnalyticsDashboard.tsx` with the new sections

## Acceptance Criteria
- [ ] Dashboard shows traffic sources with conversion rate
- [ ] Dashboard shows top sellers and bottom/low-converting items
- [ ] Dashboard shows views + avg dwell per product

## Decisions Made This Phase
<!-- Append decisions here as they happen. Full entry goes to DECISIONS.md -->
