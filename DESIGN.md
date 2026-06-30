# DESIGN.md — Lô Hobby Store

> Machine-readable design system for AI coding agents (Google Labs DESIGN.md format, Apache 2.0).
> Agents reading this file MUST follow every rule here when generating or editing UI code.

---

## Identity

**Name:** Lô Hobby Store
**Concept:** Editorial monochrome storefront — gallery-white surfaces, near-black ink, a single serif wordmark as the only ornament.
**Personality:** Calm, premium, print-magazine restraint. Confidence through whitespace and typography, not color.
**Anti-pattern:** Do NOT add colored accents, warm/cream backgrounds, terracotta, or technical/CAD motifs. Do NOT use a serif font for body or display — serif is reserved exclusively for the logo wordmark.

---

## Color

### Design philosophy
Monochrome. The palette is white → ink with neutral grays between. There is no chromatic accent — emphasis comes from weight, scale, and a near-black "ink" fill (black pill buttons on white). Light theme is "paper"; dark theme is "carbon" (inverted).

### Light theme — "Paper"

| Token | CSS Variable | Hex | Role |
|-------|-------------|-----|------|
| Surface | `--surface` | `#ffffff` | Page base (60%) |
| Surface raised | `--surface-raised` | `#f5f5f5` | Cards, panels, raised chips |
| Ink | `--ink` | `#111111` | Body text, headings, primary fills (30%) |
| Line | `--line` | `#e5e5e5` | Hairline borders, dividers |
| Accent | `--accent` | `#111111` | Primary action (black pill) (10%) |
| Accent 2 | `--accent-2` | `#525252` | Muted/secondary text + ghost states |
| Accent 3 | `--accent-3` | `#111111` | Reserved — same ink (no color pop) |

### Dark theme — "Carbon"

| Token | CSS Variable | Hex | Role |
|-------|-------------|-----|------|
| Surface | `--surface` | `#0b0b0b` | Page base (60%) |
| Surface raised | `--surface-raised` | `#181818` | Cards, panels, raised chips |
| Ink | `--ink` | `#f5f5f5` | Body text, headings, primary fills (30%) |
| Line | `--line` | `#2a2a2a` | Hairline borders, dividers |
| Accent | `--accent` | `#f5f5f5` | Primary action (white pill on dark) |
| Accent 2 | `--accent-2` | `#a3a3a3` | Muted/secondary text |
| Accent 3 | `--accent-3` | `#f5f5f5` | Reserved |

### Token architecture

CSS custom properties on `:root` (light) and `.dark` (dark) in `app/globals.css`:
```css
:root {
  --surface: #ffffff;
  --surface-raised: #f5f5f5;
  --ink: #111111;
  --line: #e5e5e5;
  --accent: #111111;
  --accent-2: #525252;
  --accent-3: #111111;
  --r: 14px;        /* card radius */
  --r-sm: 10px;
  --r-pill: 9999px;
  --sh-1: 0 1px 2px rgba(17,17,17,0.05);
  --sh-2: 0 6px 20px rgba(17,17,17,0.08);
  --sh-3: 0 18px 48px rgba(17,17,17,0.12);
}
.dark {
  --surface: #0b0b0b;
  --surface-raised: #181818;
  --ink: #f5f5f5;
  --line: #2a2a2a;
  --accent: #f5f5f5;
  --accent-2: #a3a3a3;
  --accent-3: #f5f5f5;
}
```

Two ways to reference tokens:
- **Tailwind named tokens** (preferred): `bg-surface`, `bg-surface-raised`, `text-ink`, `border-line`, `bg-accent`, `shadow-sh-2`, `rounded-card`, `rounded-pill`.
- The neutral `warm-*` ramp (`warm-50`=white … `warm-950`=near-black) and `cream-*` are retuned to monochrome and remain valid for the storefront backbone (`bg-warm-50 text-warm-900`).

Never hardcode hex. Never reintroduce a chromatic value into these scales.

---

## Typography

| Role | Font | CSS var | Weight | Usage |
|------|------|---------|--------|-------|
| Logo | Playfair Display | `--font-playfair` / `font-logo` | 600–700 italic | The wordmark ONLY |
| Display | Archivo | `--font-archivo` / `font-display` | 600–800 | Hero headlines, section titles, product names |
| Body / UI | Inter | `--font-inter` / `font-sans` | 400–600 | Body copy, labels, nav, buttons |
| Mono | Space Mono | `--font-space-mono` / `font-mono` | 400 | Prices, eyebrow tags, SKUs (optional) |

### Rules
- **Serif (Playfair) is the logo only.** Never use serif for headings, body, or any other text.
- Display headings use Archivo with tight tracking (−0.02em to −0.03em) at large sizes; often UPPERCASE for section eyebrows.
- Body base: 16px / line-height 1.6, Inter.
- The active body font is admin-selectable via `lib/store-fonts.ts` (`inter` default, `jakarta`/`roboto`/`system` alternates). Display + logo fonts are fixed brand identity and do NOT change with the preset.
- `font-display` → `--font-display-active` (Archivo), `font-logo`/`font-serif` → `--font-logo-active` (Playfair), `font-sans` → `--font-sans-active` (Inter).

