# Auto-Sale for Most-Viewed Products — Design

**Date:** 2026-07-26
**Status:** Approved, ready for implementation planning

## Problem

Putting products on sale is entirely manual today. An admin ticks `onSale` and sets
`salePercent` on each product by hand. Nothing connects the shop's own analytics —
which already know what shoppers are looking at — to what gets discounted.

## Goal

A fully automatic nightly job that puts the five most-viewed products on a 10% sale
and takes them off again when they stop being most-viewed, without ever disturbing a
sale an admin set by hand.

## What "most viewed" means

Rank products by **unique sessions that viewed the product detail page in the last 7
days**. Not raw view events: a view costs the visitor nothing, so raw counts are
trivially skewed by one shopper refreshing a page or a crawler sweeping the catalogue.
Distinct `sessionId` per product is the robust signal.

View data comes from the Prisma `ProductViewEvent` table, written by
`app/api/track/view/route.ts`. Its `productId` is `String(product.id)` — the Payload
product id — so it joins directly to the Payload `products` collection with no mapping
layer. Note that view tracking is consent-gated, so the ranking reflects consented
traffic only.

## Constants

Defined in `lib/constants.ts`. Deliberately not admin-configurable — a knob that is
never turned is a field that can be set wrong. Promoting them to the settings global
later is a small change.

| Constant | Value | Meaning |
|---|---|---|
| `AUTO_SALE_COUNT` | 5 | Maximum products on auto-sale at once |
| `AUTO_SALE_PERCENT` | 10 | Discount applied to each |
| `AUTO_SALE_WINDOW_DAYS` | 7 | Rolling view window |
| `AUTO_SALE_MIN_VIEWERS` | 5 | Minimum unique viewers to be eligible |

`AUTO_SALE_MIN_VIEWERS` exists so a quiet week — three products with a single visitor
each — cannot put those products on sale on the strength of one page load. If nothing
clears the floor, nothing goes on sale. That is the intended failure mode.

## Architecture

Four pieces, each independently testable.

### 1. `lib/auto-sale/select.ts` — pure

The whole policy lives here. No DB, no Payload, no clock. Input: ranked view counts,
the current product list with sale state, and the exclusion list. Output: a plan.

```
type AutoSalePlan = {
  toEnable: { productId: string; salePercent: number }[];
  toDisable: string[];
};
```

### 2. `lib/auto-sale/run.ts` — impure shell

Queries the view data, loads products, calls the selector, applies the plan through
`payload.update`, returns a run summary.

### 3. `AutoSaleSettings` Payload global

- `enabled` — toggle; short-circuits the run before any query.
- `excludedProducts` — relationship (hasMany) to `products`; never auto-discounted.
- `lastRun` — read-only summary group (see Observability).

### 4. Task registration in `payload.config.ts`

A Payload `jobs.tasks` entry plus a `jobs.autoRun` nightly cron. Payload 3.84 supports
this (`node_modules/payload/dist/queues/config/types/index.d.ts:127`).

### Data flow

```
Prisma ProductViewEvent (last 7d)
  -> groupBy(productId, sessionId)          [DB does the dedupe]
  -> countUniqueViewers()                   [pure, new]
  -> selectAutoSale()                       [pure, applies all rails]
  -> payload.update per product
  -> syncOnSaleCategory hook (existing)     [adds/removes "On Sale" category]
  -> afterChange revalidateTag('products')  [storefront refresh]
  -> /search/on-sale + On Sale homepage section
```

## Trigger: Payload `autoRun`, not an external cron

**Chosen:** a Payload jobs task scheduled by `jobs.autoRun` inside the existing
long-running container.

**Rejected — protected API route + host cron:** works, but adds a `CRON_SECRET`, a
publicly reachable endpoint, and a scheduler configured outside the container that can
drift out of sync with a deploy.

**Rejected — lazy recompute on read:** computing the top-viewed set when the On Sale
page renders would never write the `onSale` flag, so the category sync hook, the
struck-through price on product cards, and search facets would all disagree with the
sale page.

`autoRun` fires per-replica, so the task must be idempotent — it is, by construction,
since it reconciles state rather than applying a delta. If the deployment ever scales
past one replica this needs revisiting.

Running in-process also matters for cache: the `afterChange` hooks' `revalidateTag`
calls only reach the serving process's `unstable_cache` if the write happens in that
process. This project has already been bitten by cross-process writes not busting the
cache (seed scripts require a dev-server restart). A cron in a separate container
would update the database and silently leave the storefront stale.

## Ownership: manual sales are untouchable

Auto-removal and manual-safety only coexist if every sale records who set it.

**New field on `Products`: `autoSaleManaged`** — checkbox, hidden from the edit form,
admin read-only. Set `true` only when the job enables a sale; cleared when the job
disables one. The removal pass queries
`where: { autoSaleManaged: { equals: true } }`, so it is structurally incapable of
clearing a sale it did not create.

**Manual edits reclaim ownership.** A `beforeChange` hook on `products` clears
`autoSaleManaged` whenever `onSale` or `salePercent` changes outside the job. The job
identifies its own writes with `req.context.autoSale = true`, following the existing
`isMediaResync(req)` / `isSnapshotBackfill(req)` pattern in `Products.ts`. Without
this, un-ticking a sale by hand would be silently re-ticked that night — the most
likely way this feature would become annoying.

