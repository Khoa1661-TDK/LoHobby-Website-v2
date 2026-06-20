# Hobby-Shop Visual Identity & Page-Builder Templates — Design

Date: 2026-06-21
Status: Approved (design); pending spec review
Skill lineage: brainstorming → frontend-design → (next) writing-plans

## Context

The storefront currently ships the templated "AI default" look — cream background
(`cream`/`warm`), Fraunces serif display, terracotta accent. The owner wants a
distinctive identity grounded in the shop's actual subject and a page-builder that
helps new users start from a real layout instead of a blank page.

**Subject (pinned):** a **3D-printing maker shop** selling printed goods — keychains,
military aircraft models, "brainrot" character figures, anything 3D-printable.

**Brand energy (chosen):** *technical maker-workbench frame + vivid filament-color pops.*
A precise, slicer/CAD-flavored structure that carries the serious mil-models, with
saturated filament accents that carry the playful brainrot/keychain side.

This design replaces the cream/serif/terracotta defaults; the frontend-design skill
explicitly flags that exact combination as the #1 generic look to avoid.

## Goals

1. A new color system (light + dark) grounded in color study, driven by semantic tokens.
2. A typography system that signals "maker shop," moving off Fraunces.
3. A signature visual device drawn from the subject (layer lines / build plate).
4. Per-component color controls for non-image blocks.
5. Real section icons in the builder (picker + layers rail).
6. An ecommerce **starter template** for new pages, plus a **blank vs template chooser**
   in the page-creation flow.

## Non-goals

- Canvas/iframe drag-and-drop (explicitly dropped earlier this session).
- A freeform per-block hex editor that lets users build arbitrarily ugly pages —
  color controls are a curated, token-driven palette.
- Recoloring image-dominant blocks' surfaces (excluded by request).
- A multi-template marketplace; ship one ecommerce template, designed to extend.

---

## Section 1 — Color system

Canvas concept: **build plate, not paper.** A cool slicer-software gray reads as a
CAD/workshop workspace and is the cleanest escape from the cream default. Maker energy
comes from filament accents.

Color-study grounding: **60-30-10** (60% surface / 30% ink / 10% accent) and a
**complementary blue↔yellow** accent pair — blue = precise/technical (CAD, blueprints,
mil-models), yellow = playful (brainrot, keychains). Optional third pop = filament coral
for playful blocks, used sparingly.

### Light theme — "Build Plate"
| Token | Hex | Role |
|------|-----|------|
| `--surface` | `#ECEFF3` | cool slicer-gray bed (60%) |
| `--surface-raised` | `#FFFFFF` | cards, panels |
| `--ink` | `#1B2027` | graphite — type, frames (30%) |
| `--line` | `#C9D2DC` | layer-lines, hairlines, borders |
| `--accent` | `#1F6FEB` | CAD blue — primary action (10%) |
| `--accent-2` | `#FFC21A` | filament yellow — playful pop |
| `--accent-3` (optional) | `#FF4D6D` | filament coral — sparing playful flag |

### Dark theme — "Carbon"
Keeps the two-accent system (not the near-black + single-acid default).
| Token | Hex | Role |
|------|-----|------|
| `--surface` | `#14181D` | carbon |
| `--surface-raised` | `#1C222A` | cards |
| `--ink` | `#E7ECF1` | off-white |
| `--line` | `#2C353F` | layer-lines (may glow accent-tinted) |
| `--accent` | `#4D90FF` | CAD blue, lifted for contrast |
| `--accent-2` | `#FFCE3A` | filament yellow |
| `--accent-3` (optional) | `#FF6B85` | filament coral |

### Token architecture
- Define semantic CSS variables for both themes (light on `:root`, dark under the
  existing `.dark` class — `darkMode: 'class'` is already configured).
- Expose them to Tailwind as named colors (e.g. `surface`, `ink`, `accent`) in
  `tailwind.config.ts`, alongside (then progressively replacing) `warm`/`cream`/`terracotta`.
- `lib/store-branding.ts` per-store CSS vars (`--brand-primary/secondary`) map onto
  `--accent`/`--accent-2` so white-label branding still overrides cleanly.
- Rewrite `blockAppearanceClasses` (`lib/page-builder.ts`) to emit token-driven classes
  instead of hardcoded `bg-warm-50` / `bg-warm-900 text-warm-100`.

---

## Section 2 — Typography

Moves off Fraunces. Three roles carry the technical/playful duality.

| Role | Face | Why |
|------|------|-----|
| Display | **Space Grotesk** | Grotesque with quirks — engineered, not corporate. Big & tight (600–700). |
| Body | **Plus Jakarta Sans** | Already loaded. Friendly geometric sans, legible small, warms the cool palette. |
| Utility / mono | **Space Mono** (or JetBrains Mono) | Signature: product specs & labels as monospace "build data" (`PLA · 0.2mm · 48g`). |

- Mono-for-specs is both authentic (every print has specs) and a structural device:
  eyebrows/section labels become spec-tags, not generic ALL-CAPS kickers.
- Scale: tight/technical, generous size jumps, mono labels small with wide tracking,
  body 16/1.6.
- Wire faces via `next/font` and the existing `--font-*-active` Tailwind hooks.

---

## Section 3 — Layout & signature

**Signature: layer lines.** FDM prints are stacked layers; that becomes the brand's
connective tissue.

