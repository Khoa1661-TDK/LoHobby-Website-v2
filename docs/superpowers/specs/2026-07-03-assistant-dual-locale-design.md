# Page-Builder Assistant: Dual-Locale, Theme-Aware Upgrade — Design

Date: 2026-07-03
Status: Approved (design), pending implementation plan

## Problem

The page-builder AI assistant (`AssistantPanel` → `/api/page-builder/assistant`) is
single-locale and theme-blind:

- It only receives the layout of the locale currently being edited. It cannot read
  the other locale, copy content between locales, or edit a specific locale on
  request ("make the vi hero punchier, keep en").
- It does not know that themed colors come in light/dark pairs
  (`backgroundCustom` / `backgroundCustomDark`), so image-driven builds only set
  the light slot.
- Product/category binding relies on a 100-id list injected into the system
  prompt — it cannot find items by name past the cap.
- Image-to-page builds work but fidelity is mediocre (loose section mapping, no
  color extraction).
- The UI is a small fixed floating window with no change visibility, no history
  persistence, and no quick actions.

## Decision (user-approved)

Approach A: make the editor dual-locale. The `/[locale]/build/[slug]` editor
loads and manages BOTH locale layouts; the assistant sees and edits both. This
was chosen over (B) server-side other-locale writes from the assistant route
(hidden writes bypass live preview, undo, and autosave status) and (C) read-only
other-locale context (does not meet the requirement).

## 1. Dual-locale editor state

**Server component** (`app/[locale]/build/[slug]/page.tsx`): fetch drafts for
both locales (`fetchPageBySlugDraft(slug, 'vi')` + `(slug, 'en')`) and pass
`layouts: { vi: PageBlock[], en: PageBlock[] }` plus per-locale titles to
`EditorShell`.

**EditorShell state:** keep the active-locale layout driving the preview iframe
and field panel exactly as today; hold the other locale's layout in parallel
state.

- Structural edits (add / move / remove / duplicate — whether manual or from the
  assistant) apply to BOTH layouts in lockstep. New blocks get a shared
  `blockKey` so the pair stays linked (same invariant the mirror hook enforces).
- Field edits apply only to the target locale.
- Undo snapshot ("Undo last AI change") captures both layouts.

**Autosave** (`use-autosave.ts`): PATCH the active locale as today; if the other
locale's layout changed, PATCH it too (sequenced, not parallel, to avoid write
races). Both requests send an `X-PB-Skip-Mirror: 1` header; the mirror hook
(`mirror-locale-layout.ts`) checks it and sets `req.skipMirror`, since the
editor now owns cross-locale consistency for builder saves. Saves from the
Payload admin UI (no header) keep the mirror behavior unchanged.

