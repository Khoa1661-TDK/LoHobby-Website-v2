# Order Management Revamp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the four overlapping order-status vocabularies and two competing admin screens with one canonical derived lifecycle and one action-driven order-management screen, so a non-technical Vietnamese shop owner takes actions instead of picking states.

**Architecture:** Approach A — no schema migration. A pure `deriveOrderStage()` becomes the single source of display truth; a guarded transitions module exposes `availableActions()` (pure) and `applyOrderAction()` (dispatcher) that reuse the existing, battle-tested `lib/order-fulfillment.ts` functions (which already work around a Payload `getPayload()` deadlock via direct SQL for mark-paid) plus three new operations (cancel, refund, manual deliver). The custom `/admin/orders` dashboard becomes the one screen; the raw Payload collection's status fields go read-only.

**Tech Stack:** Next.js 15 App Router, Payload CMS 3.x (Postgres), TypeScript (strict), Vitest, Tailwind 4, sonner toasts. Run binaries directly: `node_modules/.bin/vitest`, `node_modules/.bin/tsc` (the `pnpm <script>` wrapper fails on this machine — see memory `pnpm-run-deps-check-bypass`).

**Branch:** `feature/order-management-revamp` (already created; the design doc commit `a9d784b` is its first commit).

---

## Background facts (verified 2026-06-15 — do not re-derive)

| Fact | Detail |
|---|---|
| Input view type | `OrderFulfillmentView` in `lib/order-fulfillment-view.ts` carries every field the lifecycle needs: `paymentStatus`, `orderStatus`, `paymentKind`, `confirmedAt`, `deliveryMethod`, `trackingNumber`, `shipmentStatus`, `shippedAt`, `deliveredAt`, `shippingCarrierKey/Label`, `trackingUrl`, `shipmentEvents`, `paidAt`, totals, customer. |
| Existing fulfillment fns | `lib/order-fulfillment.ts` exports `markOrderAsPaid` (uses **direct SQL** to dodge a CMS-open deadlock — reuse, do NOT reimplement), `confirmOrder`, `assignShipment`, `syncOrderShipment`. All return `FulfillmentResult = {ok:true; order} \| {ok:false; message}`. |
| Existing guards | `lib/order-fulfillment-eligibility.ts` exports `isOrderConfirmable`. Keep and reuse. |
| Dead code | `app/(payload)/admin/orders/status-select.tsx` (`OrderStatusSelect`) and `app/(payload)/admin/orders/actions.ts` (`updateOrderStatus`) are referenced ONLY by each other — no page renders them. `mapStorefrontStatusToPayloadFields` (in `lib/payload-order-storefront.ts`) is used only by `updateOrderStatus`. All three are removable in Task 8. |
| Keep intact | `mapPayloadOrderToStorefrontStatus` is load-bearing for `app/api/orders/[orderCode]/route.ts`, `checkout/success`, `checkout/cancel` — do NOT touch it. |
| Profile mapping | `lib/profile-orders.ts` has its own `mapStatus()` → `ProfileOrderStatus` (`PENDING \| PENDING_COD \| PENDING_ONLINE \| PAID \| SHIPPED \| DELIVERED \| CANCELLED`). Task 7 reroutes it through the canonical stage. |
| Hooks (untouched) | `Orders.ts` hooks `normalizeOrderPaymentOnChange` (beforeChange), `syncOrderInventoryOnStatusChange` + `notifySellerOnNewOrder` (afterChange) keep firing on the same fields. Cancel/refund inventory side-effects flow through `syncOrderInventoryOnStatusChange`. |
| Test convention | `lib/__tests__/*.test.ts`, `import { describe, expect, it } from 'vitest'`, path alias `@/`. Run: `node_modules/.bin/vitest run <path>`. |
| Carriers | `lib/shipment/carriers.ts` exports `SHIPMENT_CARRIERS`, `getShipmentCarrier`, `carrierLabel`. |

---

## File Structure

**Create:**
- `lib/order-stage.ts` — canonical `OrderStage`, `deriveOrderStage`, labels, badges, `stageToTab`.
- `lib/__tests__/order-stage.test.ts`
- `lib/order-transitions.ts` — `OrderAction`, pure predicates, `availableActions`, `applyOrderAction`.
- `lib/__tests__/order-transitions.test.ts`
- `app/(payload)/admin/orders/order-actions.tsx` — client component: primary action button + secondary buttons + ship form.

