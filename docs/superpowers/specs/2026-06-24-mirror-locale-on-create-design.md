# Mirror-on-Create with Auto-Translation Across Locales

Date: 2026-06-24
Status: Approved

## Problem

The page builder stores the `layout` blocks array as `localized: true` in Payload, so `vi` and `en` each hold a **completely separate copy** of every section. Today the two locales are edited fully independently: adding a section in `vi` does nothing to `en`, and translating the text of each section is a manual, per-locale chore.

We want:

1. **Mirror-on-create** — when a section is added to one locale, the other locale gets a structural counterpart (added at the matching position).
2. **Independent-on-edit** — editing a field on an existing section changes only the active locale. The other locale's text is never overwritten by an edit.
3. **Auto-translate** — the text fields of newly-added blocks are translated (vi↔en) on the mirrored copy using a free LLM.
4. **Theme comes along automatically** — theme colors are already paired sibling fields inside each block (`backgroundCustom` light + `backgroundCustomDark` dark), so mirroring a block copies both theme colors verbatim. No separate theme-copy logic is needed.

Structural changes beyond adds — deletes and reorders — also mirror to the other locale so the two stay parallel. Field-level edits do **not** propagate.

## Architecture

### Stable block identity: `blockKey`

Payload's auto-generated block `id` is **stripped on every save** by `lib/page-builder/strip-block-ids.ts` (intentionally, to avoid cross-locale primary-key collisions). Therefore `id` is not stable across save boundaries and **cannot** be used to diff a layout before/after.

We introduce a separate stable identifier:

