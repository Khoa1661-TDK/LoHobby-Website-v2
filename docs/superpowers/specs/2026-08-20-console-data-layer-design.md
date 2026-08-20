# Admin console data layer — design

**Date:** 2026-08-20
**Status:** approved, ready for an implementation plan

## Problem

The 23 custom admin console screens under `/admin/console` are complete and
verified against their design artboards, but every one renders **module-scope
fixtures**. The console looks finished and is entirely inert: it displays
convincing Vietnamese product names, order codes and revenue figures that come
from nowhere. Anyone opening it could reasonably mistake it for working
software.

This spec covers replacing those fixtures with real reads.

## Scope

**In:** the read path for the 20 screens whose data already exists — lists,
detail views, dashboard metrics, and real counts.

**Out, each needing its own spec:**

- **The crawler subsystem** (3 screens: job launcher, live progress, review
  queue). There is no backend at all — no `lib/crawl*`, no job model, no worker
  protocol. Building it means designing a distributed job system with a desktop
  worker holding Playwright and login cookies. It is a separate project, not
  wiring. These 3 screens keep their fixtures.
- **All writes.** No approve/hide review, no coupon toggle, no order status
  change, no settings save. The existing `app/(payload)/admin/*` pages retain
  those actions until a write pass lands.
- **Filter and pagination interactivity.** Counts and totals will be real; the
  tab strips and pagination controls stay inert this pass.

## Decisions

### Adapter layer in `lib/console/`

A new module per screen area. Each exports a **pure mapper** and thin async
readers:

```ts
// lib/console/orders.ts
export function toOrderRow(doc: Order): OrderRow;              // pure, unit-tested
export async function listOrderRows(): Promise<OrderRow[]>;
export async function getOrderDetail(id: string): Promise<OrderDetail | null>;
```

Modules: `dashboard.ts`, `orders.ts`, `products.ts`, `categories.ts`,
`media.ts`, `customers.ts`, `reviews.ts`, `content.ts`, `marketing.ts`,
`settings.ts`.

**Adapters reuse an existing `lib/` function wherever one exists** — those
modules have already solved this repo's traps, and going around them re-opens
every one. Verified during design: orders, products, categories, coupons, gift
cards, posts and the dashboard metrics all have one.

Three areas have **no** admin-shaped function today — customers, media listing,
and email campaigns. There, the adapter queries Prisma or Payload directly and
`lib/console/` is the correct home for that query. This follows existing
precedent: `app/(payload)/admin/campaigns/page.tsx` already calls
`prisma.emailCampaign.findMany` directly. Payload access uses the same
`getPayload({ config })` form as `lib/payload-orders.ts`.

### Row types stay in `components/console/*/types.ts`

Adapters import them **type-only** (`import type { OrderRow } from
'@/components/console/orders/types'`), which erases at build. This inverts the
usual dependency direction — `lib` referencing `components` — and is accepted
deliberately: the alternative is editing the imports of all 23 screens to gain
nothing at runtime, on components just verified at 96–100% artboard fidelity.
The types are presentation shapes and belong with the presentation.

### Components do not change

`OrderRow.total` is a formatted string (`'450.000 ₫'`), `date` is `'20/08'`,
`payment` is `'paid'`. All formatting happens in the mapper. A page becomes:

```tsx
const rows = await listOrderRows();
return <OrdersList rows={rows} />;
```

### No caching

Console adapters read fresh on every request. `app/(console)/admin/layout.tsx`
already sets `dynamic = 'force-dynamic'`. An operator must never see stale data
immediately after an edit, and this repo has already been bitten by
cross-process writes failing to bust `unstable_cache`. Admin traffic is one
operator, not public load, so the cost is irrelevant.

### The existing Payload admin pages stay

`app/(payload)/admin/{coupons,gift-cards,reviews,orders,analytics,campaigns,catalog-tools}`
duplicate what the console now renders, but they hold the **write** actions the
console will not have this pass. Retiring them would remove working capability.
They are retired only when the console reaches parity, in the write spec.

## Data sources

Every screen is covered by something that already exists. **No new collection,
field, global or migration** — a new Payload field without a generated migration
throws `42P01` at runtime here.

