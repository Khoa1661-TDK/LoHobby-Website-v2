# Spotlight Block — Manual / Automatic Source — Design

**Date:** 2026-07-29
**Status:** Approved, implementing inline

## Problem

The Spotlight block is a hand-curated deal carousel: an admin picks each product and
types each slide. Meanwhile the nightly auto-sale job
(`docs/superpowers/specs/2026-07-26-auto-sale-most-viewed-design.md`) discounts five
products a night, and those discounts never reach the block unless someone edits the
page. The shop's most prominent deal surface is the one place the automation doesn't
touch.

## Goal

A source selector on the block: keep curating by hand, or let the carousel fill itself
from whatever is currently on sale.

## The control

New field `source` on the Spotlight block — a radio, first field in the block:

| Value | Label | Behaviour |
|---|---|---|
| `manual` | Manual | Existing `deals` array, unchanged. The default. |
| `auto` | Automatic | Slides derived from on-sale products; `deals` hidden. |

`eyebrow`, `autoplay`, `autoplaySeconds` and the shared appearance fields apply to both
modes. The `deals` array is gated with `admin.condition: (_, siblingData) =>
siblingData?.source === 'manual'`.

The equality form (`=== 'manual'`) rather than the negated form (`!== 'auto'`) is
deliberate — see "Visual builder" below.

## Where auto slides come from

New cached helper in `lib/payload-products.ts`:

```
getPayloadOnSaleProducts(limit = SPOTLIGHT_AUTO_LIMIT): Promise<Product[]>

where: and[ onSale = true, salePercent > 0 ]
sort:  ['-salePercent', '-updatedAt']
limit: 6
```

**Source set: every on-sale product.** The five the nightly job picked and anything
discounted by hand, ranked together. The block deliberately does not read
`autoSaleManaged` — "on sale" is the shopper-visible fact, and a carousel that showed
only the job's picks would hide a hand-set seasonal discount.
(User decision, 2026-07-29.)

**`salePercent > 0` is load-bearing.** `computeSalePrice` treats a zero or missing
percent as not discounted, so a product with `onSale` ticked but no percent renders
with no strike-through price and no `-X%` badge — a slide with nothing to say.
Excluding it in the query is cleaner than dropping it after rendering.

**Order: deepest discount first**, ties broken by most recently updated. The first
slide is the one most shoppers see, so it should carry the strongest offer.
Sorting by "most recently discounted" was rejected: there is no sale-start timestamp,
and `updatedAt` is bumped by any edit, so fixing a typo would push a stale sale back to
slide one. Sorting by views was rejected: it costs a Prisma query on a render path and
makes the order drift with traffic.
(User decision, 2026-07-29.)

**Cap: 6.** The job puts five on sale, so six covers its set plus roughly one hand-set
discount. Past about six slides a carousel stops being rotated through.
(User decision, 2026-07-29.)

**Caching.** The helper uses `unstable_cache` with the existing catalog tags, so it
follows the same invalidation as every other catalog read. The nightly job's writes do
*not* reliably bust it — the job runs without a request scope, so the `afterChange`
hook's `revalidateTag` throws and is swallowed. A new sale therefore surfaces within
the 60-second `CATALOG_REVALIDATE` TTL rather than instantly. Acceptable for a nightly
job; documented so the delay isn't later mistaken for a bug.

## Rendering

In auto mode the server builds a synthetic deal list of bare product references —
`{ product: id }` and nothing else — and passes it to the existing `renderSlide`
unchanged.

Every fallback already in `renderSlide` then does the work: heading from the product
title, description from its description, price from the product, the `-X%` badge
computed from the now-vs-was gap, CTA defaulting to `/product/{handle}`. No new layout
code, and the two modes cannot drift apart visually — which is the main reason for
synthesising deals rather than writing a second renderer.

With no per-deal `targetDate`, auto slides carry no countdown. A single shared
countdown across different products was rejected: it would imply every sale ends at the
same moment, which is false.
(User decision, 2026-07-29.)

Auto mode ignores any `deals` rows left behind by switching modes — the array is not
cleared on switch, so flipping back to Manual restores the previous curation intact.

## Empty state

When nothing is on sale, no slides are produced and the block returns `null`,
disappearing from the page. This is the block's existing behaviour for "no usable
slides", not new logic. An empty deal carousel is worse than no deal carousel.
(User decision, 2026-07-29.)

## Visual builder

`lib/page-builder/block-schemas.ts` recovers Payload `admin.condition` functions by
probing them against a **hardcoded list of candidate field names** — currently
`background`, `containerWidth`, and `kind`. A condition on any other field is not
recovered and the field falls back to always-visible.

So `source` must be added to that probe list, or Payload's admin would hide the `deals`
array correctly while the custom `/build` panel kept showing it.

The probe requires `fn({}, { source: 'manual' })` to be true *and* `fn({}, {})` to be
false. The negated condition `siblingData?.source !== 'auto'` returns true for empty
sibling data and would not be recovered — hence the equality form, which in turn
requires every existing row to actually carry `'manual'`.

Nothing else in the builder needs touching: field descriptors derive from the Block
definition, so the panel and the AI assistant's block contract update themselves.

## Migration

One enum column `source` on the spotlight block table, backfilled to `'manual'` for
every existing row. The backfill is required by the equality condition above, and by
`createDefaultBlock` only applying defaults to newly created blocks.

`migrate:create` prompts per enum and bundles unrelated `DROP`s against a stale DB; the
output is hand-trimmed to the spotlight column alone.

## Testing

Extending `components/blocks/__tests__/spotlight.test.tsx`:

- auto mode renders slides from the on-sale query
- manual mode is unchanged by the new field
- a legacy row with `source` absent behaves as manual
- auto mode with nothing on sale renders nothing
- auto mode ignores a leftover `deals` array

Plus unit coverage on `getPayloadOnSaleProducts`: ordering by discount depth,
respecting the cap, and excluding `onSale` rows with no percent.

Test files must import `describe` / `it` / `expect` from `vitest` explicitly; this
repo's `tsc --noEmit` breaks on ambient globals.

## Out of scope

- Countdown timers on auto slides.
- Blending manual deals with auto ones in a single carousel.
- Sourcing only `autoSaleManaged` products.
- Making the cap or the ordering admin-configurable.
