# Page Builder — iframe Server Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the visual page builder render the real storefront blocks (incl. live, server-fetched data like `FeaturedCollection`) inside a server-rendered `<iframe>`, fixing the Docker/`next build` failure caused by server-only code being pulled into the client bundle.

**Architecture:** The client `EditorShell` no longer imports `RenderBlocks`. Instead it embeds an `<iframe>` pointing at a new admin-gated server route (`/[locale]/build/[slug]/preview`) that server-renders the draft page's blocks — each wrapped in a thin client frame that reports clicks. The shell and the iframe communicate over a small `postMessage` protocol: iframe → parent for `ready` + block `select`; parent → iframe for `highlight` + `refresh`. Structural editing (add / reorder / duplicate / delete) moves to a left "layers" rail (dnd-kit), field editing stays in the existing right panel, and the iframe re-renders after each debounced autosave so the preview reflects live server data.

**Tech Stack:** Next.js 15 (App Router, RSC), Payload CMS 3.84, React 19 client components, TypeScript (strict), Tailwind CSS 4, dnd-kit (already a dep), Vitest.

## Global Constraints

- Do **not** modify `components/blocks/*` render components or `lib/payload-products.ts` / `lib/page-builder.ts` data-layer fetches. The fix works by changing *where* blocks render, not the blocks themselves.
- New builder UI lives under `components/page-builder/` (and `components/page-builder/preview/`); new logic under `lib/page-builder/`; the new route under `app/[locale]/build/[slug]/preview/`.
- Reuse existing pieces unchanged: `FieldRenderer`, `BlockToolbar`, `AddSectionPicker`, `MediaPicker`, `use-autosave`, the layout reducers (`lib/page-builder/layout-reducer.ts`), `createDefaultBlock`, `getBlockSchemas`, `isAuthorizedAdmin`, `fetchPageBySlugDraft`.
- Same-origin only: every `postMessage` uses `window.location.origin` as `targetOrigin`, and every received message is validated by the protocol guards before use.
- TypeScript strict — no `any`. Run `node_modules/.bin/<bin>` directly, never `pnpm <script>` (the project's `pnpm <script>` wrapper hits a deps-status precheck that fails in this environment).
- Acceptance for the whole plan: `node_modules/.bin/next build` completes with **no** "You're importing a component that needs revalidateTag" errors, and `node_modules/.bin/vitest run` passes.

---

## File Structure

| File | Responsibility | New/Modified |
|------|----------------|--------------|
| `lib/page-builder/preview-messages.ts` | Typed `postMessage` protocol: message types, factory fns, type guards | Create |
| `lib/__tests__/preview-messages.test.ts` | Unit tests for the protocol guards/factories | Create |
| `components/page-builder/preview/PreviewBlockFrame.tsx` | `'use client'` wrapper around one rendered block: click → `select`, listens for `highlight`, draws selection outline | Create |
| `components/page-builder/preview/PreviewBridge.tsx` | `'use client'` invisible bridge: posts `ready` on mount, listens for `refresh` → `router.refresh()` | Create |
| `components/page-builder/preview/PreviewCanvas.tsx` | Server component: maps `layout` → `<PreviewBlockFrame>{RenderBlocks([block])}</PreviewBlockFrame>` | Create |
| `app/[locale]/build/[slug]/preview/page.tsx` | Admin-gated server route: auth + load draft + render `PreviewBridge` + `PreviewCanvas` | Create |
| `components/page-builder/LayersRail.tsx` | `'use client'` left rail: dnd-kit sortable block list, select/reorder/duplicate/delete/add | Create |
| `components/page-builder/EditorShell.tsx` | Rewritten client root: iframe canvas + rail + field panel + message sync + refresh-on-save | Modify |

`RenderBlocks` and the block components are **unchanged**; they simply stop being part of any client bundle once `EditorShell` drops its `RenderBlocks` import.

---

### Task 1: postMessage protocol module

**Files:**
- Create: `lib/page-builder/preview-messages.ts`
- Test: `lib/__tests__/preview-messages.test.ts`

**Interfaces:**
- Produces:
  - `type PreviewToParent = { source: 'pb'; type: 'ready' } | { source: 'pb'; type: 'select'; index: number }`
  - `type ParentToPreview = { source: 'pb'; type: 'highlight'; index: number | null } | { source: 'pb'; type: 'refresh' }`
  - `ready(): PreviewToParent`
  - `select(index: number): PreviewToParent`
  - `highlight(index: number | null): ParentToPreview`
  - `refresh(): ParentToPreview`
  - `isPreviewToParent(data: unknown): data is PreviewToParent`
  - `isParentToPreview(data: unknown): data is ParentToPreview`

- [ ] **Step 1: Write the failing test**

```ts
// lib/__tests__/preview-messages.test.ts
import { describe, it, expect } from 'vitest';
import {
  ready,
  select,
  highlight,
  refresh,
  isPreviewToParent,
  isParentToPreview,
} from '@/lib/page-builder/preview-messages';

describe('preview-messages protocol', () => {
  it('should build a select message carrying the block index', () => {
    expect(select(3)).toEqual({ source: 'pb', type: 'select', index: 3 });
  });

  it('should build a highlight message allowing null to clear selection', () => {
    expect(highlight(null)).toEqual({ source: 'pb', type: 'highlight', index: null });
  });

  it('should accept its own factory output as valid messages', () => {
    expect(isPreviewToParent(ready())).toBe(true);
    expect(isPreviewToParent(select(0))).toBe(true);
    expect(isParentToPreview(highlight(1))).toBe(true);
    expect(isParentToPreview(refresh())).toBe(true);
  });

  it('should reject foreign or malformed messages', () => {
    expect(isPreviewToParent({ type: 'select', index: 1 })).toBe(false); // missing source
    expect(isPreviewToParent({ source: 'pb', type: 'select' })).toBe(false); // missing index
    expect(isPreviewToParent('hello')).toBe(false);
    expect(isParentToPreview({ source: 'pb', type: 'bogus' })).toBe(false);
    expect(isParentToPreview(null)).toBe(false);
  });

  it('should not cross-accept directions', () => {
    expect(isParentToPreview(select(0))).toBe(false);
    expect(isPreviewToParent(refresh())).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node_modules/.bin/vitest run lib/__tests__/preview-messages.test.ts`
Expected: FAIL — cannot resolve `@/lib/page-builder/preview-messages`.

- [ ] **Step 3: Write the implementation**

```ts
// lib/page-builder/preview-messages.ts — typed postMessage protocol between the
// builder shell (parent) and the server-rendered preview iframe. Same-origin only.

const SOURCE = 'pb' as const;

export type PreviewToParent =
  | { source: typeof SOURCE; type: 'ready' }
  | { source: typeof SOURCE; type: 'select'; index: number };

export type ParentToPreview =
  | { source: typeof SOURCE; type: 'highlight'; index: number | null }
  | { source: typeof SOURCE; type: 'refresh' };

export function ready(): PreviewToParent {
  return { source: SOURCE, type: 'ready' };
}

export function select(index: number): PreviewToParent {
  return { source: SOURCE, type: 'select', index };
}

export function highlight(index: number | null): ParentToPreview {
  return { source: SOURCE, type: 'highlight', index };
}

export function refresh(): ParentToPreview {
  return { source: SOURCE, type: 'refresh' };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && (value as Record<string, unknown>).source === SOURCE;
}

export function isPreviewToParent(data: unknown): data is PreviewToParent {
  if (!isRecord(data)) return false;
  if (data.type === 'ready') return true;
  if (data.type === 'select') return typeof data.index === 'number';
  return false;
}

export function isParentToPreview(data: unknown): data is ParentToPreview {
  if (!isRecord(data)) return false;
  if (data.type === 'refresh') return true;
  if (data.type === 'highlight') return data.index === null || typeof data.index === 'number';
  return false;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node_modules/.bin/vitest run lib/__tests__/preview-messages.test.ts`
Expected: PASS (all assertions).

- [ ] **Step 5: Commit**

```bash
git add lib/page-builder/preview-messages.ts lib/__tests__/preview-messages.test.ts
git commit -m "feat(page-builder): typed postMessage protocol for iframe preview"
```

---

### Task 2: Preview render primitives (frame, bridge, canvas)

**Files:**
- Create: `components/page-builder/preview/PreviewBlockFrame.tsx`
- Create: `components/page-builder/preview/PreviewBridge.tsx`
- Create: `components/page-builder/preview/PreviewCanvas.tsx`

**Interfaces:**
- Consumes: `select`, `ready`, `isParentToPreview` from `@/lib/page-builder/preview-messages`; `RenderBlocks` from `@/components/blocks/RenderBlocks`; `PageBlock` type from `@/lib/page-builder`.
- Produces:
  - `PreviewBlockFrame` (default export) — props `{ index: number; children: ReactNode }`
  - `PreviewBridge` (default export) — no props
  - `PreviewCanvas` (default export) — props `{ blocks: PageBlock[] }`

- [ ] **Step 1: Create `PreviewBlockFrame` (client)**

```tsx
// components/page-builder/preview/PreviewBlockFrame.tsx — selectable wrapper
// around one server-rendered block inside the preview iframe.
'use client';
import { useEffect, useState, type ReactElement, type ReactNode } from 'react';
import { select, highlight, isParentToPreview } from '@/lib/page-builder/preview-messages';

type Props = { index: number; children: ReactNode };

export default function PreviewBlockFrame({ index, children }: Props): ReactElement {
  const [selected, setSelected] = useState(false);

  useEffect(() => {
    function onMessage(event: MessageEvent): void {
      if (event.origin !== window.location.origin) return;
      const msg = event.data;
      if (!isParentToPreview(msg) || msg.type !== 'highlight') return;
      setSelected(msg.index === index);
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [index]);

  return (
    <div
      data-pb-index={index}
      onClick={(e) => {
        e.stopPropagation();
        window.parent.postMessage(select(index), window.location.origin);
      }}
      className={
        'relative cursor-pointer outline-offset-[-2px] transition-[outline] ' +
        (selected ? 'outline outline-2 outline-blue-500' : 'hover:outline hover:outline-1 hover:outline-blue-300')
      }
    >
      {children}
    </div>
  );
}
```

Note: `highlight` is imported only so this file and the parent share one symbol source; it is referenced by the type guard. Keep the import even though only `isParentToPreview`/`select` are called — if the linter flags it as unused, drop `highlight` from this import line.

- [ ] **Step 2: Create `PreviewBridge` (client)**

```tsx
// components/page-builder/preview/PreviewBridge.tsx — invisible bridge that lives
// inside the preview iframe: announces readiness and refreshes on parent request.
'use client';
import { useEffect, type ReactElement } from 'react';
import { useRouter } from 'next/navigation';
import { ready, isParentToPreview } from '@/lib/page-builder/preview-messages';

export default function PreviewBridge(): ReactElement {
  const router = useRouter();

  useEffect(() => {
    function onMessage(event: MessageEvent): void {
      if (event.origin !== window.location.origin) return;
      const msg = event.data;
      if (isParentToPreview(msg) && msg.type === 'refresh') router.refresh();
    }
    window.addEventListener('message', onMessage);
    window.parent.postMessage(ready(), window.location.origin);
    return () => window.removeEventListener('message', onMessage);
  }, [router]);

  return <></>;
}
```

- [ ] **Step 3: Create `PreviewCanvas` (server)**

```tsx
// components/page-builder/preview/PreviewCanvas.tsx — server component that renders
// every draft block (incl. async/data blocks) wrapped in a selectable client frame.
import type { ReactElement } from 'react';
import RenderBlocks from '@/components/blocks/RenderBlocks';
import type { PageBlock } from '@/lib/page-builder';
import PreviewBlockFrame from './PreviewBlockFrame';

type Props = { blocks: PageBlock[] };

export default function PreviewCanvas({ blocks }: Props): ReactElement {
  if (!blocks || blocks.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-warm-400">
        This page has no sections yet. Add one from the layers panel.
      </div>
    );
  }
  return (
    <>
      {blocks.map((block, index) => (
        <PreviewBlockFrame key={index} index={index}>
          {/* RenderBlocks accepts a single-block array; async blocks render on the server here */}
          <RenderBlocks blocks={[block]} />
        </PreviewBlockFrame>
      ))}
    </>
  );
}
```

- [ ] **Step 4: Type-check the new files**

Run: `node_modules/.bin/tsc --noEmit`
Expected: no errors in the three new files. (Pre-existing unrelated errors, if any, are out of scope — confirm none reference `components/page-builder/preview/*`.)

- [ ] **Step 5: Commit**

```bash
git add components/page-builder/preview/
git commit -m "feat(page-builder): server-rendered selectable preview primitives"
```

---

### Task 3: Preview route

**Files:**
- Create: `app/[locale]/build/[slug]/preview/page.tsx`

**Interfaces:**
- Consumes: `getPayload`, `isAuthorizedAdmin`, `fetchPageBySlugDraft`, `PreviewCanvas`, `PreviewBridge`.
- Produces: route `/[locale]/build/[slug]/preview` rendering the draft layout. Mirrors the auth gate of `app/[locale]/build/[slug]/page.tsx`.

- [ ] **Step 1: Create the route (server component)**

```tsx
// app/[locale]/build/[slug]/preview/page.tsx — server-rendered preview surface
// embedded by EditorShell via <iframe>. Renders the REAL draft blocks.
import config from '@payload-config';
import { headers as nextHeaders } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import type { ReactElement } from 'react';
import { getPayload } from 'payload';
import { isAuthorizedAdmin } from '@/lib/page-builder/admin-guard';
import { fetchPageBySlugDraft } from '@/lib/page-builder';
import PreviewCanvas from '@/components/page-builder/preview/PreviewCanvas';
import PreviewBridge from '@/components/page-builder/preview/PreviewBridge';

type Props = { params: Promise<{ locale: string; slug: string }> };

export const dynamic = 'force-dynamic';

export default async function BuilderPreviewPage(props: Props): Promise<ReactElement> {
  const { locale, slug } = await props.params;
  const payload = await getPayload({ config });
  const requestHeaders = await nextHeaders();

  const authorized = await isAuthorizedAdmin(payload, requestHeaders);
  if (!authorized) {
    redirect(`/admin/login?redirect=${encodeURIComponent(`/${locale}/build/${slug}/preview`)}`);
  }

  const page = await fetchPageBySlugDraft(slug);
  if (!page) notFound();

  return (
    <div className="min-h-screen bg-white">
      <PreviewBridge />
      <PreviewCanvas blocks={page.layout} />
    </div>
  );
}
```

- [ ] **Step 2: Verify the route compiles in a build**

Run: `node_modules/.bin/next build`
Expected: the build progresses past the previous `revalidateTag` failure point. (`EditorShell` still imports `RenderBlocks` at this task, so the build may still fail on that import — that is fixed in Task 4. The goal of this step is only to confirm the new route itself introduces no compile error; scan output for any error citing `build/[slug]/preview` and fix before continuing.)

- [ ] **Step 3: Commit**

```bash
git add "app/[locale]/build/[slug]/preview/page.tsx"
git commit -m "feat(page-builder): admin-gated server preview route"
```

---

### Task 4: Rewrite EditorShell — iframe canvas + layers rail

**Files:**
- Create: `components/page-builder/LayersRail.tsx`
- Modify: `components/page-builder/EditorShell.tsx` (full rewrite)

**Interfaces:**
- Consumes: `highlight`, `refresh`, `isPreviewToParent` from `@/lib/page-builder/preview-messages`; reducers `insertBlock`, `moveBlock`, `duplicateBlock`, `deleteBlock`, `updateBlockField` from `@/lib/page-builder/layout-reducer`; `createDefaultBlock`; `useAutosave`; `FieldRenderer`; `AddSectionPicker`; `BlockSchema`; `PageDoc`/`PageBlock` types.
- Produces: the rewritten builder UI. No client import of `RenderBlocks` or any `components/blocks/*` — this is what clears the build.

- [ ] **Step 1: Create `LayersRail` (client)**

```tsx
// components/page-builder/LayersRail.tsx — left rail listing blocks; click to select,
// drag to reorder, per-row duplicate/delete, and add buttons. Structural editing lives
// here because dragging server-rendered blocks across the iframe boundary is unreliable.
'use client';
import type { ReactElement } from 'react';
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { PageBlock } from '@/lib/page-builder';
import type { BlockSchema } from '@/lib/page-builder/block-schemas';

type Props = {
  layout: PageBlock[];
  schemas: BlockSchema[];
  selectedIndex: number | null;
  onSelect: (index: number) => void;
  onReorder: (from: number, to: number) => void;
  onDuplicate: (index: number) => void;
  onDelete: (index: number) => void;
  onAdd: (at: number) => void;
};

function labelFor(block: PageBlock, schemas: BlockSchema[]): string {
  return schemas.find((s) => s.slug === block.blockType)?.label ?? block.blockType;
}

function Row({
  id,
  index,
  label,
  selected,
  onSelect,
  onDuplicate,
  onDelete,
}: {
  id: string;
  index: number;
  label: string;
  selected: boolean;
  onSelect: (index: number) => void;
  onDuplicate: (index: number) => void;
  onDelete: (index: number) => void;
}): ReactElement {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return (
    <li ref={setNodeRef} style={style} {...attributes}>
      <div
        onClick={() => onSelect(index)}
        className={
          'group flex items-center gap-2 rounded px-2 py-1.5 text-sm ' +
          (selected ? 'bg-blue-50 text-blue-700' : 'hover:bg-warm-100')
        }
      >
        <button
          type="button"
          {...listeners}
          className="cursor-grab text-warm-400 hover:text-warm-600"
          aria-label="Drag to reorder"
          onClick={(e) => e.stopPropagation()}
        >
          ⠿
        </button>
        <span className="flex-1 truncate">{label}</span>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDuplicate(index); }}
          className="opacity-0 group-hover:opacity-100 text-warm-400 hover:text-warm-700"
          aria-label="Duplicate"
        >
          ⧉
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDelete(index); }}
          className="opacity-0 group-hover:opacity-100 text-warm-400 hover:text-red-600"
          aria-label="Delete"
        >
          ✕
        </button>
      </div>
    </li>
  );
}

export default function LayersRail({
  layout,
  schemas,
  selectedIndex,
  onSelect,
  onReorder,
  onDuplicate,
  onDelete,
  onAdd,
}: Props): ReactElement {
  const handleDragEnd = (event: DragEndEvent): void => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    onReorder(Number(active.id), Number(over.id));
  };

  return (
    <aside className="flex w-64 flex-col border-r border-warm-200 bg-white">
      <div className="flex items-center justify-between border-b border-warm-200 px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-warm-500">Sections</span>
        <button type="button" onClick={() => onAdd(layout.length)} className="text-sm text-blue-600 hover:underline">
          + Add
        </button>
      </div>
      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={layout.map((_, i) => String(i))} strategy={verticalListSortingStrategy}>
          <ul className="flex-1 space-y-0.5 overflow-auto p-2">
            {layout.length === 0 && (
              <li className="px-2 py-4 text-center text-xs text-warm-400">No sections yet.</li>
            )}
            {layout.map((block, index) => (
              <Row
                key={index}
                id={String(index)}
                index={index}
                label={labelFor(block, schemas)}
                selected={selectedIndex === index}
                onSelect={onSelect}
                onDuplicate={onDuplicate}
                onDelete={onDelete}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </aside>
  );
}
```

Note: confirm `BlockSchema` exposes `slug` and `label` (open `lib/page-builder/block-schemas.ts`). If the label field is named differently (e.g. `name`), adjust `labelFor` accordingly.

- [ ] **Step 2: Rewrite `EditorShell` (client)**

```tsx
// components/page-builder/EditorShell.tsx — client root of the visual builder.
// Canvas is a server-rendered iframe; structural editing is in the layers rail;
// field editing in the right panel. No block components are imported here, so no
// server-only code leaks into the client bundle.
'use client';
import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';
import type { PageDoc, PageBlock } from '@/lib/page-builder';
import type { BlockSchema } from '@/lib/page-builder/block-schemas';
import FieldRenderer from './FieldRenderer';
import LayersRail from './LayersRail';
import AddSectionPicker from './AddSectionPicker';
import { updateBlockField, insertBlock, moveBlock, duplicateBlock, deleteBlock } from '@/lib/page-builder/layout-reducer';
import { createDefaultBlock } from '@/lib/page-builder/default-block';
import { useAutosave } from './use-autosave';
import { highlight, refresh, isPreviewToParent } from '@/lib/page-builder/preview-messages';

type Props = { locale: string; page: PageDoc; schemas: BlockSchema[] };

export default function EditorShell({ locale, page, schemas }: Props): ReactElement {
  const [layout, setLayout] = useState<PageBlock[]>(page.layout);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [addAt, setAddAt] = useState<number | null>(null);
  const { status, publish } = useAutosave(page.id, layout);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const readyRef = useRef(false);
  const pendingRefresh = useRef(false);

  const post = useCallback((msg: ReturnType<typeof highlight> | ReturnType<typeof refresh>): void => {
    iframeRef.current?.contentWindow?.postMessage(msg, window.location.origin);
  }, []);

  // Receive select/ready from the iframe.
  useEffect(() => {
    function onMessage(event: MessageEvent): void {
      if (event.origin !== window.location.origin) return;
      const msg = event.data;
      if (!isPreviewToParent(msg)) return;
      if (msg.type === 'select') setSelectedIndex(msg.index);
      if (msg.type === 'ready') {
        readyRef.current = true;
        if (pendingRefresh.current) {
          pendingRefresh.current = false;
          post(refresh());
        }
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [post]);

  // Mirror selection into the iframe.
  useEffect(() => {
    if (readyRef.current) post(highlight(selectedIndex));
  }, [selectedIndex, post]);

  // Re-render the preview after each completed autosave so live data reflects edits.
  useEffect(() => {
    if (status !== 'saved') return;
    if (readyRef.current) post(refresh());
    else pendingRefresh.current = true;
  }, [status, post]);

  const handlePick = (slug: string): void => {
    const block = createDefaultBlock(slug);
    if (block && addAt !== null) {
      setLayout((prev) => insertBlock(prev, addAt, block));
      setSelectedIndex(addAt);
    }
    setAddAt(null);
  };

  const handleFieldChange = (name: string, value: unknown): void => {
    if (selectedIndex === null) return;
    setLayout((prev) => updateBlockField(prev, selectedIndex, name, value));
  };

  const selectedBlock = selectedIndex !== null ? layout[selectedIndex] : null;
  const selectedSchema = selectedBlock ? schemas.find((s) => s.slug === selectedBlock.blockType) ?? null : null;

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center gap-4 border-b border-warm-200 bg-white px-4 py-2">
        <a href="/admin/collections/pages" className="text-sm text-warm-500 hover:underline">← Back</a>
        <span className="font-semibold">{page.title}</span>
        <span className="rounded-full bg-warm-100 px-2 py-0.5 text-xs uppercase text-warm-500">{page.status}</span>
        <span className="ml-auto text-xs text-warm-400">
          {status === 'saving' && 'Saving...'}
          {status === 'saved' && 'All changes saved'}
          {status === 'error' && 'Save failed -- retry'}
        </span>
        <button type="button" onClick={publish} className="rounded bg-warm-900 px-3 py-1 text-sm text-white">
          Publish
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <LayersRail
          layout={layout}
          schemas={schemas}
          selectedIndex={selectedIndex}
          onSelect={setSelectedIndex}
          onReorder={(from, to) => { setLayout((prev) => moveBlock(prev, from, to)); setSelectedIndex(to); }}
          onDuplicate={(index) => setLayout((prev) => duplicateBlock(prev, index))}
          onDelete={(index) => { setLayout((prev) => deleteBlock(prev, index)); setSelectedIndex(null); }}
          onAdd={(at) => setAddAt(at)}
        />

        <main className="flex-1 overflow-hidden bg-warm-50">
          <iframe
            ref={iframeRef}
            title="Page preview"
            src={`/${locale}/build/${page.slug}/preview`}
            className="h-full w-full border-0 bg-white"
          />
        </main>

        <aside className="w-80 overflow-auto border-l border-warm-200 bg-white">
          {selectedBlock && selectedSchema ? (
            <FieldRenderer
              schema={selectedSchema}
              values={selectedBlock as Record<string, unknown>}
              onChange={handleFieldChange}
            />
          ) : (
            <p className="p-4 text-sm text-warm-400">Select a section to edit its fields.</p>
          )}
        </aside>
      </div>

      {addAt !== null && (
        <AddSectionPicker schemas={schemas} onPick={handlePick} onClose={() => setAddAt(null)} />
      )}
    </div>
  );
}
```

- [ ] **Step 3: Build to confirm the original failure is gone**

Run: `node_modules/.bin/next build`
Expected: PASS — no "You're importing a component that needs revalidateTag" errors, and no error tracing through `components/page-builder/EditorShell.tsx`. If a different error appears (e.g. `BlockSchema.label` mismatch), fix per the note in Step 1.

- [ ] **Step 4: Run the unit tests**

Run: `node_modules/.bin/vitest run`
Expected: PASS — including the existing `layout-reducer`, `use-autosave-core`, `page-builder-draft` suites and the new `preview-messages` suite.

- [ ] **Step 5: Commit**

```bash
git add components/page-builder/EditorShell.tsx components/page-builder/LayersRail.tsx
git commit -m "feat(page-builder): iframe preview canvas with layers rail"
```

---

### Task 5: Full verification (next build + docker)

**Files:** none (verification only).

- [ ] **Step 1: Clean production build**

Run: `node_modules/.bin/prisma generate && node_modules/.bin/next build && node_modules/.bin/payload generate:importmap`
Expected: all three succeed — this mirrors the Dockerfile build line that was failing.

- [ ] **Step 2: Docker image build**

Docker requires sudo in this environment. Ask the user to run, or run if permitted:
`! sudo docker compose build app` (or the project's existing build command).
Expected: the `RUN node_modules/.bin/prisma generate && next build && payload generate:importmap` layer completes; image builds successfully.

- [ ] **Step 3: Smoke-check the builder manually (optional but recommended)**

Start the app, sign in as a Payload admin, open `/en/build/home` (adjust locale/slug), and confirm: the iframe renders the real blocks incl. a `FeaturedCollection` with live products; clicking a block selects it and highlights it; editing a field then waiting for "All changes saved" refreshes the preview; reorder/duplicate/delete in the rail work; Publish persists.

- [ ] **Step 4: Final commit (if any cleanup was needed)**

```bash
git add -A
git commit -m "chore(page-builder): verify iframe preview build"
```

---

## Known trade-offs (flagged, accepted by approach choice)

- **In-canvas drag → layers-rail drag.** dnd-kit cannot drag DOM nodes across an iframe boundary, so reorder/duplicate/delete move to the rail. Click-to-select still happens in the canvas. This is the robust path and was chosen with the iframe direction.
- **Preview lags edits by the autosave debounce (~800ms) and reloads the iframe** (scroll position resets) on each save. This is standard live-preview behavior (same pattern as Payload's `RefreshRouteOnSave`). Scroll restoration can be added later if needed.
- **The `lib/page-builder.ts` split is intentionally NOT done here.** It is not required for the fix (no client file value-imports the server module after this change) and bundling a refactor with the feature violates the separate-refactor rule. It remains a reasonable future hygiene task: move `blockAppearanceClasses` + types into a client-safe module so the data-layer file isn't a latent client-bundle footgun.

## Self-Review notes

- Spec coverage: build failure root cause (client bundle pulls server code) is resolved by Task 4 removing the `RenderBlocks` client import; live-data rendering preserved by Tasks 2–3 (server iframe). Selection/edit/add/reorder/duplicate/delete/publish all retained (Tasks 1–4). Verification in Task 5.
- Type consistency: `select`/`highlight`/`refresh`/`ready` + guards defined in Task 1 are the exact symbols consumed in Tasks 2 and 4. `PageBlock`/`PageDoc`/`BlockSchema` come from existing modules unchanged. Reducer names (`insertBlock`, `moveBlock`, `duplicateBlock`, `deleteBlock`, `updateBlockField`) match `lib/page-builder/layout-reducer.ts` as used by the current EditorShell.
- Placeholder scan: none — all code blocks are complete; the two "confirm field name" notes point at a concrete file to check.
