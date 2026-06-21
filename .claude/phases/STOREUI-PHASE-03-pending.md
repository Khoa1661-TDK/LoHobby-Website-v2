# Phase 03 — Per-locale CMS pages (Payload localization)
Status: PENDING

## Goal
Enable Payload native localization so one CMS page holds vi+en content, switched by route locale, threaded through data layer, storefront, builder, preview, and autosave.

## Tasks
- [ ] Task 7: Enable Payload localization + localize Pages + generate migration with vi backfill
- [ ] Task 8: Thread locale through data layer + storefront reads (per-locale cache)
- [ ] Task 9: Locale-aware builder, preview & autosave
- [ ] Task 10: End-to-end localization verification + home backfill check

## Acceptance Criteria
- `/vi` and `/en` resolve their own CMS content; builder edits each locale independently
- Migration adds localized columns and backfills existing content into `vi` (home not blank)
- No `42P01` at runtime; full Vitest suite + production build green
- migrate:status reconciled before migrate:create (remote DB ledger may drift)

## Note
Applying the migration to the remote DATABASE_URL is destructive/stateful — leave the actual remote apply for the user (docker/db access needs `! sudo …`). Code, config, and migration file can be prepared autonomously.

## Decisions Made This Phase
(append as you go)
