# Page-builder assistant — schema fidelity & resource binding

**Date:** 2026-07-25
**Status:** Design — awaiting user review

## Goal

Make the AI page-builder assistant able to use the **whole** page-builder surface it
already has access to. Today it can add blocks but cannot fill their repeating rows,
cannot set any image, has styling silently discarded, and cannot reach a third of the
catalog. This design closes those four gaps.

## Background — how the assistant works today

`POST /api/page-builder/assistant` (`app/api/page-builder/assistant/route.ts`) runs an
admin-guarded streaming tool-use loop against any OpenAI-compatible endpoint. Each turn
the model may call `add_block` / `update_block` / `read_block` / `move_block` /
`remove_block` / `duplicate_block`. Every validated call becomes a `mutation` event
streamed to `AssistantPanel`, applied to both locale layouts through
`applyDualMutation` on the server working copy and the client `EditorShell` state
simultaneously, so indices never drift.

The model learns what it may write from a **block contract** built by
`buildSystemPrompt` (`lib/page-builder/assistant/tools.ts`) out of `getBlockSchemas()`
(`lib/page-builder/block-schemas.ts`), which derives serializable descriptors from the
same Payload `Block` definitions the `Pages` collection uses.

That derivation is sound. **The rendering of it into the prompt is where fidelity is
lost.**

## The four gaps (measured)

1. **Array and group sub-fields are invisible.** `describeFieldLine` handles
   `relationship`, `richText`, `number`, and enums; everything else prints as a bare
   type line, so an array renders as `- items: array` with no row shape. **18 of 37
   blocks are array-driven** (FAQ, Testimonials, Stats, Steps, PricingTable, Tabs,
   CardGrid, FeatureGrid, Gallery, LogoCloud, Columns, Marquee, Reels, Spotlight,
   SocialBar, InfoSection, ReelCarousel, Hero media tiles). `checkFields`
   (`validate.ts:92`) likewise inspects only top-level keys, so a guessed row shape is
   never rejected — it reaches Payload and 400s the whole page save.

2. **Images can never be set.** **14 blocks have `upload` → `media` fields.**
   `loadRelationshipOptions` (`route.ts:119`) loads only `categories` and `products`,
   and `upload` is not treated as a bindable target in the contract. There is no media
   search tool. Every page the assistant builds is imageless.

3. **Conditional fields are recovered and then dropped.** `describeCondition`
   reconstructs the common `siblingData.x === 'y'` shape into
   `FieldDescriptor.condition`, and the prompt never prints it. The model sets
   `backgroundCustom` without setting `background: 'custom'`, and the value silently
   does nothing. `admin.description` — where real authoring rules live, e.g.
   *"headlineHighlight must match the headline exactly"* — is not captured by
   `describeField` at all.

4. **Catalog ceiling and snapshot blindness.** `RELATIONSHIP_LIMIT = 100` against a
   118-product catalog makes some products unreachable, while burning ~4k tokens of ids
   into every turn. `serializeLayout` (`assistant/snapshot.ts`) keeps only top-level
   **short strings** — dropping numbers, booleans, enums, and arrays — so the model
   cannot see that an FAQ block has zero items without a `read_block` round-trip.

### Sizing the naive fix

Measured against the live schemas: the current system prompt is **30,567 chars
(~7.6k tokens)**. Naively expanding every nested field for all 37 blocks yields **694
field lines, ~89k chars (~22k tokens)** — resent on every one of up to 16 turns. Hence
the two-tier design below rather than a flat expansion.

## Scope (confirmed with user)

**In scope — this spec:**

- Two-tier block contract: compact index in the system prompt + `describe_block` tool.
- Recursive validation of array/group values.
- Row-level tools for editing inside arrays.
- `search_media` and `search_catalog` resource-binding tools.
- Richer layout snapshot.
- Tool-loop turn budget.

**Deferred to their own spec–plan–build cycles** (agreed as separate sub-projects, each
a distinct save surface):

- Page settings tools (title, slug, SEO meta, publish state).
- Site chrome tools (`site-header`, `navigation`, `store-settings` globals).
- Preview self-check (render the result and inspect it before declaring done).

## Non-goals / constraints

- **No Payload schema changes.** This is prompt, validation, and tool-surface work
  against existing block definitions, so **no migration is required** — unlike prior
  block work in this repo, where a new field without a generated migration threw
  `42P01` at runtime.
- No change to the dual-locale invariant: structure and order stay shared across `vi`
  and `en`; only copy is per-locale. New tools route through `applyDualMutation`.
- No change to the streaming protocol or `AssistantPanel`'s mutation handling beyond
  what new mutation kinds require.
- Provider-agnostic: tools stay in OpenAI function-calling shape and validation stays
  server-side (no provider `strict` mode), as today.

## Architecture

### A. Two-tier block contract

