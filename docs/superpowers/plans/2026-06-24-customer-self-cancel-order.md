# Customer Self-Cancel (Unshipped Orders) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a logged-in customer cancel their own order from the profile order tracking page while it is still pending/processing (not yet shipped), capturing a cancellation reason.

**Architecture:** A new `cancelOrderAction` server action verifies ownership and the cancelable state, persists a reason on the order, then reuses the existing `cancelOrder()` fulfillment function (whose status change triggers the existing inventory-restock afterChange hook). A client dialog collects the reason; the tracking page renders the trigger only when cancelable.

**Tech Stack:** Next.js 15 App Router server actions, Payload CMS 3, Headless UI dialog, next-intl, Vitest.

## Global Constraints

- Cancelable only when `orderStatus ∈ {pending, processing}`. Shipped/delivered/canceled are never customer-cancelable.
- Ownership check (verbatim pattern, reused from `reorderAction`): `meta?.prismaUserId === session.user.id || (typeof doc.buyerEmail === 'string' && doc.buyerEmail.toLowerCase() === session.user.email?.toLowerCase())`.
- Paid orders: on cancel, set `orderStatus: 'canceled'` but DO NOT change `paymentStatus` (leave `paid`). Seller refunds out-of-band via the existing refund action.
- Action return type is the existing `ActionResult = { ok: true } | { ok: false; error: string }`.
- User-facing copy is Vietnamese in `vi.json`, English in `en.json`, under the `profile` namespace.
- Run tests by calling the binary directly (project `pnpm <script>` hits a deps precheck): `node_modules/.bin/vitest run <path>`.
- Generate the Payload migration with `node_modules/.bin/payload migrate:create`; first run `node_modules/.bin/payload migrate:status` and confirm the ledger is current before creating (remote DB ledger can drift behind `src/migrations`).

---

### Task 1: Add cancellation reason fields to the Orders collection (+ migration)

**Files:**
- Modify: `src/payload/collections/Orders.ts` (add fields after the `orderStatus`/`paymentStatus` group, before `deliveryMethod` at line ~163)
- Create: `src/migrations/<generated>.ts` (via CLI)
- Modify: `src/migrations/index.ts` (auto-updated by the generator)

**Interfaces:**
- Produces: Orders documents gain `cancellationReason?: 'changed_mind' | 'ordered_by_mistake' | 'found_better_price' | 'delivery_too_slow' | 'other' | null` and `cancellationNote?: string | null`.

- [ ] **Step 1: Add the fields to the collection**

In `src/payload/collections/Orders.ts`, add immediately before the `deliveryMethod` field:

```ts
{
  name: 'cancellationReason',
  type: 'select',
  admin: { readOnly: true, position: 'sidebar' },
  options: [
    { label: 'Đổi ý / không muốn mua nữa', value: 'changed_mind' },
    { label: 'Đặt nhầm', value: 'ordered_by_mistake' },
    { label: 'Tìm được giá tốt hơn', value: 'found_better_price' },
    { label: 'Giao hàng quá chậm', value: 'delivery_too_slow' },
    { label: 'Lý do khác', value: 'other' },
  ],
},
{
  name: 'cancellationNote',
  type: 'textarea',
  admin: { readOnly: true, position: 'sidebar' },
},
```

- [ ] **Step 2: Confirm migration ledger is current**

Run: `node_modules/.bin/payload migrate:status`
Expected: no errors; note whether all existing migrations show as run. If the remote ledger is behind, stop and resolve drift before continuing (see Global Constraints).

- [ ] **Step 3: Generate the migration**

Run: `node_modules/.bin/payload migrate:create cancellation_fields`
Expected: a new file under `src/migrations/` adding `cancellation_reason` and `cancellation_note` columns to the orders table, and `src/migrations/index.ts` updated.

- [ ] **Step 4: Regenerate Payload types**

Run: `node_modules/.bin/payload generate:types`
Expected: `src/payload/payload-types.ts` `Order` interface now includes `cancellationReason` and `cancellationNote`.

- [ ] **Step 5: Apply the migration locally**

Run: `node_modules/.bin/payload migrate`
Expected: the new migration runs successfully (`Done.`).

- [ ] **Step 6: Commit**

```bash
git add src/payload/collections/Orders.ts src/migrations/ src/payload/payload-types.ts
git commit -m "feat(orders): add cancellation reason fields"
```

---

### Task 2: `cancelOrderAction` server action

**Files:**
- Modify: `app/[locale]/(storefront)/profile/actions.ts` (add the action + a static import of `cancelOrder`)
- Test: `app/[locale]/(storefront)/profile/__tests__/cancel-order-action.test.ts`

