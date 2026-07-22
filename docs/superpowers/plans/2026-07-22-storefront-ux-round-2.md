# Storefront UX Round 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the 30 storefront UX defects catalogued in `docs/superpowers/specs/2026-07-22-storefront-ux-round-2-design.md`, grouped into independent-surface work-streams.

**Architecture:** Five independent surfaces (checkout, cart+product, search, profile, polish/forms). Streams run in parallel; tasks within a stream run in order. `components/checkout-form.tsx` is owned by **Stream 1 only** — no other stream edits it.

**Tech Stack:** Next.js 15 App Router, next-intl (`localePrefix: 'always'`), Payload CMS, Vitest, Tailwind 4, shadcn/ui.

## Global Constraints

- **No hardcoded user-facing strings.** Every storefront string goes through next-intl (`useTranslations` in client components, `getTranslations` in server components). New keys are added to **both** `messages/en.json` and `messages/vi.json` with identical key paths. (`frontend.md` §4, project i18n.)
- **Reuse existing keys** — do not redefine. `cart.outOfStock`, `cart.adding`, `cart.addToCart`, `search.noResults`, `search.noFilterResults` already exist.
- **Locale-safe navigation.** Client redirects use the i18n `Link`/`useRouter` from the project's `@/i18n/navigation` (or existing i18n nav module), never bare `next/navigation` push with an unprefixed path. (`i18n-usepathname-double-locale` memory — do not double-prefix; use the i18n helpers which handle the prefix.)
- **Exemption:** `app/not-found.tsx` and `app/global-error.tsx` render outside `NextIntlClientProvider` — not in scope here, do not touch.
- **Every bug fix gets a test that fails before, passes after** (`testing.md` §1). Test files must `import { describe, it, expect, vi } from 'vitest'` explicitly (`vitest-tests-must-import-globals-for-tsc` memory).
- **Vitest is invoked directly**, not via `pnpm test`: `node_modules/.bin/vitest run <path>` (`pnpm-run-deps-check-bypass` memory).
- **Conventional Commits**, atomic, direct to `main` (project git override).
- **Verify against the deploy** at `http://116.118.6.30:3000` where a symptom is HTTP-observable.

---

## File Structure

**Stream 1 — Checkout (owns `components/checkout-form.tsx`)**
- Modify: `components/checkout-form.tsx` — i18n + behavior
- Modify: `app/[locale]/(storefront)/checkout/cancel/page.tsx` — restore cart
- Modify: `app/[locale]/(storefront)/checkout/error/page.tsx` — remove env-var leak
- Modify: `app/[locale]/(storefront)/checkout/success/page.tsx` — status label
- Modify: `components/checkout/order-status-poller.tsx` — timeout + feedback
- Create: `components/cart/actions.ts` gains `restoreCartAction` (or reuse add loop)

**Stream 2 — Cart + Product**
- Modify: `components/cart/actions.ts`, `components/cart/modal.tsx`, `lib/cart.ts`
- Modify: `components/product/variant-selector.tsx`, `components/cart/add-to-cart.tsx`

**Stream 3 — Search / Listing**
- Modify: `lib/constants.ts`, `components/layout/search/filter/facets.tsx`, `.../dropdown.tsx`, `components/layout/search/collections-nav.tsx`, `components/layout/navbar/search.tsx`, `components/layout/search/empty-state.tsx`, `app/[locale]/(storefront)/search/page.tsx`, `.../search/layout.tsx`
- Create: mobile filter drawer component

**Stream 4 — Profile / Orders**
- Modify: `app/[locale]/(storefront)/profile/orders/[orderCode]/page.tsx`, `lib/profile-orders.ts`, `app/[locale]/(storefront)/profile/types.ts`, `app/[locale]/(storefront)/profile/actions.ts`, `components/orders/reorder-button.tsx`, `components/wishlist/wishlist-button.tsx`, `app/[locale]/(storefront)/wishlist-actions.ts`, `components/*/addresses-panel.tsx`

