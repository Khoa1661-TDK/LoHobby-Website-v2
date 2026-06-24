# Customer Self-Cancel (Unshipped Orders) — Design

Date: 2026-06-24
Status: Approved (design); pending implementation plan

## Goal

Let a logged-in customer cancel their own order from the order tracking page in
their profile, but only while the order has not yet shipped, capturing a
cancellation reason for seller insight.

## Context / Existing State

- Order tracking page: `app/[locale]/(storefront)/profile/orders/[orderCode]/page.tsx`.
  It already does an ownership check:
  `meta?.prismaUserId === session.user.id ||
   order.buyerEmail?.toLowerCase() === session.user.email?.toLowerCase()`.
  It renders `ReorderButton` at the bottom.
- Client action pattern: `profile/orders/[orderCode]/reorder-button.tsx`
  (`'use client'`, `useTransition`, `toast` from sonner, `router.refresh()`,
  i18n via `useTranslations('profile')`).
- Server actions: `app/[locale]/(storefront)/profile/actions.ts`.
- Cancellation logic: `cancelOrder(docId)` in `lib/order-fulfillment.ts` — sets
  `orderStatus: 'canceled'`. Inventory is restocked automatically by the existing
  `syncOrderInventoryOnStatusChange` afterChange hook on the Orders collection.
  `cancelOrder` already rejects already-canceled and delivered orders.
- Dialog pattern: `components/cart/modal.tsx` (Headless UI). There is no
  `components/ui` primitive set despite the CLAUDE.md mention.
- Orders collection: `src/payload/collections/Orders.ts` has `orderStatus`
  (select: pending/processing/shipped/delivered/canceled), `paymentStatus`
  (pending/paid/failed/refunded), and a `metadata` JSON field.
- i18n messages: `messages/vi.json`, `messages/en.json` (next-intl).

## Decisions

- **Cancelable rule:** a customer may cancel only their own order whose
  `orderStatus` is `pending` or `processing` (not yet shipped, delivered, or
  canceled). Enforced server-side; the button renders only when the rule holds.
- **Paid-order handling:** when a paid online order is canceled, set
  `orderStatus: 'canceled'` (restock via hook) but **leave `paymentStatus: 'paid'`**.
  The `canceled + paid` state is the seller's "needs refund" signal and keeps the
  existing `refundOrder` action usable (it requires `paymentStatus === 'paid'`).
  The customer is shown a note that the shop will process the refund. Immediately
  setting `refunded` is rejected — it would imply money moved and block the real
  refund flow.
- **Reason capture:** dedicated fields on the Orders collection (better admin
  insight than burying in `metadata`), readOnly in admin. Requires a migration.

## Components

- `src/payload/collections/Orders.ts` — add a field group:
  - `cancellationReason` (select; readOnly; options: changed_mind /
    ordered_by_mistake / found_better_price / delivery_too_slow / other).
  - `cancellationNote` (textarea; readOnly; optional free text).
  Generate a Payload migration for the new columns.
- `app/[locale]/(storefront)/profile/actions.ts` — new server action
  `cancelOrderAction(orderId: string, reason: string, note?: string)`:
  1. `auth()`; if not logged in → error/redirect.
  2. Load the order; verify ownership with the existing pattern.
  3. Guard `orderStatus ∈ {pending, processing}`; otherwise return a localized
     error (covers shipped/delivered/canceled and the race where status changed).
  4. Validate `reason` against the allowed set.
  5. Persist `cancellationReason` + `cancellationNote`, then call
     `cancelOrder(docId)`.
  6. Return `{ ok: true }` or `{ ok: false, error }`.
- `profile/orders/[orderCode]/cancel-order-button.tsx` *(new client component)* —
  follows the `reorder-button.tsx` pattern. A button opens a small dialog
  (Headless UI, like `cart/modal.tsx`) containing the reason picker (radio/select)
  + optional note textarea + confirm/cancel. On confirm: `cancelOrderAction`,
  then `toast` + `router.refresh()`.
- `profile/orders/[orderCode]/page.tsx` — render the cancel button next to
  `ReorderButton`, only when the cancelable rule holds for the (already
  ownership-checked) order.
- `messages/vi.json` + `messages/en.json` — `profile` namespace strings: cancel
  button label, dialog title/body, reason option labels, note placeholder,
  paid-refund note, success/error toasts.

## Data Flow

Customer clicks Cancel → dialog collects reason (+ note) → `cancelOrderAction` →
ownership + state guard → persist reason → `cancelOrder(docId)` sets
`orderStatus: 'canceled'` → afterChange hook restocks inventory → action returns
ok → client `toast.success` + `router.refresh()` re-renders the page in the
canceled state. Paid orders keep `paymentStatus: 'paid'` for the seller's refund.

## Error Handling

- Not logged in → redirect to `/login`.
- Not the owner → generic not-found / forbidden (no detail leak), matching the
  page's existing `notFound()` behavior.
- Order already shipped/delivered/canceled (incl. race) → localized error via
  `toast.error`.
- Invalid reason value → localized error.

## Testing

`cancelOrderAction` unit tests (mock payload + `cancelOrder`):
- Rejects when the order is not owned by the session user.
- Rejects when `orderStatus` is `shipped`, `delivered`, or `canceled`.
- Rejects an invalid reason value.
- On a valid `pending`/`processing` owned order: persists the reason, calls
  `cancelOrder`, returns ok.
- A paid order keeps `paymentStatus: 'paid'` after cancel.

## Out of Scope (v1)

- Automatic/real refund money movement (seller settles out-of-band via the
  existing refund action).
- Customer-initiated cancellation after shipping (return/RMA flow).
- Partial cancellation (per-line-item).
