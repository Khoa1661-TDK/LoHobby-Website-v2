# UX Round 3 — Phase 1: Trust & Silent-Failure Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop the storefront from showing shoppers raw error codes, swallowing cart-edit failures, presenting misleading CTAs, and displaying fabricated shipping/status values.

**Architecture:** Mostly self-contained fixes. Pure logic (error-code→message-key mapping, shipping "unquotable" sentinel, order-status label map, reorder counts) is extracted into testable helpers with Vitest unit tests; UI-state changes (toast on cart-edit failure, three-state CTA, block-checkout message) are wired on top. Each task ends with an independently shippable, testable deliverable.

**Tech Stack:** Next.js 15 App Router, React 19 client components, next-intl (messages in `messages/en.json` + `messages/vi.json`), `sonner` toasts, Vitest.

## Global Constraints

- **Do not break CMS / page-builder preview.** No fix may add a render path for a shared component that omits `NextIntlClientProvider`. (No Phase-1 task adds `useTranslations` to a component that lacks it today, so this phase is low-risk; still verify by loading `/vi/build/<slug>/preview` if a shared component is touched.)
- **All new user-facing copy is translated:** every new string is defined in BOTH `messages/en.json` and `messages/vi.json` and read via next-intl. No hardcoded user-facing strings.
- **Reuse existing namespaces:** `cart.errors`, `product`, `checkout`, `profile` — do not invent parallel namespaces.
- **Vitest test files MUST import `describe/expect/it/vi` from `vitest`** (project constraint: `globals:true` is runtime-only; `tsc --noEmit` breaks without the import).
- **Conventional Commits**, atomic, imperative, ≤72-char subject. Commit directly to `main` (solo project).

---

## File Structure

- `components/cart/actions.ts` — MODIFY: replace `KNOWN_ERROR_KEYS`/`toUserError` with a code→key map (Task 1).
- `lib/cart-error-messages.ts` — CREATE: pure `cartErrorMessageKey(code)` helper (Task 1).
- `lib/__tests__/cart-error-messages.test.ts` — CREATE (Task 1).
- `components/cart/modal.tsx` — MODIFY: toast on update/remove failure (Task 2).
- `lib/cart.ts` — MODIFY: return dropped-line info from `getCart` (Task 3).
- `components/cart/add-to-cart.tsx` — MODIFY: three-state CTA (Task 4).
- `components/product/variant-selector.tsx` — MODIFY: no-deselect + pass selection state (Task 4).
- `components/checkout-form.tsx` — MODIFY: unquotable-shipping sentinel + block submit (Task 5).
- `app/[locale]/(storefront)/checkout/error/page.tsx` — MODIFY: generic copy (Task 6).
- `lib/order-status-labels.ts` — CREATE: `orderStatusLabelKey(status)` (Task 7).
- `lib/__tests__/order-status-labels.test.ts` — CREATE (Task 7).
- `app/[locale]/(storefront)/checkout/success/page.tsx` — MODIFY: localized status label (Task 7).
- `app/[locale]/(storefront)/profile/actions.ts` — MODIFY: reorder returns counts (Task 8).
- `app/[locale]/(storefront)/profile/orders/[orderCode]/reorder-button.tsx` — MODIFY: count-aware toast (Task 8).
- `messages/en.json`, `messages/vi.json` — MODIFY across several tasks.

---

## Task 1: Map cart error codes to message keys (finding 1.1)

The `lib/cart.ts` functions `throw new Error('CART_FULL')` etc. (UPPER_SNAKE codes). `messages/*.json` define `cart.errors.cartFull` (camelCase). `components/cart/actions.ts:42` looks up `errors.CART_FULL`, which misses; the `!startsWith('errors.')` guard fails to catch the `cart.errors.CART_FULL` fallback, so `toUserError` returns the raw code (`error.message`) at line 45. Fix: a pure map from code → existing camelCase key.

**Files:**
- Create: `lib/cart-error-messages.ts`
- Create: `lib/__tests__/cart-error-messages.test.ts`
- Modify: `components/cart/actions.ts` (replace `KNOWN_ERROR_KEYS` set + `toUserError` body)

