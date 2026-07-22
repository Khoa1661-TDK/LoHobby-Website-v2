# UX Round 3 — Phase 3: `/en` Internationalization Pass — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the checkout form, order detail page, search filters/sort, wishlist, review dates, and product badges render in the visitor's language instead of hardcoded Vietnamese.

**Architecture:** Extract hardcoded Vietnamese strings into `messages/en.json` + `messages/vi.json` and read them via next-intl (`useTranslations` in client components, `getTranslations` in server components/route handlers). Two findings carry logic (product-badge key alignment, locale-aware review dates) and get Vitest tests; the rest is mechanical string extraction driven by the key tables in each task. **A mandatory CMS-preview verification gate runs at the end** because several rethemed shared components gain translation calls.

**Tech Stack:** Next.js 15, next-intl (`messages/*.json`, `useTranslations`, `getTranslations`, `useLocale`), Vitest.

## Global Constraints

- **CMS / page-builder preview must keep working.** Components that gain `useTranslations` (`product-card.tsx`, and any shared block component) are rendered in the storefront AND the page-builder preview (`app/[locale]/build/[slug]/preview/page.tsx`, `.../preview/block/page.tsx`) — both already wrap `NextIntlClientProvider`, so this is safe. **After the final task, load a live preview and confirm blocks render** (verification gate). No task may introduce a render path lacking the provider.
- **Every extracted string is defined in BOTH `messages/en.json` and `messages/vi.json`** under the namespace named in each task. The VI value is the exact string being replaced (copy it verbatim). The EN value is its translation.
- **Reuse existing namespaces:** `checkout`, `checkout.apiErrors` (new sub-namespace), `search`, `wishlist`, `profile`, `product`.
- **Vitest test files MUST import `describe/expect/it` from `vitest`.**
- **Conventional Commits**, atomic. Commit directly to `main`.

> **Carried over from Phase 1 (user decision 2026-07-22):** Phase 1 Task 1 rewired
> `toUserError` (`components/cart/actions.ts`) to suppress ALL raw thrown messages to
> close a raw-code leak. Side effect: the already-localized **VN-only** stock sentences
> thrown by `assertCartLineStock` → `resolveCheckoutLines` (`lib/inventory.ts:86-135`,
> e.g. `"X" chỉ còn 3 sản phẩm.`, `"X" đã hết hàng.`, `Vui lòng chọn biến thể...`) no
> longer reach the shopper — cart add/update stock failures now collapse to the generic
> `cart.errors.addFailed` / `cart.errors.updateFailed`. **Restore specific stock messaging
> here, properly localized:** have `resolveCheckoutLines`/`assertCartLineStock` return a
> code + params (e.g. `INSUFFICIENT_STOCK` with `{name, stock}`) instead of a baked VN
> sentence, add `cart.errors.insufficientStock` / `outOfStock` / `variantRequired`
> translation keys with interpolated `{name}`/`{stock}`, and have `toUserError` map them.
> The dead `INSUFFICIENT_STOCK` entry already present in `lib/cart-error-messages.ts` is
> the placeholder for this. Add this as a task in this phase.

---

## File Structure

- `components/checkout-form.tsx` — MODIFY: `useTranslations('checkout')` + `useLocale`; replace ~48 strings (Task 1, 2).
- `app/api/checkout/route.ts` — MODIFY: localize error responses via `getTranslations` (Task 2).
- `app/[locale]/(storefront)/profile/orders/[orderCode]/page.tsx` — MODIFY: `getTranslations`; add shipping/payment/delivery block (Task 3).
- `lib/constants.ts` — MODIFY: sort labels become keys, resolved in UI (Task 4).
- `app/[locale]/(storefront)/search/layout.tsx`, `components/layout/search/filter/facets.tsx`, `components/layout/search/filter/collections-nav.tsx`, `components/layout/navbar/search.tsx` — MODIFY: extract strings (Task 4).
- `components/wishlist/wishlist-button.tsx`, `app/[locale]/(storefront)/wishlist-actions.ts` — MODIFY: translate + guest login link (Task 5).
- `components/product/reviews.tsx` — MODIFY: locale-aware date (Task 6).
- `lib/review-date.ts` + test — CREATE (Task 6).
- `components/product/product-card.tsx`, `lib/categories.ts` — MODIFY: badge key/label fix (Task 7).
- `lib/__tests__/product-badge.test.ts` — CREATE (Task 7).
- `messages/en.json`, `messages/vi.json` — MODIFY (every task).

---

## Task 1: Localize the checkout form — client strings (finding 3.1a)

