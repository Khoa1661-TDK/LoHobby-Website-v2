# Phase 02 — Core String Extraction
Status: PENDING

## Goal
Extract hardcoded UI strings from the highest-traffic surfaces into the message
catalogs, with both VI and EN values.

## Tasks
- [ ] Navbar (index + mobile menu) → `nav` namespace
- [ ] Footer → `footer` namespace
- [ ] Cart (modal, add-to-cart, cross-sell) → `cart` namespace
- [ ] Product page + variant selector + reviews → `product` namespace
- [ ] Checkout form + steps → `checkout` namespace
- [ ] Auth pages (login, register, forgot/reset) → `auth` namespace
- [ ] Common/shared (buttons, statuses, toasts) → `common` namespace

## Acceptance Criteria
- No hardcoded user-facing strings remain in the touched components
- Both `/vi` and `/en` render correct copy on home, product, cart, checkout, auth
- Typecheck/build passes

## Decisions Made This Phase
(append as you go)
