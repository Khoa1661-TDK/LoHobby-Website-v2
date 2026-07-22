# Storefront UX Improvements — Round 3 Design

**Date:** 2026-07-22
**Status:** Approved for planning
**Verified against:** the deployed Portainer instance at `http://116.118.6.30:3000` (not localhost)
**Supersedes nothing** — extends the round-2 work in
`2026-07-21-storefront-ux-improvements-design.md` (Tasks 1–2 of which shipped;
Tasks 3–8 remain a separate, still-valid plan).

---

## Context

A second, deeper UX audit of the storefront, again conducted against the **deployed**
container rather than a local dev server. The round-2 review covered chrome-level
findings (404, free-shipping progress, cart page, error/loading scaffolding, search
dropdown a11y, unaccented search). This round swept the surfaces round-2 did not examine
in depth: **product detail, checkout, profile/orders, search filters, forms, cart
mechanics, and storefront i18n coverage.**

### Method

Findings were gathered by HTTP probe against the running container (response codes,
redirect chains, rendered HTML, image loading attributes, timing) and confirmed by
reading each symptom's source before it was recorded. Every finding in this spec was
read in the code; the highest-severity anchors were additionally re-verified line by line
before planning.

### Scope decision (user, 2026-07-22)

The audit produced 31 findings across five themes. The user was offered a split
(recommended: trust + continuity first, i18n and polish deferred) and chose **"all of
it"** — one unified spec. Honest note recorded per `core.md §4`: a single 31-fix spec is
wide; it is kept executable by a **phased implementation order** (Phases 1–5 below), each
phase independently shippable and reviewable. The plan must preserve those phase
boundaries rather than interleaving fixes.

### Hard constraint (user, 2026-07-22): do not break CMS / page-builder mode

Many storefront components in this spec (`product-card`, `variant-selector`,
`wishlist-button`, product badges, block components under `components/blocks/`) are
rendered in **three** contexts: the live storefront, the page-builder **preview**
(`app/[locale]/build/[slug]/preview/page.tsx` and `.../preview/block/page.tsx`), and
never in the Payload admin. Adding `useTranslations`/`getTranslations` to a component
makes it throw if rendered outside a `NextIntlClientProvider`.

**Verified pre-flight:** both preview routes already wrap `NextIntlClientProvider`
(same as the storefront layout, `app/[locale]/(storefront)/layout.tsx:240`). Therefore
i18n-izing these components is safe **provided** no fix introduces a new render path that
lacks the provider. This is a global constraint (below) and a mandatory verification
step: after Phase 3, load a page-builder preview and confirm blocks still render.

### What is already good — explicitly out of scope

- Chrome-level findings owned by the round-2 spec/plan (404, free-shipping progress,
  `/cart` page, route error/loading scaffolding, search-dropdown a11y, unaccented
  search). Not re-opened here.
- Domain / TLS / Google OAuth / guest checkout — out of scope per round-2 (user
  decision 2026-07-21), unchanged.
- Security headers, gzip, cache headers, add-to-cart toast feedback — confirmed good.

---

## Global constraints

- **CMS preview must keep working.** No fix may add a render path for a shared component
  that omits `NextIntlClientProvider`. Verified after Phase 3 by loading a live preview.
- **Locale-aware navigation.** Use the exports from `@/i18n/navigation` (`Link`,
  `useRouter`, `redirect`, `usePathname`) for any in-app navigation — never
  `next/navigation` — so the locale prefix is preserved (`localePrefix: 'always'`).
- **All new user-facing copy is translated.** Every string added in Phases 1–5 is defined
  in **both** `messages/en.json` and `messages/vi.json` and read via next-intl. The only
  exemption remains `app/not-found.tsx` / `app/global-error.tsx` (render outside the
  provider, per round-2).
- **Payload relationship writes use numeric ids** (address edit, Phase 5) — existing
  project constraint.
- **New copy keys reuse existing namespaces** where present (`checkout`, `cart.errors`,
  `search`, `profile`) rather than inventing parallel ones.

---

## Phase 1 — Trust & silent-failure fixes

