# Page-Builder Block Expansion — Design

**Date:** 2026-06-27
**Status:** Approved (pending spec review)
**Area:** Storefront page-builder blocks

## Goal

Grow the page-builder block library and the shared customization options so a
store operator can build richer, more bespoke pages without code. Two tracks:

1. **Four new blocks** — Pricing Table, Countdown Timer, Tabs/Accordion, Feature List.
2. **Four shared customization knobs** — added once to the appearance layer, applied to every block.

New blocks register into the existing AI assistant for free (the assistant reads
`REGISTERED_BLOCKS` in `lib/page-builder/block-schemas.ts`).

## Background — how a block is wired

A block currently touches **7 places**. New blocks follow the same path:

1. `src/payload/blocks/<Name>.ts` — Payload `Block` schema (inherits `appearanceFields`).
2. `src/payload/blocks/index.ts` — barrel export.
3. `src/payload/collections/Pages.ts` — import + add to `layoutBlocks`.
4. `components/blocks/<Name>.tsx` — React render component.
5. `components/blocks/RenderBlocks.tsx` — import + `switch` case.
6. `lib/page-builder/block-schemas.ts` — import + add to `REGISTERED_BLOCKS`.
7. `lib/page-builder.ts` — add `blockType` to the `PageBlock` union.

Plus a generated Payload migration (`src/migrations/`).

## Part A — Four new blocks

### A1. Pricing Table — `pricingTable` (server component)

Fields: `heading`, `subheading`, `tiers[]` of
`{ name, price, period, description, features[]{ text }, ctaLabel, ctaHref, highlighted (checkbox) }`,
plus `appearanceFields`.

Render: responsive card grid (1 / 2 / 3 cols). The `highlighted` tier gets accent
border + subtle elevation. Renders `null` when no tiers. Reuses `_primitives`
helpers and `link.ts` for CTA hrefs where applicable.

### A2. Countdown Timer — `countdown` (client component)

Fields: `heading`, `targetDate` (text, ISO 8601), `expiredText`, optional CTA
(`ctaLabel`, `ctaHref`), plus `appearanceFields`.

Render: `'use client'`. Computes days/hours/minutes/seconds from `targetDate`,
ticks every second via `useEffect`/`setInterval`, cleans up on unmount. Hydration-safe:
initial render shows a stable placeholder, real countdown starts after mount to avoid
SSR/client mismatch. After the target passes, shows `expiredText`.

### A3. Tabs / Accordion — `tabs` (client component)

Fields: `variant` (`tabs` | `accordion`, default `tabs`), `items[]` of
`{ label (text), content (richText) }`, plus `appearanceFields`.

Render: `'use client'`. `variant === 'tabs'` → tab bar + active panel.
`variant === 'accordion'` → stacked collapsible rows (first open by default).
RichText content renders through the existing Lexical renderer path used by the
`richText` block. Keyboard accessible (arrow keys / enter, `aria-expanded`,
`role="tablist"`/`tab`/`tabpanel`).

### A4. Feature List with Icons — `featureGrid` (server component)

Fields: `heading`, `subheading`, `columns` (`2` | `3` | `4`, default `3`),
`items[]` of `{ icon (select), title, text }`, plus `appearanceFields`.

Icons: a curated `select` of ~16 `lucide-react` icon names (e.g. `zap`, `truck`,
`shield`, `star`, `box`, `layers`, `printer`, `sparkles`, …). A small
`lib/page-builder/feature-icons.tsx` maps the string → the lucide component, so the
schema stays a serializable string `select` (works with `block-schemas` + the AI
assistant). Unknown/empty icon falls back gracefully (no icon, no crash).

Render: responsive grid keyed off `columns`; each cell = icon + title + text.
Renders `null` when no items.

## Part B — Four shared customization knobs

Added once to `src/payload/blocks/_appearance.ts` (`appearanceFields`), the
`BlockAppearance` type, and `blockAppearanceClasses()` in `lib/page-builder.ts`.
Because every block spreads `appearanceFields`, all blocks gain these at once.

> Constraint: class strings returned from `lib/page-builder.ts` ARE scanned by
> Tailwind (`lib/**` is in `content`), but a bracketed regex literal in a `lib/`
> file breaks the whole stylesheet — so the helper stays plain string logic, no regex.