**Stream 5 — Polish / Forms**
- Modify: `components/product/product-card.tsx`, `lib/categories.ts`, `components/product/reviews.tsx`, `components/product/review-form.tsx`, `components/auth-form.tsx`, `app/[locale]/(storefront)/reset-password/reset-password-form.tsx`, homepage hero component(s)

Every i18n task adds keys to `messages/en.json` **and** `messages/vi.json`.

---

# Stream 1 — Checkout

## Task 1: Internationalize the checkout form

**Files:**
- Modify: `components/checkout-form.tsx`
- Modify: `messages/en.json`, `messages/vi.json`
- Test: `components/__tests__/checkout-form-i18n.test.ts` (grep-style guard)

**Interfaces:**
- Produces: a `checkout.form.*` namespace consumed only within this file.

- [ ] **Step 1: Inventory every hardcoded string.** In `components/checkout-form.tsx`, list all user-facing literals: validation messages (`:186-214`), section labels, delivery/payment option copy (`:360-455`, `:499-595`), and the API-error passthrough at `:246`. For each, the **existing Vietnamese literal is the `vi.json` value**; author the English equivalent for `en.json`.

- [ ] **Step 2: Add the `checkout.form` namespace to both message files.** Mirror keys exactly. Example (extend to cover the full inventory from Step 1):

```jsonc
// messages/en.json  → "checkout": { "form": {
"fullName": "Full name",
"phone": "Phone number",
"address": "Address",
"deliveryMethod": "Delivery method",
"pickupInStore": "Pick up in store",
"paymentMethod": "Payment method",
"payOnline": "Pay online (PayOS)",
"cod": "Cash on delivery",
"placeOrder": "Place order",
"validation": {
  "nameRequired": "Please enter your full name.",
  "phoneInvalid": "Please enter a valid phone number.",
  "addressRequired": "Please enter a delivery address."
}
// } }  — vi.json uses the strings already in the component
```

- [ ] **Step 3: Replace literals with `t(...)`.** Add `const t = useTranslations('checkout.form')` at the top of the component. Route the API error at `:246` through a keyed lookup: the API returns a stable error **code**; map codes to `checkout.form.apiErrors.<code>`; fall back to a generic `checkout.form.apiErrors.generic` for unknown codes. Do **not** render `app/api/checkout/route.ts` raw strings.

