# Store-Page Visual Consistency, Per-Locale CMS Pages & Block Icons — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port every hardcoded storefront page onto the locked maker-shop identity, enable per-locale CMS pages via Payload localization, and replace the block-picker icons.

**Architecture:** Phase 1 introduces reusable storefront page primitives (composed from the existing `components/blocks/_primitives.tsx` identity pieces) and new block icons. Phase 2 restyles the four hardcoded page groups onto those primitives — restyle-only, no logic changes. Phase 3 enables Payload native localization and threads the route locale through the data layer, storefront, visual builder, preview, and autosave, with a migration that backfills existing content into `vi`.

**Tech Stack:** Next.js 15 (App Router), Payload CMS 3.x (Postgres adapter), next-intl, Tailwind CSS 4, TypeScript (strict), Vitest, pnpm.

## Global Constraints

- Locales: `['vi','en']`, default `vi`, `localePrefix: 'always'` (from `i18n/routing.ts`) — do not change.
- Restyle-only for hardcoded pages: never alter form, payment, cart, auth, or search logic — only classes/markup wrappers.
- Follow the locked identity exactly; do not invent new colors/fonts. Canonical eyebrow is `SpecTag`. Canonical CTA is the warm `rounded-xl` button (no `rounded-full bg-black`).
- Reuse `SpecTag`, `BuildPlateGrid`, `LayerLineDivider` from `components/blocks/_primitives.tsx` — do not duplicate them.
- Theme tokens only: `warm-*`, `terracotta-*`, `cream-*`, `surface`/`surface-raised`, `ink`, `line`, `accent`, `shadow-soft-*`, `animate-reveal-up`. No raw `neutral-*`/`black`/`white` for themed surfaces.
- All motion wrapped in `motion-safe:`; keyboard focus must remain visible; dark mode must work.
- New Payload block/field/localization changes REQUIRE a generated migration or the storefront throws `42P01` at runtime.
- `pnpm <script>` fails via runDepsStatusCheck — call `node_modules/.bin/<bin>` directly (e.g. `node_modules/.bin/vitest`).
- Each task runs in its own git worktree with a self-contained prompt; commit at the end of each task using Conventional Commits ending with the `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>` trailer.

---

## Phase 1 — Foundation

### Task 1: Storefront page primitives

**Files:**
- Create: `components/layout/page/page-primitives.tsx`
- Create: `components/layout/page/index.ts`
- Test: `components/layout/page/__tests__/page-primitives.test.tsx`

**Interfaces:**
- Consumes: `SpecTag`, `BuildPlateGrid`, `LayerLineDivider` from `@/components/blocks/_primitives`.
- Produces (later tasks rely on these exact names/props):
  - `StorefrontPageHeader({ eyebrow?: string; title: string; subtitle?: string; align?: 'left' | 'center'; actions?: ReactNode; divider?: boolean }): ReactElement`
  - `PageShell({ children: ReactNode; width?: 'narrow' | 'normal' | 'wide'; grid?: boolean; className?: string }): ReactElement` — `narrow=max-w-3xl`, `normal=max-w-screen-xl`, `wide=max-w-screen-2xl`.
  - `ContentSection({ children: ReactNode; className?: string }): ReactElement` — vertical rhythm wrapper (`py-12 md:py-16`) with `motion-safe:animate-reveal-up`.
  - `PrimaryButton` / `SecondaryButton` — render as `<a>`/`<button>`; accept standard anchor/button props + `className`.

- [ ] **Step 1: Write the failing test**

```tsx
// components/layout/page/__tests__/page-primitives.test.tsx
import { render, screen } from '@testing-library/react';
import { StorefrontPageHeader, PageShell } from '../page-primitives';

describe('StorefrontPageHeader', () => {
  it('should render the eyebrow, title and subtitle when all provided', () => {
    render(
      <StorefrontPageHeader eyebrow="About" title="Our workshop" subtitle="3D printed, made to order" />,
    );
    expect(screen.getByText('About')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Our workshop' })).toBeInTheDocument();
    expect(screen.getByText('3D printed, made to order')).toBeInTheDocument();
  });

  it('should omit the eyebrow node when no eyebrow is given', () => {
    const { container } = render(<StorefrontPageHeader title="Only title" />);
    expect(container.querySelector('.font-mono')).toBeNull();
  });
});

describe('PageShell', () => {
  it('should apply the narrow max-width class when width is narrow', () => {
    const { container } = render(<PageShell width="narrow">x</PageShell>);
    expect(container.firstChild).toHaveClass('max-w-3xl');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node_modules/.bin/vitest run components/layout/page/__tests__/page-primitives.test.tsx`
