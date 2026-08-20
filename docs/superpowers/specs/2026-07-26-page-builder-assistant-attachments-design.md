# Page-builder assistant — file attachments, image fidelity, provider swap

**Date:** 2026-07-26
**Status:** Design — awaiting user review

## Goal

Three independent improvements to the AI page-builder assistant:

1. Let the user attach **text files** (HTML/CSS/Markdown/plain), not just images, and
   drop an attached HTML file into the page **byte-identically** when that is what they
   want.
2. Make **"Build from image"** measure what it currently guesses, and let the model
   re-examine the reference mid-build.
3. Put a **provider boundary** behind the LLM call so Claude can be A/B'd against the
   current Gemini default on the same prompts.

## Background — how attachments work today

`AssistantPanel` (`components/page-builder/AssistantPanel.tsx`) accepts attachments
through a file picker, drag-drop, and paste. All three funnel into `addFiles`
(`AssistantPanel.tsx:198`), which filters against a single constant:

```ts
const ACCEPTED = /^image\/(png|jpeg|jpg|webp|gif)$/;   // AssistantPanel.tsx:44
```

Anything else is dropped silently — no attachment, no error. Accepted files are read
with `readAsDataUrl` into `Attachment = { id, dataUrl }` (`AssistantPanel.tsx:16`) and
posted as `images[]`. The server re-validates in `sanitizeImages` (`route.ts:99`),
which accepts only `data:image/*;base64` URLs under `MAX_IMAGE_BYTES`, capped at
`MAX_IMAGES = 4` (`route.ts:51-52`), and never throws — bad entries are dropped so one
malformed image cannot fail the request.

So a `.html` file cannot reach the assistant by any route. The supported workflow is to
open the file, copy its contents, and paste them as message text.

Separately, the block set already has a `customHtml` block (`src/payload/blocks/CustomHtml.ts`)
with a required localized `html` code field, a non-localized `css` code field, and
render-time sanitization (`components/blocks/CustomHtml.tsx`) that strips scripts,
iframes, forms, and event handlers. It is registered in `block-schemas.ts:43`, so the
assistant can already write it through the normal `add_block` path.

## Part A — Text-file attachments

### A1. Client

`Attachment` becomes a discriminated union:

```ts
type Attachment =
  | { kind: 'image'; id: string; dataUrl: string }
  | { kind: 'text'; id: string; name: string; mime: string; content: string };
```

Text files are read with `FileReader.readAsText`, not `readAsDataUrl`.

Two accept patterns and **two independent budgets**, because the constraints differ in
kind — an image costs a fixed vision-token price, whereas markup costs tokens
proportional to its length:

| | pattern | max count | max size |
|---|---|---|---|
| image | `^image/(png\|jpeg\|jpg\|webp\|gif)$` | 4 (unchanged) | 5 MB (unchanged) |
| text | `^text/(html\|css\|plain\|markdown)$` | 3 | 256 KB |

A 5 MB HTML file is roughly 1.5M tokens and would blow any context window, so the text
cap is deliberately ~20× smaller than the image cap rather than shared with it.

Browsers report `.md` inconsistently (often `text/markdown`, sometimes empty). Where
`file.type` is empty, fall back to matching the filename extension against
`.html/.htm/.css/.txt/.md` before rejecting.

Rejection stays silent-by-drop, consistent with the current behavior, **except** that a
file rejected purely for exceeding a cap surfaces a one-line inline notice — a dropped
256 KB file is otherwise indistinguishable from a broken feature.

### A2. Transcript persistence

`toSerializable` (`AssistantPanel.tsx:124`) already strips attached images from the
localStorage transcript. Text attachments are stripped the same way and replaced with a
filename marker (`[attached: hero.html]`), so reloading the panel shows what was sent
without carrying hundreds of KB in localStorage.

### A3. Server

New `sanitizeTextFiles(input: unknown)` mirroring `sanitizeImages`: same
never-throw/drop-bad-entries contract, validating `name` (basename only, no path
separators), `mime` against the allow-list, and `content` length against the cap.

Validated files are appended to the initial user message as fenced text parts:

````
Attached file: hero.html
```html
<full contents>
```
````

The request body gains `files?: unknown` alongside `images?: unknown`. The existing
"prompt OR image required" guard (`route.ts:140`) widens to accept a file-only request.

## Part B — Verbatim HTML insertion

### B1. The problem with the obvious design

