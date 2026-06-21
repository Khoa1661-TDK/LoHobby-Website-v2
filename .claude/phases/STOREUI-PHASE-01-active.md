# Phase 01 — Foundation: page primitives + block icons
Status: ACTIVE

## Goal
Add reusable storefront page primitives (built from the existing maker-identity primitives) and replace the block-picker icons.

## Tasks
- [ ] Task 1: Storefront page primitives (`StorefrontPageHeader`, `PageShell`, `ContentSection`, `PrimaryButton`, `SecondaryButton`) + tests
- [ ] Task 2: Replace 13 block-picker SVGs + add dedicated recommendations/recently-viewed icons

## Acceptance Criteria
- New primitives compose `SpecTag`/`BuildPlateGrid`/`LayerLineDivider`; no duplicated identity code
- Primitive unit tests green via `node_modules/.bin/vitest run`
- All 15 blocks show distinct, on-brand icons in the visual builder picker
- No new TypeScript errors

## Decisions Made This Phase
(append as you go)