**Accepted trade-off:** manually adding a block in the builder no longer
auto-translates its default copy to the other locale (both sides get the same
default copy until localized manually or via the assistant, e.g. a "Translate
page" quick action). Assistant-added blocks are NOT affected — the assistant
writes proper copy for both locales directly.

## 2. Assistant protocol: both locales, both theme slots

**Request body:** `{ prompt, layouts: { vi, en }, activeLocale, images }`
(replaces single `layout` + `locale`).

**User message:** both serialized snapshots, labeled, plus
`You are editing: <activeLocale>`.

**System prompt additions:**
- Structure (block order/types) is shared across locales; copy is per-locale.
- Themed color fields come in pairs: `<base>` is the light-mode value,
  `<base>Dark` is dark mode. When setting a background, set both slots
  (derive a sensible dark variant if the source only shows light).
- The pair list comes from `THEMED_COLOR_BASES` (`lib/page-builder/themed-color.ts`),
  not hardcoded.

**Tool changes** (`tools.ts`, `validate.ts`, `apply.ts`):

| Tool | Change |
|------|--------|
| `add_block` | Gains `fieldsOther` (optional): copy for the non-active locale. If omitted, active-locale fields are copied verbatim to the other layout. Structure inserts into both. |
| `update_block` | Gains `locale: 'vi' \| 'en' \| 'both'` (default: active). Fields validated/coerced per target block as today. |
| `move_block` / `remove_block` / `duplicate_block` | Always apply to both layouts (structure is shared). No signature change. |
| `read_block` (new) | `(index, locale)` → full untruncated field values of that block. Needed because the snapshot truncates strings at 80 chars, so faithful copy/translate between locales requires on-demand reads. Server-side only (reads the working copies), no streamed mutation. |

**Mutation stream:** each `mutation` event is tagged with `locales: ('vi'|'en')[]`.
The client (`AssistantPanel` → `EditorShell.onApply`) applies each mutation to the
tagged layout copies. `applyMutation` itself stays single-layout; the caller
routes.

**Server working copies:** the route keeps `working.vi` and `working.en`,
mirrors structural mutations into both, and applies field mutations per the
tag — same routing logic as the client so indices never drift.

## 3. Product & category search tools

Replace the products half of the injected id list with real search tools:

- `search_products({ query, limit })` → up to 20 of
  `{ id, title, price, hasImage }`, via `payload.find` on `products` with a
  `like` title filter, locale-aware. Tool result is JSON in the tool message.
- `search_categories({ query })` → same shape on `categories`.
- Categories are few: keep injecting the full category list into the prompt
  (fast path, no tool round-trip); products become search-only (drop the
  100-product prompt dump).
- **Id provenance validation:** the route accumulates every id the model has
  legitimately seen this run (injected category list + all search results).
  Relationship values must be members of that set — stronger than today's
  "must be an integer" check, and it produces a corrective tool error telling
  the model to search first.

## 4. Image-build fidelity & theme extraction

Prompt-only changes (the vision plumbing already works):

- Map each visible section of the screenshot to the closest block in the
  contract; preserve top-to-bottom order; don't skip sections that have a
  plausible block match.
- Transcribe visible copy verbatim for the locale it appears to be in, and
  write a faithful translation for the other locale.
- Extract dominant background/accent colors; set the light slot from the image
  and derive a readable dark-mode variant for the `Dark` slot.
- Raise `MAX_TURNS` 8 → 16 (dual-locale copy + search tools + read_block mean
  more calls per build).

## 5. Assistant UI overhaul (`AssistantPanel`, `EditorShell`)

- **Dock/float toggle:** panel can dock as a resizable right column (a third
  pane beside the field panel) or float as today. Mode + width persisted in
  `localStorage`.
- **Live change feed:** each streamed mutation renders as a card in the
  transcript ("+ Hero added at top (vi+en)", "~ Spotlight title updated (vi)").
  Clicking a card selects that block in the editor (via a callback into
  `EditorShell`). Cards for errors render inline in red as today.
- **Persistent history:** transcript stored per page id in `localStorage`
  (text + change cards; attached images are NOT persisted — too large).
  Clear-history button in the panel header.
- **Context bar:** slim strip under the header: "sees vi + en · light + dark ·
  editing VI".
- **Quick actions:** chips above the input — "Translate page to <other>",
  "Build from image" (opens file picker), "Add product section", "Match dark
  mode to light". Each expands to a prewritten prompt.
- **Markdown-lite** rendering of assistant replies (bold, italics, lists, line
  breaks) — no full markdown engine.

## 6. Error handling

- If one locale's draft fails to load in the server component: 404 as today
  (both locales exist for any real page; the seed creates both).
- If the other-locale PATCH fails after the active one succeeded: surface the
  existing "Save failed — retry" status; next debounce retries both.
- Search tool failures return an error tool-message to the model (it can retry
  or proceed unbound) — never abort the stream.
- Unknown/invented relationship ids → corrective tool error, mutation dropped
  (existing pattern).

## 7. Testing (Vitest, existing patterns)

- `validate.ts`: `update_block` locale param, `read_block`, id-provenance
  checks.
- Route tests: dual working copies stay in sync across structural + per-locale
  mutations; search tools return shaped results (mocked payload); skip-mirror
  header respected in autosave PATCH.
- `mirror-locale-layout`: honors `X-PB-Skip-Mirror`, unchanged without it.
- `AssistantPanel`: change-feed cards render per mutation, history persists and
  clears, quick-action chips inject prompts.
- `use-autosave`: second PATCH fires only when the other locale changed.

## Out of scope

- Creating new products/categories from the assistant (deferred).
- Persisting attached images in history.
- Any change to the header builder (`/build/header`) assistant-wise.
- Multi-page or cross-page assistant operations.