**Interfaces:**
- Produces: `cartErrorMessageKey(code: string): string | null` — returns the camelCase key **without** the `errors.` prefix (e.g. `'cartFull'`) for a known code, or `null` for an unknown one.

- [ ] **Step 1: Write the failing test**

```typescript
// lib/__tests__/cart-error-messages.test.ts
import { describe, expect, it } from 'vitest';
import { cartErrorMessageKey } from '@/lib/cart-error-messages';

describe('cartErrorMessageKey', () => {
  it('should map every thrown cart code to a camelCase message key', () => {
    expect(cartErrorMessageKey('CART_FULL')).toBe('cartFull');
    expect(cartErrorMessageKey('VARIANT_REQUIRED')).toBe('variantRequired');
    expect(cartErrorMessageKey('PRODUCT_UNAVAILABLE')).toBe('productUnavailable');
    expect(cartErrorMessageKey('INSUFFICIENT_STOCK')).toBe('insufficientStock');
    expect(cartErrorMessageKey('INVALID_PRODUCT')).toBe('invalidProduct');
    expect(cartErrorMessageKey('INVALID_QUANTITY')).toBe('invalidQuantity');
    expect(cartErrorMessageKey('PRODUCT_NOT_FOUND')).toBe('productNotFound');
    expect(cartErrorMessageKey('INVALID_VARIANT')).toBe('invalidVariant');
  });

  it('should return null for an unknown code', () => {
    expect(cartErrorMessageKey('SOMETHING_ELSE')).toBeNull();
    expect(cartErrorMessageKey('')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `./node_modules/.bin/vitest run lib/__tests__/cart-error-messages.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/cart-error-messages"`.

- [ ] **Step 3: Write minimal implementation**

```typescript
// lib/cart-error-messages.ts
/**
 * Thrown cart error codes (see lib/cart.ts) mapped to the camelCase key under
 * `cart.errors` in messages/*.json. Keeping this in one place keeps the codes
 * and the message keys from drifting apart (finding 1.1).
 */
const CART_ERROR_KEYS: Record<string, string> = {
  INVALID_PRODUCT: 'invalidProduct',
  INVALID_QUANTITY: 'invalidQuantity',
  PRODUCT_NOT_FOUND: 'productNotFound',
  PRODUCT_UNAVAILABLE: 'productUnavailable',
  CART_FULL: 'cartFull',
  VARIANT_REQUIRED: 'variantRequired',
  INVALID_VARIANT: 'invalidVariant',
  INSUFFICIENT_STOCK: 'insufficientStock',
};

/** Returns the camelCase message key (no `errors.` prefix) for a known code, else null. */
export function cartErrorMessageKey(code: string): string | null {
  return CART_ERROR_KEYS[code] ?? null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `./node_modules/.bin/vitest run lib/__tests__/cart-error-messages.test.ts`
Expected: PASS (both tests).

- [ ] **Step 5: Rewire `toUserError` to use the map**

In `components/cart/actions.ts`, delete the `ERROR_KEY_PREFIX` const (line 22), the `KNOWN_ERROR_KEYS` set (lines 24–33), and replace `toUserError` (lines 35–48) with:

```typescript
import { cartErrorMessageKey } from '@/lib/cart-error-messages';

