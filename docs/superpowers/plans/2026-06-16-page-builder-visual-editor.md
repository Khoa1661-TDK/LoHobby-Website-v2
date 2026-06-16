# Page Builder — Visual Canvas Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a SharePoint-style visual block builder — a dedicated admin canvas at `/[locale]/build/[slug]` that renders the real storefront page, lets admins select a block to edit its fields in a side panel, add/reorder/duplicate/delete blocks in place, autosaves to draft, and publishes — replacing Payload's admin form as the primary editing surface.

**Architecture:** A bespoke Next.js admin route (outside Payload's `/admin`) gated by a Payload admin session. A server component loads the draft page via the existing `fetchPageBySlugDraft` and renders the existing `RenderBlocks`. A client `EditorShell` holds the `layout` array in local state, overlays selection/hover/drag affordances, and drives a **schema-driven** field panel: one generic `FieldRenderer` reads serializable descriptors derived from the existing `src/payload/blocks/*.ts` definitions so the panel can never drift from the collection. Persistence is debounced autosave via Payload REST `PATCH /api/pages/:id`; Publish flips `status` and rides the existing `revalidatePageCache` afterChange hook. Media uses Payload's existing `/api/media` backend.

**Tech Stack:** Next.js 15 (App Router), Payload CMS 3.84, React 19 client components, TypeScript (strict), Tailwind CSS 4, dnd-kit (new dep) for drag-reorder, Vitest for unit tests.

---

## Conventions for every task

- **Test runner:** call the binary directly, not via pnpm script (the pnpm wrapper fails on this repo's deps check):
  `node_modules/.bin/vitest run <path>` and `node_modules/.bin/vitest run <path> -t "<name>"`.
- **Type check:** `node_modules/.bin/tsc --noEmit` (or `node_modules/.bin/next typegen` is NOT needed; types are hand-derived here).
- Tests live in `lib/__tests__/` (existing convention) or co-located `__tests__` next to new modules.
- All new builder code lives under `lib/page-builder/` (logic) and `components/page-builder/` (client UI) and `app/[locale]/build/` (route). Keep files focused and small.
- Imports use the `@/` path alias (e.g. `@/lib/page-builder/block-schemas`).
- Commit after each task with a Conventional Commit message; end the body with the Co-Authored-By trailer used by this repo.
- **Do not** modify `components/blocks/*` render components, `lib/page-builder.ts` data-layer fetches, or the public storefront routes except where a task explicitly says so.

## File Structure (locked decisions)

**Phase 1 — Read-only canvas**
- Create `lib/page-builder/block-schemas.ts` — serializable field descriptors derived from `src/payload/blocks/*.ts`. **Keystone.**
- Create `lib/page-builder/admin-guard.ts` — verify Payload admin session from request cookies.
- Create `app/[locale]/build/layout.tsx` — minimal builder shell layout (no storefront navbar/providers).
- Create `app/[locale]/build/[slug]/page.tsx` — server component: auth gate + load draft page + mount EditorShell.
- Create `components/page-builder/EditorShell.tsx` — client root; selection state; renders canvas + panel.
- Create `components/page-builder/FieldRenderer.tsx` — schema-driven field panel (read-only in Phase 1).
- Create `src/payload/components/OpenBuilderButton.tsx` — Payload UI button linking into the builder.

**Phase 2 — Editing**
- Create `lib/page-builder/layout-reducer.ts` — pure layout-mutation functions. **Keystone.**
- Create `lib/page-builder/conditions.ts` — conditional-field visibility evaluator.
- Create `components/page-builder/use-autosave.ts` — debounced PATCH hook + status.
- Modify `components/page-builder/EditorShell.tsx`, `FieldRenderer.tsx` — wire editing + top bar.

**Phase 3 — Structure ops**
- Create `lib/page-builder/default-block.ts` — build a default block instance from a schema.
- Create `components/page-builder/AddSectionPicker.tsx` — grid of block thumbnails.
- Create `components/page-builder/BlockToolbar.tsx` — up/down/duplicate/delete + drag handle.
- Modify `EditorShell.tsx` — add dnd-kit drag context, add-zones.

**Phase 4 — Media & arrays**
- Create `components/page-builder/MediaPicker.tsx` — browse/upload over `/api/media`.
- Create `lib/page-builder/array-reducer.ts` — nested-array row ops.
- Modify `FieldRenderer.tsx` — `upload` and `array` field types.

**Phase 5 — Homepage**
- Create `src/payload/blocks/Recommendations.ts`, `src/payload/blocks/RecentlyViewed.ts` — two new blocks.
- Create `components/blocks/Recommendations.tsx`, `components/blocks/RecentlyViewed.tsx` — render components.
- Create `lib/page-builder/home-seed.ts` — starting layout mirroring current homepage.
- Modify `src/payload/collections/Pages.ts`, `src/payload/blocks/index.ts`, `components/blocks/RenderBlocks.tsx`, `lib/page-builder.ts` — register the two blocks.
- Modify `src/payload/components/OpenBuilderButton.tsx` (or add a sibling) — "Set as homepage" action.

---

# Phase 1 — Read-only canvas

**Phase goal:** A working admin-gated route that renders the real draft blocks, lets you select a block, and shows its fields read-only in a side panel. Proves auth + schema-to-panel plumbing with zero write risk. Independently shippable.

---

### Task 1.1: Serializable block field schemas (keystone)

Derive a JSON-serializable descriptor of every block's fields from the existing Payload block definitions, so the client panel is generated from the same source the collection uses. We read the real `Block` objects (already imported in `src/payload/blocks/index.ts`) and flatten each `Field` into a `FieldDescriptor`.

**Files:**
- Create: `lib/page-builder/block-schemas.ts`
- Test: `lib/__tests__/block-schemas.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// lib/__tests__/block-schemas.test.ts
import { describe, expect, it } from 'vitest';
import {
  getBlockSchemas,
  getBlockSchema,
  type FieldDescriptor,
} from '@/lib/page-builder/block-schemas';

describe('getBlockSchemas', () => {
  it('should expose one schema per registered layout block', () => {
    const schemas = getBlockSchemas();
    const slugs = schemas.map((s) => s.slug);
    expect(slugs).toContain('hero');
    expect(slugs).toContain('faq');
    expect(slugs).toContain('gallery');
    expect(slugs).toHaveLength(13);
  });

  it('should describe hero text and select fields with options', () => {
    const hero = getBlockSchema('hero');
    expect(hero).not.toBeNull();
    const headline = hero!.fields.find((f) => f.name === 'headline');
    expect(headline).toMatchObject({ name: 'headline', type: 'text', required: true });
    const ctaStyle = hero!.fields.find((f) => f.name === 'ctaStyle');
    expect(ctaStyle?.type).toBe('select');
    expect(ctaStyle?.options).toEqual([
      { label: 'Primary', value: 'primary' },
      { label: 'Outline', value: 'outline' },
      { label: 'Minimal', value: 'minimal' },
    ]);
    expect(ctaStyle?.defaultValue).toBe('primary');
  });

  it('should describe upload fields and the appearance group', () => {
    const hero = getBlockSchema('hero')!;
    const image = hero.fields.find((f) => f.name === 'image');
    expect(image).toMatchObject({ type: 'upload', relationTo: 'media' });
    const bg = hero.fields.find((f) => f.name === 'background');
    expect(bg?.type).toBe('select');
    // backgroundCustom carries its condition flag so the panel can hide it.
    const custom = hero.fields.find((f) => f.name === 'backgroundCustom');
    expect(custom?.condition).toEqual({ field: 'background', equals: 'custom' });
  });

  it('should describe array fields with nested sub-fields', () => {
    const faq = getBlockSchema('faq')!;
    const items = faq.fields.find((f) => f.name === 'items') as FieldDescriptor;
    expect(items.type).toBe('array');
    expect(items.fields?.map((f) => f.name)).toEqual(['question', 'answer']);
    expect(items.fields?.find((f) => f.name === 'answer')?.type).toBe('richText');
  });

  it('should be JSON-serializable (no functions leak through)', () => {
    const schemas = getBlockSchemas();
    expect(() => JSON.parse(JSON.stringify(schemas))).not.toThrow();
    const roundTripped = JSON.parse(JSON.stringify(schemas));
    expect(roundTripped[0].fields[0]).not.toHaveProperty('condition.fn');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node_modules/.bin/vitest run lib/__tests__/block-schemas.test.ts`
Expected: FAIL — cannot find module `@/lib/page-builder/block-schemas`.

- [ ] **Step 3: Write the implementation**

```ts
// lib/page-builder/block-schemas.ts — serializable descriptors of page-builder block fields.
// Derived from the same Payload Block definitions the Pages collection uses, so the
// custom builder panel can never drift from the collection schema.
import type { Block, Field } from 'payload';
import {
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
} from '@/src/payload/blocks';

export type FieldCondition = { field: string; equals: unknown };

export type FieldDescriptor = {
  name: string;
  type: string;
  label?: string;
  required?: boolean;
  defaultValue?: unknown;
  options?: { label: string; value: string }[];
  relationTo?: string;
  /** Present for `array` fields. */
  fields?: FieldDescriptor[];
  /** Simplified, serializable condition (only the common siblingData equality form). */
  condition?: FieldCondition;
};

export type BlockSchema = {
  slug: string;
  label: string;
  imageURL?: string;
  fields: FieldDescriptor[];
};

const REGISTERED_BLOCKS: Block[] = [
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
];

/** Probe a Payload `admin.condition` fn against synthetic siblingData to recover the
 * common `siblingData?.x === 'y'` shape as serializable data. Returns undefined when the
 * condition is absent or does not match the simple equality pattern. */
function describeCondition(field: Field): FieldCondition | undefined {
  const condition = (field as { admin?: { condition?: unknown } }).admin?.condition;
  if (typeof condition !== 'function') return undefined;

  // Find which sibling field name + value flips the condition true.
  // We can only recover simple equality conditions; complex ones fall back to always-visible.
  const fn = condition as (data: unknown, sibling: Record<string, unknown>) => unknown;
  // Heuristic: appearance's only condition is background === 'custom'.
  for (const candidate of ['background'] as const) {
    for (const value of ['custom']) {
      try {
        if (fn({}, { [candidate]: value }) && !fn({}, {})) {
          return { field: candidate, equals: value };
        }
      } catch {
        /* ignore non-conforming conditions */
      }
    }
  }
  return undefined;
}

function describeField(field: Field): FieldDescriptor | null {
  // Only named, value-bearing fields are editable in the panel.
  if (!('name' in field) || typeof field.name !== 'string') return null;

  const base: FieldDescriptor = {
    name: field.name,
    type: field.type,
  };

  if ('label' in field && typeof field.label === 'string') base.label = field.label;
  if ('required' in field && typeof field.required === 'boolean') base.required = field.required;
  if ('defaultValue' in field && typeof field.defaultValue !== 'function') {
    base.defaultValue = field.defaultValue as unknown;
  }
  if ('options' in field && Array.isArray(field.options)) {
    base.options = field.options
      .map((opt) =>
        typeof opt === 'object' && opt && 'value' in opt
          ? { label: String(opt.label ?? opt.value), value: String(opt.value) }
          : { label: String(opt), value: String(opt) },
      );
  }
  if (field.type === 'upload' && 'relationTo' in field && typeof field.relationTo === 'string') {
    base.relationTo = field.relationTo;
  }
  if (field.type === 'array' && 'fields' in field && Array.isArray(field.fields)) {
    base.fields = field.fields
      .map(describeField)
      .filter((f): f is FieldDescriptor => f !== null);
  }
  const condition = describeCondition(field);
  if (condition) base.condition = condition;

  return base;
}

function describeBlock(block: Block): BlockSchema {
  const label =
    typeof block.labels?.singular === 'string' ? block.labels.singular : block.slug;
  return {
    slug: block.slug,
    label,
    imageURL: block.imageURL,
    fields: (block.fields ?? [])
      .map(describeField)
      .filter((f): f is FieldDescriptor => f !== null),
  };
}

let cached: BlockSchema[] | null = null;

export function getBlockSchemas(): BlockSchema[] {
  if (!cached) cached = REGISTERED_BLOCKS.map(describeBlock);
  return cached;
}

export function getBlockSchema(slug: string): BlockSchema | null {
  return getBlockSchemas().find((s) => s.slug === slug) ?? null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node_modules/.bin/vitest run lib/__tests__/block-schemas.test.ts`
Expected: PASS (5 tests). If the condition test fails, confirm `_appearance.ts` still uses `siblingData?.background === 'custom'` and adjust the probe candidates accordingly.

- [ ] **Step 5: Type check & commit**

Run: `node_modules/.bin/tsc --noEmit` (expect no new errors).

```bash
git add lib/page-builder/block-schemas.ts lib/__tests__/block-schemas.test.ts
git commit -m "feat(page-builder): serializable block field schemas for visual editor"
```

---

### Task 1.2: Admin session guard

Verify the request carries a valid Payload admin session (separate from the storefront NextAuth session). Reuse the existing pattern from `lib/payload-admin-sync.ts:254` (`payload.auth({ headers })`) and the `isPayloadAdminUser` allowlist check.

**Files:**
- Create: `lib/page-builder/admin-guard.ts`
- Test: `lib/__tests__/admin-guard.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// lib/__tests__/admin-guard.test.ts
import { describe, expect, it, vi } from 'vitest';
import { isAuthorizedAdmin } from '@/lib/page-builder/admin-guard';

describe('isAuthorizedAdmin', () => {
  it('should return true when payload.auth yields an allowlisted admin user', async () => {
    const payload = { auth: vi.fn().mockResolvedValue({ user: { email: 'admin@shop.test' } }) };
    const result = await isAuthorizedAdmin(payload as never, new Headers(), () => true);
    expect(result).toBe(true);
  });

  it('should return false when there is no user', async () => {
    const payload = { auth: vi.fn().mockResolvedValue({ user: null }) };
    const result = await isAuthorizedAdmin(payload as never, new Headers(), () => true);
    expect(result).toBe(false);
  });

  it('should return false when the user is not allowlisted', async () => {
    const payload = { auth: vi.fn().mockResolvedValue({ user: { email: 'nope@x.test' } }) };
    const result = await isAuthorizedAdmin(payload as never, new Headers(), () => false);
    expect(result).toBe(false);
  });

  it('should return false and not throw when auth rejects', async () => {
    const payload = { auth: vi.fn().mockRejectedValue(new Error('no session')) };
    const result = await isAuthorizedAdmin(payload as never, new Headers(), () => true);
    expect(result).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node_modules/.bin/vitest run lib/__tests__/admin-guard.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
// lib/page-builder/admin-guard.ts — verify a Payload admin session for builder routes.
import type { BasePayload } from 'payload';
import { isPayloadAdminUser } from '@/lib/payload-access';

type AuthLike = Pick<BasePayload, 'auth'>;

/** Pure, testable core: given a payload-auth-capable object, request headers, and an
 * allowlist predicate, resolve whether the caller is an authorized admin. */
export async function isAuthorizedAdmin(
  payload: AuthLike,
  headers: Headers,
  isAllowed: (user: unknown) => boolean = isPayloadAdminUser as (u: unknown) => boolean,
): Promise<boolean> {
  try {
    const { user } = await payload.auth({ headers });
    return isAllowed(user);
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node_modules/.bin/vitest run lib/__tests__/admin-guard.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/page-builder/admin-guard.ts lib/__tests__/admin-guard.test.ts
git commit -m "feat(page-builder): admin session guard for builder routes"
```

---

### Task 1.3: Builder route + layout (server)

Add the admin-gated route. It must live under `[locale]` but **outside** the `(storefront)` route group so it does not inherit the storefront navbar/footer/providers. The server component checks the admin session, loads the draft page, and mounts the client `EditorShell`.

**Files:**
- Create: `app/[locale]/build/layout.tsx`
- Create: `app/[locale]/build/[slug]/page.tsx`

- [ ] **Step 1: Create the builder layout**

```tsx
// app/[locale]/build/layout.tsx — minimal chrome for the visual page builder.
// Deliberately excludes the storefront navbar/footer/providers; the builder is a
// full-screen admin surface. Always dynamic — it reads the live admin session.
import type { ReactElement, ReactNode } from 'react';
import '../../globals.css';

export const dynamic = 'force-dynamic';

export default function BuilderLayout({
  children,
}: {
  children: ReactNode;
}): ReactElement {
  return <div className="min-h-screen bg-warm-100 text-warm-900">{children}</div>;
}
```

- [ ] **Step 2: Create the builder page (server component)**

```tsx
// app/[locale]/build/[slug]/page.tsx — admin-gated visual builder entry.
import config from '@payload-config';
import { headers as nextHeaders } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import type { ReactElement } from 'react';
import { getPayload } from 'payload';
import { isAuthorizedAdmin } from '@/lib/page-builder/admin-guard';
import { getBlockSchemas } from '@/lib/page-builder/block-schemas';
import { fetchPageBySlugDraft } from '@/lib/page-builder';
import EditorShell from '@/components/page-builder/EditorShell';

type Props = { params: Promise<{ locale: string; slug: string }> };

export const dynamic = 'force-dynamic';

export default async function BuilderPage(props: Props): Promise<ReactElement> {
  const { locale, slug } = await props.params;
  const payload = await getPayload({ config });
  const requestHeaders = await nextHeaders();

  const authorized = await isAuthorizedAdmin(payload, requestHeaders);
  if (!authorized) {
    // Bounce to the Payload admin login, returning here afterwards.
    redirect(`/admin/login?redirect=${encodeURIComponent(`/${locale}/build/${slug}`)}`);
  }

  const page = await fetchPageBySlugDraft(slug);
  if (!page) notFound();

  return (
    <EditorShell
      locale={locale}
      page={page}
      schemas={getBlockSchemas()}
    />
  );
}
```

- [ ] **Step 3: Verify it type-checks and compiles**

Run: `node_modules/.bin/tsc --noEmit`
Expected: errors only about the not-yet-created `EditorShell` import. Proceed to Task 1.4 which creates it; do not commit a broken build. (If executing strictly task-by-task, create a temporary stub `EditorShell` returning `<div/>` now and replace it in 1.4 — but prefer doing 1.3 and 1.4 in one commit since they are interdependent.)

- [ ] **Step 4: Commit (together with Task 1.4)**

Defer commit until Task 1.4 so the route compiles. See Task 1.4 Step 5.

---

### Task 1.4: EditorShell + read-only FieldRenderer (client)

The client root holds selection state and renders the canvas (real blocks via `RenderBlocks`) plus a right-hand panel. In Phase 1 the panel renders fields **read-only** (disabled inputs) to prove the schema→panel mapping.

**Files:**
- Create: `components/page-builder/EditorShell.tsx`
- Create: `components/page-builder/FieldRenderer.tsx`

- [ ] **Step 1: Create FieldRenderer (read-only)**

```tsx
// components/page-builder/FieldRenderer.tsx — schema-driven field panel.
'use client';
import type { ReactElement } from 'react';
import type { BlockSchema, FieldDescriptor } from '@/lib/page-builder/block-schemas';

type Props = {
  schema: BlockSchema;
  values: Record<string, unknown>;
  /** Phase 1: omit to render read-only. Phase 2 wires this. */
  onChange?: (name: string, value: unknown) => void;
};

const APPEARANCE_FIELDS = new Set([
  'background',
  'backgroundCustom',
  'containerWidth',
  'paddingY',
]);

export default function FieldRenderer({ schema, values, onChange }: Props): ReactElement {
  const sectionFields = schema.fields.filter((f) => !APPEARANCE_FIELDS.has(f.name));
  const appearanceFields = schema.fields.filter((f) => APPEARANCE_FIELDS.has(f.name));

  return (
    <div className="flex flex-col gap-4 p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-warm-500">
        {schema.label}
      </h2>
      {sectionFields.map((field) => (
        <Field key={field.name} field={field} value={values[field.name]} onChange={onChange} />
      ))}
      {appearanceFields.length > 0 && (
        <details className="rounded border border-warm-200">
          <summary className="cursor-pointer px-3 py-2 text-sm font-medium">Appearance</summary>
          <div className="flex flex-col gap-4 p-3">
            {appearanceFields.map((field) => (
              <Field
                key={field.name}
                field={field}
                value={values[field.name]}
                onChange={onChange}
              />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function Field({
  field,
  value,
  onChange,
}: {
  field: FieldDescriptor;
  value: unknown;
  onChange?: (name: string, value: unknown) => void;
}): ReactElement | null {
  const disabled = !onChange;
  const label = field.label ?? field.name;
  const id = `fld-${field.name}`;
  const set = (v: unknown) => onChange?.(field.name, v);

  const control = (() => {
    switch (field.type) {
      case 'text':
        return (
          <input
            id={id}
            type="text"
            className="rounded border border-warm-300 px-2 py-1 text-sm"
            value={typeof value === 'string' ? value : ''}
            disabled={disabled}
            onChange={(e) => set(e.target.value)}
          />
        );
      case 'textarea':
        return (
          <textarea
            id={id}
            className="rounded border border-warm-300 px-2 py-1 text-sm"
            rows={3}
            value={typeof value === 'string' ? value : ''}
            disabled={disabled}
            onChange={(e) => set(e.target.value)}
          />
        );
      case 'select':
        return (
          <select
            id={id}
            className="rounded border border-warm-300 px-2 py-1 text-sm"
            value={typeof value === 'string' ? value : ''}
            disabled={disabled}
            onChange={(e) => set(e.target.value)}
          >
            {(field.options ?? []).map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );
      default:
        // upload / array / richText handled in later phases; show a placeholder badge.
        return (
          <span className="text-xs italic text-warm-400">
            {field.type} field — editable in a later phase
          </span>
        );
    }
  })();

  return (
    <label htmlFor={id} className="flex flex-col gap-1">
      <span className="text-xs font-medium text-warm-600">{label}</span>
      {control}
    </label>
  );
}
```

- [ ] **Step 2: Create EditorShell**

```tsx
// components/page-builder/EditorShell.tsx — client root of the visual builder.
'use client';
import { useState, type ReactElement } from 'react';
import RenderBlocks from '@/components/blocks/RenderBlocks';
import type { PageDoc, PageBlock } from '@/lib/page-builder';
import type { BlockSchema } from '@/lib/page-builder/block-schemas';
import FieldRenderer from './FieldRenderer';

type Props = {
  locale: string;
  page: PageDoc;
  schemas: BlockSchema[];
};

export default function EditorShell({ locale, page, schemas }: Props): ReactElement {
  const [layout] = useState<PageBlock[]>(page.layout);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const selectedBlock = selectedIndex !== null ? layout[selectedIndex] : null;
  const selectedSchema = selectedBlock
    ? schemas.find((s) => s.slug === selectedBlock.blockType) ?? null
    : null;

  return (
    <div className="flex h-screen flex-col">
      {/* Top bar */}
      <header className="flex items-center gap-4 border-b border-warm-200 bg-white px-4 py-2">
        <a href={`/admin/collections/pages`} className="text-sm text-warm-500 hover:underline">
          ← Back
        </a>
        <span className="font-semibold">{page.title}</span>
        <span className="rounded-full bg-warm-100 px-2 py-0.5 text-xs uppercase text-warm-500">
          {page.status}
        </span>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Canvas */}
        <main className="flex-1 overflow-auto bg-warm-50 p-6">
          <div className="mx-auto max-w-screen-xl bg-white shadow-sm">
            {layout.map((block, index) => (
              <div
                key={index}
                onClick={() => setSelectedIndex(index)}
                className={
                  'relative cursor-pointer outline-offset-2 ' +
                  (selectedIndex === index ? 'outline outline-2 outline-blue-500' : '')
                }
              >
                <RenderBlocks blocks={[block]} />
              </div>
            ))}
          </div>
        </main>

        {/* Right panel */}
        <aside className="w-80 overflow-auto border-l border-warm-200 bg-white">
          {selectedBlock && selectedSchema ? (
            <FieldRenderer
              schema={selectedSchema}
              values={selectedBlock as Record<string, unknown>}
            />
          ) : (
            <p className="p-4 text-sm text-warm-400">Select a section to edit its fields.</p>
          )}
        </aside>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Manual verification (read-only canvas)**

Start dev server (`node_modules/.bin/next dev` or the project's dev command), log in to `/admin` as an allowlisted admin, then visit `/vi/build/<an-existing-page-slug>`.
Expected: top bar shows page title + status; clicking a section outlines it and the right panel lists its text/textarea/select fields disabled; appearance group collapsible. Non-admin (logged out) is redirected to `/admin/login`.

- [ ] **Step 4: Type check**

Run: `node_modules/.bin/tsc --noEmit`
Expected: no new errors.

- [ ] **Step 5: Commit (route + shell together)**

```bash
git add app/[locale]/build components/page-builder/EditorShell.tsx components/page-builder/FieldRenderer.tsx
git commit -m "feat(page-builder): read-only visual canvas route with schema-driven panel"
```

---

### Task 1.5: "Open builder" entry point in Payload admin

Add a custom Payload UI button to the Pages collection (list + edit views) linking to `/<defaultLocale>/build/<slug>`, and redirect new-page creation into the builder.

**Files:**
- Create: `src/payload/components/OpenBuilderButton.tsx`
- Modify: `src/payload/collections/Pages.ts`

- [ ] **Step 1: Create the button component**

```tsx
// src/payload/components/OpenBuilderButton.tsx — links from the Pages admin into the visual builder.
'use client';
import { useDocumentInfo } from '@payloadcms/ui';
import type { ReactElement } from 'react';
import { routing } from '@/i18n/routing';

export function OpenBuilderButton(): ReactElement | null {
  const { savedDocumentData } = useDocumentInfo();
  const slug =
    savedDocumentData && typeof savedDocumentData.slug === 'string'
      ? savedDocumentData.slug
      : '';
  if (!slug) return null;

  const href = `/${routing.defaultLocale}/build/${slug}`;
  return (
    <a
      href={href}
      className="btn btn--style-primary"
      style={{ display: 'inline-flex', marginBottom: '1rem' }}
    >
      Open visual builder
    </a>
  );
}
```

- [ ] **Step 2: Register the button in the Pages collection admin config**

In `src/payload/collections/Pages.ts`, add to the `admin` object (alongside `livePreview`):

```ts
    components: {
      beforeDocumentControls: ['@/src/payload/components/OpenBuilderButton#OpenBuilderButton'],
    },
```

(Place it inside `admin: { ... }` in the `Pages` config. Confirm the slot name against the installed Payload version — `beforeDocumentControls` is valid in 3.84; if the build warns, fall back to `admin.components.edit.SaveButton` area or a `description`-adjacent slot.)

- [ ] **Step 3: Verify in admin**

Restart dev server, open an existing page in `/admin`. Expected: an "Open visual builder" button appears and navigates to the builder route.

- [ ] **Step 4: Commit**

```bash
git add src/payload/components/OpenBuilderButton.tsx src/payload/collections/Pages.ts
git commit -m "feat(page-builder): open-builder entry point in Pages admin"
```

**Phase 1 acceptance:** Admin can open `/[locale]/build/[slug]`, see real blocks, select one, and read its fields. Non-admins are redirected. All unit tests green; `tsc --noEmit` clean.

---

# Phase 2 — Editing

**Phase goal:** Make the panel write. Text/textarea/select edits update local state, autosave to draft via Payload REST, and a Publish button flips status. Save indicators in the top bar. Independently shippable.

---

### Task 2.1: Pure layout reducer (keystone)

All structural mutations go through pure functions so they are unit-testable and reused by autosave. Phase 2 uses `updateBlockField`; Phase 3 uses the rest.

**Files:**
- Create: `lib/page-builder/layout-reducer.ts`
- Test: `lib/__tests__/layout-reducer.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// lib/__tests__/layout-reducer.test.ts
import { describe, expect, it } from 'vitest';
import {
  updateBlockField,
  moveBlock,
  duplicateBlock,
  deleteBlock,
  insertBlock,
} from '@/lib/page-builder/layout-reducer';
import type { PageBlock } from '@/lib/page-builder';

const layout: PageBlock[] = [
  { blockType: 'hero', headline: 'A' } as PageBlock,
  { blockType: 'divider' } as PageBlock,
  { blockType: 'faq', title: 'Q' } as PageBlock,
];

describe('updateBlockField', () => {
  it('should set a field on the targeted block without mutating the input', () => {
    const next = updateBlockField(layout, 1, 'headline', 'B');
    expect((next[1] as Record<string, unknown>).headline).toBe('B');
    expect((layout[1] as Record<string, unknown>).headline).toBeUndefined();
  });
  it('should return the same array reference shape but a new array', () => {
    const next = updateBlockField(layout, 0, 'headline', 'Z');
    expect(next).not.toBe(layout);
    expect((next[0] as Record<string, unknown>).headline).toBe('Z');
  });
});

describe('moveBlock', () => {
  it('should move a block down', () => {
    const next = moveBlock(layout, 0, 1);
    expect(next.map((b) => b.blockType)).toEqual(['divider', 'hero', 'faq']);
  });
  it('should clamp out-of-range targets', () => {
    const next = moveBlock(layout, 2, 99);
    expect(next.map((b) => b.blockType)).toEqual(['hero', 'divider', 'faq']);
  });
});

describe('duplicateBlock', () => {
  it('should insert a deep copy right after the original', () => {
    const next = duplicateBlock(layout, 2);
    expect(next).toHaveLength(4);
    expect(next[3].blockType).toBe('faq');
    expect(next[3]).not.toBe(layout[2]);
  });
});

describe('deleteBlock', () => {
  it('should remove the targeted block', () => {
    const next = deleteBlock(layout, 1);
    expect(next.map((b) => b.blockType)).toEqual(['hero', 'faq']);
  });
});

describe('insertBlock', () => {
  it('should insert a new block at the given index', () => {
    const block = { blockType: 'newsletter' } as PageBlock;
    const next = insertBlock(layout, 1, block);
    expect(next.map((b) => b.blockType)).toEqual(['hero', 'newsletter', 'divider', 'faq']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node_modules/.bin/vitest run lib/__tests__/layout-reducer.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
// lib/page-builder/layout-reducer.ts — pure, immutable mutations of the page `layout` array.
import type { PageBlock } from '@/lib/page-builder';

function clone<T>(value: T): T {
  return structuredClone(value);
}

export function updateBlockField(
  layout: PageBlock[],
  index: number,
  name: string,
  value: unknown,
): PageBlock[] {
  return layout.map((block, i) =>
    i === index ? ({ ...block, [name]: value } as PageBlock) : block,
  );
}

export function insertBlock(
  layout: PageBlock[],
  index: number,
  block: PageBlock,
): PageBlock[] {
  const clamped = Math.max(0, Math.min(index, layout.length));
  return [...layout.slice(0, clamped), block, ...layout.slice(clamped)];
}

export function deleteBlock(layout: PageBlock[], index: number): PageBlock[] {
  return layout.filter((_, i) => i !== index);
}

export function duplicateBlock(layout: PageBlock[], index: number): PageBlock[] {
  const source = layout[index];
  if (!source) return layout;
  const copy = clone(source);
  return [...layout.slice(0, index + 1), copy, ...layout.slice(index + 1)];
}

export function moveBlock(layout: PageBlock[], from: number, to: number): PageBlock[] {
  if (from < 0 || from >= layout.length) return layout;
  const target = Math.max(0, Math.min(to, layout.length - 1));
  if (from === target) return layout;
  const next = [...layout];
  const [moved] = next.splice(from, 1);
  next.splice(target, 0, moved);
  return next;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node_modules/.bin/vitest run lib/__tests__/layout-reducer.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/page-builder/layout-reducer.ts lib/__tests__/layout-reducer.test.ts
git commit -m "feat(page-builder): pure layout-mutation reducer"
```

---

### Task 2.2: Conditional-field visibility

A pure evaluator the panel uses to hide fields whose `condition` is unmet (e.g. `backgroundCustom` hidden unless `background === 'custom'`).

**Files:**
- Create: `lib/page-builder/conditions.ts`
- Test: `lib/__tests__/conditions.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// lib/__tests__/conditions.test.ts
import { describe, expect, it } from 'vitest';
import { isFieldVisible } from '@/lib/page-builder/conditions';
import type { FieldDescriptor } from '@/lib/page-builder/block-schemas';

const custom: FieldDescriptor = {
  name: 'backgroundCustom',
  type: 'text',
  condition: { field: 'background', equals: 'custom' },
};

describe('isFieldVisible', () => {
  it('should hide a conditional field when the sibling value does not match', () => {
    expect(isFieldVisible(custom, { background: 'theme' })).toBe(false);
  });
  it('should show a conditional field when the sibling value matches', () => {
    expect(isFieldVisible(custom, { background: 'custom' })).toBe(true);
  });
  it('should always show fields without a condition', () => {
    expect(isFieldVisible({ name: 'headline', type: 'text' }, {})).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node_modules/.bin/vitest run lib/__tests__/conditions.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
// lib/page-builder/conditions.ts — evaluate serializable field conditions against block values.
import type { FieldDescriptor } from '@/lib/page-builder/block-schemas';

export function isFieldVisible(
  field: FieldDescriptor,
  values: Record<string, unknown>,
): boolean {
  if (!field.condition) return true;
  return values[field.condition.field] === field.condition.equals;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node_modules/.bin/vitest run lib/__tests__/conditions.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Wire visibility into FieldRenderer & commit**

In `components/page-builder/FieldRenderer.tsx`, import `isFieldVisible` and filter both `sectionFields` and `appearanceFields`:

```ts
import { isFieldVisible } from '@/lib/page-builder/conditions';
// ...
const visible = (f: FieldDescriptor) => isFieldVisible(f, values);
const sectionFields = schema.fields.filter((f) => !APPEARANCE_FIELDS.has(f.name) && visible(f));
const appearanceFields = schema.fields.filter((f) => APPEARANCE_FIELDS.has(f.name) && visible(f));
```

```bash
git add lib/page-builder/conditions.ts lib/__tests__/conditions.test.ts components/page-builder/FieldRenderer.tsx
git commit -m "feat(page-builder): conditional field visibility in editor panel"
```

---

### Task 2.3: Autosave hook

Debounced PATCH to `/api/pages/:id` writing `layout` + `status: 'draft'`, authenticated by the admin cookie (same-origin fetch includes it). Exposes a `'idle' | 'saving' | 'saved' | 'error'` status.

**Files:**
- Create: `components/page-builder/use-autosave.ts`
- Test: `lib/__tests__/use-autosave-core.test.ts` (tests the pure debounce/serialize core, not the React hook)

- [ ] **Step 1: Write the failing test (pure core)**

```ts
// lib/__tests__/use-autosave-core.test.ts
import { describe, expect, it, vi } from 'vitest';
import { buildPatchBody } from '@/components/page-builder/use-autosave';
import type { PageBlock } from '@/lib/page-builder';

describe('buildPatchBody', () => {
  it('should serialize layout with a draft status', () => {
    const layout: PageBlock[] = [{ blockType: 'divider' } as PageBlock];
    const body = buildPatchBody(layout, 'draft');
    expect(body).toEqual({ layout, status: 'draft' });
  });
  it('should serialize a published status when publishing', () => {
    const body = buildPatchBody([], 'published');
    expect(body.status).toBe('published');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node_modules/.bin/vitest run lib/__tests__/use-autosave-core.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the hook + pure core**

```ts
// components/page-builder/use-autosave.ts — debounced draft autosave + explicit publish.
'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { PageBlock } from '@/lib/page-builder';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export function buildPatchBody(
  layout: PageBlock[],
  status: 'draft' | 'published',
): { layout: PageBlock[]; status: 'draft' | 'published' } {
  return { layout, status };
}

async function patchPage(
  id: string | number,
  body: ReturnType<typeof buildPatchBody>,
): Promise<void> {
  const res = await fetch(`/api/pages/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Autosave failed: ${res.status}`);
}

export function useAutosave(pageId: string | number, layout: PageBlock[]) {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstRun = useRef(true);

  // Debounced draft save whenever layout changes (skip the initial mount).
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    setStatus('saving');
    timer.current = setTimeout(() => {
      patchPage(pageId, buildPatchBody(layout, 'draft'))
        .then(() => setStatus('saved'))
        .catch(() => setStatus('error'));
    }, 800);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [pageId, layout]);

  const publish = useCallback(async () => {
    setStatus('saving');
    try {
      await patchPage(pageId, buildPatchBody(layout, 'published'));
      setStatus('saved');
    } catch {
      setStatus('error');
    }
  }, [pageId, layout]);

  return { status, publish };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node_modules/.bin/vitest run lib/__tests__/use-autosave-core.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add components/page-builder/use-autosave.ts lib/__tests__/use-autosave-core.test.ts
git commit -m "feat(page-builder): debounced draft autosave + publish hook"
```

---

### Task 2.4: Wire editing into EditorShell

Make `layout` mutable, pass `onChange` into `FieldRenderer`, drive autosave, and add save-status + Publish to the top bar.

**Files:**
- Modify: `components/page-builder/EditorShell.tsx`

- [ ] **Step 1: Make layout stateful and editable**

Replace the `const [layout] = useState(...)` line and selection logic with:

```tsx
  const [layout, setLayout] = useState<PageBlock[]>(page.layout);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const { status, publish } = useAutosave(page.id, layout);

  const handleFieldChange = (name: string, value: unknown) => {
    if (selectedIndex === null) return;
    setLayout((prev) => updateBlockField(prev, selectedIndex, name, value));
  };
```

Add imports:

```tsx
import { updateBlockField } from '@/lib/page-builder/layout-reducer';
import { useAutosave } from './use-autosave';
```

- [ ] **Step 2: Pass onChange to the panel**

Change the `<FieldRenderer ... />` usage to include `onChange={handleFieldChange}`.

- [ ] **Step 3: Add save indicator + Publish to the top bar**

Insert into the `<header>`:

```tsx
        <span className="ml-auto text-xs text-warm-400">
          {status === 'saving' && 'Saving…'}
          {status === 'saved' && 'All changes saved'}
          {status === 'error' && 'Save failed — retry'}
        </span>
        <button
          type="button"
          onClick={publish}
          className="rounded bg-warm-900 px-3 py-1 text-sm text-white"
        >
          Publish
        </button>
```

- [ ] **Step 4: Manual verification**

In the builder, edit a Hero headline. Expected: canvas updates instantly; top bar shows "Saving…" then "All changes saved"; reload the page (draft) and the change persists. Click Publish; visit the public storefront route and confirm the change is live (revalidation fired).

- [ ] **Step 5: Type check & commit**

Run: `node_modules/.bin/tsc --noEmit`

```bash
git add components/page-builder/EditorShell.tsx
git commit -m "feat(page-builder): editable panel with autosave and publish"
```

**Phase 2 acceptance:** Text/textarea/select edits autosave to draft and survive reload; Publish makes them live; conditional fields hide/show correctly. Unit tests green.

---

# Phase 3 — Structure ops

**Phase goal:** Add sections from a picker, delete/duplicate, and reorder via drag-and-drop plus up/down buttons. Independently shippable.

---

### Task 3.1: Default-block factory

Build a fresh block instance from its schema's `defaultValue`s (and sensible empties), used when adding a section.

**Files:**
- Create: `lib/page-builder/default-block.ts`
- Test: `lib/__tests__/default-block.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// lib/__tests__/default-block.test.ts
import { describe, expect, it } from 'vitest';
import { createDefaultBlock } from '@/lib/page-builder/default-block';

describe('createDefaultBlock', () => {
  it('should set blockType and apply schema default values', () => {
    const block = createDefaultBlock('hero');
    expect(block).not.toBeNull();
    expect(block!.blockType).toBe('hero');
    expect((block as Record<string, unknown>).ctaStyle).toBe('primary');
    expect((block as Record<string, unknown>).background).toBe('theme');
  });
  it('should seed required array fields with one empty row', () => {
    const block = createDefaultBlock('faq') as Record<string, unknown>;
    expect(Array.isArray(block.items)).toBe(true);
    expect((block.items as unknown[]).length).toBe(1);
  });
  it('should return null for an unknown block type', () => {
    expect(createDefaultBlock('nope')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node_modules/.bin/vitest run lib/__tests__/default-block.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
// lib/page-builder/default-block.ts — instantiate a fresh block from its schema defaults.
import { getBlockSchema, type FieldDescriptor } from '@/lib/page-builder/block-schemas';
import type { PageBlock } from '@/lib/page-builder';

function defaultForField(field: FieldDescriptor): unknown {
  if (field.defaultValue !== undefined) return field.defaultValue;
  if (field.type === 'array') {
    if (field.required) {
      const row: Record<string, unknown> = {};
      for (const sub of field.fields ?? []) row[sub.name] = defaultForField(sub);
      return [row];
    }
    return [];
  }
  if (field.type === 'text' || field.type === 'textarea') return '';
  return null;
}

export function createDefaultBlock(slug: string): PageBlock | null {
  const schema = getBlockSchema(slug);
  if (!schema) return null;
  const block: Record<string, unknown> = { blockType: slug };
  for (const field of schema.fields) {
    block[field.name] = defaultForField(field);
  }
  return block as PageBlock;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node_modules/.bin/vitest run lib/__tests__/default-block.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/page-builder/default-block.ts lib/__tests__/default-block.test.ts
git commit -m "feat(page-builder): default-block factory from schema defaults"
```

---

### Task 3.2: Add-section picker

A modal grid of the 13 block thumbnails (reuse `schema.imageURL`); choosing one inserts a default block at the target index.

**Files:**
- Create: `components/page-builder/AddSectionPicker.tsx`
- Modify: `components/page-builder/EditorShell.tsx`

- [ ] **Step 1: Create the picker**

```tsx
// components/page-builder/AddSectionPicker.tsx
'use client';
import type { ReactElement } from 'react';
import type { BlockSchema } from '@/lib/page-builder/block-schemas';

type Props = {
  schemas: BlockSchema[];
  onPick: (slug: string) => void;
  onClose: () => void;
};

export default function AddSectionPicker({ schemas, onPick, onClose }: Props): ReactElement {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="max-h-[80vh] w-[640px] overflow-auto rounded-lg bg-white p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-3 text-sm font-semibold">Add a section</h2>
        <div className="grid grid-cols-3 gap-3">
          {schemas.map((schema) => (
            <button
              key={schema.slug}
              type="button"
              onClick={() => onPick(schema.slug)}
              className="flex flex-col items-center gap-2 rounded border border-warm-200 p-2 text-xs hover:border-blue-400"
            >
              {schema.imageURL && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={schema.imageURL} alt="" className="h-16 w-full object-contain" />
              )}
              <span>{schema.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire add-zones into EditorShell**

In `EditorShell.tsx`: add state `const [addAt, setAddAt] = useState<number | null>(null);`, import `createDefaultBlock` and `insertBlock`, render a thin "+ Add section" button between blocks and after the last one that sets `setAddAt(index)`, and render `<AddSectionPicker>` when `addAt !== null`:

```tsx
  const handlePick = (slug: string) => {
    const block = createDefaultBlock(slug);
    if (block && addAt !== null) setLayout((prev) => insertBlock(prev, addAt, block));
    setAddAt(null);
  };
```

Add the "+ Add section" affordance after each block's wrapper `<div>` (and one before index 0).

- [ ] **Step 3: Manual verification**

Click "+ Add section", pick e.g. Newsletter. Expected: a Newsletter block appears at that position, autosaves; reload persists it.

- [ ] **Step 4: Commit**

```bash
git add components/page-builder/AddSectionPicker.tsx components/page-builder/EditorShell.tsx
git commit -m "feat(page-builder): add-section picker with thumbnail grid"
```

---

### Task 3.3: Block toolbar (delete/duplicate/up/down)

Hover toolbar over the selected/hovered block with up/down/duplicate/delete; wired to the reducer functions from Task 2.1.

**Files:**
- Create: `components/page-builder/BlockToolbar.tsx`
- Modify: `components/page-builder/EditorShell.tsx`

- [ ] **Step 1: Create the toolbar**

```tsx
// components/page-builder/BlockToolbar.tsx
'use client';
import type { ReactElement } from 'react';

type Props = {
  index: number;
  count: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
};

export default function BlockToolbar({
  index,
  count,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onDelete,
}: Props): ReactElement {
  return (
    <div className="absolute right-2 top-2 z-10 flex gap-1 rounded bg-white/95 p-1 shadow">
      <button type="button" disabled={index === 0} onClick={onMoveUp} aria-label="Move up">↑</button>
      <button type="button" disabled={index === count - 1} onClick={onMoveDown} aria-label="Move down">↓</button>
      <button type="button" onClick={onDuplicate} aria-label="Duplicate">⧉</button>
      <button type="button" onClick={onDelete} aria-label="Delete">🗑</button>
    </div>
  );
}
```

- [ ] **Step 2: Wire toolbar into EditorShell**

Import `moveBlock`, `duplicateBlock`, `deleteBlock`. Render `<BlockToolbar>` inside the selected block wrapper, passing handlers that call `setLayout` with the matching reducer and fix up `selectedIndex` after delete (clear selection) / move.

- [ ] **Step 3: Manual verification**

Select a block, use ↑/↓ to reorder, ⧉ to duplicate, 🗑 to delete. Each autosaves and survives reload.

- [ ] **Step 4: Commit**

```bash
git add components/page-builder/BlockToolbar.tsx components/page-builder/EditorShell.tsx
git commit -m "feat(page-builder): block toolbar for reorder/duplicate/delete"
```

---

### Task 3.4: Drag-and-drop reorder (dnd-kit)

Add dnd-kit and wrap the canvas blocks in a sortable context; dropping calls `moveBlock`.

**Files:**
- Modify: `package.json` (add deps)
- Modify: `components/page-builder/EditorShell.tsx`

- [ ] **Step 1: Install dnd-kit**

Run (call binaries directly per repo convention if the pnpm wrapper blocks):
`node_modules/.bin/pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`
(If that is blocked, run `pnpm add ...` and accept the deps-check warning; the install still completes.)
Expected: three packages added to `package.json` dependencies.

- [ ] **Step 2: Wrap canvas in DndContext + SortableContext**

In `EditorShell.tsx`, import from `@dnd-kit/core` and `@dnd-kit/sortable`, give each block a stable id (use index-based ids regenerated each render, or attach a synthetic `_id`). Wrap the block list in `<DndContext onDragEnd={handleDragEnd}>` + `<SortableContext>`; make each block wrapper a `useSortable` item with a drag handle in the toolbar. `handleDragEnd` computes from/to and calls `setLayout((prev) => moveBlock(prev, from, to))`.

```tsx
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = Number(active.id);
    const to = Number(over.id);
    setLayout((prev) => moveBlock(prev, from, to));
  };
```

- [ ] **Step 3: Manual verification**

Drag a block by its handle to a new position. Expected: order updates, autosaves, persists. Up/down buttons still work.

- [ ] **Step 4: Type check & commit**

Run: `node_modules/.bin/tsc --noEmit`

```bash
git add package.json pnpm-lock.yaml components/page-builder/EditorShell.tsx
git commit -m "feat(page-builder): drag-and-drop section reorder via dnd-kit"
```

**Phase 3 acceptance:** Add/delete/duplicate/reorder all work via UI, autosave, and persist. Unit tests green.

---

# Phase 4 — Media & arrays

**Phase goal:** Editable `upload` (media picker) and `array` (repeatable rows) fields — the heavy field types. Independently shippable.

---

### Task 4.1: Nested-array reducer

Pure row operations for array fields (add/remove/move/update sub-field), mirroring the layout reducer but scoped to one block's array property.

**Files:**
- Create: `lib/page-builder/array-reducer.ts`
- Test: `lib/__tests__/array-reducer.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// lib/__tests__/array-reducer.test.ts
import { describe, expect, it } from 'vitest';
import { addRow, removeRow, moveRow, updateRowField } from '@/lib/page-builder/array-reducer';

const rows = [{ question: 'A', answer: 'a' }, { question: 'B', answer: 'b' }];

describe('array-reducer', () => {
  it('should add a row built from a template', () => {
    const next = addRow(rows, { question: '', answer: '' });
    expect(next).toHaveLength(3);
    expect(next[2]).toEqual({ question: '', answer: '' });
  });
  it('should remove a row immutably', () => {
    const next = removeRow(rows, 0);
    expect(next).toEqual([{ question: 'B', answer: 'b' }]);
    expect(rows).toHaveLength(2);
  });
  it('should move a row', () => {
    const next = moveRow(rows, 0, 1);
    expect(next.map((r) => r.question)).toEqual(['B', 'A']);
  });
  it('should update a sub-field on a row', () => {
    const next = updateRowField(rows, 1, 'question', 'Z');
    expect(next[1].question).toBe('Z');
    expect(rows[1].question).toBe('B');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node_modules/.bin/vitest run lib/__tests__/array-reducer.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
// lib/page-builder/array-reducer.ts — immutable ops for a block's array-field rows.
export type Row = Record<string, unknown>;

export function addRow(rows: Row[], template: Row): Row[] {
  return [...rows, structuredClone(template)];
}
export function removeRow(rows: Row[], index: number): Row[] {
  return rows.filter((_, i) => i !== index);
}
export function moveRow(rows: Row[], from: number, to: number): Row[] {
  if (from < 0 || from >= rows.length) return rows;
  const target = Math.max(0, Math.min(to, rows.length - 1));
  const next = [...rows];
  const [moved] = next.splice(from, 1);
  next.splice(target, 0, moved);
  return next;
}
export function updateRowField(rows: Row[], index: number, name: string, value: unknown): Row[] {
  return rows.map((row, i) => (i === index ? { ...row, [name]: value } : row));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node_modules/.bin/vitest run lib/__tests__/array-reducer.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/page-builder/array-reducer.ts lib/__tests__/array-reducer.test.ts
git commit -m "feat(page-builder): nested array-field reducer"
```

---

### Task 4.2: Media picker

Browse existing media (`GET /api/media?limit=...`) and upload new (`POST /api/media`, multipart), returning a selected media id + url to the field.

**Files:**
- Create: `components/page-builder/MediaPicker.tsx`
- Modify: `components/page-builder/FieldRenderer.tsx`

- [ ] **Step 1: Create MediaPicker**

```tsx
// components/page-builder/MediaPicker.tsx — browse + upload over Payload's /api/media.
'use client';
import { useEffect, useState, type ReactElement } from 'react';

type MediaDoc = { id: string | number; url?: string; filename?: string };

type Props = {
  onSelect: (media: MediaDoc) => void;
  onClose: () => void;
};

export default function MediaPicker({ onSelect, onClose }: Props): ReactElement {
  const [items, setItems] = useState<MediaDoc[]>([]);

  useEffect(() => {
    fetch('/api/media?limit=60&depth=0', { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((data) => setItems(Array.isArray(data?.docs) ? data.docs : []))
      .catch(() => setItems([]));
  }, []);

  const upload = async (file: File) => {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch('/api/media', {
      method: 'POST',
      credentials: 'same-origin',
      body: form,
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.doc) onSelect(data.doc as MediaDoc);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="max-h-[80vh] w-[680px] overflow-auto rounded-lg bg-white p-4" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Select media</h2>
          <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        </div>
        <div className="grid grid-cols-4 gap-2">
          {items.map((m) => (
            <button key={m.id} type="button" onClick={() => onSelect(m)} className="rounded border border-warm-200 p-1 hover:border-blue-400">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {m.url && <img src={m.url} alt={m.filename ?? ''} className="h-20 w-full object-cover" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add `upload` case to FieldRenderer**

In the `Field` component's `switch`, replace the `upload` branch (currently the default placeholder) with a thumbnail + "Choose image" button that opens `MediaPicker`; on select, call `set(media.id)` and keep the url for preview. Store the id (Payload expects the relation id on save); resolve the preview url from the depth-2 fetched value if present.

- [ ] **Step 3: Manual verification**

Select a Hero, open its image field, pick/upload an image. Expected: thumbnail shows, autosaves the media id; published page renders the image.

- [ ] **Step 4: Commit**

```bash
git add components/page-builder/MediaPicker.tsx components/page-builder/FieldRenderer.tsx
git commit -m "feat(page-builder): media picker for upload fields"
```

---

### Task 4.3: Array field editor

Render `array` fields as a repeatable list of sub-field groups with add/remove/reorder, driven by the Task 4.1 reducer.

**Files:**
- Modify: `components/page-builder/FieldRenderer.tsx`

- [ ] **Step 1: Add an ArrayField sub-component**

Add to `FieldRenderer.tsx` an `ArrayField` component: takes `field` (with `field.fields` sub-descriptors), the current rows array, and an `onChange(name, rows)` callback. Render each row as a bordered group of nested `<Field>` controls (reusing the same `Field` switch by recursion), plus "Add" and per-row remove/up/down using `addRow/removeRow/moveRow/updateRowField`. Build the add-template from the sub-fields' defaults (reuse `createDefaultBlock`'s `defaultForField` logic — extract it to `default-block.ts` as an exported helper `defaultRowFor(fields)` to keep DRY).

In the `Field` switch, replace the `array` placeholder branch with `<ArrayField .../>`.

- [ ] **Step 2: Export the row-template helper from default-block.ts**

In `lib/page-builder/default-block.ts`, export:

```ts
export function defaultRowFor(fields: FieldDescriptor[]): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  for (const f of fields) row[f.name] = defaultForField(f);
  return row;
}
```

- [ ] **Step 3: Manual verification**

Edit an FAQ block: add/remove/reorder items, edit question text. Each autosaves; published page reflects the items. (RichText sub-fields can remain a textarea-of-plain-text fallback for now — note this limitation; full Lexical editing is out of scope.)

- [ ] **Step 4: Commit**

```bash
git add components/page-builder/FieldRenderer.tsx lib/page-builder/default-block.ts
git commit -m "feat(page-builder): repeatable array-field editor in panel"
```

**Phase 4 acceptance:** Media and array fields are editable, autosave, and render correctly when published. Unit tests green.

---

# Phase 5 — Homepage

**Phase goal:** Make the homepage composable: two new dynamic blocks, a "seed from current homepage" starting layout, and a "Set as homepage" action. Independently shippable.

---

### Task 5.1: Two new blocks (Recommendations, RecentlyViewed)

Add block schemas + render components so the dynamic homepage sections become composable. Follow the exact pattern of existing blocks (`Block` def + appearance fields + a render component) and register in all the places existing blocks are registered.

**Files:**
- Create: `src/payload/blocks/Recommendations.ts`, `src/payload/blocks/RecentlyViewed.ts`
- Create: `components/blocks/Recommendations.tsx`, `components/blocks/RecentlyViewed.tsx`
- Modify: `src/payload/blocks/index.ts`, `src/payload/collections/Pages.ts` (the `layoutBlocks` list + `SectionRowLabel` BLOCK_LABELS), `components/blocks/RenderBlocks.tsx`, `lib/page-builder.ts` (`PageBlock` union), `lib/page-builder/block-schemas.ts` (`REGISTERED_BLOCKS`).

- [ ] **Step 1: Create the block schemas**

```ts
// src/payload/blocks/Recommendations.ts
import type { Block } from 'payload';
import { appearanceFields } from './_appearance';

export const Recommendations: Block = {
  slug: 'recommendations',
  labels: { singular: 'Personalized recommendations', plural: 'Personalized recommendations' },
  interfaceName: 'RecommendationsBlock',
  imageURL: '/admin/block-previews/featured-products.svg',
  imageAltText: 'Personalized recommendations preview',
  fields: [
    { name: 'title', type: 'text', defaultValue: 'Recommended for you' },
    { name: 'limit', type: 'number', defaultValue: 8 },
    ...appearanceFields,
  ],
};
```

```ts
// src/payload/blocks/RecentlyViewed.ts
import type { Block } from 'payload';
import { appearanceFields } from './_appearance';

export const RecentlyViewed: Block = {
  slug: 'recentlyViewed',
  labels: { singular: 'Recently viewed', plural: 'Recently viewed' },
  interfaceName: 'RecentlyViewedBlock',
  imageURL: '/admin/block-previews/featured-products.svg',
  imageAltText: 'Recently viewed preview',
  fields: [
    { name: 'title', type: 'text', defaultValue: 'Recently viewed' },
    { name: 'limit', type: 'number', defaultValue: 8 },
    ...appearanceFields,
  ],
};
```

- [ ] **Step 2: Create render components**

Mirror an existing data-driven render component (e.g. open `components/blocks/FeaturedProducts.tsx` to copy its shape). Each new component reuses the existing recommendations/recently-viewed data sources the hardcoded homepage already uses (find them under `app/api/recommendations` / the homepage component). If those are client components reading from an API, the block component can render the existing client widget. Keep the section/container wrapper consistent via `blockAppearanceClasses`.

- [ ] **Step 3: Register in all six places**

Add the two blocks to: `src/payload/blocks/index.ts` (exports), `Pages.ts` `layoutBlocks` + `SectionRowLabel` `BLOCK_LABELS`, `RenderBlocks.tsx` (import + switch cases), `lib/page-builder.ts` `PageBlock` union, and `block-schemas.ts` `REGISTERED_BLOCKS`.

- [ ] **Step 4: Update the schema count test**

In `lib/__tests__/block-schemas.test.ts`, change the expected length from 13 to 15 and add assertions for `recommendations` and `recentlyViewed`.

Run: `node_modules/.bin/vitest run lib/__tests__/block-schemas.test.ts`
Expected: PASS.

- [ ] **Step 5: Type check & commit**

Run: `node_modules/.bin/tsc --noEmit`

```bash
git add src/payload/blocks components/blocks/Recommendations.tsx components/blocks/RecentlyViewed.tsx src/payload/collections/Pages.ts components/blocks/RenderBlocks.tsx lib/page-builder.ts lib/page-builder/block-schemas.ts lib/__tests__/block-schemas.test.ts
git commit -m "feat(page-builder): recommendations and recently-viewed blocks"
```

---

### Task 5.2: Homepage seed layout

A factory producing a starting `layout` mirroring the current hardcoded homepage sections (Hero + Featured + Categories/Recommendations style), used when creating the `home` page.

**Files:**
- Create: `lib/page-builder/home-seed.ts`
- Test: `lib/__tests__/home-seed.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// lib/__tests__/home-seed.test.ts
import { describe, expect, it } from 'vitest';
import { buildHomeSeedLayout } from '@/lib/page-builder/home-seed';

describe('buildHomeSeedLayout', () => {
  it('should produce a non-empty layout of valid block types', () => {
    const layout = buildHomeSeedLayout();
    expect(layout.length).toBeGreaterThan(0);
    const types = layout.map((b) => b.blockType);
    expect(types).toContain('hero');
    expect(types).toContain('featuredProducts');
  });
  it('should produce blocks that carry blockType (renderable)', () => {
    for (const block of buildHomeSeedLayout()) {
      expect(typeof block.blockType).toBe('string');
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node_modules/.bin/vitest run lib/__tests__/home-seed.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
// lib/page-builder/home-seed.ts — starting layout for a freshly created `home` page,
// mirroring the existing hardcoded homepage sections so conversion isn't a blank slate.
import { createDefaultBlock } from '@/lib/page-builder/default-block';
import type { PageBlock } from '@/lib/page-builder';

export function buildHomeSeedLayout(): PageBlock[] {
  const hero = createDefaultBlock('hero');
  const featured = createDefaultBlock('featuredProducts');
  const recommendations = createDefaultBlock('recommendations');

  const blocks: PageBlock[] = [];
  if (hero) {
    blocks.push({ ...hero, headline: 'Welcome', subheadline: 'Discover our latest products' } as PageBlock);
  }
  if (featured) blocks.push(featured);
  if (recommendations) blocks.push(recommendations);
  return blocks;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node_modules/.bin/vitest run lib/__tests__/home-seed.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/page-builder/home-seed.ts lib/__tests__/home-seed.test.ts
git commit -m "feat(page-builder): homepage seed layout factory"
```

---

### Task 5.3: "Set as homepage" action

An admin action that creates-or-opens the `home` page (seeded via `buildHomeSeedLayout` when newly created) and redirects into the builder. The existing `getHomePage()` already renders a published `home` page through `RenderBlocks`, falling back to the hardcoded homepage — so the fallback stays until `home` is published, nothing breaks mid-build.

**Files:**
- Create: `app/api/page-builder/set-homepage/route.ts` (admin-gated POST)
- Modify: `src/payload/components/OpenBuilderButton.tsx` (add a "Set as homepage" link/button, or add a small admin custom view button)

- [ ] **Step 1: Create the admin-gated route**

```ts
// app/api/page-builder/set-homepage/route.ts — create-or-open the `home` page, seeded.
import config from '@payload-config';
import { headers as nextHeaders } from 'next/headers';
import { NextResponse } from 'next/server';
import { getPayload } from 'payload';
import { isAuthorizedAdmin } from '@/lib/page-builder/admin-guard';
import { buildHomeSeedLayout } from '@/lib/page-builder/home-seed';
import { routing } from '@/i18n/routing';

export async function POST(): Promise<Response> {
  const payload = await getPayload({ config });
  const requestHeaders = await nextHeaders();
  if (!(await isAuthorizedAdmin(payload, requestHeaders))) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const existing = await payload.find({
    collection: 'pages',
    where: { slug: { equals: 'home' } },
    limit: 1,
    pagination: false,
  });

  if (existing.docs.length === 0) {
    await payload.create({
      collection: 'pages',
      data: {
        title: 'Home',
        slug: 'home',
        status: 'draft',
        layout: buildHomeSeedLayout() as never,
      },
    });
  }

  return NextResponse.json({ href: `/${routing.defaultLocale}/build/home` });
}
```

- [ ] **Step 2: Add the trigger in the admin**

In `OpenBuilderButton.tsx` (or a sibling component registered in the Pages list view), add a "Set as homepage" button that POSTs to `/api/page-builder/set-homepage` and navigates to the returned `href`.

- [ ] **Step 3: Manual verification (full homepage conversion)**

Click "Set as homepage". Expected: a `home` page is created (seeded), the builder opens on it. Edit + Publish. Visit `/` (storefront homepage) and confirm `getHomePage()` now renders the published `home` page instead of the hardcoded fallback. Before publishing, `/` still shows the fallback.

- [ ] **Step 4: Type check & commit**

Run: `node_modules/.bin/tsc --noEmit`

```bash
git add app/api/page-builder/set-homepage/route.ts src/payload/components/OpenBuilderButton.tsx
git commit -m "feat(page-builder): set-as-homepage action with seeded home page"
```

**Phase 5 acceptance:** Admin can convert the homepage into a builder-managed `home` page seeded from the current layout; the two dynamic blocks are composable; the hardcoded fallback remains until `home` is published.

---

## Final review (after all phases)

- [ ] Run the full unit suite: `node_modules/.bin/vitest run` — all green.
- [ ] `node_modules/.bin/tsc --noEmit` — clean.
- [ ] Dispatch a final code-reviewer over the whole branch (per subagent-driven-development).
- [ ] Use `superpowers:finishing-a-development-branch` to integrate.

## Spec coverage self-check (traceability)

- Visual block builder / Model A → Phases 1–4 (canvas + panel + structure + media/arrays).
- Fully custom canvas (#1) → Task 1.3/1.4 (bespoke route, not Payload overlay).
- Schema-driven panel (no drift) → Task 1.1 + FieldRenderer.
- Autosave to draft + explicit Publish → Task 2.3/2.4.
- Reorder dnd-kit + up/down → Task 3.3/3.4.
- Media picker over Payload backend → Task 4.2.
- Array editor → Task 4.1/4.3.
- Admin-session gate / entry points / new-page redirect → Task 1.2/1.3/1.5.
- Homepage in scope (set-as-homepage, seed, two new blocks, fallback stays) → Phase 5.
- Testing (mapper, reducers, conditional visibility, autosave round-trip) → Tasks 1.1, 2.1, 2.2, 2.3, 3.1, 4.1, 5.2.

## Known deviations from spec (flag during execution)

- **New-page-creation redirect** (spec §Route) is partially covered: Task 1.5 adds the edit/list button; a true "redirect after create" needs a Payload `afterChange`/admin hook and may be better as a follow-up — flag if the slot isn't available.
- **RichText sub-fields** edit as plain text fallback in the array editor (Task 4.3), consistent with the spec's "rich text edits in the panel, not on the canvas" but without a full Lexical surface — confirm acceptable.
- **`describeCondition`** (Task 1.1) only recovers the single known `background === 'custom'` condition. If new conditional fields are added, extend the probe — flagged in code comments.
