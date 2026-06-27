# AI Page-Builder Assistant — Design

**Date:** 2026-06-26
**Status:** Approved (design); pending implementation plan
**Author:** Khoa + Claude

## Goal

Add an LLM-powered assistant inside the visual page builder that lets a store
admin build and edit pages in natural language — both **scaffolding a whole
page from a prompt** ("a landing page for my 3D-printing shop with a hero,
featured products, and an FAQ") and **incrementally editing an existing page**
("make the hero dark", "add a testimonials section", "reorder these"). Every
one of the ~26 page-builder blocks must be reachable by the assistant, with no
per-block wiring as new blocks are added.

## Decisions (from brainstorming)

| Decision | Choice |
|---|---|
| Capability | Generate full pages **and** incremental edits |
| Surface | Chat side-panel **inside the visual editor** |
| Model | `claude-opus-4-8` (Anthropic API, server-side) |
| Apply model | Auto-apply to the **draft** layout; revert via undo |
| Sequencing | Phase 0 finishes + merges the visual editor first, then the assistant |

## Non-Goals

- No edits to the published page — draft only, until the existing publish action.
- No DB writes from model output — the model emits layout mutations, not Payload calls.
- Not a general chatbot — scope is page layout construction/editing.
- No per-keystroke streaming of layout to the model; a per-turn snapshot is sent.

---

## Architecture

```
EditorShell (client, visual builder root)
  ├─ layout state + dispatch  ← Phase 0 makes this mutable
  │     insertBlock / updateBlockField / moveBlock / deleteBlock / duplicateBlock
  ├─ Canvas + FieldRenderer   ← already exist
  └─ AssistantPanel (new)
        │  { prompt, layoutSnapshot, locale }
        ▼
  POST /api/page-builder/assistant   (new, server-only, admin-guarded, rate-limited)
        │  Anthropic SDK · claude-opus-4-8 · streaming · tool-use loop
        │  system prompt = serialized getBlockSchemas()  (the block contract)
        │  tools = add_block / update_block / move_block / remove_block / duplicate_block
        ▼
  streams tool calls → client validates + applies via layout-reducer → autosave → live canvas
```

Key principle: the LLM never touches Payload or the DB. It only emits **tool
calls describing layout mutations**. The client validates each against the block
schema and applies it through the existing **pure** reducer functions
(`lib/page-builder/layout-reducer.ts`). The assistant and a human editing by
hand therefore share exactly one mutation code path.

### Why tool-use over "return a JSON layout"

A single "return the whole layout as JSON" call is simpler but worse here:
incremental edits would force a full-page round-trip, partial output truncates
the whole page, and there's no natural place to validate per-block. The
agentic tool-use loop lets the model add/modify/move one block at a time, each
validated independently, each streamed to the canvas as it lands. The
manual-loop alternative (we drive the loop) is chosen over the SDK tool-runner
because we need to apply each tool result on the **client** (canvas mutation),
not execute it server-side.

---

## The tool surface

Five tools, one-to-one with the existing pure reducer functions:

| Tool | Args | Reducer |
|------|------|---------|
| `add_block` | `blockType`, `index`, `fields{}` | `insertBlock` |
| `update_block` | `index`, `fields{}` | `updateBlockField` (applied per field) |
| `move_block` | `from`, `to` | `moveBlock` |
| `remove_block` | `index` | `deleteBlock` |
| `duplicate_block` | `index` | `duplicateBlock` |

- The **system prompt embeds `getBlockSchemas()`** — every block's slug, label,
  fields, types, options/enums, defaults, and (where recoverable) conditions.
  This is the same serializable descriptor the editor panel already consumes, so
  the assistant's knowledge of available blocks **cannot drift** from the
  collection schema, and any block added later is automatically available.
- `add_block` / `update_block` use **`strict: true`** tool definitions so field
  payloads validate against JSON schema. Because each block has a different
  field set, the field payload is validated in a **second pass** client-side
  against the specific block's `BlockSchema` (the tool's static schema can only
  guarantee shape, not per-blockType field validity).
