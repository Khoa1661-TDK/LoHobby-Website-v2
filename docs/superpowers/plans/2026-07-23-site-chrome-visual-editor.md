# Site-chrome Visual Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `/build/header` into a tabbed "Site chrome" visual editor — Header, Footer, and Branding (logo + shop name) tabs in a right slide-in panel over a live storefront preview.

**Architecture:** Reuse the existing header-editor pattern (schemas derived from Payload field defs via `describeFieldsAsSchema`, `FieldRenderer` panels, autosave over Payload REST). Extend it from one global (`site-header`) to three (`site-header`, `store-settings`, `navigation`). Preview = "save + auto-refresh": each autosave writes the full global doc, busts its cache tag, then the preview iframe reloads to re-render the real `Navbar` + `Footer`.

**Tech Stack:** Next.js 15 App Router (RSC), Payload CMS 3.x globals + REST, next-intl, Tailwind 4, Vitest.

## Global Constraints

- The three chrome globals (`site-header`, `navigation`, `store-settings`) are **NOT localized** — saves are single-write, no `?locale=` handling.
- Globals have **no draft/publish state** — autosave writes directly to the live global (matches today's header editor).
- Payload REST is mounted at **`/admin/api`** — global update is `POST /admin/api/globals/{slug}`.
- Payload `defaultIDType` is **number** — media/relationship writes need numeric ids. Load globals at **`depth: 0`** so upload fields are bare numeric ids, making the full-doc POST clean (no populated-object normalization).
- Editor state per global is the **full loaded doc**; autosave POSTs that full doc, so fields outside this editor's scope (colors, fonts, tax, chat, mobileMenu) are preserved.
- `describeField` only recurses into `array`/`group` fields — **NOT `row`**. Exported builder field arrays MUST be **flat** (no `row` wrappers); the admin config wraps subsets in rows for layout separately.
- `admin.hidden: true` on a field still makes it available to `describeFieldsAsSchema` (the header pattern relies on this) — hiding a field from the admin form does not remove it from the builder.
- Test files MUST `import { describe, it, expect, vi } from 'vitest'` (tsc `--noEmit` constraint — `globals: true` is runtime-only).
- Any change touching a surface that calls `next-intl/server` `getTranslations` (the footer does) requires running the **full** vitest suite; unit tests that render such surfaces must mock `next-intl/server`.

## File Structure

**New**
- `lib/page-builder/save-chrome.ts` — `stripSystemFields(doc)` (pure) + `saveChromeGlobal(slug, doc)` (REST POST).
- `lib/page-builder/__tests__/save-chrome.test.ts` — unit tests for `stripSystemFields`.
- `components/page-builder/SiteChromeEditorShell.tsx` — tabbed right-panel editor shell (state, autosave, iframe refresh, collapse).
- `app/[locale]/build/header/preview/page.tsx` — server-rendered `Navbar` + `Footer` preview surface.
- `src/payload/globals/__tests__/chrome-fields.test.ts` — asserts exported field groups' names + `admin.hidden`.

**Modified**
- `src/payload/globals/StoreSettings.ts` — extract + export flat builder field groups; mark migrated fields `admin.hidden`; add pointer `description` to affected admin tabs.
- `src/payload/globals/Navigation.ts` — export `footerMenuField`; mark `footerMenu` `admin.hidden`; add pointer description.
- `app/[locale]/build/header/page.tsx` — load 3 globals at depth 0, build all tab schemas, render `SiteChromeEditorShell`.

**Deleted**
- `components/page-builder/HeaderEditorShell.tsx` — fully subsumed by `SiteChromeEditorShell` (only importer is the header page).

**Not changed:** `components/layout/footer.tsx`, `components/layout/navbar/*`, `lib/store-branding.ts`, `lib/store-settings.ts`, `lib/navigation.ts`, storefront rendering. Data shapes and read paths are untouched.

---

### Task 1: Export flat builder field groups from StoreSettings + hide from admin

**Files:**
- Modify: `src/payload/globals/StoreSettings.ts`
- Test: `src/payload/globals/__tests__/chrome-fields.test.ts`

**Interfaces:**
- Produces:
  - `export const brandingIdentityFields: Field[]` — flat: `storeName`, `storeSubtitle`, `logo`, `logoDark`, `favicon`, `storeDescription`, `storeDescriptionShort`.
  - `export const footerContentFields: Field[]` — flat: `footerTagline`, `brandOrigin`, `footerDescription`, `footerCredit`, `footerShowNewsletter`, `contactEmail`, `contactPhone`, `contactAddress`, `socialLinks`.

- [ ] **Step 1: Write the failing test**

Create `src/payload/globals/__tests__/chrome-fields.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { brandingIdentityFields, footerContentFields } from '@/src/payload/globals/StoreSettings';

const names = (fields: { name?: string }[]) => fields.map((f) => f.name);
const isHidden = (f: { admin?: { hidden?: boolean } }) => f.admin?.hidden === true;

describe('StoreSettings chrome field groups', () => {
  it('should export branding identity fields flat (no row wrappers)', () => {
    expect(names(brandingIdentityFields)).toEqual([
      'storeName',
      'storeSubtitle',
      'logo',
      'logoDark',
      'favicon',
      'storeDescription',
      'storeDescriptionShort',
    ]);
  });

  it('should export footer content fields flat including contact and social', () => {
    expect(names(footerContentFields)).toEqual([
      'footerTagline',
      'brandOrigin',
      'footerDescription',
      'footerCredit',
      'footerShowNewsletter',
      'contactEmail',
      'contactPhone',
      'contactAddress',
      'socialLinks',
    ]);
  });

  it('should mark every exported chrome field admin.hidden', () => {
    for (const f of [...brandingIdentityFields, ...footerContentFields]) {
      expect(isHidden(f), `${f.name} should be admin.hidden`).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node_modules/.bin/vitest run src/payload/globals/__tests__/chrome-fields.test.ts`
Expected: FAIL — `brandingIdentityFields`/`footerContentFields` are not exported.

- [ ] **Step 3: Refactor StoreSettings.ts to extract + export the flat groups**

At the top of `src/payload/globals/StoreSettings.ts`, add `Field` to the type import and define the exported groups before `StoreSettings`:

```typescript
import type { Field, GlobalAfterChangeHook, GlobalConfig } from 'payload';
```

```typescript
// Flat field groups shared with the visual Site editor (/build/header). Exported so
// describeFieldsAsSchema can drive the page-builder FieldRenderer from these exact
// definitions (single source of truth). Kept FLAT — describeField does not recurse
// `row`, so the admin tabs below wrap subsets in rows for layout instead.
export const brandingIdentityFields: Field[] = [
  {
    name: 'storeName',
    type: 'text',
    label: 'Store name',
    admin: {
      hidden: true,
      description: 'Used in navbar, SEO, and hero when no custom hero title is set.',
    },
  },
  {
    name: 'storeSubtitle',
    type: 'text',
    label: 'Store subtitle',
    admin: {
      hidden: true,
      description: 'Optional line shown under the logo on marketing pages.',
    },
  },
  { name: 'logo', type: 'upload', relationTo: 'media', label: 'Logo', admin: { hidden: true } },
  {
    name: 'logoDark',
    type: 'upload',
    relationTo: 'media',
    label: 'Logo (dark mode)',
    admin: { hidden: true, description: 'Optional. Falls back to main logo with invert filter.' },
  },
  { name: 'favicon', type: 'upload', relationTo: 'media', label: 'Favicon', admin: { hidden: true } },
  {
    name: 'storeDescription',
    type: 'textarea',
    label: 'SEO description',
    admin: { hidden: true },
  },
  {
    name: 'storeDescriptionShort',
    type: 'text',
    label: 'Short description',
    admin: { hidden: true, description: 'PWA manifest, welcome toast, and compact UI.' },
  },
];

export const footerContentFields: Field[] = [
  { name: 'footerTagline', type: 'text', label: 'Footer tagline', admin: { hidden: true } },
  {
    name: 'brandOrigin',
    type: 'text',
    label: 'Origin / badge line',
    admin: { hidden: true, description: 'Small uppercase line in the footer (e.g. "Made in Vietnam").' },
  },
  {
    name: 'footerDescription',
    type: 'textarea',
    label: 'Footer description',
    admin: {
      hidden: true,
      description: 'Short blurb in the footer about column. Falls back to short store description.',
    },
  },
  {
    name: 'footerCredit',
    type: 'text',
    label: 'Footer credit line',
    admin: { hidden: true, description: 'Optional small print at the bottom (e.g. agency credit).' },
  },
  {
    name: 'footerShowNewsletter',
    type: 'checkbox',
    label: 'Show newsletter signup',
    defaultValue: true,
    admin: { hidden: true },
  },
  {
    name: 'contactEmail',
    type: 'email',
    label: 'Contact email',
    admin: { hidden: true },
  },
  {
    name: 'contactPhone',
    type: 'text',
    label: 'Contact phone',
    admin: { hidden: true },
  },
  {
    name: 'contactAddress',
    type: 'textarea',
    label: 'Contact / business address',
    admin: { hidden: true },
  },
  {
    name: 'socialLinks',
    type: 'array',
    label: 'Social profiles',
    admin: { hidden: true, description: 'Shown as icon links in the footer.' },
    fields: [
      { name: 'label', type: 'text', required: true, label: 'Platform' },
      { name: 'url', type: 'text', required: true, label: 'URL' },
    ],
  },
];
```

Now update the `fields` tabs to **reference these groups** instead of inlining them, and remove the now-duplicated inline definitions:

- **Logo tab** `fields`: replace the inline `storeName`/`storeSubtitle`/logo-row/`storeDescription`/`storeDescriptionShort` with:
  ```typescript
  {
    label: 'Logo',
    description: 'Store name, logo, favicon, and SEO text are edited in the visual Site editor (Build → Header → Branding).',
    fields: [
      brandingIdentityFields[0]!, // storeName
      brandingIdentityFields[1]!, // storeSubtitle
      {
        type: 'row',
        fields: [
          { ...brandingIdentityFields[2]!, admin: { ...brandingIdentityFields[2]!.admin, width: '33%' } },
          { ...brandingIdentityFields[3]!, admin: { ...brandingIdentityFields[3]!.admin, width: '33%' } },
          { ...brandingIdentityFields[4]!, admin: { ...brandingIdentityFields[4]!.admin, width: '33%' } },
        ],
      },
      brandingIdentityFields[5]!, // storeDescription
      brandingIdentityFields[6]!, // storeDescriptionShort
    ],
  },
  ```
- **Footer tab** `fields`: replace inline footer fields with the first five entries of `footerContentFields` and add a pointer description:
  ```typescript
  {
    label: 'Footer',
    description: 'Footer text is edited in the visual Site editor (Build → Header → Footer).',
    fields: footerContentFields.slice(0, 5),
  },
  ```
- **Social links tab** `fields`: replace inline `socialLinks` with the exported one:
  ```typescript
  {
    label: 'Social links',
    description: 'Social profiles are edited in the visual Site editor (Build → Header → Footer).',
    fields: [footerContentFields[8]!], // socialLinks
  },
  ```
- **Contact & checkout tab**: replace the inline contact `row` + `contactAddress` with references to the exported contact fields (wrap the two in a row for layout), keep `currencyCode`, `checkoutNote`, and the policy-URL row unchanged, and add a description:
  ```typescript
  {
    label: 'Contact & checkout',
    description: 'Email, phone, and address are edited in the visual Site editor (Build → Header → Footer); other fields remain here.',
    fields: [
      {
        type: 'row',
        fields: [
          { ...footerContentFields[5]!, admin: { ...footerContentFields[5]!.admin, width: '50%' } }, // contactEmail
          { ...footerContentFields[6]!, admin: { ...footerContentFields[6]!.admin, width: '50%' } }, // contactPhone
        ],
      },
      footerContentFields[7]!, // contactAddress
      // ...existing currencyCode, checkoutNote, returns/privacy row unchanged
    ],
  },
  ```

Leave the Primary color, Secondary color, Font, Hero banner, Live chat, and Tax tabs unchanged.

- [ ] **Step 4: Run test to verify it passes**

Run: `node_modules/.bin/vitest run src/payload/globals/__tests__/chrome-fields.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Verify Payload types still generate**

Run: `node_modules/.bin/payload generate:types`
Expected: completes without error; `git diff --stat src/payload-types.ts` shows no field removals (same fields, only admin metadata changed).

- [ ] **Step 6: Commit**

```bash
git add src/payload/globals/StoreSettings.ts src/payload/globals/__tests__/chrome-fields.test.ts
git commit -m "feat(page-builder): export StoreSettings chrome field groups for visual editor"
```

---

### Task 2: Export footerMenu field from Navigation + hide from admin

**Files:**
- Modify: `src/payload/globals/Navigation.ts`
- Test: `src/payload/globals/__tests__/chrome-fields.test.ts` (extend)

**Interfaces:**
- Consumes: nothing.
- Produces: `export const footerMenuField: Field` — the `footerMenu` array field (heading + links), `admin.hidden: true`.

- [ ] **Step 1: Extend the failing test**

Append to `src/payload/globals/__tests__/chrome-fields.test.ts`:

```typescript
import { footerMenuField } from '@/src/payload/globals/Navigation';

describe('Navigation footerMenu export', () => {
  it('should export footerMenu as a hidden array field with heading + links subfields', () => {
    expect(footerMenuField.name).toBe('footerMenu');
    expect(footerMenuField.type).toBe('array');
    expect(footerMenuField.admin?.hidden).toBe(true);
    const sub = 'fields' in footerMenuField ? footerMenuField.fields.map((f) => f.name) : [];
    expect(sub).toContain('heading');
    expect(sub).toContain('links');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node_modules/.bin/vitest run src/payload/globals/__tests__/chrome-fields.test.ts`
Expected: FAIL — `footerMenuField` not exported.

- [ ] **Step 3: Export footerMenuField and hide it in admin**

In `src/payload/globals/Navigation.ts`, add `Field` to the payload type import, then export the footer column field built by the existing factory and mark it hidden:

```typescript
import type { Field, GlobalAfterChangeHook, GlobalConfig } from 'payload';
```

```typescript
// Exported for the visual Site editor (Build → Header → Footer). Hidden from the admin
// form so the builder is the single editing surface; mobileMenu stays admin-editable.
export const footerMenuField: Field = {
  ...columnMenuField(
    'footerMenu',
    'Footer menu',
    'Link columns rendered in the storefront footer (e.g. Support, Policies).',
  ),
  admin: {
    hidden: true,
    initCollapsed: true,
    description: 'Footer link columns are edited in the visual Site editor (Build → Header → Footer).',
  },
};
```

In the global `fields`, replace the inline `columnMenuField('footerMenu', …)` call with `footerMenuField` and leave the `mobileMenu` column as-is:

```typescript
  fields: [
    footerMenuField,
    columnMenuField(
      'mobileMenu',
      'Mobile menu',
      'Link columns rendered in the slide-out mobile navigation drawer.',
    ),
  ],
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node_modules/.bin/vitest run src/payload/globals/__tests__/chrome-fields.test.ts`
Expected: PASS (4 describe blocks).

- [ ] **Step 5: Commit**

```bash
git add src/payload/globals/Navigation.ts src/payload/globals/__tests__/chrome-fields.test.ts
git commit -m "feat(page-builder): export Navigation footerMenu field for visual editor"
```

---

### Task 3: save-chrome helper (strip system fields + REST save)

**Files:**
- Create: `lib/page-builder/save-chrome.ts`
- Test: `lib/page-builder/__tests__/save-chrome.test.ts`

**Interfaces:**
- Produces:
  - `export function stripSystemFields(doc: Record<string, unknown>): Record<string, unknown>` — returns a copy without `id`, `createdAt`, `updatedAt`, `globalType`; every other key retained.
  - `export async function saveChromeGlobal(slug: string, doc: Record<string, unknown>): Promise<void>` — `POST /admin/api/globals/{slug}` with the stripped doc; throws on non-OK.

- [ ] **Step 1: Write the failing test**

Create `lib/page-builder/__tests__/save-chrome.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { stripSystemFields } from '@/lib/page-builder/save-chrome';

describe('stripSystemFields', () => {
  it('should drop payload system fields', () => {
    const out = stripSystemFields({
      id: 1,
      globalType: 'store-settings',
      createdAt: 'x',
      updatedAt: 'y',
      storeName: 'Shop',
    });
    expect(out).not.toHaveProperty('id');
    expect(out).not.toHaveProperty('globalType');
    expect(out).not.toHaveProperty('createdAt');
    expect(out).not.toHaveProperty('updatedAt');
  });

  it('should preserve every non-system field (untouched fields survive the round-trip)', () => {
    const out = stripSystemFields({
      id: 1,
      storeName: 'Shop',
      primaryColor: '#000',
      taxEnabled: true,
      socialLinks: [{ label: 'IG', url: 'https://x' }],
      footerShowNewsletter: false,
    });
    expect(out).toEqual({
      storeName: 'Shop',
      primaryColor: '#000',
      taxEnabled: true,
      socialLinks: [{ label: 'IG', url: 'https://x' }],
      footerShowNewsletter: false,
    });
  });

  it('should not mutate the input', () => {
    const input = { id: 1, storeName: 'Shop' };
    stripSystemFields(input);
    expect(input).toHaveProperty('id');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node_modules/.bin/vitest run lib/page-builder/__tests__/save-chrome.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement save-chrome.ts**

Create `lib/page-builder/save-chrome.ts`:

```typescript
// lib/page-builder/save-chrome.ts — persist a full chrome-global document from the
// visual Site editor. Globals have no draft state, so this writes the live doc directly
// (matching the header editor). Posting the FULL doc preserves fields outside the
// editor's scope; only Payload system fields are stripped.

const SYSTEM_FIELDS = new Set(['id', 'createdAt', 'updatedAt', 'globalType']);

/** Copy `doc` without Payload's read-only system fields. Everything else is retained,
 * so untouched fields survive the save. Does not mutate the input. */
export function stripSystemFields(doc: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(doc)) {
    if (!SYSTEM_FIELDS.has(key)) out[key] = value;
  }
  return out;
}

/** POST the full global doc to Payload REST (mounted at '/admin/api'). Admin-gated;
 * the session cookie rides along via same-origin credentials. */
export async function saveChromeGlobal(
  slug: string,
  doc: Record<string, unknown>,
): Promise<void> {
  const res = await fetch(`/admin/api/globals/${slug}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(stripSystemFields(doc)),
  });
  if (!res.ok) throw new Error(`Save failed for ${slug}: ${res.status}`);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node_modules/.bin/vitest run lib/page-builder/__tests__/save-chrome.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/page-builder/save-chrome.ts lib/page-builder/__tests__/save-chrome.test.ts
git commit -m "feat(page-builder): add save-chrome global persistence helper"
```

---

### Task 4: Live preview route (Navbar + Footer)

**Files:**
- Create: `app/[locale]/build/header/preview/page.tsx`

**Interfaces:**
- Consumes: `isAuthorizedAdmin(payload, headers)`, `getStoreBranding()`, `Navbar` (named), `Footer` (default), `Providers` (default, prop `branding`).
- Produces: a server-rendered surface at `/[locale]/build/header/preview` embedded by the shell iframe.

> **Testing note:** This page is composition over `getPayload` + RSC data fetching (no business logic), so per testing.md it is verified by typecheck + a dev-render check rather than a unit test. The logic-bearing units are covered in Tasks 1–3, 5.

- [ ] **Step 1: Implement the preview page**

Create `app/[locale]/build/header/preview/page.tsx`:

```tsx
// app/[locale]/build/header/preview/page.tsx — server-rendered chrome preview embedded
// by SiteChromeEditorShell via <iframe>. Renders the REAL storefront Navbar + Footer so
// the editor sees genuine output. On each autosave the shell reloads this iframe; the
// save busted the relevant cache tag, so the resolvers return fresh values.
import config from '@payload-config';
import { headers as nextHeaders } from 'next/headers';
import { redirect } from 'next/navigation';
import type { ReactElement } from 'react';
import { getPayload } from 'payload';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { isAuthorizedAdmin } from '@/lib/page-builder/admin-guard';
import { getStoreBranding } from '@/lib/store-branding';
import { type Locale } from '@/i18n/routing';
import { Navbar } from '@/components/layout/navbar';
import Footer from '@/components/layout/footer';
import Providers from '@/components/providers';

type Props = { params: Promise<{ locale: Locale }> };

export const dynamic = 'force-dynamic';

export default async function ChromePreviewPage(props: Props): Promise<ReactElement> {
  const { locale } = await props.params;
  setRequestLocale(locale);
  const payload = await getPayload({ config });
  const requestHeaders = await nextHeaders();

  const authorized = await isAuthorizedAdmin(payload, requestHeaders);
  if (!authorized) {
    redirect(`/admin/login?redirect=${encodeURIComponent(`/${locale}/build/header/preview`)}`);
  }

  // Navbar/Footer consume storefront contexts (session, branding, wishlist) and
  // next-intl translations; supply the same wrappers the storefront layout uses.
  const [branding, messages] = await Promise.all([getStoreBranding(), getMessages()]);

  return (
    <NextIntlClientProvider messages={messages}>
      <Providers branding={branding}>
        <div className="flex min-h-screen flex-col bg-white">
          <Navbar />
          <div className="flex flex-1 items-center justify-center px-6 py-24 text-center text-sm text-warm-400">
            Storefront content renders here. Edit the header and footer in the panel →
          </div>
          <Footer />
        </div>
      </Providers>
    </NextIntlClientProvider>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `node_modules/.bin/tsc --noEmit`
Expected: no errors from the new file.

- [ ] **Step 3: Dev-render check**

Start the dev server (or reuse a running one), sign in to `/admin`, then open `/en/build/header/preview`.
Expected: the real navbar renders at top, footer at bottom, no runtime error. (If unauthenticated, it redirects to `/admin/login` — expected.)

- [ ] **Step 4: Commit**

```bash
git add "app/[locale]/build/header/preview/page.tsx"
git commit -m "feat(page-builder): add live Navbar+Footer preview route for site editor"
```

---

### Task 5: SiteChromeEditorShell (tabbed right panel + autosave + iframe refresh)

**Files:**
- Create: `components/page-builder/SiteChromeEditorShell.tsx`

**Interfaces:**
- Consumes: `saveChromeGlobal(slug, doc)`; `FieldRenderer` (props `{ schema, values, onChange }`); `BlockSchema`.
- Produces (props consumed by Task 6):
  ```typescript
  export type ChromeGlobalSlug = 'site-header' | 'store-settings' | 'navigation';
  export type ChromePanel = {
    key: string;           // stable panel id, e.g. 'announcement'
    slug: ChromeGlobalSlug;
    schema: BlockSchema;
    // read the panel's editable object out of the global doc
    get: (doc: Record<string, unknown>) => Record<string, unknown>;
    // write a changed field back into the global doc, returning the new doc
    set: (doc: Record<string, unknown>, name: string, value: unknown) => Record<string, unknown>;
  };
  export type ChromeTab = { id: string; label: string; panels: ChromePanel[] };
  export type SiteChromeEditorProps = {
    locale: string;
    tabs: ChromeTab[];
    initialDocs: Record<ChromeGlobalSlug, Record<string, unknown>>;
  };
  export default function SiteChromeEditorShell(props: SiteChromeEditorProps): ReactElement;
  ```

- [ ] **Step 1: Implement the shell**

Create `components/page-builder/SiteChromeEditorShell.tsx`:

```tsx
// components/page-builder/SiteChromeEditorShell.tsx — SharePoint-style site-chrome editor.
// A live storefront preview iframe fills the surface; a dockable right panel holds
// Header / Footer / Branding tabs, each rendering page-builder FieldRenderer panels.
// State is one full doc per global; edits autosave the full doc to that global (globals
// have no draft state), then the iframe reloads to re-render the real chrome.
'use client';
import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';
import type { BlockSchema } from '@/lib/page-builder/block-schemas';
import { saveChromeGlobal } from '@/lib/page-builder/save-chrome';
import FieldRenderer from './FieldRenderer';

export type ChromeGlobalSlug = 'site-header' | 'store-settings' | 'navigation';

export type ChromePanel = {
  key: string;
  slug: ChromeGlobalSlug;
  schema: BlockSchema;
  get: (doc: Record<string, unknown>) => Record<string, unknown>;
  set: (doc: Record<string, unknown>, name: string, value: unknown) => Record<string, unknown>;
};

export type ChromeTab = { id: string; label: string; panels: ChromePanel[] };

export type SiteChromeEditorProps = {
  locale: string;
  tabs: ChromeTab[];
  initialDocs: Record<ChromeGlobalSlug, Record<string, unknown>>;
};

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export default function SiteChromeEditorShell({
  locale,
  tabs,
  initialDocs,
}: SiteChromeEditorProps): ReactElement {
  const [activeTab, setActiveTab] = useState(tabs[0]?.id ?? '');
  const [docs, setDocs] = useState(initialDocs);
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [panelOpen, setPanelOpen] = useState(true);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  // Hold the freshest docs for the debounced save closure without re-arming the timer.
  const docsRef = useRef(docs);
  docsRef.current = docs;

  const reloadPreview = useCallback(() => {
    // Same-origin iframe; re-fetch the server render (post-save, cache already busted).
    iframeRef.current?.contentWindow?.location.reload();
  }, []);

  const scheduleSave = useCallback(
    (slug: ChromeGlobalSlug) => {
      setStatus('saving');
      if (timers.current[slug]) clearTimeout(timers.current[slug]);
      timers.current[slug] = setTimeout(() => {
        saveChromeGlobal(slug, docsRef.current[slug])
          .then(() => {
            setStatus('saved');
            reloadPreview();
          })
          .catch(() => setStatus('error'));
      }, 800);
    },
    [reloadPreview],
  );

  useEffect(() => {
    const pending = timers.current;
    return () => {
      Object.values(pending).forEach(clearTimeout);
    };
  }, []);

  const onPanelChange = useCallback(
    (panel: ChromePanel, name: string, value: unknown) => {
      setDocs((prev) => ({ ...prev, [panel.slug]: panel.set(prev[panel.slug], name, value) }));
      scheduleSave(panel.slug);
    },
    [scheduleSave],
  );

  const current = tabs.find((t) => t.id === activeTab) ?? tabs[0];

  return (
    <div className="flex h-screen">
      {/* Live preview */}
      <div className="relative flex-1 bg-warm-100">
        <iframe
          ref={iframeRef}
          src={`/${locale}/build/header/preview`}
          title="Storefront preview"
          className="h-full w-full border-0"
        />
        {!panelOpen && (
          <button
            type="button"
            onClick={() => setPanelOpen(true)}
            className="absolute right-4 top-4 rounded bg-warm-900 px-3 py-1 text-sm text-white shadow"
          >
            Edit chrome
          </button>
        )}
      </div>

      {/* Right settings panel */}
      {panelOpen && (
        <aside className="flex w-[380px] shrink-0 flex-col border-l border-warm-200 bg-white">
          <header className="flex items-center gap-2 border-b border-warm-200 px-3 py-2">
            <a href="/admin" className="text-sm text-warm-500 hover:underline">
              ← Admin
            </a>
            <span className="ml-1 font-semibold text-warm-900">Site</span>
            <span className="ml-auto text-xs text-warm-400">
              {status === 'saving' && 'Saving…'}
              {status === 'saved' && 'All changes saved'}
              {status === 'error' && 'Save failed — retry'}
            </span>
            <button
              type="button"
              onClick={() => setPanelOpen(false)}
              aria-label="Hide panel"
              className="rounded px-2 text-warm-500 hover:bg-warm-100"
            >
              ✕
            </button>
          </header>

          {/* Tabs */}
          <nav className="flex border-b border-warm-200">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 px-3 py-2 text-sm font-medium ${
                  tab.id === activeTab
                    ? 'border-b-2 border-warm-900 text-warm-900'
                    : 'text-warm-500 hover:text-warm-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Active tab's panels */}
          <div className="flex-1 overflow-auto">
            {current?.panels.map((panel) => (
              <FieldRenderer
                key={panel.key}
                schema={panel.schema}
                values={panel.get(docs[panel.slug])}
                onChange={(name, value) => onPanelChange(panel, name, value)}
              />
            ))}
          </div>
        </aside>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `node_modules/.bin/tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/page-builder/SiteChromeEditorShell.tsx
git commit -m "feat(page-builder): add SiteChromeEditorShell tabbed editor with autosave"
```

---

### Task 6: Wire /build/header page to the new shell; remove HeaderEditorShell

**Files:**
- Modify: `app/[locale]/build/header/page.tsx`
- Delete: `components/page-builder/HeaderEditorShell.tsx`

**Interfaces:**
- Consumes: `describeFieldsAsSchema`, `announcementField`, `tabsField`, `brandingIdentityFields`, `footerContentFields`, `footerMenuField`, `SiteChromeEditorShell` + its `ChromeTab`/`ChromePanel` types.

- [ ] **Step 1: Rewrite the header page**

Replace the contents of `app/[locale]/build/header/page.tsx`:

```tsx
// app/[locale]/build/header/page.tsx — admin-gated visual Site editor: Header,
// Footer, and Branding tabs over a live storefront preview. Loads the three chrome
// globals at depth 0 (bare ids) so the shell can POST full docs cleanly.
import config from '@payload-config';
import { headers as nextHeaders } from 'next/headers';
import { redirect } from 'next/navigation';
import type { ReactElement } from 'react';
import type { Field } from 'payload';
import { getPayload } from 'payload';
import { isAuthorizedAdmin } from '@/lib/page-builder/admin-guard';
import { describeFieldsAsSchema } from '@/lib/page-builder/block-schemas';
import { announcementField, tabsField } from '@/src/payload/globals/SiteHeader';
import { brandingIdentityFields, footerContentFields } from '@/src/payload/globals/StoreSettings';
import { footerMenuField } from '@/src/payload/globals/Navigation';
import { type Locale } from '@/i18n/routing';
import SiteChromeEditorShell, {
  type ChromeGlobalSlug,
  type ChromeTab,
} from '@/components/page-builder/SiteChromeEditorShell';

type Props = { params: Promise<{ locale: Locale }> };

export const dynamic = 'force-dynamic';

const asRecord = (v: unknown): Record<string, unknown> =>
  v && typeof v === 'object' ? (v as Record<string, unknown>) : {};

export default async function SiteBuilderPage(props: Props): Promise<ReactElement> {
  const { locale } = await props.params;
  const payload = await getPayload({ config });
  const requestHeaders = await nextHeaders();

  const authorized = await isAuthorizedAdmin(payload, requestHeaders);
  if (!authorized) {
    redirect(`/admin/login?redirect=${encodeURIComponent(`/${locale}/build/header`)}`);
  }

  const [siteHeader, storeSettings, navigation] = await Promise.all([
    payload.findGlobal({ slug: 'site-header', depth: 0 }),
    payload.findGlobal({ slug: 'store-settings', depth: 0 }),
    payload.findGlobal({ slug: 'navigation', depth: 0 }),
  ]);

  const initialDocs: Record<ChromeGlobalSlug, Record<string, unknown>> = {
    'site-header': asRecord(siteHeader),
    'store-settings': asRecord(storeSettings),
    navigation: asRecord(navigation),
  };

  const announcementInner = 'fields' in announcementField ? (announcementField.fields as Field[]) : [];
  const announcementSchema = describeFieldsAsSchema('announcement', 'Announcement banner', announcementInner);
  const tabsSchema = describeFieldsAsSchema('tabs', 'Navigation tabs', [tabsField]);
  const brandingSchema = describeFieldsAsSchema('branding', 'Branding', brandingIdentityFields);
  const footerContentSchema = describeFieldsAsSchema('footerContent', 'Footer', footerContentFields);
  const footerMenuSchema = describeFieldsAsSchema('footerMenu', 'Footer links', [footerMenuField]);

  const tabs: ChromeTab[] = [
    {
      id: 'header',
      label: 'Header',
      panels: [
        {
          key: 'announcement',
          slug: 'site-header',
          schema: announcementSchema,
          get: (doc) => asRecord(doc.announcement),
          set: (doc, name, value) => ({
            ...doc,
            announcement: { ...asRecord(doc.announcement), [name]: value },
          }),
        },
        {
          key: 'tabs',
          slug: 'site-header',
          schema: tabsSchema,
          get: (doc) => ({ tabs: Array.isArray(doc.tabs) ? doc.tabs : [] }),
          set: (doc, _name, value) => ({ ...doc, tabs: value }),
        },
      ],
    },
    {
      id: 'footer',
      label: 'Footer',
      panels: [
        {
          key: 'footer-content',
          slug: 'store-settings',
          schema: footerContentSchema,
          get: (doc) => doc,
          set: (doc, name, value) => ({ ...doc, [name]: value }),
        },
        {
          key: 'footer-menu',
          slug: 'navigation',
          schema: footerMenuSchema,
          get: (doc) => ({ footerMenu: Array.isArray(doc.footerMenu) ? doc.footerMenu : [] }),
          set: (doc, _name, value) => ({ ...doc, footerMenu: value }),
        },
      ],
    },
    {
      id: 'branding',
      label: 'Branding',
      panels: [
        {
          key: 'branding-identity',
          slug: 'store-settings',
          schema: brandingSchema,
          get: (doc) => doc,
          set: (doc, name, value) => ({ ...doc, [name]: value }),
        },
      ],
    },
  ];

  return <SiteChromeEditorShell locale={locale} tabs={tabs} initialDocs={initialDocs} />;
}
```

> Note on the `tabs`/`footerMenu` panels: their `schema` is a single-field array schema, so `FieldRenderer` renders one `ArrayField` whose `onChange` reports `name = 'tabs'`/`'footerMenu'`. The `set` accessor ignores `name` and writes the array straight onto the doc.

> Note on the `store-settings` panels (footer-content + branding-identity): both use `get: (doc) => doc`, so `FieldRenderer` sees the whole doc but only renders the fields present in its own `schema`. Both edit the same `docs['store-settings']`, coexisting correctly.

- [ ] **Step 2: Delete the obsolete HeaderEditorShell**

```bash
git rm components/page-builder/HeaderEditorShell.tsx
```

Confirm no other importers:
Run: `grep -rn "HeaderEditorShell" app components lib`
Expected: no matches.

- [ ] **Step 3: Typecheck**

Run: `node_modules/.bin/tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Dev-render check**

Open `/en/build/header` signed in as admin.
Expected: live preview left, right panel with Header / Footer / Branding tabs. Editing the store name (Branding) shows "Saving…" → "All changes saved", and the preview reloads with the new name in navbar + footer. Footer tab edits to link columns and social links likewise reflect after save. Collapse (✕) hides the panel; "Edit chrome" restores it.

- [ ] **Step 5: Commit**

```bash
git add "app/[locale]/build/header/page.tsx"
git commit -m "feat(page-builder): wire Site editor to header/footer/branding globals"
```

---

### Task 7: Full verification + wrap-up

**Files:** none (verification only).

- [ ] **Step 1: Run the full test suite**

Run: `node_modules/.bin/vitest run`
Expected: all tests pass (footer uses `getTranslations`, so a full run guards the i18n surface).

- [ ] **Step 2: Typecheck the whole project**

Run: `node_modules/.bin/tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Regenerate Payload types (guard against schema drift)**

Run: `node_modules/.bin/payload generate:types`
Expected: no changes to `src/payload-types.ts` beyond what Task 1 already committed (no field additions/removals — only admin metadata changed, which does not affect generated types).

- [ ] **Step 4: Manual acceptance pass**

Signed in as admin at `/en/build/header`, verify each acceptance criterion:
- Branding tab: change store name, subtitle, pick a logo/favicon → navbar + footer update in preview after save.
- Footer tab: edit tagline/description/credit, toggle newsletter, add/reorder a footer link column, add a social link → footer preview updates after save.
- Header tab: announcement + nav tabs still edit and save as before.
- Confirm the Payload admin form: StoreSettings Logo/Footer/Social tabs show the pointer descriptions with fields hidden; Contact & checkout keeps currency/checkout-note/policy fields; Navigation still shows mobileMenu.
- Confirm the storefront (`/en`) renders the saved values in navbar + footer.

- [ ] **Step 5: Final commit (if any lint/format fixups)**

```bash
git add -A
git commit -m "chore(page-builder): finalize site-chrome visual editor" || echo "nothing to commit"
```

---

## Self-Review

**Spec coverage:**
- Editor surface = one "Site chrome" editor with Header/Footer/Branding tabs → Tasks 5, 6. ✅
- Right slide-in panel over live preview → Task 5 (panel + collapse) + Task 4 (preview). ✅
- Preview approach A (save + auto-refresh) → Task 5 `scheduleSave` → `reloadPreview`; cache busting via existing `afterChange` hooks on the globals. ✅
- Footer scope: link columns (`navigation`), blurb+credit, contact, social (`store-settings`) → Tasks 1, 2, 6. ✅
- Branding scope: identity + SEO text → Task 1 `brandingIdentityFields`, Task 6 branding tab. ✅
- Route kept at `/build/header` → Task 6 (no rename/redirect). ✅
- Read-merge / no field wiping → full-doc POST + `stripSystemFields` (Task 3) + depth-0 load (constraint). ✅
- `admin.hidden` + pointer notes on admin tabs → Tasks 1, 2 (tab `description`). ✅
- Testing: save-chrome + field-group exports unit tested; preview/shell verified via typecheck + dev render per testing.md; full vitest run for i18n surface → Task 7. ✅

**Placeholder scan:** No TBD/TODO; every code step shows complete code. ✅

**Type consistency:** `ChromeGlobalSlug`, `ChromePanel`, `ChromeTab`, `SiteChromeEditorProps` defined in Task 5 and consumed identically in Task 6. `stripSystemFields`/`saveChromeGlobal` signatures match between Task 3 and Task 5. `brandingIdentityFields`/`footerContentFields`/`footerMenuField` exports match between Tasks 1/2 and Task 6. ✅
