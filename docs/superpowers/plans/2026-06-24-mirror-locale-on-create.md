# Mirror-on-Create with Auto-Translation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a section is added/deleted/reordered in one locale (vi or en), mirror that structural change to the other locale and auto-translate the text fields of newly-added blocks via a free LLM (OpenRouter). Field-level edits stay per-locale and never propagate.

**Architecture:** Payload stores `vi` and `en` as separate copies of the `layout` blocks array (`localized: true`). Theme colors are already paired sibling fields inside each block, so mirroring a block copies both themes. We add a stable `blockKey` (UUID) field to every block (Payload's own `id` is stripped on every save by `stripBlockIds`, so it can't be used for diffing). An `afterChange` hook on `Pages` diffs the active locale against the other by `blockKey`: new keys → mirror + translate; removed keys → delete; reordered → reorder; edited keys → reuse the other locale's block unchanged. Translation is batched per save via OpenRouter (best-effort — failure mirrors structure with source text + a logged warning, never blocks a save).

**Tech Stack:** Payload CMS 3.x hooks, TypeScript (strict), Vitest, `openai` SDK (OpenAI-compatible, pointed at OpenRouter), `crypto.randomUUID()`.

## Global Constraints

- Locales are exactly `vi` and `en` (from `payload.config.ts` `localization.locales`). The mirror hook hard-codes this pair.
- Free model default: `meta-llama/llama-3.3-70b-instruct:free`, overridable via `OPENROUTER_MODEL`. Auth via `OPENROUTER_API_KEY` env var (feature no-ops gracefully if unset).
- Tests live in `lib/__tests__/*.test.ts` (matched by `vitest.config.ts`'s `node` project). Run a single file with `pnpm vitest run lib/__tests__/<file>.test.ts`. Full suite: `pnpm test`. Type check: `pnpm check-types`.
- The `@/` alias maps to the repo root (`vitest.config.ts` and `tsconfig.json`).
- Conventional Commit messages, atomic commits, direct to `main` (per project CLAUDE.md git override). End commit messages with a `Co-Authored-By: Claude <noreply@anthropic.com>` trailer.
- Theme colors come along automatically — do NOT add any theme-copy logic.
- Rich text (Lexical) is out of scope for v1 — copy verbatim, do not translate.

---

## File Structure

| File | Responsibility | Task |
|------|----------------|------|
| `src/payload/blocks/_identity.ts` | The `blockKey` field definition + `identityFields` spread | 1 |
| `src/payload/collections/Pages.ts` | Inject `blockKey` into `layoutBlocks`; wire mirror hooks | 1, 5 |
| `lib/page-builder/block-schemas.ts` | Inject `blockKey` so the descriptor includes it | 1 |
| `lib/page-builder/default-block.ts` | Generate a UUID `blockKey` for new blocks | 1 |
| `components/page-builder/FieldRenderer.tsx` | Hide `blockKey` from the editor panel | 1 |
| `lib/page-builder/mirror/reconcile.ts` | Pure structural reconciliation by `blockKey` | 2 |
| `lib/page-builder/mirror/translatable.ts` | Select & apply translatable text fields | 3 |
| `lib/page-builder/mirror/translate.ts` | Best-effort batched LLM translation via OpenRouter | 4 |
| `src/payload/hooks/mirror-locale-layout.ts` | `beforeChange` capture + `afterChange` orchestration | 5 |
| `scripts/backfill-block-keys.ts` | One-time: assign `blockKey` to legacy blocks | 6 |
| `.env.example` | Document `OPENROUTER_API_KEY` / `OPENROUTER_MODEL` | 6 |
| `lib/__tests__/*.test.ts` | Tests for each unit above | 1–5 |

---

## Task 1: Stable `blockKey` identity field

Add a stable per-block UUID that survives `stripBlockIds` (which only removes `id`), so blocks can be tracked across locales and saves. Inject it centrally via the existing `.map` pattern (used today for `SECTION_ROW_LABEL`), in both `Pages.ts` (Payload persistence) and `block-schemas.ts` (descriptor visibility). Generate a UUID in `createDefaultBlock` and hide the field in the visual editor.

**Files:**
- Create: `src/payload/blocks/_identity.ts`
- Modify: `src/payload/collections/Pages.ts:50-86` (the `layoutBlocks` `.map`)
- Modify: `lib/page-builder/block-schemas.ts:59-86,169-174` (`REGISTERED_BLOCKS` + `getBlockSchemas`)
- Modify: `lib/page-builder/default-block.ts:27-35` (`createDefaultBlock`)
- Modify: `components/page-builder/FieldRenderer.tsx:22-35` (hide `blockKey`)
- Test: `lib/__tests__/block-key.test.ts`

**Interfaces:**
- Produces: `blockKeyField` exported from `@/src/payload/blocks/_identity`. Every block schema returned by `getBlockSchemas()` includes a `{ name: 'blockKey', type: 'text' }` descriptor. `createDefaultBlock(slug)` sets `block.blockKey` to a non-empty UUID string. `stripBlockIds` already preserves it (only strips `id`) — a regression test pins this.

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/block-key.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { getBlockSchemas } from '@/lib/page-builder/block-schemas';
import { createDefaultBlock } from '@/lib/page-builder/default-block';
import { stripBlockIds } from '@/lib/page-builder/strip-block-ids';
import type { BlockSchema } from '@/lib/page-builder/block-schemas';

const asRecord = (b: unknown): Record<string, unknown> => b as Record<string, unknown>;

describe('blockKey identity field', () => {
  it('should include a blockKey text field on every registered block schema', () => {
    const schemas = getBlockSchemas();
    expect(schemas.length).toBeGreaterThan(0);
    for (const schema of schemas) {
      const keyField = schema.fields.find((f) => f.name === 'blockKey');
      expect(keyField, `block "${schema.slug}" missing blockKey`).toBeDefined();
      expect(keyField?.type).toBe('text');
    }
  });

  it('should generate a non-empty blockKey UUID when creating a default block', () => {
    const block = createDefaultBlock('text');
    expect(block).not.toBeNull();
    const key = asRecord(block).blockKey;
    expect(typeof key).toBe('string');
    expect((key as string).length).toBeGreaterThan(8);
  });

  it('should generate distinct blockKeys for successive default blocks', () => {
    const a = asRecord(createDefaultBlock('text')).blockKey;
    const b = asRecord(createDefaultBlock('text')).blockKey;
    expect(a).not.toBe(b);
  });

  it('should preserve blockKey when stripBlockIds removes the row id', () => {
    const schemas: BlockSchema[] = [
      { slug: 'text', label: 'Text', fields: [{ name: 'blockKey', type: 'text' }, { name: 'heading', type: 'text' }] },
    ];
    const layout = [{ id: 'row1', blockType: 'text', blockKey: 'k-123', heading: 'Hi' }] as unknown as import('@/lib/page-builder').PageBlock[];
    const out = stripBlockIds(layout, schemas);
    expect(asRecord(out[0]).id).toBeUndefined();
    expect(asRecord(out[0]).blockKey).toBe('k-123');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run lib/__tests__/block-key.test.ts`
Expected: FAIL — no `blockKey` field exists on schemas yet (first test fails).

- [ ] **Step 3: Create the identity field**

Create `src/payload/blocks/_identity.ts`:

```ts
// src/payload/blocks/_identity.ts — stable per-block identity for cross-locale mirroring.
//
// Payload's own block `id` is stripped on every save (lib/page-builder/strip-block-ids.ts)
// to avoid cross-locale primary-key collisions, so it is not stable across saves and cannot
// be used to diff a layout. `blockKey` is a normal text field that survives stripping, so it
// persists in both locale copies and lets the mirror hook track the same section across vi/en.
import type { Field } from 'payload';

export const blockKeyField: Field = {
  name: 'blockKey',
  type: 'text',
  admin: { hidden: true },
};
```

- [ ] **Step 4: Inject `blockKey` into the Pages layout blocks**

In `src/payload/collections/Pages.ts`, add the import alongside the block imports (after line 42):

```ts
import { blockKeyField } from '@/src/payload/blocks/_identity';
```

Change the `layoutBlocks` `.map` (lines 77-86) to inject the field:

```ts
].map((block) => ({
  ...block,
  fields: [...(block.fields ?? []), blockKeyField],
  admin: {
    ...block.admin,
    components: {
      ...block.admin?.components,
      Label: SECTION_ROW_LABEL,
    },
  },
}));
```

- [ ] **Step 5: Inject `blockKey` into the block schemas**

In `lib/page-builder/block-schemas.ts`, add the import after the block imports (after line 32):

```ts
import { blockKeyField } from '@/src/payload/blocks/_identity';
```

Replace the `let cached` + `getBlockSchemas` block (lines 169-174) with a memoized list that injects the field before describing:

```ts
let cached: BlockSchema[] | null = null;

const SCHEMA_BLOCKS = REGISTERED_BLOCKS.map((block) => ({
  ...block,
  fields: [...(block.fields ?? []), blockKeyField],
}));

export function getBlockSchemas(): BlockSchema[] {
  if (!cached) cached = SCHEMA_BLOCKS.map(describeBlock);
  return cached;
}
```

- [ ] **Step 6: Generate a UUID `blockKey` in `createDefaultBlock`**

In `lib/page-builder/default-block.ts`, add a `newBlockKey` helper and special-case the field in `createDefaultBlock`. Replace the file body (lines 1-35) with:

```ts
// lib/page-builder/default-block.ts — instantiate a fresh block from its schema defaults.
import { getBlockSchema, type FieldDescriptor } from '@/lib/page-builder/block-schemas';
import type { PageBlock } from '@/lib/page-builder';

function newBlockKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `bk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function defaultForField(field: FieldDescriptor): unknown {
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
  if (field.type === 'richText') return null;
  if (field.type === 'relationship') return field.hasMany ? [] : null;
  return null;
}

export function defaultRowFor(fields: FieldDescriptor[]): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  for (const f of fields) row[f.name] = defaultForField(f);
  return row;
}

export function createDefaultBlock(slug: string): PageBlock | null {
  const schema = getBlockSchema(slug);
  if (!schema) return null;
  const block: Record<string, unknown> = { blockType: slug };
  for (const field of schema.fields) {
    block[field.name] = field.name === 'blockKey' ? newBlockKey() : defaultForField(field);
  }
  return block as unknown as PageBlock;
}
```

- [ ] **Step 7: Hide `blockKey` in the editor panel**

In `components/page-builder/FieldRenderer.tsx`, add a `HIDDEN_FIELDS` set next to `APPEARANCE_FIELDS` (after line 28) and exclude it from the section-fields filter.

Add after the `APPEARANCE_FIELDS` declaration:

```ts
// Fields that exist for internal bookkeeping (cross-locale mirroring) and must never be
// shown or edited in the panel.
const HIDDEN_FIELDS = new Set(['blockKey']);
```

Change line 32 from:

```ts
  const sectionFields = schema.fields.filter((f) => !APPEARANCE_FIELDS.has(f.name) && visible(f));
```

to:

```ts
  const sectionFields = schema.fields.filter(
    (f) => !APPEARANCE_FIELDS.has(f.name) && !HIDDEN_FIELDS.has(f.name) && visible(f),
  );
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `pnpm vitest run lib/__tests__/block-key.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 9: Run the full suite + type check to catch regressions**

Run: `pnpm test && pnpm check-types`
Expected: PASS (existing `default-block.test.ts` still passes — it checks `ctaStyle`/`background` defaults, unaffected; `blockKey` is an extra field it ignores).

- [ ] **Step 10: Commit**

```bash
git add src/payload/blocks/_identity.ts src/payload/collections/Pages.ts \
  lib/page-builder/block-schemas.ts lib/page-builder/default-block.ts \
  components/page-builder/FieldRenderer.tsx lib/__tests__/block-key.test.ts
git commit -m "feat(page-builder): add stable blockKey for cross-locale mirroring

Payload's block id is stripped every save, so it can't diff layouts across
locales. Add a stable blockKey (UUID) field injected centrally into the
layout blocks and block schemas, generated on block creation and hidden in
the visual editor.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 2: Pure layout reconciliation (`reconcile-layout.ts`)

The pure diff/merge engine. Given the active locale's new layout, the other locale's current layout, and the active locale's prior keys, produce the other locale's reconciled layout and report what changed. No DB, no translation. This is where "edits don't propagate" lives: blocks already in the other locale are reused as-is.

**Files:**
- Create: `lib/page-builder/mirror/reconcile.ts`
- Test: `lib/__tests__/reconcile-layout.test.ts`

**Interfaces:**
- Produces: `blockKeyOf(block: unknown): string | undefined`, `type KeyedBlock = PageBlock & { blockKey?: string }`, `type ReconcileResult`, and `reconcileLayout(newActive, other, priorActiveKeys): ReconcileResult`. Consumed by Tasks 3, 5.

`ReconcileResult`:
```ts
{
  reconciled: KeyedBlock[];      // the new other-locale layout
  addedForOther: Set<string>;    // keys in active but not in other → translate these
  removedKeys: Set<string>;      // keys in prior active but not in new active → dropped
  orderChanged: boolean;         // shared blocks were reordered
  changed: boolean;              // false → pure field edit, caller should skip the write
}
```

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/reconcile-layout.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { reconcileLayout, blockKeyOf } from '@/lib/page-builder/mirror/reconcile';
import type { KeyedBlock } from '@/lib/page-builder/mirror/reconcile';

const blk = (blockType: string, blockKey: string, extra: Record<string, unknown> = {}): KeyedBlock =>
  ({ blockType, blockKey, ...extra }) as KeyedBlock;

const keys = (layout: KeyedBlock[]): string[] => layout.map(blockKeyOf).filter((k): k is string => !!k);

describe('reconcileLayout', () => {
  it('should mirror a newly added block to the other locale and mark it for translation', () => {
    const active = [blk('text', 'k1', { heading: 'Hello' })];
    const other: KeyedBlock[] = [];
    const res = reconcileLayout(active, other, new Set());
    expect(keys(res.reconciled)).toEqual(['k1']);
    expect(res.addedForOther.has('k1')).toBe(true);
    expect(res.changed).toBe(true);
  });

  it('should reuse the other locale block (preserving its text) for an edit, and report no change', () => {
    const active = [blk('text', 'k1', { heading: 'Edited' })];
    const other = [blk('text', 'k1', { heading: 'Hola' })];
    const res = reconcileLayout(active, other, new Set(['k1']));
    // Reused the other locale's object verbatim — the active edit did NOT propagate.
    expect((res.reconciled[0] as Record<string, unknown>).heading).toBe('Hola');
    expect(res.addedForOther.has('k1')).toBe(false);
    expect(res.changed).toBe(false);
  });

  it('should delete a block from the other locale when removed from active', () => {
    const active: KeyedBlock[] = [];
    const other = [blk('text', 'k1', { heading: 'Hola' })];
    const res = reconcileLayout(active, other, new Set(['k1']));
    expect(res.reconciled).toEqual([]);
    expect(res.removedKeys.has('k1')).toBe(true);
    expect(res.changed).toBe(true);
  });

  it('should reorder shared blocks to follow the active locale order', () => {
    const active = [blk('text', 'k2'), blk('text', 'k1')];
    const other = [blk('text', 'k1', { heading: 'A' }), blk('text', 'k2', { heading: 'B' })];
    const res = reconcileLayout(active, other, new Set(['k1', 'k2']));
    expect(keys(res.reconciled)).toEqual(['k2', 'k1']);
    // Text preserved on each reused block.
    expect((res.reconciled[0] as Record<string, unknown>).heading).toBe('B');
    expect((res.reconciled[1] as Record<string, unknown>).heading).toBe('A');
    expect(res.orderChanged).toBe(true);
    expect(res.changed).toBe(true);
  });

  it('should preserve other-locale-only blocks at the end and report no change', () => {
    const active = [blk('text', 'k1')];
    const other = [blk('text', 'k1', { heading: 'A' }), blk('text', 'kOther', { heading: 'only-en' })];
    const res = reconcileLayout(active, other, new Set(['k1']));
    expect(keys(res.reconciled)).toEqual(['k1', 'kOther']);
    expect((res.reconciled[1] as Record<string, unknown>).heading).toBe('only-en');
    expect(res.changed).toBe(false); // no add/remove/reorder of shared blocks
  });

  it('should mirror all blocks on first create (prior keys empty, other empty)', () => {
    const active = [blk('text', 'k1'), blk('faq', 'k2')];
    const res = reconcileLayout(active, [], new Set());
    expect(keys(res.reconciled)).toEqual(['k1', 'k2']);
    expect(res.addedForOther.size).toBe(2);
    expect(res.changed).toBe(true);
  });

  it('should translate a block that exists in active but was never mirrored to other', () => {
    const active = [blk('text', 'k1', { heading: 'Hi' })];
    const other: KeyedBlock[] = [];
    const res = reconcileLayout(active, other, new Set(['k1'])); // existed before in active
    expect(res.addedForOther.has('k1')).toBe(true); // missing in other → create + translate
    expect(res.changed).toBe(true);
  });

  it('should skip blocks without a blockKey in the active locale (cannot track them)', () => {
    const noKey = { blockType: 'text', heading: 'legacy' } as KeyedBlock;
    const active = [noKey];
    const other: KeyedBlock[] = [];
    const res = reconcileLayout(active, other, new Set());
    expect(res.reconciled).toEqual([]); // unkeyed active block not mirrored
    expect(res.changed).toBe(false);
  });

  it('should keep an unkeyed other-locale block in place', () => {
    const noKey = { blockType: 'text', heading: 'legacy-en' } as KeyedBlock;
    const active: KeyedBlock[] = [];
    const other = [noKey];
    const res = reconcileLayout(active, other, new Set());
    expect(res.reconciled).toEqual([noKey]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run lib/__tests__/reconcile-layout.test.ts`
Expected: FAIL — module `@/lib/page-builder/mirror/reconcile` does not exist.

- [ ] **Step 3: Implement `reconcile-layout.ts`**

Create `lib/page-builder/mirror/reconcile.ts`:

```ts
// lib/page-builder/mirror/reconcile.ts — pure structural reconciliation of one locale's
// layout against the other, keyed by the stable `blockKey` field.
//
// Field-level edits are NOT propagated: blocks that already exist in the other locale are
// reused as-is, so their (possibly translated) text is preserved. Only structure
// (add/delete/reorder) follows the active locale. Blocks that exist only in the other locale
// are kept; blocks without a blockKey are left untouched in both (run the backfill script to
// assign keys to legacy data).
import type { PageBlock } from '@/lib/page-builder';

export type KeyedBlock = PageBlock & { blockKey?: string };

export function blockKeyOf(block: unknown): string | undefined {
  if (block && typeof block === 'object' && 'blockKey' in block) {
    const key = (block as { blockKey?: unknown }).blockKey;
    if (typeof key === 'string' && key) return key;
  }
  return undefined;
}

export type ReconcileResult = {
  reconciled: KeyedBlock[];
  /** Keys present in the active layout but absent in the other locale → newly created in
   *  the other locale; their text fields should be translated. */
  addedForOther: Set<string>;
  /** Keys present in the prior active layout but absent in the new one → dropped. */
  removedKeys: Set<string>;
  /** The shared blocks' order differs between the two locales. */
  orderChanged: boolean;
  /** False when there is nothing to write (pure field-edit save). */
  changed: boolean;
};

function clone(block: KeyedBlock): KeyedBlock {
  return structuredClone(block) as KeyedBlock;
}

export function reconcileLayout(
  newActive: KeyedBlock[],
  other: KeyedBlock[],
  priorActiveKeys: ReadonlySet<string>,
): ReconcileResult {
  const otherByKey = new Map<string, KeyedBlock>();
  for (const b of other) {
    const k = blockKeyOf(b);
    if (k) otherByKey.set(k, b);
  }

  const newKeys = new Set<string>();
  for (const b of newActive) {
    const k = blockKeyOf(b);
    if (k) newKeys.add(k);
  }
  const otherKeys = new Set(otherByKey.keys());

  const addedForOther = new Set<string>();
  for (const k of newKeys) if (!otherKeys.has(k)) addedForOther.add(k);

  const removedKeys = new Set<string>();
  for (const k of priorActiveKeys) if (!newKeys.has(k)) removedKeys.add(k);

  // Order comparison over the shared keys (present in both locales).
  const sharedActive = newActive.map(blockKeyOf).filter((k): k is string => !!k && otherKeys.has(k));
  const sharedOther = other.map(blockKeyOf).filter((k): k is string => !!k && newKeys.has(k));
  const orderChanged = sharedActive.some((k, i) => k !== sharedOther[i]);

  const reconciled: KeyedBlock[] = [];
  for (const b of newActive) {
    const k = blockKeyOf(b);
    if (!k) continue; // unkeyed active block: cannot mirror, skip
    if (otherByKey.has(k)) {
      reconciled.push(otherByKey.get(k)!); // reuse other locale's text
    } else {
      reconciled.push(clone(b)); // new for the other locale → translate later
    }
  }
  // Preserve blocks that exist only in the other locale, except those just removed from the
  // active locale (removedKeys), which must be dropped. Unkeyed other blocks stay in place.
  for (const b of other) {
    const k = blockKeyOf(b);
    if (!k) {
      reconciled.push(b);
      continue;
    }
    if (!newKeys.has(k) && !removedKeys.has(k)) reconciled.push(b);
  }

  const changed = addedForOther.size > 0 || removedKeys.size > 0 || orderChanged;
  return { reconciled, addedForOther, removedKeys, orderChanged, changed };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run lib/__tests__/reconcile-layout.test.ts`
Expected: PASS (10 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/page-builder/mirror/reconcile.ts lib/__tests__/reconcile-layout.test.ts
git commit -m "feat(page-builder): add pure layout reconciliation by blockKey

Diff two locales' layouts by stable blockKey to compute adds, deletes, and
reorders while reusing existing other-locale blocks verbatim so field edits
never propagate across locales.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 3: Translatable field selection (`translatable.ts`)

Walk a block's schema, collect the human-readable text fields (recursing into array rows), and apply translated values back by path. Excludes a denylist of URL/color/technical text fields and skips rich text, relationships, uploads, selects, and numbers.

**Files:**
- Create: `lib/page-builder/mirror/translatable.ts`
- Test: `lib/__tests__/translatable.test.ts`

**Interfaces:**
- Consumes: `KeyedBlock` from `@/lib/page-builder/mirror/reconcile`; `BlockSchema`, `FieldDescriptor` from `@/lib/page-builder/block-schemas`.
- Produces: `type TextEntry = { path: string; value: string }`, `collectTranslatable(block, schema): TextEntry[]`, `applyTranslations(block, entries: Record<string, string>): KeyedBlock`. Consumed by Tasks 4, 5.

Path format: dot-separated, array indices are numeric segments — e.g. `heading`, `items.0.question`.

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/translatable.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { collectTranslatable, applyTranslations } from '@/lib/page-builder/mirror/translatable';
import type { BlockSchema } from '@/lib/page-builder/block-schemas';
import type { KeyedBlock } from '@/lib/page-builder/mirror/reconcile';

const faqSchema: BlockSchema = {
  slug: 'faq',
  label: 'FAQ',
  fields: [
    { name: 'title', type: 'text' },
    { name: 'blockKey', type: 'text' },
    { name: 'background', type: 'select', options: [] },
    { name: 'backgroundCustom', type: 'text' },
    {
      name: 'items',
      type: 'array',
      fields: [
        { name: 'question', type: 'text' },
        { name: 'answer', type: 'richText' },
        { name: 'url', type: 'text' },
      ],
    },
  ],
};

describe('collectTranslatable', () => {
  it('should collect top-level text fields, excluding blockKey and color hex', () => {
    const block = { blockType: 'faq', title: 'Questions', blockKey: 'k1', backgroundCustom: '#fff' } as KeyedBlock;
    const entries = collectTranslatable(block, faqSchema);
    const paths = entries.map((e) => e.path);
    expect(paths).toContain('title');
    expect(paths).not.toContain('blockKey');
    expect(paths).not.toContain('backgroundCustom');
  });

  it('should recurse into array rows with indexed paths', () => {
    const block = {
      blockType: 'faq',
      items: [
        { question: 'q1', url: 'https://x' },
        { question: 'q2', url: 'https://y' },
      ],
    } as KeyedBlock;
    const entries = collectTranslatable(block, faqSchema);
    const map = Object.fromEntries(entries.map((e) => [e.path, e.value]));
    expect(map['items.0.question']).toBe('q1');
    expect(map['items.1.question']).toBe('q2');
    // url is denied; richText answer is skipped.
    expect(Object.keys(map).some((p) => p.endsWith('.url'))).toBe(false);
    expect(Object.keys(map).some((p) => p.endsWith('.answer'))).toBe(false);
  });

  it('should skip empty/whitespace-only strings', () => {
    const block = { blockType: 'faq', title: '   ', items: [] } as KeyedBlock;
    expect(collectTranslatable(block, faqSchema)).toEqual([]);
  });

  it('should return no entries when the schema is null', () => {
    const block = { blockType: 'mystery', title: 'x' } as KeyedBlock;
    expect(collectTranslatable(block, null)).toEqual([]);
  });
});

describe('applyTranslations', () => {
  it('should write translated values back at top-level and array paths without mutating input', () => {
    const block = {
      blockType: 'faq',
      title: 'Questions',
      items: [{ question: 'q1' }, { question: 'q2' }],
    } as KeyedBlock;
    const before = structuredClone(block);
    const out = applyTranslations(block, { title: 'Preguntas', 'items.0.question': 'q1-tr' });
    expect((out as Record<string, unknown>).title).toBe('Preguntas');
    expect(((out as Record<string, unknown>).items as Record<string, unknown>[])[0].question).toBe('q1-tr');
    // Untouched array row preserved.
    expect(((out as Record<string, unknown>).items as Record<string, unknown>[])[1].question).toBe('q2');
    // Input not mutated.
    expect(block).toEqual(before);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run lib/__tests__/translatable.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement `translatable.ts`**

Create `lib/page-builder/mirror/translatable.ts`:

```ts
// lib/page-builder/mirror/translatable.ts — select the human-readable text fields of a block
// for translation, recursing into array rows. Rich text, relationships, uploads, selects,
// numbers, and a denylist of URL/color/technical text fields are excluded.
import type { BlockSchema, FieldDescriptor } from '@/lib/page-builder/block-schemas';
import type { KeyedBlock } from './reconcile';

const DENYLIST = new Set([
  'blockKey',
  'blockType',
  'backgroundCustom',
  'backgroundCustomDark',
  'url',
  'href',
  'ctaHref',
  'ctaUrl',
  'primaryUrl',
  'secondaryUrl',
]);

export type TextEntry = { path: string; value: string };

function isTranslatableText(field: FieldDescriptor): boolean {
  return (field.type === 'text' || field.type === 'textarea') && !DENYLIST.has(field.name);
}

function walk(
  value: Record<string, unknown>,
  fields: FieldDescriptor[],
  prefix: string,
  out: TextEntry[],
): void {
  for (const field of fields) {
    const name = field.name;
    if (field.type === 'array') {
      const arr = value[name];
      if (!Array.isArray(arr)) continue;
      const subFields = field.fields ?? [];
      arr.forEach((row, i) => {
        if (row && typeof row === 'object') {
          walk(row as Record<string, unknown>, subFields, `${prefix}${name}.${i}.`, out);
        }
      });
    } else if (isTranslatableText(field)) {
      const v = value[name];
      if (typeof v === 'string' && v.trim()) out.push({ path: `${prefix}${name}`, value: v });
    }
    // richText, relationship, upload, select, number, checkbox, group → skipped
  }
}

export function collectTranslatable(block: KeyedBlock, schema: BlockSchema | null): TextEntry[] {
  if (!schema) return [];
  const out: TextEntry[] = [];
  walk(block as Record<string, unknown>, schema.fields, '', out);
  return out;
}

function setAtPath(root: Record<string, unknown>, path: string, value: string): void {
  const parts = path.split('.');
  let cursor: Record<string, unknown> = root;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]!;
    const next = cursor[part];
    if (Array.isArray(next)) {
      const idx = Number(parts[++i]);
      const item = next[idx];
      if (item && typeof item === 'object') {
        cursor = item as Record<string, unknown>;
      } else {
        return;
      }
    } else if (next && typeof next === 'object') {
      cursor = next as Record<string, unknown>;
    } else {
      return;
    }
  }
  cursor[parts[parts.length - 1]!] = value;
}

export function applyTranslations(
  block: KeyedBlock,
  entries: Record<string, string>,
): KeyedBlock {
  const root = structuredClone(block) as Record<string, unknown>;
  for (const [path, value] of Object.entries(entries)) {
    if (typeof value === 'string') setAtPath(root, path, value);
  }
  return root as unknown as KeyedBlock;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run lib/__tests__/translatable.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/page-builder/mirror/translatable.ts lib/__tests__/translatable.test.ts
git commit -m "feat(page-builder): collect and apply translatable block text fields

Walk a block schema to gather human-readable text (recursing arrays) for
translation, excluding URLs, colors, and rich text; apply translations back
by dot-path without mutating the source block.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 4: Batched LLM translation via OpenRouter (`translate.ts`)

Best-effort translation: collect all translatable strings from newly-added blocks into one batched OpenRouter call (OpenAI-compatible SDK), parse the JSON response, and apply. On any failure (missing key, API error, unparseable response) return the source map unchanged so the caller mirrors structure with untranslated text and logs a warning. Never throws.

**Files:**
- Modify: `package.json` (add `openai` dependency)
- Create: `lib/page-builder/mirror/translate.ts`
- Test: `lib/__tests__/translate.test.ts`

**Interfaces:**
- Consumes: `TextEntry` from `@/lib/page-builder/mirror/translatable`.
- Produces: `type TranslateClient` (minimal OpenAI-chat surface), `createTranslateClient(): TranslateClient | null` (returns null when `OPENROUTER_API_KEY` unset), `translateTextMap(entries: TextEntry[], sourceLocale, targetLocale, client: TranslateClient | null): Promise<Record<string, string>>`. Consumed by Task 5.

The returned map is keyed by the same `path` as the input entries. The hook composes composite `blockKey::path` keys (Task 5) so blocks don't collide; `translateTextMap` is path-agnostic and treats keys as opaque.

- [ ] **Step 1: Install the OpenAI SDK**

Run: `pnpm add openai`
Expected: `openai` added to `dependencies` in `package.json` and installed.

- [ ] **Step 2: Write the failing test**

Create `lib/__tests__/translate.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { translateTextMap, type TranslateClient } from '@/lib/page-builder/mirror/translate';

function mockClient(content: string | null): TranslateClient {
  return {
    chat: {
      completions: {
        create: vi.fn(async () => ({ choices: [{ message: { content } }] })),
      },
    },
  };
}

describe('translateTextMap', () => {
  it('should return translated values keyed by the same paths', async () => {
    const client = mockClient(JSON.stringify({ heading: 'Hola', 'items.0.question': '¿Q?' }));
    const out = await translateTextMap(
      [{ path: 'heading', value: 'Hello' }, { path: 'items.0.question', value: 'Q?' }],
      'en',
      'vi',
      client,
    );
    expect(out.heading).toBe('Hola');
    expect(out['items.0.question']).toBe('¿Q?');
  });

  it('should fall back to source text for any path the model omitted', async () => {
    const client = mockClient(JSON.stringify({ heading: 'Hola' }));
    const out = await translateTextMap(
      [{ path: 'heading', value: 'Hello' }, { path: 'subhead', value: 'World' }],
      'en',
      'vi',
      client,
    );
    expect(out.heading).toBe('Hola');
    expect(out.subhead).toBe('World'); // source fallback
  });

  it('should return source map unchanged when the response is unparseable', async () => {
    const client = mockClient('sorry, I cannot do that');
    const out = await translateTextMap([{ path: 'heading', value: 'Hello' }], 'en', 'vi', client);
    expect(out.heading).toBe('Hello');
  });

  it('should return source map unchanged when the API throws', async () => {
    const client: TranslateClient = {
      chat: { completions: { create: vi.fn(async () => { throw new Error('429'); }) } },
    };
    const out = await translateTextMap([{ path: 'heading', value: 'Hello' }], 'en', 'vi', client);
    expect(out.heading).toBe('Hello');
  });

  it('should return source map unchanged when no client is provided (no API key)', async () => {
    const out = await translateTextMap([{ path: 'heading', value: 'Hello' }], 'en', 'vi', null);
    expect(out.heading).toBe('Hello');
  });

  it('should return an empty map for empty input', async () => {
    const out = await translateTextMap([], 'en', 'vi', mockClient('{}'));
    expect(out).toEqual({});
  });

  it('should tolerate JSON wrapped in surrounding prose', async () => {
    const client = mockClient(`Sure! Here you go: {"heading":"Hola"} thanks!`);
    const out = await translateTextMap([{ path: 'heading', value: 'Hello' }], 'en', 'vi', client);
    expect(out.heading).toBe('Hola');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm vitest run lib/__tests__/translate.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 4: Implement `translate.ts`**

Create `lib/page-builder/mirror/translate.ts`:

```ts
// lib/page-builder/mirror/translate.ts — best-effort batched translation of UI copy via
// OpenRouter (OpenAI-compatible). Never throws: on any failure returns the source map
// unchanged so the caller can mirror structure with untranslated text and log a warning.
import OpenAI from 'openai';
import type { TextEntry } from './translatable';

const LANG_NAME: Record<string, string> = { vi: 'Vietnamese', en: 'English' };
const DEFAULT_MODEL = 'meta-llama/llama-3.3-70b-instruct:free';

export type TranslateClient = {
  chat: {
    completions: {
      create: (params: unknown) => Promise<{ choices: { message: { content: string | null } }[] }>;
    };
  };
};

export function createTranslateClient(): TranslateClient | null {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({ apiKey, baseURL: 'https://openrouter.ai/api/v1' }) as unknown as TranslateClient;
}

function extractJson(content: string): Record<string, string> | null {
  const start = content.indexOf('{');
  const end = content.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(content.slice(start, end + 1));
    if (parsed && typeof parsed === 'object') {
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
        if (typeof v === 'string') out[k] = v;
      }
      return out;
    }
  } catch {
    /* fall through */
  }
  return null;
}

export async function translateTextMap(
  entries: TextEntry[],
  sourceLocale: string,
  targetLocale: string,
  client: TranslateClient | null,
): Promise<Record<string, string>> {
  const source: Record<string, string> = {};
  for (const e of entries) source[e.path] = e.value;
  if (Object.keys(source).length === 0 || !client) return source; // nothing to do / no key

  const srcName = LANG_NAME[sourceLocale] ?? sourceLocale;
  const tgtName = LANG_NAME[targetLocale] ?? targetLocale;
  const model = process.env.OPENROUTER_MODEL || DEFAULT_MODEL;
  const system =
    `You translate user-interface copy from ${srcName} to ${tgtName}. ` +
    `Return ONLY a JSON object with the exact same keys and the translated string values. ` +
    `Preserve brand names, URLs, and placeholders. Do not add commentary.`;

  try {
    const res = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: JSON.stringify(source) },
      ],
    });
    const content = res.choices?.[0]?.message?.content;
    if (!content) return source;
    const translated = extractJson(content);
    if (!translated) return source;
    const result: Record<string, string> = {};
    for (const [path, value] of Object.entries(source)) {
      result[path] = translated[path] ?? value;
    }
    return result;
  } catch (err) {
    console.warn('[mirror] translation failed, copying source text:', err);
    return source;
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm vitest run lib/__tests__/translate.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml lib/page-builder/mirror/translate.ts lib/__tests__/translate.test.ts
git commit -m "feat(page-builder): add best-effort LLM translation via OpenRouter

Batch translatable strings into one OpenRouter call (OpenAI-compatible SDK,
Llama 3.3 70B free by default). Degrades gracefully: missing key, API error,
or unparseable response returns source text unchanged and never blocks a save.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 5: The mirror hooks + wire into `Pages`

The orchestration layer. A `beforeChange` hook captures the active locale's prior `blockKey` set (from `originalDoc`). An `afterChange` hook fetches both locales' layouts at `depth: 0`, runs `reconcileLayout`, translates the added blocks (batched, composite `blockKey::path` keys to avoid collisions), and writes the other locale with `req.skipMirror = true` to prevent recursion. Wraps everything in try/catch so a hook failure never blocks the original save.

**Files:**
- Create: `src/payload/hooks/mirror-locale-layout.ts`
- Modify: `src/payload/collections/Pages.ts:159-163` (register both hooks)
- Test: `lib/__tests__/mirror-locale-layout.test.ts`

**Interfaces:**
- Consumes: `reconcileLayout`, `blockKeyOf`, `KeyedBlock` from `@/lib/page-builder/mirror/reconcile`; `collectTranslatable`, `applyTranslations`, `TextEntry` from `@/lib/page-builder/mirror/translatable`; `createTranslateClient`, `translateTextMap` from `@/lib/page-builder/mirror/translate`; `getBlockSchemas` from `@/lib/page-builder/block-schemas`; `stripBlockIds` from `@/lib/page-builder/strip-block-ids`.
- Produces: `capturePriorLayoutKeys: CollectionBeforeChangeHook`, `mirrorLocaleLayout: CollectionAfterChangeHook`, wired into `Pages.hooks`.

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/mirror-locale-layout.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';

// Mock the translator so no network/key is needed: appends " [tr]" to each value.
vi.mock('@/lib/page-builder/mirror/translate', () => ({
  createTranslateClient: () => null,
  translateTextMap: vi.fn(async (entries: { path: string; value: string }[]) => {
    const out: Record<string, string> = {};
    for (const e of entries) out[e.path] = `${e.value} [tr]`;
    return out;
  }),
}));

import { mirrorLocaleLayout, capturePriorLayoutKeys } from '@/src/payload/hooks/mirror-locale-layout';
import { blockKeyOf } from '@/lib/page-builder/mirror/reconcile';

type Layout = Record<string, unknown>[];

function makeReq(locale: string, store: { vi: Layout; en: Layout }, priorKeys?: Set<string>) {
  return {
    locale,
    skipMirror: undefined as boolean | undefined,
    __mirrorPriorKeys: priorKeys,
    payload: {
      findByID: vi.fn(async ({ locale: loc }: { locale: string }) => ({ id: 1, layout: store[loc as 'vi' | 'en'] ?? [] })),
      update: vi.fn(async ({ locale: loc, data }: { locale: string; data: { layout: Layout } }) => {
        store[loc as 'vi' | 'en'] = data.layout;
        return { id: 1 };
      }),
    },
  };
}

describe('mirrorLocaleLayout', () => {
  it('should mirror and translate a newly added block to the other locale', async () => {
    const store = { vi: [{ blockType: 'text', blockKey: 'k1', heading: 'Hello', background: 'theme' }] as Layout, en: [] as Layout };
    const req = makeReq('vi', store);
    await mirrorLocaleLayout({ doc: { id: 1 }, req } as never);
    expect(req.payload.update).toHaveBeenCalledTimes(1);
    const [{ locale, data }] = (req.payload.update as ReturnType<typeof vi.fn>).mock.calls[0] as [{ locale: string; data: { layout: Layout } }];
    expect(locale).toBe('en');
    expect(data.layout[0]?.blockKey).toBe('k1');
    expect(data.layout[0]?.heading).toBe('Hello [tr]');
  });

  it('should not write the other locale on a pure field edit', async () => {
    const store = {
      vi: [{ blockType: 'text', blockKey: 'k1', heading: 'Edited', background: 'theme' }] as Layout,
      en: [{ blockType: 'text', blockKey: 'k1', heading: 'Hola', background: 'theme' }] as Layout,
    };
    const req = makeReq('vi', store, new Set(['k1']));
    await mirrorLocaleLayout({ doc: { id: 1 }, req } as never);
    expect(req.payload.update).not.toHaveBeenCalled();
  });

  it('should delete a removed block from the other locale', async () => {
    const store = { vi: [] as Layout, en: [{ blockType: 'text', blockKey: 'k1', heading: 'Hola' }] as Layout };
    const req = makeReq('vi', store, new Set(['k1']));
    await mirrorLocaleLayout({ doc: { id: 1 }, req } as never);
    expect(req.payload.update).toHaveBeenCalledTimes(1);
    const [{ locale, data }] = (req.payload.update as ReturnType<typeof vi.fn>).mock.calls[0] as [{ locale: string; data: { layout: Layout } }];
    expect(locale).toBe('en');
    expect(data.layout).toEqual([]);
  });

  it('should reorder the other locale to match the active order, preserving text', async () => {
    const store = {
      vi: [{ blockType: 'text', blockKey: 'k2' }, { blockType: 'text', blockKey: 'k1' }] as Layout,
      en: [{ blockType: 'text', blockKey: 'k1', heading: 'A' }, { blockType: 'text', blockKey: 'k2', heading: 'B' }] as Layout,
    };
    const req = makeReq('vi', store, new Set(['k1', 'k2']));
    await mirrorLocaleLayout({ doc: { id: 1 }, req } as never);
    const [{ data }] = (req.payload.update as ReturnType<typeof vi.fn>).mock.calls[0] as [{ data: { layout: Layout } }];
    expect(data.layout.map(blockKeyOf)).toEqual(['k2', 'k1']);
    expect(data.layout[0]?.heading).toBe('B');
    expect(data.layout[1]?.heading).toBe('A');
  });

  it('should preserve other-locale-only blocks and not write when nothing structural changed', async () => {
    const store = {
      vi: [{ blockType: 'text', blockKey: 'k1', heading: 'Hi' }] as Layout,
      en: [{ blockType: 'text', blockKey: 'k1', heading: 'Hola' }, { blockType: 'text', blockKey: 'kOther', heading: 'en-only' }] as Layout,
    };
    const req = makeReq('vi', store, new Set(['k1']));
    await mirrorLocaleLayout({ doc: { id: 1 }, req } as never);
    expect(req.payload.update).not.toHaveBeenCalled(); // en-only block already there, no change
  });

  it('should short-circuit when skipMirror is set', async () => {
    const store = { vi: [{ blockType: 'text', blockKey: 'k1', heading: 'Hi' }] as Layout, en: [] as Layout };
    const req = makeReq('vi', store);
    req.skipMirror = true;
    await mirrorLocaleLayout({ doc: { id: 1 }, req } as never);
    expect(req.payload.update).not.toHaveBeenCalled();
  });

  it('should mirror all blocks on first create', async () => {
    const store = {
      vi: [{ blockType: 'text', blockKey: 'k1', heading: 'A' }, { blockType: 'text', blockKey: 'k2', heading: 'B' }] as Layout,
      en: [] as Layout,
    };
    const req = makeReq('vi', store);
    await mirrorLocaleLayout({ doc: { id: 1 }, req } as never);
    const [{ data }] = (req.payload.update as ReturnType<typeof vi.fn>).mock.calls[0] as [{ data: { layout: Layout } }];
    expect(data.layout.map(blockKeyOf)).toEqual(['k1', 'k2']);
    expect(data.layout[0]?.heading).toBe('A [tr]');
  });
});

describe('capturePriorLayoutKeys', () => {
  it('should stash the prior blockKey set from originalDoc onto req', () => {
    const req = makeReq('vi', { vi: [], en: [] });
    const data = { layout: [{ blockType: 'text', blockKey: 'new' }] };
    capturePriorLayoutKeys({ data, originalDoc: { layout: [{ blockType: 'text', blockKey: 'old1' }, { blockType: 'text', blockKey: 'old2' }] }, req } as never);
    expect(req.__mirrorPriorKeys).toEqual(new Set(['old1', 'old2']));
  });

  it('should short-circuit when skipMirror is set', () => {
    const req = makeReq('vi', { vi: [], en: [] });
    req.skipMirror = true;
    const data = { layout: [] };
    capturePriorLayoutKeys({ data, originalDoc: { layout: [{ blockType: 'text', blockKey: 'x' }] }, req } as never);
    expect(req.__mirrorPriorKeys).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run lib/__tests__/mirror-locale-layout.test.ts`
Expected: FAIL — `@/src/payload/hooks/mirror-locale-layout` does not exist.

- [ ] **Step 3: Implement the hooks**

Create `src/payload/hooks/mirror-locale-layout.ts`:

```ts
// src/payload/hooks/mirror-locale-layout.ts — keep the two locales' page layouts structurally
// in sync: adds/deletes/reorders mirror across vi <-> en, while field edits stay per-locale.
// Newly created blocks are auto-translated via OpenRouter (best-effort).
import type {
  CollectionAfterChangeHook,
  CollectionBeforeChangeHook,
  PayloadRequest,
} from 'payload';
import { getBlockSchemas } from '@/lib/page-builder/block-schemas';
import { stripBlockIds } from '@/lib/page-builder/strip-block-ids';
import type { PageBlock } from '@/lib/page-builder';
import { reconcileLayout, blockKeyOf, type KeyedBlock } from '@/lib/page-builder/mirror/reconcile';
import {
  collectTranslatable,
  applyTranslations,
  type TextEntry,
} from '@/lib/page-builder/mirror/translatable';
import { createTranslateClient, translateTextMap } from '@/lib/page-builder/mirror/translate';

const LOCALES = ['vi', 'en'] as const;
type Locale = (typeof LOCALES)[number];

function otherOf(locale: string): Locale | undefined {
  if (locale === 'vi') return 'en';
  if (locale === 'en') return 'vi';
  return undefined;
}

type MirrorReq = PayloadRequest & {
  skipMirror?: boolean;
  __mirrorPriorKeys?: Set<string>;
};

export const capturePriorLayoutKeys: CollectionBeforeChangeHook = ({ data, originalDoc, req }) => {
  const mreq = req as MirrorReq;
  if (mreq.skipMirror) return data;
  const prior = Array.isArray(originalDoc?.layout) ? originalDoc.layout : [];
  mreq.__mirrorPriorKeys = new Set(
    prior.map((b) => blockKeyOf(b)).filter((k): k is string => !!k),
  );
  return data;
};

export const mirrorLocaleLayout: CollectionAfterChangeHook = async ({ doc, req }) => {
  const mreq = req as MirrorReq;
  if (mreq.skipMirror) return doc;

  const activeLocale = typeof req.locale === 'string' ? req.locale : undefined;
  if (!activeLocale) return doc;
  const otherLocale = otherOf(activeLocale);
  if (!otherLocale) return doc;

  const pageId = (doc as { id?: string | number })?.id;
  if (pageId === undefined) return doc;

  // Load both locales at depth 0 so uploads/relationships are bare ids (safe to re-save),
  // and so we compare the just-committed active layout against the other locale's current one.
  let newLayout: KeyedBlock[];
  let otherLayout: KeyedBlock[];
  try {
    const [activeDoc, otherDoc] = await Promise.all([
      req.payload.findByID({ collection: 'pages', id: pageId, locale: activeLocale, depth: 0, req }),
      req.payload.findByID({ collection: 'pages', id: pageId, locale: otherLocale, depth: 0, req }),
    ]);
    newLayout = Array.isArray(activeDoc?.layout) ? (activeDoc.layout as KeyedBlock[]) : [];
    otherLayout = Array.isArray(otherDoc?.layout) ? (otherDoc.layout as KeyedBlock[]) : [];
  } catch (err) {
    console.warn('[mirror] could not load layouts, skipping:', err);
    return doc;
  }

  const priorKeys = mreq.__mirrorPriorKeys ?? new Set<string>();
  const { reconciled, addedForOther, removedKeys, changed } = reconcileLayout(
    newLayout,
    otherLayout,
    priorKeys,
  );
  void removedKeys; // already applied inside reconcile (dropped from the rebuilt array)
  if (!changed) return doc; // pure field edit → leave the other locale alone

  // Collect translatable text from the newly-added blocks. Use composite "blockKey::path"
  // keys in the batch so two added blocks with the same field name (e.g. "heading") don't
  // collide in the single LLM call.
  const schemas = getBlockSchemas();
  const schemaBySlug = new Map(schemas.map((s) => [s.slug, s]));
  const batch: TextEntry[] = [];
  for (const block of reconciled) {
    const k = blockKeyOf(block);
    if (k && addedForOther.has(k)) {
      const schema = schemaBySlug.get(block.blockType ?? '') ?? null;
      for (const e of collectTranslatable(block, schema)) {
        batch.push({ path: `${k}::${e.path}`, value: e.value });
      }
    }
  }

  const translatedMap =
    batch.length > 0
      ? await translateTextMap(batch, activeLocale, otherLocale, createTranslateClient())
      : {};

  // Apply translations back per-block (strip the composite prefix).
  const finalLayout = reconciled.map((block) => {
    const k = blockKeyOf(block);
    if (!k || !addedForOther.has(k)) return block;
    const schema = schemaBySlug.get(block.blockType ?? '') ?? null;
    const mine: Record<string, string> = {};
    for (const e of collectTranslatable(block, schema)) {
      const v = translatedMap[`${k}::${e.path}`];
      if (typeof v === 'string') mine[e.path] = v;
    }
    return applyTranslations(block, mine);
  }) as PageBlock[];

  // Write the other locale. Strip ids (both reused and cloned) so Payload mints fresh
  // per-locale ids — blockKey survives. skipMirror prevents the nested write from
  // re-triggering this hook (infinite recursion).
  try {
    mreq.skipMirror = true;
    await req.payload.update({
      collection: 'pages',
      id: pageId,
      locale: otherLocale,
      data: { layout: stripBlockIds(finalLayout, schemas) },
      req,
    });
  } catch (err) {
    console.warn('[mirror] failed to write other locale:', err);
  } finally {
    mreq.skipMirror = false;
  }
  return doc;
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run lib/__tests__/mirror-locale-layout.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 5: Wire the hooks into `Pages`**

In `src/payload/collections/Pages.ts`, add the import near the other `@/src/payload` imports (after line 14, the `groups` import):

```ts
import { capturePriorLayoutKeys, mirrorLocaleLayout } from '@/src/payload/hooks/mirror-locale-layout';
```

Update the `hooks` block (lines 159-163) from:

```ts
  hooks: {
    beforeChange: [autoSlugFromTitle],
    afterChange: [afterChangeHook],
    afterDelete: [afterDeleteHook],
  },
```

to:

```ts
  hooks: {
    beforeChange: [autoSlugFromTitle, capturePriorLayoutKeys],
    afterChange: [afterChangeHook, mirrorLocaleLayout],
    afterDelete: [afterDeleteHook],
  },
```

- [ ] **Step 6: Run type check and full suite**

Run: `pnpm check-types && pnpm test`
Expected: PASS. (If `tsc` flags `block.blockType` access on `KeyedBlock`, cast via `(block as { blockType?: string }).blockType` — the `PageBlock` union exposes `blockType` as a literal union so this should resolve, but the cast is the fallback.)

- [ ] **Step 7: Commit**

```bash
git add src/payload/hooks/mirror-locale-layout.ts src/payload/collections/Pages.ts \
  lib/__tests__/mirror-locale-layout.test.ts
git commit -m "feat(page-builder): mirror structural changes across locales with auto-translation

afterChange hook on Pages diffs the active locale against the other by
blockKey, mirrors adds/deletes/reorders, and translates newly-added blocks'
text via OpenRouter. Field edits never propagate. skipMirror guards
recursion; all failures are caught so a hook error never blocks a save.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 6: Legacy backfill script + env docs

Existing pages have blocks without a `blockKey` (created before this feature). Run a one-time script to assign keys to every block in both locales so the runtime never encounters unkeyed blocks (which the reconcile step skips, to avoid duplication). Also document the env vars.

**Files:**
- Create: `scripts/backfill-block-keys.ts`
- Modify: `.env.example`
- Optional: `package.json` (add a script entry)

**Interfaces:**
- Consumes: `getPayload` from `payload`, `@payload-config`, `stripBlockIds`, `getBlockSchemas`, `crypto.randomUUID()`.
- Produces: an idempotent script runnable via `pnpm tsx scripts/backfill-block-keys.ts`.

- [ ] **Step 1: Write the backfill script**

Create `scripts/backfill-block-keys.ts`:

```ts
// scripts/backfill-block-keys.ts — one-time: assign a blockKey to every layout block (all
// locales) that lacks one, so the mirror hook can track blocks across locales. Idempotent:
// blocks that already have a key are left alone. Passes skipMirror so the afterChange hook
// does not fire during the backfill.
import { getPayload } from 'payload';
import config from '@payload-config';
import { stripBlockIds } from '@/lib/page-builder/strip-block-ids';
import { getBlockSchemas } from '@/lib/page-builder/block-schemas';

const LOCALES = ['vi', 'en'];
const newKey = (): string =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `bk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

async function main(): Promise<void> {
  const payload = await getPayload({ config });
  const schemas = getBlockSchemas();
  const { docs } = await payload.find({ collection: 'pages', limit: 0, depth: 0 });

  for (const page of docs) {
    for (const locale of LOCALES) {
      const doc = await payload.findByID({ collection: 'pages', id: page.id, locale, depth: 0 });
      const layout = Array.isArray(doc?.layout) ? (doc.layout as Record<string, unknown>[]) : [];
      let changed = false;
      const next = layout.map((b) => {
        if (typeof b.blockKey === 'string' && b.blockKey) return b;
        changed = true;
        return { ...b, blockKey: newKey() };
      });
      if (changed) {
        await payload.update({
          collection: 'pages',
          id: page.id,
          locale,
          data: { layout: stripBlockIds(next as never, schemas) },
          req: { skipMirror: true } as never,
        });
        console.log(`backfilled blockKeys: page "${page.slug}" (${locale})`);
      }
    }
  }
  console.log('done');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
```

- [ ] **Step 2: Document the env vars**

Append to `.env.example` (if these keys are not already present):

```
# Mirror-on-create auto-translation (page builder). Optional: if unset, newly-added blocks
# are still mirrored across locales but their text is copied untranslated (with a warning).
OPENROUTER_API_KEY=
OPENROUTER_MODEL=meta-llama/llama-3.3-70b-instruct:free
```

- [ ] **Step 3: Add a convenience script entry (optional)**

In `package.json`, add to `scripts` (alphabetically near the other `payload:*` entries):

```json
    "payload:backfill-block-keys": "tsx scripts/backfill-block-keys.ts",
```

- [ ] **Step 4: Verify the script type-checks**

Run: `pnpm check-types`
Expected: PASS. (Do NOT run the script against the DB unless the user asks — it mutates production data. Note this in the commit body.)

- [ ] **Step 5: Commit**

```bash
git add scripts/backfill-block-keys.ts .env.example package.json
git commit -m "chore(page-builder): add blockKey backfill script and env docs

One-time idempotent script assigns a blockKey to legacy blocks in both
locales so the mirror hook can track them. Document OPENROUTER_API_KEY /
OPENROUTER_MODEL (optional — feature degrades to untranslated copy if unset).

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 7: Final verification

Confirm the whole feature composes and nothing regressed.

- [ ] **Step 1: Full test suite + type check**

Run: `pnpm test && pnpm check-types`
Expected: PASS — all new tests (`block-key`, `reconcile-layout`, `translatable`, `translate`, `mirror-locale-layout`) and all pre-existing tests green; `tsc --noEmit` clean.

- [ ] **Step 2: Manual smoke test (documented, user-run)**

Do not run automatically. Note for the user:
1. Set `OPENROUTER_API_KEY` in `.env` (optional — without it, mirroring still works, text is copied untranslated).
2. Run `pnpm payload:backfill-block-keys` once against the dev DB to key legacy blocks.
3. Start the editor (`pnpm dev`), open a page in `/vi/build/<slug>`, add a `Text` section with a heading, and save.
4. Switch to `/en/build/<slug>` — the section should appear with the heading translated (or copied verbatim if no API key).
5. Edit the heading in `/vi` and save — confirm `/en`'s heading is **unchanged**.
6. Delete the section in `/vi` and save — confirm it disappears from `/en`.

- [ ] **Step 3: Commit any small fixes from step 1 (if needed)**

If `pnpm test` or `pnpm check-types` surfaced fixes, commit them:

```bash
git add -A
git commit -m "fix(page-builder): satisfy strict types / tests for mirror feature

Co-Authored-By: Claude <noreply@anthropic.com>"
```

If nothing needed fixing, skip this step — the feature is complete.