Expected: FAIL — module `../page-primitives` not found.

- [ ] **Step 3: Write the primitives**

```tsx
// components/layout/page/page-primitives.tsx
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactElement, ReactNode } from 'react';
import { SpecTag, BuildPlateGrid, LayerLineDivider } from '@/components/blocks/_primitives';

const WIDTHS = {
  narrow: 'max-w-3xl',
  normal: 'max-w-screen-xl',
  wide: 'max-w-screen-2xl',
} as const;

export function PageShell({
  children,
  width = 'normal',
  grid = false,
  className = '',
}: {
  children: ReactNode;
  width?: keyof typeof WIDTHS;
  grid?: boolean;
  className?: string;
}): ReactElement {
  return (
    <div className={`relative mx-auto ${WIDTHS[width]} px-4 ${className}`}>
      {grid ? <BuildPlateGrid /> : null}
      <div className="relative">{children}</div>
    </div>
  );
}

export function ContentSection({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}): ReactElement {
  return (
    <section className={`py-12 md:py-16 motion-safe:animate-reveal-up ${className}`}>
      {children}
    </section>
  );
}

export function StorefrontPageHeader({
  eyebrow,
  title,
  subtitle,
  align = 'left',
  actions,
  divider = true,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: 'left' | 'center';
  actions?: ReactNode;
  divider?: boolean;
}): ReactElement {
  const alignment = align === 'center' ? 'text-center items-center' : 'text-left items-start';
  return (
    <header className={`flex flex-col gap-4 ${alignment}`}>
      {eyebrow ? <SpecTag>{eyebrow}</SpecTag> : null}
      <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-balance text-warm-900 dark:text-warm-100 md:text-4xl lg:text-5xl">
        {title}
      </h1>
      {subtitle ? (
        <p className="max-w-2xl text-base leading-relaxed text-warm-600 dark:text-warm-400 md:text-lg">
          {subtitle}
        </p>
      ) : null}
      {actions ? <div className="mt-2 flex flex-wrap gap-3">{actions}</div> : null}
      {divider ? (
        <div className="mt-4 w-full max-w-[28rem]">
          <LayerLineDivider />
        </div>
      ) : null}
    </header>
  );
}

const PRIMARY =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-warm-900 px-6 py-3 text-sm font-semibold text-warm-50 shadow-soft-md transition-all duration-300 hover:-translate-y-px hover:bg-warm-800 hover:shadow-soft-lg active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent dark:bg-warm-100 dark:text-warm-900 dark:hover:bg-warm-200';
const SECONDARY =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-line bg-surface-raised px-6 py-3 text-sm font-semibold text-warm-800 transition-all duration-300 hover:-translate-y-px hover:border-warm-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent dark:text-warm-200';

type AnchorOrButton =
  | ({ as?: 'a' } & AnchorHTMLAttributes<HTMLAnchorElement>)
  | ({ as: 'button' } & ButtonHTMLAttributes<HTMLButtonElement>);

export function PrimaryButton(props: AnchorOrButton): ReactElement {
  const { as = 'a', className = '', ...rest } = props as { as?: 'a' | 'button'; className?: string };
  const cls = `${PRIMARY} ${className}`;
  return as === 'button' ? (
    <button className={cls} {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)} />
  ) : (
    <a className={cls} {...(rest as AnchorHTMLAttributes<HTMLAnchorElement>)} />
  );
}

export function SecondaryButton(props: AnchorOrButton): ReactElement {
  const { as = 'a', className = '', ...rest } = props as { as?: 'a' | 'button'; className?: string };
  const cls = `${SECONDARY} ${className}`;
  return as === 'button' ? (
    <button className={cls} {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)} />
  ) : (
    <a className={cls} {...(rest as AnchorHTMLAttributes<HTMLAnchorElement>)} />
  );
}
```

```ts
// components/layout/page/index.ts
export {
  PageShell,
  ContentSection,
  StorefrontPageHeader,
  PrimaryButton,
  SecondaryButton,
} from './page-primitives';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node_modules/.bin/vitest run components/layout/page/__tests__/page-primitives.test.tsx`
Expected: PASS (4 assertions).

- [ ] **Step 5: Typecheck + commit**

Run: `node_modules/.bin/tsc --noEmit` (expect no new errors in the new files).
```bash
git add components/layout/page
git commit -m "feat(storefront): add shared page primitives on maker identity"
```