- Invalid blockType, unknown field, or bad enum → the tool call is rejected with
  an `is_error` tool-result; the model self-corrects in the loop.
- Indices refer to the layout snapshot sent that turn. The server echoes the
  running layout in the loop so multi-step edits target correctly.

### Layout snapshot

Each request sends a **compact** snapshot of the current layout: per block its
`index`, `blockType`, and a few identifying fields (e.g. heading/title) — not
full block content. Enough for the model to target indices; small enough to keep
tokens and latency reasonable. Serializer lives in a pure, unit-tested module.

---

## Apply model & UX

- Tool calls **auto-apply to the draft** as they stream — blocks appear and
  rearrange in the canvas live.
- A **per-turn snapshot** of `layout` is taken before each assistant turn,
  enabling a one-click **"undo last AI change"** that reverts an entire
  multi-block generation at once (independent of the editor's per-action undo).
- The panel shows the model's short natural-language summary alongside the
  streamed changes ("Added a hero, featured products, and an FAQ").
- Draft-only: the published page is untouched until the existing publish action.

---

## Safety, cost, observability

- **Admin-guarded**: reuse `lib/page-builder/admin-guard.ts` on the route.
- **Rate-limited**: extend the existing `middleware.ts` limiter to the route — it
  spends API tokens.
- `ANTHROPIC_API_KEY` is **server-only**, never `NEXT_PUBLIC_*`.
- Streaming response (SSE) so long generations don't hit HTTP timeouts; default
  `max_tokens` ~16000, adaptive thinking on.
- Structured logging of each request (no prompt content beyond what's needed):
  request_id, block-mutation count, token usage, duration.

---

## Testing (Vitest)

- **Tool→reducer mapping**: each tool's args produce the correct layout mutation
  (reducers are already pure — straightforward unit tests).
- **Schema validation**: unknown blockType / bad enum / unknown field → rejected
  with an error tool-result.
- **Layout snapshot serializer**: produces the compact shape; round-trips
  indices correctly.
- **Undo snapshot**: a multi-tool turn reverts to the pre-turn layout in one step.
- The Anthropic call is **mocked** — we test our translation layer, not the API.
- Unhappy paths (rejection, partial/aborted streams) covered at least as much as
  happy paths.

---

## Sequencing

### Phase 0 — Finish + merge the visual editor (prerequisite)
- Wire **mutable `layout` state + dispatch** into `EditorShell` (currently
  `const [layout] = useState(...)`, read-only).
- Connect the existing `layout-reducer` mutations and `use-autosave` to that
  state so manual editing persists to the draft.
- Merge the `worktree-page-builder-visual-editor-impl` branch to `main`
  (resolves the standing "push everything to main"). After merge, run
  `pnpm install` in main if the branch added deps.
- Acceptance: a human can add/move/edit/delete blocks in the canvas and the
  draft autosaves.

### Phase 1 — Assistant backend
- `POST /api/page-builder/assistant`: admin-guarded, rate-limited, streaming
  Anthropic tool-use loop; system prompt from `getBlockSchemas()`; five tools.
- Layout snapshot serializer.
- Acceptance: given a prompt + snapshot, the route streams valid tool calls that
  reference real blocks/fields; invalid calls are rejected and self-corrected.

### Phase 2 — Assistant panel + apply layer
- `AssistantPanel` in `EditorShell`; client applies streamed tool calls via the
  reducer; live canvas updates; per-turn undo; summary display.
- Acceptance: "build me a landing page for a 3D-printing shop" produces a
  multi-block draft live in the canvas; "make the hero dark" edits in place;
  "undo last AI change" reverts the turn.

---

## Open risks

- **Index drift** in long multi-step edits if the snapshot and applied state
  diverge — mitigated by echoing the running layout each loop turn and applying
  tool calls synchronously client-side before requesting the next.
- **Token cost** of embedding all 26 block schemas every request — mitigated by
  prompt caching the (stable) schema system prompt; only the per-turn snapshot
  and user message vary.
- **Localized blocks**: page builder supports localization; the assistant writes
  to the active locale only. Cross-locale generation is out of scope for v1.
