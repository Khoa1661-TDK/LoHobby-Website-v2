# Page builder — HTML import, custom-HTML block, new blocks, shared icons

**Date:** 2026-07-25
**Status:** Design — awaiting user review

## Goal

Let the user design a page in Claude (or any tool that emits HTML), bring that HTML into
the page builder, and have the assistant rebuild it as a real CMS page — mapped to
editable blocks wherever a block fits, preserved verbatim as sanitized custom HTML
wherever none does.

Three supporting pieces make that possible: a `customHtml` block as the escape hatch,
six new block types so fewer sections fall through to HTML, and one shared icon registry
so blocks that should show an icon can.

Claude the product is **not** integrated anywhere. The HTML is user-supplied input, the
same way an attached screenshot is today.

## Background

`POST /api/page-builder/assistant` runs an admin-guarded streaming tool-use loop against
an OpenAI-compatible endpoint. The model may only use block types and fields from a
contract built by `buildSystemPrompt` (`lib/page-builder/assistant/tools.ts`) out of
`getBlockSchemas()`; every call is validated server-side in `validate.ts` and applied to
both locale layouts via `applyDualMutation`. Row-level tools (`add_row` / `update_row` /
`remove_row`) and resource lookup (`search_media` / `search_catalog`) already exist —
see `2026-07-25-page-builder-assistant-fidelity-design.md`.

Constraints this design has to respect, all verified in the codebase:

- **No sanitizer dependency exists.** `package.json` has no `sanitize-html`, `dompurify`,
  or HTML parser; `postcss` is present only transitively.
- **Tailwind purges classes it cannot see.** `tailwind.config.ts` uses content globs over
  source files. A utility class that exists only inside a database string produces no CSS.
  Imported HTML therefore cannot rely on Tailwind utilities to style itself.
- **Relationship and upload writes need native numeric ids.** `defaultIDType` is number;
  `String(id)` is rejected.
- **Every new block or field needs a generated migration**, or the storefront throws
  42P01 at runtime.
- **Localized blocks must have their block ids stripped before the second-locale save**,
  or Payload rejects with "Value must be unique: id".
- **Payload 3.84 blocks have no `admin.description`** and no field-level `RowLabel`; use
  each block's `admin.components.Label`.

## Non-goals

- Pixel-exact reproduction of arbitrary HTML. Imported sections that become blocks are
  restyled through the storefront theme.
- Executing imported JavaScript. Scripts are stripped, always.
- A visual drag-and-drop HTML editor. Custom HTML is edited as code.
- Changing the LLM provider. The assistant keeps using whatever OpenAI-compatible
  endpoint is configured.

---

## 1. `customHtml` block

The escape hatch, and a first-class block a human can add from the Add Section picker —
not only an import artifact.

### Schema — `src/payload/blocks/CustomHtml.ts`

| Field | Type | Localized | Notes |
|---|---|---|---|
| `html` | `code` (language `html`) | yes | The markup. Required. |
| `css` | `code` (language `css`) | no | Optional. Shared across locales — styling is not copy. |
| `label` | `text` | no | Editor-only name, shown by `admin.components.Label` so the layers rail reads "Custom HTML — Hero" rather than a bare slug. |
| …`appearanceFields` | group | — | Same background / width / spacing knobs every block carries. |

### Sanitizing — `lib/page-builder/sanitize-html.ts`

Runs **server-side at render**, not at save. Save-time-only sanitizing would leave
already-stored rows unprotected when the rules tighten.

**HTML** (via `sanitize-html`):

- Allowed tags: sectioning and text (`section div p h1`–`h6` `ul ol li a img span strong
  em blockquote figure figcaption picture source table thead tbody tr th td br hr`),
  plus inline `svg path circle rect g polyline polygon`.
- Allowed attributes: `class id style href src srcset sizes alt title width height
  loading decoding`, `viewBox d fill stroke stroke-width points cx cy r x y`, and any
  `data-*` / `aria-*` / `role`.
- Dropped unconditionally: `<script>`, `<iframe>`, `<object>`, `<embed>`, `<form>`,
  `<input>`, every `on*` handler, and any `href`/`src` whose scheme is not `https:`,
  `mailto:`, or root-relative.
- `style=""` attributes are kept but passed through the same declaration filter as the
  CSS block below.

**CSS** (via `postcss` + `postcss-selector-parser`):

- Every selector is prefixed with `[data-html-block="<blockId>"]`, so a rule can only
  match inside its own block.
- `@import` and any `url()` pointing off-origin are dropped; `@media`, `@supports`, and
  `@keyframes` are kept (keyframe names are namespaced with the block id to avoid
  collisions between two custom blocks on one page).
- `position: fixed` is rewritten to `absolute`; `expression()` and `behavior:` are
  dropped.

The sanitized output is memoised per `(blockId, html, css)` hash so a page with several
custom blocks does not re-parse on every request.

### Rendering — `components/blocks/CustomHtml.tsx`

```
<section data-html-block={id} className={appearanceClasses}>
  {css && <style>{sanitizedCss}</style>}
  <div dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />
</section>
```