`buildSystemPrompt` stops emitting all 37 blocks in full. It emits a **compact index** —
one line per block: slug, label, and top-level field names with arrays marked `items[]`.
Target ≈2.5k tokens, *smaller* than today's 7.6k.

```
faq — FAQ. fields: title, items[], layout, +appearance
hero — Hero. fields: eyebrow, headline, headlineHighlight, subheadline,
       ctaLabel, ctaHref, ctaStyle, image, tiles[], +appearance
```

Appearance fields are shared across every block (`src/payload/blocks/_appearance.ts`),
so the index collapses them to `+appearance` and the system prompt documents that group
**once, in full** — every option, default, and condition, plus its light/dark
themed-color pairing rules (which the prompt already derives from `THEMED_COLOR_BASES`).
Because that group is fully documented up front, **`describe_block` output omits
appearance fields** and notes that they are the shared set; this keeps each response to
the fields unique to that block.

A new tool returns the full spec for one block on demand:

- **`describe_block(slug)`** → complete field spec, recursively: nested array row shapes
  and group shapes, enum options, `defaultValue`, `required`, condition gating, and
  `admin.description` guidance.

The model pays for the ~6 blocks it actually uses in a build, not all 37. Tool results
persist in message history, so each block is described at most once per run.

The system prompt instructs: **call `describe_block` before the first `add_block` or
`update_block` against a block type you have not yet described this session.** A guessed
field name still fails validation with a corrective error, so this is guidance, not a
gate.

**Required supporting change:** `FieldDescriptor` gains a `description?: string`,
populated by `describeField` from `field.admin.description` (currently dropped). This
also benefits the visual `FieldRenderer`, but wiring it into that UI is out of scope here.

**Known trap — injected `id` fields.** Calling `getPayload()` mutates the shared Payload
`Block` definitions in place, adding an `id` field to every `array`. Since
`getBlockSchemas()` caches on first call and the route calls `getPayload()` first,
array descriptors *will* contain a spurious `id`. `describe_block` and the compact index
must filter `id` and `blockKey` out of every field list at any depth. Without this the
model writes row ids, which trips the localized-save "Value must be unique: id"
collision that `strip-block-ids.ts` exists to prevent.

### B. Recursive validation

`checkFields` becomes depth-aware. For each supplied key it resolves the
`FieldDescriptor` and validates by type:

| Field type | Validation |
|---|---|
| `array` | value must be an array; each element an object validated against `field.fields`; reject `id` keys |
| `group` | value must be an object validated against `field.fields` |
| enum (`options`) | value in the allowed set — at any depth |
| `number` | `min`/`max` bounds — at any depth |
| `relationship` | integer id or array of integer ids — at any depth |
| `upload` | integer media id — at any depth (new; previously unvalidated) |
| `richText` | Markdown string coerced to Lexical via existing `coerceRichText` |

`coerceRichText` already recurses into array rows; only the **checker** lacked recursion.
Both walk the same descriptor tree after this change.

Errors keep their current shape — a human-readable string returned to the model as a
`tool` message and streamed as an `error` event — but gain a path prefix for nested
failures, e.g. `Field "items[2].layout" must be one of: accordion, twoCol`.

### C. Row-level tools

Three tools, so editing one row does not require retyping the array:

- **`add_row(index, field, values, at?)`** — append, or insert at `at`.
- **`update_row(index, field, rowIndex, values)`** — patch one row's fields.
- **`remove_row(index, field, rowIndex)`**

New `Mutation` kinds (`addRow` / `updateRow` / `removeRow`) with reducers alongside
`lib/page-builder/layout-reducer.ts`, applied through `applyMutation` so server working
copy and client `EditorShell` state stay identical.

**Locale routing.** Rows carry copy, but a row's *existence* is structure: adding or
removing a row in one locale only would leave the two layouts with different row counts,
which the index-based editing model cannot tolerate. So the two tool families split:

| Tool | Locale behaviour | Rationale |
|---|---|---|
| `add_row`, `remove_row` | **Always both locales**, like `add_block`. `values` is written to the active locale; optional `valuesOther` carries the translation, defaulting to a clone. | Row count is structural and must stay aligned. |
| `update_row` | Honours a `locale` tag (`vi` \| `en` \| `both`), defaulting to active, exactly like `update_block`. | Patching a row's text is pure copy. |

Rows are created **without an `id` key** so the save path assigns them.

### D. Resource binding

Two search tools replace prompt-embedded id dumps:

- **`search_media(query, limit)`** → `{id, filename, alt, width, height}[]`. Empty query
  returns the most recent uploads. Backed by `payload.find({ collection: 'media' })`
  with a `filename`/`alt` `like` filter, `depth: 0`.
- **`search_catalog(collection, query, limit)`** → `{id, title}[]` for `products` or
  `categories`, locale-aware, `depth: 0`.