- **Section dividers** = layer-line bands (1–2px rules at print-layer spacing), animating
  in on scroll via the `draw-line` / `reveal-up` keyframes already in `tailwind.config.ts`
  — sections "print in" from the bottom. Respect `prefers-reduced-motion`.
- **Hero** sits on a faint **build-plate grid**, headline as thesis, mono spec-tag eyebrow.
- **Eyebrows / labels** = mono spec-tags (`// NEW DROPS`, `PLA · 48g`).
- **Product cards** = image on `surface-raised`, mono spec strip, accent-blue price/CTA,
  yellow reserved for "new"/"hot" flags.
- **Radius grammar:** near-zero radius on structural frames, rounded on playful chips/badges
  — radius itself encodes the technical/playful split.
- Spend boldness only on the layer-line/build-plate signature; keep everything else quiet.

---

## Section 4 — Deliverables

### A. Design foundation (gate for all others)
Semantic tokens + light/dark + type wiring + `blockAppearanceClasses` rewrite. Nothing
else looks right until this lands.

### C. Section icons
Replace empty `schema.imageURL` tiles in `AddSectionPicker` and the unicode glyphs
(`⠿ ⧉ ✕`) in `LayersRail` with a line-icon per block type from a single set
(`lucide-react` — lightweight, tree-shakeable), accent-tinted, consistent across picker
and rail. Add an `icon` mapping keyed by block slug.

### D. Ecommerce starter template + creation chooser
**Template layout** (mirrors the old hardcoded home in `components/home/`, rebuilt from
page-builder blocks, styled to the maker identity):

1. `Hero` — build-plate grid bg, mono eyebrow, big headline, blue CTA
2. `FeaturedCollection` — "Off the plate" category row
3. `FeaturedProducts` — new drops, mono spec strips
4. `ImageWithText` — "Printed to order" / how-it-works story
5. `Gallery` — print showcase (mil-models + brainrot mix)
6. `Recommendations` — personalized
7. `Newsletter` — filament-yellow accent block

- Encode the template as a reusable layout factory (same block-shape as `home-seed.ts`),
  idempotent/safe to re-run.
- **Creation chooser:** `NewPageButton` becomes a small menu — **"Blank page"** vs
  **"Ecommerce template"**. `/api/page-builder/create-page` accepts an optional
  `template` param: absent/`blank` → `layout: []`; `ecommerce` → seeded layout. Both
  return the builder `href` as today.

### B. Per-component color controls (deferrable follow-up)
Extend `BlockAppearance` beyond the single `backgroundCustom`:
- Each **non-image** block gets a curated swatch picker (surface + accent) driven by the
  semantic tokens, surfaced in the `FieldRenderer` appearance panel.
- Image-dominant blocks (Hero with bg image, Gallery, LogoCloud) skip the surface picker.
- Update `_appearance.ts` (Payload fields) and `blockAppearanceClasses` together; new
  block/field shape requires a generated Payload migration (per project constraint).

---

## Sequencing

A (foundation) → C (icons, quick win) → D (template + chooser) → B (per-component colors).
A is the gate; C/D/B are independent after it. B may ship as a separate later spec.

## Revised scope (2026-06-21 — owner decision)

Shop is primary, CMS is secondary. **First plan = A + the home page only.** B, C, and
the template-chooser are deferred to future plans the owner will scope later.

Key architecture fact: `app/[locale]/(storefront)/page.tsx` already has a dual path —
renders the CMS `home` page via `RenderBlocks` if it exists, else falls back to the
hardcoded `components/home/*` sections. So "make the home page" and "the CMS can
replicate the home page" are the **same work**: build the home page as page-builder
blocks. Parity is then guaranteed by construction, and it completes the in-progress
hardcoded→CMS migration. The hardcoded `components/home/*` are the visual *reference*.

First-plan deliverables:
1. **A foundation** — semantic tokens (`--surface/--ink/--accent…`), light + dark, type
   wiring (Space Grotesk / Plus Jakarta Sans / Space Mono), layer-line + build-plate
   primitives, and `blockAppearanceClasses` rewritten off hardcoded `warm-*`.
2. **Restyle `components/blocks/*`** to the maker identity (this is what renders the CMS
   home — doing it makes the home look right *and* keeps CMS parity).
3. **Author the home layout as blocks** (extend `home-seed.ts`); the seeded `home` page
   is the new designed home.
4. **Close block parity gaps** — add only the block fields the designed home needs but
   blocks can't yet express (e.g. hero carousel, product spec strips). Any new block
   field requires a generated Payload migration (else storefront `42P01` at runtime).

Deferred (future plans): B per-component color UI, C section icons, D template chooser.

## Risks / constraints

- **Migration:** any new Payload block field (piece B) needs a generated migration or the
  storefront throws `42P01` at runtime.
- **Palette safety:** blue+yellow is confident but a common high-contrast pair; coral is
  the reserved differentiator if it reads too safe in build.
- **Accessibility floor:** maintain visible focus, AA contrast on `ink`/`surface` and on
  accent-on-surface, and honor `prefers-reduced-motion` for the "print-in" animations.
- **Token migration churn:** replacing `warm`/`cream` usages across many block components
  is broad; do it as a deliberate pass, not mixed into feature commits.

## Open questions

- Mono face: Space Mono vs JetBrains Mono (defer to build; both pair with Space Grotesk).
- Whether to keep `accent-3` (coral) in the base palette or hold it as opt-in per block.