`components/checkout-form.tsx` has no `useTranslations` and hardcodes ~48 Vietnamese strings. Add the hook and replace each string per the key table. Add all keys under the existing `checkout` namespace.

**Files:**
- Modify: `components/checkout-form.tsx`
- Modify: `messages/en.json`, `messages/vi.json` (new keys under `checkout`)

**Interfaces:** none (internal copy only).

**Key table** (namespace `checkout`; `src` = source line in `checkout-form.tsx`; VI = verbatim existing string):

| key | src | VI (paste verbatim) | EN |
|-----|-----|-----|-----|
| `errCartEmpty` | 186 | Giỏ hàng trống. | Your cart is empty. |
| `errName` | 196 | Vui lòng nhập họ tên. | Please enter your full name. |
| `errEmail` | 200 | Vui lòng nhập email hợp lệ để nhận xác nhận đơn hàng. | Please enter a valid email to receive your order confirmation. |
| `errPhone` | 204 | Vui lòng nhập số điện thoại. | Please enter your phone number. |
| `errAddress` | 208 | Vui lòng nhập địa chỉ giao hàng. | Please enter your delivery address. |
| `errPayment` | 212 | Vui lòng chọn hình thức thanh toán. | Please choose a payment method. |
| `errPayFailed` | 248 | Thanh toán thất bại. Vui lòng thử lại. | Payment failed. Please try again. |
| `errGeneric` | 261 | Đã xảy ra lỗi | Something went wrong. |
| `contactTitle` | 279 | Thông tin liên hệ | Contact details |
| `contactSubtitle` | 279 | Để chúng tôi liên hệ về đơn hàng này. | So we can reach you about this order. |
| `savedAddressLabel` | 282 | Dùng địa chỉ đã lưu | Use a saved address |
| `newAddressOption` | 297 | Nhập địa chỉ mới… | Enter a new address… |
| `defaultSuffix` | 301 | (mặc định) | (default) |
| `nameLabel` | 313 | Họ tên | Full name |
| `phoneLabel` | 324 | Số điện thoại | Phone number |
| `deliveryTitle` | 360 | Hình thức giao hàng | Delivery method |
| `deliverySubtitle` | 360 | Chọn nơi bạn muốn nhận hàng. | Choose where you want to receive your order. |
| `homeDeliveryTitle` | 368 | Giao tận nhà | Home delivery |
| `pickupTitle` | 383 | Nhận tại cửa hàng | Store pickup |
| `pickupLocation` | 396 | Địa điểm nhận hàng | Pickup location |
| `addressLabel` | 409 | Địa chỉ giao hàng | Delivery address |
| `addressPlaceholder` | 417 | Số nhà, phường, quận, tỉnh/thành | Street, ward, district, province/city |
| `couponTitle` | 425 | Mã giảm giá | Discount code |
| `couponSubtitle` | 425 | Nhập mã nếu bạn có (áp dụng khi đặt hàng). | Enter a code if you have one (applied at checkout). |
| `couponLabel` | 426 | Mã coupon | Coupon code |
| `giftCardTitle` | 438 | Thẻ quà tặng | Gift card |
| `giftCardSubtitle` | 438 | Nhập mã thẻ quà tặng nếu bạn có (áp dụng khi đặt hàng). | Enter a gift card code if you have one (applied at checkout). |
| `giftCardLabel` | 439 | Mã thẻ quà tặng | Gift card code |
| `paymentTitle` | 452 | Hình thức thanh toán | Payment method |
| `paymentSubtitle` | 452 | Chọn cách bạn muốn thanh toán. | Choose how you want to pay. |
| `summaryTitle` | 499 | Tóm tắt đơn hàng | Order summary |
| `summaryEmpty` | 503 | Giỏ hàng trống. | Your cart is empty. |
| `subtotalLabel` | 525 | Tạm tính | Subtotal |
| `shippingLabel` | 534 | Phí vận chuyển | Shipping |
| `discountRow` | 557 | Mã giảm giá | Discount code |
| `giftCardRow` | 563 | Thẻ quà tặng | Gift card |
| `totalEstimated` | 568 | Tổng cộng (ước tính) | Total (estimated) |
| `totalHint` | 574 | Giảm giá coupon và thẻ quà tặng được xác nhận khi đặt hàng. Tổng cuối có thể thay đổi. | Coupon and gift-card discounts are confirmed at checkout. The final total may change. |
| `submitting` | 584 | Đang đặt hàng… | Placing order… |
| `submitGateway` | 586 | Tiếp tục thanh toán | Continue to payment |
| `submitOrder` | 587 | Đặt hàng | Place order |
| `hintGateway` | 592 | Bạn sẽ được chuyển đến cổng thanh toán để hoàn tất. | You'll be redirected to the payment gateway to finish. |
| `hintTransfer` | 594 | Chúng tôi sẽ hiển thị thông tin chuyển khoản sau khi đặt hàng. | We'll show bank-transfer details after you place the order. |
| `hintCod` | 595 | Chúng tôi sẽ thu tiền mặt khi giao hàng. | We'll collect cash on delivery. |
| `payGateway` | 818 | Thanh toán online qua cổng thanh toán. | Pay online via the payment gateway. |
| `payTransfer` | 820 | Chuyển khoản ngân hàng theo thông tin hiển thị sau khi đặt hàng. | Bank transfer using the details shown after you order. |
| `payCod` | 822 | Trả tiền mặt khi nhận hàng. | Pay cash when your order arrives. |

