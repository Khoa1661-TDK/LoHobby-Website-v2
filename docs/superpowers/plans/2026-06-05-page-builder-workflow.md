# Page Builder Workflow Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver one self-explanatory storefront page builder — consolidated onto the `pages` collection — with recognizable block thumbnails, a live side-by-side preview, and workflow-clarity touches.

**Architecture:** Retire the duplicate `content-pages` system, moving the full `pages` builder onto the `/pages/[slug]` route (with a permanent redirect from the old `/p/[slug]`). Add native Payload block-picker thumbnails (SVG wireframes) and a server-side `admin.livePreview` panel backed by Next.js draft-mode route handlers and `@payloadcms/live-preview-react`'s `<RefreshRouteOnSave>` for near-real-time refresh without rewriting the server-rendered blocks.

**Tech Stack:** Next.js 15 (App Router, `[locale]` segment via next-intl), Payload CMS 3.84.x (Postgres adapter, Lexical editor), TypeScript (strict), Vitest, pnpm.

---

## Context the executor needs

- **Routes live under `app/[locale]/(storefront)/`.** Page params are `{ locale: string; slug: string }`. Locales are `vi` (default) and `en` (`i18n/routing.ts`), `localePrefix: 'always'` — real URLs are `/vi/pages/foo`, `/en/pages/foo`.
- **Current (to be swapped):** `/p/[slug]` renders the `pages` collection via `components/blocks/RenderBlocks.tsx`; `/pages/[slug]` renders the lightweight `content-pages` collection. After this work, `pages` owns `/pages/[slug]` and `content-pages` is gone.
- **Homepage is unaffected:** `app/[locale]/(storefront)/page.tsx` calls `getHomePage()` → `getPageBySlug('home')`, which is route-independent.
- **Tests:** Vitest `include` is `lib/__tests__/**/*.test.ts` only (`vitest.config.ts`). All test files MUST live in `lib/__tests__/` even when they import code from `scripts/` or `app/`. Setup file mocks `server-only`. Payload-touching tests mock modules like this:
  ```ts
  vi.mock('@payload-config', () => ({ default: {} }));
  vi.mock('payload', () => ({ getPayload: vi.fn() }));
  vi.mock('next/cache', () => ({ unstable_cache: (fn: unknown) => fn, revalidateTag: vi.fn(), revalidatePath: vi.fn() }));
  ```
- **Run tests:** `pnpm vitest run <path>` (or `npx vitest run`). **Typecheck:** `pnpm tsc --noEmit` (script may be `pnpm typecheck` — check `package.json`). **Scripts run via tsx:** `pnpm tsx scripts/<file>.ts`.
- **`livePreview.url` is a server-only Payload property** (verified in `node_modules/payload/dist/config/types.d.ts` — `ServerOnlyLivePreviewProperties`). It runs on the server, so reading `process.env.PREVIEW_SECRET` inside it is safe and never ships to the client bundle.
- **Block slugs** (lowercase, in `pages.layout`): `hero, featuredCollection, featuredProducts, richText, imageWithText, gallery, testimonials, logoCloud, newsletter, faq, promoBanner, videoEmbed, divider`.

---

## File Structure

**New files:**
- `lib/content-pages-migration.ts` — pure mapping helpers (content-pages block → pages block, plain-text → Lexical).
- `lib/preview.ts` — `isValidPreviewToken` pure helper.
- `scripts/migrate-content-pages.ts` — one-time data migration runner.
- `app/api/preview/route.ts`, `app/api/exit-preview/route.ts` — draft-mode handlers.
- `components/blocks/PreviewRefresh.tsx` — client wrapper around `<RefreshRouteOnSave>`.
- `src/payload/components/SectionRowLabel.tsx` — meaningful row label per added section.
- `public/admin/block-previews/*.svg` — 13 wireframe thumbnails.
- `src/migrations/<timestamp>.ts` / `.json` — Payload DB migration dropping `content_pages*` tables.
- Test files under `lib/__tests__/`.

**Modified files:**
- `lib/page-builder.ts` — extract shared doc mapper, add `fetchPageBySlugDraft`.
- `app/[locale]/(storefront)/pages/[slug]/page.tsx` — replace content-pages renderer with `pages` + draft branch.
- `next.config.mjs` — `/p/:slug` → `/pages/:slug` redirects.
- `src/payload/blocks/*.ts` (13) — `imageURL`, `imageAltText`, `admin.description`.
- `src/payload/collections/Pages.ts` — `livePreview`, collection/status descriptions, section RowLabel.
- `src/payload/plugins.ts` — `generateURL` `pages → /pages`, drop `content-pages` branch + from seo `collections`.
- `payload.config.ts` — drop `ContentPages` import + registration.

**Removed files:**
- `app/[locale]/(storefront)/p/[slug]/page.tsx`
- `src/payload/collections/ContentPages.ts`
- `lib/content-pages.ts`
- `isContentPagesEnabled()` from `lib/feature-flags.ts`

---

## Task 1: Add dependency and preview secret

**Files:**
- Modify: `package.json` (via pnpm), `.env`, `.env.example` (if present)

- [ ] **Step 1: Install the live-preview React package**

Run: `pnpm add @payloadcms/live-preview-react@^3.84.1`
Expected: package added to `dependencies`. If pnpm warns about ignored build scripts, ignore and continue (per project tooling guidance).

- [ ] **Step 2: Add `PREVIEW_SECRET` to env files**

Append to `.env` (generate a real random value, do not commit a placeholder secret to `.env.example`):

```bash
# Page builder live-preview / draft mode (admin-only token)
PREVIEW_SECRET=change-me-to-a-long-random-string
```

If `.env.example` exists, append a documented blank line there instead of a real secret:

```bash
PREVIEW_SECRET=
```

- [ ] **Step 3: Verify install**

Run: `pnpm ls @payloadcms/live-preview-react`
Expected: shows the installed version.

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml .env.example
git commit -m "chore(deps): add live-preview-react and PREVIEW_SECRET"
```
(Do not `git add .env` — it is gitignored.)

---

## Task 2: Migration mapping helpers (pure, TDD)

Maps a `content-pages` document's lightweight blocks to `pages` blocks. `hero → hero` (field-compatible), `richText → richText` (plain string → Lexical JSON), `cta → promoBanner`.

**Files:**
- Create: `lib/content-pages-migration.ts`
- Test: `lib/__tests__/content-pages-migration.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// lib/__tests__/content-pages-migration.test.ts
import { describe, expect, it } from 'vitest';
import {
  plainTextToLexical,
  mapContentBlock,
  mapContentPageToPageData,
} from '@/lib/content-pages-migration';

