# DESIGN.md — ShopNex Maker Store

> Machine-readable design system for AI coding agents (Google Labs DESIGN.md format, Apache 2.0).
> Agents reading this file MUST follow every rule here when generating or editing UI code.

---

## Identity

**Name:** ShopNex Maker Store
**Concept:** Technical maker-workbench frame with vivid filament-color pops.
**Personality:** Precise and slicer/CAD-flavored for the serious side (mil-models, technical prints); saturated filament accents for the playful side (brainrot figures, keychains).
**Anti-pattern:** Do NOT default to cream backgrounds, serif display fonts, or terracotta accents — that is the generic AI template look this identity deliberately avoids.

---

## Color

### Design philosophy
60-30-10 rule: 60% surface / 30% ink / 10% accent. Complementary blue↔yellow accent pair — blue = precise/technical (CAD, blueprints), yellow = playful (brainrot, keychains). Coral is a reserved third pop used sparingly.

### Light theme — "Build Plate"

| Token | CSS Variable | Hex | Role |
|-------|-------------|-----|------|
| Surface | `--surface` | `#ECEFF3` | Cool slicer-gray base (60%) |
| Surface raised | `--surface-raised` | `#FFFFFF` | Cards, panels, modals |
| Ink | `--ink` | `#1B2027` | Graphite — body text, frames (30%) |
| Line | `--line` | `#C9D2DC` | Layer-line borders, hairlines, dividers |
| Accent | `--accent` | `#1F6FEB` | CAD blue — primary action, links (10%) |
| Accent 2 | `--accent-2` | `#FFC21A` | Filament yellow — playful badges, "new" flags |
| Accent 3 | `--accent-3` | `#FF4D6D` | Filament coral — sparing playful flag only |

### Dark theme — "Carbon"

| Token | CSS Variable | Hex | Role |
|-------|-------------|-----|------|
| Surface | `--surface` | `#14181D` | Carbon base (60%) |
| Surface raised | `--surface-raised` | `#1C222A` | Cards, panels, modals |
| Ink | `--ink` | `#E7ECF1` | Light graphite — body text, frames (30%) |
| Line | `--line` | `#2C353F` | Layer-line borders, hairlines, dividers |
| Accent | `--accent` | `#4D90FF` | CAD blue brightened for dark (10%) |
| Accent 2 | `--accent-2` | `#FFCE3A` | Filament yellow brightened for dark |
| Accent 3 | `--accent-3` | `#FF6B85` | Filament coral brightened for dark |

### Token architecture

CSS custom properties on `:root` (light) and `.dark` (dark). Exposed to Tailwind 4 as named colors:
```css
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
```
Reference tokens as `bg-[var(--surface)]`, `text-[var(--ink)]`, `border-[var(--line)]` in Tailwind 4.

---

## Typography

| Role | Font | Weight | Usage |
|------|------|--------|-------|
| Display | Space Grotesk | 600–700 | Hero headlines, section titles, product names |
| Body | Plus Jakarta Sans | 400–500 | Body copy, descriptions, UI labels |
| Mono | Space Mono | 400 | Spec tags, SKUs, dimensions, price labels, code |

### Rules
- Body base: 16px / line-height 1.6
- Mono labels: small (0.75rem–0.875rem), letter-spacing 0.08em–0.12em, uppercase
- Display headings: tight tracking (−0.02em to −0.03em) at large sizes
- Never use a serif font anywhere in the UI
- Space Mono is the **brand voice** for anything spec/technical — dimensions, layer counts, filament weights, prices in product cards
- Plus Jakarta Sans is already loaded in the Next.js font config — do NOT import additional body fonts

---

## Spacing

Base unit: 4px (0.25rem). All spacing values are multiples of 4.

| Token | Value | Use |
|-------|-------|-----|
| `space-1` | 4px | Icon padding, micro gaps |
| `space-2` | 8px | Tight component internal padding |
| `space-3` | 12px | Badge padding, small gaps |
| `space-4` | 16px | Default component padding |
| `space-6` | 24px | Card internal padding |
| `space-8` | 32px | Section internal gaps |
| `space-12` | 48px | Between components in a section |
| `space-16` | 64px | Section vertical padding |
| `space-24` | 96px | Major section breaks |

Use standard Tailwind spacing scale — `p-4`, `gap-6`, `py-16`, etc.

---

## Layout Patterns

### Signature devices

**BuildPlateGrid** — faint orthographic grid on hero and feature sections. Subtle, low-contrast, evokes a CAD build plate. Never on product cards or content text areas.
```css
background-image: linear-gradient(var(--line) 1px, transparent 1px),
                  linear-gradient(90deg, var(--line) 1px, transparent 1px);
background-size: 24px 24px;
opacity: 0.4;
```

**LayerLineDivider** — horizontal 1–2px rule between major sections, styled as an FDM layer line. Replaces generic `<hr>` everywhere.
```tsx
<div className="w-full h-px bg-[var(--line)] my-16" aria-hidden />
```