Note: `freePickup` / `freeShipping` (lines 537/539) were added in Phase-1 Task 5 — reuse those keys, do not duplicate. The shipping free-threshold interpolation at line 371 uses `shipping.freeShippingThresholdVnd`; convert it to `t('freeThresholdHint', { amount })` with EN `"Free over {amount}₫"` / VI `"Miễn phí từ {amount}₫"`.

- [ ] **Step 1: Add the `checkout` keys to both message files** using the table above (EN → `en.json`, VI verbatim → `vi.json`).

- [ ] **Step 2: Add the translations hook** at the top of the `CheckoutForm` component body (after `const router = useRouter();`, line 103):

```typescript
import { useTranslations } from 'next-intl'; // add to imports
// inside the component:
const t = useTranslations('checkout');
```

- [ ] **Step 3: Replace each hardcoded string** with its `t('<key>')` call per the table. Example (line 279):

```tsx
<Section title={t('contactTitle')} subtitle={t('contactSubtitle')}>
```

For the validation strings (lines 186–212), replace the `setError('...')` / thrown literals with `t('<key>')`. For interpolated strings use the `{ amount }` form shown above.

- [ ] **Step 4: Typecheck** — `./node_modules/.bin/tsc --noEmit`. Expected: no errors.

- [ ] **Step 5: Verify no Vietnamese literals remain in the file**

Run: `grep -nE "[À-ỹĐđ]" components/checkout-form.tsx`
Expected: no matches (all moved to messages).

- [ ] **Step 6: Commit**

```bash
git add components/checkout-form.tsx messages/en.json messages/vi.json
git commit -m "i18n(checkout): localize the checkout form copy"
```

---

## Task 2: Localize the checkout API errors (finding 3.1b)

`app/api/checkout/route.ts` returns hardcoded Vietnamese `{ error }` strings (lines 181–495) that `checkout-form.tsx:246` surfaces verbatim. Localize them by passing the locale in the request body and resolving via `getTranslations`.

**Files:**
- Modify: `components/checkout-form.tsx` (send `locale` in the POST body)
- Modify: `app/api/checkout/route.ts` (resolve `checkout.apiErrors` by locale)
- Modify: `messages/en.json`, `messages/vi.json` (new `checkout.apiErrors` namespace)

**Key table** (namespace `checkout.apiErrors`):

| key | src | VI | EN |
|-----|-----|-----|-----|
| `invalidPayload` | 181 | Dữ liệu thanh toán không hợp lệ | Invalid checkout data. |
| `addressRequired` | 211 | Địa chỉ giao hàng là bắt buộc khi giao tận nhà | A delivery address is required for home delivery. |
| `itemUnavailable` | 220,227 | Một sản phẩm trong giỏ hàng không còn bán. Hãy cập nhật giỏ hàng và thử lại. | An item in your cart is no longer available. Update your cart and try again. |
| `giftCardUnavailable` | 293 | Thẻ quà tặng hiện không khả dụng. | Gift cards are currently unavailable. |
| `invalidTotal` | 306 | Tổng tiền không hợp lệ | Invalid order total. |
| `paymentUnavailable` | 312 | Hình thức thanh toán không khả dụng. | That payment method is unavailable. |
| `gatewayNotConfigured` | 428 | Cổng thanh toán chưa được cấu hình. | The payment gateway is not configured. |
| `linkFailed` | 486 | Không thể tạo liên kết thanh toán. | Could not create the payment link. |
| `orderCodeFailed` | 495 | Không thể tạo mã đơn hàng | Could not generate an order code. |