---

### Task 2: Block-picker icons

**Files:**
- Replace: all SVGs in `public/admin/block-previews/` (13 existing)
- Create: `public/admin/block-previews/recommendations.svg`, `public/admin/block-previews/recently-viewed.svg`
- Modify: `src/payload/blocks/Recommendations.ts`, `src/payload/blocks/RecentlyViewed.ts` (point `imageURL` to the new dedicated icons)

**Interfaces:**
- Consumes: nothing new. `AddSectionPicker.tsx` already renders `schema.imageURL` as `<img>`.
- Produces: 15 block icons resolvable from `imageURL` (one per block; recommendations/recently-viewed no longer borrow `featured-products.svg`).

- [ ] **Step 1: Inventory current icons**

Run: `ls public/admin/block-previews/` and confirm 13 files. Note that `recommendations` and `recentlyViewed` blocks currently reference `featured-products.svg`.

- [ ] **Step 2: Replace each SVG with clean on-brand line-art**

For each existing file (`hero.svg`, `featured-collection.svg`, `featured-products.svg`, `rich-text.svg`, `image-with-text.svg`, `gallery.svg`, `testimonials.svg`, `logo-cloud.svg`, `newsletter.svg`, `faq.svg`, `promo-banner.svg`, `video-embed.svg`, `divider.svg`), write a 64×40 viewBox SVG using `stroke="currentColor"` line-art on `fill="none"` that visually reads as the section it represents (e.g. hero = large banner block + headline lines + button pill; gallery = 3×2 image grid; faq = stacked rows with chevrons; divider = a centered layer-line). Keep stroke-width consistent (1.5). No external fonts, no embedded raster.

Example (`divider.svg`):
```svg
<svg viewBox="0 0 64 40" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.5">
  <line x1="8" y1="20" x2="56" y2="20" stroke-dasharray="1 3" stroke-linecap="round"/>
</svg>
```

- [ ] **Step 3: Add dedicated recommendations + recently-viewed icons**

Create `recommendations.svg` (e.g. a product card with a small spark/star) and `recently-viewed.svg` (e.g. a product card with a clock) following the same line-art style.

- [ ] **Step 4: Point the two blocks at their new icons**

In `src/payload/blocks/Recommendations.ts`, set `imageURL: '/admin/block-previews/recommendations.svg'`.
In `src/payload/blocks/RecentlyViewed.ts`, set `imageURL: '/admin/block-previews/recently-viewed.svg'`.

- [ ] **Step 5: Verify in the picker + commit**

Start dev (`node_modules/.bin/next dev` or the project dev command), open the visual builder for any page, click "+ Add section", confirm all 15 blocks show their new distinct icon and none is broken/missing.
```bash
git add public/admin/block-previews src/payload/blocks/Recommendations.ts src/payload/blocks/RecentlyViewed.ts
git commit -m "feat(page-builder): replace block-picker icons with on-brand line-art"
```

---

## Phase 2 — Page Redesigns (restyle-only)

> Shared method for every Task in this phase: read the whole page file first. Replace the bespoke header markup with `StorefrontPageHeader`, wrap content in `PageShell` + `ContentSection`, swap CTAs to `PrimaryButton`/`SecondaryButton`, and map classes per this table. Touch ONLY presentation — keep all data fetching, form components, handlers, JSON-LD, and i18n keys exactly as they are. Verify each route in both `/vi` and `/en` and confirm no console errors and that interactive flows still work.

**Class mapping (apply throughout):**
- `text-neutral-600` / `text-neutral-400` → `text-warm-600` / `dark:text-warm-400`
- `font-bold tracking-tight` heading → add `font-display ... text-warm-900 dark:text-warm-100 text-balance`
- `border-neutral-200 dark:border-neutral-800` → `border-line`
- card bg → `bg-surface-raised shadow-soft-sm rounded-2xl`
- `rounded-full bg-black ... text-white` CTA → `<PrimaryButton>` ; outline CTA → `<SecondaryButton>`
- bespoke eyebrow → `<SpecTag>` (via `StorefrontPageHeader eyebrow=...`)

### Task 3: Content/info pages

**Files (modify):**
- `app/[locale]/(storefront)/about/page.tsx`
- `app/[locale]/(storefront)/contact/page.tsx`
- `app/[locale]/(storefront)/faq/page.tsx`
- `app/[locale]/(storefront)/info/[slug]/page.tsx`

**Interfaces:** Consumes Task 1 primitives from `@/components/layout/page`.