A tool of the form `insert_html_block({ html, css, index })` requires the model to
**reproduce the entire file as tool-call arguments**. That is expensive (the file is
paid for twice — once read, once written), slow, and unreliable: models paraphrase long
verbatim spans. Faithfulness is the entire point of "drop this file in as-is", so a
design that cannot guarantee it fails the requirement.

### B2. Design — server-side splice by reference

```
insert_html_block({ attachmentName: string, index: number, label?: string })
```

The server already holds the exact file content for the duration of the request. The
tool call carries only a **reference**, and the server splices the stored bytes in
directly. Byte-identical by construction, and the tool call costs ~20 tokens regardless
of file size.

The model still chooses between this and building real blocks from the same file, which
is the "both, model decides" behavior requested. The system prompt gains guidance on the
tradeoff: prefer real blocks (themeable, localizable, editable in the visual editor);
use `insert_html_block` when the markup is bespoke enough that no block set matches, or
when the user explicitly asks for it as-is.

### B3. Splitting and validation

Server-side, before insertion:

- `<style>` contents are extracted into the block's `css` field; the remaining markup
  becomes `html`. This matters because `scopeBlockCss` (recent work — commits `33de2ab`,
  `5095319`) scopes the `css` field to the block, so styles left inline in `html` do not
  get scoped and can leak across the page.
- `<script>`, `<iframe>`, and event handlers are stripped at render time already, but
  the insert path reuses `lib/page-builder/sanitize-html.ts` so the stored value matches
  what will actually render — the editor should not show markup that silently vanishes.

**Known limitation:** the block's `html` field is localized and `css` is not. A verbatim
insert writes identical markup to both `vi` and `en`, so copy inside the file is not
translated. This is correct behavior for a verbatim insert and is called out in the
tool description so the model does not treat it as a translation path.

### B4. Wiring

New tool in `ASSISTANT_TOOLS` (`assistant/tools.ts`), a validation branch in
`assistant/validate.ts`, and a mutation kind in `assistant/apply.ts` /
`apply-dual.ts`. Per the existing dual-locale contract, an insert is a **structural**
edit and therefore affects both locales at once.

## Part C — Build from image

### C1. Gaps in the current path

The image is attached to the initial user message only (`route.ts:196`). The build then
runs up to `MAX_TURNS = 28` (`route.ts:39`), each turn echoing back a layout snapshot.
Prompt guidance is three bullets (`assistant/tools.ts:263-266`).

1. **The reference is seen once and never again.** By the sixth block the image is
   buried behind twenty layout echoes, and there is no mechanism to re-examine it. No
   verification pass compares the built page against the source.
2. **Colors are eyeballed.** `tools.ts:266` asks the model to "extract the dominant
   background and accent colors" from a raster by vision alone. This is the least
   reliable thing being asked of it and the one thing that can be computed exactly.
3. **No zoom.** The full screenshot is submitted at one resolution; fine detail (small
   type, spacing) is lost to downsampling before the model sees it.

### C2. Fixes, in value order

`sharp@^0.34.5` is already a dependency (`package.json:93`, installed) via Payload, so
both tools below cost no new dependency.

**`sample_colors({ imageIndex })`** — server-side decode, returns a real palette
(dominant background, accent candidates, per-region averages) as hex. Replaces the
weakest guess in the pipeline with a measurement. Read-only, changes nothing.

**`inspect_image({ imageIndex, region? })`** — returns the reference image again,
optionally cropped to a normalized `{x, y, w, h}` region, as a fresh image content part.
Lets the model check section 4 against actual pixels rather than its memory of them, and
recovers detail lost to whole-image downsampling. `sharp` performs the crop.

**Prompt strengthening** (`buildSystemPrompt`):

- A verification pass before the closing summary: re-inspect the reference, compare
  section order and count against the built layout, fix mismatches.
- An explicit `customHtml` fallback when a section has no plausible block match. Today
  the model must either force a bad match or drop the section; neither is stated as
  wrong, and both happen.

### C3. Note on provenance

These three fixes are inferred from reading the code path, not from reported symptoms —
the symptom question was skipped during design. They target mechanisms that are weak
regardless of which failure mode was observed, but if a specific symptom emerges that
none of them explains, this section should be revisited before building.

## Part D — Provider swappability

### D1. Boundary

Today `route.ts` is written directly against OpenAI chat-completions shapes: an `OpenAI`
client (`route.ts:149`), `ChatCompletionMessageParam` throughout, and `tool_calls` on
the response.

