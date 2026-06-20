# Hobby-Shop Visual Foundation + Home Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the generic cream/serif/terracotta storefront look with a 3D-printing maker-shop identity (Build Plate / Carbon themes, layer-line signature), and rebuild the home page entirely from page-builder blocks so the CMS can reproduce it.

**Architecture:** A semantic CSS-variable token layer (`--surface/--ink/--accent…`) drives both light and dark themes. Tailwind exposes those tokens as named colors. The shared `blockAppearanceClasses` helper and every `components/blocks/*` component are restyled to the tokens. The home page is authored as a page-builder block layout (`home-seed.ts`) — since `app/[locale]/(storefront)/page.tsx` already renders the CMS `home` page via `RenderBlocks` when it exists, building the home from blocks guarantees CMS parity by construction.

**Tech Stack:** Next.js 15 App Router, Tailwind CSS 4 (`darkMode: 'class'`), Payload CMS 3.x, `next/font/google`, Vitest + React Testing Library, `tsx` seed scripts.

## Global Constraints

- Theme tokens live in semantic CSS variables; **no new hardcoded `warm-*`/`cream`/`terracotta` classes** in restyled code — use the new `surface`/`ink`/`line`/`accent` tokens.
- Light theme "Build Plate": `--surface #ECEFF3`, `--surface-raised #FFFFFF`, `--ink #1B2027`, `--line #C9D2DC`, `--accent #1F6FEB`, `--accent-2 #FFC21A`, `--accent-3 #FF4D6D`.
- Dark theme "Carbon" (under `.dark`): `--surface #14181D`, `--surface-raised #1C222A`, `--ink #E7ECF1`, `--line #2C353F`, `--accent #4D90FF`, `--accent-2 #FFCE3A`, `--accent-3 #FF6B85`.
- Type roles: display **Space Grotesk**, body **Plus Jakarta Sans** (already loaded), mono **Space Mono**. Wire via `next/font/google` and the existing `--font-*-active` Tailwind hooks.
- Accessibility floor: AA contrast on `ink`/`surface`, visible keyboard focus, honor `prefers-reduced-motion` for "print-in" animations.
- New Payload block fields REQUIRE a generated migration (`pnpm payload migrate:create`) or the storefront throws Postgres `42P01` at runtime. Run binaries via `node_modules/.bin/<bin>` (the `pnpm <script>` deps-status check fails in this environment).
- Per-store branding (`--brand-primary/secondary`) must still override the accent tokens.
- Defer (NOT in this plan): B per-component color UI, C section icons, D template chooser.

## A note on verifying visual work

Pure logic (token mapping, seed layout shape, migrations) is covered with Vitest unit tests below. The per-component **restyle** tasks cannot be meaningfully unit-tested ("looks like a hobby shop" is not an assertion); they are verified by running the app and viewing the page (`run` skill / screenshot), plus a lint/build pass. Each restyle task names the exact token mapping to apply so the change is concrete, not "make it nice."

---

## File Structure

**Foundation (Phase 1)**
- Modify `app/globals.css` — add `@layer base` token blocks for `:root` and `.dark`; set `body` to `bg-surface text-ink`.
- Modify `tailwind.config.ts` — add `surface`/`ink`/`line`/`accent` semantic colors mapped to the vars; add `font-mono` → `--font-mono-active`.
- Modify `lib/page-builder.ts:10-56` — rewrite `blockAppearanceClasses` onto tokens.
- Test `lib/__tests__/block-appearance.test.ts` (new).
- Modify `app/[locale]/(storefront)/layout.tsx` — load Space Grotesk + Space Mono, add their `variable`s to the body class.
- Modify `lib/store-fonts.ts` — add `--font-mono-active` to `fontCssVariables`; set the maker display/mono defaults.
- Create `components/blocks/_primitives.tsx` — `LayerLineDivider`, `BuildPlateGrid`, `SpecTag` shared presentational primitives.
- Test `components/blocks/__tests__/primitives.test.tsx` (new).

**Block restyle (Phase 2)** — modify the existing files under `components/blocks/`.