Highest sales/trust impact: a shopper who is shown a wrong price, a raw error code, or a
misleading CTA does not come back.

### 1.1 — Cart error toasts render raw message keys (#1, High)
**Symptom:** adding a 101st line or a variant-less product shows a toast reading
`cart.errors.CART_FULL`.
**Cause:** `lib/cart.ts` throws `UPPER_CASE` error codes (`CART_FULL`,
`VARIANT_REQUIRED`, …); `messages/*.json` define them as camelCase (`cartFull`,
`variantRequired`). `components/cart/actions.ts:41` looks up `errors.${code}`, misses,
and the `!startsWith('errors.')` guard fails to catch the `cart.errors.` fallback, so the
raw code leaks.
**Fix:** map each known code to its camelCase message key in `toUserError` (single source
of truth). Fall back to a generic `errors.generic` string, never the raw code.

### 1.2 — Cart-drawer quantity/remove failures are swallowed (#2, High)
**Symptom:** pressing "+" past available stock silently reverts the number; no message.
**Cause:** `components/cart/modal.tsx:184/198/211` discard the `ActionResult` and only
`router.refresh()`.
**Fix:** surface the returned error via `sonner` toast, matching the add-to-cart pattern.

### 1.3 — Cart lines vanish silently when unavailable (#3, Medium)
**Symptom:** an added item disappears from drawer and total between page loads, no notice.
**Cause:** `lib/cart.ts:178/191` `continue` past unmatched / unavailable lines.
**Fix:** collect dropped lines; surface a one-time "an item was removed — no longer
available" notice on the cart surface (translated).

### 1.4 — "Out of stock" shown before a variant is picked; re-tap deselects (#4/#5, High/Med)
**Symptom:** every variant product's CTA reads "Out of stock" on arrival; tapping the
selected variant again reverts price and re-disables.
**Cause:** `variant-selector.tsx:30` starts `selectedSku=null`; `add-to-cart.tsx:35`
labels any non-addable button `outOfStock`. `variant-selector.tsx:221` toggles selection
off on re-click.
**Fix:** distinguish three CTA states — `selectOption` (nothing chosen), `outOfStock`
(chosen but unavailable), `addToCart`. Make an already-selected variant re-click a no-op
(do not deselect to null).

### 1.5 — Unquotable shipping displayed as free (#10, High)
**Symptom:** a shopper in an uncovered region sees "Miễn phí" and an estimated total, then
the order is rejected or charged differently.
**Cause:** `checkout-form.tsx:89` returns `0` on `'error' in quote`; `:538` renders `0`
as "Miễn phí".
**Decision (user default 2026-07-22):** **block checkout** for uncovered regions with a
clear translated "we don't ship to this region yet" message and a disabled submit — never
show a fabricated total. Distinguish `0` (genuinely free / pickup) from
`unquotable` (no rate) as separate states.

### 1.6 — Payment-misconfig page leaks env-var names (#12, High)
**Symptom:** a customer whose payment fails is told to set `PAYOS_CLIENT_ID` etc.
**Cause:** `checkout/error/page.tsx:22` renders the env-var names in `<code>`.
**Fix:** replace with a generic translated "payment temporarily unavailable — try again or
contact support"; log the real cause server-side only.

### 1.7 — Raw status enums shown to shoppers (#13/#15, Medium)
**Symptom:** "Status: PENDING_ONLINE" on the confirmation screen; bank-transfer orders
bucket into a generic "Pending" with no transfer instructions.
**Cause:** `checkout/success/page.tsx:110` renders `{status}` directly;
`lib/profile-orders.ts` lacks a `PENDING_TRANSFER` branch though
`lib/payload-order-storefront.ts:23` produces it.
**Fix:** central localized status-label map; add the missing `PENDING_TRANSFER` branch and
surface transfer instructions/amount for it.

### 1.8 — Reorder reports success when most items were dropped (#18, Medium)
**Symptom:** reordering a 5-item order toasts "added" but only 1 item lands.
**Cause:** `profile/actions.ts:211` skips unpurchasable lines, returns `ok` if `added>=1`;
`reorder-button.tsx:25` toasts a flat success.
**Fix:** return added/skipped counts; toast reflects them ("3 added, 2 unavailable").