(Line 440 `'Sản phẩm'` is a PayOS line-item label, not a user error — translate it too as `apiErrors.itemLabel` EN "Item" / VI "Sản phẩm", or leave it; it is shown on the PayOS page, so keep VI. Skip it.)

- [ ] **Step 1: Add the `checkout.apiErrors` keys** to both message files from the table.

- [ ] **Step 2: Send the locale from the client.** In `components/checkout-form.tsx`, import `useLocale` and include it in the POST body:

```typescript
import { useLocale } from 'next-intl';
// in the component:
const locale = useLocale();
// in the fetch body object (after `anonId,`):
locale,
```

- [ ] **Step 3: Resolve translations in the route handler.** In `app/api/checkout/route.ts`, after parsing the body, read the locale and build a translator:

```typescript
import { getTranslations } from 'next-intl/server';
// after body parse, defaulting to 'vi':
const locale = typeof body?.locale === 'string' ? body.locale : 'vi';
const te = await getTranslations({ locale, namespace: 'checkout.apiErrors' });
```

Replace each hardcoded error literal with `te('<key>')`, e.g. line 181:

```typescript
return NextResponse.json({ error: te('invalidPayload') }, { status: 400 });
```

Place the `te` construction before the first error return (the initial validation at 181 may run before body parse — move locale extraction as early as safe, defaulting to `'vi'` if the body is unparseable).

- [ ] **Step 4: Typecheck** — `./node_modules/.bin/tsc --noEmit`. Expected: no errors.

- [ ] **Step 5: Verify no Vietnamese error literals remain** (line 440 label excepted)

Run: `grep -nE "error: '[^']*[À-ỹĐđ]" app/api/checkout/route.ts`
Expected: no matches.

- [ ] **Step 6: Commit**

```bash
git add components/checkout-form.tsx app/api/checkout/route.ts messages/en.json messages/vi.json
git commit -m "i18n(checkout): localize checkout API error responses"
```

---

## Task 3: Localize and complete the order detail page (finding 3.2)

`app/[locale]/(storefront)/profile/orders/[orderCode]/page.tsx` is fully hardcoded Vietnamese (metadata title, status labels lines 25–48, section headings 143–157) and renders no shipping address / payment method / delivery method. Localize it and add the missing delivery info.

**Files:**
- Modify: `app/[locale]/(storefront)/profile/orders/[orderCode]/page.tsx`
- Modify: `messages/en.json`, `messages/vi.json` (`profile.orderDetail.*`)

**Approach:** This page is a server component — use `getTranslations`. Reuse the `checkout.statusLabels` map from Phase-1 Task 7 for status names via `orderStatusLabelKey` rather than the local hardcoded ternaries (lines 24–31, 44–48). Add a delivery/payment block from the `ProfileOrder` fields already available (`shippingAddress`, `paymentMethod`, `deliveryMethod` — see `profile/types.ts:25-32`).

**Key table** (namespace `profile.orderDetail`):

| key | src | VI | EN |
|-----|-----|-----|-----|
| `metaTitle` | 18 | Chi tiết đơn hàng | Order details |
| `stageOrdered` | 143 | Đặt hàng | Ordered |
| `stagePayment` | 145 | Thanh toán | Payment |
| `stageDelivery` | 147 | Giao hàng | Delivery |
| `stageDone` | 148 | Hoàn tất | Complete |
| `itemsHeading` | 157 | Sản phẩm | Items |
| `shippingHeading` | new | — | Shipping address |
| `paymentHeading` | new | — | Payment method |
| `deliveryHeading` | new | — | Delivery method |
| `deliveryShipment` | new | — | Home delivery |
| `deliveryPickup` | new | — | Store pickup |
| `paymentCod` | new | — | Cash on delivery |
| `paymentOnline` | new | — | Online payment |

(For VI of the new keys: `shippingHeading` "Địa chỉ giao hàng", `paymentHeading` "Phương thức thanh toán", `deliveryHeading` "Hình thức giao hàng", `deliveryShipment` "Giao tận nhà", `deliveryPickup` "Nhận tại cửa hàng", `paymentCod` "Thanh toán khi nhận hàng", `paymentOnline` "Thanh toán online".)

- [ ] **Step 1: Add the `profile.orderDetail` keys** to both message files.

- [ ] **Step 2: Add `getTranslations`** at the top of the page component:

```typescript
import { getTranslations } from 'next-intl/server';
import { orderStatusLabelKey } from '@/lib/order-status-labels';
// inside the async component:
const t = await getTranslations('profile.orderDetail');
const ts = await getTranslations('checkout.statusLabels');
```

Replace the status-label ternaries (lines 24–31, 44–48) with `ts(orderStatusLabelKey(order.status))`. Replace each heading/label literal per the table.

