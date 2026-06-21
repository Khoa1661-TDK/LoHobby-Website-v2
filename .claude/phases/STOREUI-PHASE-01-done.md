# Phase 01 — Foundation: page primitives + block icons
Status: DONE

## Goal
Add reusable storefront page primitives (built from the existing maker-identity primitives) and replace the block-picker icons.

## Tasks
- [x] Task 1: Storefront page primitives (`StorefrontPageHeader`, `PageShell`, `ContentSection`, `PrimaryButton`, `SecondaryButton`) + tests (commit 3f80840)
- [x] Task 2: Replace 13 block-picker SVGs + add dedicated recommendations/recently-viewed icons (commit 4da5824)

## Acceptance Criteria
- New primitives compose `SpecTag`/`BuildPlateGrid`/`LayerLineDivider`; no duplicated identity code
- Primitive unit tests green via `node_modules/.bin/vitest run`
- All 15 blocks show distinct, on-brand icons in the visual builder picker
- No new TypeScript errors

## Decisions Made This Phase
- Exported `primaryButtonClass`/`secondaryButtonClass` from the primitives so locale-aware next-intl `Link`s reuse button styling without duplication (added in Task 3).
- Block icons render via `<img src>`, so `currentColor` resolves to black; acceptable since the picker lives in the light Payload admin.