---

## Phase 2 — Cart↔checkout continuity

Small in count, each directly breaks a purchase.

### 2.1 — Cart cleared before the gateway redirect (#9, High)
**Symptom:** a shopper who backs out of the PayOS page returns to an empty cart and must
re-add everything.
**Cause:** `checkout-form.tsx:252` `await clearCartAction()` runs before
`window.location.assign(checkoutUrl)` at `:255`; the cancel page never restores lines.
**Decision (user default 2026-07-22):** clear the cart **only after payment is confirmed**
(success page / webhook `PAID`), not before redirect. The order snapshot already exists,
so the cart is safe to keep; this is the standard pattern and removes the fragile
restore-on-cancel path entirely. COD (no redirect) still clears on order placement.

### 2.2 — Post-submit navigations drop the locale (#26, Medium)
**Symptom:** an `/en` visitor completing COD checkout or a search lands on the Vietnamese
page.
**Cause:** `checkout-form.tsx`, `reset-password-form.tsx`, `navbar/search.tsx` import
`useRouter`/`redirect` from `next/navigation`.
**Fix:** swap those imports to `@/i18n/navigation`.

### 2.3 — Quantity cap defaults to 99 when stock unknown (#6, Medium)
**Symptom:** a shopper can dial 40 units on a 3-in-stock item and only learns at
add-to-cart.
**Cause:** `variant-selector.tsx:70`.
**Fix:** cap the quantity control to real available stock once a variant is chosen; a
sensible fallback only when stock is genuinely unknown.

### 2.4 — Checkout error hidden below the fold; webhook wait has no feedback (#11/#14, Med)
**Symptom:** on long mobile checkout the submit appears to do nothing (error is off-screen
above); after paying, the page sits on "pending" with no spinner and never times out.
**Cause:** `checkout-form.tsx:487` places the single error alert after all sections with no
focus/scroll; `order-status-poller.tsx:39` polls every 3s indefinitely, returns `null`.
**Fix:** focus/scroll to the error on failure; give the poller a visible "checking
payment…" state and a bounded timeout with a "still processing — we'll email you" escape.

---

## Phase 3 — `/en` internationalization pass

Extract hardcoded Vietnamese into `en.json`/`vi.json`, wire via next-intl. **Verify CMS
preview after this phase** (global constraint).