**Interfaces:**
- Consumes: `cancelOrder(docId)` from `@/lib/order-fulfillment` (returns `{ ok: true; order } | { ok: false; message: string }`); `auth()` from `@/auth`.
- Produces: `cancelOrderAction(orderId: string, reason: string, note?: string): Promise<ActionResult>`.

- [ ] **Step 1: Write the failing test**

Create `app/[locale]/(storefront)/profile/__tests__/cancel-order-action.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const authMock = vi.fn();
const findByID = vi.fn();
const update = vi.fn();
const cancelOrder = vi.fn();

vi.mock('@/auth', () => ({ auth: authMock }));
vi.mock('@payload-config', () => ({ default: {} }));
vi.mock('payload', () => ({
  getPayload: vi.fn(async () => ({ findByID, update })),
}));
vi.mock('@/lib/order-fulfillment', () => ({ cancelOrder }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { cancelOrderAction } from '@/app/[locale]/(storefront)/profile/actions';

const OWNER = { user: { id: 'user-1', email: 'a@example.com' } };

beforeEach(() => {
  vi.clearAllMocks();
  authMock.mockResolvedValue(OWNER);
  cancelOrder.mockResolvedValue({ ok: true, order: {} });
  update.mockResolvedValue({});
});

function order(overrides: Record<string, unknown> = {}) {
  return {
    id: 42,
    orderStatus: 'pending',
    paymentStatus: 'paid',
    metadata: { prismaUserId: 'user-1' },
    buyerEmail: 'a@example.com',
    ...overrides,
  };
}

describe('cancelOrderAction', () => {
  it('should reject when the user does not own the order', async () => {
    findByID.mockResolvedValue(order({ metadata: { prismaUserId: 'someone-else' }, buyerEmail: 'b@example.com' }));
    const res = await cancelOrderAction('42', 'changed_mind');
    expect(res.ok).toBe(false);
    expect(cancelOrder).not.toHaveBeenCalled();
  });

  it('should reject when the order is already shipped', async () => {
    findByID.mockResolvedValue(order({ orderStatus: 'shipped' }));
    const res = await cancelOrderAction('42', 'changed_mind');
    expect(res.ok).toBe(false);
    expect(cancelOrder).not.toHaveBeenCalled();
  });

  it('should reject an invalid reason value', async () => {
    findByID.mockResolvedValue(order());
    const res = await cancelOrderAction('42', 'not_a_reason');
    expect(res.ok).toBe(false);
    expect(cancelOrder).not.toHaveBeenCalled();
  });

  it('should persist the reason and call cancelOrder for a pending owned order', async () => {
    findByID.mockResolvedValue(order({ orderStatus: 'processing' }));
    const res = await cancelOrderAction('42', 'found_better_price', 'too pricey');
    expect(res.ok).toBe(true);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'orders',
        id: 42,
        data: { cancellationReason: 'found_better_price', cancellationNote: 'too pricey' },
      }),
    );
    expect(cancelOrder).toHaveBeenCalledWith(42);
  });

  it('should not change paymentStatus (paid orders stay paid)', async () => {
    findByID.mockResolvedValue(order({ paymentStatus: 'paid' }));
    await cancelOrderAction('42', 'changed_mind');
    const updateData = update.mock.calls[0]?.[0]?.data ?? {};
    expect(updateData).not.toHaveProperty('paymentStatus');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node_modules/.bin/vitest run "app/[locale]/(storefront)/profile/__tests__/cancel-order-action.test.ts"`
Expected: FAIL — `cancelOrderAction` is not exported.

- [ ] **Step 3: Implement the action**

In `app/[locale]/(storefront)/profile/actions.ts`, add this import near the top with the other imports:

```ts
import { cancelOrder } from '@/lib/order-fulfillment';
```

Add this constant near the other `MAX_*` constants:

```ts
const CANCEL_REASONS = new Set([
  'changed_mind',
  'ordered_by_mistake',
  'found_better_price',
  'delivery_too_slow',
  'other',
]);
```

Append this action to the file:

