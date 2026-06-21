# Phase 03 — Per-locale CMS pages (Payload localization)
Status: DONE

## Goal
Enable Payload native localization so one CMS page holds vi+en content, switched by route locale, threaded through data layer, storefront, builder, preview, and autosave.

## Tasks
- [x] Task 7: Enable Payload localization + localize Pages + migration with vi backfill (commit 001e33a)
- [x] Task 8: Thread locale through data layer + storefront reads (per-locale cache)
- [x] Task 9: Locale-aware builder, preview & autosave (+ vi/en toggle in EditorShell)
- [x] Task 10: Migration applied to remote DB; data verified preserved into vi locale

## Acceptance Criteria
- [x] `/vi` and `/en` resolve their own CMS content; builder edits each locale independently
- [x] Migration backfills existing content into `vi` (verified: 2 page titles + blocks + rels intact)
- [x] Vitest suite green (11 locale/autosave tests); tsc clean after generate:types
- [x] migrate:status was clean (no drift); migration applied in 237ms

## Decisions Made This Phase
- The generated migration was UNSAFE (dropped pages.title without copy; added NOT NULL _locale to populated block tables → would fail). Hand-wrote a safe version: add _locale nullable → backfill 'vi' (title via INSERT into pages_locales, block rows + rels via UPDATE) → SET NOT NULL → drop old columns.
- Enabling localization also localized the SEO plugin's meta fields catalog-wide; safe here because all meta_* were empty (verified before applying).
- Editing locale = route locale (/vi/build vs /en/build); EditorShell has a vi/en toggle. Autosave PATCHes Payload REST with ?locale=.
- pg_dump unavailable; took a JSON snapshot of all pages* tables to /tmp instead (scripts/backup-pages-data.mjs).
- down() left as Payload-generated (would fail on rollback of populated tables); rollback path is restore-from-backup, not migrate:down.
