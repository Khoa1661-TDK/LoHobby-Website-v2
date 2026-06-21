# Store-Page Visual Consistency, Per-Locale CMS Pages & Block Icons — Design

Date: 2026-06-21
Branch base: `feature/hobby-shop-visual-foundation`

## Context

The storefront has a strong, locked maker-shop visual identity expressed on the
home page (warm/terracotta/cream palette, Fraunces `font-display` headings, a
"build-data" mono eyebrow, layer-line dividers, build-plate ambient grids, soft
shadows, `reveal-up` motion). The home page and CMS content pages render through
the existing visual page builder.

The **hardcoded storefront pages** (about, contact, faq, info, profile, auth,
checkout, search) were never brought onto this identity — they use generic
styling (`bg-black`, `text-neutral-*`, `rounded-full`) and look like a different
site. Separately, the block-picker in the visual builder uses 13 placeholder SVG
icons that look unfinished, and the CMS is not localized even though the
storefront is bilingual (`vi` default + `en`), so a single `home` page is served
to both locales.

This work delivers three outcomes:

1. **Visual consistency** — every hardcoded page matches the home identity.
2. **Per-locale CMS pages** — one CMS page document holds `vi` + `en` content via
   Payload native localization, switched by the route locale.
3. **Block-picker icons** — replaced with clean, on-brand icons.

It is **not** making the hardcoded pages CMS-editable. They stay statically
themed (the existing page builder already covers CMS-editable content needs).
Page redesigns are **restyle-only**: no changes to form, payment, auth, cart, or
search logic.

## Goals / Non-Goals

**Goals**
- Reusable storefront page primitives built from the existing identity primitives.
- All four page groups restyled onto the identity.
- Block-picker icons replaced and on-brand.
- Payload localization enabled; `Pages` localized; locale threaded through the
  data layer, storefront, visual builder, preview, and autosave; existing data
  migrated into the `vi` locale.

**Non-Goals**
- No new CMS editing surfaces for hardcoded pages.
- No behavioral changes to checkout/payment, auth, cart, or search.
- No new visual identity — the home identity is followed exactly.

## Design Direction (follow the locked identity exactly)

The brief pins the direction ("match the home store page"), so this is a
consistency pass, not a new identity. Canonical vocabulary to enforce:

| Element | Target |
|---|---|
| Headings | `font-display`, `text-warm-900 dark:text-warm-100`, `text-balance` |
| Eyebrow | `SpecTag` (mono, `tracking-[0.18em]`, `text-accent`) — canonical |
| Body | `text-warm-600 dark:text-warm-400` |
| Buttons | warm `rounded-xl` (`PrimaryButton`/`SecondaryButton`) — no `rounded-full bg-black` |
| Surfaces | `surface`/`surface-raised`, `shadow-soft-*`, `rounded-2xl`, `border-line` |
| Motion | `animate-reveal-up` with stagger; `motion-safe` only |
| Identity marks | `LayerLineDivider`, `BuildPlateGrid` (ambient) |

**Signature device:** the layer-line rule (`LayerLineDivider`) as the recurring
section/header marker — ties to the 3D-printing "layer line" identity. No
numbered markers (content is not a sequence).

**Eyebrow reconciliation:** two eyebrow styles exist today (hero's terracotta +
rule vs. `SpecTag` mono + accent). Standardize on **`SpecTag`** everywhere.

## Architecture

### Existing pieces to reuse (do not duplicate)
- `components/blocks/_primitives.tsx` — `SpecTag`, `BuildPlateGrid`,
  `LayerLineDivider`.
- Tailwind tokens in `tailwind.config.ts` — `warm`, `terracotta`, `cream`,
  `filament`, `spool`, semantic `surface`/`ink`/`line`/`accent`, `shadow-soft-*`,
  `animate-reveal-up`/`draw-line`.
- `i18n/routing.ts` — locales `['vi','en']`, default `vi`, `localePrefix: always`.
- Data layer `lib/page-builder.ts` — `getPageBySlug`, `getHomePage`,
  `fetchPageBySlugDraft`, cache tags.
- Builder route `app/[locale]/build/[slug]/` (+ `preview/`), `EditorShell`,
  `use-autosave`, `lib/page-builder/preview-messages.ts`.

### New storefront page primitives (Phase 1)
Create a small primitives module (e.g. `components/layout/page/` or
`components/storefront/`), each composing the existing identity primitives:
- `StorefrontPageHeader` — `SpecTag` eyebrow + `font-display` heading +
  `warm-600` subtitle + optional `LayerLineDivider` + optional actions.
