# Storefront UX Improvements — Round 2 — Design

**Date:** 2026-07-22
**Status:** Draft for review
**Verified against:** the deployed Portainer instance at `http://116.118.6.30:3000`, plus
source reads confirming each symptom's cause.

---

## Context

A second UX audit of the storefront, following the 2026-07-21 pass
(`2026-07-21-storefront-ux-improvements-design.md`, tasks 1–2 shipped, 3–8 still
planned). This round swept the surfaces the first pass did not examine in depth: product
detail, checkout, profile/orders, search/listing filters, forms, and cart mechanics.

Thirty findings were gathered by code read and confirmed against the running container.
Eight were re-verified line-by-line before this spec was written; every one matched.

### Relationship to the 2026-07-21 plan

This spec is **additive and non-overlapping**. It does not touch the six findings already
covered there (branded 404, free-shipping progress, dedicated `/cart` page, route-level
error/loading scaffolding, keyboard-operable search dropdown, unaccented VN search). Those
remain owned by the earlier plan and are out of scope here.

### Explicitly out of scope (carried from Round 1)

Domain / TLS / Google OAuth / guest checkout. Unchanged — see the Round 1 spec. Note only:
the `og:image` on product pages still emits `http://100.73.36.117:3000/...` (the stale
Tailscale APP_URL), which is user-owned Portainer config, already tracked in memory
(`app-url-was-tailscale-ip-...`). Not re-planned here.

### Decisions locked for this spec