**SpecTag** — monospace eyebrow label above headings and on product specs. `Space Mono`, `text-xs tracking-widest uppercase text-[var(--accent)]`.
```tsx
<span className="font-mono text-xs tracking-widest uppercase text-[var(--accent)]">
  {children}
</span>
```

### Radius grammar
- Structural containers (cards, panels, modals, grid cells): `rounded-md` (6px) or `rounded-lg` (8px)
- Playful chips, badges, tags: `rounded-full`
- Buttons: `rounded-md`
- Inputs: `rounded-md`
- Never mix radii within the same component

### Grid
- Product grids: `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4`, `gap-4 sm:gap-6`
- Content sections: max-width `1280px`, horizontal padding `px-4 sm:px-6 lg:px-8`
- Hero: full-bleed with BuildPlateGrid overlay, content max-width `960px` centered

---

## Component Rules

### Buttons
- Primary: `bg-[var(--accent)] text-white rounded-md px-5 py-2.5 font-medium hover:opacity-90`
- Secondary: `border border-[var(--line)] text-[var(--ink)] rounded-md px-5 py-2.5 hover:bg-[var(--surface-raised)]`
- Destructive: use `--accent-3` (coral) sparingly — only for irreversible actions
- Never use ghost buttons with zero border — always visible affordance

### Product cards
- Background: `bg-[var(--surface-raised)]`, border: `border border-[var(--line)]`, radius: `rounded-lg`
- Price: Space Mono, `font-mono text-sm text-[var(--ink)]`
- Badge (new, sale): `rounded-full bg-[var(--accent-2)] text-[var(--ink)] text-xs font-mono px-2 py-0.5`
- Hover: subtle `shadow-md` lift — do NOT change background color on hover

### Surfaces and panels
- Page background: `bg-[var(--surface)]`
- Cards/modals/dropdowns: `bg-[var(--surface-raised)] border border-[var(--line)]`
- Do NOT create a third surface level — two is the limit

### Forms and inputs
- Border: `border border-[var(--line)] rounded-md`
- Focus: `focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]`
- Label: Plus Jakarta Sans, `text-sm font-medium text-[var(--ink)]`
- Error state: `border-[var(--accent-3)]` with small inline error text

### Accent usage
- `--accent` (CAD blue): primary actions, links, active states, focus rings
- `--accent-2` (filament yellow): badges, "new" flags, playful highlights — max 2 per viewport
- `--accent-3` (coral): destructive/error, sparing pop — max 1 per viewport

---

## Animation

Library: **Motion One** (`motion` package, WAAPI-based, ~18kb gzipped). No other animation library.

### Core presets

| Preset | Config | Use when |
|--------|--------|----------|
| `fade-up` | opacity 0→1, y 16→0, 300ms ease-out | Text blocks, headings, descriptions |
| `fade-in` | opacity 0→1, 250ms ease-out | Banners, overlays, promo strips |
| `scale-in` | opacity 0→1, scale 0.95→1, 280ms ease-out | CTAs, buttons, countdown, video embeds |
| `stagger-cards` | `fade-up` per child, 60ms stagger | Product grids, pricing tables, feature grids |
| `stagger-list` | `fade-in` per child, 40ms stagger | FAQ, steps, stats, columns |
| `none` | no animation | Spacers, purely structural elements |

### IntersectionObserver config
```ts
{ rootMargin: '0px 0px -10% 0px', threshold: 0.05 }
```
One-shot — unobserve after first trigger. Never re-animate on scroll-up.

### Page transition
Entry-only: opacity 0→1, y 8→0, 250ms ease-out. No exit animation.

### `prefers-reduced-motion`
Handled once in `lib/animations/config.ts`. When reduced motion is active:
- All durations collapse to 0ms
- All transform animations are stripped
- Opacity-only fallback remains (fade but no movement)
Never check `prefers-reduced-motion` inside individual components.

### Block → preset mapping

| Block | Preset |
|-------|--------|
| Hero / HeroCarousel | `fade-up` |
| ProductCard | `stagger-cards` |
| CardGrid | `stagger-cards` |
| FeatureGrid | `stagger-cards` |
| Recommendations | `stagger-cards` |
| RecentlyViewed | `stagger-cards` |
| PricingTable | `stagger-cards` |
| FAQ | `stagger-list` |
| Steps | `stagger-list` |
| Stats | `stagger-list` |
| Columns | `stagger-list` |
| CallToAction | `scale-in` |
| Button | `scale-in` |
| VideoEmbed | `scale-in` |
| Countdown | `scale-in` |
| Text | `fade-up` |
| Quote | `fade-up` |
| PromoBanner | `fade-in` |
| Banner | `fade-in` |
| Tabs | `fade-in` |
| SocialBar | `fade-in` |
| Divider / LayerLineDivider | `fade-in` |
| Spacer | `none` |

---

