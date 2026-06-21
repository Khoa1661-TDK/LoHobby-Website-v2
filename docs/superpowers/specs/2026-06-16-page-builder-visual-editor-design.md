# Page Builder — Visual Canvas Editor (Design Spec)

Date: 2026-06-16
Status: Approved — ready for implementation planning

## Context

The Pages collection already has a working page builder (Tasks 1–12 of the 2026-06-05 page-builder workflow, all merged):

- 13 block types in `src/payload/blocks/*.ts` with wireframe thumbnails + descriptions in the block picker.
- `Pages` collection (`src/payload/collections/Pages.ts`) with a `blocks` layout field and draft/published status.
- Payload's native split-pane live preview (form fields left, storefront iframe right; mobile/tablet/desktop breakpoints; refresh-on-save).
- Draft-mode preview at `/api/preview`; storefront render at `/[locale]/pages/[slug]` (`app/[locale]/(storefront)/pages/[slug]/page.tsx`).
- Data layer in `lib/page-builder.ts`: `getPageBySlug`, `fetchPageBySlugDraft`, `getHomePage` (renders a Page with slug `home` if present, else the hardcoded homepage), and `revalidatePageCache`.

The current editing surface is Payload's admin form — functional but "bland." This spec defines a replacement editing surface only; it does not change block rendering, the data layer, or the storefront.

## Goal

Give admins a SharePoint-style **visual block builder**: a dedicated full-page canvas that renders the real storefront page, where you select a block to edit its fields in a side panel, add sections from a picker and see them appear in place, and reorder/duplicate/delete blocks directly — instead of filling out form fields in the Payload admin.

## Decisions Locked (during brainstorming)

- **Editing model: visual block builder (Model A).** Real blocks on a canvas; click a block → side panel with its fields. Not full inline-text editing (rich text edits in the panel, not on the canvas).
- **Architecture: fully custom canvas (#1).** A bespoke admin route, not an overlay on Payload's live preview. The user accepted that this is the larger, multi-session build; the tradeoff (re-implementing media picker + array editors, ongoing sync with block schemas) was flagged and accepted. Mitigations are baked into this design (schema-driven panel, reuse of Payload REST for media/saves).
- **Save model: autosave to draft + explicit Publish.** No manual "Save" button.
- **Reorder: drag-and-drop (dnd-kit) plus up/down buttons.**
- **Homepage is in scope** for this build.

## Architecture & Data Flow

### Route & entry point
- New admin-only route: `/[locale]/build/[slug]` (final path confirmed during planning to avoid clashing with Payload's `/admin`).
- Gated by verifying a **Payload admin session** via `payload.auth()` on the request cookies; non-admins redirect to the admin login. This is separate from the storefront NextAuth session.
- Entry points: an **"Open builder"** button on the Pages collection (list + edit views, via a custom Payload UI component); **new-page creation redirects** into the builder after the record is created. The standard Payload form remains available as a fallback for advanced fields (SEO meta, slug).

### The canvas
- A server component loads the page via the existing draft-aware fetch (`fetchPageBySlugDraft`) and renders the real blocks through the existing `RenderBlocks`.
- A client `EditorShell` wraps the render, holds the `layout` array in local state for instant feedback, and overlays editing affordances: selection outline, hover toolbar (up/down/duplicate/delete), drag handle, and "+ Add section" zones between blocks.

### Schema-driven field panel (key maintainability decision)
- One generic `FieldRenderer` reads each block's field definitions and renders inputs by `type`: `text` → input, `textarea` → textarea, `select` → dropdown, `upload` → media picker, `array` → repeatable add/remove/reorder list. Supports Payload `condition` (e.g. show "custom color" only when background = custom).
- The block field schemas already live in `src/payload/blocks/*.ts`. A serializable description of them is exposed to the client so the panel and the Payload collection cannot drift. Avoids hand-writing 13 separate forms.

### Media picker
- Custom picker UI over Payload's existing backend: browse via `GET /api/media`, upload via `POST /api/media`. Storage is not reinvented.

### Persistence & publishing
- **Autosave to draft:** debounced `PATCH /api/pages/:id` (Payload REST, authenticated by the admin cookie) writing `layout` + `status: draft`. Optimistic local state with a saving/saved indicator in the top bar.
- **Publish:** flips `status: published`, triggering the existing `revalidatePageCache(slug)` afterChange hook so the storefront updates.
- Reorder / add / duplicate / delete mutate the `layout` array and ride the same autosave path.

## Editor Screen Layout (approved mockup)
- **Top bar:** back, page title, device toggle (mobile/tablet/desktop), draft status pill with autosave indicator, Preview, Publish.
- **Center canvas:** real blocks; selected block outlined; hover shows up/down/duplicate/delete toolbar + drag handle; "+ Add section" between blocks.
- **Right panel:** selected block's fields — section-specific fields on top, a collapsible Appearance group (background/width/padding) below.
- **Add-section picker:** opens the existing 13 block thumbnails as a grid.

## Homepage Conversion
- `getHomePage()` already renders a Page with slug `home` through `RenderBlocks`, falling back to the hardcoded homepage. Conversion = create and publish a `home` page in the builder.
- **"Set as homepage"** action creates-or-opens the `home` page in the builder.
- **Seed from current homepage:** the `home` page starts pre-populated with a starting layout mirroring the existing homepage sections (Hero + Featured + Categories style) rather than blank.
- The hardcoded homepage fallback **stays** until the `home` page is published, so nothing breaks mid-build.
- **Two new block types** ("Personalized recommendations" and "Recently viewed") are added so the dynamic homepage sections become composable blocks. (Small scope addition.)

## Phasing (each phase independently shippable)
1. **Read-only canvas** — route, admin auth, render real blocks, selection + side panel showing fields read-only. Proves auth + schema-to-panel plumbing with no write risk.
2. **Editing** — wire the field panel to autosave (text/textarea/select first), draft/publish, save indicators.
3. **Structure ops** — add-section picker, delete/duplicate, drag-reorder.
4. **Media & arrays** — media picker and repeatable-array editor (the heavy fields).
5. **Homepage** — "Set as homepage," seed-from-current, the two new blocks.

## Testing
- Unit (Vitest): schema→panel field-description mapper; layout-mutation reducers (add/move/duplicate/delete); conditional-field visibility.
- Integration: autosave PATCH round-trips to Payload; publish flips status and revalidates.
- Manual/E2E checkpoint per phase against a real draft page.

## Known Limits / Risks (named up front)
- **Last-write-wins** autosave; no concurrent-edit locking. Acceptable for a small shop.
- The builder couples to Payload's REST shape (low risk within the same major version).
- Rich-text blocks edit in the panel, not inline on the canvas (consistent with Model A).

## Out of Scope
- Full inline-text/WYSIWYG editing directly on the canvas (Model B).
- Multi-admin concurrent editing / locking.
- Changes to block rendering, the storefront data layer, or the public routes.