**Home authoring (Phase 3)**
- Modify `lib/page-builder/home-seed.ts` — author the designed home layout.
- Modify `scripts/__tests__/seed-home-page.test.ts` and/or add `lib/page-builder/__tests__/home-seed.test.ts`.

**Parity gaps (Phase 4)**
- Modify `src/payload/blocks/Hero.ts` (+ any block needing new fields) and the matching `components/blocks/*`.
- Create migration under `src/migrations/` via the migrate CLI; register in `src/migrations/index.ts` (auto).

---

## PHASE 1 — Foundation

### Task 1: Semantic color tokens (light + dark)

**Files:**
- Modify: `app/globals.css` (top, before existing `@layer components`)
- Modify: `tailwind.config.ts` (the `colors` block)

**Interfaces:**
- Produces: CSS vars `--surface`, `--surface-raised`, `--ink`, `--line`, `--accent`, `--accent-2`, `--accent-3`; Tailwind classes `bg-surface`, `bg-surface-raised`, `text-ink`, `border-line`, `bg-accent`, `text-accent`, `bg-accent-2`, `bg-accent-3`.

- [ ] **Step 1: Add the token layer to `app/globals.css`**

Insert immediately after the `@tailwind utilities;` line:

```css
@layer base {
  :root {
    --surface: #ECEFF3;
    --surface-raised: #FFFFFF;
    --ink: #1B2027;
    --line: #C9D2DC;
    --accent: #1F6FEB;
    --accent-2: #FFC21A;
    --accent-3: #FF4D6D;
  }
  .dark {
    --surface: #14181D;
    --surface-raised: #1C222A;
    --ink: #E7ECF1;
    --line: #2C353F;
    --accent: #4D90FF;
    --accent-2: #FFCE3A;
    --accent-3: #FF6B85;
  }
  body {
    background-color: var(--surface);
    color: var(--ink);
  }
}
```

- [ ] **Step 2: Expose tokens to Tailwind**

In `tailwind.config.ts`, inside `theme.extend.colors`, add (keep the existing `warm`/`cream`/`terracotta`/`filament`/`spool` keys for now — they are removed in Phase 2 as components migrate):

```ts
surface: {
  DEFAULT: 'var(--surface)',
  raised: 'var(--surface-raised)',
},
ink: 'var(--ink)',
line: 'var(--line)',
accent: {
  DEFAULT: 'var(--accent)',
  2: 'var(--accent-2)',
  3: 'var(--accent-3)',
},
```

- [ ] **Step 3: Verify build picks up the classes**

Run: `node_modules/.bin/tsc --noEmit`
Expected: PASS (no type errors from the config change).

- [ ] **Step 4: Commit**

```bash
git add app/globals.css tailwind.config.ts
git commit -m "feat(theme): add build-plate/carbon semantic color tokens"
```

---

### Task 2: Rewrite `blockAppearanceClasses` onto tokens

**Files:**
- Modify: `lib/page-builder.ts:10-56`
- Test: `lib/__tests__/block-appearance.test.ts` (create)

**Interfaces:**
- Consumes: `BlockAppearance` type (`lib/page-builder.ts:3-8`).
- Produces: `blockAppearanceClasses(appearance) → { section, container, style }` with token-based classes.

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/block-appearance.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { blockAppearanceClasses } from '@/lib/page-builder';