- **3.1 Checkout form (#8, High).** Largest item (~40 strings): field labels, validation
  messages, delivery options, payment copy in `checkout-form.tsx`, plus the API error
  strings in `app/api/checkout/route.ts` surfaced at `checkout-form.tsx:246`. The
  `checkout` namespace exists but holds only page-level copy today; add the form keys.
- **3.2 Order detail page (#16, Medium).** `profile/orders/[orderCode]/page.tsx` is fully
  hardcoded VN and omits shipping address / payment method / delivery method — add both
  the translations and the missing delivery info block.
- **3.3 Search sort/filter/category labels (#23, High).** `lib/constants.ts` sort labels,
  `search/layout.tsx` title, `facets.tsx` filter labels, `collections-nav.tsx`,
  `navbar/search.tsx` placeholder/aria-label.
- **3.4 Wishlist button (#20, Medium).** Translate labels/toasts; **add a login link** for
  the guest dead-end (currently a bare error toast with no way forward).
- **3.5 Review dates (#29, Low).** `reviews.tsx:15` hardcodes `vi-VN` — format by active
  locale.
- **3.6 Product-card badges (#30, Low).** Translate badge labels **and** fix the key
  mismatch: `product-card.tsx:24` keys by `new-arrival|best-seller|sold-out` while
  `lib/categories.ts:67` emits `new|sold-out`, so `new` falls through to the washed-out
  fallback.

---

## Phase 4 — Mobile & accessibility

### 4.1 — Filter panel hidden entirely on mobile (#21, High)
**Symptom:** phone shoppers cannot set a price range, filter in-stock, see or clear active
filters.
**Cause:** `facets.tsx:60` `hidden md:block`.
**Fix:** a mobile-accessible filter surface (disclosure/drawer) exposing the same facets
and a clear-filters control.

### 4.2 — Sort control renders blank on mobile (#22, Medium)
**Cause:** `dropdown.tsx:17` inits `active=''`; `defaultSort.slug` is `null`.
**Fix:** default the button label to the relevance/default option.

### 4.3 — Sticky buy-bar keeps focusable controls while hidden (#7, Medium)
**Symptom:** keyboard users tab into an off-screen "Add to cart".
**Cause:** `variant-selector.tsx:309` uses `aria-hidden` + `translate-y-full` but leaves
controls in the tab order.
**Fix:** gate interactivity on visibility (not just transform) — e.g. `inert`/conditional
render — so hidden controls are neither focusable nor announced.

### 4.4 — Empty state always blames the filter, hides applied filters (#25, Medium)
**Cause:** `empty-state.tsx:31/33` reuses the SEO string as heading and always renders
`tryAdjustingFilter`; `noResults`/`noFilterResults` keys exist but are unused.
**Fix:** choose `noResults` vs `noFilterResults` based on whether filters are active; show
the active filters so the shopper can see what caused the empty page.

---

## Phase 5 — Polish

- **5.1 (#17)** Distinct status-pill colors — pending and delivered currently share
  `bg-emerald-100` (`profile/orders/[orderCode]/page.tsx:124`).
- **5.2 (#19)** Add an address **edit** path (`updateAddressAction` + UI); today only
  create/delete/set-default exist, so a typo means delete-and-retype (losing default).
  Relationship writes use numeric ids.
- **5.3 (#24)** Render the search result count once (`search/page.tsx:94` and `:100`
  duplicate it).
- **5.4 (#27)** Registration confirm-password field + a visible password rule
  (`auth-form.tsx:145` has one input, `minLength=8`, no confirmation).
- **5.5 (#28)** Review submit: show "select a rating" helper tied to the star widget
  (`review-form.tsx:106` disables with no explanation).
- **5.6 (LCP, auditor-found)** Above-the-fold hero/first-row images are `loading="lazy"`
  with no `priority`/`fetchpriority=high` (confirmed on the deployed home HTML). Mark
  first-screen images `priority`; keep lazy for below-the-fold.

---

## Implementation order

Phases are sequential and each is independently shippable:

1. **Phase 1** — trust/failure (highest impact, mostly self-contained logic).
2. **Phase 2** — continuity (touches checkout submit + poller).
3. **Phase 3** — i18n pass; **run the CMS-preview verification gate at the end**.
4. **Phase 4** — mobile/a11y.
5. **Phase 5** — polish + LCP.

Within a phase, land the pure-logic fixes (with unit tests) before the UI-state changes.

## Verification approach

- **Unit (Vitest):** cart error-code→key mapping (1.1), shipping-quote gating states
  (1.5), status-label map incl. `PENDING_TRANSFER` (1.7), reorder added/skipped counts
  (1.8), quantity cap vs stock (2.3). Test files must import `describe/expect/it` from
  vitest (project constraint).
- **Integration/manual against the deployed container:** re-probe rendered HTML for the
  i18n phase (no `Lọc`/`Sắp xếp` on `/en`), CTA states on a variant PDP, mobile filter
  presence, hero image `priority`, and the checkout error/poller UX.
- **CMS gate (mandatory after Phase 3):** load a page-builder preview and a block preview;
  confirm blocks using i18n-ized shared components still render (no missing-provider
  throw).

## Out of scope / not changed

- Round-2 items (still tracked in their own plan): 404, free-shipping progress, `/cart`
  page, route error/loading, search-dropdown a11y, unaccented search.
- Domain/TLS/OAuth/guest checkout (round-2 user decision).
- Any refactor not required by a listed fix (existing-code rule: features, not drive-by
  refactors).

## Revisit if

- English traffic grows enough that Phase 3 should have been sequenced first.
- Shipping coverage becomes dynamic/region-configurable — 1.5's block-checkout rule may
  need a "quote later" mode instead.
- PayOS webhook latency proves long enough that 2.4's timeout escape needs a dedicated
  "processing" order state rather than a client-side bound.