```ts
export async function cancelOrderAction(
  orderId: string,
  reason: string,
  note?: string,
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: 'Bạn cần đăng nhập.' };
  }
  if (typeof orderId !== 'string' || orderId.length === 0) {
    return { ok: false, error: 'Đơn hàng không hợp lệ.' };
  }
  if (!CANCEL_REASONS.has(reason)) {
    return { ok: false, error: 'Vui lòng chọn lý do hủy hợp lệ.' };
  }

  const config = await import('@payload-config');
  const { getPayload } = await import('payload');
  const payload = await getPayload({ config: config.default });

  let doc;
  try {
    doc = await payload.findByID({ collection: 'orders', id: orderId, depth: 0 });
  } catch {
    return { ok: false, error: 'Không tìm thấy đơn hàng.' };
  }

  const meta = doc.metadata as { prismaUserId?: string } | null | undefined;
  const ownsOrder =
    meta?.prismaUserId === session.user.id ||
    (typeof doc.buyerEmail === 'string' &&
      doc.buyerEmail.toLowerCase() === session.user.email?.toLowerCase());
  if (!ownsOrder) {
    return { ok: false, error: 'Không tìm thấy đơn hàng.' };
  }

  if (doc.orderStatus !== 'pending' && doc.orderStatus !== 'processing') {
    return { ok: false, error: 'Đơn hàng này không thể hủy (đã giao cho đơn vị vận chuyển hoặc đã hoàn tất).' };
  }

  try {
    await payload.update({
      collection: 'orders',
      id: doc.id,
      data: {
        cancellationReason: reason,
        cancellationNote: typeof note === 'string' && note.trim().length > 0 ? note.trim().slice(0, 500) : null,
      },
    });
  } catch (error) {
    logger.error({ err: error, orderId: doc.id }, '[profile.cancelOrderAction] reason save failed');
    return { ok: false, error: 'Không thể hủy đơn hàng.' };
  }

  const result = await cancelOrder(doc.id);
  if (!result.ok) {
    return { ok: false, error: result.message };
  }

  revalidatePath('/profile');
  revalidatePath('/', 'layout');
  return { ok: true };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node_modules/.bin/vitest run "app/[locale]/(storefront)/profile/__tests__/cancel-order-action.test.ts"`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add "app/[locale]/(storefront)/profile/actions.ts" "app/[locale]/(storefront)/profile/__tests__/cancel-order-action.test.ts"
git commit -m "feat(orders): add customer cancel-order server action"
```

---

### Task 3: Cancel button + dialog, wired into the tracking page (+ i18n)

**Files:**
- Create: `app/[locale]/(storefront)/profile/orders/[orderCode]/cancel-order-button.tsx`
- Modify: `app/[locale]/(storefront)/profile/orders/[orderCode]/page.tsx` (render the button when cancelable)
- Modify: `messages/vi.json`, `messages/en.json` (add `profile` keys)

**Interfaces:**
- Consumes: `cancelOrderAction(orderId, reason, note?)` from `@/app/[locale]/(storefront)/profile/actions`.
- Produces: `CancelOrderButton` default export, props `{ orderId: string }`.

- [ ] **Step 1: Add i18n strings**

In `messages/vi.json`, inside the `"profile"` object, add:

```json
"cancelOrder": "Hủy đơn hàng",
"cancelOrderTitle": "Hủy đơn hàng này?",
"cancelOrderBody": "Vui lòng chọn lý do hủy. Với đơn đã thanh toán, shop sẽ xử lý hoàn tiền cho bạn.",
"cancelReasonChanged_mind": "Đổi ý / không muốn mua nữa",
"cancelReasonOrdered_by_mistake": "Đặt nhầm",
"cancelReasonFound_better_price": "Tìm được giá tốt hơn",
"cancelReasonDelivery_too_slow": "Giao hàng quá chậm",
"cancelReasonOther": "Lý do khác",
"cancelNotePlaceholder": "Ghi chú thêm (không bắt buộc)",
"cancelConfirm": "Xác nhận hủy",
"cancelDismiss": "Giữ đơn hàng",
"cancelSuccess": "Đã hủy đơn hàng.",
"cancelPending": "Đang hủy..."
```

In `messages/en.json`, inside `"profile"`, add the same keys with English values:

```json
"cancelOrder": "Cancel order",
"cancelOrderTitle": "Cancel this order?",
"cancelOrderBody": "Please choose a reason. For paid orders, the shop will process your refund.",
"cancelReasonChanged_mind": "Changed my mind",
"cancelReasonOrdered_by_mistake": "Ordered by mistake",
"cancelReasonFound_better_price": "Found a better price",
"cancelReasonDelivery_too_slow": "Delivery too slow",
"cancelReasonOther": "Other reason",
"cancelNotePlaceholder": "Additional note (optional)",
"cancelConfirm": "Confirm cancellation",
"cancelDismiss": "Keep order",
"cancelSuccess": "Order canceled.",
"cancelPending": "Canceling..."
```

- [ ] **Step 2: Create the client component**

Create `app/[locale]/(storefront)/profile/orders/[orderCode]/cancel-order-button.tsx`:

```tsx
'use client';

import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState, useTransition, type ReactElement } from 'react';
import { toast } from 'sonner';
import { cancelOrderAction } from '@/app/[locale]/(storefront)/profile/actions';