describe('plainTextToLexical', () => {
  it('should wrap a single line in one paragraph node', () => {
    const state = plainTextToLexical('Hello world');
    expect(state.root.children).toHaveLength(1);
    expect(state.root.children[0].children[0].text).toBe('Hello world');
  });

  it('should split newlines into separate paragraphs', () => {
    const state = plainTextToLexical('line one\nline two');
    expect(state.root.children).toHaveLength(2);
    expect(state.root.children[1].children[0].text).toBe('line two');
  });

  it('should produce one empty paragraph for empty input', () => {
    const state = plainTextToLexical('');
    expect(state.root.children).toHaveLength(1);
    expect(state.root.children[0].children[0].text).toBe('');
  });
});

describe('mapContentBlock', () => {
  it('should map a hero block field-for-field', () => {
    const result = mapContentBlock({
      blockType: 'hero',
      headline: 'Big news',
      subheadline: 'sub',
      ctaLabel: 'Shop',
      ctaHref: '/shop',
      image: 7,
    });
    expect(result).toEqual({
      blockType: 'hero',
      headline: 'Big news',
      subheadline: 'sub',
      ctaLabel: 'Shop',
      ctaHref: '/shop',
      image: 7,
    });
  });

  it('should map richText plain content into a Lexical richText block', () => {
    const result = mapContentBlock({ blockType: 'richText', content: 'paragraph' }) as {
      blockType: string;
      content: { root: { children: unknown[] } };
    };
    expect(result.blockType).toBe('richText');
    expect(result.content.root.children).toHaveLength(1);
  });

  it('should map a cta block to a promoBanner block', () => {
    const result = mapContentBlock({
      blockType: 'cta',
      title: 'Sale',
      body: '20% off',
      buttonLabel: 'Buy',
      buttonHref: '/buy',
    });
    expect(result).toEqual({
      blockType: 'promoBanner',
      text: 'Sale — 20% off',
      ctaLabel: 'Buy',
      ctaHref: '/buy',
    });
  });

  it('should return null for an unknown block type', () => {
    expect(mapContentBlock({ blockType: 'mystery' })).toBeNull();
  });
});

