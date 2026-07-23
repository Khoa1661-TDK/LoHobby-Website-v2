# Site-chrome visual editor — Footer, Logo & Shop name

**Date:** 2026-07-23
**Status:** Design — awaiting user review

## Goal

Bring footer customization, logo/favicon settings, and the shop name/identity into
the existing visual builder at `/build/header`, alongside the header that already
lives there. Present the three areas as **tabs** inside a SharePoint-style
**right slide-in settings panel** docked over a **live storefront preview**.

## Background — the existing pattern

`/build/header` is an admin-gated visual editor (`HeaderEditorShell`) that edits the
`site-header` global (announcement banner + nav tabs) through the page-builder
`FieldRenderer`, with schemas derived from the Payload field definitions via
`describeFieldsAsSchema`, autosaving over Payload REST
(`POST /admin/api/globals/{slug}`). The corresponding raw Payload admin fields are
marked `admin.hidden` so the visual editor is the single editing surface.

This design **extends that same pattern** to two more globals without changing how
the storefront reads its data.

## Scope (confirmed with user)

- **Header** — unchanged (announcement + nav tabs). Becomes one tab.
- **Footer** — everything the footer renders:
  - Link columns — `navigation.footerMenu` (heading + links, add/reorder/delete).
  - Brand blurb + credit — `store-settings`: `footerTagline`, `brandOrigin`,
    `footerDescription`, `footerCredit`, `footerShowNewsletter`.
  - Contact info — `store-settings`: `contactEmail`, `contactPhone`, `contactAddress`.
  - Social links — `store-settings`: `socialLinks` array.
- **Branding** — identity + SEO text — `store-settings`: `storeName`,
  `storeSubtitle`, `logo`, `logoDark`, `favicon`, `storeDescription`,
  `storeDescriptionShort`.

**Out of scope:** primary/secondary colors, font pairing, hero, live-chat, tax,
checkout fields — they stay in the Payload admin form.

## Non-goals / constraints

- The three chrome globals (`site-header`, `navigation`, `store-settings`) are
  **not localized**, so saves are single-write — no per-locale handling.
- No draft/publish state for globals: like today's header editor, edits autosave
  directly to the live global. This is intentional and drives the preview approach.
- No refactor of the shipped `Footer` / `Navbar` server components.

## Architecture

### Route & shell

`app/[locale]/build/header/page.tsx` keeps its route but is upgraded from the
header-only shell into a `SiteChromeEditorShell`:

```
┌────────────────────────────┬─────────────────┐
│  LIVE STOREFRONT (iframe)  │ [Header][Footer]│  ← tabs at panel top
│  ┌──────────────────────┐  │ [Branding]      │
│  │  navbar renders      │  │ ─────────────── │
│  │        …             │  │ FIELDS          │
│  │  footer renders      │  │  (FieldRenderer)│
│  └──────────────────────┘  │        [ Save ] │
└────────────────────────────┴─────────────────┘
```

- **Left (~65%):** `<iframe>` pointing at `/[locale]/build/header/preview`, which
  server-renders the real `<Navbar/>` + `<Footer/>`.
- **Right (~35%):** docked settings panel. Panel header holds the three tabs plus
  autosave status + Save button. A collapse toggle hides the panel to view the
  full-width preview (SharePoint-style dismissible panel).
- Active tab renders the relevant `FieldRenderer` panel(s).

### Live preview — Approach A (save + auto-refresh)

1. New route `app/[locale]/build/header/preview/page.tsx`:
   - Admin-gated (`isAuthorizedAdmin`), `dynamic = 'force-dynamic'`.
   - `setRequestLocale(locale)`, then renders `<Navbar/>` + `<Footer/>` wrapped in
     `<NextIntlClientProvider messages={…}>` and `<Providers branding={…}>` — the
     same wrapper set the existing block-preview page uses, so the storefront
     contexts the chrome depends on are present and SSR doesn't throw.
   - Reads live globals through the normal cached resolvers
     (`getStoreBranding`, `getFooterMenu`, `getSiteHeaderTabs`).
2. On each autosave success, the shell reloads the iframe
   (`iframe.contentWindow.location.reload()`, same-origin). Because the save's
   `afterChange` hook already fired `revalidateTag`, the reload re-renders with the
   new values. Debounce mirrors the header editor (~800ms).

