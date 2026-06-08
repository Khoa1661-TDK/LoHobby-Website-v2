# Phase 02 — Core String Extraction
Status: DONE

## Goal
Extract hardcoded UI strings from the highest-traffic surfaces into the message
catalogs, with both VI and EN values.

## Tasks
- [x] Navbar (index + mobile menu) → `nav` namespace
- [x] Footer + newsletter → `footer` namespace
- [x] Cart (modal, add-to-cart, cross-sell) → `cart` namespace
- [x] Product page + variant selector + reviews → `product` namespace
- [x] Checkout form + steps → `checkout` namespace
- [x] Auth: login page + AuthForm → `auth` namespace
- [x] Auth: forgot/reset password pages → `auth` namespace
- [x] Common/shared (buttons, statuses, toasts) → `common` namespace
- [x] Migrate storefront internal links from `next/link` → `@/i18n/navigation`
      `Link` (they currently work via the middleware cookie-redirect, with an extra hop)

## Acceptance Criteria
- No hardcoded user-facing strings remain in the touched components
- Both `/vi` and `/en` render correct copy on home, product, cart, checkout, auth
- Typecheck/build passes

## Decisions Made This Phase
- 2026-06-08: Used subagents to parallelize component i18n updates — cart, product, checkout, forgot/reset password, and link migration dispatched to independent agents.
- 2026-06-08: Server action error messages (cart/actions.ts) use `getTranslations()` from `next-intl/server` directly, returning translated error strings rather than error-code-to-client pattern. This is the simplest approach that avoids client-side error-mapping tables.
- 2026-06-08: Checkout messages use nested objects under `checkout.success.*`, `checkout.error.*`, `checkout.cancel.*` for readability, accessed via `getTranslations('checkout.success')` / `useTranslations('checkout.success')`.
- 2026-06-08: `next/link` → `@/i18n/navigation` migration only applies to storefront components under `app/[locale]` and `components/`. Admin and API routes are excluded.
