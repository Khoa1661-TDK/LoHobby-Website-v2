# Phase 01 — Animation Foundation & Scroll Reveal
Status: DONE

## Goal
Install Motion One, build the preset/config layer, hooks, the new RevealOnScroll, the CMS `scrollAnimation` field, and wire it through the page builder so every block can be animated on scroll.

## Tasks
- [x] Install `motion` package (pnpm) — motion@12.42.0
- [x] `lib/animations/config.ts` — all presets as `Record<PresetName, AnimationPreset>`, prefers-reduced-motion handled at config level, IntersectionObserver config
- [x] `lib/animations/block-defaults.ts` — block type → preset name mapping (per spec §2 table)
- [x] `lib/animations/hooks/useReveal.ts` — IntersectionObserver + Motion One, one-shot
- [x] `components/animations/RevealOnScroll.tsx` — wrapper using useReveal, reads preset prop, falls back to block-defaults
- [x] Extend `scrollAnimation` typing in `lib/page-builder-appearance.ts` to accept named preset strings
- [x] Add `scrollAnimation` select field to the shared appearance group — actual location is `src/payload/blocks/_appearance.ts` (spec said `groups.ts`, which is sidebar groups only)
- [x] Wire RevealOnScroll into RenderBlocks so scrollAnimation flows through; `'default'`/null → block-defaults lookup
- [x] Update/verify tests + regenerate payload-types

## Acceptance Criteria
- All 7 presets defined and exported with correct keyframes/duration/easing per spec §2
- Block→preset map covers all blocks in spec §2 table
- `prefers-reduced-motion`: durations collapse to 0, transforms stripped, opacity-only
- CMS field shows 9 options, `'default'` pre-selected, propagates to all 30 blocks
- Existing RevealOnScroll usages still work (no regressions)
- `pnpm build`/typecheck + relevant tests pass

## Decisions Made This Phase
- **Motion package = `motion` v12.42.0**, not standalone Motion One. v12 unifies Motion One + Framer Motion; we import the imperative WAAPI API (`animate`, `stagger`, `inView`) — no React-coupled components — keeping the spec's ~18kb WAAPI intent. Easing option key is `ease` (not `easing`).
- **Legacy preset aliases added** (`reveal-up`→`fade-up`, `reveal-right`→`slide-right`) in `config.ts`/`normalizePreset`. Spec renamed presets but pre-existing CMS data stores the old values; aliasing keeps stored pages animating with no data migration.
- **Field lives in `_appearance.ts`, not `groups.ts`.** Spec §5 referenced the wrong file; `groups.ts` is admin sidebar groups. The shared `appearanceFields` array is spread into all 30 blocks, so one edit propagates everywhere as the spec intended.
- **`defaultValue` flipped `none`→`default`** affects only newly created blocks (Payload semantics). Existing blocks keep their stored value, so no page suddenly starts/stops animating on deploy.
- **Tailwind `reveal-up`/`scale-in` keyframes kept** — `.stagger-item` in globals.css still uses them; not part of this migration.
- **RevealOnScroll moved** `components/blocks/` → `components/animations/` per spec file structure; old file deleted, test moved + import updated.