- [ ] **Step 1:** Redesign `about/page.tsx` — replace the hand-rolled `<section>` header (`p.text-filament-600` eyebrow, `h1`, description) with `<PageShell width="narrow"><StorefrontPageHeader eyebrow={BRAND_ORIGIN} title={t('aboutHeading',{siteName})} subtitle={BRAND_DESCRIPTION} />`. Wrap the story prose + value-cards grid in `<ContentSection>`. Convert the value cards to `bg-surface-raised shadow-soft-sm rounded-2xl border border-line`. Convert the two CTAs (`rounded-full bg-black` / outline) to `<PrimaryButton href="/search">` and `<SecondaryButton href="/contact">`. Keep JSON-LD and all `t(...)` keys.
- [ ] **Step 2:** Redesign `contact/page.tsx` — header via `StorefrontPageHeader`; wrap the `ContactForm` and the sidebar (email/hotline/address from `getStoreBranding()`) in `PageShell`/`ContentSection`; sidebar items become `bg-surface-raised rounded-2xl` cards. Do not touch `ContactForm` internals.
- [ ] **Step 3:** Redesign `faq/page.tsx` — header via `StorefrontPageHeader`; render the 7 Q&A (`faqQ1..7`/`faqA1..7`) as `bg-surface-raised rounded-2xl border border-line` cards; related-links row as `SecondaryButton`s. Keep i18n keys.
- [ ] **Step 4:** Redesign `info/[slug]/page.tsx` — header via `StorefrontPageHeader title={page.title}`; render body inside `PageShell width="narrow"` with `prose prose-warm dark:prose-invert`. Content still comes from `lib/info-pages.ts` — do not move it.
- [ ] **Step 5:** Verify `/vi/about /en/about /vi/contact /vi/faq /vi/info/payment` render correctly (light+dark), contact form still submits. Then commit:
```bash
git add app/[locale]/(storefront)/about app/[locale]/(storefront)/contact app/[locale]/(storefront)/faq "app/[locale]/(storefront)/info"
git commit -m "feat(storefront): restyle content/info pages onto maker identity"
```

### Task 4: Account/auth pages

**Files (modify):**
- `app/[locale]/(storefront)/profile/page.tsx`
- `app/[locale]/(storefront)/login/page.tsx`
- `app/[locale]/(storefront)/forgot-password/page.tsx`
- `app/[locale]/(storefront)/reset-password/page.tsx`

**Interfaces:** Consumes Task 1 primitives.

- [ ] **Step 1:** `profile/page.tsx` — replace the hero (`eyebrow`, `welcomeBack`, `heroSubtitle`) with `StorefrontPageHeader`; wrap `ProfileShell` in `PageShell`. Do NOT change `ProfileShell` tab logic.
- [ ] **Step 2:** `login/page.tsx` — header via `StorefrontPageHeader`; wrap `AuthForm` in a `bg-surface-raised shadow-soft-md rounded-2xl border border-line p-6` card inside `PageShell width="narrow"`. Restyle the admin-required alert box to `border-terracotta-300 bg-terracotta-50 text-terracotta-700` (keep all `t(...)` keys). Do not touch `AuthForm` logic.
- [ ] **Step 3:** `forgot-password/page.tsx` and `reset-password/page.tsx` — same card+header treatment; wrap `ForgotPasswordForm`/`ResetPasswordForm` unchanged. Restyle the invalid-token message on `reset-password` to the terracotta alert style.
- [ ] **Step 4:** Verify login renders, an attempted login still posts, forgot/reset forms render in `/vi` and `/en`. Commit:
```bash
git add app/[locale]/(storefront)/profile app/[locale]/(storefront)/login app/[locale]/(storefront)/forgot-password app/[locale]/(storefront)/reset-password
git commit -m "feat(storefront): restyle account & auth pages onto maker identity"
```

### Task 5: Checkout flow pages

**Files (modify):**
- `app/[locale]/(storefront)/checkout/page.tsx`
- `app/[locale]/(storefront)/checkout/success/page.tsx`
- `app/[locale]/(storefront)/checkout/cancel/page.tsx`
- `app/[locale]/(storefront)/checkout/error/page.tsx`

**Interfaces:** Consumes Task 1 primitives.