---

## Spacing

Base unit: 4px (0.25rem). All spacing values are multiples of 4. Use the standard Tailwind scale — `p-4`, `gap-6`, `py-16`. This is an editorial layout: be generous with whitespace. Section vertical padding `py-16` to `py-24`; major section breaks use the larger end.

---

## Geometry & Elevation

### Radius grammar
- Cards, panels, media frames: `rounded-card` (`--r`, 14px) or `rounded-card-sm` (`--r-sm`, 10px)
- Buttons, nav links, search, badges, chips: `rounded-pill` (fully round)
- Never mix radii within the same component.

### Shadows
Token-driven so they invert with the theme: `shadow-sh-1` (hairline rest), `shadow-sh-2` (hover lift / dropdowns), `shadow-sh-3` (modals / drawers). Prefer `border-line` hairlines over shadows at rest; reserve `sh-2`/`sh-3` for elevation.

---

## Layout Patterns

### Signature devices
- **Serif wordmark** — the ONLY ornament. Playfair Display italic, paired with an UPPERCASE Inter tag/eyebrow beneath or beside it.
- **Pill everything** — nav links, search field, CTAs, filter tabs, and badges are all fully rounded. The black (ink) pill on white is the signature primary action.
- **Hairline dividers** — 1px `border-line` rules between major sections. No heavy rules, no decorative separators.
- **Uppercase eyebrow** — small Inter, `text-xs tracking-widest uppercase text-accent-2`, above section headings.

### Grid
- Product grids: `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4`, `gap-4 sm:gap-6`
- Content sections: max-width `1280px`, horizontal padding `px-4 sm:px-6 lg:px-8`
- Hero: generous whitespace, content max-width ~`960px`

---

## Component Rules

### Buttons
- Primary: `bg-accent text-surface rounded-pill px-5 py-2.5 font-medium hover:opacity-90` — black pill on light, white pill on dark.
- Ghost / secondary: `border border-line text-ink rounded-pill px-5 py-2.5 bg-transparent hover:bg-surface-raised`.
- No chromatic/destructive color — destructive actions use ink + clear labeling.

### Product cards
- Square thumbnail, `bg-surface-raised`, `rounded-card`.
- Text badge top-left: small UPPERCASE Inter, no colored fill.
- Hover: quick-add fab + subtle `shadow-sh-2` lift. Do NOT change background color on hover.
- "Add to bag" CTA is a pill.
- Price: `text-ink`; mono optional via `font-mono`.

### Surfaces and panels
- Page background: `bg-surface` (white). Cards/modals/drawers: `bg-surface-raised`.
- Two surface levels only. Do NOT create a third.

### Forms and inputs
- Border: `border border-line rounded-pill` (search/inputs) or `rounded-card` for textareas.
- Focus: neutral ink ring (`focus-visible:ring-ink`), never colored.
- Label: Inter, `text-sm font-medium text-ink`.

---

## Animation

Library: **Motion** (`motion` package). Scroll-reveal is centralized in `lib/animations/` — wrap reveals with `shouldAnimate()` and map each page-builder block to its preset in `lib/animations/block-defaults.ts`. Respect `prefers-reduced-motion` via the shared guard; never check it per-component. Entry-only page transition (opacity + small y), no exit. Floating hero collage uses `float-gentle`.

---

## Agent Rules

### DO
- Use `bg-surface`, `bg-surface-raised`, `text-ink`, `text-accent-2` (muted), `border-line`, `bg-accent` for every color decision.
- Use Archivo (`font-display`) for headings, Inter (`font-sans`) for body/UI, Playfair (`font-logo`) for the wordmark ONLY.
- Use `rounded-pill` for buttons/nav/search/badges and `rounded-card` for cards/panels.
- Use `shadow-sh-1/2/3` and the `warm-*`/`cream-*` neutral ramp where token names don't reach.
- Keep it monochrome and editorial — emphasis via weight, scale, whitespace.

### DO NOT
- Do NOT introduce ANY chromatic accent (blue, terracotta, yellow, etc.) — the system is monochrome.
- Do NOT use serif (Playfair, Georgia, Fraunces) for anything except the logo wordmark.
- Do NOT use warm/cream/beige backgrounds — the `warm-*`/`cream-*` scales are neutral now; keep them neutral.
- Do NOT hardcode hex values — reference tokens.
- Do NOT use sharp/square buttons — primary actions are pills.
- Do NOT add heavy drop shadows at rest — hairline `border-line` first.

---

## Tailwind Token Mapping

| Semantic role | Tailwind class |
|---|---|
| Page background | `bg-surface` |
| Card / panel background | `bg-surface-raised` |
| Body text | `text-ink` |
| Muted / secondary text | `text-accent-2` or `text-ink/60` |
| Border / divider | `border-line` |
| Primary action (ink pill) | `bg-accent text-surface` |
| Card radius | `rounded-card` |
| Pill radius | `rounded-pill` |
| Rest / hover / modal elevation | `shadow-sh-1` / `shadow-sh-2` / `shadow-sh-3` |
| Display heading font | `font-display` |
| Logo wordmark font | `font-logo` |
| Body font | `font-sans` |