Server component. Inherits the storefront's fonts, dark mode, and container widths
through the appearance group; is visible to crawlers; executes no JavaScript.

### Why scoped `<style>` is allowed

Without it the block is close to useless for its actual purpose. A design authored
elsewhere carries its own CSS, and Tailwind utilities in a database string are purged
(see Background). Stripping `<style>` would render an imported design as unstyled
markup — a failure with a non-obvious cause.

The risk is bounded: the block is reachable only behind `admin-guard.ts`, scripts are
stripped so CSS cannot become script, and selector prefixing keeps a rule from reaching
outside its own section. The residual risk is an admin writing CSS that looks bad, which
is the same risk as an admin writing bad copy.

**Dependencies added:** `sanitize-html`, `postcss-selector-parser`.

---

## 2. HTML import

### Why a deterministic pre-pass

A Claude artifact is routinely 30k–80k tokens. Pasting it into the assistant
conversation would consume the context window before any work happens, and re-send it on
every subsequent turn. The importer therefore reduces the document to a **section
digest** — roughly 200 tokens per section — and the model works from that, pulling raw
markup for one section at a time only when it decides to keep that section as HTML.

### `lib/page-builder/import-html.ts`

`parseImportDocument(html)` →

1. Parse with `sanitize-html`'s parser; drop `<head>`, `<script>`, comments.
2. Split on top-level `<section>` / `<main> > <div>` / `<header>` / `<footer>`
   boundaries. A document with no such structure is treated as one section.
3. For each section produce a `ImportSection`:

```ts
type ImportSection = {
  index: number;
  tag: string;
  classHint: string;        // first ~80 chars of class attrs, e.g. "hero grid-cols-2"
  headings: string[];       // h1–h6 text, in order
  paragraphs: string[];     // truncated to 200 chars each
  links: { text: string; href: string }[];
  images: { src: string; alt: string }[];
  repeatCount: number;      // count of sibling elements with identical class — card count
  colors: { background?: string; accent?: string };  // from inline style + matching CSS rules
  rawHtml: string;          // kept server-side, NOT sent to the model
  scopedCss: string;        // CSS rules whose selectors match inside this section
};
```

The document is held in the assistant's server-side working state for the conversation,
keyed by a `importId`, so `rawHtml` never enters the prompt.

### New assistant tools

| Tool | Purpose |
|---|---|
| `list_import_sections()` | Returns the digest for every section — everything above except `rawHtml` and `scopedCss`. Read-only. |
| `import_section(index, target)` | `target` is a block slug or `"html"`. For a block slug, the model must have called `describe_block` first and supplies the field values it derived. For `"html"`, the server inserts a `customHtml` block carrying that section's `rawHtml` + `scopedCss` — the model never handles the markup. |

`import_section` reuses `applyDualMutation`, so imported blocks land in both locales with
structure shared, exactly like `add_block`. The model supplies `fields` (active locale)
and optional `fieldsOther` (translation), as it already does.

System-prompt additions instruct: work sections in order; call `describe_block` before
targeting a block type for the first time; set both slots of a themed color pair from
`colors`; use `add_row` `repeatCount` times for array-driven blocks; fall back to
`"html"` rather than forcing a bad match.

### Images

Handled server-side inside `import_section`, not by the model:

1. For each `images[]` entry, resolve the URL against the document base.
2. Download (10s timeout, 8MB cap, content-type must be `image/*`).
3. Upload to the Payload `media` collection with `alt` carried over.
4. Substitute the returned **numeric** id into the block's upload field.

Failed downloads leave the field unset and are reported in the tool result so the model
can mention it. Bare external URLs are never written — they would fail `next/image`
under the configured `remotePatterns`, and relationship writes reject string ids.

### Entry point — `components/page-builder/ImportHtmlDialog.tsx`

An **Import HTML** action in `EditorShell`'s toolbar opens a dialog accepting a paste or
a `.html` file drop (2MB cap). On submit it `POST`s to
`app/api/page-builder/import/route.ts`, which parses, stores the working document, and
returns the digest summary. The dialog then opens `AssistantPanel` with a seeded first
message ("I've imported a 6-section HTML document; rebuild it as this page"), and the
assistant proceeds through its normal streaming loop.

Import is additive by default (append to the current layout) with a "replace current
page" checkbox. Replace is a normal layout mutation, so the editor's existing undo and
unsaved-changes handling covers it.

---

## 3. New block types

Six section shapes the current 37 blocks cannot express, chosen so that a typical
marketing/product page imports with few or no HTML fallbacks:

| Slug | Shape |
|---|---|
| `bentoGrid` | Mixed-size tile grid; rows carry span, title, text, image, link, icon. |
| `timeline` | Vertical or horizontal ordered steps with date, title, body, icon. |
| `comparisonTable` | Feature-by-plan matrix; column rows + feature rows with per-column boolean or text cells. |
| `teamGrid` | Person cards: photo, name, role, bio, social links. |
| `beforeAfter` | Two images with a draggable divider, plus captions. |
| `contactMap` | Address / hours / phone block beside an embedded static map image and a link out. |

