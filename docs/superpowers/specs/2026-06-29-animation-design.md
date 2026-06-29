# Animation System Design
**Date:** 2026-06-29  
**Status:** Approved  
**Scope:** Scroll reveal animations, page transitions, ecommerce micro-interactions, CMS editor control

---

## 1. Architecture Overview

### Library
**Motion One** (`motion` package) — WAAPI-based, ~18kb gzipped. Chosen over Framer Motion (heavier, React-coupled) and CSS-only (no JS stagger, no imperative micro-interaction control).

### File Structure

```
lib/animations/
  config.ts              # All preset definitions (Motion One params)
  block-defaults.ts      # Block type → preset name mapping

lib/animations/hooks/
  useReveal.ts           # Scroll reveal via IntersectionObserver + Motion One
  useCartFlyIn.ts        # Product image fly-to-cart animation
  useWishlistPop.ts      # Heart toggle spring animation
  useRipple.ts           # Button press ripple

components/animations/
  RevealOnScroll.tsx     # Wrapper using useReveal internally (replaces current)
  PageTransition.tsx     # Route entry fade+drift animation
  CartFlyIn.tsx          # Portal-rendered clone for fly-in arc
```

### prefers-reduced-motion Strategy
Handled once in `config.ts` at the preset level — not in each component. When `prefers-reduced-motion` is active:
- All durations collapse to 0
- Transform keyframes stripped (no movement)
- Opacity-only fallback applied
- Cart fly-in skips entirely (item appears in cart instantly)

This guarantees accessibility without per-component checks.

### CMS Integration Point
`blockAppearance.scrollAnimation` field (already typed in `lib/page-builder-appearance.ts`) extended to accept named preset strings. `RevealOnScroll` reads this field; falls back to `block-defaults.ts` when value is `'default'` or `null`.

---

## 2. Animation Presets

All presets defined in `lib/animations/config.ts` as `Record<PresetName, AnimationPreset>`.

### Preset Definitions

| Preset | Keyframes | Duration | Easing | Use case |
|--------|-----------|----------|--------|----------|
| `fade-up` | y: 24→0, opacity: 0→1 | 600ms | `cubic-bezier(0.16,1,0.3,1)` | Text blocks, rich content |
| `fade-in` | opacity: 0→1 | 500ms | `ease-out` | Banners, dividers, subtle reveals |
| `slide-right` | x: -32→0, opacity: 0→1 | 500ms | `cubic-bezier(0.16,1,0.3,1)` | Sidebars, image-with-text (LTR) |
| `scale-in` | scale: 0.92→1, opacity: 0→1 | 400ms | `cubic-bezier(0.34,1.56,0.64,1)` | Cards, CTAs, modals |
| `stagger-cards` | scale-in per child, 80ms interval between children | 400ms per item | spring | Product grids, gallery grids |
| `stagger-list` | fade-up per child, 60ms stagger | 400ms | ease-out | FAQ items, feature lists |
| `hero-entrance` | y: 40→0, opacity: 0→1, scale: 0.97→1 | 800ms | `cubic-bezier(0.16,1,0.3,1)` | Hero blocks only |

### IntersectionObserver Config
- `rootMargin: '0px 0px -10% 0px'` — triggers slightly before element is fully in view
- `threshold: 0.05` — fires early to avoid pop-in
- One-shot: observer disconnects after first trigger

### Block → Preset Mapping (`block-defaults.ts`)

| Block | Preset |
|-------|--------|
| Hero | `hero-entrance` |
| FeaturedCollection | `fade-up` |
| FeaturedProducts | `stagger-cards` |
| RichText | `fade-up` |
| ImageWithText | `slide-right` |
| Gallery | `stagger-cards` |
| Testimonials | `stagger-cards` |
| LogoCloud | `fade-in` |
| Newsletter | `scale-in` |
| FAQ | `stagger-list` |
| PromoBanner | `fade-in` |
| VideoEmbed | `scale-in` |
| Divider | `fade-in` |
| Recommendations | `stagger-cards` |
| RecentlyViewed | `stagger-cards` |
| Button | `scale-in` |
| Text | `fade-up` |
| SocialBar | `fade-in` |
| Spacer | `none` |
| Columns | `stagger-list` |
| CallToAction | `scale-in` |
| Stats | `stagger-list` |
| Quote | `fade-up` |
| CardGrid | `stagger-cards` |
| Banner | `fade-in` |
| Steps | `stagger-list` |
| PricingTable | `stagger-cards` |
| Countdown | `scale-in` |
| Tabs | `fade-in` |
| FeatureGrid | `stagger-cards` |

---

## 3. Page Transitions & Navigation Animations

