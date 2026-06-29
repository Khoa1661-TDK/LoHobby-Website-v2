# Phase 02 — Page Transitions & Navigation
Status: DONE

## Goal
Add entry-only page transitions and upgrade navigation interactions (mobile menu spring, search overlay) per spec §3.

## Tasks
- [x] `components/animations/PageTransition.tsx` — entry-only: opacity 0→1, y 8→0, 250ms ease-out
- [x] Wrap storefront layout content with PageTransition (wraps `children` only, not persistent Navbar/Toaster)
- [x] Mobile menu: upgrade CSS slide to Motion One spring (x: -100%→0)
- [x] Search overlay: scale + fade from search icon origin (transform-origin: top right), 200ms
- [x] Keep dropdown CSS (`dropdown-panel-in`) unchanged — verified, file untouched, no regression
- [x] prefers-reduced-motion fallbacks for each (reuse `prefersReducedMotion()` from config.ts)

## Acceptance Criteria
- Route entry animates once, no exit animation, no added route-change dependency
- Mobile menu opens with spring feel; search overlay scales from origin
- Dropdowns untouched and still working
- Reduced motion: instant for all of the above
- Build/typecheck + tests pass — `pnpm build` ✓, `tsc --noEmit` 0 errors, 557 tests pass

## Decisions Made This Phase
- **PageTransition keys on `usePathname()`, not a route-change package.** Effect re-runs on pathname change → entry-only fade+drift. No `next-view-transitions` added (spec §3 rationale). Under SSR `usePathname()` returns null without throwing, so the SSR-visible contract holds and the test renders fine.
- **PageTransition wraps `children` only.** Navbar, AnnouncementBanner, Toaster, WelcomeToast stay outside so they don't re-animate on every navigation — only the routed page content drifts in.
- **Mobile menu: dropped Headless UI `Transition`/`TransitionChild`, kept `Dialog`/`DialogPanel`.** Headless UI's Transition can't express a spring. Replaced with a `mounted` + `isOpen` two-state machine: `mounted` keeps the panel in the DOM through the close animation; Motion One springs the panel in (`stiffness 260, damping 30`) and eases it out (`cubic-bezier(0.4,0,1,1)`), flipping `mounted` off on `controls.finished`. `Dialog` still provides focus trap, ESC, and scroll lock. Used `useLayoutEffect` to set the start transform before paint (no flash).
- **Search overlay = the suggestions dropdown.** Animated the existing suggestions `<ul>` (scale 0.9→1 + fade, 200ms, `transform-origin: top right`) via a ref + `useLayoutEffect`. No new overlay element introduced.
- **Reduced motion reuses `prefersReducedMotion()` from Phase 1 config.ts** in each component (PageTransition, mobile menu, search) rather than the preset-level `reduceMotion()` — these are bespoke interactions, not presets, so the check is at the call site but still sourced from the single config helper.