- `PageShell` / `ContentSection` — token-based section wrapper (consistent
  `max-w`, padding rhythm, optional `BuildPlateGrid`, `reveal-up` stagger).
- `PrimaryButton` / `SecondaryButton` — warm `rounded-xl` CTA styles.

These are the only structural primitives introduced; every page composes them.

### Localization (Phase 3)
- `payload.config.ts`: add
  `localization: { locales: ['vi','en'], defaultLocale: 'vi', fallback: true }`.
- `src/payload/collections/Pages.ts`: mark `title`, `layout`, `meta` as
  `localized: true`. Keep `slug` non-localized (shared identifier).
- `lib/page-builder.ts`: thread `locale` into Payload `find`/`findByID` calls;
  `getPageBySlug(slug, locale)`, `getHomePage(locale)`; locale-scoped cache tags
  (e.g. `page-${slug}-${locale}`).
- Storefront: `app/[locale]/(storefront)/page.tsx` and `pages/[slug]/page.tsx`
  pass the route `locale`.
- Visual builder + preview + autosave: thread the editor's active locale into
  reads and writes so each locale's content edits independently. Add a locale
  selector to `EditorShell` if not already locale-scoped by route.
- Migration: generate a Payload migration for the localized columns; backfill
  existing `home` (and any other page) content into the `vi` locale so nothing is
  lost. (New Payload block/field changes require a generated migration or the
  storefront throws `42P01` at runtime — see project memory.)

### Block icons (Phase 1)
- Replace the 13 SVGs in `public/admin/block-previews/` with clean line-art
  reading as each section, in `ink`/`filament` tones.
- Add dedicated `recommendations.svg` and `recently-viewed.svg` and point those
  blocks' `imageURL` at them (they currently borrow `featured-products.svg`).
- `imageURL` paths live in `src/payload/blocks/*.ts`; the picker
  (`components/page-builder/AddSectionPicker.tsx`) renders them automatically.

## Per-Page Redesign Map (restyle-only)

- **Content/info:** `about`, `contact`, `faq`, `info/[slug]` (content from
  `lib/info-pages.ts`). Header + section treatment, value/info cards on
  `surface` + `shadow-soft`, layer-line dividers.
- **Account/auth:** `profile`, `login`, `forgot-password`, `reset-password`.
  Shared header; auth forms wrapped in a warm `rounded-2xl` card. Form components
  (`AuthForm`, `ForgotPasswordForm`, `ResetPasswordForm`, `ProfileShell`) keep
  their logic; only wrappers/classes change.
- **Checkout:** `checkout`, `checkout/success`, `checkout/cancel`,
  `checkout/error`. Header + status states on tokens (terracotta = error,
  accent = success). Cart/payment logic untouched.
- **Search/listing:** `search`, `search/[collection]`. Header, result-count, and
  empty-state shell on the vocabulary; product grid/query untouched.

## Phasing

1. **Phase 1 — Foundation** (low risk, no DB): storefront page primitives +
   block icons.
2. **Phase 2 — Page redesigns** (pure frontend): the four page groups onto the
   primitives.
3. **Phase 3 — Localization** (riskiest, last): Payload localization + locale
   threading through data layer/storefront/builder/preview/autosave + migration +
   backfill.

Each task within a phase is executed in its own git worktree by a subagent with a
self-contained prompt (per established workflow).

## Verification

- **Primitives/icons (P1):** Storybook-free visual check — run dev server, open a
  redesigned page; open the visual builder block-picker and confirm new icons
  render for all 15 blocks (incl. recommendations/recently-viewed). Unit tests
  for any primitive with logic.
- **Redesigns (P2):** Manually load each page in `vi` and `en` routes; verify
  forms still submit (checkout flow to a test order, login, password reset),
  search returns results, no console errors, dark mode intact, keyboard focus
  visible, reduced-motion respected.
- **Localization (P3):** Generate + run migration on a copy; confirm existing
  home content present under `vi`; edit `en` content in the builder and confirm
  `/en` route renders it while `/vi` renders `vi`; confirm preview + autosave
  operate per-locale; run existing page-builder tests
  (`lib/__tests__/page-builder-draft.test.ts`, etc.) and add a locale-resolution
  test for `getPageBySlug`.
- Run the full test suite (Vitest) and a production build before each phase
  merge.

## Risks

- **Localization is invasive** — it touches builder, autosave, and preview, plus
  a data migration. Isolated to Phase 3 and done last. If locale-aware builder
  proves large, the fallback is per-locale read on the storefront first and a
  follow-up for builder editing — but the goal is full builder locale-awareness.
- Migration must backfill existing content into `vi` or the live home page goes
  blank.