### Page Entry Transition (`PageTransition.tsx`)
- Wraps storefront layout content
- On route entry (mount): opacity 0→1, y 8→0, 250ms, `ease-out`
- Above-the-fold content animates in first; below-fold content handled by block reveal system
- **Entry-only** — no exit animation
- Rationale: Next.js 15 App Router has no reliable "before route change" hook without additional packages. Entry-only covers 90% of perceived smoothness at zero added dependency cost. View Transitions API (`next-view-transitions`) deferred — revisit if user requests true enter+exit.

### Navigation Interactions
- **Dropdown menus:** Keep existing CSS (`dropdown-panel-in` in `globals.css`) — already correct, no change
- **Mobile menu:** Upgrade CSS slide to Motion One spring (x: -100%→0, spring easing) for physical feel
- **Search overlay:** scale + fade from search icon origin (transform-origin: top right), 200ms

---

## 4. Ecommerce Micro-interactions

### Cart Fly-in (`useCartFlyIn` + `CartFlyIn.tsx`)
**Trigger:** "Add to Cart" button click  
**Behavior:**
1. Capture product image rect and cart icon navbar rect at click time
2. Render a ghost clone of the product image as a portal-rendered absolute div
3. Animate clone along parabolic arc from product → cart icon via 3-keyframe animation: start rect, midpoint (x halfway, y elevated by −120px), end rect — x interpolates linearly, y follows arc via keyframe values (no special easing needed beyond `ease-in-out`)
4. Cart icon scale pulse: 1→1.15→1, 300ms, on arc completion
5. Clone removed from DOM after animation completes

**Reduced motion:** Skip entirely — item appears in cart instantly with no animation.

### Wishlist Heart Pop (`useWishlistPop`)
**Trigger:** Wishlist toggle button click  
**On add:** scale 1→1.3 (spring), fill color gray→red (CSS transition), settle 1.3→1 (spring)  
**On remove:** scale 1→0.8→1, fill red→gray, 200ms, spring easing  
**Implementation:** Motion One `animate()` on SVG path element ref  
**Reduced motion:** Instant opacity toggle only

### Quantity Bump Pulse
**Trigger:** Cart quantity increment/decrement  
**Behavior:** Number scales 1→1.2→1 with accent color flash, 200ms. Cart badge in navbar gets the same pulse.  
**Implementation:** Motion One `animate()` on element ref — no clone needed  
**Reduced motion:** No animation, number updates instantly

### Checkout Step Progress
**Trigger:** Step navigation (next/back in checkout flow)  
**Inactive→Active:** scale + fill transition, 300ms  
**Active→Complete:** SVG checkmark morphs in via path animation, green fill, 400ms  
**Behavior:** Sequential — only one step changes state at a time, no stagger needed  
**Reduced motion:** Instant state swap, no morphing

---

## 5. CMS Editor Control

### Field Added
`scrollAnimation` select field added to the `blockAppearance` field group in `src/payload/groups.ts` (shared appearance group). One addition propagates to all 28+ blocks automatically.

### Field Options

| CMS Label | Value | Behavior |
|-----------|-------|----------|
| Default (follow block type) | `'default'` | Uses `block-defaults.ts` mapping |
| None (disable animation) | `'none'` | No animation — instant render |
| Fade Up | `'fade-up'` | Override with fade-up preset |
| Fade In | `'fade-in'` | Override with fade-in preset |
| Slide Right | `'slide-right'` | Override with slide-right preset |
| Scale In | `'scale-in'` | Override with scale-in preset |
| Stagger Cards | `'stagger-cards'` | Override with stagger-cards preset |
| Stagger List | `'stagger-list'` | Override with stagger-list preset |
| Hero Entrance | `'hero-entrance'` | Override with hero-entrance preset |

`'default'` is pre-selected. "None" is useful for above-the-fold blocks or where instant render is preferred.

### Data Flow
1. Editor sets `scrollAnimation` on a block in Payload admin
2. Saved to `blockAppearance` field group in database
3. Page builder renders block → `RevealOnScroll` receives preset name as prop
4. If `'default'` or `null`: look up `block-defaults.ts` by block type
5. Motion One runs preset params from `config.ts`
6. `prefers-reduced-motion` applied at config level

### Editor Boundaries
Editors control: which named preset (or none).  
Editors do NOT control: timing, easing, Motion One parameters.  
Designers own what each preset does via `config.ts`. This prevents editors from creating janky custom timings.

---

## Decisions Made

- **Motion One over Framer Motion:** User choice. WAAPI-based, ~18kb vs ~50kb, no React coupling for animation primitives.
- **Entry-only page transitions:** No `next-view-transitions` dependency. Revisit if true enter+exit is needed.
- **CSS kept for dropdowns:** Existing `dropdown-panel-in` is correct — no value in migrating to JS.
- **`prefers-reduced-motion` at config level:** Single enforcement point rather than scattered component checks.
- **CMS controls preset name only:** Designers own timing parameters. Prevents editor-introduced jank.
- **Solo project — commit directly to main:** Per CLAUDE.md project-specific git rules.