- [ ] **Step 3: Fix the date locale.** Line 37 uses `toLocaleString('vi-VN')`. Replace with the active locale:

```typescript
import { useLocale } from 'next-intl'; // NOTE: server component — use getLocale
import { getLocale } from 'next-intl/server';
const locale = await getLocale();
// then: value.toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US')
```

- [ ] **Step 4: Add the delivery/payment block.** Below the items section, render a definition list from `order` fields (the loader `loadProfileOrders` already returns `shippingAddress`, `paymentMethod`, `deliveryMethod`; confirm this detail page loads the same shape — if it loads a raw Payload doc, map the fields). Render:

```tsx
<dl className="mt-6 space-y-2 rounded-2xl border border-line bg-surface-raised p-5 text-sm">
  {order.deliveryMethod && (
    <div className="flex justify-between border-b py-2">
      <dt>{t('deliveryHeading')}</dt>
      <dd>{order.deliveryMethod === 'PICKUP' ? t('deliveryPickup') : t('deliveryShipment')}</dd>
    </div>
  )}
  {order.paymentMethod && (
    <div className="flex justify-between border-b py-2">
      <dt>{t('paymentHeading')}</dt>
      <dd>{order.paymentMethod === 'COD' ? t('paymentCod') : t('paymentOnline')}</dd>
    </div>
  )}
  {order.shippingAddress && (
    <div className="flex justify-between border-b py-2">
      <dt>{t('shippingHeading')}</dt>
      <dd className="text-right">{order.shippingAddress}</dd>
    </div>
  )}
</dl>
```

(Adjust field access to whatever this page's order object actually exposes — read the page's data-loading call first and match its shape.)

- [ ] **Step 5: Typecheck + no-VN check**

Run: `./node_modules/.bin/tsc --noEmit && grep -nE "[À-ỹĐđ]" "app/[locale]/(storefront)/profile/orders/[orderCode]/page.tsx"`
Expected: no type errors; no VN literals.

- [ ] **Step 6: Commit**

```bash
git add "app/[locale]/(storefront)/profile/orders/[orderCode]/page.tsx" messages/en.json messages/vi.json
git commit -m "i18n(orders): localize the order detail page and show delivery info"
```

---

## Task 4: Localize search sort, filter, and category labels (finding 3.3)

Sort labels live in `lib/constants.ts` (hardcoded VN), used by the sort dropdown; filter labels are in `facets.tsx`; the sort title in `search/layout.tsx`; the search placeholder/aria in `navbar/search.tsx`. Because `lib/constants.ts` is not a component, convert its sort entries to carry a **label key** and resolve the key in the UI (do not call `useTranslations` in `lib/`).

**Files:**
- Modify: `lib/constants.ts` (replace `title` strings with `labelKey`)
- Modify: the sort dropdown consumer + `search/layout.tsx`, `facets.tsx`, `collections-nav.tsx`, `navbar/search.tsx`
- Modify: `messages/en.json`, `messages/vi.json` (`search.sort.*`, `search.filter.*`)

**Key tables:**

`search.sort`:

| key | VI | EN |
|-----|-----|-----|
| `relevance` | Liên quan | Relevance |
| `bestSelling` | Bán chạy | Best selling |
| `newest` | Hàng mới về | Newest |
| `priceAsc` | Giá: Thấp đến cao | Price: low to high |
| `priceDesc` | Giá: Cao đến thấp | Price: high to low |

`search.filter`:

| key | src | VI | EN |
|-----|-----|-----|-----|
| `title` | facets 61 | Lọc | Filter |
| `priceRange` | facets 64 | Khoảng giá (đ) | Price range (₫) |
| `from` | facets 72 | Từ | From |
| `to` | facets 82 | Đến | To |
| `apply` | facets (Áp dụng) | Áp dụng | Apply |
| `inStockOnly` | facets (Chỉ còn hàng) | Chỉ còn hàng | In stock only |
| `clear` | facets (Xóa bộ lọc) | Xóa bộ lọc | Clear filters |
| `sortTitle` | layout 30 | Sắp xếp | Sort |
| `categories` | collections-nav (Danh mục) | Danh mục | Categories |

(`navbar/search.tsx` placeholder + aria at lines 99/108 — add `search.placeholder` / `search.ariaLabel`; grep the file for the exact VI strings and add matching keys.)

- [ ] **Step 1: Add `search.sort` and `search.filter` keys** to both message files.