const REASONS = [
  'changed_mind',
  'ordered_by_mistake',
  'found_better_price',
  'delivery_too_slow',
  'other',
] as const;

const REASON_KEY: Record<(typeof REASONS)[number], string> = {
  changed_mind: 'cancelReasonChanged_mind',
  ordered_by_mistake: 'cancelReasonOrdered_by_mistake',
  found_better_price: 'cancelReasonFound_better_price',
  delivery_too_slow: 'cancelReasonDelivery_too_slow',
  other: 'cancelReasonOther',
};

export default function CancelOrderButton({ orderId }: { orderId: string }): ReactElement {
  const t = useTranslations('profile');
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<(typeof REASONS)[number]>('changed_mind');
  const [note, setNote] = useState('');
  const [pending, startTransition] = useTransition();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex rounded-full border border-rose-300 px-5 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 dark:border-rose-500/40 dark:text-rose-300 dark:hover:bg-rose-500/10"
      >
        {t('cancelOrder')}
      </button>

      <Dialog open={open} onClose={() => !pending && setOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="w-full max-w-md rounded-2xl bg-white p-6 dark:bg-neutral-900">
            <DialogTitle className="text-lg font-bold">{t('cancelOrderTitle')}</DialogTitle>
            <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">{t('cancelOrderBody')}</p>

            <fieldset className="mt-4 space-y-2">
              {REASONS.map((r) => (
                <label key={r} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="cancel-reason"
                    value={r}
                    checked={reason === r}
                    onChange={() => setReason(r)}
                  />
                  {t(REASON_KEY[r])}
                </label>
              ))}
            </fieldset>

            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t('cancelNotePlaceholder')}
              maxLength={500}
              className="mt-4 w-full rounded-lg border border-neutral-300 p-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
              rows={3}
            />

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={pending}
                onClick={() => setOpen(false)}
                className="rounded-full px-4 py-2 text-sm font-medium text-neutral-600 disabled:opacity-60 dark:text-neutral-300"
              >
                {t('cancelDismiss')}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const result = await cancelOrderAction(orderId, reason, note);
                    if (!result.ok) {
                      toast.error(result.error);
                      return;
                    }
                    toast.success(t('cancelSuccess'));
                    setOpen(false);
                    router.refresh();
                  })
                }
                className="rounded-full bg-rose-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pending ? t('cancelPending') : t('cancelConfirm')}
              </button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </>
  );
}
```

- [ ] **Step 3: Verify the dialog import path**

Run: `node_modules/.bin/tsc --noEmit -p tsconfig.json 2>&1 | grep cancel-order-button || echo "no type errors in cancel-order-button"`
Expected: `no type errors in cancel-order-button`. If `@headlessui/react` exports differ, open `components/cart/modal.tsx` and match its exact import style (it already uses Headless UI in this project).

- [ ] **Step 4: Wire the button into the tracking page**

In `app/[locale]/(storefront)/profile/orders/[orderCode]/page.tsx`:

Add the import next to `import ReorderButton from './reorder-button';`:

```tsx
import CancelOrderButton from './cancel-order-button';
```

Replace the final action block:

```tsx
      <div className="mt-6">
        <ReorderButton orderId={String(order.id)} />
      </div>
```

with:

```tsx
      <div className="mt-6 flex flex-wrap gap-3">
        <ReorderButton orderId={String(order.id)} />
        {order.orderStatus === 'pending' || order.orderStatus === 'processing' ? (
          <CancelOrderButton orderId={String(order.id)} />
        ) : null}
      </div>
```

- [ ] **Step 5: Verify the build compiles**

Run: `node_modules/.bin/next build 2>&1 | tail -20`
Expected: build completes without errors referencing the profile order page or the new component. (If the remote DB is unreachable during build, the type/compile portion still validates the new files; a DB connection error at data-collection time is unrelated to this task.)

- [ ] **Step 6: Commit**

```bash
git add "app/[locale]/(storefront)/profile/orders/[orderCode]/cancel-order-button.tsx" "app/[locale]/(storefront)/profile/orders/[orderCode]/page.tsx" messages/vi.json messages/en.json
git commit -m "feat(orders): customer cancel button + reason dialog on order page"
```

---

## Self-Review Notes

- Spec coverage: cancelable rule (Task 2 guard + Task 3 conditional render), ownership (Task 2), paid stays paid (Task 2 + test), reason fields/migration (Task 1), reason capture UI (Task 3), i18n (Task 3), tests (Task 2). All covered.
- Restock is handled by the existing `syncOrderInventoryOnStatusChange` afterChange hook when `cancelOrder` flips `orderStatus`; no work needed here.
- The cancel button only renders for pending/processing, but the server action re-checks state (defense in depth against a stale page / race).
```