Introduce `lib/page-builder/assistant/provider.ts`:

```ts
type CompletionRequest = { system: string; messages: ChatMessage[]; tools: ToolSpec[]; maxTokens: number };
type CompletionChunk = { type: 'token'; text: string } | { type: 'tool_call'; id: string; name: string; args: unknown };

interface Provider { stream(req: CompletionRequest): AsyncIterable<CompletionChunk> }
```

Selected by `ASSISTANT_LLM_PROVIDER=openai|anthropic`, defaulting to `openai` so current
deployments are unaffected. The existing `ASSISTANT_LLM_BASE_URL` / `ASSISTANT_LLM_MODEL`
overrides keep working for the OpenAI path.

### D2. Anthropic adapter

Adds `@anthropic-ai/sdk`. Shape differences to absorb at the boundary:

- `system` is a top-level parameter, not a message with `role: 'system'`.
- Tool calls arrive as `tool_use` **content blocks**; results go back as `tool_result`
  blocks in a user turn, rather than the `tool_calls` / `role: 'tool'` pairing.
- Tool schemas use `input_schema` rather than `function.parameters`.
- Model default `claude-sonnet-5`; `max_tokens` stays at `MAX_TOKENS = 8192`.
- Requests stream (already the case), which also satisfies the SDK's guidance to stream
  rather than risk HTTP timeouts on long tool loops.

### D3. Why this is where the credit goes

The system prompt is derived from `getBlockSchemas()` and is **byte-identical across
every request and every turn**. A `cache_control` breakpoint on it makes each turn after
the first read that prefix at ~0.1× of input price. With `MAX_TURNS = 28`, a single page
build re-sends the full block contract up to 28 times, so caching the fixed prefix is a
larger cost lever than the per-token difference between model tiers.

This is the reason the recommendation is *not* to move to a cheaper tier. The workload is
a schema-constrained 28-turn tool loop where instruction adherence determines whether the
build converges; a weaker model spends more turns and more of the user's time. Reference
prices per MTok: Haiku 4.5 $1/$5, Sonnet 5 $3/$15 ($2/$10 introductory through
2026-08-31), Opus 5 $5/$25. Haiku 4.5 is additionally a poor fit here — 200K context
against a loop that echoes the full layout each turn, no `effort` parameter, and a
4096-token minimum cacheable prefix versus 1024 on Sonnet 5.

### D4. Scope boundary

This part delivers the *capability* to A/B, not a provider switch. The default stays
Gemini Flash. Choosing a winner is a follow-up decision informed by running both against
the improved prompts from Parts B and C.

## Sequencing

**A → B → C → D.**

- **A + B** are one coherent shipment and deliver the requested feature end to end.
- **C** is independent; it touches the prompt and adds two read-only tools.
- **D** is a refactor with no user-visible change on its own. Last, so that A/B/C are not
  built against a moving provider boundary, and so the A/B comparison runs against the
  improved prompts rather than the current ones.

## Testing

Following the existing `lib/__tests__/assistant-*.test.ts` pattern, and per the repo
rule that test files import `describe`/`it`/`expect` from `vitest` explicitly (`globals`
is runtime-only and `tsc --noEmit` fails without the imports):

- `sanitizeTextFiles` — accepts the allow-list, rejects oversize/wrong-mime/path-in-name,
  never throws on malformed input (mirrors the existing `sanitizeImages` coverage).
- Extension fallback when `file.type` is empty.
- `insert_html_block` — stored bytes reach the block unmodified; `<style>` lands in `css`
  and not `html`; both locales receive the markup; unknown `attachmentName` is a
  validation error, not a crash.
- `sample_colors` / `inspect_image` — region clamping, out-of-range `imageIndex`.
- Provider adapter — an identical `CompletionRequest` produces equivalent
  `CompletionChunk` sequences from a mocked OpenAI stream and a mocked Anthropic stream.

Because this touches route and server modules, the full vitest suite is run on any change
to a tested file (`getTranslations()` from `next-intl/server` throws under vitest and must
stay mocked).

## Out of scope

- Choosing a final provider/model (Part D delivers the comparison, not the verdict).
- Localizing copy inside a verbatim-inserted `customHtml` block (see B3).
- Widening attachments to PDF, DOCX, or archives.
- Any change to `scopeBlockCss` — the recent scoping work is consumed as-is.
