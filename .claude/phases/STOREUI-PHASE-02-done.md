# Phase 02 — Page redesigns (restyle-only)
Status: DONE

## Goal
Restyle the four hardcoded storefront page groups onto the shared primitives + maker identity, changing presentation only.

## Tasks
- [x] Task 3: Content/info pages (about, contact, faq, info/[slug]) (commit f80e4b7)
- [x] Task 4: Account/auth pages (profile, login, forgot/reset password) (commit f5d42ec)
- [x] Task 5: Checkout flow pages (checkout, success, cancel, error) (commit adb2675)
- [x] Task 6: Search/listing pages (search, search/[collection]) (commit 88bc820)

## Acceptance Criteria
- Every page uses `StorefrontPageHeader`/`PageShell`/`ContentSection` + warm CTA buttons
- No `neutral-*`/`black`/`white` themed surfaces remain; tokens only
- All forms, payment, cart, auth, and search logic unchanged and still functional
- Pages render correctly in `/vi` and `/en`, light + dark, no console errors

## Decisions Made This Phase
- login page + search page + search empty-state were already on-brand; left structure, aligned only stray tokens.
- Did not force `StorefrontPageHeader` onto dashboard/auth-card layouts where a page-hero would distort them; applied `SpecTag` + display headings + tokens instead.