**Consequence:** a most-viewed product may legitimately not be on sale — excluded, out
of stock, or manually owned. The job does not backfill from #6 to fill the slot. Top-5
means *at most* five. Backfilling would make the sale set jump unpredictably whenever
one item went out of stock.

**Migration required.** A new Payload field needs a generated migration or the
storefront throws `42P01` at runtime. This is an explicit implementation step.

## Selection algorithm

1. **Rank** — distinct `(productId, sessionId)` pairs from the last 7 days via
   `prisma.productViewEvent.groupBy`, folded by `countUniqueViewers()` into
   `{ productId, viewers }` sorted descending. `groupBy` keeps a week of a
   high-write-volume table out of application memory.
2. **Filter** — drop a product if any of:
   - fewer than `AUTO_SALE_MIN_VIEWERS` unique viewers;
   - `available === false`, or zero stock (for variant products, every variant out);
   - present in `AutoSaleSettings.excludedProducts`;
   - `onSale === true` and `autoSaleManaged === false` (a manual sale);
   - `salePercent > AUTO_SALE_PERCENT` (already deeper; applying 10% would raise the
     price).
3. **Take the first `AUTO_SALE_COUNT`** survivors into `toEnable` at
   `AUTO_SALE_PERCENT`. A product already at exactly this state is a no-op and is
   skipped rather than rewritten.
4. **Removal pass** — every product with `autoSaleManaged === true` not in `toEnable`
   goes to `toDisable`: `onSale: false`, `salePercent: null`,
   `autoSaleManaged: false`.

Ties on viewers break by total raw views, then by product id, so plans are
deterministic and tests are not flaky.

`countUniqueViewers` is added alongside `aggregateAttention` in
`lib/analytics/product-metrics.ts` rather than replacing it — `aggregateAttention`
feeds the existing analytics dashboard, where the raw-event count is the correct
metric for the "attention" figure it reports.

## Error handling

- Ranking query or product load throws → abort the run having changed nothing, log the
  error, record the failure in `lastRun`.
- Product updates run one at a time, each in its own try/catch. One failure does not
  abandon the rest; failures are counted into the summary. The next run self-heals,
  since the job reconciles rather than applies a delta.
- **Disables are applied before enables**, so a product leaving the sale set never
  briefly holds both states and the On Sale category churns once per product.
- `enabled === false` short-circuits before any query.

## Observability

`AutoSaleSettings.lastRun` (read-only, written by the job):

- `ranAt` — timestamp
- `enabledCount`, `disabledCount`, `skippedCount`, `errorCount`
- `enabledProducts`, `disabledProducts` — titles, for a human-readable record
- `error` — message when the run aborted

This is how the shop owner sees what the job did without reading container logs.

## Testing

The selector carries the test weight, since it is pure. Table-driven cases in
`lib/__tests__/`:

- below the viewer floor → not eligible
- out of stock / `available === false` → skipped
- in the exclusion list → skipped
- manual sale (`onSale` + `autoSaleManaged === false`) → never enabled, never disabled
- `salePercent` already above the auto rate → skipped
- fewer than five eligible → under-filled set, no backfill
- tie-breaking is deterministic
- removal pass only touches `autoSaleManaged` products
- a product already in the exact target state is a no-op

Plus `countUniqueViewers` units (dedupe across sessions, empty input, single session
with many events) and one hook test: a manual `onSale` edit clears `autoSaleManaged`,
a `req.context.autoSale` edit does not. That hook is what the entire safety story
rests on.

`run.ts` gets no unit test — it is I/O wiring. Verification is a manual run against
the dev database with results checked in the admin panel.

Test files must import `describe` / `it` / `expect` from `vitest` explicitly; this
repo's `tsc --noEmit` breaks on ambient globals.

## Out of scope

- Making count/percent/window admin-configurable.
- Tiered discounts (deeper cut for #1).
- Minimum sale duration or hysteresis — the sale set mirrors the current top-viewed
  list exactly, per the decision to auto-remove immediately.
- Targeting high-attention/low-conversion products instead of raw most-viewed. The
  `computeViewToBuy` signal already exists if this is revisited.
- Coupon or gift-card integration; this feature only drives `onSale` / `salePercent`.

## Risks

- **View data is consent-gated.** If consent rates drop, the ranking narrows to a
  smaller sample. The `MIN_VIEWERS` floor limits the damage.
- **Discounting popular products costs margin** that would have been earned anyway.
  The counter-case is that high-traffic products are the ones a visible discount
  actually converts on. Revisit by comparing revenue per view before and after, using
  the existing analytics dashboard.
- **Price flicker.** With immediate removal, a product hovering near rank 5 can move on
  and off sale on consecutive nights. If this proves irritating in practice, the fix is
  hysteresis (enter at top 5, exit only below top 10), deliberately deferred.
- **Multi-replica deployment** would run the job once per replica. Idempotent, so the
  outcome is correct, but the writes would be duplicated.
