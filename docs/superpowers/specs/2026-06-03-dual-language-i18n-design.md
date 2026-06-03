# Dual-Language (EN / VI) — Design

Date: 2026-06-03
Status: Approved

## Goal
Add English + Vietnamese language support to the storefront UI. Vietnamese is
the default. Language is expressed as a URL path prefix (`/vi`, `/en`) and the
user's choice persists in a cookie. A switcher lives in the navbar.

## Scope
**In scope:** UI chrome — navbar, footer, buttons, labels, form fields,
checkout flow copy, auth pages, static info pages (about/contact/faq), empty
states, toasts/validation copy that originates in client/server **components**.

**Out of scope:**
- CMS content (product titles/descriptions, blog posts, CMS pages) stays
  single-language, as authored. No Payload localization.
- API/middleware error strings (e.g. the rate-limit 429 JSON message) — these
  have no clean locale context at the edge. Left as-is; revisit later.
- Localized SEO/hreflang, localized slugs. `<html lang>` is set per locale, but
  no per-locale canonical/alternate metadata.
- The `(payload)` admin panel — never localized.

## Library
`next-intl`. Purpose-built for Next 15 App Router: native path-prefix routing,
JSON message catalogs (satisfies the "no scattered strings" frontend rule),
server (`getTranslations`) + client (`useTranslations`) support, automatic
`NEXT_LOCALE` cookie, and navigation helpers for the switcher.

Rejected: `i18next/react-i18next` (client-first, awkward with RSC); hand-rolled
dictionary (reinvents middleware/cookie/switcher/typing for no gain).

## Architecture

### File structure
```
app/
  layout.tsx                  # unchanged pass-through root
  [locale]/
    (storefront)/             # all current storefront files moved here verbatim
      layout.tsx              # sets <html lang={locale}>, wraps NextIntlClientProvider
      page.tsx, blog/, product/, checkout/, search/, profile/, ...
  (payload)/admin/            # unchanged, NOT localized
  api/, media/                # unchanged, NOT localized
i18n/
  routing.ts                  # locales ['vi','en'], defaultLocale 'vi', localePrefix 'always'
  navigation.ts               # next-intl Link/useRouter/usePathname wrappers
  request.ts                  # getRequestConfig — loads messages for the active locale
messages/
  vi.json
  en.json
```

### Routing
- `localePrefix: 'always'` — both `/vi/...` and `/en/...` are explicit and
  shareable. `/` redirects to the cookie locale, else `/vi`.
- `<html lang={locale}>` set in the `[locale]` storefront layout.

### Middleware composition
Fold locale handling into the existing `middleware.ts` (keep redirects +
rate-limit ordering explicit; do not replace with a `createMiddleware` black box):
1. `/api`, `/admin`, `/media` → skip locale (existing behavior preserved).
2. Storefront path:
   a. CMS legacy redirects (existing) run first.
   b. next-intl locale resolution: prefix-less paths redirect to cookie locale
      (or `/vi`); sets `NEXT_LOCALE` cookie.
3. `/api/*` → rate limiting (existing, unchanged).

The existing `matcher` already excludes `_next`, files, and `media/`.

### Message catalogs
Namespaced JSON: `common`, `nav`, `footer`, `cart`, `product`, `checkout`,
`auth`, `profile`, `search`, `home`, `blog`, `info` (about/contact/faq).
Keys are dotted/grouped; values are full strings with ICU interpolation where
needed. `vi.json` is authored from the current hardcoded Vietnamese; `en.json`
is the English equivalent.

### Language switcher
Client component in the navbar (desktop + mobile menu). Uses next-intl
`usePathname` + `useRouter` to swap the locale segment while preserving the rest
of the path and query. Persists choice via the `NEXT_LOCALE` cookie (set by
next-intl on navigation).

## Testing
- Unit: routing config (locales/default), the switcher's path-rewrite helper
  (given a path + target locale, produces the correct prefixed path).
- Build verification: `pnpm build` (or typecheck) passes; manual smoke of
  `/vi`, `/en`, `/` redirect, and the switcher.
- String extraction itself is not unit-tested (no logic).

## Phasing
- **Phase 01 — Foundation:** install next-intl; create `i18n/*`, `messages/*`
  skeleton; move storefront under `app/[locale]`; compose middleware; locale
  layout + provider; navbar switcher. App runs in both locales with mostly-VI
  strings still inline.
- **Phase 02 — Core string extraction:** navbar, footer, cart, product,
  checkout, auth → catalogs (vi + en).
- **Phase 03 — Remaining surfaces + polish:** about/contact/faq, blog UI,
  profile, search, home; `<html lang>`; tests; build verification.

## Risks / notes
- Branch: work lands on `feature/first-party-analytics` (which has unrelated
  uncommitted analytics work). i18n changes will be committed separately via
  explicit file staging to stay revertable apart from analytics.
- Moving 39 route files: done with `git mv` to preserve history.
- `@/` alias resolves from repo root, so deep imports inside moved files
  (`@/components/...`, `@/lib/...`) are unaffected. Relative imports like
  `../globals.css` must be re-pathed.
