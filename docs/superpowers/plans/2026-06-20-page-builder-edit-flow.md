# Page Builder Edit Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the visual page builder the primary edit surface — one-click blank-page creation that lands in the builder, list clicks that open the builder, a self-sufficient builder (title + publish), a stable post-creation slug, and an always-present seeded home page.

**Architecture:** The Pages list gets a custom "+ New page" button (creates a blank draft, redirects into `/build/[slug]`) and a custom title `Cell` linking each row to the builder. The old admin `layout` blocks editor + `livePreview` are hidden (the builder owns layout editing). The builder header gains inline title editing (autosaved through Payload's native REST `PATCH /api/pages/:id`) and an "Advanced settings" link back to the Payload doc form for slug/SEO. The `autoSlugFromTitle` hook is changed to preserve an existing slug so renaming never changes a live URL. A seed script guarantees a `home` page exists.

**Tech Stack:** Next.js 15 (App Router), Payload CMS 3.x (custom admin components, native REST), React client components, Vitest.

## Global Constraints

- Package manager is pnpm, but `pnpm <script>` fails via `runDepsStatusCheck`; invoke binaries directly: `node_modules/.bin/vitest`, `node_modules/.bin/tsc`.
- No database migration is required by this plan: hiding a field, removing `livePreview`, and inserting `pages` rows are all non-schema changes. Do **not** generate a migration.
- Payload `blocks` fields have no field-level `RowLabel`; this plan does not touch block labels.
- Admin-gated server routes use `isAuthorizedAdmin(payload, requestHeaders)` from `@/lib/page-builder/admin-guard` (same pattern as `app/api/page-builder/set-homepage/route.ts`).
- The builder URL and iframe preview `src` are keyed by `slug` (`/${locale}/build/${slug}` and `/${locale}/build/${slug}/preview`). Slug must stay stable while a page is being edited.
- `routing.defaultLocale` comes from `@/i18n/routing`.
- Existing `PageDoc` shape (`lib/page-builder.ts`): `{ id: string|number; title: string; slug: string; status: 'draft'|'published'; layout: PageBlock[]; meta?: {...}; updatedAt?: string }`.

---

### Task 1: Slug stability after creation

Make `autoSlugFromTitle` preserve a page's existing slug on update so renaming a page (e.g. from the builder) never changes its URL. The slug is generated only on create (empty slug) or when an explicit new slug is supplied in the admin form.

**Files:**
- Create: `lib/page-builder/slug.ts`
- Create: `lib/__tests__/page-builder-slug.test.ts`
- Modify: `src/payload/collections/Pages.ts:66-85` (the `autoSlugFromTitle` hook)

**Interfaces:**
- Produces: `shouldPreserveSlug(args: { operation: string; existingSlug: string; providedSlug: string }): boolean`

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/page-builder-slug.test.ts`:

```ts
// lib/__tests__/page-builder-slug.test.ts
import { describe, expect, it } from 'vitest';
import { shouldPreserveSlug } from '@/lib/page-builder/slug';

describe('shouldPreserveSlug', () => {
  it('should preserve the stored slug when updating without a provided slug', () => {
    expect(
      shouldPreserveSlug({ operation: 'update', existingSlug: 'about-us', providedSlug: '' }),
    ).toBe(true);
  });

  it('should not preserve when the admin supplies an explicit new slug', () => {
    expect(
      shouldPreserveSlug({ operation: 'update', existingSlug: 'about-us', providedSlug: 'about' }),
    ).toBe(false);
  });

  it('should not preserve on create so a slug is generated from the title', () => {
    expect(
      shouldPreserveSlug({ operation: 'create', existingSlug: '', providedSlug: '' }),
    ).toBe(false);
  });

  it('should not preserve when there is no existing slug to keep', () => {
    expect(
      shouldPreserveSlug({ operation: 'update', existingSlug: '', providedSlug: '' }),
    ).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node_modules/.bin/vitest run lib/__tests__/page-builder-slug.test.ts`
Expected: FAIL — cannot resolve `@/lib/page-builder/slug`.

- [ ] **Step 3: Write minimal implementation**

Create `lib/page-builder/slug.ts`:

```ts
// lib/page-builder/slug.ts — slug-stability decision for the Pages collection.
// A page's slug is generated once (on create, or when the admin types a new one).
// On a plain update (e.g. the builder autosaving title/layout) the stored slug is
// kept so the live builder URL and iframe preview never change mid-edit.
export function shouldPreserveSlug(args: {
  operation: string;
  existingSlug: string;
  providedSlug: string;
}): boolean {
  return args.operation === 'update' && args.existingSlug !== '' && args.providedSlug === '';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node_modules/.bin/vitest run lib/__tests__/page-builder-slug.test.ts`
Expected: PASS (4 passing).

- [ ] **Step 5: Wire the helper into the hook**

In `src/payload/collections/Pages.ts`, replace the existing `autoSlugFromTitle` hook (currently lines ~66-85) with:

```ts
const autoSlugFromTitle: CollectionBeforeChangeHook = async ({
  data,
  operation,
  originalDoc,
  req,
}) => {
  if (!data) return data;

  const existingSlug = typeof originalDoc?.slug === 'string' ? originalDoc.slug.trim() : '';
  const providedSlug = typeof data.slug === 'string' ? data.slug.trim() : '';

  // Keep the stored slug on a plain update so a live builder URL never moves.
  if (shouldPreserveSlug({ operation, existingSlug, providedSlug })) {
    data.slug = existingSlug;
    return data;
  }

  const slug = await resolveCollectionSlug(req.payload, 'pages', {
    title: typeof data.title === 'string' ? data.title : undefined,
    slug: typeof data.slug === 'string' ? data.slug : undefined,
    excludeId: operation === 'update' ? originalDoc?.id : undefined,
  });

  if (slug) {
    data.slug = slug;
  }

  return data;
};
```

Add the import near the top of `Pages.ts` (with the other `@/lib` imports):

```ts
import { shouldPreserveSlug } from '@/lib/page-builder/slug';
```

- [ ] **Step 6: Typecheck**

Run: `node_modules/.bin/tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add lib/page-builder/slug.ts lib/__tests__/page-builder-slug.test.ts src/payload/collections/Pages.ts
git commit -m "feat(page-builder): keep page slug stable after creation"
```

---

### Task 2: Blank-page create API route

Add an admin-gated route that creates a blank draft page and returns the builder href. Mirrors `app/api/page-builder/set-homepage/route.ts`.

**Files:**
- Create: `app/api/page-builder/create-page/route.ts`
- Create: `app/api/page-builder/__tests__/create-page.test.ts`

**Interfaces:**
- Consumes: `isAuthorizedAdmin(payload, headers)`, `routing.defaultLocale`.
- Produces: `POST /api/page-builder/create-page` → `200 { href: string }` for admins, `401` otherwise. Created doc: `{ title: 'Untitled', slug: <generated>, status: 'draft', layout: [] }`.

- [ ] **Step 1: Write the failing test**

Create `app/api/page-builder/__tests__/create-page.test.ts`:

```ts
// app/api/page-builder/__tests__/create-page.test.ts
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@payload-config', () => ({ default: {} }));
vi.mock('next/headers', () => ({ headers: vi.fn(async () => new Headers()) }));

const mockCreate = vi.fn();
const mockGetPayload = vi.fn();
const mockIsAuthorizedAdmin = vi.fn();

vi.mock('payload', () => ({ getPayload: (...a: unknown[]) => mockGetPayload(...a) }));
vi.mock('@/lib/page-builder/admin-guard', () => ({
  isAuthorizedAdmin: (...a: unknown[]) => mockIsAuthorizedAdmin(...a),
}));

import { POST } from '@/app/api/page-builder/create-page/route';

beforeEach(() => {
  mockCreate.mockReset();
  mockGetPayload.mockReset();
  mockIsAuthorizedAdmin.mockReset();
  mockGetPayload.mockResolvedValue({ create: mockCreate });
});

describe('POST /api/page-builder/create-page', () => {
  it('should create a blank draft page and return the builder href', async () => {
    mockIsAuthorizedAdmin.mockResolvedValue(true);
    mockCreate.mockResolvedValue({ id: 7, slug: 'untitled' });

    const res = await POST();

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ href: '/en/build/untitled' });
    const createArg = mockCreate.mock.calls[0]?.[0];
    expect(createArg.collection).toBe('pages');
    expect(createArg.data.title).toBe('Untitled');
    expect(createArg.data.status).toBe('draft');
    expect(createArg.data.layout).toEqual([]);
  });

  it('should return 401 when the caller is not an authorized admin', async () => {
    mockIsAuthorizedAdmin.mockResolvedValue(false);

    const res = await POST();

    expect(res.status).toBe(401);
    expect(mockCreate).not.toHaveBeenCalled();
  });
});
```

> Note: the href asserts `/en/build/untitled`; if `routing.defaultLocale` is not `en`, adjust the expected locale in both assertions to match `routing.defaultLocale`.

- [ ] **Step 2: Run test to verify it fails**

Run: `node_modules/.bin/vitest run app/api/page-builder/__tests__/create-page.test.ts`
Expected: FAIL — cannot resolve `@/app/api/page-builder/create-page/route`.

- [ ] **Step 3: Write minimal implementation**

Create `app/api/page-builder/create-page/route.ts`:

```ts
// app/api/page-builder/create-page/route.ts — create a blank draft page, return its builder href.
import config from '@payload-config';
import { headers as nextHeaders } from 'next/headers';
import { NextResponse } from 'next/server';
import { getPayload } from 'payload';
import { isAuthorizedAdmin } from '@/lib/page-builder/admin-guard';
import { routing } from '@/i18n/routing';

export async function POST(): Promise<Response> {
  const payload = await getPayload({ config });
  const requestHeaders = await nextHeaders();
  if (!(await isAuthorizedAdmin(payload, requestHeaders))) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const doc = await payload.create({
    collection: 'pages',
    data: {
      title: 'Untitled',
      status: 'draft',
      layout: [],
    },
  });

  const slug = typeof doc.slug === 'string' ? doc.slug : '';
  return NextResponse.json({ href: `/${routing.defaultLocale}/build/${slug}` });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node_modules/.bin/vitest run app/api/page-builder/__tests__/create-page.test.ts`
Expected: PASS (2 passing).

- [ ] **Step 5: Typecheck**

Run: `node_modules/.bin/tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add app/api/page-builder/create-page/route.ts app/api/page-builder/__tests__/create-page.test.ts
git commit -m "feat(page-builder): blank-page create route returning builder href"
```

---

### Task 3: "+ New page" button in the Pages list

A client component mounted above the Pages list table. It POSTs to the create route and redirects into the builder. UI glue — verified by typecheck + manual admin check (no unit test; this is framework-bound client glue, not business logic).

**Files:**
- Create: `src/payload/components/NewPageButton.tsx`
- Modify: `src/payload/collections/Pages.ts` (add `admin.components.beforeListTable`)

**Interfaces:**
- Consumes: `POST /api/page-builder/create-page` → `{ href }`.

- [ ] **Step 1: Create the component**

Create `src/payload/components/NewPageButton.tsx`:

```tsx
// src/payload/components/NewPageButton.tsx — list-view action: create a blank page, open the builder.
'use client';
import { useRouter } from 'next/navigation';
import { useState, type ReactElement } from 'react';

export function NewPageButton(): ReactElement {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const handleClick = async (): Promise<void> => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch('/api/page-builder/create-page', {
        method: 'POST',
        credentials: 'same-origin',
      });
      if (!res.ok) {
        setError(true);
        return;
      }
      const data = await res.json();
      if (typeof data?.href === 'string') {
        router.push(data.href);
        return;
      }
      setError(true);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 1rem' }}>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="btn btn--style-primary"
        style={{ display: 'inline-flex' }}
      >
        {loading ? 'Creating…' : '+ New page'}
      </button>
      {error && (
        <span style={{ fontSize: '0.8rem', color: 'var(--theme-error-500, #c0392b)' }}>
          Could not create page — try again.
        </span>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Wire it into the Pages list**

In `src/payload/collections/Pages.ts`, inside `admin.components`, add a `beforeListTable` entry alongside the existing `edit` block:

```ts
    components: {
      beforeListTable: ['@/src/payload/components/NewPageButton#NewPageButton'],
      edit: {
        beforeDocumentControls: ['@/src/payload/components/OpenBuilderButton#OpenBuilderButton'],
      },
    },
```

- [ ] **Step 3: Typecheck**

Run: `node_modules/.bin/tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/payload/components/NewPageButton.tsx src/payload/collections/Pages.ts
git commit -m "feat(page-builder): + New page button creates blank page and opens builder"
```

- [ ] **Step 5: Manual verification (note for reviewer)**

In the running app, open `/admin/collections/pages`, click **+ New page**, and confirm it lands in `/<locale>/build/<slug>` on a blank canvas. (Requires the dev server; see Task 8 final verification.)

---

### Task 4: Title cell links each row to the builder

Replace the default title-column link (which opens the old admin form) with a link into the builder. UI glue — verified by typecheck + manual check.

**Files:**
- Create: `src/payload/components/PageTitleCell.tsx`
- Modify: `src/payload/collections/Pages.ts` (add `admin.components.Cell` to the `title` field)

**Interfaces:**
- Consumes: Payload `DefaultServerCellComponentProps` (`cellData`, `rowData`).

- [ ] **Step 1: Create the cell component**

Create `src/payload/components/PageTitleCell.tsx`:

```tsx
// src/payload/components/PageTitleCell.tsx — Pages list title cell linking into the visual builder.
import Link from 'next/link';
import type { ReactElement } from 'react';
import { routing } from '@/i18n/routing';

type Props = {
  cellData?: unknown;
  rowData?: { slug?: unknown; title?: unknown };
};

export function PageTitleCell({ cellData, rowData }: Props): ReactElement {
  const title =
    typeof cellData === 'string' && cellData.length > 0
      ? cellData
      : typeof rowData?.title === 'string'
        ? rowData.title
        : 'Untitled';
  const slug = typeof rowData?.slug === 'string' ? rowData.slug : '';

  if (!slug) {
    return <span>{title}</span>;
  }

  return <Link href={`/${routing.defaultLocale}/build/${slug}`}>{title}</Link>;
}
```

- [ ] **Step 2: Wire the Cell onto the `title` field**

In `src/payload/collections/Pages.ts`, update the `title` field definition:

```ts
    {
      name: 'title',
      type: 'text',
      required: true,
      admin: {
        components: {
          Cell: '@/src/payload/components/PageTitleCell#PageTitleCell',
        },
      },
    },
```

- [ ] **Step 3: Typecheck**

Run: `node_modules/.bin/tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/payload/components/PageTitleCell.tsx src/payload/collections/Pages.ts
git commit -m "feat(page-builder): Pages list title links into the visual builder"
```

- [ ] **Step 5: Manual verification (note for reviewer)**

In `/admin/collections/pages`, click a page title and confirm it opens `/<locale>/build/<slug>` rather than the admin doc form.

---

### Task 5: Retire the old admin layout editor

Hide the `layout` blocks field from the admin form and drop `livePreview` so the builder is the only layout-editing surface. The field stays in the schema (the builder reads/writes it) — this is admin-only and needs no migration.

**Files:**
- Modify: `src/payload/collections/Pages.ts` (remove `admin.livePreview`; set `admin.hidden` on `layout`)

- [ ] **Step 1: Remove `livePreview`**

In `src/payload/collections/Pages.ts`, delete the entire `livePreview: { ... }` block from `admin` (currently lines ~116-133, the `url` function and `breakpoints` array). Also remove the now-unused `routing` import **only if** no other code in the file uses it — Task 3/4 do not add `routing` usage to this file, so after this task `routing` is unused here and its import (`import { routing } from '@/i18n/routing';`) should be removed to keep typecheck clean.

- [ ] **Step 2: Hide the `layout` field from the admin form**

Update the `layout` field definition:

```ts
    {
      name: 'layout',
      type: 'blocks',
      labels: { singular: 'Section', plural: 'Sections' },
      blocks: layoutBlocks,
      admin: {
        hidden: true,
        description: 'Edited in the visual builder.',
      },
    },
```

- [ ] **Step 3: Update the collection description**

Change the `admin.description` string to point at the builder:

```ts
    description:
      'Click a page title to edit it in the visual builder. Use “+ New page” to start a blank page.',
```

- [ ] **Step 4: Typecheck**

Run: `node_modules/.bin/tsc --noEmit`
Expected: no errors (confirms `routing` is no longer referenced in this file).

- [ ] **Step 5: Commit**

```bash
git add src/payload/collections/Pages.ts
git commit -m "refactor(page-builder): retire admin blocks editor in favor of visual builder"
```

---

### Task 6: Builder title editing + Advanced settings link

Add an inline editable title to the builder header (autosaved alongside layout via the native REST `PATCH /api/pages/:id`) and an "Advanced settings" link back to the Payload doc form for slug/SEO.

**Files:**
- Modify: `components/page-builder/use-autosave.ts`
- Modify: `components/page-builder/EditorShell.tsx`
- Modify: `lib/__tests__/` — extend autosave coverage (new test file `components/page-builder/__tests__/use-autosave.test.ts`)

**Interfaces:**
- Consumes: native REST `PATCH /api/pages/:id` (accepts `title`, `layout`, `status`; `title` is `required` so Payload rejects empty values with 400).
- Produces: `buildPatchBody(layout, status, title?)` — when `title` is a non-empty string it is included in the body; otherwise it is omitted.
- Produces: `useAutosave(pageId, layout, title)` — now also debounce-saves title changes.

- [ ] **Step 1: Write the failing test**

Create `components/page-builder/__tests__/use-autosave.test.ts`:

```ts
// components/page-builder/__tests__/use-autosave.test.ts
import { describe, expect, it } from 'vitest';
import { buildPatchBody } from '@/components/page-builder/use-autosave';

describe('buildPatchBody', () => {
  it('should include a non-empty title in the patch body', () => {
    expect(buildPatchBody([], 'draft', 'About Us')).toEqual({
      layout: [],
      status: 'draft',
      title: 'About Us',
    });
  });

  it('should omit the title when it is empty or whitespace', () => {
    expect(buildPatchBody([], 'draft', '   ')).toEqual({ layout: [], status: 'draft' });
  });

  it('should omit the title when not provided', () => {
    expect(buildPatchBody([], 'published')).toEqual({ layout: [], status: 'published' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node_modules/.bin/vitest run components/page-builder/__tests__/use-autosave.test.ts`
Expected: FAIL — `buildPatchBody` ignores the third argument (title) and the first assertion fails.

- [ ] **Step 3: Update `buildPatchBody` and the hook**

In `components/page-builder/use-autosave.ts`, replace `buildPatchBody`, `patchPage`'s body type, and `useAutosave`:

```ts
'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { PageBlock } from '@/lib/page-builder';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

type PatchBody = {
  layout: PageBlock[];
  status: 'draft' | 'published';
  title?: string;
};

export function buildPatchBody(
  layout: PageBlock[],
  status: 'draft' | 'published',
  title?: string,
): PatchBody {
  const trimmed = typeof title === 'string' ? title.trim() : '';
  return trimmed ? { layout, status, title: trimmed } : { layout, status };
}

async function patchPage(id: string | number, body: PatchBody): Promise<void> {
  const res = await fetch(`/api/pages/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Autosave failed: ${res.status}`);
}

export function useAutosave(pageId: string | number, layout: PageBlock[], title: string) {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstRun = useRef(true);

  // Debounced draft save whenever layout or title changes (skip the initial mount).
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    setStatus('saving');
    timer.current = setTimeout(() => {
      patchPage(pageId, buildPatchBody(layout, 'draft', title))
        .then(() => setStatus('saved'))
        .catch(() => setStatus('error'));
    }, 800);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [pageId, layout, title]);

  const publish = useCallback(async () => {
    setStatus('saving');
    try {
      await patchPage(pageId, buildPatchBody(layout, 'published', title));
      setStatus('saved');
    } catch {
      setStatus('error');
    }
  }, [pageId, layout, title]);

  return { status, publish };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node_modules/.bin/vitest run components/page-builder/__tests__/use-autosave.test.ts`
Expected: PASS (3 passing).

- [ ] **Step 5: Add inline title editing + Advanced link to EditorShell**

In `components/page-builder/EditorShell.tsx`:

Add a `title` state and pass it to `useAutosave`. Replace these two lines:

```ts
  const [layout, setLayout] = useState<PageBlock[]>(page.layout);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [addAt, setAddAt] = useState<number | null>(null);
  const { status, publish } = useAutosave(page.id, layout);
```

with:

```ts
  const [layout, setLayout] = useState<PageBlock[]>(page.layout);
  const [title, setTitle] = useState<string>(page.title);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [addAt, setAddAt] = useState<number | null>(null);
  const { status, publish } = useAutosave(page.id, layout, title);
```

Then replace the header's static title span:

```tsx
        <span className="font-semibold">{page.title}</span>
```

with an inline editable input + an Advanced settings link. Replace the whole `<header>…</header>` block with:

```tsx
      <header className="flex items-center gap-4 border-b border-warm-200 bg-white px-4 py-2">
        <a href="/admin/collections/pages" className="text-sm text-warm-500 hover:underline">← Back</a>
        <input
          aria-label="Page title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="min-w-0 flex-1 max-w-xs rounded border border-transparent bg-transparent px-2 py-1 font-semibold hover:border-warm-200 focus:border-warm-300 focus:outline-none"
        />
        <span className="rounded-full bg-warm-100 px-2 py-0.5 text-xs uppercase text-warm-500">{page.status}</span>
        <a
          href={`/admin/collections/pages/${page.id}`}
          className="text-xs text-warm-500 hover:underline"
        >
          Advanced settings
        </a>
        <span className="ml-auto text-xs text-warm-400">
          {status === 'saving' && 'Saving...'}
          {status === 'saved' && 'All changes saved'}
          {status === 'error' && 'Save failed -- retry'}
        </span>
        <button type="button" onClick={publish} className="rounded bg-warm-900 px-3 py-1 text-sm text-white">
          Publish
        </button>
      </header>
```

- [ ] **Step 6: Typecheck**

Run: `node_modules/.bin/tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add components/page-builder/use-autosave.ts components/page-builder/EditorShell.tsx components/page-builder/__tests__/use-autosave.test.ts
git commit -m "feat(page-builder): inline title editing and advanced-settings link in builder"
```

---

### Task 7: Home page seed

Guarantee a `home` page always exists so it appears in the Pages list and renders at storefront `/`. Idempotent function + CLI runner, modeled on `set-homepage`'s create-if-missing logic.

**Files:**
- Create: `scripts/seed-home-page.ts`
- Create: `scripts/__tests__/seed-home-page.test.ts`

**Interfaces:**
- Consumes: `buildHomeSeedLayout()` from `@/lib/page-builder/home-seed`.
- Produces: `ensureHomePage(payload: Pick<Payload, 'find' | 'create'>): Promise<'created' | 'exists'>`

- [ ] **Step 1: Write the failing test**

Create `scripts/__tests__/seed-home-page.test.ts`:

```ts
// scripts/__tests__/seed-home-page.test.ts
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/lib/page-builder/home-seed', () => ({ buildHomeSeedLayout: () => [] }));

import { ensureHomePage } from '@/scripts/seed-home-page';

const mockFind = vi.fn();
const mockCreate = vi.fn();

beforeEach(() => {
  mockFind.mockReset();
  mockCreate.mockReset();
});

describe('ensureHomePage', () => {
  it('should create the home page when none exists', async () => {
    mockFind.mockResolvedValue({ docs: [] });
    mockCreate.mockResolvedValue({ id: 1, slug: 'home' });

    const result = await ensureHomePage({ find: mockFind, create: mockCreate } as never);

    expect(result).toBe('created');
    const arg = mockCreate.mock.calls[0]?.[0];
    expect(arg.collection).toBe('pages');
    expect(arg.data.slug).toBe('home');
    expect(arg.data.title).toBe('Home');
  });

  it('should skip creation when the home page already exists', async () => {
    mockFind.mockResolvedValue({ docs: [{ id: 1, slug: 'home' }] });

    const result = await ensureHomePage({ find: mockFind, create: mockCreate } as never);

    expect(result).toBe('exists');
    expect(mockCreate).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node_modules/.bin/vitest run scripts/__tests__/seed-home-page.test.ts`
Expected: FAIL — cannot resolve `@/scripts/seed-home-page`.

- [ ] **Step 3: Write the implementation**

Create `scripts/seed-home-page.ts`:

```ts
// scripts/seed-home-page.ts — ensure a `home` page exists (idempotent). Run: tsx scripts/seed-home-page.ts
import type { Payload } from 'payload';
import { buildHomeSeedLayout } from '@/lib/page-builder/home-seed';

export async function ensureHomePage(
  payload: Pick<Payload, 'find' | 'create'>,
): Promise<'created' | 'exists'> {
  const existing = await payload.find({
    collection: 'pages',
    where: { slug: { equals: 'home' } },
    limit: 1,
    pagination: false,
  });

  if (existing.docs.length > 0) {
    return 'exists';
  }

  await payload.create({
    collection: 'pages',
    data: {
      title: 'Home',
      slug: 'home',
      status: 'draft',
      layout: buildHomeSeedLayout() as never,
    },
  });
  return 'created';
}

// CLI runner — only executes when invoked directly.
if (process.argv[1] && process.argv[1].includes('seed-home-page')) {
  void (async () => {
    const { getPayload } = await import('payload');
    const config = (await import('@payload-config')).default;
    const payload = await getPayload({ config });
    const result = await ensureHomePage(payload);
    // eslint-disable-next-line no-console
    console.log(result === 'created' ? 'Home page created.' : 'Home page already exists — skipped.');
    process.exit(0);
  })();
}
```

> Pattern check: confirm the import alias `@payload-config` and the `tsx scripts/...` invocation match a sibling script in `scripts/` (e.g. `scripts/seed-store-settings.ts`); copy that file's bootstrap style if it differs.

- [ ] **Step 4: Run test to verify it passes**

Run: `node_modules/.bin/vitest run scripts/__tests__/seed-home-page.test.ts`
Expected: PASS (2 passing).

- [ ] **Step 5: Typecheck**

Run: `node_modules/.bin/tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add scripts/seed-home-page.ts scripts/__tests__/seed-home-page.test.ts
git commit -m "feat(page-builder): idempotent home-page seed script"
```

---

### Task 8: Full-suite verification

Confirm the whole change set is green and the flow works end-to-end before review.

- [ ] **Step 1: Run the full test suite**

Run: `node_modules/.bin/vitest run`
Expected: all tests pass, including the four new files.

- [ ] **Step 2: Typecheck the project**

Run: `node_modules/.bin/tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Seed the home page**

Run: `node_modules/.bin/tsx scripts/seed-home-page.ts`
Expected: prints "Home page created." (first run) or "already exists — skipped."

- [ ] **Step 4: Manual end-to-end check (dev server required)**

Start the dev server (per the project's run skill / docker workflow), authenticated as an admin, then verify:
1. `/admin/collections/pages` shows a **+ New page** button and a **Home** row.
2. **+ New page** creates a blank page and lands in `/<locale>/build/<slug>`.
3. Editing the title in the builder header autosaves ("All changes saved") and does **not** change the URL slug.
4. Clicking a page title in the list opens the builder, not the admin form.
5. **Advanced settings** in the builder opens the Payload doc form for that page.
6. Storefront `/` renders the home page layout.

- [ ] **Step 5: Final commit (if any docs/notes changed)**

```bash
git add -A
git commit -m "chore(page-builder): verify edit-flow end-to-end" --allow-empty
```

---

## Self-Review

**Spec coverage:**
- Goal 1 (new blank page → builder): Tasks 2 + 3. ✅
- Goal 2 (list click → builder): Task 4. ✅
- Goal 3 (home always present + renders): Task 7 (+ existing storefront wiring). ✅
- Goal 4 (builder self-sufficient: title + publish + advanced link): Task 6. ✅
- Slug stability after creation (spec §4): Task 1. ✅
- Retire old admin blocks editor (spec §2): Task 5. ✅
- Non-goal respected (SEO/slug stay in admin form): Advanced-settings link, Task 6; no SEO UI built. ✅

**Placeholder scan:** No TBD/TODO; every code step shows full code; manual-verification steps are explicitly scoped and labeled. ✅

**Type consistency:** `buildPatchBody(layout, status, title?)` and `useAutosave(pageId, layout, title)` are defined in Task 6 and used consistently; `shouldPreserveSlug` signature matches between Task 1 implementation and hook usage; `ensureHomePage` signature matches test and CLI runner. ✅

**Migration note:** Verified no schema change — no migration task, consistent with Global Constraints. ✅
