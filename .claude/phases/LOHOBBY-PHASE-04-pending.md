# Phase 04 — Assemble + Verify
Status: PENDING

## Goal
Assemble the Lô Hobby homepage from the new/enhanced blocks via the home seed, add tests, and verify the whole build.

## Tasks
- [ ] Rebuild `lib/page-builder/home-seed.ts` into the Lô Hobby layout (hero w/ stats+collage, category FeatureGrid, ProductShowcase, Reels, trust FeatureGrid, newsletter)
- [ ] Add Vitest tests: schema round-trip for ProductShowcase + Reels, ProductShowcase filter/sort logic, home-seed builds without null blocks
- [ ] Run `pnpm build` + typecheck
- [ ] Run `pnpm test`
- [ ] Update CLAUDE.md "Current Phase" pointer

## Acceptance Criteria
- Homepage renders the mockup layout end to end
- All tests pass
- Build is clean

## Decisions Made This Phase
(append as you go)