Each is: `src/payload/blocks/<Name>.ts` (with `appearanceFields`, an `icon` field where
it makes sense, and `admin.components.Label`), `components/blocks/<Name>.tsx`, an entry
in `src/payload/blocks/index.ts` and `components/blocks/RenderBlocks.tsx`, a schema test
in the existing `lib/__tests__/page-builder-blocks.test.ts` pattern, and inclusion in the
phase's single migration.

They appear in the assistant's contract automatically — `buildBlockIndex` derives from
`getBlockSchemas()`, so no prompt edit is needed.

**Field-name collision check is mandatory.** A new field whose name matches one in
`appearanceFields` silently breaks the block (this has happened before — `LogoCloud`'s
`animate`). Only `payload generate:types` catches it; `tsc --noEmit` does not. Run it
per block.

---

## 4. Icons

### `lib/page-builder/icons.ts`

Supersedes `lib/page-builder/feature-icons.ts`. ~64 curated lucide names in four labelled
groups so the Payload select renders as grouped options and the assistant's contract
shows the model what each group is for:

- **commerce** — truck, package, box, tag, shopping-cart, credit-card, receipt, gift, …
- **trust** — shield, award, badge-check, lock, thumbs-up, star, heart, headphones, …
- **making** — printer, ruler, layers, wrench, palette, scissors, hammer, recycle, …
- **ui** — arrow-right, check, check-circle, clock, calendar, mail, phone, map-pin, …

Stays lucide-import-free so Payload schemas can import the option list without bundling
icons. `FEATURE_ICON_NAMES` and `FEATURE_ICON_OPTIONS` are re-exported from the new
module so `src/payload/blocks/FeatureGrid.ts` and `components/blocks/FeatureGrid.tsx`
keep working unchanged; `feature-icons.ts` becomes a two-line re-export shim.

### `components/blocks/_icon.tsx`

`<BlockIcon name size className />` with a **static** import map — `import { Truck, Shield, … } from 'lucide-react'`
and a literal `Record<IconName, LucideIcon>`. Static so both the bundler and Tailwind can
see every reference; a dynamic map would defeat tree-shaking and risk purged classes.
Unknown or absent names render nothing.

`FeatureGrid.tsx` drops its private `ICONS` map in favour of `BlockIcon`.

### Where the field is added

`steps` (per row), `stats` (per row), `cardGrid` (per row), `pricingTable` (per plan row),
`tabs` (per tab), `banner`, `callToAction`, `infoSection` (per column), plus the six new
blocks. Every column in one migration.

---

## 5. Sequencing

Four phases, each independently shippable, each with its own generated migration:

1. **Icons** — registry, `BlockIcon`, `icon` fields on eight existing blocks, migration.
   Smallest, no new surfaces, immediately useful to the existing assistant.
2. **New blocks** — six blocks, renderers, tests, migration.
3. **`customHtml`** — sanitizer, block, renderer, picker entry, migration.
4. **Importer** — parser, tools, route, dialog, image pipeline.

The importer is last because it wants the widest set of mapping targets; running it
before phases 1–3 would drop far more sections into HTML fallback than necessary.

## Testing

| Area | Tests |
|---|---|
| Sanitizer | XSS corpus (`<script>`, `onerror=`, `javascript:` href, `<style>` with `@import`, data-URI script); CSS scoping — a rule written as `body { display:none }` must not affect the page; keyframe-name namespacing; two custom blocks on one page must not bleed into each other. |
| Section splitter | Fixture HTML files → expected `ImportSection[]`; documents with no `<section>`; nested-section documents; `repeatCount` detection. |
| Import tools | `list_import_sections` returns no `rawHtml`; `import_section` with an invalid block slug is rejected; `import_section("html")` produces a `customHtml` block with the section's markup; both locales receive the block. |
| Image pipeline | Non-image content-type rejected; oversized rejected; failure leaves the field unset rather than writing a string URL; success writes a numeric id. |
| Block schemas | Each new block: required fields present, enum values match the renderer's switch, `appearanceFields` merged without name collision. |
| Icons | Every name in the registry resolves in `BlockIcon`; `FEATURE_ICON_NAMES` re-export is unchanged in content and order. |

Test files must `import { describe, expect, it } from 'vitest'` explicitly — `globals: true`
is runtime-only and `tsc --noEmit` fails without the import.

## Risks

| Risk | Mitigation |
|---|---|
| Sanitizer gap lets hostile markup through | Admin-only authoring surface; render-time sanitizing so rule changes apply retroactively; XSS corpus in tests. |
| Scoped CSS escapes its block | Selector prefixing verified by test; `position: fixed` rewritten. |
| Import maps a section to a wrong block | Every mutation is a normal layout edit — undoable in the editor; the model is instructed to prefer `"html"` over a forced match. |
| Import blows the context window | Deterministic digest keeps raw markup server-side; per-section token budget ~200. |
| New field name collides with `appearanceFields` | `payload generate:types` run per new block, before the migration. |
| Missing migration → 42P01 on the storefront | One migration per phase, generated and applied before the phase is called done. |
