# Editable Rich Text (Markdown) in the Custom Pagebuilder

**Date:** 2026-06-24
**Status:** Approved

## Goal

Make `richText` block fields editable inside the custom pagebuilder panel — starting with the FAQ `answer`, and covering the `RichText` block body and `ImageWithText` body in one shared code path.

## Problem

The custom pagebuilder's field panel (`components/page-builder/FieldRenderer.tsx`) handles `text`, `textarea`, `select`, `upload`, `array`, `number`, and `relationship` field types. A `richText` field falls through to the `default` branch, which renders a placeholder badge: *"richText field — editable in a later phase."*

Three blocks are affected:
- `FAQ` → `items[].answer` (`richText`, inside an array)
- `RichText` → `content` (`richText`)
- `ImageWithText` → `body` (`richText`)

The storefront already renders these correctly via `renderLexical` in `components/blocks/_primitives.tsx`. Only the **editing** side in the pagebuilder is missing. The stored value is native Lexical JSON, so the persistence path is unchanged — we just need an editor control that produces Lexical JSON.

## Approach

Add a `richText` case to `FieldRenderer` that renders a **Markdown textarea**. A new pure, dependency-free module converts between Markdown and native Lexical JSON entirely in the browser — no server round-trips, no `SanitizedServerEditorConfig`, no new packages. The committed block value stays native Lexical JSON (identical in shape to what Payload's own admin produces), so the storefront `renderLexical` path is untouched.

### Why Markdown over a WYSIWYG editor
- The `@payloadcms/richtext-lexical` editor is tied to Payload's admin `FieldBase` context and is brittle to embed standalone in the pagebuilder panel.
- A WYSIWYG toolbar (Tiptap) would add dependencies and a Tiptap→Lexical converter for more maintenance and a larger bundle — overkill for short FAQ answers.
- Markdown round-trips through native Lexical JSON via a tiny pure converter, renders perfectly on the storefront, and matches the pagebuilder's existing lightweight input pattern.

### Why a custom client converter over Payload's converters via an API route
- Payload's `convertMarkdownToLexical` / `convertLexicalToMarkdown` require a `SanitizedServerEditorConfig` (server-oriented). Exposing them means a new route, async round-trips, and loading/error states.
- A small, pure, dependency-free client converter gives instant editing, is trivially unit-testable with Vitest (matching the existing page-builder test suite), and has no runtime dependencies on Payload internals.
- Trade-off: the custom converter covers a Markdown subset only. Exotic nodes produced in Payload's full admin (tables, uploads, relationship embeds, blocks) won't round-trip perfectly to Markdown. FAQ answers won't contain these; unknown nodes degrade to their text content rather than throwing.

## Components

### 1. `lib/page-builder/lexical-markdown.ts` (new — pure, unit-tested)

A dependency-free module with two functions:

- `markdownToLexical(md: string): LexicalDoc`
  Parse a Markdown subset into a Lexical root document. Supports: paragraphs, `#`/`##`/`###` headings, `**bold**`, `*italic*`, `` `code` ``, `[text](url)` links, `-`/`*` bulleted lists, `1.` numbered lists, blank-line separation. Always returns a valid root doc (empty input → a single empty paragraph).

- `lexicalToMarkdown(doc: LexicalDoc | null | undefined): string`
  Walk the Lexical tree back to Markdown for the same subset. Unknown node types degrade to their text content. Never throws.

Parsing is intentionally minimal and line-based — not a full CommonMark parser. This is a documented limitation.

The Lexical document shape produced/consumed matches what `renderLexical` and Payload expect:
```ts
type LexicalDoc = { root: { type: 'root'; children: LexicalNode[] } };
type LexicalNode = { type: string; [k: string]: unknown };
```

### 2. `components/page-builder/RichTextField.tsx` (new — client component)

- Props: `value: unknown` (Lexical JSON | null), `disabled: boolean`, `onChange: (v: unknown) => void`.
- Seeds a local `md` string once from `lexicalToMarkdown(value)`.
- Renders a `<textarea rows={5}>` reusing the existing warm input classes, plus a one-line hint: *Markdown — **bold**, *italic*, [link](url), - lists*.
- Commits `onChange(markdownToLexical(md))` on every change, matching the existing `textarea` field pattern (which commits per keystroke via `set(e.target.value)`). `markdownToLexical` is a cheap pure function, so per-keystroke conversion is fine; a final commit also fires on blur to guarantee the last edit lands.

### 3. `components/page-builder/FieldRenderer.tsx` (modify)

- Add `case 'richText': return <RichTextField value={value} disabled={disabled} onChange={set} />;` inside the `Field` switch.
- The placeholder remains only for other genuinely-unsupported types.

### 4. `lib/page-builder/default-block.ts` (modify)

- In `defaultForField`, add `if (field.type === 'richText') return null;` so "Add FAQ item" produces an empty answer rather than falling through to `null` implicitly. `RichTextField` treats `null` as empty.

## Data Flow

- **Load:** stored Lexical JSON → `lexicalToMarkdown` → textarea. Synchronous, client-side.
- **Edit:** user types Markdown; held in local string state.
- **Commit:** `markdownToLexical(md)` → `onChange` → pagebuilder draft → autosave PATCHes the block exactly as today. The value is already Lexical JSON, so the persistence path is unchanged.
- **Storefront:** unchanged — `renderLexical` renders the Lexical JSON.

## Edge Cases / Error Handling

- `null` / `undefined` / non-object value → treated as empty string.
- Unknown Lexical nodes → text extraction, never throw (mirrors the previous `extractTextFromLexical` fallback philosophy).
- Empty textarea → empty paragraph doc (valid, renders nothing).
- Round-trip stability for the supported subset is enforced by tests.

## Testing (Vitest)

- `lib/__tests__/lexical-markdown.test.ts`: round-trip cases for paragraph, heading, bold/italic/code, link, bulleted list, numbered list, nested list, empty input, null input, unknown-node fallback.
- `components/page-builder/__tests__/FieldRenderer-richtext.test.tsx`: asserts a `richText` field renders a textarea (not the placeholder) and commits Lexical JSON on blur.

## Out of Scope

- No changes to storefront rendering, Payload schemas, or autosave.
- Markdown subset only (no tables, uploads, relationship embeds, horizontal rules) — documented limitation with a graceful fallback.
- The converter lives in `lib/` (not `components/`) so it is pure and unit-testable without React.