(The design's separate detail-drawer modal is folded into richer cards in Task 7 — line items + tracking timeline render inline. A standalone `order-detail-drawer.tsx` is a deferred, additive follow-up, not built in v1. See Self-Review Notes.)

**Modify:**
- `lib/order-fulfillment.ts` — add `cancelOrder`, `refundOrder`, `markOrderDelivered`.
- `lib/order-fulfillment-view.ts` — add `lineItems` to `OrderFulfillmentView` for the drawer.
- `app/(payload)/admin/orders/actions.ts` — replace `updateOrderStatus` with `runOrderAction` (Task 8 deletes the old export).
- `app/(payload)/admin/orders/page.tsx` — rebuild on `deriveOrderStage` + `stageToTab`; render `OrderActions`.
- `lib/profile-orders.ts` — `mapStatus` derives from canonical stage.
- `src/payload/collections/Orders.ts` — `paymentStatus`/`orderStatus` read-only; `fulfillmentPanel` shows derived stage; new description.

**Delete (Task 8):**
- `app/(payload)/admin/orders/status-select.tsx`
- `updateOrderStatus` from `actions.ts`; `mapStorefrontStatusToPayloadFields` from `lib/payload-order-storefront.ts`.

---

## Task 1: Canonical order stage (pure)

**Files:**
- Create: `lib/order-stage.ts`
- Test: `lib/__tests__/order-stage.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// lib/__tests__/order-stage.test.ts
import { describe, expect, it } from 'vitest';
import { deriveOrderStage, stageToTab, type OrderStageInput } from '@/lib/order-stage';

function order(partial: Partial<OrderStageInput>): OrderStageInput {
  return {
    paymentStatus: 'pending',
    orderStatus: 'pending',
    paymentKind: null,
    confirmedAt: null,
    deliveryMethod: 'SHIPMENT',
    ...partial,
  };
}

describe('deriveOrderStage', () => {
  it('returns cancelled when order is canceled regardless of payment', () => {
    expect(deriveOrderStage(order({ orderStatus: 'canceled', paymentStatus: 'paid' }))).toBe('cancelled');
  });

  it('returns refunded when payment is refunded', () => {
    expect(deriveOrderStage(order({ paymentStatus: 'refunded', orderStatus: 'delivered' }))).toBe('refunded');
  });

  it('returns delivered when order is delivered', () => {
    expect(deriveOrderStage(order({ orderStatus: 'delivered', paymentStatus: 'paid' }))).toBe('delivered');
  });

  it('returns shipped when order is shipped', () => {
    expect(deriveOrderStage(order({ orderStatus: 'shipped', paymentStatus: 'paid' }))).toBe('shipped');
  });

  it('returns payment_failed for a failed online order not yet shipped', () => {
    expect(deriveOrderStage(order({ paymentStatus: 'failed', paymentKind: 'gateway' }))).toBe('payment_failed');
  });

  it('returns packing once confirmed but not yet shipped', () => {
    expect(deriveOrderStage(order({ paymentStatus: 'paid', confirmedAt: '2026-06-15T00:00:00Z' }))).toBe('packing');
  });

  it('returns to_confirm for a paid-but-unconfirmed order', () => {
    expect(deriveOrderStage(order({ paymentStatus: 'paid' }))).toBe('to_confirm');
  });

  it('returns to_confirm for an unconfirmed COD order', () => {
    expect(deriveOrderStage(order({ paymentKind: 'cod' }))).toBe('to_confirm');
  });

  it('returns to_confirm for an unconfirmed manual_transfer order', () => {
    expect(deriveOrderStage(order({ paymentKind: 'manual_transfer' }))).toBe('to_confirm');
  });

  it('returns awaiting_payment for an unpaid gateway order', () => {
    expect(deriveOrderStage(order({ paymentKind: 'gateway' }))).toBe('awaiting_payment');
  });
});

describe('stageToTab', () => {
  it('groups action-needing stages into needs_action', () => {
    expect(stageToTab('awaiting_payment')).toBe('needs_action');
    expect(stageToTab('to_confirm')).toBe('needs_action');
    expect(stageToTab('packing')).toBe('needs_action');
    expect(stageToTab('payment_failed')).toBe('needs_action');
  });

  it('groups shipped into in_transit and delivered into completed', () => {
    expect(stageToTab('shipped')).toBe('in_transit');
    expect(stageToTab('delivered')).toBe('completed');
  });

  it('groups terminal cancel/refund into cancelled_refunded', () => {
    expect(stageToTab('cancelled')).toBe('cancelled_refunded');
    expect(stageToTab('refunded')).toBe('cancelled_refunded');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node_modules/.bin/vitest run lib/__tests__/order-stage.test.ts`
Expected: FAIL — cannot resolve `@/lib/order-stage`.

- [ ] **Step 3: Write the implementation**

```typescript
// lib/order-stage.ts — single canonical order lifecycle stage (pure, no I/O)

export type OrderStage =
  | 'awaiting_payment'
  | 'to_confirm'
  | 'packing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded'
  | 'payment_failed';

export type OrderStageInput = {
  paymentStatus?: string | null;
  orderStatus?: string | null;
  paymentKind?: string | null;
  confirmedAt?: string | null;
  deliveryMethod?: string | null;
};

/** The one function that decides "where is this order". Used by admin + storefront. */
export function deriveOrderStage(o: OrderStageInput): OrderStage {
  if (o.orderStatus === 'canceled') return 'cancelled';
  if (o.paymentStatus === 'refunded') return 'refunded';
  if (o.orderStatus === 'delivered') return 'delivered';
  if (o.orderStatus === 'shipped') return 'shipped';
  if (o.paymentStatus === 'failed') return 'payment_failed';
  if (o.confirmedAt) return 'packing';
  if (o.paymentStatus === 'paid') return 'to_confirm';
  if (o.paymentKind === 'cod' || o.paymentKind === 'manual_transfer') return 'to_confirm';
  return 'awaiting_payment';
}

export const STAGE_LABELS: Record<OrderStage, string> = {
  awaiting_payment: 'Chờ thanh toán',
  to_confirm: 'Cần xác nhận',
  packing: 'Đang chuẩn bị',
  shipped: 'Đang giao',
  delivered: 'Đã giao',
  cancelled: 'Đã hủy',
  refunded: 'Đã hoàn tiền',
  payment_failed: 'Thanh toán lỗi',
};

export const STAGE_BADGE: Record<OrderStage, string> = {
  awaiting_payment: 'bg-amber-100 text-amber-800 ring-amber-200',
  to_confirm: 'bg-indigo-100 text-indigo-800 ring-indigo-200',
  packing: 'bg-yellow-100 text-yellow-800 ring-yellow-200',
  shipped: 'bg-sky-100 text-sky-800 ring-sky-200',
  delivered: 'bg-teal-100 text-teal-800 ring-teal-200',
  cancelled: 'bg-rose-100 text-rose-800 ring-rose-200',
  refunded: 'bg-orange-100 text-orange-800 ring-orange-200',
  payment_failed: 'bg-rose-100 text-rose-800 ring-rose-200',
};

export type OrderTab = 'needs_action' | 'in_transit' | 'completed' | 'cancelled_refunded';

export function stageToTab(stage: OrderStage): OrderTab {
  switch (stage) {
    case 'shipped':
      return 'in_transit';
    case 'delivered':
      return 'completed';
    case 'cancelled':
    case 'refunded':
      return 'cancelled_refunded';
    default:
      return 'needs_action';
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node_modules/.bin/vitest run lib/__tests__/order-stage.test.ts`
Expected: PASS — all assertions green.

- [ ] **Step 5: Commit**

```bash
git add lib/order-stage.ts lib/__tests__/order-stage.test.ts
git commit -m "feat(orders): add canonical deriveOrderStage lifecycle"
```

---

## Task 2: Guarded transitions — pure predicates + availableActions

**Files:**
- Create: `lib/order-transitions.ts`
- Test: `lib/__tests__/order-transitions.test.ts`

This task adds ONLY the pure parts (action set per stage). The async dispatcher lands in Task 4.

- [ ] **Step 1: Write the failing test**

```typescript
// lib/__tests__/order-transitions.test.ts
import { describe, expect, it } from 'vitest';
import { availableActions, type TransitionInput } from '@/lib/order-transitions';

function order(partial: Partial<TransitionInput>): TransitionInput {
  return {
    paymentStatus: 'pending',
    orderStatus: 'pending',
    paymentKind: null,
    confirmedAt: null,
    deliveryMethod: 'SHIPMENT',
    trackingNumber: null,
    shipmentStatus: null,
    ...partial,
  };
}

describe('availableActions', () => {
  it('awaiting_payment offers mark_paid then cancel', () => {
    expect(availableActions(order({ paymentKind: 'gateway' }))).toEqual(['mark_paid', 'cancel']);
  });

  it('to_confirm (COD, unpaid) offers confirm, mark_paid, cancel', () => {
    expect(availableActions(order({ paymentKind: 'cod' }))).toEqual(['confirm', 'mark_paid', 'cancel']);
  });

  it('to_confirm (already paid) hides mark_paid', () => {
    expect(availableActions(order({ paymentStatus: 'paid' }))).toEqual(['confirm', 'cancel']);
  });

  it('packing (shipment) offers ship then cancel', () => {
    expect(availableActions(order({ paymentStatus: 'paid', confirmedAt: 'x' }))).toEqual(['ship', 'cancel']);
  });

  it('packing (pickup) offers mark_delivered instead of ship', () => {
    expect(
      availableActions(order({ paymentStatus: 'paid', confirmedAt: 'x', deliveryMethod: 'PICKUP' })),
    ).toEqual(['mark_delivered', 'cancel']);
  });

  it('shipped (prepaid) offers sync, mark_delivered, refund, cancel', () => {
    expect(
      availableActions(order({ paymentStatus: 'paid', orderStatus: 'shipped', trackingNumber: 'T1' })),
    ).toEqual(['sync_tracking', 'mark_delivered', 'refund', 'cancel']);
  });

  it('shipped (COD, unpaid) omits refund', () => {
    expect(
      availableActions(order({ paymentKind: 'cod', orderStatus: 'shipped', trackingNumber: 'T1' })),
    ).toEqual(['sync_tracking', 'mark_delivered', 'cancel']);
  });

  it('delivered (paid) offers only refund', () => {
    expect(availableActions(order({ paymentStatus: 'paid', orderStatus: 'delivered' }))).toEqual(['refund']);
  });

  it('payment_failed offers mark_paid and cancel', () => {
    expect(availableActions(order({ paymentStatus: 'failed', paymentKind: 'gateway' }))).toEqual(['mark_paid', 'cancel']);
  });

  it('terminal stages offer nothing', () => {
    expect(availableActions(order({ orderStatus: 'canceled' }))).toEqual([]);
    expect(availableActions(order({ paymentStatus: 'refunded' }))).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node_modules/.bin/vitest run lib/__tests__/order-transitions.test.ts`
Expected: FAIL — cannot resolve `@/lib/order-transitions`.

- [ ] **Step 3: Write the implementation (pure parts only)**

```typescript
// lib/order-transitions.ts — guarded order action set (pure) + dispatcher (Task 4 adds applyOrderAction)
import { deriveOrderStage, type OrderStage } from '@/lib/order-stage';

export type OrderAction =
  | 'mark_paid'
  | 'confirm'
  | 'ship'
  | 'sync_tracking'
  | 'mark_delivered'
  | 'cancel'
  | 'refund';

export type TransitionInput = {
  paymentStatus?: string | null;
  orderStatus?: string | null;
  paymentKind?: string | null;
  confirmedAt?: string | null;
  deliveryMethod?: string | null;
  trackingNumber?: string | null;
  shipmentStatus?: string | null;
};

export const ACTION_LABELS: Record<OrderAction, string> = {
  mark_paid: 'Đánh dấu đã thanh toán',
  confirm: 'Xác nhận đơn',
  ship: 'Tạo vận đơn',
  sync_tracking: 'Cập nhật vận chuyển',
  mark_delivered: 'Đánh dấu đã giao',
  cancel: 'Hủy đơn',
  refund: 'Hoàn tiền',
};

const isPaid = (o: TransitionInput): boolean => o.paymentStatus === 'paid';
const isPickup = (o: TransitionInput): boolean => o.deliveryMethod === 'PICKUP';

/**
 * The ordered list of valid actions for an order's current stage.
 * Index 0 is the primary action; the rest are secondary.
 */
export function availableActions(o: TransitionInput): OrderAction[] {
  const stage: OrderStage = deriveOrderStage(o);
  switch (stage) {
    case 'awaiting_payment':
      return ['mark_paid', 'cancel'];
    case 'to_confirm':
      return isPaid(o) ? ['confirm', 'cancel'] : ['confirm', 'mark_paid', 'cancel'];
    case 'packing':
      return isPickup(o) ? ['mark_delivered', 'cancel'] : ['ship', 'cancel'];
    case 'shipped': {
      const actions: OrderAction[] = ['sync_tracking', 'mark_delivered'];
      if (isPaid(o)) actions.push('refund');
      actions.push('cancel');
      return actions;
    }
    case 'delivered':
      return isPaid(o) ? ['refund'] : [];
    case 'payment_failed':
      return ['mark_paid', 'cancel'];
    case 'cancelled':
    case 'refunded':
    default:
      return [];
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node_modules/.bin/vitest run lib/__tests__/order-transitions.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/order-transitions.ts lib/__tests__/order-transitions.test.ts
git commit -m "feat(orders): add availableActions guard for the order lifecycle"
```

---

## Task 3: New fulfillment operations — cancel, refund, manual deliver

**Files:**
- Modify: `lib/order-fulfillment.ts` (append three functions after `syncOrderShipment`, before `syncAllActiveShipments`)

These follow `confirmOrder`'s exact pattern (fetch via `getPayloadOrderById`, guard, `payload.update`, return `mapOrderToFulfillmentView`). No new SQL path needed — they are triggered from the dashboard, not the CMS edit view.

- [ ] **Step 1: Add `cancelOrder`**

Insert after line 285 (`syncOrderShipment`'s closing brace):

```typescript
/** Admin cancels an order. Allowed from any non-terminal stage incl. shipped. Releases stock via afterChange hook. */
export async function cancelOrder(docId: string | number): Promise<FulfillmentResult> {
  const existing = await getPayloadOrderById(docId);
  if (!existing) return { ok: false, message: 'Không tìm thấy đơn hàng.' };
  if (existing.orderStatus === 'canceled') {
    return { ok: false, message: 'Đơn hàng đã bị hủy.' };
  }
  if (existing.orderStatus === 'delivered') {
    return { ok: false, message: 'Đơn đã giao không thể hủy — hãy dùng Hoàn tiền nếu cần.' };
  }

  const payload = await getPayload({ config });
  const doc = (await payload.update({
    collection: 'orders',
    id: docId,
    data: { orderStatus: 'canceled' },
    depth: 0,
  })) as Order;

  return { ok: true, order: mapOrderToFulfillmentView(doc) };
}
```

- [ ] **Step 2: Add `refundOrder`**

```typescript
/** Admin records a full refund. v1: marks the order refunded; the actual money movement is out-of-band. */
export async function refundOrder(docId: string | number): Promise<FulfillmentResult> {
  const existing = await getPayloadOrderById(docId);
  if (!existing) return { ok: false, message: 'Không tìm thấy đơn hàng.' };
  if (existing.paymentStatus !== 'paid') {
    return { ok: false, message: 'Chỉ hoàn tiền cho đơn đã thanh toán.' };
  }

  const payload = await getPayload({ config });
  const doc = (await payload.update({
    collection: 'orders',
    id: docId,
    data: { paymentStatus: 'refunded' },
    depth: 0,
  })) as Order;

  return { ok: true, order: mapOrderToFulfillmentView(doc) };
}
```

- [ ] **Step 3: Add `markOrderDelivered`**

```typescript
/** Manual "delivered": fallback for shipped orders carrier sync missed, and the completion step for pickup orders. */
export async function markOrderDelivered(docId: string | number): Promise<FulfillmentResult> {
  const existing = await getPayloadOrderById(docId);
  if (!existing) return { ok: false, message: 'Không tìm thấy đơn hàng.' };
  if (existing.orderStatus === 'delivered') {
    return { ok: false, message: 'Đơn hàng đã được giao.' };
  }
  if (existing.orderStatus === 'canceled') {
    return { ok: false, message: 'Đơn hàng đã bị hủy.' };
  }

  const extras = existing as Order & { confirmedAt?: string | null };
  const isPickup = existing.deliveryMethod === 'PICKUP';
  const isShipped = existing.orderStatus === 'shipped';
  if (!isShipped && !(isPickup && extras.confirmedAt)) {
    return { ok: false, message: 'Chỉ đánh dấu đã giao cho đơn đang giao hoặc đơn nhận tại cửa hàng đã xác nhận.' };
  }

  const now = new Date().toISOString();
  const data: Record<string, unknown> = { orderStatus: 'delivered', deliveredAt: now };
  // COD: money is collected on delivery → mark paid at the same time.
  if (existing.paymentKind === 'cod' && existing.paymentStatus !== 'paid') {
    data.paymentStatus = 'paid';
    data.paidAt = now;
  }

  const payload = await getPayload({ config });
  const doc = (await payload.update({
    collection: 'orders',
    id: docId,
    data,
    depth: 0,
  })) as Order;

  return { ok: true, order: mapOrderToFulfillmentView(doc) };
}
```

- [ ] **Step 4: Type-check**

Run: `node_modules/.bin/tsc --noEmit`
Expected: no NEW errors in `lib/order-fulfillment.ts`. (Pre-existing errors elsewhere may need `prisma generate` first — run `node_modules/.bin/prisma generate` if you see `TS2307` for the Prisma client.)

- [ ] **Step 5: Commit**

```bash
git add lib/order-fulfillment.ts
git commit -m "feat(orders): add cancel, refund, and manual-deliver fulfillment ops"
```

---

## Task 4: Consolidated server action + dispatch

**Files:**
- Modify: `lib/order-transitions.ts` (append the pure `isOrderAction` + `ShipInput` only)
- Modify: `app/(payload)/admin/orders/actions.ts` (add `runOrderAction` with the server-side dispatch; keep `updateOrderStatus` until Task 8)
- Test: `lib/__tests__/order-transitions.test.ts` (add dispatch-validation cases)

> **Client/server boundary (critical):** `lib/order-transitions.ts` is imported by the `'use client'` `order-actions.tsx` (Task 6) for `availableActions`/`ACTION_LABELS`. It MUST stay pure — it may NOT import `lib/order-fulfillment.ts` (which pulls in `@payload-config`/`getPayload` and would break the client bundle). The action→operation dispatch therefore lives in the `'use server'` `actions.ts`, not here.

- [ ] **Step 1: Write the failing test for input validation**

Append to `lib/__tests__/order-transitions.test.ts`:

```typescript
import { isOrderAction } from '@/lib/order-transitions';

describe('isOrderAction', () => {
  it('accepts known actions', () => {
    expect(isOrderAction('confirm')).toBe(true);
    expect(isOrderAction('refund')).toBe(true);
  });
  it('rejects unknown values', () => {
    expect(isOrderAction('DELIVERED')).toBe(false);
    expect(isOrderAction('')).toBe(false);
    expect(isOrderAction(null)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node_modules/.bin/vitest run lib/__tests__/order-transitions.test.ts`
Expected: FAIL — `isOrderAction` is not exported.

- [ ] **Step 3: Append the pure `isOrderAction` + `ShipInput` to `lib/order-transitions.ts`**

Do NOT add any import here. Append at the bottom (these are pure and client-safe):

```typescript
const ACTION_VALUES = new Set<OrderAction>([
  'mark_paid', 'confirm', 'ship', 'sync_tracking', 'mark_delivered', 'cancel', 'refund',
]);

export function isOrderAction(value: unknown): value is OrderAction {
  return typeof value === 'string' && ACTION_VALUES.has(value as OrderAction);
}

export type ShipInput = { carrierKey: string; trackingNumber: string; customTrackingUrl?: string | null };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node_modules/.bin/vitest run lib/__tests__/order-transitions.test.ts`
Expected: PASS.

- [ ] **Step 5: Add `runOrderAction` (with the server-side dispatch) to `app/(payload)/admin/orders/actions.ts`**

Add these imports at the top of `actions.ts` (alongside the existing ones):

```typescript
import {
  assignShipment,
  cancelOrder,
  confirmOrder,
  markOrderAsPaid,
  markOrderDelivered,
  refundOrder,
  syncOrderShipment,
  type FulfillmentResult,
} from '@/lib/order-fulfillment';
import { isOrderAction, type OrderAction, type ShipInput } from '@/lib/order-transitions';
```

Append (leave the existing `updateOrderStatus` in place for now — Task 8 removes it):

```typescript
export type RunOrderActionResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

/** Dispatch an action to its fulfillment operation. Each op re-fetches and re-guards internally. */
async function dispatchOrderAction(
  docId: string | number,
  action: OrderAction,
  input?: ShipInput,
): Promise<FulfillmentResult> {
  switch (action) {
    case 'mark_paid':
      return markOrderAsPaid(docId);
    case 'confirm':
      return confirmOrder(docId);
    case 'ship':
      if (!input) return { ok: false, message: 'Thiếu thông tin vận chuyển.' };
      return assignShipment({ docId, ...input });
    case 'sync_tracking':
      return syncOrderShipment(docId);
    case 'mark_delivered':
      return markOrderDelivered(docId);
    case 'cancel':
      return cancelOrder(docId);
    case 'refund':
      return refundOrder(docId);
    default:
      return { ok: false, message: 'Thao tác không hợp lệ.' };
  }
}

/** Single entry point for every admin order action. */
export async function runOrderAction(
  docId: string | number,
  action: string,
  input?: ShipInput,
): Promise<RunOrderActionResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, message: 'Bạn không có quyền thực hiện thao tác này.' };
  }
  if (!isOrderAction(action)) {
    return { ok: false, message: 'Thao tác không hợp lệ.' };
  }

  const result = await dispatchOrderAction(docId, action, input);
  if (!result.ok) return result;

  revalidatePath('/admin/orders');
  revalidatePath('/admin/collections/orders');
  revalidatePath(`/admin/collections/orders/${docId}`);
  revalidatePath(`/profile/orders/${result.order.orderCode}`);

  const messages: Record<string, string> = {
    mark_paid: `Đã đánh dấu thanh toán đơn #${result.order.orderCode}.`,
    confirm: `Đã xác nhận đơn #${result.order.orderCode}.`,
    ship: `Đã giao cho ${result.order.shippingCarrierLabel} — mã ${result.order.trackingNumber}.`,
    sync_tracking:
      result.order.shipmentStatus === 'delivered'
        ? 'Đơn hàng đã tự động hoàn tất (đã giao).'
        : `Trạng thái vận chuyển: ${result.order.shipmentStatus ?? '—'}.`,
    mark_delivered: `Đã đánh dấu giao thành công đơn #${result.order.orderCode}.`,
    cancel: `Đã hủy đơn #${result.order.orderCode}.`,
    refund: `Đã hoàn tiền đơn #${result.order.orderCode}.`,
  };
  return { ok: true, message: messages[action] ?? 'Đã cập nhật đơn hàng.' };
}
```

Note: `requireAdmin` and `revalidatePath` are already imported in this file.

- [ ] **Step 6: Type-check + full test run**

Run: `node_modules/.bin/tsc --noEmit && node_modules/.bin/vitest run lib/__tests__/order-stage.test.ts lib/__tests__/order-transitions.test.ts`
Expected: 0 type errors; all stage + transition tests green.

- [ ] **Step 7: Commit**

```bash
git add lib/order-transitions.ts "app/(payload)/admin/orders/actions.ts" lib/__tests__/order-transitions.test.ts
git commit -m "feat(orders): add runOrderAction server action with guarded dispatch"
```

---

## Task 5: Add line items to the fulfillment view (for the drawer)

**Files:**
- Modify: `lib/order-fulfillment-view.ts`
- Test: `lib/__tests__/order-fulfillment-view-lineitems.test.ts` (create)

- [ ] **Step 1: Write the failing test**

```typescript
// lib/__tests__/order-fulfillment-view-lineitems.test.ts
import { describe, expect, it } from 'vitest';
import { mapOrderToFulfillmentView } from '@/lib/order-fulfillment-view';
import type { Order } from '@/src/payload/payload-types';