- [ ] **Step 2: Convert `lib/constants.ts` sort entries.** Replace each `title: 'Liên quan'` etc. (lines 10–21) with `labelKey: 'relevance'` etc. Update the `SortFilterItem` type: replace `title: string` with `labelKey: string`. (This is a type change — Step 4 fixes consumers.)

- [ ] **Step 3: Resolve the label key in the sort dropdown.** Find the component rendering the sort list (search `sorting` / `SortFilterItem` usages, likely `components/layout/search/filter/dropdown.tsx` and `.../item.tsx`). Where it rendered `item.title`, render `t(`sort.${item.labelKey}`)` with `const t = useTranslations('search');`.

- [ ] **Step 4: Extract the remaining component strings** per the `search.filter` table: `facets.tsx` (`useTranslations('search')`, replace `Lọc`, `Khoảng giá (đ)`, `Từ`, `Đến`, `Áp dụng`, `Chỉ còn hàng`, `Xóa bộ lọc`), `search/layout.tsx` line 30 (`Sắp xếp` → `t('filter.sortTitle')`; note layout is a server component — use `getTranslations`), `collections-nav.tsx` (`Danh mục`), `navbar/search.tsx` (placeholder + aria).

- [ ] **Step 5: Typecheck + no-VN check across the touched files**

Run: `./node_modules/.bin/tsc --noEmit && grep -rnE "[À-ỹĐđ]" lib/constants.ts components/layout/search/filter "app/[locale]/(storefront)/search/layout.tsx" components/layout/navbar/search.tsx`
Expected: no type errors; no VN literals.

- [ ] **Step 6: Commit**

```bash
git add lib/constants.ts components/layout/search "app/[locale]/(storefront)/search/layout.tsx" components/layout/navbar/search.tsx messages/en.json messages/vi.json
git commit -m "i18n(search): localize sort, filter, and category labels"
```

---

## Task 5: Localize the wishlist button and fix the guest dead-end (finding 3.4)

`components/wishlist/wishlist-button.tsx` hardcodes its aria-labels, title, inline label, and toasts (lines 40, 56–57, 75). A guest tap returns a bare error string (`wishlist-actions.ts:18`) with no way forward. Translate everything and give guests a login link.

**Files:**
- Modify: `components/wishlist/wishlist-button.tsx`
- Modify: `app/[locale]/(storefront)/wishlist-actions.ts` (return a `needsAuth` flag)
- Modify: `messages/en.json`, `messages/vi.json` (`wishlist.*`)

**Key table** (namespace `wishlist`):

| key | src | VI | EN |
|-----|-----|-----|-----|
| `savedToast` | wb 40 | Đã lưu vào yêu thích | Saved to your wishlist |
| `removedToast` | wb 40 | Đã bỏ khỏi yêu thích | Removed from your wishlist |
| `removeAria` | wb 56 | Bỏ khỏi danh sách yêu thích | Remove from wishlist |
| `saveAria` | wb 56 | Lưu vào danh sách yêu thích | Save to wishlist |
| `removeTitle` | wb 57 | Bỏ khỏi yêu thích | Remove from wishlist |
| `saveTitle` | wb 57 | Lưu vào yêu thích | Save to wishlist |
| `savedLabel` | wb 75 | Đã lưu | Saved |
| `saveLabel` | wb 75 | Lưu sản phẩm | Save item |
| `needAuth` | wa 18 | Bạn cần đăng nhập để lưu sản phẩm. | Sign in to save items to your wishlist. |
| `invalidProduct` | wa 22 | Sản phẩm không hợp lệ. | Invalid product. |
| `updateFailed` | wa 44 | Không thể cập nhật danh sách yêu thích. | Could not update your wishlist. |
| `signInCta` | new | Đăng nhập | Sign in |

- [ ] **Step 1: Add the `wishlist` keys** to both message files.

- [ ] **Step 2: Return a `needsAuth` flag from the action.** In `wishlist-actions.ts`, change the guest-branch return (line 18) so the client can distinguish auth failures from generic ones — return the message key instead of a localized string, e.g. `{ ok: false, code: 'needAuth' }`. Do the same for the other two (`invalidProduct`, `updateFailed` → `code`). Update the action's return type to `{ ok: true } | { ok: false; code: string }`.

- [ ] **Step 3: Translate the button and add the login link.** In `wishlist-button.tsx`, add `const t = useTranslations('wishlist');` and replace the literals per the table. On an `!ok && code === 'needAuth'` result, show a toast with an action linking to login:

```tsx
import { useRouter } from '@/i18n/navigation';
// on needAuth:
toast.error(t('needAuth'), {
  action: { label: t('signInCta'), onClick: () => router.push('/login') },
});
// other codes:
toast.error(t(code));
```

