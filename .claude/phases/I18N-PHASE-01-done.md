# Phase 01 — i18n Foundation
Status: DONE

## Goal
Stand up next-intl with `/vi` + `/en` path-prefix routing, storefront moved
under `app/[locale]`, locale-aware middleware, and a working navbar switcher —
app runs in both locales (strings mostly still inline).

## Tasks
- [x] Install `next-intl` (4.13.0)
- [x] `i18n/routing.ts` (locales ['vi','en'], default 'vi', localePrefix 'always')
- [x] `i18n/navigation.ts` (Link/useRouter/usePathname/redirect wrappers)
- [x] `i18n/request.ts` (getRequestConfig — load messages per locale)
- [x] `messages/vi.json` + `messages/en.json` skeleton (namespaces)
- [x] Plug `createNextIntlPlugin` into `next.config.mjs`
- [x] `git mv app/(storefront)` → `app/[locale]/(storefront)`; fixed `../globals.css`
      + 15 absolute `@/app/(storefront)` alias imports
- [x] Locale layout: `<html lang={locale}>`, validate locale, `setRequestLocale`,
      provide messages via `NextIntlClientProvider`
- [x] Compose locale handling into `middleware.ts` (skip api/admin/media + legacy
      `/products`, `/icon`, `/opengraph-image` via `lib/locale-routing.ts`)
- [x] Language switcher component in navbar (desktop) + mobile menu (full variant)
- [x] Tests: routing config + `isNonLocalizedRoot` guard (`lib/__tests__/locale-routing.test.ts`)

## Acceptance Criteria
- `/` redirects to `/vi` (or cookie locale) — via next-intl middleware
- `/vi` and `/en` both render the storefront
- `/admin`, `/api/*`, `/media/*` unaffected (no locale prefix, redirects/rate-limit intact)
- Switcher toggles locale, preserves the rest of the path, persists via cookie
- Typecheck/build passes — ⚠️ NOT YET VERIFIED: `pnpm test`/`pnpm build` blocked by
  `ERR_PNPM_IGNORED_BUILDS` (@parcel/watcher, @swc/core). Static sweep done; runtime
  verification pending the user resolving the pnpm ignored-builds state.

## Decisions Made This Phase
- Used `createIntlMiddleware(routing)` invoked explicitly inside the existing
  middleware (not as the top-level export) to preserve the redirect → locale →
  rate-limit ordering and keep `/api`/`/admin` out of locale handling.
- Extracted `isNonLocalizedRoot` into `lib/locale-routing.ts` (pure, edge-safe,
  testable) rather than inlining in middleware.
- i18n phase files namespaced `I18N-PHASE-*` to avoid colliding with the
  pre-existing analytics `PHASE-02/03-done.md`.