- A `blockKey` field (UUID string) added to **every** block via a shared field spread (`src/payload/blocks/_identity.ts`).
- Generated client-side in `createDefaultBlock` so brand-new blocks carry one immediately.
- **Preserved** by `stripBlockIds` (only Payload's `id` is removed). `blockKey` is a normal declared field, so it persists across saves and is identical in both locale copies after a mirror.
- Hidden in the editor: `admin.hidden: true`, and excluded from the visible fields in `FieldRenderer`.
- Also added to the `PageBlock` TypeScript union / block interfaces so types stay accurate.

**Legacy / admin-created blocks** lacking a `blockKey` are treated as "new" on the first structural sync after this ships: they get mirrored + translated to the other locale. This is a one-time, bounded over-translation risk (see Trade-offs).

### The reconcile hook (`afterChange` on `Pages`)

A single `afterChange` hook (`src/payload/hooks/mirror-locale-layout.ts`) runs on every save of locale `L`. It diffs the just-saved `layout` against the document's **previous** `layout` state for `L`, **by `blockKey`**.

The previous state is obtained from the original document (Payload passes the prior `doc` to `afterChange`); for autosave/version flows where that is unreliable, the hook reads the prior locale layout from the DB before mutating the other locale. The hook operates on the incoming `req.data.layout` and the prior stored layout for the active locale.

Diff outcomes, per block `blockKey`:

| Situation | Action on the other locale |
|-----------|----------------------------|
| Key in new layout, not in old layout (added) | Mirror the new block; translate its text fields; insert at matching position |
| Key in old layout, not in new (removed) | Delete the matching block from the other locale |
| Key in both, position changed (reordered) | Reorder the other locale's matching block to follow the new order |
| Key in both, fields changed (edited) | **Do nothing** — edits do not propagate |
| Block exists in the other locale but never in `L` | **Preserve in place** — never wiped by a structural sync of `L` |

**Positional matching rule:** the other locale is rebuilt to follow the active locale's key order. Concretely: build the other locale's new array by walking the active locale's new layout in order; for each key, if the other locale has that block (by `blockKey`), reuse its existing object (preserving its text) — for added keys, use the translated copy; for keys absent in the other locale's old layout (new adds), insert the translated block. Then append any blocks that existed **only** in the other locale at the end, in their original relative order. This makes reorder "follow the active locale's order" and add/remove fall out naturally, while other-locale-only blocks are never destroyed. Field-level edits require no special handling: an edited key is reused as-is, so its other-locale text is untouched.

**Recursion guard:** the programmatic `update` to the other locale sets `req.skipMirror = true`. The hook checks this flag at entry and exits early, preventing infinite mutual recursion (vi sync → en sync → vi sync …).

**Reentrancy / concurrency:** the other-locale write is a direct Payload `update()` call within the same request lifecycle. Autosave fires frequently; the hook is idempotent (a re-run with identical layouts produces no further changes because added keys are already present in the other locale).

### Translation engine

- **Provider:** OpenRouter, accessed via the `openai` SDK (OpenAI-compatible `baseURL: https://openrouter.ai/api/v1`).
- **Model:** `meta-llama/llama-3.3-70b-instruct:free` (configurable via `OPENROUTER_MODEL` env var).
- **Auth:** `OPENROUTER_API_KEY` env var. If unset, translation is skipped: structure still mirrors, source text is copied verbatim, and a warning is logged. The feature degrades gracefully rather than blocking saves.
- **Scope of translatable fields:** every `text` / `textarea` field, recursed into array/group/rows fields (FAQ `items`, Columns `columns`, CardGrid `cards`, Stats `items`, Steps `steps`, Testimonials `entries`, etc.). A **denylist** excludes non-translatable fields: `url`, `href`, `ctaHref`, `ctaUrl`, `primaryUrl`, `secondaryUrl`, `openInNewTab`, `primaryOpenInNewTab`, `secondaryOpenInNewTab`, all `appearanceFields` (`background`, `backgroundCustom`, `backgroundCustomDark`, `containerWidth`, `paddingY`), `blockKey`, `blockType`, hex color inputs, slugs, and relationship/`id` fields. The denylist lives in `translatable-fields.ts` so it is auditable in one place.
- **Batching:** one LLM call per save that has newly-added blocks. All `path → source string` pairs from the added blocks are collected into a single JSON map, sent to the model with an instruction to return the same map translated into the target locale, and written back by path. Batching keeps cost and latency low and plays well with free-tier rate limits.
- **Best-effort contract:** on any API error (network, 429, parse failure), the hook mirrors the structure anyway with the **source text** and logs the failure. The two locales stay structurally in sync; an editor fixes the text later. A failed translation never breaks a save or leaves a locale half-mirrored.

### Rich text

Out of scope for v1. Lexical rich text is stored as structured JSON nodes; translating it correctly requires walking the node tree, which is a separate, larger piece of work. Rich-text fields (FAQ `answer`, RichText `content`, ImageWithText `body`) are copied verbatim into the mirrored block. Flagged for a follow-up spec.

## Components

| Unit | Location | Responsibility |
|------|----------|----------------|
| `blockKey` field | `src/payload/blocks/_identity.ts` | Shared field spread added to every block |
| Block interface / `PageBlock` union | `lib/page-builder.ts` + block `.ts` interfaces | Add `blockKey?: string` |
| `createDefaultBlock` | `lib/page-builder/default-block.ts` | Generate `blockKey` UUID for new blocks |
| `stripBlockIds` | `lib/page-builder/strip-block-ids.ts` | Continue stripping `id`; preserve `blockKey` |
| FieldRenderer hide | `components/page-builder/FieldRenderer.tsx` | Exclude `blockKey` from visible fields |
| Layout diff/reconcile | `lib/page-builder/mirror/reconcile-layout.ts` | Diff by `blockKey`, compute add/remove/reorder, apply to other locale preserving existing text |
| Translatable field selection | `lib/page-builder/mirror/translatable-fields.ts` | Walk a block, return `path → value` pairs of translatable text, excluding denylist |
| Translation call | `lib/page-builder/mirror/translate-blocks.ts` | Batch LLM call via OpenRouter; best-effort |
| afterChange hook | `src/payload/hooks/mirror-locale-layout.ts` | Orchestrate: read active locale, diff, reconcile other locale, translate added blocks, recursion guard |
| Hook wiring | `src/payload/collections/Pages.ts` | Register the hook |

## Data Flow

1. Editor adds/removes/reorders a block in locale `L` (vi), edits some fields, autosave PATCHes `/admin/api/pages/{id}?locale=vi` (layout is `stripBlockIds`-ed; `blockKey` survives).
2. Payload persists the `vi` layout.
3. `afterChange` fires for `vi`:
   - If `req.skipMirror` → return.
   - Compute `added`, `removed`, `reordered` vs. the prior `vi` layout by `blockKey`.
   - Load the `en` layout (other locale) from the DB.
   - Reconcile `en`: insert translated added blocks at matching positions, delete removed keys, reorder to follow.
   - Preserve existing `en` text for unchanged keys; preserve `en`-only blocks in place.
   - Build the translated blocks (batch OpenRouter call).
   - `update()` the page with the reconciled `en` layout, `req.skipMirror = true`.
4. Editor switching to `/en/build/{slug}` loads the now-mirrored, translated `en` layout.

## Error Handling

- **API key missing / API error:** structure still mirrors; text copied verbatim; warning logged. Save never fails.
- **Partial response / parse failure:** treat as full failure for that batch — copy verbatim, log, continue. No half-translated block written (translation map is applied atomically: all-or-nothing per batch).
- **Hook throws unexpectedly:** wrapped in try/catch so a hook bug never blocks the original save. The `vi` save always succeeds even if `en` mirroring fails.
- **Recursion:** `req.skipMirror` flag prevents the `en` write from re-triggering a `vi` sync.

## Testing

- **`reconcile-layout.ts`** — pure function, unit-testable:
  - add to empty other-locale → mirrored.
  - add into middle of existing → inserted at right index, existing text preserved.
  - remove → gone in other locale, other-locale-only blocks preserved.
  - reorder → order follows, text preserved.
  - edit (same key, changed fields) → other locale untouched.
  - legacy block without `blockKey` → treated as added on first sync.
- **`translatable-fields.ts`** — unit: denylist fields excluded; array fields recursed; rich text returned as a single path (verbatim copy, not translated in v1).
- **`translate-blocks.ts`** — unit with mocked OpenRouter client: batching shape, target locale, best-effort fallback on rejection returns source map unchanged.
- **Hook** — integration-style test with a mocked Payload + mocked translator: full add→mirror→translate flow, recursion guard respected, `skipMirror` short-circuits.

Tests follow the project Vitest setup and naming convention (`should ... when ...`).

## Trade-offs (Honest Opposition)

1. **Structural sync can be destructive to independent other-locale work.** A block deleted in `vi` is deleted in `en` — by design. This assumes the two locales are meant to be parallel in structure. Hand-added `en`-only blocks are preserved (not wiped), but `en` cannot structurally diverge from `vi` for shared keys without being pulled back into sync on the next `vi` save. If true locale independence is later wanted, this is the trade-off to revisit.
2. **Translation quality on a free model.** Llama 3.3 70B (free) is good for vi↔en but not DeepL-grade; marketing tone may need a manual pass. Configurable via `OPENROUTER_MODEL` to upgrade later.
3. **One over-translation window for legacy data.** Pre-`blockKey` blocks mirror+translate on first sync as if new. Bounded and one-time, but editors should be aware on first deploy.
4. **Rich text not translated in v1.** Copied verbatim; follow-up spec needed.

## Out of Scope

- Rich-text (Lexical) translation.
- Mirroring across themes as separate stores (theme is already paired fields — handled implicitly).
- Translating the `title` field of the Page itself (separate localized field; not part of `layout`).
- Bulk re-translation of already-mirrored blocks (only newly-added blocks translate).