- [ ] **Step 4: Typecheck + no-VN check**

Run: `./node_modules/.bin/tsc --noEmit && grep -nE "[À-ỹĐđ]" components/wishlist/wishlist-button.tsx "app/[locale]/(storefront)/wishlist-actions.ts"`
Expected: no type errors; no VN literals.

- [ ] **Step 5: Commit**

```bash
git add components/wishlist/wishlist-button.tsx "app/[locale]/(storefront)/wishlist-actions.ts" messages/en.json messages/vi.json
git commit -m "i18n(wishlist): localize the wishlist button and add a guest login link"
```

---

## Task 6: Locale-aware review dates (finding 3.5)

`components/product/reviews.tsx:15` formats every review date with `toLocaleDateString('vi-VN', ...)`. Extract a pure helper and pass the active locale.

**Files:**
- Create: `lib/review-date.ts`, `lib/__tests__/review-date.test.ts`
- Modify: `components/product/reviews.tsx`

**Interfaces:**
- Produces: `formatReviewDate(value: string, locale: string): string`.

- [ ] **Step 1: Write the failing test**

```typescript
// lib/__tests__/review-date.test.ts
import { describe, expect, it } from 'vitest';
import { formatReviewDate } from '@/lib/review-date';

describe('formatReviewDate', () => {
  it('should format with the Vietnamese locale', () => {
    const out = formatReviewDate('2026-03-15T00:00:00Z', 'vi');
    expect(out).toMatch(/2026/);
  });
  it('should format with the English locale differently from Vietnamese', () => {
    const en = formatReviewDate('2026-03-15T00:00:00Z', 'en');
    const vi = formatReviewDate('2026-03-15T00:00:00Z', 'vi');
    expect(en).toMatch(/2026/);
    // en-US medium date includes an English month abbreviation
    expect(en).not.toBe(vi);
  });
});
```

- [ ] **Step 2: Run test to verify it fails** — `./node_modules/.bin/vitest run lib/__tests__/review-date.test.ts`. Expected: FAIL (cannot resolve import).

- [ ] **Step 3: Implement**

```typescript
// lib/review-date.ts
/** Formats a review timestamp using the active storefront locale (finding 3.5). */
export function formatReviewDate(value: string, locale: string): string {
  const intlLocale = locale === 'vi' ? 'vi-VN' : 'en-US';
  return new Date(value).toLocaleDateString(intlLocale, { dateStyle: 'medium' });
}
```

- [ ] **Step 4: Run test to verify it passes** — same command. Expected: PASS.

- [ ] **Step 5: Use it in the component.** In `reviews.tsx`, add `const locale = useLocale();` (`import { useLocale } from 'next-intl'`) and replace the line-15 formatter body with `return formatReviewDate(value, locale);`, threading `locale` into whatever helper wraps line 15. Import `formatReviewDate`.

- [ ] **Step 6: Typecheck + tests** — `./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/vitest run lib/__tests__/review-date.test.ts`. Expected: no errors; PASS.

- [ ] **Step 7: Commit**

```bash
git add lib/review-date.ts lib/__tests__/review-date.test.ts components/product/reviews.tsx
git commit -m "i18n(reviews): format review dates by active locale"
```

---

## Task 7: Fix the product-card badge key mismatch and translate labels (finding 3.6)

`product-card.tsx:34` calls `getProductBadge` which returns `'new' | 'sold-out'` (`lib/categories.ts:66-70`), but line 74 looks the badge up in a LOCAL `BADGE_CLASSES` map keyed by `'new-arrival' | 'best-seller' | …` — so `'new'` misses and falls through to the washed-out `bg-warm-200` fallback. The label at line 77 uses `BADGE_LABELS[badge]`, which is hardcoded Vietnamese. Fix: use the correctly-keyed `BADGE_STYLES` (already imported) and translate the label.

**Files:**
- Create: `lib/__tests__/product-badge.test.ts`
- Modify: `components/product/product-card.tsx`
- Modify: `lib/categories.ts` (keep `BADGE_STYLES`; the VN `BADGE_LABELS` is superseded by translations)
- Modify: `messages/en.json`, `messages/vi.json` (`product.badgeNew`, `product.badgeSoldOut`)

**Interfaces:**
- Consumes: `getProductBadge(tags): 'new' | 'sold-out' | null` and `BADGE_STYLES` from `lib/categories.ts`.

- [ ] **Step 1: Write the failing test (guards the key alignment)**

