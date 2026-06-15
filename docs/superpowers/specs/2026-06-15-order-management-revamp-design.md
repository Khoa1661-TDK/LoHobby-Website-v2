# Order Management Revamp — Design

**Date:** 2026-06-15
**Status:** Approved (design); pending implementation plan
**Approach:** A — derived stage + guarded transitions, **no schema migration**

## Problem

Order management is hard for a non-technical shop owner to operate:

- **Four overlapping status vocabularies.** The owner must mentally combine `paymentStatus`
  (pending/paid/failed/refunded), `orderStatus` (pending/processing/shipped/delivered/canceled),
  `shipmentStatus` (awaiting_pickup…delivered/failed), plus a code-only derived
  `StorefrontOrderStatus` (PENDING_COD, PENDING_ONLINE, PENDING_TRANSFER, …).
- **Two competing admin screens.** A raw Payload collection table (`/admin/collections/orders`)
  with free dropdowns, and a custom fulfillment dashboard (`/admin/orders`). The raw table lets a
  user set nonsensical combinations (e.g. `shipped` while payment is `pending`) and shows raw
  uppercase tokens like `PENDING_TRANSFER`.
- **The state machine leaks.** The custom dashboard is action-driven for the happy path
  (Confirm → Ship → Sync) but punts pickup completion and manual "mark paid" back to the raw
  collection, and has no friendly path for cancel / refund / failed payment.

The root cause is that the **interface to the state** asks the owner to *pick states* rather than
*take actions*. Storing payment and fulfillment as separate axes is correct and standard; the fix is
a clean derived lifecycle plus guarded, action-driven transitions — not a storage migration.

## Goals

- One canonical order lifecycle, surfaced as a single plain-language stage everywhere.
- The owner takes **actions**; the system computes the resulting stage and only offers valid actions.
- One order-management screen. The raw collection becomes read-only for status.
- Vietnamese-only admin UI. Built as a resale template — self-explanatory, zero training.

## Non-Goals (v1, YAGNI)

Partial fulfillment, partial refunds, multiple packages/carriers per order, editing line items,
bilingual admin, order creation from admin.

## Audience & Constraints

- **Audience:** resale template shipped to many Vietnamese shop owners; all non-technical.
- **Stack untouched:** PayOS webhook, carrier tracking sync, inventory sync hook, Zalo new-order
  notification all keep firing on the same underlying fields.

---

## The Lifecycle

Single canonical stage ("where is this order"):

```
Awaiting payment ──mark_paid/webhook──> To confirm ──confirm──> Packing ──ship──> Shipped ──sync/mark_delivered──> Delivered
```

Branch / end states reachable from active stages:

- **Cancelled** — `cancel` from any active stage **including Shipped**. Releases reserved stock.
  If the order was paid, refunding the money is a separate `refund` action.
- **Refunded** — `refund` from any paid order, including after Delivered. Full refund only. Terminal.
- **Payment failed** — gateway reports failure on an online order. Owner may `cancel` from here.

Variants:

- **COD orders** start at **To confirm** (no upfront payment). Reaching **Delivered** also marks them
  paid automatically (money collected on delivery).
- **Pickup orders** (`deliveryMethod=PICKUP`) skip Ship: the **Packing** stage offers
  `mark_delivered` ("handed to customer") straight to **Delivered**.

```
OrderStage =
  | 'awaiting_payment'
  | 'to_confirm'
  | 'packing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded'
  | 'payment_failed'
```

---

## Architecture

### Unit 1 — `lib/order-stage.ts` (pure)

The single source of truth for display state. No I/O.

- `deriveOrderStage(order): OrderStage` — computes the stage from existing fields:
  `paymentStatus`, `orderStatus`, `paymentKind`, `confirmedAt`, `deliveryMethod`,
  `trackingNumber`, `shipmentStatus`.
- `STAGE_LABELS: Record<OrderStage, string>` — Vietnamese labels.
- `STAGE_BADGE: Record<OrderStage, string>` — badge color classes.
- `stageToTab(stage): 'needs_action' | 'in_transit' | 'completed' | 'cancelled_refunded'`.

**Replaces:** `mapPayloadOrderToStorefrontStatus`, `isOrderNeedingFulfillment`, and the inline tab
filter logic in `app/(payload)/admin/orders/page.tsx`.

### Unit 2 — `lib/order-transitions.ts` (guarded state machine)

Every state change in the app routes through this module.