### B1. Content alignment — `contentAlign`

`select`: `left` | `center` | `right` (default `left`). Maps to text/content
alignment classes applied to the container. Blocks that already hard-center
(e.g. Stats heading) keep their internal layout; this controls the section default.

### B2. Rounded + border — `rounded` + `border`

`rounded` `select`: `none` | `sm` | `md` | `lg` | `xl` (default `none`).
`border` `checkbox` (default off). Together they give sections a card-like look
(radius + `border border-line`). Applied to the section element. Requires
`overflow-hidden` when rounded + a non-theme background so corners clip cleanly.

### B3. Max-width override — `containerWidth: 'custom'` + `maxWidthCustom`

Add a `custom` option to the existing `containerWidth` select, plus a conditional
`maxWidthCustom` text field (px, shown only when `containerWidth === 'custom'`).
When custom, the container gets `mx-auto` + inline `style.maxWidth`. The
`block-schemas` condition prober only recognizes `background === 'custom'` today;
extend `describeCondition` to also recover `containerWidth === 'custom'` so the
custom builder panel hides/shows the field correctly.

### B4. Scroll animation — `animate` (Option A: client RevealOnScroll)

`animate` `select`: `none` | `reveal-up` | `reveal-right` | `scale-in`
(default `none`). The animation keyframes already exist in `tailwind.config.ts`.

Implementation: a thin client component `components/blocks/RevealOnScroll.tsx`
(`'use client'`) using `IntersectionObserver`. In `RenderBlocks`, when a block's
`animate` is set and not `none`, wrap the rendered block in `RevealOnScroll`, which
adds the chosen `animate-*` class when the element scrolls into view (once).
Progressive enhancement: without JS the content is visible (no opacity-0 lock-in
until the observer attaches). Blocks remain server components; logic lives in one place.

## Data flow

Payload `pages.layout` (blocks) → `getPageBySlug` / draft fetch in `lib/page-builder.ts`
→ `RenderBlocks` → per-block component. New blocks slot into the same path. The
`block-schemas` registry derives serializable descriptors from the same `Block`
definitions, so the custom builder panel and the AI assistant stay in sync with zero
drift.

## Migration

The 4 new blocks add tables; the shared appearance fields add columns to every block
table (`contentAlign`, `rounded`, `border`, `maxWidthCustom`, `animate`, plus the new
`custom` enum value on `containerWidth`).

Risk: `DATABASE_URL` is a **remote Postgres whose migration ledger is drifted behind
`src/migrations`**. Procedure:

1. Run `migrate:status` first to confirm ledger state.
2. Generate the migration with `migrate:create`; **review the generated SQL by hand**
   (enum alters + many ADD COLUMNs — confirm nothing destructive).
3. Apply/verify against a local DB before any remote run.
4. New block/field without a migration throws `42P01` at runtime — migration is required, not optional.

## Testing

Follows the existing `components/blocks/__tests__/*.test.tsx` (Vitest) pattern.
Test files MUST import `describe/it/expect` from `vitest` (globals are runtime-only,
`tsc --noEmit` needs the imports).

- **Each new block:** renders `null` on empty input; renders expected content on valid
  input; unhappy paths (Countdown expired state, Tabs accordion variant, featureGrid
  unknown icon fallback).
- **Appearance helper:** `blockAppearanceClasses` cases for the 4 new knobs
  (alignment, rounded+border, custom max-width inline style, animate class selection).
- **Registry:** the 4 new blocks appear in `getBlockSchemas()` so the AI assistant sees them.

## Out of scope (YAGNI)

- No new AI-assistant tool actions — the assistant gains the blocks via the registry only.
- No localization-specific work beyond what existing blocks already do (richText in
  `tabs` follows the existing localized-block handling).
- No per-block bespoke animation timing controls — the 4 presets are enough.
- No icon upload/custom-SVG — curated lucide set only.

## Wiring checklist per new block (recap)

Schema → barrel → Pages `layoutBlocks` → React component → `RenderBlocks` switch →
`block-schemas` `REGISTERED_BLOCKS` → `PageBlock` union → migration → tests.