Contract rendering changes accordingly: `upload` fields describe as *"numeric media id —
call `search_media` to find one; omit to leave unset"*, and `relationship` fields as
*"numeric id — call `search_catalog`; never invent an id"*.

`loadRelationshipOptions` and `RELATIONSHIP_LIMIT` are **deleted**. This lifts the
118-product ceiling and removes ~4k tokens from every turn, at the cost of one extra
tool round-trip per binding — an acceptable trade given the turn budget increase in E.

### E. Richer snapshot and turn budget

`serializeLayout` currently emits only non-empty top-level strings. It gains:

- numbers, booleans, and enum values;
- array **counts** rather than contents — `items: 7 rows`, and critically `items: 0 rows`
  so an unfilled skeleton block is visible without a `read_block`;
- binding state for uploads/relationships — `image: #412` vs `image: unset`;
- unchanged 80-char truncation for long strings, and `read_block` remains the way to get
  full values.

`MAX_TURNS` rises from 16 to 28. The prompt mandates one structural edit at a time and
now adds `describe_block` / `search_*` lookups, so a ~10-block page exceeds 16 turns and
the loop currently stops mid-build with a half-finished page. `MAX_TOKENS` stays 8192.

## Data flow (unchanged spine, new leaves)

```
AssistantPanel ──POST──▶ route.ts
                          │  buildSystemPrompt(compact index)
                          │
                          ├─ model calls describe_block / search_media / search_catalog
                          │     └─▶ answered as `tool` messages, no mutation emitted
                          │
                          └─ model calls add_block / update_block / *_row / move / remove
                                └─▶ validateToolCall (now recursive)
                                    └─▶ applyDualMutation(working copies)
                                        ├─▶ stream `mutation` event ─▶ EditorShell state
                                        └─▶ echo post-mutation snapshot back to model
```

`describe_block`, `search_media`, and `search_catalog` join `read_block` as **read-only
tools**: answered server-side as `tool` messages, emitting no client mutation. That
existing branch in the route generalises from a single `read` case to a set.

## Error handling

- Unknown block/field/enum/id-type/bounds → corrective `tool` message; the model retries.
  Unchanged mechanism, now reaching nested paths.
- Row index out of range → `No row 4 in "items" (block 3 has 2 rows).`
- `search_media` / `search_catalog` failures are non-fatal: return an empty result with a
  note, matching today's behaviour where a failed relationship load degrades to
  "omit if unknown" rather than aborting the run.
- Turn budget exhausted: unchanged — the loop ends and whatever was applied stays applied,
  which the new undo stack in `EditorShell` can revert in one click.

## Testing

Existing suites: `app/api/page-builder/assistant/__tests__/route.test.ts` and
`lib/page-builder/__tests__/`. New coverage, all pure-function level except where noted:

**Contract rendering**
- should list every registered block in the compact index
- should omit injected `id` and `blockKey` fields at every depth
- should keep the whole system prompt under 5,000 tokens (≈20,000 chars), down from
  today's 7,642 — a regression guard against the index quietly re-expanding
- should describe nested array row shapes when `describe_block` is called
- should surface field conditions and `admin.description` in `describe_block` output

**Recursive validation**
- should reject an unknown field inside an array row
- should reject an out-of-range enum inside an array row
- should reject a non-integer relationship id inside an array row
- should reject a non-integer media id on an upload field
- should report the failing path for a nested error
- should coerce a Markdown `richText` value inside an array row to Lexical

**Row tools**
- should append a row to an existing array
- should insert a row at an explicit position
- should patch only the named fields of the target row
- should remove the row at the given index
- should return an error when the row index is out of range
- should keep row counts aligned across locales after add and remove
- should create rows without an `id` key

**Resource tools**
- should return matching media for a query
- should return recent media when the query is empty
- should return an empty result when the media lookup fails
- should find catalog entries beyond the previous 100-id limit

**Route integration** (mocked LLM, as today)
- should answer `describe_block` as a tool message without emitting a mutation
- should apply a row mutation to both locale working copies
- should continue past 16 turns up to the new budget

## Risks

- **Round-trip inflation.** Two-tier lookup plus resource search means more turns per
  build. Mitigated by the budget rise to 28 and by tool results persisting in history.
  If builds still truncate, the fallback is to pre-expand the handful of blocks the model
  uses most rather than raising the budget again.
- **Weaker models skipping `describe_block`.** A model that guesses instead of looking up
  gets a corrective error and retries, costing a turn. Acceptable; validation is the
  backstop, and the compact index names the fields so guesses are informed.
- **Row-tool locale desync.** Addressed by making `add_row`/`remove_row` structural
  (both locales) — this is a deliberate asymmetry with `update_row` and must be covered
  by the alignment tests above, since `EditorShell` already refuses to open the assistant
  on a misaligned page.