- [ ] **Step 1:** `checkout/page.tsx` — header (`checkout.heading`/`checkout.subtitle`) via `StorefrontPageHeader`; wrap the existing `CheckoutForm` + guest-notice in `PageShell`. Guest notice becomes a `bg-surface-raised rounded-2xl border border-line` card. Do NOT touch cart/payment logic or `CheckoutForm`.
- [ ] **Step 2:** `checkout/success/page.tsx` — header via `StorefrontPageHeader`; order summary in `bg-surface-raised rounded-2xl` card; status messages use `text-accent` (success) styling. Keep all payment-method conditionals and `t('checkout.success.*')`.
- [ ] **Step 3:** `checkout/cancel/page.tsx` and `checkout/error/page.tsx` — header + centered `PageShell width="narrow"`; error page uses terracotta alert styling; CTA via `PrimaryButton`. Keep the env-var instruction text and all `t(...)` keys verbatim.
- [ ] **Step 4:** Verify a test checkout reaches the success page and the cancel/error pages render in `/vi` and `/en`. Commit:
```bash
git add app/[locale]/(storefront)/checkout
git commit -m "feat(storefront): restyle checkout flow pages onto maker identity"
```

### Task 6: Search/listing pages

**Files (modify):**
- `app/[locale]/(storefront)/search/page.tsx`
- `app/[locale]/(storefront)/search/[collection]/page.tsx`

**Interfaces:** Consumes Task 1 primitives.

- [ ] **Step 1:** `search/page.tsx` — header (search heading) via `StorefrontPageHeader`; restyle result-count line to `text-warm-600`; empty-state into a `bg-surface-raised rounded-2xl border border-line` card with a `PrimaryButton` back to catalog. Keep the product grid + query untouched.
- [ ] **Step 2:** `search/[collection]/page.tsx` — same header/empty-state treatment for the category listing shell. Keep collection data fetching untouched.
- [ ] **Step 3:** Verify a query returns results and an empty query shows the new empty state in `/vi` and `/en`. Commit:
```bash
git add app/[locale]/(storefront)/search
git commit -m "feat(storefront): restyle search & listing pages onto maker identity"
```

---

## Phase 3 — Localization (riskiest, last)

### Task 7: Enable Payload localization + localize Pages + migration

**Files:**
- Modify: `payload.config.ts`
- Modify: `src/payload/collections/Pages.ts`
- Create: a generated migration under `src/migrations/` (Payload migration ledger)

**Interfaces:**
- Produces: `Pages.title`, `Pages.layout`, `Pages.meta` localized; Payload `find`/`findByID` now accept a `locale` option that returns that locale's values.

- [ ] **Step 1:** Add localization to `payload.config.ts`:
```ts
localization: {
  locales: ['vi', 'en'],
  defaultLocale: 'vi',
  fallback: true,
},
```
- [ ] **Step 2:** In `src/payload/collections/Pages.ts`, add `localized: true` to the `title`, `layout`, and `meta` fields. Leave `slug` and `status` non-localized.
- [ ] **Step 3:** `DATABASE_URL` is a remote Prisma Postgres whose ledger can be behind `src/migrations` — run `migrate:status` FIRST and reconcile before `migrate:create`. Then generate the migration (Payload `migrate:create` via the payload CLI binary in `node_modules/.bin`). Inspect the generated SQL: it must add localized columns/tables without dropping existing `layout`/`title` data.
- [ ] **Step 4:** Write a backfill step in the migration's `up` (or a one-off script run as part of it) that copies existing `home` (and any other page) `title`/`layout`/`meta` into the `vi` locale so the live home page does not go blank.
- [ ] **Step 5:** Run the migration against a dev DB copy; confirm `payload` boots and the existing home content is present under `vi`. Commit:
```bash
git add payload.config.ts src/payload/collections/Pages.ts src/payload/migrations
git commit -m "feat(cms): enable Payload localization and localize Pages"
```

### Task 8: Thread locale through the data layer + storefront reads

**Files:**
- Modify: `lib/page-builder.ts`
- Modify: `app/[locale]/(storefront)/page.tsx`, `app/[locale]/(storefront)/pages/[slug]/page.tsx`
- Test: `lib/__tests__/page-builder-locale.test.ts`

**Interfaces:**
- Consumes: localized Pages (Task 7).
- Produces: `getPageBySlug(slug: string, locale: Locale): Promise<PageDoc | null>`, `getHomePage(locale: Locale): Promise<PageDoc | null>`; cache keyed per locale.

