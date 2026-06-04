# Analytics Extensions — Design

**Date:** 2026-06-05
**Branch (target):** `feature/first-party-analytics` (extends existing analytics work)
**Status:** Approved design — pending spec review

## Context

The store already has first-party, consent-gated analytics (Phases 01–02 on
`feature/first-party-analytics`):

- **Captured events (Prisma):** `VisitSession` (traffic attribution),
  `ProductViewEvent` (product-detail views + dwell ms).
- **Admin dashboard** (`src/payload/components/AnalyticsDashboard.tsx`, a Payload
  custom dashboard view): revenue/AOV/orders/paid metric cards, daily sales
  chart, traffic-by-source + conversion, top/bottom sellers, "viewed-a-lot /
  bought-little", views + avg dwell.
- **Aggregation:** pure functions in `lib/analytics/product-metrics.ts`, data
  layer in `lib/analytics/products.ts` / `traffic.ts` / `dashboard.ts`.
- The dashboard window is **hardcoded to the current calendar month**.
- Phase 03 (unit tests for the existing logic) is still **pending** and stays so;
  it is out of scope here. Each new phase below carries its own tests.

This spec adds three capabilities on top of that foundation.

## Goals

1. **Sales performance over a chosen time window**, plus a **discounted-item
   report** (how on-sale products perform).
2. **Cart abandonment** — how many customers add to cart without buying — from
   both existing cart data and a new add-to-cart funnel.
3. **Product click-through rate** — listing impression → product-page click.

## Non-Goals

- No change to the existing traffic / sellers / dwell sections beyond having them
  honor the new time window.
- No per-variant CTR; CTR is per product.
- No retroactive backfill of impressions/clicks/add-to-cart for periods before
  capture ships (these metrics start accruing from deploy).
- Phase 03 (existing-logic tests) is not done here.

---

## Shared Infrastructure: Time-Range Selector

The dashboard is locked to the current month. Introduce a single resolved
`{ start, end }` window that **every** dashboard section consumes.

- **Selector** — a small client component rendered in the dashboard header with
  presets: `Tháng này` (default), `7 ngày`, `30 ngày`, `90 ngày`, and a custom
  `từ … đến …` range. Selecting a preset updates the URL query
  (`?period=30d` or `?from=YYYY-MM-DD&to=YYYY-MM-DD`) via `router.replace`.
- **Resolution** — a pure helper `resolvePeriod(searchParams) -> { start, end, label }`
  in `lib/analytics/period.ts`. Unknown/missing → current month (back-compat).
  Custom range is clamped to a max span (e.g. 366 days) and validated; invalid
  input falls back to current month.
- **Plumbing** — `AnalyticsDashboard` reads `searchParams` (passed by Payload to
  the custom dashboard view), resolves the window once, and threads
  `{ start, end }` into `fetchOrdersInRange`, `getTrafficBySource`,
  `getProductPerformance`, and the new functions. The previous-period comparison
  for metric cards uses the equivalent prior window of the same length.

**Risk / verification:** Confirm Payload 3 passes `searchParams` into the custom
dashboard view `Component`. Verify first. **Fallback if not:** persist the
selected period in a cookie that the server component reads, with the selector
setting the cookie then refreshing. Either way the rest of the design is
unchanged because everything goes through `resolvePeriod`.

---

## Feature 1 — Sales Performance + Discounted-Item Report

**Time window:** delivered by the shared selector above — the existing sales
chart, sellers, and traffic sections all recompute for the chosen range.

**Discounted-item report** — new dashboard section "Sản phẩm khuyến mãi":

- Source: products with `onSale === true` (Payload `Products`), joined to sold
  units/revenue in the window (existing `aggregateSales` over revenue orders).
  No new capture.
- Columns: product, `salePercent`, units sold, revenue (VND).
- New data function `getDiscountedItemPerformance(start, end)` in
  `lib/analytics/products.ts`: fetch on-sale products, intersect with aggregated
  sales, return rows (including on-sale products with **zero** sales in window so
  underperforming promos are visible).
- Pure join/sort logic added to `product-metrics.ts` and unit-tested.

---

## Feature 2 — Cart Abandonment (two sources)

**Headline metric — from existing `carts` collection (no new capture):**

- Abandoned cart = a `carts` row with `cartItems.length > 0`,
  `completed === false`, and `updatedAt` within the window.
- Completed cart = `completed === true` within the window.
- Report: abandoned count, completed count, **abandonment rate** =
  `abandoned / (abandoned + completed)`.
- New data function `getCartAbandonment(start, end)` querying Payload `carts`.
  Pure rate math lives in `product-metrics.ts` (or a new `cart-metrics.ts`) and
  is unit-tested.

**Funnel detail — new `add_to_cart` event capture:**

- **Prisma model** `AddToCartEvent(id, anonId, sessionId, productId,
  productHandle, quantity, createdAt)` with indexes on `productId`, `createdAt`,
  `sessionId`. Mirrors `ProductViewEvent` shape and the consent/pseudonymity
  rules.
- **Capture:** in `components/cart/add-to-cart.tsx`, on successful add, fire
  `beacon('/api/track/cart', …)` using existing `getAnonId` / `getSession` /
  consent gating from `lib/analytics/track-client.ts`.