| Screen(s) | Source |
|---|---|
| Dashboard | `lib/analytics/orders.ts` `getOrderAnalyticsSummary(rangeDays)`, `lib/analytics/traffic.ts` `getTrafficBySource`, `lib/analytics/product-metrics.ts` `getProductCtr`, `topSellers` |
| Products list, product editor | `lib/payload-products.ts` `getPayloadProducts({ query, sortKey, limit })`, `getPayloadProductById` |
| Categories | `lib/payload-products.ts` `getPayloadStoreCategories()` |
| Media library | Payload `media` collection + Prisma `MediaFile` — **no existing helper; query directly** |
| Orders list | `lib/payload-orders.ts` `listRecentOrders({ status, limit })` |
| Order detail | `lib/payload-orders.ts` `getPayloadOrderById`, `lib/order-fulfillment-view.ts` |
| Customers | Prisma `User` (+ Payload `StoreCustomers`) — **no existing helper; query directly** |
| Reviews, messages | Prisma `Review`, `ContactMessage` |
| Pages, post editor, redirects | Payload `Pages`, `Posts`, `Redirects` |
| Coupons | `lib/coupons.ts` `listCouponsForAdmin(limit = 100)` |
| Gift cards | `lib/gift-cards.ts` `listGiftCardsForAdmin(limit = 100)` |
| Email campaigns | Prisma `EmailCampaign` — **no existing helper; query directly, as the campaigns admin page does** |
| Auto-sale | `AutoSaleSettings` Payload global |
| Settings | Payload globals (`StoreSettings`, `ShippingSettings`, `NotificationSettings`) |

## Repo traps every adapter must respect

These have each broken production or a build here:

- **No character-class regex in `lib/`.** Tailwind scans `lib/`, and a regex with
  square brackets there has destroyed the entire stylesheet and 500'd every page.
  Money and date formatting use `Intl` or the existing `formatVnd` from
  `lib/analytics/currency.ts` — never a hand-rolled regex.
- **`@payload-config` is safe here, conditionally.** `lib/payload-orders.ts`
  already top-level imports it. The actual rule: a module that does so must never
  be reachable from a `src/payload/collections/*` or `globals/*` file, or every
  Payload route TDZ-crashes with "Cannot access 'j' before initialization". No
  collection may import from `lib/console/`.
- **Payload `join` fields return bare ids at `depth: 0`.** Variant stock is
  unreadable without `depth: 1`, so out-of-stock checks fail open.
- **Payload relationship ids are numeric** (`defaultIDType = number`). Never
  write a `String()` id.
- **Tests must `import { describe, it, expect } from 'vitest'`** — `globals: true`
  is runtime-only and `tsc --noEmit` fails without it. Tests live in
  `lib/__tests__/`; a test outside the configured globs is silently skipped.

## Testing

The mapper is the seam. `toOrderRow(doc)` is pure, so it is tested against
fixture documents with no database, covering the failure paths that actually
occur: an unresolved relationship (bare id instead of an object), a null total,
an unknown status value, and an empty list. The async `list*` readers are thin
pass-throughs and are not unit-tested.

## Delegation

Three reference adapters are written by hand first, one per source kind —
`orders.ts` (Payload collection), `reviews.ts` (Prisma model), `settings.ts`
(Payload global). That is where the judgement sits: join depth, null handling,
and the traps above.

The remaining seven modules are delegated to the local model, **one screen area
per task**, following the reference pattern. One area per task is not a
preference: measured across the 23 UI screens, every single-subject spec scored
96–100% fidelity while every second subject inside a shared spec degraded, down
to 14% in the worst case, because the harness compacted and the model
reconstructed from surrounding files.

Each delegated task is verified by `tsc --noEmit` plus its mapper tests, and
then by a build.

## Success criteria

- No `components/console/**` file contains fixture data; every screen's data
  arrives as props from a `lib/console/` reader.
- The 3 crawler screens still render fixtures, explicitly marked as such.
- `node_modules/.bin/tsc --noEmit` and `next build` both pass.
- Mapper tests cover the failure paths for all 10 modules.
- Opening `/admin/console` against the real database shows real products,
  orders, customers and revenue.
