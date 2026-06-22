# Page-Builder Preview Responsiveness — Design

Date: 2026-06-22
Branch context: `main` (solo project, direct-to-main)

## Goal

Make the visual page-builder preview update **live** as the editor changes fields,
instead of the current multi-second lag. Presentational edits (headings, text,
colors, spacing) should reflect **instantly**; data-driven blocks should refresh in
~250ms rather than waiting on a full save + full-page server re-render.

## Background / Current State

The preview is an `<iframe src="/[locale]/build/[slug]/preview">` embedded by
`EditorShell`. The update path today is:

1. Field edit → `EditorShell.handleFieldChange` → `setLayout` (local state).
2. `useAutosave` debounces **800ms**, then `PATCH`es the whole page to Payload's
   REST API (a write to a **remote** Postgres). (`use-autosave.ts:53-68`)
3. Only on `status === 'saved'` does `EditorShell` post a `refresh` message.
   (`EditorShell.tsx:67-72`)
4. `PreviewBridge` runs `router.refresh()`. (`PreviewBridge.tsx:16`)
5. The preview page is `force-dynamic` (`preview/page.tsx:20`) and on every refresh
   re-runs: `getPayload()`, an admin auth check, a draft DB read, `getStoreBranding()`,
   `getMessages()`, then re-renders **every** block via `RenderBlocks` — including the
   async data blocks that fetch products.

Net latency per edit ≈ `800ms debounce + save round-trip + full dynamic SSR of all
blocks`. The whole page re-renders even for a one-character heading change, and the
remote DB is hit twice (save + re-read).

### Block classification (verified)

- **14 presentational blocks** — no server-only imports, render fine in the browser:
  Hero, Text, RichText, ImageWithText, Gallery, Testimonials, LogoCloud, Newsletter,
  FAQ, PromoBanner, VideoEmbed, Divider, Button, SocialBar.
- **4 async data blocks** — fetch from Payload, cannot render client-side from layout
  state alone: FeaturedCollection, FeaturedProducts, Recommendations, RecentlyViewed.

## Key Architectural Decision

Decouple the preview's source of truth from the save. The editor **pushes layout
state into the iframe over `postMessage`**; the iframe renders from that pushed state.
Autosave continues unchanged but purely for persistence — it is removed from the
visual critical path.

We do **not** attempt to render the 4 data blocks client-side. They render via a small
server endpoint that renders a single block on demand (the "hybrid" approach the user
chose over a skeleton variant and over a client-only/freeze-data-blocks variant).

## Design

### 1. `PreviewClient` — new client component inside the iframe

Replaces the server-only `PreviewCanvas` as the thing that renders blocks. It:

- Holds `blocks: PageBlock[]` in React state, **seeded from the initial server render**
  so first paint is correct and data blocks start with real HTML. The preview page
  (server) pre-renders each data block via `renderBlockToHtml` (§3) and passes the
  results to `PreviewClient` as `initialBlockHtml: Record<blockIndex, string>`, which
  `DataBlockSlot` uses for its first paint — no client fetch on initial load.
- Listens for `postMessage` (origin-checked, same as today): `setLayout` (replace
  block state), `highlight` (selection), `setTheme` (toggle `.dark`).
- Renders each block wrapped in the existing `PreviewBlockFrame` (click-to-select
  preserved), dispatching by type:
  - presentational block → rendered directly from a **client block map** (instant on
    state change, zero round-trip).
  - data block → `<DataBlockSlot>` (see §3).

`PreviewBridge`'s responsibilities (ready handshake, theme, message listening) fold
into `PreviewClient`. The `refresh` / `router.refresh()` message type is removed.

### 2. `clientBlockMap` — client-safe renderer for the 14 presentational blocks

A new module mapping the 14 presentational `blockType`s to their components, importable
from client code. We **cannot** reuse `components/blocks/RenderBlocks.tsx` for this:
it statically imports the 4 async server components, so pulling it into a client module
would drag those into the client bundle and break the build.