- `OrderAction = 'mark_paid' | 'confirm' | 'ship' | 'sync_tracking' | 'mark_delivered' | 'cancel' | 'refund'`
- `availableActions(order): OrderAction[]` — pure; given the derived stage, returns only the valid
  actions. Drives which buttons render.
- `applyAction(payload, order, action, input)` — validates the transition is legal (guard fails →
  `{ ok: false, message }` in Vietnamese), re-derives from a fresh doc to avoid acting on a stale
  stage, then writes the correct field combination + timestamp.

Action → field-write mapping:

| Action | Allowed from | Writes |
|---|---|---|
| `mark_paid` | awaiting_payment, to_confirm, payment_failed | `paymentStatus=paid` (+`paidAt`) |
| `confirm` | to_confirm | `confirmedAt`, `orderStatus=processing` |
| `ship` | packing | carrier + tracking fields, `orderStatus=shipped`, `shippedAt` |
| `sync_tracking` | shipped | carrier API → `shipmentStatus` / `shipmentEvents`; auto-delivers when carrier reports delivered |
| `mark_delivered` | shipped (manual fallback), packing (pickup) | `orderStatus=delivered`, `deliveredAt`; **COD → also `paymentStatus=paid`** |
| `cancel` | any active stage incl. shipped | `orderStatus=canceled` (existing inventory hook releases stock) |
| `refund` | any paid order incl. delivered | `paymentStatus=refunded` |

Guards make illegal states (e.g. `shipped` + `unpaid`, refunding an unpaid order, shipping before
confirm) impossible. Existing hooks remain the mechanism for side effects:
`normalizeOrderPaymentOnChange` (beforeChange), inventory sync + Zalo notify (afterChange).

### Unit 3 — The screen (`app/(payload)/admin/orders/`)

- `page.tsx`: single page, **card grid** (layout A), tabs from `stageToTab()` with live counts
  (Cần xử lý / Đang giao / Đã giao / Hủy-Hoàn).
- Each card: order code, customer, time, total, **one** stage badge, item summary, ship-to address,
  and an `<OrderActions>` component rendering the **single primary action** from `availableActions`
  plus secondaries (`Hủy`, etc.) in a `⋯` menu.
- Card click opens a **detail drawer**: timeline (built from timestamps + `shipmentEvents`),
  read-only line items, and the carrier/tracking ship form.
- `actions.ts`: collapses to one server action `runOrderAction(docId, action, input)` → `applyAction`.

**Replaces:** `confirmOrderAction`, `assignShipmentAction`, `updateOrderStatus`, and the
`/api/admin/orders/[docId]/{confirm,ship,mark-paid}` routes. The carrier `sync` route and the PayOS
webhook are unchanged.

### Unit 4 — Lock the raw collection + align storefront

- `src/payload/collections/Orders.ts`: set `paymentStatus` and `orderStatus` to
  `admin.readOnly: true`; replace the `fulfillmentPanel` UI field with a read-only derived-stage
  display + a link to `/admin/orders`. Update the collection `description`. Status can now only
  change through guarded actions — invalid combinations cannot be hand-entered.
- Storefront (`app/[locale]/(storefront)/profile/orders*`): show the customer-facing status via
  `deriveOrderStage` so owner and customer share one vocabulary.
- Delete the free-dropdown `status-select.tsx` (the "pick a state" anti-pattern) — **verify all
  usages first** before removal.

---

## Error Handling

- Guard violations return `{ ok: false, message }` (Vietnamese) surfaced as a `sonner` toast.
- `applyAction` re-derives the stage from a freshly fetched doc before writing, preventing actions
  on a stale view (two admins, or a webhook that landed since page load).
- Carrier sync failures use the existing handling (non-blocking, logged).

## Testing

- **Unit, table-driven:** `deriveOrderStage` — every field combination → expected stage, including
  COD and pickup variants. `availableActions` — every stage → exact valid action set.
- **Unit, guards:** `applyAction` rejects illegal transitions; COD `mark_delivered` also sets paid;
  `cancel` triggers stock release; `refund` requires a paid order.
- **Integration:** one `runOrderAction` round-trip through Payload (real test DB).

## Migration / Compatibility

No DB migration. Existing orders render correctly because `deriveOrderStage` reads the fields they
already have. Webhooks and hooks continue writing the same fields; they now share the lifecycle's
guard semantics only when changes flow through the admin actions (webhooks remain authoritative for
gateway payment state).