describe('mapOrderToFulfillmentView lineItems', () => {
  it('maps line items with title, quantity, and unit price', () => {
    const doc = {
      id: 1,
      orderId: '1042',
      lineItems: [
        { productId: 'p1', productTitle: 'Áo thun', quantity: 2, unitPrice: 150000, variantName: 'M' },
      ],
    } as unknown as Order;

    const view = mapOrderToFulfillmentView(doc);
    expect(view.lineItems).toEqual([
      { productTitle: 'Áo thun', variantName: 'M', quantity: 2, unitPrice: 150000 },
    ]);
  });

  it('defaults to an empty array when there are no line items', () => {
    const view = mapOrderToFulfillmentView({ id: 1, orderId: '1' } as unknown as Order);
    expect(view.lineItems).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node_modules/.bin/vitest run lib/__tests__/order-fulfillment-view-lineitems.test.ts`
Expected: FAIL — `view.lineItems` is `undefined`.

- [ ] **Step 3: Extend the view type and mapper**

In `lib/order-fulfillment-view.ts`, add to the `OrderFulfillmentView` type (after `paymentKind`):

```typescript
  lineItems: { productTitle: string; variantName: string | null; quantity: number; unitPrice: number }[];
```

Add this helper above `mapOrderToFulfillmentView`:

```typescript
function parseLineItems(raw: unknown): OrderFulfillmentView['lineItems'] {
  if (!Array.isArray(raw)) return [];
  const items: OrderFulfillmentView['lineItems'] = [];
  for (const row of raw) {
    if (typeof row !== 'object' || row === null) continue;
    const item = row as Record<string, unknown>;
    items.push({
      productTitle: typeof item.productTitle === 'string' ? item.productTitle : '',
      variantName: typeof item.variantName === 'string' ? item.variantName : null,
      quantity: typeof item.quantity === 'number' ? item.quantity : 0,
      unitPrice: typeof item.unitPrice === 'number' ? item.unitPrice : 0,
    });
  }
  return items;
}
```

In the returned object inside `mapOrderToFulfillmentView`, add (after `paymentKind: ...`):

```typescript
    lineItems: parseLineItems((doc as { lineItems?: unknown }).lineItems),
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node_modules/.bin/vitest run lib/__tests__/order-fulfillment-view-lineitems.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/order-fulfillment-view.ts lib/__tests__/order-fulfillment-view-lineitems.test.ts
git commit -m "feat(orders): carry line items on the fulfillment view"
```

---

## Task 6: The order-actions client component

**Files:**
- Create: `app/(payload)/admin/orders/order-actions.tsx`

Renders the single primary action plus a secondary menu, and the carrier/tracking form when `ship` is the action. Replaces `fulfillment-controls.tsx`'s role (deleted in Task 8).

- [ ] **Step 1: Write the component**

```tsx
// app/(payload)/admin/orders/order-actions.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition, type FormEvent, type ReactElement } from 'react';
import { toast } from 'sonner';
import { SHIPMENT_CARRIERS } from '@/lib/shipment/carriers';
import { ACTION_LABELS, availableActions, type OrderAction } from '@/lib/order-transitions';
import type { OrderFulfillmentView } from '@/lib/order-fulfillment-view';
import { runOrderAction } from './actions';

type Props = { order: OrderFulfillmentView };

const DESTRUCTIVE: ReadonlySet<OrderAction> = new Set(['cancel', 'refund']);

export default function OrderActions({ order }: Props): ReactElement {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showShip, setShowShip] = useState(false);
  const [carrierKey, setCarrierKey] = useState('ghn');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [customUrl, setCustomUrl] = useState('');

  const actions = availableActions(order);
  if (actions.length === 0) {
    return <p className="text-xs text-neutral-400">Không có thao tác.</p>;
  }
  const [primary, ...secondary] = actions;

  const run = (action: OrderAction): void => {
    if (action === 'ship') {
      setShowShip(true);
      return;
    }
    if (DESTRUCTIVE.has(action)) {
      const verb = action === 'cancel' ? 'hủy' : 'hoàn tiền';
      if (!window.confirm(`Bạn chắc chắn muốn ${verb} đơn #${order.orderCode}?`)) return;
    }
    startTransition(async () => {
      const result = await runOrderAction(order.id, action);
      if (result.ok) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  };

  const submitShip = (event: FormEvent): void => {
    event.preventDefault();
    startTransition(async () => {
      const result = await runOrderAction(order.id, 'ship', {
        carrierKey,
        trackingNumber,
        customTrackingUrl: carrierKey === 'other' ? customUrl : null,
      });
      if (result.ok) {
        toast.success(result.message);
        setShowShip(false);
        setTrackingNumber('');
        setCustomUrl('');
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => run(primary)}
          disabled={pending}
          className={`rounded-lg px-3 py-2 text-sm font-semibold text-white transition disabled:opacity-60 ${
            DESTRUCTIVE.has(primary) ? 'bg-rose-600 hover:bg-rose-700' : 'bg-indigo-600 hover:bg-indigo-700'
          }`}
        >
          {ACTION_LABELS[primary]}
        </button>
        {secondary.map((action) => (
          <button
            key={action}
            type="button"
            onClick={() => run(action)}
            disabled={pending}
            className={`rounded-lg border px-3 py-2 text-sm font-medium transition disabled:opacity-60 ${
              DESTRUCTIVE.has(action)
                ? 'border-rose-200 text-rose-700 hover:bg-rose-50'
                : 'border-neutral-300 text-neutral-700 hover:bg-neutral-50'
            }`}
          >
            {ACTION_LABELS[action]}
          </button>
        ))}
      </div>

      {showShip ? (
        <form onSubmit={submitShip} className="space-y-2 rounded-lg border border-neutral-200 p-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Giao cho đơn vị vận chuyển
          </p>
          <select
            value={carrierKey}
            onChange={(e) => setCarrierKey(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
          >
            {SHIPMENT_CARRIERS.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
            placeholder="Mã vận đơn"
            required
            className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm font-mono"
          />
          {carrierKey === 'other' ? (
            <input
              type="url"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="https://… (liên kết theo dõi)"
              required
              className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
            />
          ) : null}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="flex-1 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
            >
              Tạo vận đơn & giao hàng
            </button>
            <button
              type="button"
              onClick={() => setShowShip(false)}
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-600"
            >
              Hủy
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `node_modules/.bin/tsc --noEmit`
Expected: no errors in `order-actions.tsx`.

- [ ] **Step 3: Commit**

```bash
git add "app/(payload)/admin/orders/order-actions.tsx"
git commit -m "feat(orders): add guided OrderActions component (primary + secondary)"
```

---

## Task 7: Rebuild the dashboard page on the canonical stage

**Files:**
- Modify: `app/(payload)/admin/orders/page.tsx` (full replacement)

- [ ] **Step 1: Replace the page**

Replace the entire contents of `app/(payload)/admin/orders/page.tsx` with:

```tsx
// app/(payload)/admin/orders/page.tsx — single order-management screen (card grid, action-driven)
import Link from 'next/link';
import type { ReactElement } from 'react';
import Price from '@/components/price';
import { listOrdersForFulfillment } from '@/lib/order-fulfillment';
import { deriveOrderStage, STAGE_BADGE, STAGE_LABELS, stageToTab, type OrderTab } from '@/lib/order-stage';
import OrderActions from './order-actions';

export const dynamic = 'force-dynamic';

const PAYMENT_LABEL: Record<string, string> = {
  pending: 'Chưa TT',
  paid: 'Đã TT',
  failed: 'Thất bại',
  refunded: 'Hoàn tiền',
};

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
}

const TAB_LABELS: Record<OrderTab, string> = {
  needs_action: 'Cần xử lý',
  in_transit: 'Đang giao',
  completed: 'Đã giao',
  cancelled_refunded: 'Hủy / Hoàn',
};

const TAB_ORDER: OrderTab[] = ['needs_action', 'in_transit', 'completed', 'cancelled_refunded'];

export default async function AdminOrdersPage(props: {
  searchParams: Promise<{ tab?: string }>;
}): Promise<ReactElement> {
  const { tab: tabParam } = await props.searchParams;
  const activeTab: OrderTab = TAB_ORDER.includes(tabParam as OrderTab)
    ? (tabParam as OrderTab)
    : 'needs_action';

  // listOrdersForFulfillment excludes canceled + failed; fetch all for the Hủy/Hoàn tab.
  const allOrders = await listOrdersForFulfillment(200);
  const withStage = allOrders.map((o) => ({ order: o, stage: deriveOrderStage(o) }));

  const counts: Record<OrderTab, number> = {
    needs_action: 0, in_transit: 0, completed: 0, cancelled_refunded: 0,
  };
  for (const { stage } of withStage) counts[stageToTab(stage)] += 1;

  const visible = withStage.filter(({ stage }) => stageToTab(stage) === activeTab);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6 md:p-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Quản trị</p>
          <h1 className="text-2xl font-semibold text-neutral-900">Quản lý đơn hàng</h1>
          <p className="mt-1 max-w-xl text-sm text-neutral-600">
            Mỗi đơn chỉ có một nút thao tác chính. Hệ thống tự cập nhật trạng thái — bạn không cần chọn trạng thái thủ công.
          </p>
        </div>
        <Link
          href="/admin/collections/orders"
          className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
        >
          Xem trong CMS →
        </Link>
      </header>

      <nav className="flex flex-wrap gap-2">
        {TAB_ORDER.map((t) => (
          <Link
            key={t}
            href={`/admin/orders?tab=${t}`}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              activeTab === t ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
            }`}
          >
            {TAB_LABELS[t]}
            <span className="ml-1.5 text-xs opacity-70">({counts[t]})</span>
          </Link>
        ))}
      </nav>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-12 text-center">
          <p className="text-neutral-500">Không có đơn hàng trong mục này.</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {visible.map(({ order, stage }) => (
            <article key={String(order.id)} className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">#{order.orderCode}</h2>
                  <p className="text-sm text-neutral-600">{order.customerName}</p>
                  <p className="text-xs text-neutral-400">
                    {formatDateTime(order.createdAt)}
                    {order.buyerEmail ? ` · ${order.buyerEmail}` : ''}
                  </p>
                </div>
                <div className="text-right">
                  <Price amount={order.totalAmount} currencyCode="VND" className="text-base font-bold" />
                  <div className="mt-1 flex flex-wrap justify-end gap-1">
                    <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold uppercase">
                      {PAYMENT_LABEL[order.paymentStatus] ?? order.paymentStatus}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ring-1 ring-inset ${STAGE_BADGE[stage]}`}>
                      {STAGE_LABELS[stage]}
                    </span>
                  </div>
                </div>
              </div>

              {order.shippingAddress ? (
                <p className="mt-3 text-xs text-neutral-600">
                  <span className="font-semibold text-neutral-400">Giao đến: </span>
                  {order.shippingAddress}
                </p>
              ) : null}

              {order.lineItems.length > 0 ? (
                <p className="mt-2 text-xs text-neutral-500">
                  {order.lineItems.map((li) => `${li.productTitle}${li.variantName ? ` (${li.variantName})` : ''} ×${li.quantity}`).join(' · ')}
                </p>
              ) : null}

              {order.trackingNumber ? (
                <div className="mt-3 rounded-lg bg-neutral-50 p-3 text-xs">
                  <p className="font-semibold text-neutral-800">{order.shippingCarrierLabel || 'Đơn vị vận chuyển'}</p>
                  <p className="mt-1 font-mono">{order.trackingNumber}</p>
                  {order.trackingUrl ? (
                    <a href={order.trackingUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-indigo-600 underline">
                      Mở trang theo dõi
                    </a>
                  ) : null}
                </div>
              ) : null}

              <div className="mt-4 border-t border-neutral-100 pt-4">
                <OrderActions order={order} />
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Update `listOrdersForFulfillment` to include canceled/refunded for the new tab**

In `lib/order-fulfillment.ts`, the current `listOrdersForFulfillment` filters out canceled orders and `paymentStatus === 'failed'`. The Hủy/Hoàn tab needs them. Change the `where` clause and the `.filter`:

Replace lines 36-45 (the `where` and trailing `.filter`) so the query returns everything:

```typescript
  const found = await payload.find({
    collection: 'orders',
    sort: '-createdAt',
    limit,
    pagination: false,
    depth: 0,
  });

  return (found.docs as Order[]).map(mapOrderToFulfillmentView);
```

- [ ] **Step 3: Type-check**

Run: `node_modules/.bin/tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Manual verification**

Run: `node_modules/.bin/prisma generate` (if not already), then `node_modules/.bin/next dev --turbo`. Open `http://localhost:3000/admin/orders`.
Expected: four tabs with counts; each card shows ONE stage badge + a primary action button; the Hủy/Hoàn tab lists cancelled/refunded orders. (Requires a running DB with seeded orders.)

- [ ] **Step 5: Commit**

```bash
git add "app/(payload)/admin/orders/page.tsx" lib/order-fulfillment.ts
git commit -m "feat(orders): rebuild dashboard on canonical stage with guided actions"
```

---

## Task 8: Lock the raw collection + align storefront + remove dead code

**Files:**
- Modify: `src/payload/collections/Orders.ts`
- Modify: `lib/profile-orders.ts`
- Delete: `app/(payload)/admin/orders/status-select.tsx`, `app/(payload)/admin/orders/fulfillment-controls.tsx`
- Modify: `app/(payload)/admin/orders/actions.ts` (remove `updateOrderStatus`)
- Modify: `lib/payload-order-storefront.ts` (remove `mapStorefrontStatusToPayloadFields`)

- [ ] **Step 1: Make the raw status fields read-only**

In `src/payload/collections/Orders.ts`, in the `row` containing `paymentStatus` and `orderStatus` (lines ~128-156), add `admin: { readOnly: true }` to BOTH select fields. Update the collection `description` (line ~20):

```typescript
    description:
      'Trạng thái đơn được quản lý ở trang "Quản lý đơn hàng" (/admin/orders). Các trường trạng thái ở đây chỉ để xem.',
```

- [ ] **Step 2: Reroute profile status through the canonical stage**

In `lib/profile-orders.ts`, replace the `mapStatus` function body so it derives from the single lifecycle (keeps the same `ProfileOrderStatus` output type the UI expects):

```typescript
import { deriveOrderStage } from '@/lib/order-stage';

function mapStatus(doc: {
  paymentStatus?: string | null;
  orderStatus?: string | null;
  paymentKind?: string | null;
}): ProfileOrderStatus {
  const stage = deriveOrderStage({ ...doc, confirmedAt: null, deliveryMethod: null });
  switch (stage) {
    case 'cancelled':
    case 'refunded':
      return 'CANCELLED';
    case 'delivered':
      return 'DELIVERED';
    case 'shipped':
    case 'packing':
      return 'SHIPPED';
    case 'to_confirm':
      return doc.paymentStatus === 'paid' ? 'PAID' : doc.paymentKind === 'cod' ? 'PENDING_COD' : 'PENDING';
    case 'awaiting_payment':
      return 'PENDING_ONLINE';
    case 'payment_failed':
    default:
      return 'PENDING';
  }
}
```

Note: `confirmedAt: null` is passed because the storefront list does not load it; `packing` therefore won't appear here, and a paid-unconfirmed order maps to `PAID` (its existing customer-facing label) — behavior preserved.

- [ ] **Step 3: Delete dead admin components**

```bash
git rm "app/(payload)/admin/orders/status-select.tsx" "app/(payload)/admin/orders/fulfillment-controls.tsx"
```

- [ ] **Step 4: Remove `updateOrderStatus` and its now-dead helper**

In `app/(payload)/admin/orders/actions.ts`, delete the `updateOrderStatus` function, the `STOREFRONT_STATUS_VALUES` set, `isStorefrontOrderStatus`, the `UpdateOrderStatusResult` type, and the now-unused imports of `mapStorefrontStatusToPayloadFields`, `StorefrontOrderStatus`, and `updatePayloadOrderStatus`. Keep `runOrderAction` and its imports.

In `lib/payload-order-storefront.ts`, delete `mapStorefrontStatusToPayloadFields` (lines ~43-60). Keep `mapPayloadOrderToStorefrontStatus`, `ownsPayloadOrder`, `cancelPendingGatewayOrder`, and `StorefrontOrderStatus` (still used by checkout/API).

- [ ] **Step 5: Verify nothing references the deleted symbols**

Run:
```bash
grep -rn "status-select\|OrderStatusSelect\|updateOrderStatus\|mapStorefrontStatusToPayloadFields\|FulfillmentControls" --include=*.ts --include=*.tsx app lib components src
```
Expected: NO matches (other than possibly `src/payload/components/FulfillmentControls.tsx` itself — if that file is unused after this change, delete it too: confirm with `grep -rn "components/FulfillmentControls" app src` returns nothing, then `git rm src/payload/components/FulfillmentControls.tsx`).

- [ ] **Step 6: Type-check**

Run: `node_modules/.bin/tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor(orders): lock raw status fields, unify storefront stage, drop dead status UI"
```

---

## Task 9: Full verification gate

- [ ] **Step 1: Full test suite**

Run: `node_modules/.bin/vitest run`
Expected: all files pass, including the new `order-stage`, `order-transitions`, and `order-fulfillment-view-lineitems` suites.

- [ ] **Step 2: Type-check**

Run: `node_modules/.bin/prisma generate && node_modules/.bin/tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 3: Smoke test the screen**

Run: `node_modules/.bin/next dev --turbo`, open `/admin/orders`, and walk one order through To confirm → Packing → Shipped → Delivered using the buttons; confirm the badge and tab move correctly and a toast appears each time. Confirm the raw collection (`/admin/collections/orders/<id>`) shows payment/order status as read-only.
Expected: every transition works from the dashboard alone; no action routes the owner back to raw dropdowns.

- [ ] **Step 4: Update DECISIONS.md**

Append:

```markdown
## 2026-06-15 — Order management: derived stage + guarded actions (no schema migration)
**Chosen:** One pure `deriveOrderStage` + a guarded `availableActions`/`applyOrderAction` layer over the existing fulfillment functions; the `/admin/orders` dashboard is the single screen; raw collection status fields are read-only.
**Alternatives:** Single stored `status` enum (rejected: payment ⟂ fulfillment are orthogonal; big migration + PayOS webhook rewrite for little user gain); two-axis schema refactor (deferred: optional, not the source of owner pain).
**Why:** The unfriendliness was in the interface to the state (raw dropdowns, four vocabularies, invalid combos), not storage. Reusing `markOrderAsPaid`'s direct-SQL deadlock workaround avoids regressions.
**Trade-offs:** The orthogonal payment/fulfillment fields still exist in the DB; the single-stage invariant is enforced by the action layer + read-only UI, not the schema. Refund is record-only (no gateway refund call) in v1.
**Revisit if:** Partial refunds/fulfillment are needed, or an automated PayOS refund is required.
```

- [ ] **Step 5: Commit**

```bash
git add DECISIONS.md
git commit -m "docs(decisions): log order-management lifecycle approach"
```

---

## Self-Review Notes

- **Spec coverage:** Lifecycle (Task 1) · guarded action model (Tasks 2, 4) · all four required actions — cancel/refund/mark-paid/pickup (Tasks 3, 4; pickup handled by `markOrderDelivered` + `availableActions` packing/pickup branch) · single card-grid screen (Task 7) · raw collection lockdown + storefront alignment + dead-code removal (Task 8) · tests + scope/error notes (Tasks 1-5, 9).
- **Drawer note:** the design's "detail drawer" is realized as richer cards (line items + tracking timeline inline) rather than a separate modal — same information, fewer moving parts. If a true modal is wanted, it's an additive follow-up; flagged here so it's not a silent cut. Task list in "File Structure" mentions `order-detail-drawer.tsx`; it is intentionally NOT built in v1 per this note.
- **Client/server boundary:** `lib/order-transitions.ts` stays pure (client-safe); the dispatch to server-only fulfillment ops lives in `actions.ts`. See the Task 4 boundary callout.
- **Reuse:** the dispatch delegates to existing `markOrderAsPaid` (SQL), `confirmOrder`, `assignShipment`, `syncOrderShipment` — no duplicated update logic, deadlock workaround preserved.
- **No DB migration:** every change reads/writes fields that already exist.
```