describe('mapContentPageToPageData', () => {
  it('should map title, slug, published state and layout', () => {
    const result = mapContentPageToPageData({
      title: 'About',
      slug: 'about',
      published: true,
      layout: [{ blockType: 'richText', content: 'hi' }],
    });
    expect(result.title).toBe('About');
    expect(result.slug).toBe('about');
    expect(result.status).toBe('published');
    expect(result.layout).toHaveLength(1);
  });

  it('should map unpublished pages to draft status', () => {
    const result = mapContentPageToPageData({ title: 'X', slug: 'x', published: false, layout: [] });
    expect(result.status).toBe('draft');
  });

  it('should drop unmappable blocks from the layout', () => {
    const result = mapContentPageToPageData({
      title: 'X',
      slug: 'x',
      published: false,
      layout: [{ blockType: 'mystery' }, { blockType: 'richText', content: 'ok' }],
    });
    expect(result.layout).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run lib/__tests__/content-pages-migration.test.ts`
Expected: FAIL — `Cannot find module '@/lib/content-pages-migration'`.

- [ ] **Step 3: Write the implementation**

```ts
// lib/content-pages-migration.ts — pure mappers for the one-time content-pages → pages migration.

export type LexicalText = {
  type: 'text';
  detail: 0;
  format: 0;
  mode: 'normal';
  style: '';
  text: string;
  version: 1;
};

export type LexicalParagraph = {
  type: 'paragraph';
  children: LexicalText[];
  direction: 'ltr';
  format: '';
  indent: 0;
  version: 1;
};

export type LexicalState = {
  root: {
    type: 'root';
    children: LexicalParagraph[];
    direction: 'ltr';
    format: '';
    indent: 0;
    version: 1;
  };
};

/** Convert a plain (textarea) string into a minimal Lexical editor state. */
export function plainTextToLexical(input: string): LexicalState {
  const lines = input.length > 0 ? input.split('\n') : [''];
  const children: LexicalParagraph[] = lines.map((line) => ({
    type: 'paragraph',
    direction: 'ltr',
    format: '',
    indent: 0,
    version: 1,
    children: [
      { type: 'text', detail: 0, format: 0, mode: 'normal', style: '', text: line, version: 1 },
    ],
  }));
  return {
    root: { type: 'root', children, direction: 'ltr', format: '', indent: 0, version: 1 },
  };
}

type RawBlock = Record<string, unknown> & { blockType?: string };

function str(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

/** Map one content-pages block to a pages block object, or null if unmappable. */
export function mapContentBlock(block: RawBlock): Record<string, unknown> | null {
  switch (block.blockType) {
    case 'hero':
      return {
        blockType: 'hero',
        headline: typeof block.headline === 'string' ? block.headline : '',
        subheadline: str(block.subheadline),
        ctaLabel: str(block.ctaLabel),
        ctaHref: str(block.ctaHref),
        // `image` is an upload relation: keep the id (number) or relation object as-is.
        image: block.image ?? undefined,
      };
    case 'richText':
      return {
        blockType: 'richText',
        content: plainTextToLexical(typeof block.content === 'string' ? block.content : ''),
      };
    case 'cta': {
      const title = typeof block.title === 'string' ? block.title : '';
      const body = str(block.body);
      return {
        blockType: 'promoBanner',
        text: body ? `${title} — ${body}` : title,
        ctaLabel: str(block.buttonLabel),
        ctaHref: str(block.buttonHref),
      };
    }
    default:
      return null;
  }
}

export type MappedPage = {
  title: string;
  slug: string;
  status: 'draft' | 'published';
  layout: Record<string, unknown>[];
};

/** Map a full content-pages doc to the `pages` collection create shape. */
export function mapContentPageToPageData(doc: {
  title: unknown;
  slug: unknown;
  published: unknown;
  layout: unknown;
}): MappedPage {
  const rawLayout = Array.isArray(doc.layout) ? doc.layout : [];
  const layout = rawLayout
    .filter((b): b is RawBlock => typeof b === 'object' && b !== null)
    .map(mapContentBlock)
    .filter((b): b is Record<string, unknown> => b !== null);

  return {
    title: typeof doc.title === 'string' ? doc.title : '',
    slug: typeof doc.slug === 'string' ? doc.slug : '',
    status: doc.published === true ? 'published' : 'draft',
    layout,
  };
}
```

Note on `mapContentBlock` hero test: the test passes `image: 7` and expects it echoed. Because `image: block.image ?? undefined` keeps `7`, and `subheadline/ctaLabel/ctaHref` are present strings so `str()` returns them. The expected object in the test omits no defined keys — verify `toEqual` matches (undefined-valued keys are ignored by `toEqual` only when absent; here all are defined). The hero test inputs are all non-empty, so no `undefined` keys are produced. Good.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run lib/__tests__/content-pages-migration.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add lib/content-pages-migration.ts lib/__tests__/content-pages-migration.test.ts
git commit -m "feat(pages): add content-pages to pages migration mappers"
```

---

## Task 3: One-time migration script

Copies `content-pages` rows into `pages`, skipping slug collisions, no-op on empty table.

**Files:**
- Create: `scripts/migrate-content-pages.ts`
- Modify: `package.json` (add script)

- [ ] **Step 1: Write the migration script**

```ts
// scripts/migrate-content-pages.ts — one-time copy of content-pages rows into the pages collection.
import 'dotenv/config';
import config from '@payload-config';
import { getPayload } from 'payload';
import { mapContentPageToPageData } from '@/lib/content-pages-migration';

async function main(): Promise<void> {
  const payload = await getPayload({ config });

  // content-pages may already be removed from config in a later step; guard for that.
  const hasContentPages = payload.config.collections.some((c) => c.slug === 'content-pages');
  if (!hasContentPages) {
    console.log('[migrate-content-pages] content-pages collection not registered — nothing to do.');
    return;
  }

  const source = await payload.find({
    collection: 'content-pages',
    limit: 1000,
    depth: 0,
    pagination: false,
  });

  if (source.docs.length === 0) {
    console.log('[migrate-content-pages] nothing to migrate (content-pages table is empty).');
    return;
  }

  let migrated = 0;
  let skipped = 0;

  for (const doc of source.docs) {
    const mapped = mapContentPageToPageData(doc as never);
    if (!mapped.slug) {
      console.warn('[migrate-content-pages] skipping row with empty slug:', doc.id);
      skipped += 1;
      continue;
    }

    const existing = await payload.find({
      collection: 'pages',
      where: { slug: { equals: mapped.slug } },
      limit: 1,
      depth: 0,
      pagination: false,
    });

    if (existing.docs.length > 0) {
      console.warn(
        `[migrate-content-pages] slug "${mapped.slug}" already exists in pages — skipping (manual reconciliation needed).`,
      );
      skipped += 1;
      continue;
    }

    await payload.create({
      collection: 'pages',
      data: {
        title: mapped.title,
        slug: mapped.slug,
        status: mapped.status,
        layout: mapped.layout as never,
      },
    });
    migrated += 1;
    console.log(`[migrate-content-pages] migrated "${mapped.slug}" (${mapped.status}).`);
  }

  console.log(`[migrate-content-pages] done. migrated=${migrated} skipped=${skipped}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[migrate-content-pages] failed:', err);
    process.exit(1);
  });
```

- [ ] **Step 2: Add the npm script**

In `package.json` `scripts`, add alongside the other `payload:*` entries:

```json
"payload:migrate-content-pages": "tsx scripts/migrate-content-pages.ts",
```

- [ ] **Step 3: Run the migration (best-effort, requires DB)**

Run: `pnpm payload:migrate-content-pages`
Expected: one of: "nothing to migrate (content-pages table is empty)." (most likely — the stub was unlinked), OR per-slug migrated/skipped logs ending in `done.`
If the database is unavailable in this environment, note it and continue — the script is idempotent and will be re-run in Task 11 before tables are dropped.

- [ ] **Step 4: Commit**

```bash
git add scripts/migrate-content-pages.ts package.json
git commit -m "feat(pages): add one-time content-pages migration script"
```

---

## Task 4: Draft-aware page fetch

Add `fetchPageBySlugDraft` (uncached, status-agnostic) and refactor the shared doc mapper out of `fetchPageBySlug`.

**Files:**
- Modify: `lib/page-builder.ts`
- Test: `lib/__tests__/page-builder-draft.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// lib/__tests__/page-builder-draft.test.ts
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { getPayload } from 'payload';
import { fetchPageBySlugDraft } from '@/lib/page-builder';

vi.mock('@payload-config', () => ({ default: {} }));
vi.mock('payload', () => ({ getPayload: vi.fn() }));
vi.mock('next/cache', () => ({
  unstable_cache: (fn: unknown) => fn,
  revalidateTag: vi.fn(),
}));

const mockFind = vi.fn();

beforeEach(() => {
  mockFind.mockReset();
  (getPayload as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ find: mockFind });
});

describe('fetchPageBySlugDraft', () => {
  it('should return an unpublished page (no status filter)', async () => {
    mockFind.mockResolvedValue({
      docs: [{ id: 1, title: 'Draft Page', slug: 'draft-page', status: 'draft', layout: [] }],
    });

    const result = await fetchPageBySlugDraft('draft-page');

    expect(result?.title).toBe('Draft Page');
    expect(result?.status).toBe('draft');
    // The where clause must NOT filter on status.
    const whereArg = mockFind.mock.calls[0][0].where;
    expect(JSON.stringify(whereArg)).not.toContain('status');
  });

  it('should return null for a blank slug without querying', async () => {
    const result = await fetchPageBySlugDraft('   ');
    expect(result).toBeNull();
    expect(mockFind).not.toHaveBeenCalled();
  });

  it('should return null when no doc is found', async () => {
    mockFind.mockResolvedValue({ docs: [] });
    const result = await fetchPageBySlugDraft('missing');
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run lib/__tests__/page-builder-draft.test.ts`
Expected: FAIL — `fetchPageBySlugDraft is not a function`.

- [ ] **Step 3: Refactor the shared mapper and add the draft fetch**

In `lib/page-builder.ts`, replace the body of `fetchPageBySlug` to use a new shared mapper, and add `fetchPageBySlugDraft`. Replace the existing `fetchPageBySlug` function (lines ~100-127) with:

```ts
type RawPageDoc = {
  id: string | number;
  title?: unknown;
  slug?: unknown;
  status?: unknown;
  layout?: unknown;
  meta?: unknown;
  updatedAt?: unknown;
};

/** Map a raw Payload page doc to the storefront PageDoc shape, or null if invalid. */
function toPageDoc(doc: RawPageDoc | undefined, fallbackSlug: string): PageDoc | null {
  if (!doc || typeof doc.title !== 'string') return null;
  return {
    id: doc.id,
    title: doc.title,
    slug: typeof doc.slug === 'string' ? doc.slug : fallbackSlug,
    status: doc.status as 'draft' | 'published',
    layout: Array.isArray(doc.layout) ? (doc.layout as PageBlock[]) : [],
    meta: doc.meta as PageDoc['meta'],
    updatedAt: typeof doc.updatedAt === 'string' ? doc.updatedAt : undefined,
  };
}

async function fetchPageBySlug(slug: string): Promise<PageDoc | null> {
  const trimmed = slug.trim();
  if (!trimmed) return null;

  const payload = await getPayload({ config });
  const result = await payload.find({
    collection: 'pages',
    where: {
      and: [{ slug: { equals: trimmed } }, { status: { equals: 'published' } }],
    },
    limit: 1,
    depth: 2,
    pagination: false,
  });

  return toPageDoc(result.docs[0] as RawPageDoc | undefined, trimmed);
}

/** Draft-mode fetch: uncached and status-agnostic so unpublished edits render in live preview. */
export async function fetchPageBySlugDraft(slug: string): Promise<PageDoc | null> {
  const trimmed = slug.trim();
  if (!trimmed) return null;

  const payload = await getPayload({ config });
  const result = await payload.find({
    collection: 'pages',
    where: { slug: { equals: trimmed } },
    limit: 1,
    depth: 2,
    pagination: false,
  });

  return toPageDoc(result.docs[0] as RawPageDoc | undefined, trimmed);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run lib/__tests__/page-builder-draft.test.ts`
Expected: PASS.

- [ ] **Step 5: Run the full suite to confirm no regression in existing page-builder usage**

Run: `pnpm vitest run`
Expected: PASS (all existing tests still green).

- [ ] **Step 6: Commit**

```bash
git add lib/page-builder.ts lib/__tests__/page-builder-draft.test.ts
git commit -m "feat(pages): add uncached draft fetch for live preview"
```

---

## Task 5: Preview token helper + draft-mode route handlers

**Files:**
- Create: `lib/preview.ts`, `app/api/preview/route.ts`, `app/api/exit-preview/route.ts`
- Test: `lib/__tests__/preview.test.ts`

- [ ] **Step 1: Write the failing test for the token helper**

```ts
// lib/__tests__/preview.test.ts
import { describe, expect, it, afterEach } from 'vitest';
import { isValidPreviewToken } from '@/lib/preview';

const original = process.env.PREVIEW_SECRET;
afterEach(() => {
  process.env.PREVIEW_SECRET = original;
});

describe('isValidPreviewToken', () => {
  it('should accept a token equal to PREVIEW_SECRET', () => {
    process.env.PREVIEW_SECRET = 'topsecret';
    expect(isValidPreviewToken('topsecret')).toBe(true);
  });

  it('should reject a wrong token', () => {
    process.env.PREVIEW_SECRET = 'topsecret';
    expect(isValidPreviewToken('nope')).toBe(false);
  });

  it('should reject a null/empty token', () => {
    process.env.PREVIEW_SECRET = 'topsecret';
    expect(isValidPreviewToken(null)).toBe(false);
    expect(isValidPreviewToken('')).toBe(false);
  });

  it('should reject any token when PREVIEW_SECRET is unset', () => {
    delete process.env.PREVIEW_SECRET;
    expect(isValidPreviewToken('anything')).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run lib/__tests__/preview.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the token helper**

```ts
// lib/preview.ts — draft-mode preview token validation (admin-only).

/** True only when PREVIEW_SECRET is set and the supplied token matches it exactly. */
export function isValidPreviewToken(token: string | null | undefined): boolean {
  const expected = process.env.PREVIEW_SECRET;
  if (!expected) return false;
  return typeof token === 'string' && token.length > 0 && token === expected;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run lib/__tests__/preview.test.ts`
Expected: PASS.

- [ ] **Step 5: Implement the preview route handler**

```ts
// app/api/preview/route.ts — enables Next draft mode for the page builder live preview.
import { draftMode } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { isValidPreviewToken } from '@/lib/preview';

export async function GET(req: NextRequest): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get('secret');
  const path = searchParams.get('path') ?? '/';

  if (!isValidPreviewToken(secret)) {
    return new NextResponse('Invalid preview token', { status: 401 });
  }

  // Only allow same-origin relative redirects.
  if (!path.startsWith('/') || path.startsWith('//')) {
    return new NextResponse('Invalid path', { status: 400 });
  }

  const draft = await draftMode();
  draft.enable();

  return NextResponse.redirect(new URL(path, req.url));
}
```

- [ ] **Step 6: Implement the exit-preview route handler**

```ts
// app/api/exit-preview/route.ts — disables Next draft mode.
import { draftMode } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(req: NextRequest): Promise<Response> {
  const draft = await draftMode();
  draft.disable();

  const { searchParams } = new URL(req.url);
  const path = searchParams.get('path');
  const target = path && path.startsWith('/') && !path.startsWith('//') ? path : '/';

  return NextResponse.redirect(new URL(target, req.url));
}
```

- [ ] **Step 7: Commit**

```bash
git add lib/preview.ts lib/__tests__/preview.test.ts app/api/preview/route.ts app/api/exit-preview/route.ts
git commit -m "feat(pages): add draft-mode preview route handlers"
```

---

## Task 6: Render `pages` at `/pages/[slug]` with draft branch

Replace the content-pages renderer at this route with the `pages` builder + draft-mode branch and live-preview auto-refresh.

**Files:**
- Create: `components/blocks/PreviewRefresh.tsx`
- Modify (overwrite): `app/[locale]/(storefront)/pages/[slug]/page.tsx`

- [ ] **Step 1: Create the live-preview refresh client component**

```tsx
// components/blocks/PreviewRefresh.tsx — refreshes the route when Payload posts a save event.
'use client';

import { RefreshRouteOnSave } from '@payloadcms/live-preview-react';
import { useRouter } from 'next/navigation';
import type { ReactElement } from 'react';

export default function PreviewRefresh(): ReactElement {
  const router = useRouter();
  const serverURL =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    'http://localhost:3000';

  return <RefreshRouteOnSave refresh={() => router.refresh()} serverURL={serverURL} />;
}
```

- [ ] **Step 2: Overwrite the route to render the `pages` collection**

Replace the entire contents of `app/[locale]/(storefront)/pages/[slug]/page.tsx` with:

```tsx
// app/[locale]/(storefront)/pages/[slug]/page.tsx — storefront page builder route
import type { Metadata } from 'next';
import { draftMode } from 'next/headers';
import { notFound } from 'next/navigation';
import type { ReactElement } from 'react';
import RenderBlocks from '@/components/blocks/RenderBlocks';
import PreviewRefresh from '@/components/blocks/PreviewRefresh';
import { fetchPageBySlugDraft, getPageBySlug, type PageDoc } from '@/lib/page-builder';
import { getResolvedSiteName } from '@/lib/store-settings';

type PageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

async function loadPage(slug: string): Promise<PageDoc | null> {
  const { isEnabled } = await draftMode();
  return isEnabled ? fetchPageBySlugDraft(slug) : getPageBySlug(slug);
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { slug } = await props.params;
  const page = await loadPage(slug);
  if (!page) return { title: 'Page not found' };

  const siteName = await getResolvedSiteName();
  const seoTitle =
    typeof page.meta?.title === 'string' && page.meta.title.trim()
      ? page.meta.title.trim()
      : page.title;
  const seoDescription =
    typeof page.meta?.description === 'string' && page.meta.description.trim()
      ? page.meta.description.trim()
      : undefined;

  return {
    title: `${seoTitle} | ${siteName}`,
    description: seoDescription,
  };
}

export const revalidate = 60;

export default async function PageBuilderPage(props: PageProps): Promise<ReactElement> {
  const { slug } = await props.params;
  const { isEnabled: isDraft } = await draftMode();
  const page = isDraft ? await fetchPageBySlugDraft(slug) : await getPageBySlug(slug);

  if (!page) {
    notFound();
  }

  return (
    <article>
      {isDraft ? <PreviewRefresh /> : null}
      <RenderBlocks blocks={page.layout} />
    </article>
  );
}
```

- [ ] **Step 3: Typecheck the touched files**

Run: `pnpm tsc --noEmit`
Expected: PASS (note: `content-pages` references elsewhere are removed in Task 11; if this step reports unrelated errors only in files retired later, that is expected — but this route and its imports must be clean).

- [ ] **Step 4: Commit**

```bash
git add "app/[locale]/(storefront)/pages/[slug]/page.tsx" components/blocks/PreviewRefresh.tsx
git commit -m "feat(pages): render page builder at /pages/[slug] with live preview"
```

---

## Task 7: Remove `/p/[slug]` route and add redirect

**Files:**
- Remove: `app/[locale]/(storefront)/p/[slug]/page.tsx` (and the now-empty `p` dirs)
- Modify: `next.config.mjs`

- [ ] **Step 1: Remove the old route**

```bash
git rm "app/[locale]/(storefront)/p/[slug]/page.tsx"
rmdir "app/[locale]/(storefront)/p/[slug]" "app/[locale]/(storefront)/p" 2>/dev/null || true
```

- [ ] **Step 2: Add the redirects**

In `next.config.mjs`, inside the `redirects()` array (after the existing `/admin/*` entries), add:

```js
      { source: '/p/:slug', destination: '/pages/:slug', permanent: true },
      { source: '/:locale/p/:slug', destination: '/:locale/pages/:slug', permanent: true },
```

- [ ] **Step 3: Verify the redirect config parses**

Run: `node -e "import('./next.config.mjs').then(m => console.log('config loaded ok')).catch(e => { console.error(e); process.exit(1); })"`
Expected: `config loaded ok` (the module imports without throwing).

- [ ] **Step 4: Commit**

```bash
git add next.config.mjs "app/[locale]/(storefront)"
git commit -m "feat(pages): redirect /p/[slug] to /pages/[slug] and remove old route"
```

---

## Task 8: Block thumbnails (13 SVG wireframes)

Each SVG is a 320×180 wireframe of the block's layout shape over a subtle per-block-type background tint. No build step; served from `public/`.

**Files:**
- Create: `public/admin/block-previews/{hero,featured-collection,featured-products,rich-text,image-with-text,gallery,testimonials,logo-cloud,newsletter,faq,promo-banner,video-embed,divider}.svg`

- [ ] **Step 1: Create all 13 SVG files**

Create each file with the content below. Wireframe gray is `#CBD5E1` (shapes) / `#94A3B8` (accents); the first `<rect>` is the per-block tint.

`public/admin/block-previews/hero.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180" width="320" height="180"><rect width="320" height="180" fill="#EEF2FF"/><rect x="20" y="40" width="130" height="14" rx="3" fill="#94A3B8"/><rect x="20" y="64" width="100" height="8" rx="3" fill="#CBD5E1"/><rect x="20" y="84" width="100" height="8" rx="3" fill="#CBD5E1"/><rect x="20" y="108" width="54" height="20" rx="10" fill="#94A3B8"/><rect x="180" y="36" width="120" height="108" rx="6" fill="#CBD5E1"/></svg>
```

`public/admin/block-previews/featured-collection.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180" width="320" height="180"><rect width="320" height="180" fill="#ECFDF5"/><rect x="20" y="22" width="120" height="12" rx="3" fill="#94A3B8"/><rect x="20" y="52" width="84" height="106" rx="6" fill="#CBD5E1"/><rect x="118" y="52" width="84" height="106" rx="6" fill="#CBD5E1"/><rect x="216" y="52" width="84" height="106" rx="6" fill="#CBD5E1"/></svg>
```

`public/admin/block-previews/featured-products.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180" width="320" height="180"><rect width="320" height="180" fill="#F0FDF4"/><rect x="20" y="20" width="100" height="12" rx="3" fill="#94A3B8"/><rect x="20" y="46" width="64" height="80" rx="6" fill="#CBD5E1"/><rect x="92" y="46" width="64" height="80" rx="6" fill="#CBD5E1"/><rect x="164" y="46" width="64" height="80" rx="6" fill="#CBD5E1"/><rect x="236" y="46" width="64" height="80" rx="6" fill="#CBD5E1"/><rect x="20" y="134" width="64" height="8" rx="3" fill="#CBD5E1"/><rect x="92" y="134" width="64" height="8" rx="3" fill="#CBD5E1"/></svg>
```

`public/admin/block-previews/rich-text.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180" width="320" height="180"><rect width="320" height="180" fill="#FEFCE8"/><rect x="40" y="34" width="160" height="14" rx="3" fill="#94A3B8"/><rect x="40" y="62" width="240" height="8" rx="3" fill="#CBD5E1"/><rect x="40" y="80" width="240" height="8" rx="3" fill="#CBD5E1"/><rect x="40" y="98" width="240" height="8" rx="3" fill="#CBD5E1"/><rect x="40" y="116" width="180" height="8" rx="3" fill="#CBD5E1"/></svg>
```

`public/admin/block-previews/image-with-text.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180" width="320" height="180"><rect width="320" height="180" fill="#FDF2F8"/><rect x="20" y="36" width="130" height="108" rx="6" fill="#CBD5E1"/><rect x="172" y="48" width="120" height="12" rx="3" fill="#94A3B8"/><rect x="172" y="72" width="120" height="8" rx="3" fill="#CBD5E1"/><rect x="172" y="90" width="120" height="8" rx="3" fill="#CBD5E1"/><rect x="172" y="116" width="50" height="18" rx="9" fill="#94A3B8"/></svg>
```

`public/admin/block-previews/gallery.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180" width="320" height="180"><rect width="320" height="180" fill="#F5F3FF"/><rect x="20" y="20" width="135" height="68" rx="6" fill="#CBD5E1"/><rect x="165" y="20" width="135" height="68" rx="6" fill="#CBD5E1"/><rect x="20" y="96" width="135" height="68" rx="6" fill="#CBD5E1"/><rect x="165" y="96" width="135" height="68" rx="6" fill="#CBD5E1"/></svg>
```

`public/admin/block-previews/testimonials.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180" width="320" height="180"><rect width="320" height="180" fill="#FFF7ED"/><circle cx="160" cy="52" r="22" fill="#CBD5E1"/><rect x="80" y="92" width="160" height="8" rx="3" fill="#CBD5E1"/><rect x="100" y="110" width="120" height="8" rx="3" fill="#CBD5E1"/><rect x="120" y="134" width="80" height="8" rx="3" fill="#94A3B8"/></svg>
```

`public/admin/block-previews/logo-cloud.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180" width="320" height="180"><rect width="320" height="180" fill="#F0F9FF"/><rect x="28" y="58" width="56" height="28" rx="6" fill="#CBD5E1"/><rect x="100" y="58" width="56" height="28" rx="6" fill="#CBD5E1"/><rect x="172" y="58" width="56" height="28" rx="6" fill="#CBD5E1"/><rect x="244" y="58" width="48" height="28" rx="6" fill="#CBD5E1"/><rect x="64" y="100" width="56" height="28" rx="6" fill="#CBD5E1"/><rect x="136" y="100" width="56" height="28" rx="6" fill="#CBD5E1"/><rect x="208" y="100" width="48" height="28" rx="6" fill="#CBD5E1"/></svg>
```

`public/admin/block-previews/newsletter.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180" width="320" height="180"><rect width="320" height="180" fill="#FEF2F2"/><rect x="80" y="40" width="160" height="12" rx="3" fill="#94A3B8"/><rect x="60" y="92" width="140" height="26" rx="6" fill="#fff" stroke="#CBD5E1" stroke-width="2"/><rect x="208" y="92" width="52" height="26" rx="6" fill="#94A3B8"/></svg>
```

`public/admin/block-previews/faq.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180" width="320" height="180"><rect width="320" height="180" fill="#F7FEE7"/><rect x="36" y="34" width="248" height="22" rx="5" fill="#CBD5E1"/><rect x="36" y="64" width="248" height="22" rx="5" fill="#CBD5E1"/><rect x="36" y="94" width="248" height="22" rx="5" fill="#CBD5E1"/><rect x="36" y="124" width="248" height="22" rx="5" fill="#CBD5E1"/><rect x="258" y="40" width="14" height="3" rx="1" fill="#94A3B8"/><rect x="258" y="70" width="14" height="3" rx="1" fill="#94A3B8"/></svg>
```

`public/admin/block-previews/promo-banner.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180" width="320" height="180"><rect width="320" height="180" fill="#FFFBEB"/><rect x="24" y="72" width="272" height="36" rx="6" fill="#94A3B8"/><rect x="44" y="86" width="120" height="8" rx="3" fill="#fff"/><rect x="232" y="82" width="44" height="16" rx="8" fill="#fff"/></svg>
```

`public/admin/block-previews/video-embed.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180" width="320" height="180"><rect width="320" height="180" fill="#EFF6FF"/><rect x="60" y="34" width="200" height="112" rx="8" fill="#CBD5E1"/><path d="M150 70 L150 110 L186 90 Z" fill="#fff"/></svg>
```

`public/admin/block-previews/divider.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180" width="320" height="180"><rect width="320" height="180" fill="#F8FAFC"/><rect x="40" y="88" width="240" height="4" rx="2" fill="#CBD5E1"/><circle cx="160" cy="90" r="8" fill="#94A3B8"/></svg>
```

- [ ] **Step 2: Verify files exist**

Run: `ls public/admin/block-previews/ | sort`
Expected: 13 `.svg` files listed.

- [ ] **Step 3: Commit**

```bash
git add public/admin/block-previews/
git commit -m "feat(pages): add wireframe thumbnails for page-builder blocks"
```

---

## Task 9: Block metadata (thumbnails + descriptions)

Add `imageURL`, `imageAltText`, and `admin.description` to each of the 13 block definitions.

**Files:**
- Modify: all 13 files in `src/payload/blocks/`

- [ ] **Step 1: Add metadata to each block**

For each block, add three properties at the top level of the `Block` object (after `interfaceName`, before `fields`). Use this exact mapping:

| File | imageURL | imageAltText | admin.description |
|------|----------|--------------|-------------------|
| `Hero.ts` | `/admin/block-previews/hero.svg` | `Hero section preview` | `Large banner with headline, CTA and image.` |
| `FeaturedCollection.ts` | `/admin/block-previews/featured-collection.svg` | `Featured collection preview` | `Showcase a category as a row of collection cards.` |
| `FeaturedProducts.ts` | `/admin/block-previews/featured-products.svg` | `Featured products preview` | `Grid of selected products.` |
| `RichText.ts` | `/admin/block-previews/rich-text.svg` | `Rich text preview` | `Formatted text content (headings, lists, links).` |
| `ImageWithText.ts` | `/admin/block-previews/image-with-text.svg` | `Image with text preview` | `Image beside a column of text and a CTA.` |
| `Gallery.ts` | `/admin/block-previews/gallery.svg` | `Gallery preview` | `Grid of images.` |
| `Testimonials.ts` | `/admin/block-previews/testimonials.svg` | `Testimonials preview` | `Customer quotes with names and avatars.` |
| `LogoCloud.ts` | `/admin/block-previews/logo-cloud.svg` | `Logo cloud preview` | `Row of partner or brand logos.` |
| `Newsletter.ts` | `/admin/block-previews/newsletter.svg` | `Newsletter preview` | `Email sign-up form with heading.` |
| `FAQ.ts` | `/admin/block-previews/faq.svg` | `FAQ preview` | `Expandable question-and-answer list.` |
| `PromoBanner.ts` | `/admin/block-previews/promo-banner.svg` | `Promo banner preview` | `Full-width promotional strip with a CTA.` |
| `VideoEmbed.ts` | `/admin/block-previews/video-embed.svg` | `Video embed preview` | `Embedded video (YouTube/Vimeo/file).` |
| `Divider.ts` | `/admin/block-previews/divider.svg` | `Divider preview` | `Visual separator between sections.` |

Example — edit `src/payload/blocks/Hero.ts` so the object opening reads:

```ts
export const Hero: Block = {
  slug: 'hero',
  labels: { singular: 'Hero', plural: 'Heroes' },
  interfaceName: 'HeroBlock',
  imageURL: '/admin/block-previews/hero.svg',
  imageAltText: 'Hero section preview',
  admin: {
    description: 'Large banner with headline, CTA and image.',
  },
  fields: [
```

Apply the analogous three-line insert to the other 12 files using the table values. Each block already has `slug`, `labels`, `interfaceName`; insert the new keys right after `interfaceName` and before `fields`.

- [ ] **Step 2: Typecheck**

Run: `pnpm tsc --noEmit`
Expected: PASS for the block files (`Block` type supports `imageURL`, `imageAltText`, and `admin.description`).

- [ ] **Step 3: Commit**

```bash
git add src/payload/blocks/
git commit -m "feat(pages): add thumbnails and descriptions to all page-builder blocks"
```

---

## Task 10: Section row labels, live preview, and Pages descriptions

**Files:**
- Create: `src/payload/components/SectionRowLabel.tsx`
- Modify: `src/payload/collections/Pages.ts`

- [ ] **Step 1: Create the section row-label component**

Follow the existing `HeaderTabRowLabel.tsx` pattern.

```tsx
// src/payload/components/SectionRowLabel.tsx
'use client';

import { useRowLabel } from '@payloadcms/ui';
import type { ReactElement } from 'react';

type SectionRow = {
  blockType?: string;
  headline?: string;
  text?: string;
  title?: string;
};

const BLOCK_LABELS: Record<string, string> = {
  hero: 'Hero',
  featuredCollection: 'Featured collection',
  featuredProducts: 'Featured products',
  richText: 'Rich text',
  imageWithText: 'Image with text',
  gallery: 'Gallery',
  testimonials: 'Testimonials',
  logoCloud: 'Logo cloud',
  newsletter: 'Newsletter',
  faq: 'FAQ',
  promoBanner: 'Promo banner',
  videoEmbed: 'Video embed',
  divider: 'Divider',
};

export function SectionRowLabel(): ReactElement {
  const { data, rowNumber = 0 } = useRowLabel<SectionRow>();
  const type = data?.blockType ? (BLOCK_LABELS[data.blockType] ?? data.blockType) : '';
  const summary = (data?.headline || data?.text || data?.title || '').trim();
  const fallback = `Section ${String(rowNumber + 1).padStart(2, '0')}`;

  if (type && summary) {
    return (
      <span className="row-label">
        {type} <span style={{ opacity: 0.55 }}>— {summary}</span>
      </span>
    );
  }

  return <span className="row-label">{type || fallback}</span>;
}
```

- [ ] **Step 2: Wire up the collection — descriptions, live preview, and row label**

Edit `src/payload/collections/Pages.ts`:

(a) In the `admin` object, update the collection `description` and add `livePreview`. Add the `routing` import at the top of the file:

```ts
import { routing } from '@/i18n/routing';
```

Replace the `admin` block (currently lines ~74-79) with:

```ts
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'status', 'updatedAt'],
    group: groups.content.name,
    description:
      'Build storefront pages by stacking sections. Use the live preview on the right to see your changes.',
    livePreview: {
      url: ({ data }) => {
        const slug = typeof data?.slug === 'string' ? data.slug.trim() : '';
        if (!slug) return '';
        const base =
          process.env.NEXT_PUBLIC_APP_URL ??
          process.env.NEXT_PUBLIC_SITE_URL ??
          'http://localhost:3000';
        const secret = process.env.PREVIEW_SECRET ?? '';
        const path = `/${routing.defaultLocale}/pages/${slug}`;
        return `${base}/api/preview?secret=${encodeURIComponent(secret)}&path=${encodeURIComponent(path)}`;
      },
      breakpoints: [
        { label: 'Mobile', name: 'mobile', width: 375, height: 667 },
        { label: 'Tablet', name: 'tablet', width: 768, height: 1024 },
        { label: 'Desktop', name: 'desktop', width: 1440, height: 900 },
      ],
    },
  },
```

(b) Update the `status` field's `admin.description` (currently "Only published pages are visible on the storefront.") to clarify draft preview:

```ts
      admin: {
        description:
          'Only published pages are visible on the storefront. Draft pages are visible only in the live preview.',
      },
```

(c) Add a `RowLabel` to the `layout` blocks field. Replace the `layout` field's `admin` (it currently has none) by adding:

```ts
    {
      name: 'layout',
      type: 'blocks',
      labels: { singular: 'Section', plural: 'Sections' },
      admin: {
        components: {
          RowLabel: '@/src/payload/components/SectionRowLabel#SectionRowLabel',
        },
      },
      blocks: [
        Hero,
        FeaturedCollection,
        FeaturedProducts,
        RichText,
        ImageWithText,
        Gallery,
        Testimonials,
        LogoCloud,
        Newsletter,
        FAQ,
        PromoBanner,
        VideoEmbed,
        Divider,
      ],
    },
```

- [ ] **Step 3: Regenerate the Payload import map (registers the new RowLabel component)**

Run: `pnpm payload generate:importmap`
Expected: `src/payload/importMap.js` (or `app/(payload)/admin/importMap.js`) updated to include `SectionRowLabel`. If the command needs the dev DB and fails in this environment, note it — the import map regenerates on next `pnpm dev`/build.

- [ ] **Step 4: Typecheck**

Run: `pnpm tsc --noEmit`
Expected: PASS for `Pages.ts` and `SectionRowLabel.tsx`.

- [ ] **Step 5: Commit**

```bash
git add src/payload/collections/Pages.ts src/payload/components/SectionRowLabel.tsx src/payload/importMap.js app/
git commit -m "feat(pages): add live preview, section row labels and clearer descriptions"
```
(Add whichever import-map file actually changed.)

---

## Task 11: Retire content-pages

Now that data is migrated and `/pages/[slug]` renders the `pages` collection, remove the `content-pages` system end-to-end.

**Files:**
- Modify: `payload.config.ts`, `src/payload/plugins.ts`, `lib/feature-flags.ts`
- Remove: `src/payload/collections/ContentPages.ts`, `lib/content-pages.ts`
- Create: `src/migrations/<timestamp>.ts` + `.json` (DB drop)

- [ ] **Step 1: Re-run the migration to be safe (idempotent)**

Run: `pnpm payload:migrate-content-pages`
Expected: "nothing to migrate" or per-slug results; safe to run repeatedly (skips existing slugs). Skip only if the DB is unavailable in this environment.

- [ ] **Step 2: Remove the collection from `payload.config.ts`**

Delete the import line:
```ts
import { ContentPages } from './src/payload/collections/ContentPages';
```
And remove `ContentPages,` from the `collections: [...]` array.

- [ ] **Step 3: Update `src/payload/plugins.ts`**

(a) In `generateSeoURL`, change the `pages` branch to the new path and delete the `content-pages` branch:

```ts
  if (collectionConfig?.slug === 'pages') {
    return `${appBaseUrl}/pages/${slug}`;
  }
```
(remove the `if (collectionConfig?.slug === 'content-pages') { ... }` block entirely.)

(b) In the `seoPlugin({ collections: [...] })` array, remove `'content-pages'`:

```ts
    collections: ['products', 'categories', 'pages', 'posts', 'blog-categories'],
```

- [ ] **Step 4: Remove the feature flag**

In `lib/feature-flags.ts`, delete the `isContentPagesEnabled` function and its doc comment.

- [ ] **Step 5: Delete the dead files**

```bash
git rm src/payload/collections/ContentPages.ts lib/content-pages.ts
```

- [ ] **Step 6: Confirm no remaining references**

Run:
```bash
grep -rn "content-pages\|ContentPages\|isContentPagesEnabled\|getContentPageBySlug\|lib/content-pages" --include='*.ts' --include='*.tsx' --include='*.mjs' . | grep -v node_modules | grep -v src/payload/payload-types.ts | grep -v src/migrations
```
Expected: no output. (`payload-types.ts` is regenerated next; existing migration history may legitimately mention it.)

- [ ] **Step 7: Regenerate Payload types**

Run: `pnpm payload:types`
Expected: `src/payload/payload-types.ts` regenerated without `content-pages` entries. If the DB is unavailable, note it — types regenerate on next build; do not hand-edit.

- [ ] **Step 8: Create the DB migration that drops the content_pages tables**

Run: `pnpm payload migrate:create drop_content_pages`
Expected: a new pair `src/migrations/<timestamp>.ts` + `.json`. Open the generated `.ts` and confirm the `up()` drops the `content_pages` table and its block/relation tables (e.g. `content_pages_blocks_*`, any `pages_rels`/seo relation columns referencing it). Do not edit the auto-generated SQL unless it is clearly wrong; if `migrate:create` reports "no changes," the schema was managed via push — in that case skip this step and note it.

- [ ] **Step 9: Typecheck and full test run**

Run: `pnpm tsc --noEmit && pnpm vitest run`
Expected: PASS. No references to removed symbols remain.

- [ ] **Step 10: Commit**

```bash
git add payload.config.ts src/payload/plugins.ts lib/feature-flags.ts src/payload/payload-types.ts src/migrations/ src/payload/collections lib/content-pages.ts
git commit -m "feat(pages): retire content-pages collection, routes and feature flag"
```

---

## Task 12: Final verification

- [ ] **Step 1: Typecheck**

Run: `pnpm tsc --noEmit`
Expected: PASS, zero errors.

- [ ] **Step 2: Full test suite**

Run: `pnpm vitest run`
Expected: PASS, including the new migration, draft-fetch, and preview-token tests.

- [ ] **Step 3: Production build**

Run: `pnpm build`
Expected: build succeeds; `/[locale]/pages/[slug]` route compiles; no missing-module errors from removed `content-pages` files.

- [ ] **Step 4: Manual smoke test (requires `pnpm dev` + DB)**

Verify each:
1. Visit `/vi/p/<existing-slug>` → 308 permanent redirect to `/vi/pages/<existing-slug>`, renders correctly.
2. In `/admin`, open a Page → the **Live Preview** view shows a side-by-side iframe with Mobile/Tablet/Desktop toggles.
3. Edit a field and save → the preview iframe refreshes within ~1s (RefreshRouteOnSave) without a manual reload.
4. A **draft** page renders in the preview iframe but returns 404 at its public `/vi/pages/<slug>` URL when not in draft mode.
5. The "Add Section" drawer shows the 13 wireframe thumbnails + one-line descriptions; added sections show meaningful row labels (e.g. `Hero — <headline>`).

- [ ] **Step 5: Confirm clean status and summarize**

Run: `git status` and `git log --oneline origin/main..HEAD`
Expected: working tree clean; commit history matches the tasks above.

---

## Self-Review (completed during planning)

- **Spec coverage:** Part 1 consolidation → Tasks 2,3,6,7,11. Part 2 thumbnails → Tasks 8,9. Part 3 live preview → Tasks 4,5,6,10. Part 4 workflow clarity → Tasks 9,10. Migration script + tests → Tasks 2,3. Error handling (token 401, draft not-found, empty table, slug collision, missing thumbnail fallback) → covered in Tasks 3,5,9. DB drop migration → Task 11.
- **Deviations from spec (flagged):**
  1. **`richText` migration needs Lexical conversion.** Spec said "`richText → RichText`" but content-pages stores plain `textarea` text while the `pages` RichText block uses Lexical JSON. Task 2 adds `plainTextToLexical` to convert. Without this, migrated rich text would be malformed.
  2. **Redirect verified via build/manual, not a unit test.** The spec's testing list included a redirect unit test, but `next.config.mjs` redirects are not cleanly importable (wrapped in `withPayload`/`withNextIntl`). Higher-value logic (mapping, draft fetch, preview token) is unit-tested; redirect is verified in Task 7 Step 3 (config parses) and Task 12 Step 4 (live 308). Flag for the user if a unit test is required anyway.
  3. **`PREVIEW_SECRET` in `livePreview.url`** is safe because `url` is a server-only Payload property (verified against installed types) — no `NEXT_PUBLIC_` exposure, consistent with security rules.
- **Type consistency:** `fetchPageBySlugDraft`, `getPageBySlug`, `PageDoc`, `toPageDoc`, `mapContentPageToPageData`, `mapContentBlock`, `plainTextToLexical`, `isValidPreviewToken`, `SectionRowLabel`, `PreviewRefresh` names are used identically across tasks.