## Layout Primitives

### Signature devices

**`BuildPlateGrid`** — faint dot-grid or crosshatch overlay on hero sections. Hex: `--line` at 20% opacity. Never on body content areas.

**`LayerLineDivider`** — 1–2px horizontal rule at FDM layer spacing (0.2mm scale = ~4px visual rhythm). Animate in on scroll with `fade-in` preset. Replace plain `<hr>` elements in storefront layouts.

**`SpecTag`** — mono eyebrow label: `font-family: Space Mono`, `text-xs tracking-widest uppercase`, `text-[var(--ink)]/60`. Used for product specs, dimensions, SKU chips, category eyebrows.

### Radius grammar

| Surface type | Radius | Token |
|---|---|---|
| Structural frames, data tables, spec panels | `rounded-none` or `rounded-sm` (2px) | — |
| Cards, modals, inputs | `rounded-lg` (8px) | — |
| Badges, chips, tags, avatars | `rounded-full` | — |

Sharp = precise/technical. Rounded = playful/interactive. Never mix within the same component.

---

## Components

### Buttons

- Primary: `bg-[var(--accent)] text-white rounded-lg` — CAD blue, hover darkens 10%
- Secondary: `border border-[var(--line)] text-[var(--ink)] rounded-lg bg-transparent`
- Danger/highlight: `bg-[var(--accent-3)]` — coral, sparing use only
- Badge/pill: `bg-[var(--accent-2)] text-[var(--ink)] rounded-full text-xs` — filament yellow

### Cards

- Background: `bg-[var(--surface-raised)]`
- Border: `border border-[var(--line)]`
- Radius: `rounded-lg`
- Shadow: `shadow-sm` — avoid heavy drop shadows; use `--line` borders instead
- Product card price: Space Mono, `text-sm font-mono`
- Product card name: Space Grotesk, `font-semibold`

### Forms and inputs

- Border: `border border-[var(--line)] rounded-lg`
- Focus ring: `ring-2 ring-[var(--accent)]` — CAD blue
- Label: Plus Jakarta Sans, `text-sm font-medium text-[var(--ink)]`
- Error state: `border-[var(--accent-3)]` — coral

### Surfaces and panels

- Page background: `bg-[var(--surface)]`
- Raised panels, drawers, modals: `bg-[var(--surface-raised)]`
- Never use raw `white` or `black` — always route through token vars

---

## Agent Rules

### DO
- Use `--surface`, `--surface-raised`, `--ink`, `--line`, `--accent`, `--accent-2`, `--accent-3` for every color decision
- Use Space Grotesk for all display/headline text
- Use Space Mono for prices, specs, dimensions, SKUs, and mono eyebrow labels
- Apply `LayerLineDivider` between major content sections instead of plain `<hr>`
- Apply `SpecTag` for any technical label, product attribute, or category eyebrow
- Use `rounded-none`/`rounded-sm` on structural frames; `rounded-lg` on cards/inputs; `rounded-full` on badges
- Wrap all scroll-reveal animations with the `shouldAnimate()` guard from `lib/animations/config.ts`
- Map page-builder blocks to their assigned animation preset (see Animation section above)

### DO NOT
- Do NOT use cream, off-white, beige, or warm neutral backgrounds — use `--surface` only
- Do NOT use any serif font (Georgia, Merriweather, Playfair, etc.) anywhere
- Do NOT use Inter or Roboto as body font — Plus Jakarta Sans is already loaded
- Do NOT use terracotta, burnt orange, or warm amber as accent colors
- Do NOT hardcode hex values — always reference CSS variables
- Do NOT use Tailwind's default color palette (e.g., `bg-blue-600`, `text-gray-900`) — use `bg-[var(--accent)]`, `text-[var(--ink)]`
- Do NOT apply heavy box shadows — use `border border-[var(--line)]` + `shadow-sm` maximum
- Do NOT animate with raw CSS transitions when a Motion One preset exists for the block type
- Do NOT bypass `prefers-reduced-motion` — the `shouldAnimate()` guard is mandatory

---

## Tailwind Token Mapping

Tailwind 4 uses CSS variables directly via arbitrary value syntax. No theme extension needed.

| Semantic role | Tailwind class |
|---|---|
| Page background | `bg-[var(--surface)]` |
| Card / panel background | `bg-[var(--surface-raised)]` |
| Body text | `text-[var(--ink)]` |
| Muted / secondary text | `text-[var(--ink)]/60` |
| Border / divider | `border-[var(--line)]` |
| Primary action (blue) | `bg-[var(--accent)]` / `text-[var(--accent)]` |
| Playful badge (yellow) | `bg-[var(--accent-2)]` / `text-[var(--accent-2)]` |
| Highlight / coral | `bg-[var(--accent-3)]` / `text-[var(--accent-3)]` |
| Focus ring | `ring-[var(--accent)]` |
| Hover surface | `hover:bg-[var(--surface-raised)]` |