- **Cart on payment cancel (§C, #9):** *Restore the cart.* Do not clear the cart until
  payment is confirmed; a shopper who backs out of PayOS returns with items intact.
  (User decision, 2026-07-22.)
- **No shipping rate for a region (§B, #10):** *Block checkout with a clear message.* Show
  "we don't ship here yet" and disable submit until the address changes. Never render an
  unquotable region as free shipping. (User decision, 2026-07-22.)

### Decisions defaulted (flag if wrong)

- **Reorder with dropped items (§B, #18):** show an honest partial toast
  ("Added N of M — the rest are no longer available"), not a flat success.
- **Address edit (§E, #19):** add an edit path rather than delete-and-retype.

---

## Themes

The thirty findings group into five themes. They are largely independent surfaces (cart,
checkout, search, profile, product), which is what lets execution parallelize after
planning.

### A. The `/en` storefront is half-Vietnamese

next-intl is wired app-wide, but several high-traffic surfaces bypass it entirely and
hardcode Vietnamese. An `/en` shopper hits these mid-journey.

- **#8 — Checkout form is 100% hardcoded VN.** `components/checkout-form.tsx` has zero
  `useTranslations`: validation strings (`:186-214`), labels, delivery/payment copy
  (`:360-595`), and API errors surfaced verbatim (`:246`, from
  `app/api/checkout/route.ts:181-495`). **High** — this is the single largest i18n gap and
  is real structural work (new keys in both `en.json` and `vi.json`, wired through
  validation and the API error passthrough).
- **#23 — Search sort/filter/category chrome is hardcoded VN.** `lib/constants.ts:10-22`
  (sort labels), `search/layout.tsx:30`, `facets.tsx:61-110`, `collections-nav.tsx:32-42`,
  `navbar/search.tsx:99,108`. **High**
- **#16 — Order detail page is hardcoded VN** and also omits shipping address / payment /
  delivery method entirely. `profile/orders/[orderCode]/page.tsx`. **Medium**
- **#20 — Wishlist button copy hardcoded VN** (aria-labels, title, toasts).
  `components/wishlist/wishlist-button.tsx:38,56-73`. **Medium**
- **#29 — Review dates hardcoded `vi-VN`.** `components/product/reviews.tsx:15`. **Low**
- **#30 — Product-card badge labels hardcoded VN** ("Mới", "Hết hàng").
  `components/product/product-card.tsx`. **Low** (also has a styling bug — see §E.)

### B. Silent and misleading failures

The store tells the shopper something false, or nothing at all, at moments that decide a
sale.

- **#10 — Unquotable shipping shown as "Miễn phí" (free).** `checkout-form.tsx:89-90`
  returns `0` on quote error; `:538` renders `0` as free. **High.** Fix per locked
  decision: block with a message.
- **#12 — Payment-misconfig page leaks env-var names to shoppers.**
  `checkout/error/page.tsx:22-24` prints `PAYOS_CLIENT_ID` / `PAYOS_API_KEY` /
  `PAYOS_CHECKSUM_KEY` in `<code>` to the customer. **High** — replace with a neutral
  "payment is temporarily unavailable, please try again or choose COD" message.
- **#1 — Cart error toasts render raw message keys.** `components/cart/actions.ts:43`
  guard checks `startsWith('errors.')` but next-intl's missing-key fallback is
  `cart.errors.CART_FULL` (starts with `cart.`), so it slips through — or the raw code
  `CART_FULL` is returned. Root cause: error codes are UPPER_CASE, message keys are
  camelCase. **High** — align the keys and fix the guard.
- **#2 — Quantity/remove failures in the cart drawer are swallowed.**
  `components/cart/modal.tsx:184,198,211` discard the `ActionResult`; only `refresh()`
  runs. Pressing "+" past stock flicks the number back with no message. **High**
- **#4 — "Out of stock" shown before a variant is chosen.**
  `variant-selector.tsx` starts `selectedSku = null`; `add-to-cart.tsx:35` labels the
  disabled button `outOfStock`. Every variant product's CTA reads "Out of stock" on
  arrival. **High** — show "Select an option" for the no-selection state.
- **#3 — Cart lines vanish silently** when a product/variant goes unavailable.
  `lib/cart.ts:178,191` `continue` past them with no notice. **Medium**
- **#5 — Re-tapping the selected variant clears it,** silently reverting price and
  re-disabling the CTA. `variant-selector.tsx:221-225`. **Medium**
- **#18 — Reorder reports success when most items were dropped.**
  `profile/actions.ts:211-217` returns ok if `added >= 1`; `reorder-button.tsx:25` toasts
  flat success. **Medium** — honest partial toast (defaulted decision).
- **#13 — Raw status enum on the confirmation screen** ("Status: PENDING_ONLINE").
  `checkout/success/page.tsx:110`. **Medium**
- **#15 — Bank-transfer orders collapse into generic "Pending"** with no transfer
  instructions. `lib/profile-orders.ts` has no `PENDING_TRANSFER` branch though
  `lib/payload-order-storefront.ts:23` produces it. **Medium**

### C. Cart ↔ checkout continuity

- **#9 — Cart cleared before the gateway redirect.** `checkout-form.tsx:252`
  `clearCartAction()` runs before `window.location.assign(checkoutUrl)`; the cancel page
  never restores it. **High.** Fix per locked decision: clear only on confirmed payment;
  restore on cancel/back.
- **#26 — Post-submit redirects drop the locale prefix.** `checkout-form.tsx:259`,
  `reset-password-form.tsx:42`, `navbar/search.tsx:91,128` use unprefixed
  `next/navigation` pushes; with `localePrefix: 'always'` an `/en` visitor lands on VN.
  **Medium** — use the i18n-aware navigation helpers.
- **#14 — Webhook-delay wait has no feedback and never times out.**
  `order-status-poller.tsx:39-53` polls every 3s forever, no spinner, no escape. **Medium**
- **#11 — Single error string rendered below the payment section,** no focus/scroll; on
  mobile the submit looks dead because the reason is off-screen. `checkout-form.tsx:487`.
  **Medium**
- **#6 — Quantity cap defaults to 99 when stock/variant is unknown.**
  `variant-selector.tsx:70-73`; a 3-in-stock item lets the shopper dial 40. **Medium**

### D. Mobile and accessibility gaps

- **#21 — Filter panel is entirely hidden on mobile.**
  `components/layout/search/filter/facets.tsx:60` `hidden md:block`. Phone shoppers can't
  set price / in-stock / clear filters, and can't see filters already in the URL. **High**
  — needs a mobile disclosure (drawer/accordion).
- **#22 — Sort control renders blank on mobile** when no `sort` param is set.
  `dropdown.tsx:17,29-33`, `defaultSort.slug === null`. **Medium**
- **#7 — Mobile sticky buy-bar keeps focusable controls while `aria-hidden`.**
  `variant-selector.tsx:309-336`. Keyboard tabs into an invisible "Add to cart". **Medium**
- **#25 — Empty search state always blames the filter** and never shows the applied
  filters; unused `noResults` / `noFilterResults` keys already exist.
  `empty-state.tsx:31,33`. **Medium**

### E. Polish

- **#17 — Same green for "pending" and "delivered"** status pills.
  `profile/orders/[orderCode]/page.tsx:124-130`. **Medium**
- **#19 — Address book has no edit path.** `profile/actions.ts` exports only
  create/delete/setDefault. **Medium** — add edit (defaulted decision).
- **#30 (styling half) — "new" badge falls through to a washed-out neutral pill.**
  `product-card.tsx:24-30` keys on `'new-arrival'` but `lib/categories.ts:67` emits
  `'new'`. **Low**
- **#27 — Registration has no confirm-password field** and no stated rule beyond
  `minLength=8`. `components/auth-form.tsx:145-154`. **Medium**
- **#24 — Result count printed twice** on the search page.
  `search/page.tsx:94,100-103`. **Low**
- **#28 — Review submit button disabled until a star is clicked, with no hint.**
  `components/product/review-form.tsx:106`. **Low**
- **LCP — Above-the-fold homepage hero images are `loading="lazy"` with no `priority`.**
  Confirmed on the deployed HTML: the first `<img>` (`alt="Aircraft kits"`) is lazy, zero
  `fetchpriority="high"` anywhere. The Round 1 spec recorded blanket `loading="lazy"` as a
  *positive*; for first-screen images it defers the largest paint. **Low–Medium**

---

## Implementation order

Sequenced by "loses a sale / breaks trust" first, and by what parallelizes cleanly. The
five themes are independent surfaces, so after this order is turned into a plan, execution
can fan out per theme.

1. **§B + §C — silent failures and checkout continuity** (highest: these lose live sales).
2. **§A — the `/en` i18n pass** (large but mechanical; checkout i18n depends on §B/§C
   touching the same file, so it is sequenced *after* them to avoid conflicts).
3. **§D — mobile/a11y** (independent of the above).
4. **§E — polish** (independent; can run alongside §D).

**Sequencing constraint:** §A #8 (checkout i18n) and §B/§C (#9, #10, #11, #26) all edit
`components/checkout-form.tsx`. To avoid two agents colliding on one file, the checkout
file is owned by **one** work-stream: do the §B/§C behavior fixes and the §A checkout
translation in the *same* task. The rest of §A (search, order detail, wishlist, reviews,
badges) is a separate file set and can parallelize.

---

## Verification approach

- Re-probe the deployed instance after each theme lands (response codes, rendered copy).
- For behavior fixes (#9, #10, #2, #4), add Vitest coverage where logic is testable
  (shipping-quote-error → blocked, cart action → surfaced error, variant-null → "select an
  option" label). Per `testing.md`: each bug fix gets a test that fails before, passes
  after.
- For i18n, grep the touched files for residual hardcoded VN strings in JSX and assert
  both `en.json` and `vi.json` gained the parallel keys.
- Manual `/en` walkthrough of checkout, search, and order detail confirming no VN leaks.

## Revisit if

- Traffic analytics show meaningful `/en` usage → promote §A ahead of §D/§E.
- The domain/TLS decision reverses → the APP_URL `og:image` issue and OAuth re-enter scope.