describe('blockAppearanceClasses', () => {
  it('should use surface-raised token when background is light', () => {
    expect(blockAppearanceClasses({ background: 'light' }).section).toContain('bg-surface-raised');
  });

  it('should invert ink/surface when background is dark', () => {
    const { section } = blockAppearanceClasses({ background: 'dark' });
    expect(section).toContain('bg-ink');
    expect(section).toContain('text-surface');
  });

  it('should inherit (no bg class) when background is theme', () => {
    const { section } = blockAppearanceClasses({ background: 'theme' });
    expect(section).not.toContain('bg-');
  });

  it('should set inline backgroundColor and no bg class when custom', () => {
    const r = blockAppearanceClasses({ background: 'custom', backgroundCustom: '#abcdef' });
    expect(r.style.backgroundColor).toBe('#abcdef');
    expect(r.section).not.toContain('bg-warm');
  });

  it('should keep padding and width mapping intact', () => {
    const r = blockAppearanceClasses({ paddingY: 'spacious', containerWidth: 'narrow' });
    expect(r.section).toContain('py-24');
    expect(r.container).toContain('max-w-3xl');
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `node_modules/.bin/vitest run lib/__tests__/block-appearance.test.ts`
Expected: FAIL — `light` still returns `bg-warm-50`.

- [ ] **Step 3: Rewrite the `bgClass` branch**

In `lib/page-builder.ts`, replace the `bgClass` IIFE (lines 16-21) with:

```ts
  const bgClass = (() => {
    if (appearance.background === 'light') return 'bg-surface-raised text-ink';
    if (appearance.background === 'dark') return 'bg-ink text-surface';
    if (appearance.background === 'custom') return '';
    return ''; // 'theme' inherits from the page surface
  })();
```

Leave the `widthClass`, `pyClass`, and return/`style` logic unchanged.

- [ ] **Step 4: Run the test, verify it passes**

Run: `node_modules/.bin/vitest run lib/__tests__/block-appearance.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/page-builder.ts lib/__tests__/block-appearance.test.ts
git commit -m "feat(page-builder): map block appearance onto theme tokens"
```

---

### Task 3: Wire the maker type system

**Files:**
- Modify: `app/[locale]/(storefront)/layout.tsx`
- Modify: `lib/store-fonts.ts`
- Modify: `tailwind.config.ts` (`fontFamily`)

**Interfaces:**
- Produces: CSS vars `--font-space-grotesk`, `--font-space-mono`, `--font-mono-active`; Tailwind `font-display` → Space Grotesk, `font-mono` → Space Mono.

- [ ] **Step 1: Load the fonts in the storefront layout**

In `app/[locale]/(storefront)/layout.tsx`, add to the `next/font/google` import and font declarations (near the existing `jakarta`/`fraunces` block):

```ts
import { Fraunces, Inter, Plus_Jakarta_Sans, Roboto, Space_Grotesk, Space_Mono } from 'next/font/google';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-space-grotesk',
  display: 'swap',
});

const spaceMono = Space_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-space-mono',
  display: 'swap',
});
```

Add `spaceGrotesk.variable` and `spaceMono.variable` to the same `className` list that already includes `jakarta.variable` etc. on the `<html>`/`<body>` element (find the existing `.variable` join in this file and append both).

- [ ] **Step 2: Add mono var + maker defaults in `lib/store-fonts.ts`**

In `fontCssVariables`, return the mono var too, and point the active serif/display at Space Grotesk:

```ts
export function fontCssVariables(preset: FontPreset): Record<string, string> {
  const config = FONT_PRESETS[preset];
  return {
    '--font-sans-active': config.sansVar,
    '--font-serif-active': 'var(--font-space-grotesk)',
    '--font-mono-active': 'var(--font-space-mono)',
  };
}
```

(Display/headlines use `font-display` → `--font-serif-active`, now Space Grotesk. Body stays the preset sans, default Plus Jakarta.)

- [ ] **Step 3: Map `font-mono` in Tailwind**

In `tailwind.config.ts` `theme.extend.fontFamily`, add:

```ts
mono: ['var(--font-mono-active, var(--font-space-mono))', 'ui-monospace', 'monospace'],
```

- [ ] **Step 4: Verify types/build**

Run: `node_modules/.bin/tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "app/[locale]/(storefront)/layout.tsx" lib/store-fonts.ts tailwind.config.ts
git commit -m "feat(theme): wire Space Grotesk display + Space Mono spec type"
```

---

### Task 4: Shared visual primitives (layer line, build-plate grid, spec tag)

**Files:**
- Create: `components/blocks/_primitives.tsx`
- Test: `components/blocks/__tests__/primitives.test.tsx`

**Interfaces:**
- Produces:
  - `LayerLineDivider(): ReactElement` — a thin animated layer-line band; respects reduced motion.
  - `BuildPlateGrid({ className }): ReactElement` — faint slicer-bed grid background (absolute, `aria-hidden`).
  - `SpecTag({ children }): ReactElement` — mono uppercase spec label (`font-mono text-xs tracking-wide text-accent`).

- [ ] **Step 1: Write the failing test**

Create `components/blocks/__tests__/primitives.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { SpecTag, BuildPlateGrid, LayerLineDivider } from '../_primitives';

describe('block primitives', () => {
  it('should render SpecTag content in a mono label', () => {
    const { getByText } = render(<SpecTag>PLA · 0.2mm</SpecTag>);
    const el = getByText('PLA · 0.2mm');
    expect(el.className).toContain('font-mono');
  });

  it('should mark BuildPlateGrid decorative', () => {
    const { container } = render(<BuildPlateGrid />);
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
  });

  it('should render a layer-line divider element', () => {
    const { container } = render(<LayerLineDivider />);
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
  });
});
```

- [ ] **Step 2: Run, verify it fails**

Run: `node_modules/.bin/vitest run components/blocks/__tests__/primitives.test.tsx`
Expected: FAIL — module `../_primitives` not found.

- [ ] **Step 3: Implement the primitives**

Create `components/blocks/_primitives.tsx`:

```tsx
// components/blocks/_primitives.tsx — shared maker-identity presentational primitives.
import type { ReactElement, ReactNode } from 'react';

/** Mono "build data" label used for eyebrows and spec strips. */
export function SpecTag({ children }: { children: ReactNode }): ReactElement {
  return (
    <span className="font-mono text-xs uppercase tracking-[0.18em] text-accent">
      {children}
    </span>
  );
}

/** Faint slicer-bed grid; purely decorative background. */
export function BuildPlateGrid({ className = '' }: { className?: string }): ReactElement {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 opacity-[0.06] ${className}`}
      style={{
        backgroundImage:
          'linear-gradient(var(--ink) 1px, transparent 1px), linear-gradient(90deg, var(--ink) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
      }}
    />
  );
}

/** Layer-line section divider; animates "print-in" unless reduced motion. */
export function LayerLineDivider(): ReactElement {
  return (
    <div
      aria-hidden="true"
      className="h-3 w-full motion-safe:animate-draw-line"
      style={{
        backgroundImage:
          'repeating-linear-gradient(to bottom, var(--line) 0, var(--line) 1px, transparent 1px, transparent 4px)',
      }}
    />
  );
}
```

- [ ] **Step 4: Run, verify it passes**

Run: `node_modules/.bin/vitest run components/blocks/__tests__/primitives.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add components/blocks/_primitives.tsx components/blocks/__tests__/primitives.test.tsx
git commit -m "feat(blocks): add layer-line, build-plate, spec-tag primitives"
```

---

## PHASE 2 — Block restyle

Each task migrates a group of `components/blocks/*` off `warm-*`/`cream`/`terracotta`/`prose-warm` onto tokens. **Token mapping rule (apply in every block):**

| Old | New |
|-----|-----|
| `bg-warm-50` / `bg-cream-*` | `bg-surface` or `bg-surface-raised` |
| `bg-warm-900` `text-warm-100` | `bg-ink` `text-surface` |
| `text-warm-900/800/700` (headings) | `text-ink` + `font-display` |
| `text-warm-500/400` (muted) | `text-ink/60` |
| `border-warm-200` | `border-line` |
| `bg-terracotta-*` / accent | `bg-accent` (CTAs), `bg-accent-2` (playful flags) |
| eyebrow `uppercase tracking` spans | `<SpecTag>` |
| `prose-warm` | `prose` + `dark:prose-invert` |

Verification for every Phase-2 task: `node_modules/.bin/tsc --noEmit` passes, `node_modules/.bin/eslint <files>` clean, and the block renders (covered by Phase 3 home render). Visual confirmation happens in Phase 3 Task 12.

### Task 5: Hero, PromoBanner, ImageWithText (large sections)

**Files:** Modify `components/blocks/Hero.tsx`, `components/blocks/PromoBanner.tsx`, `components/blocks/ImageWithText.tsx`.

- [ ] **Step 1: Apply the token mapping** to all three files per the table above. In `Hero.tsx`, when `imagePosition !== 'background'`, wrap the section in `relative` and render `<BuildPlateGrid />` behind the content; render the eyebrow via `<SpecTag>`; headline gets `font-display`.
- [ ] **Step 2: Verify** `node_modules/.bin/tsc --noEmit` → PASS; `node_modules/.bin/eslint components/blocks/Hero.tsx components/blocks/PromoBanner.tsx components/blocks/ImageWithText.tsx` → clean.
- [ ] **Step 3: Commit** `git commit -am "style(blocks): restyle hero/promo/imageWithText to maker tokens"`

### Task 6: Product & collection blocks + spec strips

**Files:** Modify `components/blocks/FeaturedProducts.tsx`, `components/blocks/FeaturedCollection.tsx`.

- [ ] **Step 1: Apply token mapping**; section eyebrows → `<SpecTag>`; card surfaces → `bg-surface-raised border-line`; price/CTA → `text-accent`/`bg-accent`. (Product cards themselves live in `components/product/`; only restyle the block-level wrappers here — `components/product/*` is out of scope for this plan.)
- [ ] **Step 2: Verify** `tsc --noEmit` PASS; `eslint` the two files clean.
- [ ] **Step 3: Commit** `git commit -am "style(blocks): restyle product/collection blocks to maker tokens"`

### Task 7: Content blocks

**Files:** Modify `components/blocks/RichText.tsx`, `Testimonials.tsx`, `FAQ.tsx`, `Gallery.tsx`, `LogoCloud.tsx`, `VideoEmbed.tsx`, `Divider.tsx`, `Newsletter.tsx`.

- [ ] **Step 1: Apply token mapping** to all eight. `Divider.tsx` should offer the layer-line look (reuse `LayerLineDivider` styling). `Newsletter.tsx` is the designated `accent-2` (filament-yellow) block: `bg-accent-2 text-ink`. `RichText.tsx`: swap `prose-warm` → `prose dark:prose-invert`.
- [ ] **Step 2: Verify** `tsc --noEmit` PASS; `eslint` the eight files clean.
- [ ] **Step 3: Commit** `git commit -am "style(blocks): restyle content blocks to maker tokens"`

### Task 8: Data blocks

**Files:** Modify `components/blocks/Recommendations.tsx`, `components/blocks/RecentlyViewed.tsx`.

- [ ] **Step 1: Apply token mapping**; section headers → `font-display` + `<SpecTag>` eyebrow.
- [ ] **Step 2: Verify** `tsc --noEmit` PASS; `eslint` the two files clean.
- [ ] **Step 3: Commit** `git commit -am "style(blocks): restyle recommendation blocks to maker tokens"`

---

## PHASE 3 — Author the home page as blocks

### Task 9: Add the FeaturedProducts seeding helper

**Context:** The current seed omits `featuredProducts` because its `products` relationship is `required, minRows:1`, so an empty default fails validation. The designed home needs a products section. Solution: the seed accepts the newest product IDs and only includes the block when IDs exist.

**Files:**
- Modify: `lib/page-builder/home-seed.ts`
- Test: `lib/page-builder/__tests__/home-seed.test.ts` (create)

**Interfaces:**
- Produces: `buildHomeSeedLayout(opts?: { featuredProductIds?: string[] }): PageBlock[]`.

- [ ] **Step 1: Write the failing test**

Create `lib/page-builder/__tests__/home-seed.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { buildHomeSeedLayout } from '@/lib/page-builder/home-seed';

describe('buildHomeSeedLayout', () => {
  it('should start with a hero block', () => {
    expect(buildHomeSeedLayout()[0]?.blockType).toBe('hero');
  });

  it('should omit featuredProducts when no product ids given', () => {
    const types = buildHomeSeedLayout().map((b) => b.blockType);
    expect(types).not.toContain('featuredProducts');
  });

  it('should include a valid featuredProducts block when ids are given', () => {
    const layout = buildHomeSeedLayout({ featuredProductIds: ['p1', 'p2'] });
    const fp = layout.find((b) => b.blockType === 'featuredProducts') as Record<string, unknown> | undefined;
    expect(fp).toBeDefined();
    expect(fp?.products).toEqual(['p1', 'p2']);
  });

  it('should include the newsletter accent block', () => {
    const types = buildHomeSeedLayout().map((b) => b.blockType);
    expect(types).toContain('newsletter');
  });
});
```

- [ ] **Step 2: Run, verify it fails**

Run: `node_modules/.bin/vitest run lib/page-builder/__tests__/home-seed.test.ts`
Expected: FAIL — `buildHomeSeedLayout` takes no args / no newsletter.

- [ ] **Step 3: Rewrite `home-seed.ts`**

```ts
// lib/page-builder/home-seed.ts — designed home layout, authored as page-builder blocks.
import { createDefaultBlock } from '@/lib/page-builder/default-block';
import type { PageBlock } from '@/lib/page-builder';

type SeedOptions = { featuredProductIds?: string[] };

function block(slug: string, overrides: Record<string, unknown> = {}): PageBlock | null {
  const base = createDefaultBlock(slug);
  return base ? ({ ...base, ...overrides } as unknown as PageBlock) : null;
}

export function buildHomeSeedLayout(opts: SeedOptions = {}): PageBlock[] {
  const ids = opts.featuredProductIds ?? [];
  const blocks: (PageBlock | null)[] = [
    block('hero', {
      eyebrow: '// PRINTED TO ORDER',
      headline: 'Printed to order.',
      subheadline: 'Keychains, aircraft models, and brainrot figures — straight off the plate.',
    }),
    block('featuredCollection', { heading: 'Off the plate' }),
    ids.length > 0 ? block('featuredProducts', { heading: 'New drops', products: ids }) : null,
    block('imageWithText', { heading: 'How we print' }),
    block('gallery'),
    block('recommendations'),
    block('newsletter'),
  ];
  return blocks.filter((b): b is PageBlock => b !== null);
}
```

(Adjust the override field names — `eyebrow`/`heading`/`headline` — to match each block's actual schema fields; check `src/payload/blocks/*.ts`. If a block has no such field, drop that override.)

- [ ] **Step 4: Run, verify it passes**

Run: `node_modules/.bin/vitest run lib/page-builder/__tests__/home-seed.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Run the existing seed test to confirm no regression**

Run: `node_modules/.bin/vitest run scripts/__tests__/seed-home-page.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/page-builder/home-seed.ts lib/page-builder/__tests__/home-seed.test.ts
git commit -m "feat(page-builder): author designed home layout with optional featured products"
```

### Task 10: Pass newest product IDs into the seed

**Files:** Modify `scripts/seed-home-page.ts`, `app/api/page-builder/set-homepage/route.ts`.

**Interfaces:**
- Consumes: `buildHomeSeedLayout({ featuredProductIds })` from Task 9.

- [ ] **Step 1: In both callers**, before building the layout, fetch up to 8 newest products and pass their IDs:

```ts
const products = await payload.find({
  collection: 'products',
  limit: 8,
  sort: '-createdAt',
  pagination: false,
});
const featuredProductIds = products.docs.map((d) => String(d.id));
// ...
layout: buildHomeSeedLayout({ featuredProductIds }) as never,
```

In `scripts/seed-home-page.ts`, widen the `ensureHomePage` payload param type from `Pick<Payload,'find'|'create'>` (it already has `find`).

- [ ] **Step 2: Verify** `node_modules/.bin/tsc --noEmit` → PASS; `node_modules/.bin/vitest run scripts/__tests__/seed-home-page.test.ts` → PASS (update the test's mock `find` to also answer the products query if it asserts call shape).
- [ ] **Step 3: Commit** `git commit -am "feat(page-builder): seed home with newest products"`

### Task 11: Re-seed and confirm the CMS renders the home

- [ ] **Step 1: Re-create the home page** (the seed is idempotent; delete the existing `home` page first if you want it re-authored, via admin or a one-off script). Run: `node_modules/.bin/tsx scripts/seed-home-page.ts`
  Expected: `[home-page] created.` (or `already exists — skipped.` — delete then re-run to pick up the new layout).
- [ ] **Step 2: Confirm parity** — load `/` and `/en/build/home`. The storefront home (`page.tsx:36-43`) renders the same `RenderBlocks(home.layout)`. This *is* the CMS replication requirement.
- [ ] **Step 3: No commit** (data step).

### Task 12: Visual verification pass (light + dark)

- [ ] **Step 1: Run the app** (use the `run` skill / `docker` skill per project tooling). Load `/` in light and dark (toggle via the existing theme-toggle).
- [ ] **Step 2: Check** against the design: Build-Plate gray surface (not cream), Space Grotesk headlines, mono spec eyebrows, layer-line dividers animating in, accent-blue CTAs, the Newsletter block in filament yellow. Verify focus rings are visible and `prefers-reduced-motion` disables the print-in animation.
- [ ] **Step 3: Fix** any `warm-*` leftovers found visually; re-commit per affected block.

---

## PHASE 4 — Close block parity gaps

> Only do the sub-tasks for gaps the designed home actually needs. If Phase 3 already looks right with existing fields, Phase 4 may be empty — confirm before adding schema.

### Task 13: (If needed) Hero eyebrow / spec field

**Files:** Modify `src/payload/blocks/Hero.ts`, `components/blocks/Hero.tsx`; create migration.

- [ ] **Step 1:** If the home hero needs a mono eyebrow the schema lacks, add an `eyebrow` text field to `src/payload/blocks/Hero.ts` and render it via `<SpecTag>` in `components/blocks/Hero.tsx`.
- [ ] **Step 2: Generate the migration** (REQUIRED — or runtime `42P01`):
  Run: `node_modules/.bin/payload migrate:create hero_eyebrow`
  Then run: `node_modules/.bin/payload migrate`
- [ ] **Step 3: Verify** `node_modules/.bin/tsc --noEmit` PASS; reload `/en/build/home` — no Postgres error; eyebrow editable in the builder.
- [ ] **Step 4: Commit** `git add src/payload/blocks/Hero.ts components/blocks/Hero.tsx src/migrations/ && git commit -m "feat(blocks): add hero eyebrow field + migration"`

### Task 14: Full regression + final verification

- [ ] **Step 1:** Run the whole suite: `node_modules/.bin/vitest run`
  Expected: all green.
- [ ] **Step 2:** `node_modules/.bin/tsc --noEmit` and `node_modules/.bin/eslint .` → clean.
- [ ] **Step 3:** Final visual check of `/` light + dark; confirm CMS `/en/build/home` reproduces it.
- [ ] **Step 4:** No code commit unless fixes were needed.

---

## Self-Review

**Spec coverage:**
- A foundation (tokens, light/dark) → Tasks 1, 2. ✓
- Type system → Task 3. ✓
- Layer-line / build-plate signature → Task 4 (primitives) + used in Tasks 5, 7, 12. ✓
- `blockAppearanceClasses` off `warm-*` → Task 2. ✓
- Restyle `components/blocks/*` → Tasks 5–8. ✓
- Home authored as blocks (CMS parity) → Tasks 9–11. ✓
- Block parity gaps + migration constraint → Tasks 13–14. ✓
- Per-store branding still overrides accent → tokens defined so `--brand-*` can map (noted in constraints; wiring `--brand-primary`→`--accent` is a one-line add in `brandingCssVariables` if branding should drive the accent — include in Task 1 Step 2 if desired). 
- Deferred B/C/D not in plan. ✓

**Placeholder scan:** Restyle tasks use a concrete token-mapping table rather than per-line code (visual work, verified by running the app) — this is intentional and called out, not a TODO. No "TBD"/"handle edge cases" left.

**Type consistency:** `buildHomeSeedLayout(opts?: { featuredProductIds?: string[] })` defined in Task 9, consumed identically in Task 10. `blockAppearanceClasses` signature unchanged. Primitives (`SpecTag`/`BuildPlateGrid`/`LayerLineDivider`) defined in Task 4, consumed in Tasks 5/7.

**Open follow-up:** Confirm exact override field names against `src/payload/blocks/*.ts` during Task 9 Step 3 (noted inline).
