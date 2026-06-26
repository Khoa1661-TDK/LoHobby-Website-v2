`# Per-Theme Block Colors — Design

Date: 2026-06-22
Branch context: `feature/page-builder-link-text-button-social`

## Goal

Let page-builder editors set a **separate custom color for light vs dark theme** on a
section block, and have the storefront render the correct one based on the active
theme. The editor exposes a Light/Dark toggle that visually parallels the existing
vi/en locale switcher.

## Background / Current State

- Each section block has appearance fields (`src/payload/blocks/_appearance.ts`):
  - `background`: `theme | light | dark | custom`
  - `backgroundCustom`: a single hex value (only used when `background === 'custom'`)
- `lib/page-builder.ts` `blockAppearanceClasses()` maps these to classes + an inline
  `style: { backgroundColor }` for the custom case — identical in both themes.
- Storefront dark mode is **class-based**: `tailwind.config.ts` has `darkMode: 'class'`,
  and `components/theme-toggle.tsx` toggles `.dark` on the root element. The active
  theme is decided **client-side** (localStorage / `matchMedia`), so the server does
  **not** know the theme at render time.

## Key Architectural Decision

The vi/en toggle is real Payload **localization** (the `layout` field is `localized: true`,
so swapping locale swaps stored data). Theme is **not** a localization dimension.

We will **not** model theme as a Payload locale (that would explode into
vi-light / vi-dark / en-light / en-dark and conflate language with appearance).
Instead:

- Per-theme color is stored as **paired sibling hex fields** on the same block.
- The editor's Light/Dark control is a **UI mode toggle** (no data refetch), in
  contrast to the locale switcher which refetches per-locale layout data.

## Design

### 1. Data Model (`src/payload/blocks/_appearance.ts`)

- Keep `backgroundCustom` (existing hex) → this is the **light** value.
- Add `backgroundCustomDark` (hex `text`, same `condition: background === 'custom'`)
  → the **dark** value.

Migration semantics:
- Existing `backgroundCustom` values remain as the light value.
- `backgroundCustomDark` defaults empty and **falls back to the light value at render**,
  so existing pages are visually unchanged until an editor sets a dark color.
- A Payload migration is **required** — adding a column to the blocks table. Skipping it
  throws `42P01` at runtime (per project history `payload-blocks-need-migration`).

### 2. Storefront Rendering (`lib/page-builder.ts` + `app/globals.css`)

Because the theme is client-side, the server emits **both** colors and lets CSS choose
(no JS, no flash). The `custom` branch of `blockAppearanceClasses()` returns:

```
section: "...existing classes... blk-custom-bg"
style:   { '--blk-bg': light, '--blk-bg-dark': dark || light }
```

Add once to `app/globals.css`:

```css
.blk-custom-bg { background-color: var(--blk-bg); }
.dark .blk-custom-bg { background-color: var(--blk-bg-dark, var(--blk-bg)); }
```

The `BlockAppearance` type in `lib/page-builder.ts` gains
`backgroundCustomDark?: string | null`.

When no dark value is set, `var(--blk-bg-dark, var(--blk-bg))` falls back to the light
value — existing pages unaffected.

### 3. Editor UX (`components/page-builder/EditorShell.tsx`, `FieldRenderer.tsx`, preview wrapper)

A page-level **Light / Dark** toggle in the editor header, placed next to the vi/en
switcher so it reads as a sibling control. It does two things and triggers **no data
refetch**:

1. **Preview**: toggles `.dark` on the live-preview iframe root so the page is shown in
   the selected theme.
2. **Color pickers**: the appearance `ColorField` for the custom background binds to the
   light slot (`backgroundCustom`) or the dark slot (`backgroundCustomDark`) depending on
   the toggle. The picker shows a "Light" / "Dark" label and an "inherits light" hint when
   the dark slot is empty.

Build the light/dark slot routing as a small **reusable helper** so future color fields
(e.g. on the new Text/Button blocks) can adopt the pattern without rework. Do **not** add
per-theme colors to fields that currently have no color.

## Scope

In scope:
- `backgroundCustom` gains a paired `backgroundCustomDark`.
- Storefront renders theme-reactive custom background.
- Editor Light/Dark toggle (preview + color-slot routing).
- Payload migration for the new column.
- Reusable slot-routing helper for future color fields.

Out of scope:
- Adding new color fields to blocks that don't have one.
- Per-theme variants of anything other than the custom background color.
- Any change to vi/en localization behavior.

## Testing

- Unit: `blockAppearanceClasses()` emits `blk-custom-bg` + both CSS vars for custom;
  dark var falls back to light when dark is empty; non-custom backgrounds unchanged.
- Unit: editor color-slot routing helper returns the correct field name for the active
  theme mode.
- Component: `FieldRenderer` color picker writes to the light vs dark field per the
  active mode (extend `FieldRenderer-color.test.tsx`).
- Migration: `migrate:status` clean after `migrate:create`; storefront renders a custom
  page without `42P01`.

## Risks / Notes

- The CSS-variable approach assumes the section wrapper element carries the
  `blk-custom-bg` class and the inline CSS vars; confirm RenderBlocks applies both
  `section` class and `style` from `blockAppearanceClasses()` when wiring.
- The preview iframe wraps blocks in storefront Providers (per
  `page-builder-preview-needs-storefront-providers`); the `.dark` toggle must apply to the
  iframe document root inside that wrapper.