`RenderBlocks` stays unchanged and remains the server path — used for the storefront
and for the preview iframe's initial SSR paint. Consequence: block-type dispatch now
lives in two places (server `RenderBlocks` + `clientBlockMap`); adding a presentational
block means registering it in both. Documented as accepted maintenance cost.

### 3. `DataBlockSlot` + render endpoint — the 4 data blocks

- **`DataBlockSlot`** (client): on block-config change, debounce ~250ms, then `POST`
  the single block to the render endpoint and inject returned HTML via
  `dangerouslySetInnerHTML`. Keeps showing previous HTML while fetching (no flash; no
  skeleton — per chosen variant). Injected data blocks are **non-interactive** in the
  preview (acceptable: preview is for layout, not for clicking through). On first mount
  it uses the server-rendered initial HTML (passed as a prop from SSR) to avoid an
  initial fetch flash.
- **Endpoint `POST /api/build/preview-block`**: admin-auth-guarded (reuses
  `isAuthorizedAdmin`). Body `{ locale, block }`. Renders the single block wrapped in
  `NextIntlClientProvider` + `Providers` to an HTML string via `react-dom/server`'s
  `renderToReadableStream` (supports async/Suspense components), and returns it.

  **Risk + fallback:** `renderToReadableStream` inside a route handler is the one
  genuinely uncertain piece. Build it first. If it proves unworkable, fall back to a
  GET page route that reads the just-saved draft from the DB — this re-couples
  data-block refresh to save (~500ms instead of ~250ms) but only for the 4 data blocks.
  The fallback is documented, not built up front.

- **Shared render helper `renderBlockToHtml(block, locale)`**: a server function that
  wraps a single block in `NextIntlClientProvider` + `Providers` and renders it to an
  HTML string. Used by **both** the endpoint above **and** the preview page's SSR
  (§1, initial-HTML seeding). One implementation, two callers.

### 4. `EditorShell` changes

- On **every** `layout` change, immediately `post(setLayout(layout))` to the iframe —
  **no debounce on the message** (this is what makes presentational edits feel live).
- `useAutosave` is unchanged but **decoupled**: its `saved` status no longer triggers a
  preview refresh. The `pendingRefresh` plumbing and the refresh-on-saved effect
  (`EditorShell.tsx:67-72`) are removed.
- Selection / highlight / theme messaging unchanged.

### 5. Retired code

- `EditorShell.tsx:67-72` refresh-on-saved effect + `pendingRefresh` ref.
- `refresh` message type and `router.refresh()` handling in `PreviewBridge`.
- `PreviewCanvas` server component is superseded by SSR-from-`PreviewClient`'s initial
  render (the preview page renders `PreviewClient` with the initial layout + initial
  data-block HTML).

## Message Protocol (`lib/page-builder/preview-messages.ts`)

Existing: `highlight`, `setTheme`, `refresh`, `ready`, `select`. Changes:

- **Add** `setLayout(blocks)` (parent → preview).
- **Remove** `refresh` (no longer used).
- Keep `highlight`, `setTheme`, `ready`, `select`.

## Data Flow (after change)

```
edit presentational field
  EditorShell.setLayout -> post(setLayout) -> PreviewClient state -> repaint   (instant)
  (separately) useAutosave debounce 800ms -> PATCH (background persistence)

edit data-block field
  EditorShell.setLayout -> post(setLayout) -> PreviewClient state
    -> DataBlockSlot debounce 250ms -> POST /api/build/preview-block -> inject HTML
  (separately) useAutosave -> PATCH (background)
```

## Testing

- `preview-messages` unit tests: add `setLayout` guard coverage, drop `refresh`.
- `clientBlockMap`: every presentational `blockType` resolves to a component; unknown
  type returns null.
- `DataBlockSlot`: debounces, posts the block, injects HTML, retains previous HTML
  while in flight (mock fetch).
- Endpoint: returns HTML for a data block; rejects unauthenticated requests.
- Manual: edit text → instant; edit featured-products title → ~250ms swap; confirm
  save still persists (reload shows changes).

## Out of Scope

- Optimistic skeletons for data blocks (rejected variant).
- Making data blocks interactive in the preview.
- Changing autosave debounce/timing or the storefront `RenderBlocks` path.