Rejected alternative (B): refactor `Footer`/`Navbar` to accept optional props +
postMessage draft state for instant repaint. More code and regression risk for a
"feels instant" gain that a ~800ms save+reload already approximates. Since globals
are edited live anyway, save-then-refresh is the coherent model.

### Save routing — panel → global, with read-merge

Model the editor as **panels**, each bound to `(globalSlug, schema, values)` — the
header pattern generalized. Per tab:

| Tab      | Panel(s)                                   | Global          |
|----------|--------------------------------------------|-----------------|
| Header   | Announcement group; Nav tabs array         | `site-header`   |
| Footer   | Blurb+contact+social fields                | `store-settings`|
| Footer   | Link columns (`footerMenu`)                | `navigation`    |
| Branding | Identity + SEO fields                      | `store-settings`|

**Read-merge to avoid field wiping:** `store-settings` holds many fields outside
this editor's scope (colors, fonts, chat, tax…). A partial POST must not clobber
them. The page loads each **full** global doc server-side; the shell holds the full
current doc per touched global, merges the panel's edited fields into it, and POSTs
the **merged full document**. `site-header` and `navigation` are merged the same
way for consistency. A `saveChromeGlobal(slug, fullMergedDoc)` helper wraps the
REST call.

Note: the Footer tab touches two globals (`store-settings` + `navigation`); each
panel autosaves independently to its own global.

### Schema derivation (single source of truth)

Export the relevant field groups from the Payload configs so `describeFieldsAsSchema`
can drive `FieldRenderer` from the exact same definitions the CMS uses:

- `SiteHeader.ts` — already exports `announcementField`, `tabsField` (unchanged).
- `StoreSettings.ts` — extract the branding-identity fields, footer-blurb fields,
  contact fields, and `socialLinks` into named exported `Field[]` groups, then
  reference them inside the tabs (so the admin config and the builder share one
  definition).
- `Navigation.ts` — export the `footerMenu` field (via the existing
  `columnMenuField` factory) for reuse.

### Admin visibility

Mark the migrated fields `admin.hidden` in `StoreSettings` / `Navigation` so the
visual editor is the single editing surface (matching how the header fields are
already hidden). To avoid empty/confusing admin tabs, add a small `ui` field on
each affected admin tab with a note + link to `/build/header`.

## Files

**New**
- `components/page-builder/SiteChromeEditorShell.tsx` — tabbed right-panel shell,
  per-panel state, autosave, iframe refresh, collapse toggle.
- `app/[locale]/build/header/preview/page.tsx` — server-rendered chrome preview.
- `lib/page-builder/save-chrome.ts` — `saveChromeGlobal(slug, doc)` + merge helper.

**Modified**
- `app/[locale]/build/header/page.tsx` — load full `site-header`, `navigation`,
  `store-settings` docs; build schemas for all tabs; render `SiteChromeEditorShell`.
- `src/payload/globals/StoreSettings.ts` — extract/export field groups; mark
  migrated fields `admin.hidden`; add builder-link notes.
- `src/payload/globals/Navigation.ts` — export `footerMenu`; `admin.hidden` + note.
- `components/page-builder/HeaderEditorShell.tsx` — folded into the new shell (or
  kept as the Header-tab panel body).

**Not changed:** `Footer.tsx`, `Navbar`, `store-branding.ts`, the cached resolvers,
storefront rendering — data shapes and read paths are untouched.

## Testing

- `save-chrome` merge: given a full global doc + edited fields, the merged POST
  body preserves untouched fields (guards the store-settings wipe risk).
- Schema derivation: the exported `StoreSettings` / `Navigation` field groups
  produce the expected `BlockSchema` shape via `describeFieldsAsSchema`.
- Preview page smoke: renders without SSR throw with `Providers` +
  `NextIntlClientProvider` present. Mock `next-intl/server` per the known
  vitest constraint (`getTranslations` throws under vitest); footer uses it.
- Test files import `describe/it/expect` from `vitest` (tsc `--noEmit` constraint).
- Run the **full** vitest suite (i18n-adjacent change to a tested surface).

## Open decisions logged

- **DEC:** Preview approach A (save+refresh) over B (draft postMessage) — globals
  have no draft state, so live-save + reload is coherent and avoids refactoring
  shipped server components.
- **DEC:** Contact fields (`contactEmail/Phone/Address`) are also consumed at
  checkout. Only their **admin-form visibility** moves to the builder; the global
  field and every read path are unchanged, so checkout is unaffected.

## Effort

~2–3 focused sessions.