async function toUserError(
  t: Awaited<ReturnType<typeof getTranslations>>,
  error: unknown,
  fallbackKey: string,
): Promise<string> {
  if (error instanceof Error) {
    const key = cartErrorMessageKey(error.message);
    if (key) return t(`errors.${key}`);
    // Unknown code: never surface the raw Error message to the shopper.
  }
  return t(fallbackKey);
}
```

Add the `import` at the top of the file with the other imports (keep the existing `getTranslations` import).

- [ ] **Step 6: Verify typecheck and full test run**

Run: `./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/vitest run lib/__tests__/cart-error-messages.test.ts`
Expected: no type errors; tests PASS.

- [ ] **Step 7: Commit**

```bash
git add lib/cart-error-messages.ts lib/__tests__/cart-error-messages.test.ts components/cart/actions.ts
git commit -m "fix(cart): map thrown error codes to localized messages"
```

---

## Task 2: Surface cart-drawer edit failures as toasts (finding 1.2)

`components/cart/modal.tsx` calls `updateItemAction`/`removeItemAction` inside `startTransition` and discards the returned `ActionResult`, only calling `refresh()`. A "+" past stock silently reverts. Fix: toast the returned error, matching `add-to-cart.tsx:51-53`.

**Files:**
- Modify: `components/cart/modal.tsx` (the three edit call sites — the `-`, `+`/`QtyInput onCommit`, and remove handlers, around lines 184, 198, 211)

**Interfaces:**
- Consumes: `updateItemAction(productId, quantity, variantSku): Promise<{} | { error: string }>` and `removeItemAction(productId, variantSku): Promise<{} | { error: string }>` from `components/cart/actions.ts`.

- [ ] **Step 1: Confirm `sonner` and translations are available in the file**

Run: `grep -n "from 'sonner'\|useTranslations\|const t =" components/cart/modal.tsx`
Expected: if `toast` is not imported, note it — Step 3 adds the import. The file already uses `const t = useTranslations('cart')` (confirm the namespace).

- [ ] **Step 2: Add a shared result-handling helper inside the component**

At the top of the `CartModal` component body (near the other hooks), add:

```typescript
import { toast } from 'sonner'; // add to imports if absent

// inside the component, after `const t = useTranslations('cart');`
const runCartEdit = (action: () => Promise<{} | { error: string }>) =>
  startTransition(async () => {
    const result = await action();
    if (result && 'error' in result && result.error) {
      toast.error(result.error);
      return;
    }
    refresh();
  });
```

(If the component uses a `router.refresh()` alias other than `refresh`, match it. Confirm with `grep -n "refresh" components/cart/modal.tsx`.)

- [ ] **Step 3: Replace the three inline handlers to use `runCartEdit`**

Decrement button `onClick`:

```typescript
onClick={() =>
  runCartEdit(() =>
    updateItemAction(item.merchandiseId, item.quantity - 1, item.variantSku),
  )
}
```

`QtyInput` `onCommit`:

```typescript
onCommit={(value) =>
  runCartEdit(() =>
    updateItemAction(item.merchandiseId, value, item.variantSku),
  )
}
```

Remove button `onClick` (find the `removeItemAction` call, ~line 211):

```typescript
onClick={() =>
  runCartEdit(() => removeItemAction(item.merchandiseId, item.variantSku))
}
```

- [ ] **Step 4: Typecheck**

Run: `./node_modules/.bin/tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Manual verification against the deployed instance**

Add a real item to the cart, open the drawer, and press "+" past available stock. Expected: a `sonner` error toast (e.g. "Quantity exceeds available stock.") instead of a silent revert. Confirm remove still works.

- [ ] **Step 6: Commit**

```bash
git add components/cart/modal.tsx
git commit -m "fix(cart): surface drawer quantity and remove failures as toasts"
```

---

## Task 3: Notice when a cart line is dropped as unavailable (finding 1.3)

`lib/cart.ts` `hydrate` silently `continue`s past lines whose product/variant no longer resolves or is `!availableForSale` (lines 169, 178, 191). The shopper's item vanishes with no explanation. Fix: have `getCart` report how many stored lines were dropped, and show a one-time notice on cart surfaces.

