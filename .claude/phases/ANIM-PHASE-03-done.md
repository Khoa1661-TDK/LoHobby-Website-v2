# Phase 03 — Ecommerce Micro-interactions
Status: DONE

## Goal
Add the ecommerce micro-interactions per spec §4: cart fly-in, wishlist heart pop, quantity bump pulse, checkout step progress.

## Tasks
- [x] `lib/animations/hooks/useCartFlyIn.ts` + `components/animations/CartFlyIn.tsx` — portal ghost clone, parabolic arc product→cart icon, cart icon scale pulse 1→1.15→1
- [x] `lib/animations/hooks/useWishlistPop.ts` — heart scale spring + fill color transition on add/remove
- [x] Quantity bump pulse (`lib/animations/hooks/useBumpPulse.ts`) — number + navbar cart badge scale 1→1.2→1 with accent flash
- [x] `lib/animations/hooks/useRipple.ts` — button press ripple
- [x] Checkout step progress → **redirected to the order-status timeline** (`components/animations/OrderTimeline.tsx`): inactive→active scale+fill, active→complete SVG checkmark morph
- [x] prefers-reduced-motion: cart fly-in skipped entirely; all others instant state swap

## Acceptance Criteria
- Cart fly-in: ghost clone arcs from product image to cart icon, clone removed after; cart icon pulses ✓
- Wishlist heart: spring pop on add, shrink-settle on remove, fill color animates ✓
- Quantity changes pulse the number and the navbar badge ✓
- Checkout steps animate sequentially (one at a time) ✓ (on the order timeline)
- Reduced motion fully respected (fly-in skipped, rest instant) ✓
- Build/typecheck + tests pass — `tsc --noEmit` 0 errors, `pnpm build` ✓, 567 tests pass (10 new)

## Decisions Made This Phase
- **"Checkout Step Progress" retargeted to the order-status timeline.** The spec assumed a multi-step checkout wizard, but `components/checkout-form.tsx` is a single-page form with stacked sections — there are no next/back steps to animate. The only genuine step-progress UI is the order timeline at `profile/orders/[orderCode]` (pending→paid→shipped→delivered). User chose to animate that rather than refactor checkout into a wizard or defer the task. Faithful to the animation intent (inactive→active scale+fill, active→complete checkmark morph, sequential), zero feature-refactor risk.
- **Cross-tree fly-in via a module-level event bus.** The Add-to-Cart button and the navbar cart icon live in different React subtrees. Rather than lift state to a shared provider, `useCartFlyIn`/`flyToCart` emit to a tiny `Set<listener>` bus; the single `<CartFlyIn/>` mounted in `providers.tsx` subscribes and renders the ghost clone. `flyToCart` is a plain (non-hook) function so it's callable anywhere and unit-testable without a React render.
- **Ghost clone appended to `document.body`, not a React portal child.** The clone is a one-shot imperative DOM node (cloneNode of the marked product image) animated with Motion One then removed on `finished`. `CartFlyIn` returns an empty portal only to stay a valid mounted component. Source resolution prefers `[data-cart-fly-source]` in the nearest `article`/`[data-product]`, then a document-wide marker, then the trigger button.
- **Parabolic arc via 3-keyframe transform.** x interpolates linearly (start, mid, end); y lifts the midpoint by −120px above the straight line, so a plain `easeInOut` yields the arc with no custom path math (spec §4).
- **Quantity bump = generic `useBumpPulse(value)` hook** reused by both the cart-line `<input>` and the navbar badge — scale 1→1.2→1 + terracotta-500 (`#e46a41`) colour flash, restoring the original inline colour after so it doesn't override theme classes. Skips the initial render (no pulse on mount).
- **Wishlist pop relaxed generic to `Element`** (heart is an `<svg>`, not `HTMLElement`). Removed the static `scale-110` class on the saved state so the hook owns the transform; CSS still owns the fill-colour transition. First render is skipped so a pre-saved item doesn't pop on hydration.
- **Ripple needs `overflow-hidden` + `position:relative`** on the host. Added `overflow-hidden` to the AddToCart button; ripple colour is `var(--ripple-color, rgba(255,255,255,0.35))` (translucent white reads on the dark button, overridable per-button).
- **All reduced-motion checks reuse `prefersReducedMotion()` from Phase 1 `config.ts`** at each call site — these are bespoke interactions, not presets, so they don't go through `reduceMotion()`. Fly-in is skipped entirely (item appears instantly); pop/pulse/ripple no-op; timeline renders final state with no sequencing.