- [ ] **Step 4: Locale-safe post-submit redirect (#26).** Replace `router.replace('/checkout/success?…')` (bare `next/navigation`) with the i18n router from the project's i18n navigation module so the locale prefix is preserved.

- [ ] **Step 5: Write the guard test.**

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import en from '../../messages/en.json';
import vi from '../../messages/vi.json';

describe('checkout form i18n', () => {
  it('should not contain hardcoded Vietnamese in the component', () => {
    const src = readFileSync('components/checkout-form.tsx', 'utf8');
    // Vietnamese-specific diacritics in a JSX string literal signal a hardcoded label
    expect(src).not.toMatch(/["'][^"'\n]*[ăâđêôơưàáảãạ][^"'\n]*["']/i);
  });
  it('should define checkout.form in both locales with identical keys', () => {
    const keys = (o: any): string[] =>
      Object.entries(o).flatMap(([k, v]) =>
        v && typeof v === 'object' ? keys(v).map((s) => `${k}.${s}`) : [k],
      );
    expect(keys((en as any).checkout.form).sort()).toEqual(
      keys((vi as any).checkout.form).sort(),
    );
  });
});
```

- [ ] **Step 6: Run** `node_modules/.bin/vitest run components/__tests__/checkout-form-i18n.test.ts` — expect PASS after Steps 2–4 (FAIL before).

- [ ] **Step 7: Commit** `feat(i18n): internationalize the checkout form`

## Task 2: Checkout behavior — cart restore, block unquotable shipping, error focus, poller

**Files:**
- Modify: `components/checkout-form.tsx`
- Modify: `app/[locale]/(storefront)/checkout/cancel/page.tsx`
- Modify: `app/[locale]/(storefront)/checkout/error/page.tsx`
- Modify: `app/[locale]/(storefront)/checkout/success/page.tsx`
- Modify: `components/checkout/order-status-poller.tsx`
- Modify: `components/cart/actions.ts` (add `restoreCartAction`)
- Test: `lib/__tests__/checkout-shipping.test.ts`, `components/__tests__/order-status-poller.test.tsx`

**Interfaces:**
- Produces: `restoreCartAction(items: Array<{ productId: string; variantSku?: string | null; quantity: number }>): Promise<ActionResult>` in `components/cart/actions.ts`.

- [ ] **Step 1 (#9 don't clear early): stop clearing the cart before the online redirect.** In `checkout-form.tsx`, the `await clearCartAction()` at `:252` must run **only** for the COD success path, not before `window.location.assign(data.checkoutUrl)`. For the online path, leave the cart intact; it is cleared by the webhook/success flow on confirmed payment.

- [ ] **Step 2 (#9 restore on cancel): add `restoreCartAction`** to `components/cart/actions.ts` that re-adds a list of line items (reuse `addToCart` in a loop, tolerating already-present lines). In `checkout/cancel/page.tsx`, after cancelling the pending order, read its line items and call the restore so the shopper returns with the cart intact. Render a localized "your cart was restored, you can try again or choose COD" notice.

- [ ] **Step 3 (#10 block unquotable shipping): fail closed on quote error.** In `checkout-form.tsx`, the shipping resolver currently `return 0` on `'error' in quote` (`:89-90`) and renders 0 as "free" (`:538`). Change it to return a sentinel (e.g. `null`), render a localized "we don't ship to this region yet" message where the shipping amount would go, and **disable the submit button** while shipping is unquotable and the method is not in-store pickup.

- [ ] **Step 4: Write the shipping-block test.**

```ts
import { describe, it, expect } from 'vitest';
import { resolveShipping } from '../checkout-shipping'; // extract pure resolver if needed
describe('shipping resolution', () => {
  it('should return null (blocked) when the region has no quote', () => {
    expect(resolveShipping({ error: 'NO_RATE' } as any)).toBeNull();
  });
  it('should return the quoted amount when a rate exists', () => {
    expect(resolveShipping({ shippingAmount: 30000 } as any)).toBe(30000);
  });
});
```
Extract the resolver into a small pure function (`lib/checkout-shipping.ts` or co-located) so it is testable.

- [ ] **Step 5 (#12 env-var leak): neutralize the payment-error page.** In `checkout/error/page.tsx`, delete the three `<code>PAYOS_*</code>` spans. Replace `checkout.error.instructions` copy in both locales with a customer-facing message: "Online payment is temporarily unavailable. Please try again shortly or choose Cash on Delivery." No env-var names.

- [ ] **Step 6 (#13 raw status): humanize the confirmation status.** In `checkout/success/page.tsx:110`, map the raw `{status}` enum through a localized label lookup (`checkout.status.<STATUS>`), not the enum literal.

- [ ] **Step 7 (#11 error focus): scroll/focus the error.** In `checkout-form.tsx`, when `setError` fires, move focus to the alert (`ref` + `.focus()` on an element with `role="alert" tabIndex={-1}`) and `scrollIntoView`. Keep the single alert but make it reachable.

- [ ] **Step 8 (#14 poller): add feedback and a timeout.** In `order-status-poller.tsx`, show a localized "checking your payment…" state with a spinner while polling; after a bounded number of attempts (e.g. 20 × 3s = 60s) stop and show a localized "still processing — we'll email you / contact support" state with a link, instead of polling forever.

- [ ] **Step 9: Poller test.**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { OrderStatusPoller } from '../order-status-poller';
it('should stop polling and show the timeout state after the attempt cap', async () => {
  vi.useFakeTimers();
  const fetchStatus = vi.fn().mockResolvedValue('pending');
  render(<OrderStatusPoller fetchStatus={fetchStatus} maxAttempts={3} intervalMs={3000} />);
  await act(async () => { vi.advanceTimersByTime(3 * 3000 + 100); });
  expect(await screen.findByText(/still processing|support/i)).toBeTruthy();
  vi.useRealTimers();
});
```
(Refactor the poller to accept `fetchStatus`, `maxAttempts`, `intervalMs` props for testability; defaults preserve current 3000ms behavior.)

- [ ] **Step 10: Run** both test files with `node_modules/.bin/vitest run` — expect PASS.

- [ ] **Step 11: Commit** `fix(checkout): restore cart on cancel, block unquotable regions, humanize errors`

---

# Stream 2 — Cart + Product

## Task 3: Fix cart error surfacing (raw keys, swallowed drawer errors, silent line drops)

**Files:**
- Modify: `components/cart/actions.ts`
- Modify: `components/cart/modal.tsx`
- Modify: `lib/cart.ts`
- Modify: `messages/en.json`, `messages/vi.json`
- Test: `components/cart/__tests__/actions-errors.test.ts`

- [ ] **Step 1 (#1 root cause): align error codes to message keys.** The `KNOWN_ERROR_KEYS` set (`actions.ts:24-33`) uses UPPER_CASE (`CART_FULL`), but `cart.errors.*` keys are camelCase (`cartFull`). Add a code→key map:

```ts
const ERROR_CODE_TO_KEY: Record<string, string> = {
  INVALID_PRODUCT: 'invalidProduct',
  INVALID_QUANTITY: 'invalidQuantity',
  PRODUCT_NOT_FOUND: 'productUnavailable',
  PRODUCT_UNAVAILABLE: 'productUnavailable',
  CART_FULL: 'cartFull',
  VARIANT_REQUIRED: 'variantRequired',
  INVALID_VARIANT: 'invalidVariant',
  INSUFFICIENT_STOCK: 'insufficientStock',
};
```

- [ ] **Step 2: Fix `toUserError`.** Look up `ERROR_CODE_TO_KEY[error.message]`; if present, return `t('errors.' + key)`. Only if the code is unknown fall back to `t(fallbackKey)`. Never return the raw `error.message` code to the UI.

- [ ] **Step 3: Write the failing test.**

```ts
import { describe, it, expect, vi } from 'vitest';
vi.mock('@/auth', () => ({ auth: async () => null }));
// mock lib/cart addToCart to throw new Error('CART_FULL')
import { addItemAction } from '../actions';
it('should return the localized cart-full message, never the raw code', async () => {
  const res = await addItemAction('p1');
  expect('error' in res && res.error).toBeTruthy();
  expect((res as any).error).not.toMatch(/CART_FULL|cart\.errors\./);
});
```

- [ ] **Step 4 (#2): surface drawer action results.** In `components/cart/modal.tsx`, the `+/-`, `QtyInput`, and remove handlers (`:184`, `:198`, `:211`) currently `await updateItemAction(...)` and discard the result. Capture it: `const res = await updateItemAction(...); if ('error' in res) toast.error(res.error);` (use the existing `sonner` toast already imported for add-to-cart). Then `refresh()`.

- [ ] **Step 5 (#3): notice for dropped lines.** In `lib/cart.ts`, the `continue` at `:178`/`:191` silently drops unavailable lines. Have the cart-read path collect dropped line titles and expose them (return shape gains `removed: string[]`); the drawer shows a one-time localized "N items are no longer available and were removed" notice. Add `cart.itemsRemoved` key to both locales.

- [ ] **Step 6: Run** `node_modules/.bin/vitest run components/cart/__tests__/actions-errors.test.ts` — PASS.

- [ ] **Step 7: Commit** `fix(cart): surface real error messages instead of raw keys, notify on removed lines`

## Task 4: Fix variant selector states (out-of-stock label, toggle-off, qty cap, sticky-bar focus)

**Files:**
- Modify: `components/product/variant-selector.tsx`
- Modify: `components/cart/add-to-cart.tsx`
- Modify: `messages/en.json`, `messages/vi.json`
- Test: `components/product/__tests__/variant-selector.test.tsx`

- [ ] **Step 1 (#4): "Select an option" state.** Add `cart.selectOption` ("Select an option" / "Chọn phân loại") to both locales. In `add-to-cart.tsx:35`, the label logic must distinguish three states: no variant selected → `selectOption` (disabled), selected-but-out-of-stock → `outOfStock` (disabled), available → `addToCart`. Pass a `needsSelection` boolean from `variant-selector.tsx` (true when the product has variants and `selectedSku === null`).

- [ ] **Step 2 (#5): don't toggle the selected variant off.** In `variant-selector.tsx:221-225`, clicking the already-selected variant currently sets `selectedSku = null`. Remove the toggle: selecting a variant is idempotent; re-clicking keeps it selected.

- [ ] **Step 3 (#6): cap quantity to real stock.** In `variant-selector.tsx:70-73`, the max defaults to 99 when stock/variant is unknown. When a variant is selected, cap the quantity stepper at that variant's `inStock` count; when none is selected, disable the stepper (it is gated behind selection anyway per Step 1).

- [ ] **Step 4 (#7): fix the sticky-bar focus trap.** In `variant-selector.tsx:309-336`, the mobile sticky bar uses `aria-hidden={!showStickyBar}` while remaining in the DOM and tab order. Add `inert` (or toggle `hidden`/`display:none`, or set `tabIndex={-1}` + `pointer-events-none` and `visibility:hidden`) when `!showStickyBar` so its controls leave the tab order when the bar is off-screen.

- [ ] **Step 5: Write the failing tests.**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VariantSelector } from '../variant-selector';
// render with a variant product, no selection
it('should label the CTA "Select an option" before a variant is chosen', () => {
  render(<VariantSelector product={variantProduct} />);
  expect(screen.getByRole('button', { name: /select an option/i })).toBeDisabled();
});
it('should keep a variant selected when its button is clicked twice', async () => {
  render(<VariantSelector product={variantProduct} />);
  const btn = screen.getByRole('button', { name: /Large/i });
  await userEvent.click(btn); await userEvent.click(btn);
  expect(btn).toHaveAttribute('aria-pressed', 'true');
});
```
(Provide a minimal `variantProduct` fixture with two in-stock variants.)

- [ ] **Step 6: Run** `node_modules/.bin/vitest run components/product/__tests__/variant-selector.test.tsx` — PASS.

- [ ] **Step 7: Commit** `fix(product): correct variant CTA states, stock cap, and sticky-bar focus`

---

# Stream 3 — Search / Listing

## Task 5: Mobile filter access + sort label

**Files:**
- Modify: `components/layout/search/filter/facets.tsx`
- Modify: `components/layout/search/filter/dropdown.tsx`
- Create: mobile filter disclosure (a drawer/collapsible wrapper, e.g. `components/layout/search/filter/mobile-filter-drawer.tsx`)
- Modify: `lib/constants.ts` (defaultSort label)
- Test: `components/layout/search/filter/__tests__/facets.test.tsx`

- [ ] **Step 1 (#21): expose filters on mobile.** `facets.tsx:60` wraps everything in `hidden md:block`. Wrap the same facet content in a mobile disclosure: a "Filter" button (localized) that opens a drawer/sheet (reuse the existing cart-modal slide-over pattern or shadcn `Sheet` if present) containing the price/in-stock/clear controls. Desktop keeps the inline panel; mobile gets the drawer. Do not duplicate the facet markup — extract a `FacetControls` component consumed by both.

- [ ] **Step 2 (#22): fix the blank sort label.** In `dropdown.tsx:17,29-33`, `active` starts `''` and is only set when a `sort` param matches; `defaultSort.slug` is `null`. Initialize `active` to the default sort's label so the button always shows text.

- [ ] **Step 3: Test.**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SortDropdown } from '../dropdown';
it('should show the default sort label when no sort param is set', () => {
  render(<SortDropdown /* no active param */ />);
  expect(screen.getByRole('button').textContent?.trim().length).toBeGreaterThan(0);
});
```

- [ ] **Step 4: Run** `node_modules/.bin/vitest run components/layout/search/filter/__tests__/facets.test.tsx` — PASS.

- [ ] **Step 5: Commit** `fix(search): give mobile shoppers filter access and a labeled sort control`

## Task 6: Internationalize search chrome + fix empty state and doubled count

**Files:**
- Modify: `lib/constants.ts`, `components/layout/search/filter/facets.tsx`, `components/layout/search/collections-nav.tsx`, `components/layout/navbar/search.tsx`, `components/layout/search/empty-state.tsx`, `app/[locale]/(storefront)/search/page.tsx`, `app/[locale]/(storefront)/search/layout.tsx`
- Modify: `messages/en.json`, `messages/vi.json`
- Test: `components/layout/search/__tests__/search-i18n.test.ts`

- [ ] **Step 1 (#23): move sort labels out of `lib/constants.ts`.** `lib/constants.ts:10-22` hardcodes "Liên quan", "Bán chạy", etc. Constants can't call hooks, so store **slug + i18n key** in the constant and resolve the label at the component via `t('search.sort.<key>')`. Add `search.sort.*` keys to both locales (en: "Relevance", "Best selling", "Price: low to high", "Price: high to low"; vi: the existing strings). (Heed `tailwind-purges-lib-class-strings` / `tailwind-scans-lib-regex-breaks-css` — keep only plain data in `lib/`.)

- [ ] **Step 2 (#23): translate facet + category + navbar-search chrome.** Replace hardcoded "Lọc"/"Khoảng giá"/"Áp dụng"/"Chỉ còn hàng"/"Xóa bộ lọc" (`facets.tsx:61-110`), "Danh mục" (`collections-nav.tsx:32-42`), and the placeholder + aria-label (`navbar/search.tsx:99,108`) with `search.*` keys in both locales.

- [ ] **Step 3 (#26): locale-safe search redirects.** In `navbar/search.tsx:91,128`, replace bare `next/navigation` pushes with the i18n router.

- [ ] **Step 4 (#25 + #24): fix the empty state and doubled count.** In `empty-state.tsx:31,33`, use the existing `search.noResults` / `search.noFilterResults` keys (not the SEO `metaTitleWithQuery`), choose the message by whether filters are applied, and render the active filters (price/in-stock) with a "clear filters" link. In `search/page.tsx:94,100-103`, render the result-count phrase **once** (keep the `<h1>`, drop the duplicate paragraph or vice-versa).

- [ ] **Step 5: Guard test** (key parity for the `search` namespace + no VN diacritics in the touched component sources), same shape as Task 1 Step 5.

- [ ] **Step 6: Run** `node_modules/.bin/vitest run components/layout/search/__tests__/search-i18n.test.ts` — PASS.

- [ ] **Step 7: Commit** `feat(i18n): internationalize search chrome and fix empty/count states`

---

# Stream 4 — Profile / Orders

## Task 7: Order detail — i18n, delivery info, status colors, transfer status

**Files:**
- Modify: `app/[locale]/(storefront)/profile/orders/[orderCode]/page.tsx`
- Modify: `lib/profile-orders.ts`, `app/[locale]/(storefront)/profile/types.ts`
- Modify: `messages/en.json`, `messages/vi.json`
- Test: `lib/__tests__/profile-orders.test.ts`

- [ ] **Step 1 (#16 i18n): translate the order detail page.** Replace the metadata title (`:18`), status labels (`:24-31`), and body strings (`:118`, `:140-147`, `:184`) with `getTranslations`. Replace `toLocaleString('vi-VN')` (`:37`) with a locale-aware format using the active locale.

- [ ] **Step 2 (#16 delivery info): render shipping/payment/delivery.** The page renders none. Add a section showing the order's shipping address, payment method, and delivery method from the order record.

- [ ] **Step 3 (#17 status colors): distinguish pending vs delivered.** At `:124-130`, both non-cancelled branches resolve to `bg-emerald-100`. Map each status to a distinct palette: pending → amber, shipped → blue, delivered → emerald, cancelled → red. Extract a `statusStyle(status)` helper.

- [ ] **Step 4 (#15 transfer status): add the `PENDING_TRANSFER` branch.** `lib/payload-order-storefront.ts:23` produces `PENDING_TRANSFER`, but `lib/profile-orders.ts:8-30` and `profile/types.ts:10-17` omit it, collapsing it into "Pending". Add the status to the type union and the mapping, with a localized "Awaiting bank transfer" label; surface the transfer amount/instructions on the detail page.

- [ ] **Step 5: Test the status mapping.**

```ts
import { describe, it, expect } from 'vitest';
import { statusStyle, mapOrderStatus } from '../profile-orders';
it('should give pending and delivered different colors', () => {
  expect(statusStyle('PENDING')).not.toEqual(statusStyle('DELIVERED'));
});
it('should map PENDING_TRANSFER to its own status, not generic pending', () => {
  expect(mapOrderStatus('PENDING_TRANSFER')).toBe('PENDING_TRANSFER');
});
```

- [ ] **Step 6: Run** `node_modules/.bin/vitest run lib/__tests__/profile-orders.test.ts` — PASS.

- [ ] **Step 7: Commit** `fix(orders): translate order detail, show delivery info, distinguish statuses`

## Task 8: Reorder honesty, address edit, wishlist guest path

**Files:**
- Modify: `app/[locale]/(storefront)/profile/actions.ts`, `components/orders/reorder-button.tsx`
- Modify: `components/*/addresses-panel.tsx` (the address book UI)
- Modify: `app/[locale]/(storefront)/wishlist-actions.ts`, `components/wishlist/wishlist-button.tsx`
- Modify: `messages/en.json`, `messages/vi.json`
- Test: `app/[locale]/(storefront)/profile/__tests__/reorder.test.ts`

- [ ] **Step 1 (#18): honest reorder result.** `profile/actions.ts:211-217` returns `ok` when `added >= 1`. Return the counts: `{ added, total, skipped }`. In `reorder-button.tsx:25`, toast localized "Added N of M items — the rest are no longer available" when `skipped > 0`, and the plain success only when `skipped === 0`. Add `profile.reorderPartial` key (both locales).

- [ ] **Step 2 (#19): address edit path.** Add `updateAddressAction(id, data)` to `profile/actions.ts` (mirror `createAddressAction` validation, preserve default status). Wire an "Edit" button in `addresses-panel.tsx` that opens the address form pre-filled and calls the update action.

- [ ] **Step 3 (#20): wishlist guest path + i18n.** In `wishlist-button.tsx`, the guest error toast (`:35-37`) is a dead end and the copy (`:38,56-73`) is hardcoded VN. Translate all wishlist button strings; when `wishlist-actions.ts:18` returns the not-logged-in error, show a toast with a **login link** (localized "Sign in to save items") routing to the locale-prefixed `/login`.

- [ ] **Step 4: Reorder test.**

```ts
import { describe, it, expect } from 'vitest';
import { computeReorderResult } from '../actions'; // extract pure counter if needed
it('should report skipped items when some lines are unpurchasable', () => {
  const r = computeReorderResult([{ ok: true }, { ok: false }, { ok: true }] as any);
  expect(r).toEqual({ added: 2, total: 3, skipped: 1 });
});
```

- [ ] **Step 5: Run** `node_modules/.bin/vitest run app/[locale]/(storefront)/profile/__tests__/reorder.test.ts` — PASS.

- [ ] **Step 6: Commit** `fix(profile): honest reorder feedback, address editing, wishlist guest login link`

---

# Stream 5 — Polish / Forms

## Task 9: Badges, review UX, registration, hero LCP

**Files:**
- Modify: `components/product/product-card.tsx`, `lib/categories.ts`
- Modify: `components/product/reviews.tsx`, `components/product/review-form.tsx`
- Modify: `components/auth-form.tsx`
- Modify: `app/[locale]/(storefront)/reset-password/reset-password-form.tsx`
- Modify: the homepage hero component (image tiles)
- Modify: `messages/en.json`, `messages/vi.json`
- Test: `components/product/__tests__/product-card.test.tsx`

- [ ] **Step 1 (#30): fix the badge key mismatch + i18n.** `product-card.tsx:24-30` keys `BADGE_CLASSES` on `'new-arrival'` but `lib/categories.ts:67-70` emits `'new'`. Align the keys (use `'new'`), so the New badge gets its intended high-contrast style. Replace hardcoded "Mới"/"Hết hàng" with `product.badge.new` / `product.badge.soldOut` keys (both locales).

- [ ] **Step 2 (#29): locale-aware review dates.** `reviews.tsx:15` hardcodes `vi-VN`. Format with the active locale via `useLocale()` / `useFormatter()`.

- [ ] **Step 3 (#28): review submit hint.** `review-form.tsx:106` disables submit until `rating > 0` with no hint. Add localized helper text near the submit ("Select a star rating to submit") shown while `rating === 0`.

- [ ] **Step 4 (#27): confirm-password + rule.** `auth-form.tsx:145-154` has one password input, `minLength={8}` only. Add a confirm-password field, validate equality client-side with a localized mismatch message, and show the "at least 8 characters" rule as helper text.

- [ ] **Step 5 (#26 reset): locale-safe reset redirect.** `reset-password-form.tsx:42` `router.push('/login')` (bare) → use the i18n router.

- [ ] **Step 6 (LCP): prioritize above-the-fold hero images.** The homepage hero tiles render `loading="lazy"` with no priority (confirmed on the deploy). Add `priority` (Next `<Image priority>`, which emits `fetchpriority="high"` and drops lazy) to the first-screen hero images only; leave below-the-fold tiles lazy.

- [ ] **Step 7: Badge test.**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProductCard } from '../product-card';
it('should apply the new-badge style, not the fallback, for a new product', () => {
  render(<ProductCard product={{ /* fixture with badge: 'new' */ }} />);
  const badge = screen.getByText(/new|mới/i);
  expect(badge.className).not.toMatch(/warm-200/); // fallback class must not apply
});
```

- [ ] **Step 8: Run** `node_modules/.bin/vitest run components/product/__tests__/product-card.test.tsx` — PASS.

- [ ] **Step 9: Commit** `fix(ux): badge style, review hints, register confirm-password, hero LCP`

---

## Final verification

- [ ] Run the full suite: `node_modules/.bin/vitest run` — all green.
- [ ] Type check: `node_modules/.bin/tsc --noEmit` — no errors (watch `getpayload-sanitizes-block-defs` / generate:types gotchas only if collections changed — they aren't here).
- [ ] `grep` the touched storefront components for residual JSX Vietnamese diacritics — none outside `messages/vi.json`.
- [ ] Re-probe the deploy: `/en/checkout`, `/en/search`, `/en/profile/orders/*` render English; unquotable region blocks; PayOS cancel returns a populated cart.
- [ ] Confirm `messages/en.json` and `messages/vi.json` have identical key trees for every namespace touched.

## Coverage map (spec finding → task)

- #1,2,3 → Task 3 · #4,5,6,7 → Task 4 · #8 → Task 1 · #9,10,11,12,13,14 → Task 2
- #15,16,17 → Task 7 · #18,19,20 → Task 8 · #21,22 → Task 5 · #23,24,25 → Task 6
- #26 → split across the file that owns each redirect (Tasks 1, 6, 9) · #27,28,29,30,LCP → Task 9