**Files:**
- Modify: `lib/cart.ts` (add `droppedLines` count to the hydrate result; expose via a new return shape without breaking `getCart`'s `Cart` consumers)
- Modify: `components/cart/modal.tsx` (render notice when `> 0`)
- Modify: `messages/en.json`, `messages/vi.json` (new `cart.itemsRemovedNotice` key)

**Interfaces:**
- Produces: `Cart` gains an optional field `droppedLineCount?: number` (count of stored items skipped during hydrate). Existing consumers ignore it; the modal reads it.

- [ ] **Step 1: Extend the `Cart` type and count drops in `hydrate`**

In `lib/cart.ts`, add to the `Cart` type (after `lines: CartLine[];`):

```typescript
  /** Stored lines skipped during hydrate because the product/variant is gone or unavailable. */
  droppedLineCount?: number;
```

In `hydrate`, add a counter. Initialise `let dropped = 0;` next to `let subtotal = 0;`. At each `continue` for an unavailable/missing line (the `if (!doc) continue;`, `if (!match) continue;`, and `if (!p || !p.availableForSale) continue;` branches), increment `dropped += 1;` before `continue`. Then add `droppedLineCount: dropped,` to the returned object (after `lines,`).

- [ ] **Step 2: Add the notice copy**

Add to `messages/en.json` under `cart` (alongside existing keys):

```json
"itemsRemovedNotice": "Some items were removed because they are no longer available."
```

Add to `messages/vi.json` under `cart`:

```json
"itemsRemovedNotice": "Một số sản phẩm đã bị xoá vì không còn khả dụng."
```

- [ ] **Step 3: Render the notice in the modal**

In `components/cart/modal.tsx`, where the cart contents render (inside the non-empty branch, above `<CartSummary>` near line 159), add:

```tsx
{cart.droppedLineCount ? (
  <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
    {t('itemsRemovedNotice')}
  </p>
) : null}
```

- [ ] **Step 4: Typecheck**

Run: `./node_modules/.bin/tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Verify existing cart tests still pass**

Run: `./node_modules/.bin/vitest run components/cart`
Expected: PASS (free-shipping-progress test unaffected).

- [ ] **Step 6: Commit**

```bash
git add lib/cart.ts components/cart/modal.tsx messages/en.json messages/vi.json
git commit -m "fix(cart): notify when unavailable lines are dropped from the cart"
```

---

## Task 4: Three-state add-to-cart CTA and no-deselect variant (findings 1.4 / 1.5-product)

`add-to-cart.tsx:35` labels any non-addable button `outOfStock`, so a variant product shows "Out of stock" before a variant is picked. `variant-selector.tsx:221` toggles the selection back to `null` on a second click, silently re-disabling. Fix: a distinct "select an option" state, and make re-clicking the selected variant a no-op.

**Files:**
- Modify: `components/cart/add-to-cart.tsx` (add a `needsSelection` prop; three-state label)
- Modify: `components/product/variant-selector.tsx` (stop deselecting; pass `needsSelection`)
- Modify: `messages/en.json`, `messages/vi.json` (new `cart.selectOption` key)

**Interfaces:**
- Consumes: `AddToCart` prop additions.
- Produces: `AddToCart` accepts `needsSelection?: boolean` (default `false`) — when `true` and no genuine unavailability, the button is disabled and labelled "select option".

- [ ] **Step 1: Add the copy key**

`messages/en.json` under `cart`: `"selectOption": "Select an option"`
`messages/vi.json` under `cart`: `"selectOption": "Chọn phân loại"`

- [ ] **Step 2: Add the `needsSelection` prop and three-state label in `add-to-cart.tsx`**

Update the `Props` type and destructuring to add `needsSelection = false`, and replace the label logic (lines 34–39):

```typescript
type Props = {
  product: Product;
  variantSku?: string | null;
  canAdd?: boolean;
  quantity?: number;
  needsSelection?: boolean;
};

// in the component signature:
  needsSelection = false,

// replace `available`/`label`:
  const available = product.availableForSale && canAdd;
  const label = needsSelection && product.availableForSale
    ? t('selectOption')
    : !available
      ? t('outOfStock')
      : isPending
        ? t('adding')
        : t('addToCart');
```

Keep `disabled={!available || isPending}` (a needs-selection button is not addable, so it stays disabled — but now reads "Select an option" rather than "Out of stock").

- [ ] **Step 3: Stop the variant re-click from deselecting**

In `variant-selector.tsx`, replace the `onClick` handler (lines 220–226) so selecting is idempotent:

```typescript
onClick={() => {
  setSelectedSku(variant.sku);
  setHeroFromGallery(false);
}}
```

- [ ] **Step 4: Pass `needsSelection` from the two `AddToCart` call sites**

Both the main buy box (lines 284–293) and the sticky bar (lines 326–335) render `AddToCart`. Add to each:

```tsx
needsSelection={variants.length > 0 && !selectedVariant}
```

- [ ] **Step 5: Typecheck**

Run: `./node_modules/.bin/tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Manual verification**

On a variant product page (deployed): the CTA reads "Select an option" (VI: "Chọn phân loại") on arrival, becomes "Add to cart" once a variant is chosen, and re-tapping the chosen variant no longer reverts the price or the button. A genuinely out-of-stock variant still shows "Out of stock".

- [ ] **Step 7: Commit**

```bash
git add components/cart/add-to-cart.tsx components/product/variant-selector.tsx messages/en.json messages/vi.json
git commit -m "fix(product): distinguish select-option from out-of-stock on the buy CTA"
```

---

## Task 5: Block checkout when shipping is unquotable (finding 1.5)

`estimateShippingVnd` (`checkout-form.tsx:77-91`) returns `0` when `computeShippingQuote` returns `{ error }` (the selected delivery method is disabled). The summary then renders `0` as "Miễn phí" (line 538). A shopper sees free shipping and an estimated total for a method the store can't fulfil. Fix: return a `null` sentinel for unquotable, show a clear message, and disable submit.

**Files:**
- Modify: `components/checkout-form.tsx` (sentinel return, message, disabled submit)
- Modify: `messages/en.json`, `messages/vi.json` (new `checkout.shippingUnavailable` key)

**Interfaces:**
- Produces (internal): `estimateShippingVnd(...)` returns `number | null` — `null` = unquotable.

- [ ] **Step 1: Add the copy key**

`messages/en.json` under `checkout`: `"shippingUnavailable": "We can't ship to this option right now. Please choose another delivery method or contact us."`
`messages/vi.json` under `checkout`: `"shippingUnavailable": "Hiện chưa thể giao theo lựa chọn này. Vui lòng chọn phương thức khác hoặc liên hệ với chúng tôi."`

- [ ] **Step 2: Make the estimator return a sentinel**

Replace `estimateShippingVnd` (lines 77–91):

```typescript
/** Returns the shipping amount in VND, or null when the selected method is unquotable. */
function estimateShippingVnd(
  shipping: CheckoutShippingPreview,
  deliveryMethod: DeliveryMethod,
  subtotalVnd: number,
  shippingRegion: string | null,
): number | null {
  const quote = computeShippingQuote(shipping, deliveryMethod, subtotalVnd, shippingRegion);
  if ('error' in quote) return null;
  return quote.shippingAmount;
}
```

- [ ] **Step 3: Handle the `null` at the call site**

Find where `shippingVnd` / `estimatedTotalVnd` are computed in the component (search `estimateShippingVnd(` and `estimatedTotalVnd`). Introduce an `unquotable` flag and a safe number for arithmetic:

```typescript
const rawShippingVnd = estimateShippingVnd(shipping, deliveryMethod, subtotalVnd, shippingRegion);
const shippingUnquotable = rawShippingVnd === null;
const shippingVnd = rawShippingVnd ?? 0;
```

Use `shippingVnd` for the existing total math (unchanged), but gate the UI on `shippingUnquotable`.

- [ ] **Step 4: Render the message instead of a price, and block the row**

Replace the shipping `<dd>` (lines 535–543) so an unquotable method never reads "Miễn phí":

```tsx
<dd className="text-neutral-500 dark:text-neutral-400">
  {isPickup ? (
    t('freePickup')
  ) : shippingUnquotable ? (
    <span className="text-terracotta-600 dark:text-terracotta-400">{t('shippingUnavailable')}</span>
  ) : shippingVnd === 0 ? (
    t('freeShipping')
  ) : (
    <Price amount={String(shippingVnd)} currencyCode="VND" />
  )}
</dd>
```

(This step also replaces the hardcoded `'Miễn phí (nhận tại cửa hàng)'` and `'Miễn phí'` with keys `checkout.freePickup` / `checkout.freeShipping` — add both keys now: EN `"freePickup": "Free (store pickup)"`, `"freeShipping": "Free"`; VI `"freePickup": "Miễn phí (nhận tại cửa hàng)"`, `"freeShipping": "Miễn phí"`. This is the Phase-3 i18n work done early because the row is being rewritten anyway.)

- [ ] **Step 5: Disable the submit button when unquotable**

Update the submit button `disabled` (line 580):

```tsx
disabled={submitting || cart.lines.length === 0 || paymentMethods.length === 0 || (!isPickup && shippingUnquotable)}
```

- [ ] **Step 6: Typecheck**

Run: `./node_modules/.bin/tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add components/checkout-form.tsx messages/en.json messages/vi.json
git commit -m "fix(checkout): block checkout instead of showing free for unquotable shipping"
```

---

## Task 6: Generic copy on the payment-misconfig page (finding 1.6)

`checkout/error/page.tsx:22-24` renders `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY` to shoppers. Fix: replace with a generic apology; the real cause is already logged server-side where the redirect to this page is decided.

**Files:**
- Modify: `app/[locale]/(storefront)/checkout/error/page.tsx`
- Modify: `messages/en.json`, `messages/vi.json` (repurpose `checkout.error.instructions`)

**Interfaces:** none.

- [ ] **Step 1: Update the copy**

Set `checkout.error.instructions` in both files to a shopper-safe message.
`messages/en.json`: `"instructions": "Payment is temporarily unavailable. Please try again in a few minutes or contact us if it keeps happening."`
`messages/vi.json`: `"instructions": "Thanh toán tạm thời không khả dụng. Vui lòng thử lại sau ít phút hoặc liên hệ với chúng tôi nếu vẫn gặp lỗi."`

- [ ] **Step 2: Remove the `<code>` env-var names from the page**

Replace the `<p>` block (lines 20–26) with:

```tsx
<p className="mt-4 rounded-2xl border border-terracotta-200 bg-terracotta-50 p-4 text-sm text-terracotta-700 dark:border-terracotta-900 dark:bg-terracotta-950 dark:text-terracotta-300">
  {t('instructions')}
</p>
```

- [ ] **Step 3: Typecheck**

Run: `./node_modules/.bin/tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add "app/[locale]/(storefront)/checkout/error/page.tsx" messages/en.json messages/vi.json
git commit -m "fix(checkout): stop leaking payos env-var names to shoppers"
```

---

## Task 7: Localized order-status labels incl. PENDING_TRANSFER (finding 1.7)

`checkout/success/page.tsx:110` renders the raw `{status}` enum. `lib/payload-order-storefront.ts:23` produces `PENDING_TRANSFER` but `ProfileOrderStatus` (`profile/types.ts:10-17`) and `lib/profile-orders.ts` omit it, so transfer orders collapse to `PENDING`. Fix: a shared status→label-key map, add the missing status, and render the label.

**Files:**
- Create: `lib/order-status-labels.ts`
- Create: `lib/__tests__/order-status-labels.test.ts`
- Modify: `app/[locale]/(storefront)/profile/types.ts` (add `'PENDING_TRANSFER'`)
- Modify: `lib/profile-orders.ts` (map `manual_transfer` → `PENDING_TRANSFER`)
- Modify: `app/[locale]/(storefront)/checkout/success/page.tsx` (render label)
- Modify: `messages/en.json`, `messages/vi.json` (`checkout.statusLabels.*`)

**Interfaces:**
- Produces: `orderStatusLabelKey(status: string): string` — returns a key under `checkout.statusLabels` (e.g. `'pendingTransfer'`), defaulting to `'pending'` for unknown input.

- [ ] **Step 1: Write the failing test**

```typescript
// lib/__tests__/order-status-labels.test.ts
import { describe, expect, it } from 'vitest';
import { orderStatusLabelKey } from '@/lib/order-status-labels';

describe('orderStatusLabelKey', () => {
  it('should map each order status to a label key', () => {
    expect(orderStatusLabelKey('PENDING')).toBe('pending');
    expect(orderStatusLabelKey('PENDING_COD')).toBe('pendingCod');
    expect(orderStatusLabelKey('PENDING_ONLINE')).toBe('pendingOnline');
    expect(orderStatusLabelKey('PENDING_TRANSFER')).toBe('pendingTransfer');
    expect(orderStatusLabelKey('PAID')).toBe('paid');
    expect(orderStatusLabelKey('SHIPPED')).toBe('shipped');
    expect(orderStatusLabelKey('DELIVERED')).toBe('delivered');
    expect(orderStatusLabelKey('CANCELLED')).toBe('cancelled');
  });

  it('should fall back to pending for an unknown status', () => {
    expect(orderStatusLabelKey('WHATEVER')).toBe('pending');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `./node_modules/.bin/vitest run lib/__tests__/order-status-labels.test.ts`
Expected: FAIL — cannot resolve import.

- [ ] **Step 3: Implement the map**

```typescript
// lib/order-status-labels.ts
/** Order status enum → key under `checkout.statusLabels` in messages/*.json. */
const STATUS_LABEL_KEYS: Record<string, string> = {
  PENDING: 'pending',
  PENDING_COD: 'pendingCod',
  PENDING_ONLINE: 'pendingOnline',
  PENDING_TRANSFER: 'pendingTransfer',
  PAID: 'paid',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
};

export function orderStatusLabelKey(status: string): string {
  return STATUS_LABEL_KEYS[status] ?? 'pending';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `./node_modules/.bin/vitest run lib/__tests__/order-status-labels.test.ts`
Expected: PASS.

- [ ] **Step 5: Add the label copy**

`messages/en.json` — add under `checkout` a `statusLabels` object:

```json
"statusLabels": {
  "pending": "Pending",
  "pendingCod": "Pending (cash on delivery)",
  "pendingOnline": "Awaiting payment",
  "pendingTransfer": "Awaiting bank transfer",
  "paid": "Paid",
  "shipped": "Shipped",
  "delivered": "Delivered",
  "cancelled": "Cancelled"
}
```

`messages/vi.json` — add under `checkout`:

```json
"statusLabels": {
  "pending": "Chờ xử lý",
  "pendingCod": "Chờ xử lý (thanh toán khi nhận hàng)",
  "pendingOnline": "Chờ thanh toán",
  "pendingTransfer": "Chờ chuyển khoản",
  "paid": "Đã thanh toán",
  "shipped": "Đang giao",
  "delivered": "Đã giao",
  "cancelled": "Đã huỷ"
}
```

- [ ] **Step 6: Add `PENDING_TRANSFER` to the profile status type and mapping**

In `profile/types.ts`, add `| 'PENDING_TRANSFER'` to `ProfileOrderStatus` (after `'PENDING_ONLINE'`).

In `lib/profile-orders.ts` `mapStatus`, extend the `to_confirm` / `awaiting_payment` handling so `paymentKind === 'manual_transfer'` yields `'PENDING_TRANSFER'`. Update the `to_confirm` return (line 24) to:

```typescript
    case 'to_confirm':
      if (doc.paymentStatus === 'paid') return 'PAID';
      if (doc.paymentKind === 'cod') return 'PENDING_COD';
      if (doc.paymentKind === 'manual_transfer') return 'PENDING_TRANSFER';
      return 'PENDING';
```

- [ ] **Step 7: Render the localized label on the success page**

In `checkout/success/page.tsx`, import the helper and replace `<dd>{status}</dd>` (line 110) with `<dd>{t(`statusLabels.${orderStatusLabelKey(status)}`)}</dd>`. Confirm the page's `t` is scoped to `checkout` (search `getTranslations('checkout')`); if the status `<dl>` uses a narrower scope, use the full path from the page's translator.

Add the import: `import { orderStatusLabelKey } from '@/lib/order-status-labels';`

- [ ] **Step 8: Typecheck + tests**

Run: `./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/vitest run lib/__tests__/order-status-labels.test.ts`
Expected: no type errors (note: adding the union member may surface `switch`/exhaustiveness spots — fix any that fail to compile); tests PASS.

- [ ] **Step 9: Commit**

```bash
git add lib/order-status-labels.ts lib/__tests__/order-status-labels.test.ts "app/[locale]/(storefront)/profile/types.ts" lib/profile-orders.ts "app/[locale]/(storefront)/checkout/success/page.tsx" messages/en.json messages/vi.json
git commit -m "fix(orders): show localized status labels and surface bank-transfer state"
```

---

## Task 8: Reorder reports added/skipped counts (finding 1.8)

`profile/actions.ts` `reorderAction` skips unpurchasable lines and returns a bare `{ ok: true }` when `added >= 1`; `reorder-button.tsx:25` toasts a flat `reorderSuccess`. A 5-item reorder that adds 1 still says "added". Fix: return counts and toast them.

**Files:**
- Modify: `app/[locale]/(storefront)/profile/actions.ts` (`reorderAction` return shape)
- Modify: `app/[locale]/(storefront)/profile/orders/[orderCode]/reorder-button.tsx` (count-aware toast)
- Modify: `messages/en.json`, `messages/vi.json` (`profile.reorderPartial`, `profile.reorderAllAdded`)

**Interfaces:**
- Produces: `reorderAction(orderId)` returns `{ ok: true; added: number; skipped: number } | { ok: false; error: string }`.

- [ ] **Step 1: Return counts from the action**

In `reorderAction`, track `skipped` alongside `added`. In the catch block increment `skipped += 1;` (declare `let skipped = 0;` next to `let added = 0;`). Replace the success return (line ~224) with:

```typescript
  if (added === 0) {
    return { ok: false, error: 'Các sản phẩm trong đơn này hiện không còn bán.' };
  }

  revalidatePath('/', 'layout');
  return { ok: true, added, skipped };
```

Update the action's declared return type accordingly (find its `Promise<...>` signature and widen the ok branch to `{ ok: true; added: number; skipped: number }`). If a shared `ActionResult` type is used, define a local `ReorderResult` type instead so other actions are unaffected.

- [ ] **Step 2: Add the copy keys**

`messages/en.json` under `profile`:

```json
"reorderAllAdded": "Added {count} items to your cart.",
"reorderPartial": "Added {added} of {total} items — {skipped} are no longer available."
```

`messages/vi.json` under `profile`:

```json
"reorderAllAdded": "Đã thêm {count} sản phẩm vào giỏ.",
"reorderPartial": "Đã thêm {added}/{total} sản phẩm — {skipped} sản phẩm không còn bán."
```

- [ ] **Step 3: Make the toast count-aware**

In `reorder-button.tsx`, replace the success handling (lines 21–26):

```typescript
const result = await reorderAction(orderId);
if (!result.ok) {
  toast.error(result.error);
  return;
}
if (result.skipped > 0) {
  toast.warning(
    t('reorderPartial', {
      added: result.added,
      total: result.added + result.skipped,
      skipped: result.skipped,
    }),
  );
} else {
  toast.success(t('reorderAllAdded', { count: result.added }));
}
router.refresh();
```

- [ ] **Step 4: Typecheck**

Run: `./node_modules/.bin/tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add "app/[locale]/(storefront)/profile/actions.ts" "app/[locale]/(storefront)/profile/orders/[orderCode]/reorder-button.tsx" messages/en.json messages/vi.json
git commit -m "fix(orders): report added and skipped counts on reorder"
```

---

## Final verification

- [ ] Run the full unit suite: `./node_modules/.bin/vitest run`
- [ ] Typecheck the whole project: `./node_modules/.bin/tsc --noEmit`
- [ ] Confirm both message files are valid JSON: `node -e "JSON.parse(require('fs').readFileSync('messages/en.json'));JSON.parse(require('fs').readFileSync('messages/vi.json'));console.log('ok')"`
- [ ] Manual pass on the deployed container: variant PDP CTA states, cart-drawer over-stock toast, checkout with a disabled delivery method shows the block message (not "Miễn phí"), order success shows a localized status.

## Self-review notes

- **Spec coverage:** findings 1.1 (Task 1), 1.2 (Task 2), 1.3 (Task 3), 1.4/1.5-product (Task 4), 1.5 (Task 5), 1.6 (Task 6), 1.7/1.13/1.15 (Task 7), 1.8 (Task 8). All Phase-1 findings covered.
- **CMS constraint:** Task 4 touches shared `add-to-cart.tsx`/`variant-selector.tsx` which already use `useTranslations`; no new provider dependency introduced.
