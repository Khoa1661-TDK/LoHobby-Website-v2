# Phase 01 — i18n Foundation
Status: ACTIVE

## Goal
Stand up next-intl with `/vi` + `/en` path-prefix routing, storefront moved
under `app/[locale]`, locale-aware middleware, and a working navbar switcher —
app runs in both locales (strings mostly still inline).

## Tasks
- [ ] Install `next-intl`
- [ ] `i18n/routing.ts` (locales ['vi','en'], default 'vi', localePrefix 'always')
- [ ] `i18n/navigation.ts` (Link/useRouter/usePathname/redirect wrappers)
- [ ] `i18n/request.ts` (getRequestConfig — load messages per locale)
- [ ] `messages/vi.json` + `messages/en.json` skeleton (namespaces)
- [ ] Plug `createNextIntlPlugin` into `next.config.mjs`
- [ ] `git mv app/(storefront)` → `app/[locale]/(storefront)`; fix relative imports
- [ ] Locale layout: `<html lang={locale}>`, validate locale, `setRequestLocale`,
      provide messages via `NextIntlClientProvider`
- [ ] Compose locale handling into `middleware.ts` (skip api/admin/media)
- [ ] Language switcher component in navbar (desktop + mobile)
- [ ] Tests: routing config + switcher path-rewrite helper

## Acceptance Criteria
- `/` redirects to `/vi` (or cookie locale)
- `/vi` and `/en` both render the storefront
- `/admin`, `/api/*`, `/media/*` unaffected (no locale prefix, redirects/rate-limit intact)
- Switcher toggles locale, preserves the rest of the path, persists via cookie
- Typecheck/build passes

## Decisions Made This Phase
(append as you go)