- **Endpoint:** `POST /api/track/cart` (Node runtime, manual `typeof` validation
  via `lib/analytics/track-server.ts`, consent check, always 204) — mirrors
  `app/api/track/view/route.ts`.
- **Funnel:** sessions with ≥1 `add_to_cart` event vs sessions that produced a
  paid order in the window → add-to-cart→purchase rate. Surfaced as a small
  funnel/summary in the cart-abandonment section.

---

## Feature 3 — Product Click-Through Rate (impression → PDP click)

CTR = clicks / impressions for product cards shown in listings/grids.

**Capture (high volume — batched):**

- `ProductCard` gains an `IntersectionObserver`: a card ≥50% visible for ≥1s
  counts as **one impression** (dedup per card per page view).
- Impressions are **batched per page** into one array and sent via a single
  beacon on `pagehide` / route change → `POST /api/track/impressions`.
- A click on the card's product link fires `POST /api/track/click` (or is folded
  into the batched payload as a click flag). Consent-gated, pseudonymous.

**Storage (daily rollup, NOT per-event):**

- **Prisma model** `ProductCtrDaily(productId, day @db.Date, impressions Int,
  clicks Int)` with `@@unique([productId, day])`. Endpoints upsert-and-increment
  the day's counters.
- **Rationale:** impressions are far higher volume than page views; per-event
  rows (the existing pattern) would bloat the table. A daily rollup keeps writes
  and range aggregation cheap. **This deviation from the per-event pattern is
  logged in `DECISIONS.md`.**

**Dashboard — "Tỷ lệ nhấp" section in Product Performance:**

- New data function `getProductCtr(start, end)`: sum impressions/clicks per
  product across days in the window, compute `ctrPct = clicks / impressions`.
- Pure compute (`ctrPct`, sorting, min-impression threshold to suppress noise)
  in `product-metrics.ts`, unit-tested.
- Columns: product, impressions, clicks, CTR %.

---

## Data Flow Summary

```
Storefront                      Capture API (Node, consent-gated, 204)        Prisma
─────────────────────────────   ────────────────────────────────────────     ──────────────────
ProductCard (IO + click)    →   POST /api/track/impressions, /track/click  →  ProductCtrDaily (upsert++)
add-to-cart.tsx (on add)    →   POST /api/track/cart                       →  AddToCartEvent (insert)
(existing) view tracker     →   POST /api/track/view                       →  ProductViewEvent

Admin dashboard (server)        resolvePeriod(searchParams) → {start,end}
  → fetchOrdersInRange / getTrafficBySource / getProductPerformance
  → getDiscountedItemPerformance / getCartAbandonment / getProductCtr
  → pure aggregation in product-metrics.ts → RankingTable sections
```

## Components & Files (new / changed)

**New**
- `lib/analytics/period.ts` — `resolvePeriod` (pure)
- `src/payload/components/analytics/PeriodSelector.tsx` — client selector
- `app/api/track/cart/route.ts`, `app/api/track/impressions/route.ts`,
  `app/api/track/click/route.ts`
- `components/analytics/*` tracker wiring as needed
- Prisma: `AddToCartEvent`, `ProductCtrDaily` (+ migration)

**Changed**
- `prisma/schema.prisma`
- `lib/analytics/products.ts` (+ `getDiscountedItemPerformance`, `getCartAbandonment`, `getProductCtr`)
- `lib/analytics/product-metrics.ts` (pure compute for discounted report, cart rate, CTR)
- `src/payload/components/AnalyticsDashboard.tsx` (selector + new sections, window threading)
- `components/cart/add-to-cart.tsx`, `components/product/ProductCard*` (capture)
- `DECISIONS.md` (CTR rollup deviation; selector plumbing choice)

## Error Handling & Privacy (unchanged from existing analytics)

- All capture endpoints: consent-gated, manual validation, swallow write errors,
  always return 204. `customerId`/identity never trusted from the client body.
- Pseudonymous `anonId` / `sessionId` only.
- Dashboard data functions tolerate empty ranges (return empty rows, no throw).

## Testing

Each phase ships its own Vitest unit tests for the **pure** functions:

- F1: `resolvePeriod` (presets, custom, invalid → month, clamp); discounted-item
  join (on-sale with and without sales).
- F2: cart abandonment rate (zero carts, all completed, all abandoned, mixed);
  add-to-cart→purchase funnel combination.
- F3: CTR compute (zero impressions, min-impression threshold, sorting,
  rounding); daily rollup sum across a range.

Capture endpoints follow the existing 204-on-every-path contract; manual
verification per phase confirms rows are written only with consent.

## Phasing

- **Phase 04** — Time-range selector + discounted-item report (no new capture; lowest risk). Verify Payload `searchParams` plumbing here.
- **Phase 05** — Cart abandonment: carts-based headline + `add_to_cart` capture and funnel.
- **Phase 06** — Product CTR: impression/click capture + `ProductCtrDaily` rollup + dashboard section.
- (Pre-existing **Phase 03** — tests for prior analytics logic — remains pending, out of scope here.)

## Open Risks

1. Payload passing `searchParams` to the dashboard view (mitigation: cookie fallback).
2. Impression volume — mitigated by per-page batching + daily rollup; revisit if
   write rate is still high (could add client-side sampling).