```typescript
// lib/__tests__/product-badge.test.ts
import { describe, expect, it } from 'vitest';
import { getProductBadge, BADGE_STYLES } from '@/lib/categories';

describe('product badge styling', () => {
  it('should return a badge for the new and sold-out tags', () => {
    expect(getProductBadge(['new'])).toBe('new');
    expect(getProductBadge(['sold-out'])).toBe('sold-out');
    expect(getProductBadge(['whatever'])).toBeNull();
  });

  it('should have a style entry for every badge getProductBadge can return', () => {
    for (const tag of ['new', 'sold-out'] as const) {
      const badge = getProductBadge([tag]);
      expect(badge).not.toBeNull();
      expect(BADGE_STYLES[badge!]).toBeTruthy();
    }
  });
});
```

- [ ] **Step 2: Run the test** — `./node_modules/.bin/vitest run lib/__tests__/product-badge.test.ts`. Expected: PASS (this test documents the correct contract; it should pass against `categories.ts` as-is, and it will catch a regression if someone re-breaks the keys). If it fails, `BADGE_STYLES` is missing a key — add it.

- [ ] **Step 3: Add the badge label keys** — `messages/en.json` `product`: `"badgeNew": "New"`, `"badgeSoldOut": "Sold out"`. `messages/vi.json` `product`: `"badgeNew": "Mới"`, `"badgeSoldOut": "Hết hàng"`.

- [ ] **Step 4: Fix the render in `product-card.tsx`.** Delete the local `BADGE_CLASSES` map (lines 24–31) and its usage. Replace the badge block (lines 71–78):

```tsx
{badge && !discountPercent ? (
  <span className={`... ${BADGE_STYLES[badge]}`}>
    {t(badge === 'new' ? 'badgeNew' : 'badgeSoldOut')}
  </span>
) : null}
```

(Keep the existing wrapper/positioning classes on the `<span>`; only swap the color-class source and the label.) Remove the now-unused `BADGE_LABELS` import; keep `BADGE_STYLES` and `getProductBadge`.

- [ ] **Step 5: Typecheck + tests** — `./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/vitest run lib/__tests__/product-badge.test.ts`. Expected: no errors; PASS.

- [ ] **Step 6: Commit**

```bash
git add components/product/product-card.tsx lib/categories.ts lib/__tests__/product-badge.test.ts messages/en.json messages/vi.json
git commit -m "fix(product): align badge styling keys and localize badge labels"
```

---

## Final verification — including the mandatory CMS gate

- [ ] `./node_modules/.bin/vitest run`
- [ ] `./node_modules/.bin/tsc --noEmit`
- [ ] JSON validity: `node -e "JSON.parse(require('fs').readFileSync('messages/en.json'));JSON.parse(require('fs').readFileSync('messages/vi.json'));console.log('ok')"`
- [ ] **Key parity check** — every key present in `en.json` exists in `vi.json` and vice versa:
  `node -e "const a=require('./messages/en.json'),b=require('./messages/vi.json');const f=(o,p='')=>Object.entries(o).flatMap(([k,v])=>typeof v==='object'&&v?f(v,p+k+'.'):[p+k]);const ea=new Set(f(a)),eb=new Set(f(b));const miss=[...ea].filter(k=>!eb.has(k)).concat([...eb].filter(k=>!ea.has(k)));console.log(miss.length?['MISSING:',...miss]:'parity ok')"`
- [ ] **`/en` rendered-HTML check** on the deployed container: `curl -s http://116.118.6.30:3000/en/search | grep -oE 'Lọc|Sắp xếp|Bán chạy|Danh mục'` → expect no matches.
- [ ] **CMS-PREVIEW GATE (mandatory):** load `/vi/build/<a-real-slug>/preview` and `/vi/build/<slug>/preview/block` in a browser (or `curl` and grep for a 200 + rendered block markup). Confirm blocks that use `product-card.tsx` still render — no "No intl context found" / missing-provider error. If a preview 500s, the provider assumption broke: STOP and reassess before continuing.

## Self-review notes

- **Spec coverage:** 3.1a (Task 1), 3.1b (Task 2), 3.2 (Task 3), 3.3 (Task 4), 3.4 (Task 5), 3.5 (Task 6), 3.6 (Task 7). All Phase-3 findings covered.
- **Cross-phase dependency:** Tasks 3 and 5 reuse `orderStatusLabelKey` / `@/i18n/navigation` established in Phases 1–2; run Phase 3 after them.
- **CMS constraint:** the only shared block-rendered component gaining a translation call is `product-card.tsx` (already uses `useTranslations`); the gate above verifies it.
