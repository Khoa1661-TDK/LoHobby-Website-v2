# Phase 03 — Tests + Polish
Status: DONE

## Goal
Cover the analytics business logic with unit tests and verify end-to-end.

## Tasks
- [x] `classifySource` tests (utm / referrer / direct)
- [x] `topSellers` / `bottomSellers` aggregation tests
- [x] `viewToBuy` combination + high-attention/low-conversion flag tests
- [x] `dwellMs` capping test
- [ ] End-to-end manual verification per plan

## Acceptance Criteria
- [x] `pnpm vitest run` passes with new analytics tests
- [x] Unhappy paths (missing consent, garbage dwell, empty ranges) covered

## Decisions Made This Phase
<!-- Append decisions here as they happen. Full entry goes to DECISIONS.md -->