- [ ] **Step 1:** Write a failing test asserting `getPageBySlug` passes the locale through to Payload `find` (mock `getPayload`, assert the `find` call includes `locale`) and that cache keys/tags include the locale (e.g. `page-${slug}-${locale}`).
- [ ] **Step 2:** Run it — expect FAIL (current signature takes no locale).
- [ ] **Step 3:** Update `lib/page-builder.ts`: add a `locale` param to `fetchPageBySlug`, `getCachedPage` (include `locale` in the `unstable_cache` key array and tags), `getPageBySlug`, and `getHomePage`; pass `locale` into the Payload `find` call. Import `Locale` from `@/i18n/routing`.
- [ ] **Step 4:** Update the storefront pages to read the route `locale` (already in `params`) and pass it: `getHomePage(locale)` and `getPageBySlug(slug, locale)`. Update `revalidatePageCache` to bust both locales' tags (or accept a locale).
- [ ] **Step 5:** Run the test (PASS) and the existing page-builder tests. Commit:
```bash
git add lib/page-builder.ts lib/__tests__/page-builder-locale.test.ts app/[locale]/(storefront)/page.tsx "app/[locale]/(storefront)/pages"
git commit -m "feat(cms): resolve CMS pages per route locale"
```

### Task 9: Locale-aware visual builder, preview & autosave

**Files:**
- Modify: `app/[locale]/build/[slug]/page.tsx`, `app/[locale]/build/[slug]/preview/page.tsx`
- Modify: `components/page-builder/EditorShell.tsx`, `components/page-builder/use-autosave.ts`
- Modify: builder create/save API routes under `app/api/page-builder/` that read/write `layout`
- Test: `app/api/page-builder/__tests__/*` (extend existing) for locale param

**Interfaces:**
- Consumes: localized Pages + locale-aware data layer.
- Produces: the builder edits a chosen locale's content; reads/writes scope to that locale; preview renders that locale.

- [ ] **Step 1:** Determine the editing locale. Default to the route `locale` of `/[locale]/build/[slug]`. Add a small locale toggle in `EditorShell` header (vi/en) that updates the active editing locale in state.
- [ ] **Step 2:** Thread the active locale into the draft fetch (`fetchPageBySlugDraft(slug, locale)`), into `use-autosave` save calls, and into the create/save API routes so Payload `update`/`findByID` receive `{ locale }`.
- [ ] **Step 3:** Pass the active locale to the preview iframe URL/query so `preview/page.tsx` fetches and renders that locale; ensure the `refresh()` postMessage round-trip still works after a locale switch.
- [ ] **Step 4:** Extend the API tests to assert the locale is forwarded to Payload. Run them (PASS).
- [ ] **Step 5:** Manual check: open builder, switch to `en`, add/edit a block, confirm autosave persists to `en` only and `/en/<slug>` reflects it while `/vi/<slug>` is unchanged. Commit:
```bash
git add app/[locale]/build components/page-builder app/api/page-builder
git commit -m "feat(page-builder): make builder, preview & autosave locale-aware"
```

### Task 10: End-to-end localization verification + home backfill check

**Files:**
- Test: `lib/__tests__/page-builder-locale.test.ts` (extend), any seed script under `scripts/` if home seeding needs a locale.

- [ ] **Step 1:** Confirm `scripts/seed-home-page.ts` (or equivalent) writes to the `vi` locale; update if it relied on non-localized writes.
- [ ] **Step 2:** Add a test: `getHomePage('en')` returns `en` content and `getHomePage('vi')` returns `vi` content when both exist; falls back per `fallback: true` when an `en` value is missing.
- [ ] **Step 3:** Run the full suite (`node_modules/.bin/vitest run`) and a production build (`node_modules/.bin/next build`). Both green.
- [ ] **Step 4:** Manual smoke: `/vi` and `/en` home pages render their own content; builder edits each independently; no `42P01`. Commit:
```bash
git add lib/__tests__ scripts
git commit -m "test(cms): cover per-locale home resolution and fallback"
```

---

## Self-Review

- **Spec coverage:** primitives (T1), icons (T2), content/info (T3), account/auth (T4), checkout (T5), search (T6), Payload localization+migration (T7), data-layer+storefront locale (T8), builder/preview/autosave locale (T9), e2e+backfill (T10). All spec sections mapped.
- **Type consistency:** `getPageBySlug(slug, locale)` / `getHomePage(locale)` introduced in T8 and reused in T9/T10; primitive names (`StorefrontPageHeader`, `PageShell`, `ContentSection`, `PrimaryButton`, `SecondaryButton`) defined in T1 and consumed verbatim in T3–T6.
- **Restyle-only** constraint repeated per Phase 2 task; no logic edits requested.
- **Migration** required by global constraints and implemented in T7 with backfill to avoid blank home.
