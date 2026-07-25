# Page-builder Assistant Fidelity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the AI page-builder assistant use the entire block schema — fill array rows, set images, apply conditional styling, and reach the whole catalog — without inflating the system prompt.

**Architecture:** Replace the flat 37-block system-prompt contract with a compact index plus an on-demand `describe_block` tool; make field validation walk the descriptor tree instead of only its top level; add row-level tools so arrays are edited row-by-row; and replace prompt-embedded id dumps with `search_media` / `search_catalog` lookups.

**Tech Stack:** TypeScript (strict), Next.js 15 App Router route handler, Payload CMS 3.x block definitions, OpenAI-compatible function calling, Vitest.

**Spec:** `docs/superpowers/specs/2026-07-25-page-builder-assistant-fidelity-design.md`

## Global Constraints

- **No Payload schema changes and no migration.** This work only reads existing block definitions. If a task appears to need a new Payload field, stop and ask — a new field without a generated migration throws `42P01` at runtime in this repo.
- **Tests live in `lib/__tests__/` with the `assistant-*.test.ts` prefix**, not in `lib/page-builder/__tests__/` (that directory is empty and is NOT matched by any vitest `include` pattern). Route tests live in `app/api/page-builder/assistant/__tests__/`.
- **Every test file must explicitly `import { describe, expect, it } from 'vitest'`.** `globals: true` is runtime-only; without the import `tsc --noEmit` fails.
- **Never run `pnpm test` or any `pnpm <script>`** — a `runDepsStatusCheck` wrapper fails in this environment. Call binaries directly: `node_modules/.bin/vitest`, `node_modules/.bin/tsc`.
- **Dual-locale invariant:** block structure and order are shared across `vi` and `en`; only copy is per-locale. Anything that changes the number of blocks OR the number of array rows must apply to both locales.
- **Never emit `id` or `blockKey` into the model-facing contract.** `getPayload()` mutates shared Payload `Block` definitions in place, injecting an `id` field into every `array`. Leaking it makes the model write row ids, which trips the localized-save "Value must be unique: id" collision.
- **Validation stays server-side.** Tools remain plain OpenAI function-calling shape with no provider `strict` mode (Gemini's OpenAI-compat layer does not reliably support it).
- Conventional Commits, committing directly to `main` (solo project convention in `CLAUDE.md`).

---

### Task 1: Capture `admin.description` in field descriptors

Payload field definitions carry real authoring rules in `admin.description` — e.g. Hero's `headlineHighlight` says *"Must match the headline text exactly (case-insensitive)"*. `describeField` drops it today, so the model never sees any of it.

**Files:**
- Modify: `lib/page-builder/block-schemas.ts` (the `FieldDescriptor` type ~line 48, and `describeField` ~line 150)
- Test: `lib/__tests__/block-schemas.test.ts` (existing file — add cases)

**Interfaces:**
- Consumes: nothing (first task).
- Produces: `FieldDescriptor.description?: string` — read by Tasks 3 and 4.

- [ ] **Step 1: Write the failing test**

Append to `lib/__tests__/block-schemas.test.ts` (keep the file's existing imports; add `getBlockSchema` if it is not already imported):

```ts
describe('describeField — admin.description', () => {
  it('should carry a field admin description into the descriptor', () => {
    const hero = getBlockSchema('hero');
    const highlight = hero?.fields.find((f) => f.name === 'headlineHighlight');
    expect(highlight?.description).toMatch(/match the headline/i);
  });

  it('should leave description undefined when the field has none', () => {
    const hero = getBlockSchema('hero');
    const headline = hero?.fields.find((f) => f.name === 'headline');
    expect(headline?.description).toBeUndefined();
  });

  it('should carry descriptions on nested array sub-fields', () => {
    const gallery = getBlockSchema('gallery');
    const items = gallery?.fields.find((f) => f.type === 'array');
    expect(Array.isArray(items?.fields)).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `node_modules/.bin/vitest run lib/__tests__/block-schemas.test.ts`
Expected: FAIL — `expected undefined to match /match the headline/i`.

- [ ] **Step 3: Add the field to the descriptor type**

In `lib/page-builder/block-schemas.ts`, add to `FieldDescriptor` (right after the `label?: string;` line):

```ts
  /** Authoring guidance from the Payload field's `admin.description`. Surfaced to the
   * AI assistant's block contract — this is where rules like "must match the headline
   * exactly" live, and dropping it loses them. Only plain-string descriptions are
   * captured; Payload also allows a function/JSX form, which is not serializable. */
  description?: string;
```

- [ ] **Step 4: Populate it in `describeField`**

In `describeField`, immediately after the existing `if ('label' in field && typeof field.label === 'string') base.label = field.label;` line:

```ts
  const adminDescription = (field as { admin?: { description?: unknown } }).admin?.description;
  if (typeof adminDescription === 'string' && adminDescription.trim().length > 0) {
    base.description = adminDescription.trim();
  }
```

Because `describeField` already recurses into `array`/`group` sub-fields, nested descriptions are captured with no extra work.

- [ ] **Step 5: Run the test and confirm it passes**

Run: `node_modules/.bin/vitest run lib/__tests__/block-schemas.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/page-builder/block-schemas.ts lib/__tests__/block-schemas.test.ts
git commit -m "feat(page-builder): capture field admin.description in block schemas"
```

---

### Task 2: Schema-tree helpers

Three concerns are needed by both the contract renderer (Tasks 3–4) and the validator (Task 5): hiding injected identity fields, and separating the shared appearance group from a block's own fields. Putting them in one small module keeps that logic single-sourced.

**Files:**
- Create: `lib/page-builder/assistant/schema-tree.ts`
- Test: `lib/__tests__/assistant-schema-tree.test.ts`

**Interfaces:**
- Consumes: `FieldDescriptor` from Task 1.
- Produces:
  - `APPEARANCE_FIELD_NAMES: ReadonlySet<string>`
  - `contentFields(fields: FieldDescriptor[]): FieldDescriptor[]`
  - `splitAppearance(fields: FieldDescriptor[]): { own: FieldDescriptor[]; appearance: FieldDescriptor[] }`

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/assistant-schema-tree.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  APPEARANCE_FIELD_NAMES,
  contentFields,
  splitAppearance,
} from '@/lib/page-builder/assistant/schema-tree';
import { getBlockSchema } from '@/lib/page-builder/block-schemas';
import type { FieldDescriptor } from '@/lib/page-builder/block-schemas';

describe('APPEARANCE_FIELD_NAMES', () => {
  it('should be derived from the shared appearance field group', () => {
    expect(APPEARANCE_FIELD_NAMES.has('background')).toBe(true);
    expect(APPEARANCE_FIELD_NAMES.has('backgroundCustomDark')).toBe(true);
    expect(APPEARANCE_FIELD_NAMES.has('scrollAnimation')).toBe(true);
    expect(APPEARANCE_FIELD_NAMES.has('headline')).toBe(false);
  });
});

describe('contentFields', () => {
  it('should drop id and blockKey at the top level', () => {
    const fields = [
      { name: 'id', type: 'text' },
      { name: 'blockKey', type: 'text' },
      { name: 'headline', type: 'text' },
    ] as FieldDescriptor[];
    expect(contentFields(fields).map((f) => f.name)).toEqual(['headline']);
  });

  it('should drop id injected into nested array row fields', () => {
    const fields = [
      {
        name: 'items',
        type: 'array',
        fields: [
          { name: 'id', type: 'text' },
          { name: 'question', type: 'text' },
        ],
      },
    ] as FieldDescriptor[];
    const rows = contentFields(fields)[0]?.fields ?? [];
    expect(rows.map((f) => f.name)).toEqual(['question']);
  });

  it('should not mutate the input descriptors', () => {
    const fields = [{ name: 'id', type: 'text' }, { name: 'a', type: 'text' }] as FieldDescriptor[];
    contentFields(fields);
    expect(fields).toHaveLength(2);
  });
});

describe('splitAppearance', () => {
  it('should separate a real block into its own fields and the shared appearance set', () => {
    const faq = getBlockSchema('faq')!;
    const { own, appearance } = splitAppearance(faq.fields);
    expect(own.map((f) => f.name)).toContain('items');
    expect(own.map((f) => f.name)).not.toContain('background');
    expect(appearance.map((f) => f.name)).toContain('background');
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `node_modules/.bin/vitest run lib/__tests__/assistant-schema-tree.test.ts`
Expected: FAIL — cannot resolve `@/lib/page-builder/assistant/schema-tree`.

- [ ] **Step 3: Write the implementation**

Create `lib/page-builder/assistant/schema-tree.ts`:

```ts
// lib/page-builder/assistant/schema-tree.ts — shared shaping of block field descriptors
// for the AI assistant. Both the model-facing contract and the server-side validator walk
// the same tree, so the rules for what the model may see and write live here once.
import { appearanceFields } from '@/src/payload/blocks/_appearance';
import type { FieldDescriptor } from '@/lib/page-builder/block-schemas';

/** Identity fields the model must never see or write. `blockKey` is ours (it links the two
 * locale copies of a block); `id` is injected into every array by Payload itself — calling
 * getPayload() mutates the shared Block definitions in place. A model that writes row ids
 * trips the localized-save "Value must be unique: id" collision. */
const HIDDEN_FIELD_NAMES: ReadonlySet<string> = new Set(['id', 'blockKey']);

/** Names of the appearance group every block shares. Derived from the actual field
 * definitions rather than hardcoded, so adding an appearance knob can't silently
 * desynchronise the contract. */
export const APPEARANCE_FIELD_NAMES: ReadonlySet<string> = new Set(
  appearanceFields
    .map((f) => ('name' in f && typeof f.name === 'string' ? f.name : ''))
    .filter((name) => name.length > 0),
);

/** Strip hidden identity fields at every depth. Returns new arrays; inputs are untouched. */
export function contentFields(fields: FieldDescriptor[]): FieldDescriptor[] {
  return fields
    .filter((f) => !HIDDEN_FIELD_NAMES.has(f.name))
    .map((f) => (f.fields ? { ...f, fields: contentFields(f.fields) } : f));
}

/** Split a block's fields into the ones unique to it and the shared appearance group.
 * The appearance group is documented once in the system prompt, so per-block descriptions
 * only need to cover `own`. */
export function splitAppearance(fields: FieldDescriptor[]): {
  own: FieldDescriptor[];
  appearance: FieldDescriptor[];
} {
  const visible = contentFields(fields);
  return {
    own: visible.filter((f) => !APPEARANCE_FIELD_NAMES.has(f.name)),
    appearance: visible.filter((f) => APPEARANCE_FIELD_NAMES.has(f.name)),
  };
}
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `node_modules/.bin/vitest run lib/__tests__/assistant-schema-tree.test.ts`
Expected: PASS (10 assertions across 5 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/page-builder/assistant/schema-tree.ts lib/__tests__/assistant-schema-tree.test.ts
git commit -m "feat(assistant): add schema-tree helpers for contract and validation"
```

---

### Task 3: Compact block index and shared appearance doc

Replaces the flat 37-block contract. Today `buildSystemPrompt` produces 30,567 chars (~7,642 tokens); after this task the whole prompt must be under 20,000 chars (~5k tokens) while still naming every block.

**Files:**
- Create: `lib/page-builder/assistant/contract.ts`
- Modify: `lib/page-builder/assistant/tools.ts` (`buildSystemPrompt`, and delete `describeBlock` / `describeFieldLine` once `contract.ts` owns rendering)
- Test: `lib/__tests__/assistant-contract.test.ts`
- Test: `lib/__tests__/assistant-tools.test.ts` (existing — add the budget guard)

**Interfaces:**
- Consumes: `splitAppearance`, `contentFields` (Task 2); `FieldDescriptor.description` (Task 1).
- Produces:
  - `buildBlockIndex(schemas: BlockSchema[]): string`
  - `buildAppearanceDoc(schemas: BlockSchema[]): string`
  - `describeFieldLine(field: FieldDescriptor, indent: string): string`
  - `describeBlockSpec(schema: BlockSchema): string` — called by the route in Task 4
  - `buildSystemPrompt(schemas: BlockSchema[]): string` — **note the signature loses its second `relationshipOptions` argument**; Task 8 removes the last caller that passes one, and this task updates the call site in `route.ts` to pass only `schemas`.

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/assistant-contract.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { buildBlockIndex, buildAppearanceDoc } from '@/lib/page-builder/assistant/contract';
import { getBlockSchemas } from '@/lib/page-builder/block-schemas';

const schemas = getBlockSchemas();

describe('buildBlockIndex', () => {
  it('should list every registered block slug', () => {
    const index = buildBlockIndex(schemas);
    for (const s of schemas) {
      expect(index).toContain(s.slug);
    }
  });

  it('should mark array fields with a bracket suffix', () => {
    const index = buildBlockIndex(schemas);
    const faqLine = index.split('\n').find((l) => l.trim().startsWith('faq '));
    expect(faqLine).toContain('items[]');
  });

  it('should collapse the shared appearance group to a single marker', () => {
    const index = buildBlockIndex(schemas);
    const faqLine = index.split('\n').find((l) => l.trim().startsWith('faq '));
    expect(faqLine).toContain('+appearance');
    expect(faqLine).not.toContain('backgroundCustomDark');
  });

  it('should never expose id or blockKey', () => {
    const index = buildBlockIndex(schemas);
    expect(index).not.toContain('blockKey');
  });

  it('should stay well under the full contract size', () => {
    expect(buildBlockIndex(schemas).length).toBeLessThan(12000);
  });
});

describe('buildAppearanceDoc', () => {
  it('should document the appearance options once, with their enum values', () => {
    const doc = buildAppearanceDoc(schemas);
    expect(doc).toContain('background');
    expect(doc).toContain('containerWidth');
    expect(doc).toContain('scrollAnimation');
  });

  it('should state the condition gating custom background', () => {
    const doc = buildAppearanceDoc(schemas);
    expect(doc).toMatch(/backgroundCustom[\s\S]*background="custom"/);
  });
});
```

Append to `lib/__tests__/assistant-tools.test.ts` (inside the existing `describe('buildSystemPrompt', …)` block):

```ts
  it('should stay under the 20000-char prompt budget', () => {
    const prompt = buildSystemPrompt(getBlockSchemas());
    expect(prompt.length).toBeLessThan(20000);
  });

  it('should instruct the model to call describe_block before using a block', () => {
    const prompt = buildSystemPrompt(getBlockSchemas());
    expect(prompt).toContain('describe_block');
  });
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `node_modules/.bin/vitest run lib/__tests__/assistant-contract.test.ts lib/__tests__/assistant-tools.test.ts`
Expected: FAIL — cannot resolve `@/lib/page-builder/assistant/contract`; the budget test fails at 30567 chars.

- [ ] **Step 3: Write the contract renderer**

Create `lib/page-builder/assistant/contract.ts`:

```ts
// lib/page-builder/assistant/contract.ts — renders block schemas into the model-facing
// contract. Two tiers: a compact index of every block that lives in the system prompt, and
// a full per-block spec served on demand by the describe_block tool. Expanding all 37
// blocks inline costs ~22k tokens per turn; the index costs ~2.5k.
import type { BlockSchema, FieldDescriptor } from '@/lib/page-builder/block-schemas';
import { splitAppearance } from '@/lib/page-builder/assistant/schema-tree';
import { THEMED_COLOR_BASES } from '@/lib/page-builder/themed-color';

/** Short type hint used in the compact index: just the name, with `[]` marking arrays. */
function indexFieldName(field: FieldDescriptor): string {
  return field.type === 'array' ? `${field.name}[]` : field.name;
}

/** One line per block: slug, label, its own field names, and the shared appearance marker. */
export function buildBlockIndex(schemas: BlockSchema[]): string {
  return schemas
    .map((schema) => {
      const { own, appearance } = splitAppearance(schema.fields);
      const names = own.map(indexFieldName).join(', ');
      const suffix = appearance.length > 0 ? ', +appearance' : '';
      return `  ${schema.slug} — ${schema.label}. fields: ${names}${suffix}`;
    })
    .join('\n');
}

/** Render one field as a full spec line for describe_block. `indent` nests array rows. */
export function describeFieldLine(field: FieldDescriptor, indent: string): string {
  const parts: string[] = [];

  if (field.type === 'array') {
    parts.push(`${indent}${field.name}: array of rows, each:`);
    for (const sub of field.fields ?? []) {
      parts.push(describeFieldLine(sub, `${indent}    `));
    }
    if (field.description) parts.push(`${indent}    note: ${field.description}`);
    return parts.join('\n');
  }

  if (field.type === 'group') {
    parts.push(`${indent}${field.name}: object with:`);
    for (const sub of field.fields ?? []) {
      parts.push(describeFieldLine(sub, `${indent}    `));
    }
    return parts.join('\n');
  }

  let line = `${indent}${field.name}: `;
  if (field.type === 'relationship') {
    const target = field.relationTo ?? 'a collection';
    const many = field.hasMany ? ' (array of numeric ids)' : '';
    line += `numeric id of a ${target}${many} — call search_catalog to find one; never invent an id, omit to leave unbound`;
  } else if (field.type === 'upload') {
    line += `numeric media id — call search_media to find one; omit to leave the image unset`;
  } else if (field.type === 'richText') {
    line += 'richText — provide a Markdown string (paragraphs, # headings, **bold**, *italic*, [text](url), - lists)';
  } else {
    line += field.type;
    if (field.options) line += ` (one of: ${field.options.map((o) => o.value).join(', ')})`;
    if (typeof field.min === 'number' && typeof field.max === 'number') line += ` (${field.min}–${field.max})`;
    else if (typeof field.min === 'number') line += ` (min ${field.min})`;
    else if (typeof field.max === 'number') line += ` (max ${field.max})`;
  }

  if (field.defaultValue !== undefined) line += ` [default ${JSON.stringify(field.defaultValue)}]`;
  if (field.required) line += ' [required]';
  if (field.condition) {
    line += ` — ONLY applies when ${field.condition.field}=${JSON.stringify(field.condition.equals)}; set that too or this value is ignored`;
  }
  if (field.description) line += ` — ${field.description}`;
  return line;
}

/** The light/dark slot pairs the model must set together, derived from THEMED_COLOR_BASES
 *  so the prompt tracks the schema instead of hardcoding field names. */
function themedColorPairs(): string {
  return Array.from(THEMED_COLOR_BASES)
    .map((base) => `${base} (light) + ${base}Dark (dark)`)
    .join(', ');
}

/** Every block carries the same appearance group, so document it once here instead of
 *  repeating ~10 fields in all 37 index lines and every describe_block response. */
export function buildAppearanceDoc(schemas: BlockSchema[]): string {
  const source = schemas.find((s) => splitAppearance(s.fields).appearance.length > 0);
  const appearance = source ? splitAppearance(source.fields).appearance : [];
  const lines = appearance.map((f) => describeFieldLine(f, '  ')).join('\n');
  return [
    'SHARED APPEARANCE FIELDS (available on every block shown with "+appearance"):',
    lines,
    '',
    `Themed color pairs — set BOTH slots whenever you set a background: ${themedColorPairs()}. The base field is the LIGHT-mode value and the "Dark" field is the DARK-mode value. If you only know one color (e.g. from an image), set the light slot to it and derive a readable dark-mode variant for the "Dark" slot (dark surfaces with light text).`,
  ].join('\n');
}

/** Full spec for one block: its own fields expanded to any depth. Appearance fields are
 *  omitted — they are documented once in the system prompt. */
export function describeBlockSpec(schema: BlockSchema): string {
  const { own, appearance } = splitAppearance(schema.fields);
  const lines = own.map((f) => describeFieldLine(f, '    ')).join('\n');
  const tail =
    appearance.length > 0
      ? '\n    (plus the shared appearance fields documented in the system prompt)'
      : '';
  return `${schema.slug} — ${schema.label}\n${lines}${tail}`;
}
```

- [ ] **Step 4: Rewrite `buildSystemPrompt` to use the index**

In `lib/page-builder/assistant/tools.ts`: delete the local `describeFieldLine`, `describeBlock`, and `themedColorPairs` functions and the now-unused `THEMED_COLOR_BASES` import, then replace `buildSystemPrompt` (keep `ASSISTANT_TOOLS` and the `RelationshipOptions` export untouched — Task 8 removes the latter):

```ts
import { buildBlockIndex, buildAppearanceDoc } from '@/lib/page-builder/assistant/contract';

export function buildSystemPrompt(schemas: BlockSchema[]): string {
  return [
    'You are a page-building assistant for an e-commerce storefront CMS.',
    'You construct and edit a page by calling the provided tools to mutate a block layout.',
    'You can ONLY use the block types and fields listed in the index below — never invent a blockType or field name.',
    '',
    'HOW TO USE A BLOCK:',
    'The index below lists every block and its field NAMES only. Before the first add_block or update_block against a block type, call describe_block(slug) to get that block\'s full field spec — types, allowed enum values, defaults, which fields are gated by a condition, and the row shape of any array field. Guessing a field shape wastes a turn on a validation error.',
    'To find an image for an upload field call search_media; to find a product or category id for a relationship field call search_catalog. Never invent an id.',
    '',
    'EDITING RULES:',
    'Indices refer to the CURRENT layout. After every tool call you receive the updated layout back — always re-read those indices before your next edit; never reuse an index from an earlier snapshot.',
    'Because add/remove/move shift the indices of every block after them, make structural edits ONE AT A TIME: issue a single add/remove/move/duplicate, wait for the echoed layout, then decide the next index from it. Do not batch several structural calls guessing at future positions.',
    'To fill or edit the rows of an array field (FAQ items, stats, cards, gallery images), use add_row / update_row / remove_row rather than rewriting the whole array through update_block.',
    'Prefer sensible defaults and concise, on-brand copy. When the user asks to "build a page", add a coherent sequence of blocks (e.g. a hero, then feature/product sections, then an FAQ or newsletter) AND fill their array rows — a block with zero rows renders as an empty section.',
    '',
    'DUAL-LOCALE EDITING:',
    'The page exists in two locales, vi and en. Block STRUCTURE, ORDER, and TYPES are shared across both locales — add_block, move_block, remove_block, and duplicate_block always affect both at once. Only COPY (text) is per-locale.',
    'Array ROW COUNT is also shared: add_row and remove_row affect both locales, taking `values` for the active locale and optional `valuesOther` for the translation. update_row edits one locale\'s copy and takes a `locale` tag.',
    'When you add a block, write the active-locale copy in `fields` and the other locale\'s translation in `fieldsOther`. If you omit `fieldsOther`, both locales get the same copy.',
    'Use update_block with `locale` to edit one locale\'s copy; use `locale: "both"` for shared/config fields (colors, enums, relationships).',
    'The layout snapshot truncates long strings to 80 chars. Before copying or faithfully translating a block between locales, call read_block to get its full field values.',
    '',
    buildAppearanceDoc(schemas),
    '',
    'If the user attaches an image, treat it as a design reference:',
    '- Map each visible section of the screenshot to the closest block in the index; preserve top-to-bottom order and do not skip a section that has a plausible block match.',
    '- Transcribe visible copy VERBATIM for the locale it appears to be in, and write a faithful translation for the other locale (via fields + fieldsOther).',
    '- Extract the dominant background and accent colors; set the light color slot from the image and derive a readable dark-mode variant for the paired "Dark" slot.',
    '',
    'When finished, end your turn with a one-sentence summary of what you changed.',
    '',
    'BLOCK INDEX (field names only — call describe_block for the full spec):',
    buildBlockIndex(schemas),
  ].join('\n');
}
```

- [ ] **Step 5: Update the route call site**

In `app/api/page-builder/assistant/route.ts`, change the `buildSystemPrompt` call to drop the second argument:

```ts
  const system = buildSystemPrompt(schemas);
```

`loadRelationshipOptions` and its `relationshipOptions` local stay in place until Task 8 deletes them, but nothing consumes `relationshipOptions` any more. Add this line directly beneath it so the unused-variable check stays quiet in the interim:

```ts
  void relationshipOptions; // consumed again in Task 8, which deletes both.
```

- [ ] **Step 6: Run the tests and confirm they pass**

Run: `node_modules/.bin/vitest run lib/__tests__/assistant-contract.test.ts lib/__tests__/assistant-tools.test.ts`
Expected: PASS. If the prompt-budget assertion still fails, the index is emitting appearance fields per block — check `splitAppearance` is being applied.

- [ ] **Step 7: Commit**

```bash
git add lib/page-builder/assistant/contract.ts lib/page-builder/assistant/tools.ts app/api/page-builder/assistant/route.ts lib/__tests__/assistant-contract.test.ts lib/__tests__/assistant-tools.test.ts
git commit -m "feat(assistant): replace flat block contract with compact index"
```

---

### Task 4: `describe_block` tool and unified read-only tool results

Adds the second tier. This also generalises the route's single `read` branch into a set of read-only tools, which Task 8 extends again.

**Files:**
- Modify: `lib/page-builder/assistant/validate.ts` (`ValidateResult`, `validateToolCall`)
- Modify: `lib/page-builder/assistant/tools.ts` (`ASSISTANT_TOOLS`)
- Modify: `app/api/page-builder/assistant/route.ts` (the `if ('read' in result)` branch ~line 354)
- Test: `lib/__tests__/assistant-validate.test.ts` (existing — **5 assertions couple to the old `read` shape and must be updated**)
- Test: `app/api/page-builder/assistant/__tests__/route.test.ts` (existing — add a case)

**Interfaces:**
- Consumes: `describeBlockSpec` (Task 3).
- Produces:
  - `QueryRequest` union with `kind: 'read' | 'describe'` — Task 8 adds `'searchMedia'` and `'searchCatalog'`.
  - `ValidateResult` gains `{ ok: true; query: QueryRequest }` and **loses** `{ ok: true; read: ReadRequest }`.

- [ ] **Step 1: Write the failing test**

In `lib/__tests__/assistant-validate.test.ts`, replace the whole `describe('validateToolCall — read_block', …)` block with:

```ts
describe('validateToolCall — read_block', () => {
  it('should produce a read query with index and locale', () => {
    const r = validateToolCall('read_block', { index: 2, locale: 'en' });
    expect(r).toEqual({ ok: true, query: { kind: 'read', index: 2, locale: 'en' } });
  });

  it('should default the locale to undefined when omitted', () => {
    const r = validateToolCall('read_block', { index: 0 });
    expect(r.ok).toBe(true);
    if (r.ok && 'query' in r) {
      expect(r.query).toEqual({ kind: 'read', index: 0 });
    }
  });

  it('should accept an integer-valued string index', () => {
    const r = validateToolCall('read_block', { index: '3', locale: 'en' });
    expect(r).toEqual({ ok: true, query: { kind: 'read', index: 3, locale: 'en' } });
  });

  it('should reject a non-integer index', () => {
    expect(validateToolCall('read_block', { index: '2.5' }).ok).toBe(false);
    expect(validateToolCall('read_block', { index: 'first' }).ok).toBe(false);
  });

  it('should reject a missing index', () => {
    expect(validateToolCall('read_block', { locale: 'vi' }).ok).toBe(false);
  });

  it('should reject an unknown locale', () => {
    expect(validateToolCall('read_block', { index: 0, locale: 'de' }).ok).toBe(false);
  });
});

describe('validateToolCall — describe_block', () => {
  it('should produce a describe query for a known block slug', () => {
    const r = validateToolCall('describe_block', { blockType: 'faq' });
    expect(r).toEqual({ ok: true, query: { kind: 'describe', slug: 'faq' } });
  });

  it('should reject an unknown block slug', () => {
    const r = validateToolCall('describe_block', { blockType: 'nope' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/unknown block/i);
  });

  it('should reject a missing block slug', () => {
    expect(validateToolCall('describe_block', {}).ok).toBe(false);
  });
});
```

Add to `lib/__tests__/assistant-contract.test.ts`:

```ts
import { describeBlockSpec } from '@/lib/page-builder/assistant/contract';
import { getBlockSchema } from '@/lib/page-builder/block-schemas';

describe('describeBlockSpec', () => {
  it('should expand array row shapes', () => {
    const spec = describeBlockSpec(getBlockSchema('faq')!);
    expect(spec).toContain('items: array of rows, each:');
    expect(spec).toContain('question');
    expect(spec).toContain('answer');
  });

  it('should list enum options and defaults', () => {
    const spec = describeBlockSpec(getBlockSchema('faq')!);
    expect(spec).toContain('accordion');
    expect(spec).toContain('twoCol');
    expect(spec).toContain('[default "accordion"]');
  });

  it('should surface admin descriptions', () => {
    const spec = describeBlockSpec(getBlockSchema('hero')!);
    expect(spec).toMatch(/headlineHighlight[\s\S]*match the headline/i);
  });

  it('should point upload fields at search_media', () => {
    const spec = describeBlockSpec(getBlockSchema('hero')!);
    expect(spec).toMatch(/image: numeric media id[\s\S]*search_media/);
  });

  it('should omit appearance fields and id', () => {
    const spec = describeBlockSpec(getBlockSchema('faq')!);
    expect(spec).not.toContain('backgroundCustomDark');
    expect(spec).not.toContain('blockKey');
  });
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `node_modules/.bin/vitest run lib/__tests__/assistant-validate.test.ts lib/__tests__/assistant-contract.test.ts`
Expected: FAIL — `describe_block` returns `Unknown tool`; read cases return `read` not `query`.

- [ ] **Step 3: Add the tool definition**

In `lib/page-builder/assistant/tools.ts`, append to the `ASSISTANT_TOOLS` array:

```ts
  {
    type: 'function',
    function: {
      name: 'describe_block',
      description:
        'Get the full field spec for one block type: every field with its type, allowed enum values, default, whether a condition gates it, and the row shape of any array field. Call this before using a block type for the first time. Returns data only; it changes nothing.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          blockType: { type: 'string', description: 'Slug of a block from the index, e.g. "faq".' },
        },
        required: ['blockType'],
      },
    },
  },
```

- [ ] **Step 4: Unify the read-only result shape in `validate.ts`**

Replace the `ReadRequest` type and the `ValidateResult` union:

```ts
/** A read-only tool request. Server-side only: the route answers these with a `tool`
 *  message and emits no client mutation. */
export type QueryRequest =
  | { kind: 'read'; index: number; locale?: 'vi' | 'en' }
  | { kind: 'describe'; slug: string };

export type ValidateResult =
  | { ok: true; mutation: Mutation }
  | { ok: true; query: QueryRequest }
  | { ok: false; error: string };
```

Replace the `read_block` case and add `describe_block`:

```ts
    case 'read_block': {
      const index = asInt(args.index);
      if (index === null) return { ok: false, error: 'read_block requires an integer index.' };
      if (args.locale !== undefined && args.locale !== 'vi' && args.locale !== 'en') {
        return { ok: false, error: 'read_block locale must be "vi" or "en".' };
      }
      const query: QueryRequest = { kind: 'read', index };
      if (args.locale === 'vi' || args.locale === 'en') query.locale = args.locale;
      return { ok: true, query };
    }
    case 'describe_block': {
      const slug = typeof args.blockType === 'string' ? args.blockType : '';
      if (!getBlockSchema(slug)) return { ok: false, error: `Unknown block type "${slug}".` };
      return { ok: true, query: { kind: 'describe', slug } };
    }
```

- [ ] **Step 5: Handle the query kinds in the route**

In `app/api/page-builder/assistant/route.ts`, replace the entire `if ('read' in result) { … }` block with:

```ts
            // Read-only tools: answered as a tool message, no client mutation emitted.
            if ('query' in result) {
              const query = result.query;
              if (query.kind === 'describe') {
                const schema = getBlockSchema(query.slug);
                messages.push({
                  role: 'tool',
                  tool_call_id: call.id,
                  content: schema ? describeBlockSpec(schema) : `Unknown block type "${query.slug}".`,
                });
                continue;
              }
              const readLocale: Locale = query.locale ?? activeLocale;
              const block = working[readLocale][query.index];
              if (!block) {
                messages.push({
                  role: 'tool',
                  tool_call_id: call.id,
                  content: `ERROR: No block at index ${query.index} in ${readLocale}.`,
                });
                continue;
              }
              messages.push({
                role: 'tool',
                tool_call_id: call.id,
                content: JSON.stringify({ index: query.index, locale: readLocale, block }),
              });
              continue;
            }
```

Update the imports at the top of the route:

```ts
import { getBlockSchemas, getBlockSchema } from '@/lib/page-builder/block-schemas';
import { describeBlockSpec } from '@/lib/page-builder/assistant/contract';
```

- [ ] **Step 6: Add the route integration test**

Append to `app/api/page-builder/assistant/__tests__/route.test.ts`, following the existing helper style (`toolCall`, `assistantTurn`, `finalTurn`, `readEvents` are already defined in that file):

```ts
  it('should answer describe_block as a tool message without emitting a mutation', async () => {
    vi.mocked(isAuthorizedAdmin).mockResolvedValue(true);
    llm.responses = [
      assistantTurn([toolCall('c1', 'describe_block', { blockType: 'faq' })]),
      finalTurn('Described the FAQ block.'),
    ];

    const res = await POST(
      new Request('http://x/api/page-builder/assistant', {
        method: 'POST',
        body: JSON.stringify({ prompt: 'what fields does faq have', layouts: { vi: [], en: [] } }),
      }),
    );
    const events = await readEvents(res);

    expect(events.some((e) => e.type === 'mutation')).toBe(false);
    const toolMessage = llm.seenMessages.at(-1)?.find(
      (m) => (m as { role?: string }).role === 'tool',
    ) as { content?: string } | undefined;
    expect(toolMessage?.content).toContain('items: array of rows, each:');
  });
```

- [ ] **Step 7: Run the tests and confirm they pass**

Run: `node_modules/.bin/vitest run lib/__tests__/assistant-validate.test.ts lib/__tests__/assistant-contract.test.ts app/api/page-builder/assistant/__tests__/route.test.ts`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add lib/page-builder/assistant/validate.ts lib/page-builder/assistant/tools.ts app/api/page-builder/assistant/route.ts lib/__tests__/assistant-validate.test.ts lib/__tests__/assistant-contract.test.ts app/api/page-builder/assistant/__tests__/route.test.ts
git commit -m "feat(assistant): add describe_block tool for on-demand block specs"
```

---

### Task 5: Recursive field validation

`checkFields` only inspects top-level keys, so a guessed array row shape reaches Payload and 400s the whole page save. This makes it walk the descriptor tree and report the failing path.

**Files:**
- Modify: `lib/page-builder/assistant/validate.ts` (`checkFields` ~line 92, `checkRelationship`, `checkNumberBounds`)
- Test: `lib/__tests__/assistant-validate.test.ts`

**Interfaces:**
- Consumes: `contentFields` (Task 2).
- Produces: `checkFields(fields: FieldDescriptor[], values: Record<string, unknown>, path?: string): string | null` — internal; the exported `validateUpdateFields(blockType, fields)` signature is unchanged.

- [ ] **Step 1: Write the failing test**

Append to `lib/__tests__/assistant-validate.test.ts`:

```ts
describe('checkFields — nested validation', () => {
  it('should reject an unknown field inside an array row', () => {
    const r = validateToolCall('add_block', {
      blockType: 'faq',
      index: 0,
      fields: { items: [{ question: 'Q', bogus: 'x' }] },
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/items\[0\]\.bogus/);
  });

  it('should accept a well-formed array row', () => {
    const r = validateToolCall('add_block', {
      blockType: 'faq',
      index: 0,
      fields: { items: [{ question: 'Q', answer: 'A' }] },
    });
    expect(r.ok).toBe(true);
  });

  it('should reject a non-array value for an array field', () => {
    const r = validateToolCall('add_block', {
      blockType: 'faq',
      index: 0,
      fields: { items: 'not an array' },
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/must be an array/i);
  });

  it('should reject a row that is not an object', () => {
    const r = validateToolCall('add_block', {
      blockType: 'faq',
      index: 0,
      fields: { items: ['just a string'] },
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/items\[0\]/);
  });

  it('should reject an id key written into a row', () => {
    const r = validateToolCall('add_block', {
      blockType: 'faq',
      index: 0,
      fields: { items: [{ id: 7, question: 'Q' }] },
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/items\[0\]\.id/);
  });

  it('should reject a non-integer media id on an upload field', () => {
    const r = validateToolCall('add_block', {
      blockType: 'hero',
      index: 0,
      fields: { image: 'media/hero.jpg' },
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/numeric media id/i);
  });

  it('should accept an integer media id on an upload field', () => {
    const r = validateToolCall('add_block', {
      blockType: 'hero',
      index: 0,
      fields: { image: 412 },
    });
    expect(r.ok).toBe(true);
  });

  it('should reject an out-of-range enum inside an array row', () => {
    // featureGrid.items[].icon is a select over a fixed icon set.
    const r = validateToolCall('add_block', {
      blockType: 'featureGrid',
      index: 0,
      fields: { items: [{ icon: 'rocket' }] },
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/items\[0\]\.icon/);
  });

  it('should accept a valid enum inside an array row', () => {
    const r = validateToolCall('add_block', {
      blockType: 'featureGrid',
      index: 0,
      fields: { items: [{ icon: 'printer' }] },
    });
    expect(r.ok).toBe(true);
  });

  it('should reject a non-integer relationship id inside an array row', () => {
    // spotlight.deals[].product is a relationship to products.
    const r = validateToolCall('add_block', {
      blockType: 'spotlight',
      index: 0,
      fields: { deals: [{ product: 'product-slug-here' }] },
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/numeric id/i);
  });

  it('should reject a number outside its bounds inside an array row', () => {
    // testimonials.entries[].rating is bounded 1–5.
    const r = validateToolCall('add_block', {
      blockType: 'testimonials',
      index: 0,
      fields: { entries: [{ quote: 'Great', rating: 9 }] },
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/at most 5/);
  });

  it('should reject a non-integer media id inside an array row', () => {
    // cardGrid.cards[].image is an upload to media.
    const r = validateToolCall('add_block', {
      blockType: 'cardGrid',
      index: 0,
      fields: { cards: [{ title: 'Card', image: 'cards/one.jpg' }] },
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/numeric media id/i);
  });

  it('should coerce a Markdown richText value inside an array row to Lexical', () => {
    const r = validateToolCall('add_block', {
      blockType: 'faq',
      index: 0,
      fields: { items: [{ question: 'Q', answer: 'Hello **world**' }] },
    });
    expect(r.ok).toBe(true);
    if (r.ok && 'mutation' in r && r.mutation.kind === 'add') {
      const rows = r.mutation.block.items as Array<Record<string, unknown>>;
      expect(typeof rows[0]?.answer).toBe('object');
    }
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `node_modules/.bin/vitest run lib/__tests__/assistant-validate.test.ts`
Expected: FAIL — the unknown-row-field and upload cases return `ok: true`.

- [ ] **Step 3: Rewrite `checkFields` recursively**

In `lib/page-builder/assistant/validate.ts`, add the import and replace `checkFields`:

```ts
import { contentFields } from '@/lib/page-builder/assistant/schema-tree';
```

```ts
/** Payload's default ID type here is numeric, so an upload value must be an integer media
 * id. The model tends to emit filenames or URLs, which Payload rejects with a 400 on the
 * whole page save. */
function checkUpload(field: FieldDescriptor, value: unknown, path: string): string | null {
  if (isUnbound(value)) return null;
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    return `Field "${path}" needs a numeric media id (got ${JSON.stringify(
      value,
    )}). Call search_media to find one, or omit the field to leave the image unset.`;
  }
  return null;
}

/** Validate a set of values against a field-descriptor list, recursing into array rows and
 * groups. `path` accumulates the dotted/bracketed location so a nested failure tells the
 * model exactly where to fix it (e.g. `items[2].layout`). Returns an error string or null. */
function checkFields(
  fields: FieldDescriptor[],
  values: Record<string, unknown>,
  path = '',
): string | null {
  const visible = contentFields(fields);
  const byName = new Map<string, FieldDescriptor>(visible.map((f) => [f.name, f]));

  for (const [key, value] of Object.entries(values)) {
    const at = path ? `${path}.${key}` : key;
    const field = byName.get(key);
    if (!field) {
      return `Unknown field "${at}". Call describe_block to see the fields this block defines.`;
    }

    if (field.type === 'array') {
      if (!Array.isArray(value)) {
        return `Field "${at}" must be an array of row objects.`;
      }
      for (let i = 0; i < value.length; i++) {
        const row = value[i];
        if (!row || typeof row !== 'object' || Array.isArray(row)) {
          return `Field "${at}[${i}]" must be an object with the row's fields.`;
        }
        const rowErr = checkFields(field.fields ?? [], row as Record<string, unknown>, `${at}[${i}]`);
        if (rowErr) return rowErr;
      }
      continue;
    }

    if (field.type === 'group') {
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return `Field "${at}" must be an object.`;
      }
      const groupErr = checkFields(field.fields ?? [], value as Record<string, unknown>, at);
      if (groupErr) return groupErr;
      continue;
    }

    if (field.options && typeof value === 'string') {
      const allowed = field.options.map((o) => o.value);
      if (!allowed.includes(value)) {
        return `Field "${at}" must be one of: ${allowed.join(', ')} (got "${value}").`;
      }
    }
    if (field.type === 'relationship') {
      const relErr = checkRelationship(field, value, at);
      if (relErr) return relErr;
    }
    if (field.type === 'upload') {
      const upErr = checkUpload(field, value, at);
      if (upErr) return upErr;
    }
    if (field.type === 'number') {
      const numErr = checkNumberBounds(field, value, at);
      if (numErr) return numErr;
    }
  }
  return null;
}
```

- [ ] **Step 4: Thread the path through the leaf checkers**

Change the two existing checkers to take the path (replacing their `field.name` usages in messages):

```ts
function checkRelationship(field: FieldDescriptor, value: unknown, path: string): string | null {
  if (isUnbound(value)) return null;
  const values = Array.isArray(value) ? value : [value];
  for (const v of values) {
    if (isUnbound(v)) continue;
    if (typeof v !== 'number' || !Number.isInteger(v)) {
      return `Field "${path}" is a relationship to "${field.relationTo ?? 'a collection'}" and must be a numeric id (got ${JSON.stringify(
        v,
      )}). Call search_catalog for a valid id, or omit it to leave the block unbound.`;
    }
  }
  return null;
}

function checkNumberBounds(field: FieldDescriptor, value: unknown, path: string): string | null {
  if (typeof value !== 'number' || Number.isNaN(value)) return null;
  if (typeof field.min === 'number' && value < field.min) {
    return `Field "${path}" must be at least ${field.min} (got ${value}).`;
  }
  if (typeof field.max === 'number' && value > field.max) {
    return `Field "${path}" must be at most ${field.max} (got ${value}).`;
  }
  return null;
}
```

- [ ] **Step 5: Update the two `checkFields` call sites**

Both previously passed a `BlockSchema`; they now pass its field list:

```ts
      const fieldErr = checkFields(schema.fields, fields);
```
```ts
        const otherErr = checkFields(schema.fields, fieldsOther);
```

And in `validateUpdateFields`:

```ts
export function validateUpdateFields(blockType: string, fields: Record<string, unknown>): string | null {
  const schema = getBlockSchema(blockType);
  if (!schema) return `Unknown block type "${blockType}".`;
  return checkFields(schema.fields, fields);
}
```

- [ ] **Step 6: Run the tests and confirm they pass**

Run: `node_modules/.bin/vitest run lib/__tests__/assistant-validate.test.ts`
Expected: PASS. The existing top-level cases must still pass — if the "no field named X" test fails, it is asserting the old message wording; update that assertion to match `/Unknown field/`.

- [ ] **Step 7: Commit**

```bash
git add lib/page-builder/assistant/validate.ts lib/__tests__/assistant-validate.test.ts
git commit -m "feat(assistant): validate array rows, groups, and upload ids recursively"
```

---

### Task 6: Row reducers

Pure array-row operations, matching the existing immutable style in `layout-reducer.ts`.

**Files:**
- Modify: `lib/page-builder/layout-reducer.ts`
- Test: `lib/__tests__/layout-reducer.test.ts` (existing — add cases)

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `addRow(layout: PageBlock[], index: number, field: string, row: Record<string, unknown>, at?: number): PageBlock[]`
  - `updateRow(layout: PageBlock[], index: number, field: string, rowIndex: number, values: Record<string, unknown>): PageBlock[]`
  - `removeRow(layout: PageBlock[], index: number, field: string, rowIndex: number): PageBlock[]`

All three return the input array unchanged when the block index or row index is out of range.

- [ ] **Step 1: Write the failing test**

Append to `lib/__tests__/layout-reducer.test.ts` (add `addRow, updateRow, removeRow` to the existing import from `@/lib/page-builder/layout-reducer`):

```ts
describe('row reducers', () => {
  const layout = [
    { blockType: 'faq', items: [{ question: 'A' }, { question: 'B' }] },
  ] as unknown as PageBlock[];

  it('should append a row when no position is given', () => {
    const next = addRow(layout, 0, 'items', { question: 'C' });
    expect((next[0] as { items: unknown[] }).items).toHaveLength(3);
    expect((next[0] as { items: Array<{ question: string }> }).items[2]?.question).toBe('C');
  });

  it('should insert a row at an explicit position', () => {
    const next = addRow(layout, 0, 'items', { question: 'C' }, 0);
    expect((next[0] as { items: Array<{ question: string }> }).items[0]?.question).toBe('C');
  });

  it('should create the array when the field is empty', () => {
    const empty = [{ blockType: 'faq' }] as unknown as PageBlock[];
    const next = addRow(empty, 0, 'items', { question: 'A' });
    expect((next[0] as { items: unknown[] }).items).toHaveLength(1);
  });

  it('should patch only the named fields of the target row', () => {
    const seeded = [
      { blockType: 'faq', items: [{ question: 'A', answer: 'x' }] },
    ] as unknown as PageBlock[];
    const next = updateRow(seeded, 0, 'items', 0, { answer: 'y' });
    const row = (next[0] as { items: Array<Record<string, unknown>> }).items[0];
    expect(row).toEqual({ question: 'A', answer: 'y' });
  });

  it('should remove the row at the given index', () => {
    const next = removeRow(layout, 0, 'items', 0);
    const items = (next[0] as { items: Array<{ question: string }> }).items;
    expect(items).toHaveLength(1);
    expect(items[0]?.question).toBe('B');
  });

  it('should return the layout unchanged for an out-of-range row index', () => {
    expect(updateRow(layout, 0, 'items', 9, { question: 'X' })).toBe(layout);
    expect(removeRow(layout, 0, 'items', 9)).toBe(layout);
  });

  it('should return the layout unchanged for an out-of-range block index', () => {
    expect(addRow(layout, 5, 'items', { question: 'X' })).toBe(layout);
  });

  it('should not mutate the input layout', () => {
    addRow(layout, 0, 'items', { question: 'C' });
    expect((layout[0] as { items: unknown[] }).items).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `node_modules/.bin/vitest run lib/__tests__/layout-reducer.test.ts`
Expected: FAIL — `addRow is not a function`.

- [ ] **Step 3: Write the implementation**

Append to `lib/page-builder/layout-reducer.ts`:

```ts
/** Read a block's array field as rows, tolerating an unset field (a block added without
 * its rows filled in yet has no key at all). */
function readRows(block: PageBlock, field: string): Record<string, unknown>[] {
  const value = (block as Record<string, unknown>)[field];
  return Array.isArray(value) ? (value as Record<string, unknown>[]) : [];
}

/** Insert a row into a block's array field. `at` defaults to the end. Rows are stored
 * without an `id` — the save path assigns those. */
export function addRow(
  layout: PageBlock[],
  index: number,
  field: string,
  row: Record<string, unknown>,
  at?: number,
): PageBlock[] {
  const block = layout[index];
  if (!block) return layout;
  const rows = readRows(block, field);
  const clamped = at === undefined ? rows.length : Math.max(0, Math.min(at, rows.length));
  const next = [...rows.slice(0, clamped), row, ...rows.slice(clamped)];
  return updateBlockField(layout, index, field, next);
}

/** Patch the named fields of one row, leaving its other fields untouched. */
export function updateRow(
  layout: PageBlock[],
  index: number,
  field: string,
  rowIndex: number,
  values: Record<string, unknown>,
): PageBlock[] {
  const block = layout[index];
  if (!block) return layout;
  const rows = readRows(block, field);
  if (rowIndex < 0 || rowIndex >= rows.length) return layout;
  const next = rows.map((row, i) => (i === rowIndex ? { ...row, ...values } : row));
  return updateBlockField(layout, index, field, next);
}

/** Delete one row from a block's array field. */
export function removeRow(
  layout: PageBlock[],
  index: number,
  field: string,
  rowIndex: number,
): PageBlock[] {
  const block = layout[index];
  if (!block) return layout;
  const rows = readRows(block, field);
  if (rowIndex < 0 || rowIndex >= rows.length) return layout;
  return updateBlockField(layout, index, field, rows.filter((_, i) => i !== rowIndex));
}
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `node_modules/.bin/vitest run lib/__tests__/layout-reducer.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/page-builder/layout-reducer.ts lib/__tests__/layout-reducer.test.ts
git commit -m "feat(page-builder): add pure row reducers for array fields"
```

---

### Task 7: Row tools end-to-end

Wires the reducers into mutations, tools, and dual-locale routing. Row **count** is structural, so `add_row`/`remove_row` apply to both locales while `update_row` honours a locale tag.

**Files:**
- Modify: `lib/page-builder/assistant/validate.ts` (`Mutation` union, three new tool cases)
- Modify: `lib/page-builder/assistant/apply.ts`
- Modify: `lib/page-builder/assistant/apply-dual.ts` (`resolveLocales`, `applyDualMutation`)
- Modify: `lib/page-builder/assistant/tools.ts` (`ASSISTANT_TOOLS`)
- Modify: `app/api/page-builder/assistant/route.ts` (row-mutation validation before apply)
- Test: `lib/__tests__/assistant-validate.test.ts`, `lib/__tests__/assistant-apply.test.ts`, `lib/__tests__/assistant-apply-dual.test.ts`

**Interfaces:**
- Consumes: `addRow`/`updateRow`/`removeRow` (Task 6); recursive `checkFields` (Task 5).
- Produces: three new `Mutation` kinds:

```ts
| { kind: 'addRow'; index: number; field: string; values: Record<string, unknown>;
    at?: number; valuesOther?: Record<string, unknown> }
| { kind: 'updateRow'; index: number; field: string; rowIndex: number;
    values: Record<string, unknown>; locale?: LocaleTag }
| { kind: 'removeRow'; index: number; field: string; rowIndex: number }
```

- [ ] **Step 1: Write the failing tests**

Append to `lib/__tests__/assistant-validate.test.ts`:

```ts
describe('validateToolCall — row tools', () => {
  it('should produce an addRow mutation', () => {
    const r = validateToolCall('add_row', {
      index: 1,
      field: 'items',
      values: { question: 'Q', answer: 'A' },
    });
    expect(r).toEqual({
      ok: true,
      mutation: { kind: 'addRow', index: 1, field: 'items', values: { question: 'Q', answer: 'A' } },
    });
  });

  it('should carry an explicit position and the other-locale values', () => {
    const r = validateToolCall('add_row', {
      index: 0,
      field: 'items',
      values: { question: 'Q' },
      valuesOther: { question: 'Câu hỏi' },
      at: 0,
    });
    expect(r.ok).toBe(true);
    if (r.ok && 'mutation' in r && r.mutation.kind === 'addRow') {
      expect(r.mutation.at).toBe(0);
      expect(r.mutation.valuesOther).toEqual({ question: 'Câu hỏi' });
    }
  });

  it('should produce an updateRow mutation with a locale tag', () => {
    const r = validateToolCall('update_row', {
      index: 1,
      field: 'items',
      rowIndex: 2,
      values: { answer: 'A' },
      locale: 'en',
    });
    expect(r).toEqual({
      ok: true,
      mutation: { kind: 'updateRow', index: 1, field: 'items', rowIndex: 2, values: { answer: 'A' }, locale: 'en' },
    });
  });

  it('should produce a removeRow mutation', () => {
    const r = validateToolCall('remove_row', { index: 1, field: 'items', rowIndex: 0 });
    expect(r).toEqual({ ok: true, mutation: { kind: 'removeRow', index: 1, field: 'items', rowIndex: 0 } });
  });

  it('should reject a row tool with a missing field name', () => {
    expect(validateToolCall('add_row', { index: 0, values: {} }).ok).toBe(false);
  });

  it('should reject a non-integer rowIndex', () => {
    expect(validateToolCall('remove_row', { index: 0, field: 'items', rowIndex: 'x' }).ok).toBe(false);
  });
});
```

Append to `lib/__tests__/assistant-apply-dual.test.ts`:

```ts
describe('applyDualMutation — rows', () => {
  const layouts = {
    vi: [{ blockType: 'faq', items: [{ question: 'Vi' }] }],
    en: [{ blockType: 'faq', items: [{ question: 'En' }] }],
  } as unknown as LocaleLayouts;

  it('should add a row to both locales, using valuesOther for the other locale', () => {
    const next = applyDualMutation(
      layouts,
      { kind: 'addRow', index: 0, field: 'items', values: { question: 'Mới' }, valuesOther: { question: 'New' } },
      'vi',
    );
    const vi = (next.vi[0] as { items: Array<{ question: string }> }).items;
    const en = (next.en[0] as { items: Array<{ question: string }> }).items;
    expect(vi.map((r) => r.question)).toEqual(['Vi', 'Mới']);
    expect(en.map((r) => r.question)).toEqual(['En', 'New']);
  });

  it('should clone the active values when valuesOther is omitted', () => {
    const next = applyDualMutation(
      layouts,
      { kind: 'addRow', index: 0, field: 'items', values: { question: 'Mới' } },
      'vi',
    );
    const en = (next.en[0] as { items: Array<{ question: string }> }).items;
    expect(en[1]?.question).toBe('Mới');
  });

  it('should remove a row from both locales so counts stay aligned', () => {
    const next = applyDualMutation(layouts, { kind: 'removeRow', index: 0, field: 'items', rowIndex: 0 }, 'vi');
    expect((next.vi[0] as { items: unknown[] }).items).toHaveLength(0);
    expect((next.en[0] as { items: unknown[] }).items).toHaveLength(0);
  });

  it('should update a row in only the tagged locale', () => {
    const next = applyDualMutation(
      layouts,
      { kind: 'updateRow', index: 0, field: 'items', rowIndex: 0, values: { question: 'Changed' }, locale: 'en' },
      'vi',
    );
    expect((next.vi[0] as { items: Array<{ question: string }> }).items[0]?.question).toBe('Vi');
    expect((next.en[0] as { items: Array<{ question: string }> }).items[0]?.question).toBe('Changed');
  });
});

describe('resolveLocales — rows', () => {
  it('should treat addRow and removeRow as structural', () => {
    expect(resolveLocales({ kind: 'addRow', index: 0, field: 'items', values: {} }, 'vi').sort()).toEqual(['en', 'vi']);
    expect(resolveLocales({ kind: 'removeRow', index: 0, field: 'items', rowIndex: 0 }, 'vi').sort()).toEqual(['en', 'vi']);
  });

  it('should treat updateRow as copy, following its locale tag', () => {
    expect(resolveLocales({ kind: 'updateRow', index: 0, field: 'items', rowIndex: 0, values: {} }, 'vi')).toEqual(['vi']);
    expect(
      resolveLocales({ kind: 'updateRow', index: 0, field: 'items', rowIndex: 0, values: {}, locale: 'both' }, 'vi').sort(),
    ).toEqual(['en', 'vi']);
  });
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `node_modules/.bin/vitest run lib/__tests__/assistant-validate.test.ts lib/__tests__/assistant-apply-dual.test.ts`
Expected: FAIL — `Unknown tool "add_row"`.

- [ ] **Step 3: Add the mutation kinds and validation**

In `lib/page-builder/assistant/validate.ts`, extend the `Mutation` union with the three kinds shown in **Interfaces** above, then add the three tool cases inside `validateToolCall`'s switch:

```ts
    case 'add_row': {
      const index = asInt(args.index);
      const field = typeof args.field === 'string' ? args.field : '';
      if (index === null) return { ok: false, error: 'add_row requires an integer index.' };
      if (!field) return { ok: false, error: 'add_row requires the array field name.' };
      const mutation: Mutation = { kind: 'addRow', index, field, values: asRecord(args.values) };
      const at = asInt(args.at);
      if (at !== null) mutation.at = at;
      if (args.valuesOther !== undefined) mutation.valuesOther = asRecord(args.valuesOther);
      return { ok: true, mutation };
    }
    case 'update_row': {
      const index = asInt(args.index);
      const rowIndex = asInt(args.rowIndex);
      const field = typeof args.field === 'string' ? args.field : '';
      if (index === null) return { ok: false, error: 'update_row requires an integer index.' };
      if (!field) return { ok: false, error: 'update_row requires the array field name.' };
      if (rowIndex === null) return { ok: false, error: 'update_row requires an integer rowIndex.' };
      const localeErr = checkLocaleTag(args.locale);
      if (localeErr) return { ok: false, error: localeErr };
      const mutation: Mutation = { kind: 'updateRow', index, field, rowIndex, values: asRecord(args.values) };
      if (typeof args.locale === 'string') mutation.locale = args.locale as LocaleTag;
      return { ok: true, mutation };
    }
    case 'remove_row': {
      const index = asInt(args.index);
      const rowIndex = asInt(args.rowIndex);
      const field = typeof args.field === 'string' ? args.field : '';
      if (index === null) return { ok: false, error: 'remove_row requires an integer index.' };
      if (!field) return { ok: false, error: 'remove_row requires the array field name.' };
      if (rowIndex === null) return { ok: false, error: 'remove_row requires an integer rowIndex.' };
      return { ok: true, mutation: { kind: 'removeRow', index, field, rowIndex } };
    }
```

`checkLocaleTag` currently returns the message `'update_block locale must be one of: vi, en, both.'`, which is now wrong for `update_row`. Generalise it:

```ts
function checkLocaleTag(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (value === 'vi' || value === 'en' || value === 'both') return null;
  return 'locale must be one of: vi, en, both.';
}
```

No existing assertion couples to that message text (only a `describe` title mentions `update_block locale`), so this change needs no test updates.

- [ ] **Step 4: Add a row-aware field validator**

The row's field values must be checked against the array's row schema, which is only knowable once the route resolves the block type. Export a helper from `validate.ts`:

```ts
/** Validate row values against a block's array-field row schema, and coerce any Markdown
 * richText inside them. Returns an error string or null. Used by the route once the target
 * block type is known from the working layout. */
export function validateRowFields(
  blockType: string,
  field: string,
  values: Record<string, unknown>,
): string | null {
  const schema = getBlockSchema(blockType);
  if (!schema) return `Unknown block type "${blockType}".`;
  const descriptor = schema.fields.find((f) => f.name === field);
  if (!descriptor) return `Block "${blockType}" has no field "${field}".`;
  if (descriptor.type !== 'array') return `Field "${field}" on "${blockType}" is not an array.`;
  const err = checkFields(descriptor.fields ?? [], values, field);
  if (err) return err;
  coerceRichText(descriptor.fields ?? [], values);
  return null;
}
```

- [ ] **Step 5: Apply the mutations**

In `lib/page-builder/assistant/apply.ts`, add the import and three switch cases:

```ts
import { addRow, updateRow, removeRow } from '@/lib/page-builder/layout-reducer';
```

```ts
    case 'addRow':
      return addRow(layout, mutation.index, mutation.field, mutation.values, mutation.at);
    case 'updateRow':
      return updateRow(layout, mutation.index, mutation.field, mutation.rowIndex, mutation.values);
    case 'removeRow':
      return removeRow(layout, mutation.index, mutation.field, mutation.rowIndex);
```

In `lib/page-builder/assistant/apply-dual.ts`, update `resolveLocales` so `updateRow` follows its tag alongside `update`:

```ts
export function resolveLocales(mutation: Mutation, activeLocale: Locale): Locale[] {
  if (mutation.kind === 'update' || mutation.kind === 'updateRow') {
    const tag = mutation.locale ?? activeLocale;
    return tag === 'both' ? [...LOCALES] : [tag];
  }
  return [...LOCALES];
}
```

And add an `addRow` branch to `applyDualMutation`, before the `update` branch, mirroring how `add` splits per-locale content:

```ts
  if (mutation.kind === 'addRow') {
    const other = otherLocale(activeLocale);
    next[activeLocale] = applyMutation(next[activeLocale], mutation);
    const otherValues = mutation.valuesOther ?? structuredClone(mutation.values);
    next[other] = applyMutation(next[other], { ...mutation, values: otherValues });
    return next;
  }

  if (mutation.kind === 'updateRow') {
    for (const loc of resolveLocales(mutation, activeLocale)) {
      next[loc] = applyMutation(next[loc], mutation);
    }
    return next;
  }
```

`removeRow` needs no branch — it falls through to the structural tail that applies to both copies.

- [ ] **Step 6: Add the tool definitions**

Append to `ASSISTANT_TOOLS` in `lib/page-builder/assistant/tools.ts`:

```ts
  {
    type: 'function',
    function: {
      name: 'add_row',
      description:
        'Add one row to an array field on a block (FAQ items, stats, cards, gallery images). Affects BOTH locales so row counts stay aligned. Use this to fill a block rather than rewriting the whole array with update_block.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          index: { type: 'integer', description: 'Index of the block that owns the array.' },
          field: { type: 'string', description: 'Name of the array field, e.g. "items".' },
          values: { type: 'object', description: 'Row values in the ACTIVE locale.' },
          valuesOther: { type: 'object', description: 'Optional translated row values for the OTHER locale.' },
          at: { type: 'integer', description: 'Optional position; appends when omitted.' },
        },
        required: ['index', 'field', 'values'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_row',
      description:
        'Patch the named fields of one row in an array field, leaving the other rows and the row\'s other fields untouched.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          index: { type: 'integer', description: 'Index of the block that owns the array.' },
          field: { type: 'string', description: 'Name of the array field.' },
          rowIndex: { type: 'integer', description: 'Zero-based index of the row to patch.' },
          values: { type: 'object', description: 'Row field values to set.' },
          locale: {
            type: 'string',
            enum: ['vi', 'en', 'both'],
            description: 'Which locale copy to update. Defaults to the active locale.',
          },
        },
        required: ['index', 'field', 'rowIndex', 'values'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'remove_row',
      description: 'Delete one row from an array field. Affects BOTH locales so row counts stay aligned.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          index: { type: 'integer' },
          field: { type: 'string' },
          rowIndex: { type: 'integer' },
        },
        required: ['index', 'field', 'rowIndex'],
      },
    },
  },
```

Update the existing tool-name assertion in `lib/__tests__/assistant-tools.test.ts` to include the new names:

```ts
    expect(ASSISTANT_TOOLS.map((t) => t.function.name).sort()).toEqual(
      [
        'add_block', 'add_row', 'describe_block', 'duplicate_block', 'move_block',
        'read_block', 'remove_block', 'remove_row', 'update_block', 'update_row',
      ].sort(),
    );
```

- [ ] **Step 7: Validate rows in the route**

In `app/api/page-builder/assistant/route.ts`, alongside the existing `if (mutation.kind === 'update')` guard, add:

```ts
            if (
              mutation.kind === 'addRow' ||
              mutation.kind === 'updateRow' ||
              mutation.kind === 'removeRow'
            ) {
              const target = working[activeLocale][mutation.index];
              let rowErr: string | null = target ? null : `No block at index ${mutation.index}.`;

              // A row index past the end would make the reducer a silent no-op: the model
              // would be told "Applied" while nothing changed, and would move on none the
              // wiser. Reject it with the real row count instead.
              if (!rowErr && (mutation.kind === 'updateRow' || mutation.kind === 'removeRow')) {
                const existing = (target as Record<string, unknown>)[mutation.field];
                const count = Array.isArray(existing) ? existing.length : 0;
                if (mutation.rowIndex < 0 || mutation.rowIndex >= count) {
                  rowErr = `No row ${mutation.rowIndex} in "${mutation.field}" (block ${mutation.index} has ${count} rows).`;
                }
              }

              if (!rowErr && (mutation.kind === 'addRow' || mutation.kind === 'updateRow')) {
                rowErr = validateRowFields(target!.blockType, mutation.field, mutation.values);
              }
              if (!rowErr && mutation.kind === 'addRow' && mutation.valuesOther) {
                rowErr = validateRowFields(target!.blockType, mutation.field, mutation.valuesOther);
              }

              if (rowErr) {
                send({ type: 'error', error: rowErr });
                messages.push({ role: 'tool', tool_call_id: call.id, content: `ERROR: ${rowErr}` });
                continue;
              }
            }
```

Add `validateRowFields` to the existing import from `@/lib/page-builder/assistant/validate`.

Add the matching route test to `app/api/page-builder/assistant/__tests__/route.test.ts`:

```ts
  it('should reject a row index past the end instead of silently no-opping', async () => {
    vi.mocked(isAuthorizedAdmin).mockResolvedValue(true);
    llm.responses = [
      assistantTurn([toolCall('c1', 'remove_row', { index: 0, field: 'items', rowIndex: 4 })]),
      finalTurn('Could not remove that row.'),
    ];

    const layouts = { vi: [{ blockType: 'faq', items: [{ question: 'A' }] }], en: [{ blockType: 'faq', items: [{ question: 'A' }] }] };
    const res = await POST(
      new Request('http://x/api/page-builder/assistant', {
        method: 'POST',
        body: JSON.stringify({ prompt: 'remove the fifth faq', layouts }),
      }),
    );
    const events = await readEvents(res);

    expect(events.some((e) => e.type === 'mutation')).toBe(false);
    const error = events.find((e) => e.type === 'error') as { error?: string } | undefined;
    expect(error?.error).toMatch(/has 1 rows/);
  });
```

- [ ] **Step 8: Run the tests and confirm they pass**

Run: `node_modules/.bin/vitest run lib/__tests__/assistant-validate.test.ts lib/__tests__/assistant-apply.test.ts lib/__tests__/assistant-apply-dual.test.ts lib/__tests__/assistant-tools.test.ts`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add lib/page-builder/assistant/ lib/__tests__/ app/api/page-builder/assistant/route.ts
git commit -m "feat(assistant): add row-level tools for editing array fields"
```

---

### Task 8: `search_media` and `search_catalog`

Replaces the prompt-embedded id dump. Removes the 118-product ceiling and ~4k tokens per turn.

**Files:**
- Create: `lib/page-builder/assistant/resource-search.ts`
- Modify: `lib/page-builder/assistant/validate.ts` (`QueryRequest`, two tool cases)
- Modify: `lib/page-builder/assistant/tools.ts` (`ASSISTANT_TOOLS`; delete the `RelationshipOptions` export)
- Modify: `app/api/page-builder/assistant/route.ts` (delete `loadRelationshipOptions` + `RELATIONSHIP_LIMIT`; handle the new query kinds)
- Test: `lib/__tests__/assistant-resource-search.test.ts`

**Interfaces:**
- Consumes: `QueryRequest` (Task 4).
- Produces:
  - `searchMedia(payload, query, limit): Promise<Array<{ id: number|string; filename: string; alt: string; width: number|null; height: number|null }>>`
  - `searchCatalog(payload, collection, query, limit, locale): Promise<Array<{ id: number|string; title: string }>>`
  - `QueryRequest` gains `{ kind: 'searchMedia'; query: string; limit: number }` and `{ kind: 'searchCatalog'; collection: 'products'|'categories'; query: string; limit: number }`.

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/assistant-resource-search.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { searchMedia, searchCatalog } from '@/lib/page-builder/assistant/resource-search';

type FindArgs = { collection: string; where?: unknown; limit?: number };

function fakePayload(docs: unknown[], capture?: (args: FindArgs) => void) {
  return {
    find: vi.fn(async (args: FindArgs) => {
      capture?.(args);
      return { docs };
    }),
  } as unknown as Parameters<typeof searchMedia>[0];
}

describe('searchMedia', () => {
  it('should map media docs to id, filename, alt, and dimensions', async () => {
    const payload = fakePayload([
      { id: 412, filename: 'bambu-a1-mini.jpg', alt: 'Bambu A1 Mini on desk', width: 1600, height: 1067 },
    ]);
    const out = await searchMedia(payload, '3d printer', 10);
    expect(out).toEqual([
      { id: 412, filename: 'bambu-a1-mini.jpg', alt: 'Bambu A1 Mini on desk', width: 1600, height: 1067 },
    ]);
  });

  it('should omit the where clause when the query is empty, returning recent uploads', async () => {
    let seen: FindArgs | undefined;
    const payload = fakePayload([], (a) => { seen = a; });
    await searchMedia(payload, '', 10);
    expect(seen?.where).toBeUndefined();
  });

  it('should return an empty array when the lookup throws', async () => {
    const payload = { find: vi.fn(async () => { throw new Error('db down'); }) } as unknown as Parameters<typeof searchMedia>[0];
    await expect(searchMedia(payload, 'x', 10)).resolves.toEqual([]);
  });

  it('should clamp the limit to the maximum', async () => {
    let seen: FindArgs | undefined;
    const payload = fakePayload([], (a) => { seen = a; });
    await searchMedia(payload, 'x', 999);
    expect(seen?.limit).toBeLessThanOrEqual(50);
  });
});

describe('searchCatalog', () => {
  it('should map catalog docs to id and title', async () => {
    const payload = fakePayload([{ id: 7, title: 'Filament PLA' }]);
    const out = await searchCatalog(payload, 'products', 'pla', 10, 'vi');
    expect(out).toEqual([{ id: 7, title: 'Filament PLA' }]);
  });

  it('should query the requested collection', async () => {
    let seen: FindArgs | undefined;
    const payload = fakePayload([], (a) => { seen = a; });
    await searchCatalog(payload, 'categories', 'x', 10, 'vi');
    expect(seen?.collection).toBe('categories');
  });

  it('should return an empty array when the lookup throws', async () => {
    const payload = { find: vi.fn(async () => { throw new Error('db down'); }) } as unknown as Parameters<typeof searchCatalog>[0];
    await expect(searchCatalog(payload, 'products', 'x', 10, 'vi')).resolves.toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `node_modules/.bin/vitest run lib/__tests__/assistant-resource-search.test.ts`
Expected: FAIL — cannot resolve `@/lib/page-builder/assistant/resource-search`.

- [ ] **Step 3: Write the implementation**

Create `lib/page-builder/assistant/resource-search.ts`:

```ts
// lib/page-builder/assistant/resource-search.ts — lookups that let the assistant bind real
// ids. Previously the route dumped up to 100 category/product ids into every system prompt,
// which both capped the reachable catalog and cost ~4k tokens per turn. These are on-demand
// tools instead. Failures are non-fatal: an empty result tells the model to leave the field
// unbound rather than aborting the run.
import type { getPayload } from 'payload';

type PayloadClient = Awaited<ReturnType<typeof getPayload>>;

/** Upper bound on results, so one search can't flood the context window. */
const MAX_LIMIT = 50;

export type MediaResult = {
  id: number | string;
  filename: string;
  alt: string;
  width: number | null;
  height: number | null;
};

export type CatalogResult = { id: number | string; title: string };

function clampLimit(limit: number): number {
  if (!Number.isFinite(limit) || limit <= 0) return 10;
  return Math.min(Math.trunc(limit), MAX_LIMIT);
}

function str(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function num(value: unknown): number | null {
  return typeof value === 'number' ? value : null;
}

/** Find media by filename or alt text. An empty query returns the most recent uploads. */
export async function searchMedia(
  payload: PayloadClient,
  query: string,
  limit: number,
): Promise<MediaResult[]> {
  const trimmed = query.trim();
  try {
    const result = await payload.find({
      collection: 'media',
      depth: 0,
      limit: clampLimit(limit),
      sort: '-createdAt',
      ...(trimmed
        ? { where: { or: [{ filename: { like: trimmed } }, { alt: { like: trimmed } }] } }
        : {}),
    });
    return result.docs.map((doc) => {
      const d = doc as Record<string, unknown>;
      return {
        id: d.id as number | string,
        filename: str(d.filename),
        alt: str(d.alt),
        width: num(d.width),
        height: num(d.height),
      };
    });
  } catch {
    return [];
  }
}

/** Find products or categories by title, in the given locale. */
export async function searchCatalog(
  payload: PayloadClient,
  collection: 'products' | 'categories',
  query: string,
  limit: number,
  locale: string,
): Promise<CatalogResult[]> {
  const trimmed = query.trim();
  try {
    const result = await payload.find({
      collection,
      depth: 0,
      limit: clampLimit(limit),
      locale: locale as never,
      select: { title: true },
      ...(trimmed ? { where: { title: { like: trimmed } } } : {}),
    });
    return result.docs.map((doc) => {
      const d = doc as Record<string, unknown>;
      return { id: d.id as number | string, title: str(d.title) || `#${String(d.id)}` };
    });
  } catch {
    return [];
  }
}
```

- [ ] **Step 4: Add the tool definitions**

Append to `ASSISTANT_TOOLS` in `lib/page-builder/assistant/tools.ts`:

```ts
  {
    type: 'function',
    function: {
      name: 'search_media',
      description:
        'Find images in the media library by filename or alt text, returning their numeric ids. Call this to fill any upload field (hero image, gallery rows, card images). An empty query returns the most recent uploads. Returns data only; it changes nothing.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          query: { type: 'string', description: 'Text to match against filename and alt text. Empty for recent uploads.' },
          limit: { type: 'integer', description: 'Maximum results (default 10, max 50).' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_catalog',
      description:
        'Find products or categories by title, returning their numeric ids for relationship fields. Never invent an id — always look it up here. Returns data only; it changes nothing.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          collection: { type: 'string', enum: ['products', 'categories'] },
          query: { type: 'string', description: 'Text to match against the title. Empty to list some.' },
          limit: { type: 'integer', description: 'Maximum results (default 10, max 50).' },
        },
        required: ['collection', 'query'],
      },
    },
  },
```

Delete the `RelationshipOptions` type export from `tools.ts` — nothing consumes it after this task.

- [ ] **Step 5: Extend `QueryRequest` and validation**

In `lib/page-builder/assistant/validate.ts`, extend the union:

```ts
export type QueryRequest =
  | { kind: 'read'; index: number; locale?: 'vi' | 'en' }
  | { kind: 'describe'; slug: string }
  | { kind: 'searchMedia'; query: string; limit: number }
  | { kind: 'searchCatalog'; collection: 'products' | 'categories'; query: string; limit: number };
```

Add the two cases:

```ts
    case 'search_media': {
      const query = typeof args.query === 'string' ? args.query : '';
      const limit = asInt(args.limit) ?? 10;
      return { ok: true, query: { kind: 'searchMedia', query, limit } };
    }
    case 'search_catalog': {
      const collection = args.collection === 'categories' ? 'categories' : args.collection === 'products' ? 'products' : null;
      if (!collection) {
        return { ok: false, error: 'search_catalog collection must be "products" or "categories".' };
      }
      const query = typeof args.query === 'string' ? args.query : '';
      const limit = asInt(args.limit) ?? 10;
      return { ok: true, query: { kind: 'searchCatalog', collection, query, limit } };
    }
```

- [ ] **Step 6: Handle the new query kinds and delete the id dump**

In `app/api/page-builder/assistant/route.ts`:

Delete `RELATIONSHIP_LIMIT`, the whole `loadRelationshipOptions` function, the `const relationshipOptions = await loadRelationshipOptions(...)` line, the `RelationshipOptions` import, and the now-unused `PayloadClient` type alias if nothing else uses it.

Add to the `if ('query' in result)` block, before the `read` handling:

```ts
              if (query.kind === 'searchMedia') {
                const results = await searchMedia(payload, query.query, query.limit);
                messages.push({
                  role: 'tool',
                  tool_call_id: call.id,
                  content: JSON.stringify(results),
                });
                continue;
              }
              if (query.kind === 'searchCatalog') {
                const results = await searchCatalog(payload, query.collection, query.query, query.limit, activeLocale);
                messages.push({
                  role: 'tool',
                  tool_call_id: call.id,
                  content: JSON.stringify(results),
                });
                continue;
              }
```

Add the import:

```ts
import { searchMedia, searchCatalog } from '@/lib/page-builder/assistant/resource-search';
```

Update the tool-name assertion in `lib/__tests__/assistant-tools.test.ts` to include `search_media` and `search_catalog`.

- [ ] **Step 7: Run the tests and confirm they pass**

Run: `node_modules/.bin/vitest run lib/__tests__/assistant-resource-search.test.ts lib/__tests__/assistant-tools.test.ts lib/__tests__/assistant-validate.test.ts app/api/page-builder/assistant/__tests__/route.test.ts`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add lib/page-builder/assistant/ lib/__tests__/ app/api/page-builder/assistant/route.ts
git commit -m "feat(assistant): add media and catalog search, drop prompt id dump"
```

---

### Task 9: Richer layout snapshot and turn budget

The snapshot keeps only top-level short strings, so the model cannot see that a block has zero rows — the exact state it needs to notice to fill one.

**Files:**
- Modify: `lib/page-builder/assistant/snapshot.ts`
- Modify: `app/api/page-builder/assistant/route.ts` (`MAX_TURNS` ~line 30)
- Test: `lib/__tests__/assistant-snapshot.test.ts` (existing — **both current tests assert exact summaries and will fail; they must be rewritten**)

**Interfaces:**
- Consumes: nothing.
- Produces: `LayoutSnapshotItem.summary` values stay `Record<string, string>` — non-string values are rendered as strings, so no consumer type changes.

- [ ] **Step 1: Rewrite the snapshot test**

Replace the entire contents of `lib/__tests__/assistant-snapshot.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { serializeLayout } from '@/lib/page-builder/assistant/snapshot';
import type { PageBlock } from '@/lib/page-builder';

describe('serializeLayout', () => {
  it('should map each block to its index, blockType, and string fields', () => {
    const layout = [
      { blockType: 'hero', heading: 'Welcome', subheading: 'Sub' },
      { blockType: 'faq', title: 'Questions' },
    ] as unknown as PageBlock[];

    const out = serializeLayout(layout);

    expect(out[0]).toMatchObject({ index: 0, blockType: 'hero' });
    expect(out[0]?.summary.heading).toBe('Welcome');
    expect(out[1]?.summary.title).toBe('Questions');
  });

  it('should include numbers, booleans, and enum values', () => {
    const layout = [{ blockType: 'faq', limit: 4, border: true, layout: 'accordion' }] as unknown as PageBlock[];
    const summary = serializeLayout(layout)[0]?.summary ?? {};
    expect(summary.limit).toBe('4');
    expect(summary.border).toBe('true');
    expect(summary.layout).toBe('accordion');
  });

  it('should report array row counts rather than contents', () => {
    const layout = [
      { blockType: 'faq', items: [{ question: 'A' }, { question: 'B' }] },
    ] as unknown as PageBlock[];
    expect(serializeLayout(layout)[0]?.summary.items).toBe('2 rows');
  });

  it('should report an empty array so unfilled blocks are visible', () => {
    const layout = [{ blockType: 'faq', items: [] }] as unknown as PageBlock[];
    expect(serializeLayout(layout)[0]?.summary.items).toBe('0 rows');
  });

  it('should report bound and unbound references', () => {
    const layout = [{ blockType: 'hero', image: 412, collection: null }] as unknown as PageBlock[];
    const summary = serializeLayout(layout)[0]?.summary ?? {};
    expect(summary.image).toBe('#412');
    expect(summary.collection).toBe('unset');
  });

  it('should omit identity fields', () => {
    const layout = [{ blockType: 'faq', id: 3, blockKey: 'bk_1', title: 'T' }] as unknown as PageBlock[];
    const summary = serializeLayout(layout)[0]?.summary ?? {};
    expect(summary.id).toBeUndefined();
    expect(summary.blockKey).toBeUndefined();
    expect(summary.title).toBe('T');
  });

  it('should truncate long strings to 80 characters', () => {
    const layout = [{ blockType: 'faq', title: 'x'.repeat(200) }] as unknown as PageBlock[];
    expect(serializeLayout(layout)[0]?.summary.title).toHaveLength(80);
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `node_modules/.bin/vitest run lib/__tests__/assistant-snapshot.test.ts`
Expected: FAIL — `expected undefined to be '4'` on the numbers/booleans case.

- [ ] **Step 3: Rewrite `serializeLayout`**

Replace the body of `lib/page-builder/assistant/snapshot.ts` below the type declarations:

```ts
const MAX_FIELD_LEN = 80;

/** Fields the model must never see or target. */
const HIDDEN = new Set(['blockType', 'id', 'blockKey']);

/** Render one field value as a short string the model can reason about. Arrays collapse to
 * a row COUNT — critically including "0 rows", which is how the model notices a block it
 * added but never filled. References collapse to their bound id or "unset". Returns null
 * for values worth omitting entirely. */
function summarize(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return 'unset';
  if (Array.isArray(value)) return `${value.length} rows`;
  if (typeof value === 'string') {
    return value.length > MAX_FIELD_LEN ? value.slice(0, MAX_FIELD_LEN) : value;
  }
  if (typeof value === 'number') return `#${value}`;
  if (typeof value === 'boolean') return String(value);
  // Objects are either a populated relationship/upload doc or Lexical richText state.
  if (typeof value === 'object') {
    const id = (value as { id?: unknown }).id;
    if (typeof id === 'number' || typeof id === 'string') return `#${id}`;
    return 'set';
  }
  return null;
}

/** Reduce a layout to index + blockType + a compact per-field summary. Long strings are
 * truncated; use read_block for full values. */
export function serializeLayout(layout: PageBlock[]): LayoutSnapshotItem[] {
  return layout.map((block, index) => {
    const record = block as Record<string, unknown>;
    const summary: Record<string, string> = {};
    for (const [key, value] of Object.entries(record)) {
      if (HIDDEN.has(key)) continue;
      const rendered = summarize(value);
      if (rendered !== null) summary[key] = rendered;
    }
    return { index, blockType: block.blockType, summary };
  });
}
```

Note the number rendering: a bare number field and a bound reference both render as `#N`. That is deliberate — the model only needs to know a numeric value is present, and the distinction is available through `describe_block`.

- [ ] **Step 4: Raise the turn budget**

In `app/api/page-builder/assistant/route.ts`, replace the `MAX_TURNS` constant and its comment:

```ts
// Dual-locale copy, describe_block lookups, resource searches, and one-structural-edit-
// at-a-time mean a full page build runs long. At 16 the loop stopped mid-build, leaving a
// half-finished page.
const MAX_TURNS = 28;
```

- [ ] **Step 5: Run the tests and confirm they pass**

Run: `node_modules/.bin/vitest run lib/__tests__/assistant-snapshot.test.ts lib/__tests__/assistant-index-drift-repro.test.ts app/api/page-builder/assistant/__tests__/route.test.ts`
Expected: PASS. The index-drift repro test asserts on echoed snapshot content — if it fails, update its expected strings to the new summary format rather than reverting the snapshot change.

- [ ] **Step 6: Commit**

```bash
git add lib/page-builder/assistant/snapshot.ts app/api/page-builder/assistant/route.ts lib/__tests__/assistant-snapshot.test.ts
git commit -m "feat(assistant): show row counts and bindings in layout snapshot"
```

---

### Task 10: Full verification

**Files:**
- Modify: whatever the checks surface.

**Interfaces:**
- Consumes: everything from Tasks 1–9.
- Produces: a green suite and a clean typecheck.

- [ ] **Step 1: Run the full test suite**

Run: `node_modules/.bin/vitest run`
Expected: all projects (`node`, `jsdom`) pass. `AssistantPanel.test.tsx` exercises the client mutation path — if it fails, the client-side `applyDualMutation` is out of step with a new mutation kind.

- [ ] **Step 2: Typecheck**

Run: `node_modules/.bin/tsc --noEmit`
Expected: no errors. Common fallout: the removed `RelationshipOptions` export, the `buildSystemPrompt` arity change, and any test file missing its `vitest` imports.

- [ ] **Step 3: Lint**

Run: `node_modules/.bin/next lint`
Expected: no new errors.

- [ ] **Step 4: Measure the prompt budget**

Run:

```bash
cat > .size-probe.ts <<'EOF'
import { getBlockSchemas } from '@/lib/page-builder/block-schemas';
import { buildSystemPrompt } from '@/lib/page-builder/assistant/tools';
const p = buildSystemPrompt(getBlockSchemas());
console.log('system prompt chars:', p.length, '≈tokens', Math.round(p.length / 4));
EOF
node_modules/.bin/tsx .size-probe.ts; rm -f .size-probe.ts
```

Expected: under 20,000 chars (~5k tokens), down from the 30,567 measured before this work.

- [ ] **Step 5: Manual smoke test**

Start the dev server, open a page in the builder, and drive the assistant with a prompt that exercises every new capability:

> "Build a landing page for our 3D printing service: a hero with an image, a 4-item FAQ, a stats section with 3 stats, and a featured products section. Use a dark background on the stats."

Confirm in the editor that: the FAQ has 4 populated items, the stats section has 3, the hero has a real image bound, the stats section renders dark in both light and dark mode, and the products section is bound to real products. Then click Undo and confirm the page reverts.

- [ ] **Step 6: Commit any fixes**

```bash
git add -A
git commit -m "fix(assistant): resolve fallout from schema-fidelity work"
```

---

## Notes for the implementer

- **`lib/page-builder/__tests__/` is an empty, unused directory.** No vitest `include` pattern matches it. Do not put tests there.
- **`getPayload()` mutates shared Block definitions.** `getBlockSchemas()` caches on first call, and the route calls `getPayload()` before building the prompt, so array descriptors *will* contain an injected `id`. `contentFields` is the single place that strips it — do not bypass it.
- **The two uncommitted files in the working tree** (`AssistantPanel.tsx`, `EditorShell.tsx` — an undo stack and a textarea auto-grow) are unrelated in-progress work. Leave them alone; do not include them in these commits.
- **If a task's tests pass but a neighbouring existing test breaks**, fix the existing test to match the new intended behaviour rather than weakening the new code — every such case is called out in the task that causes it (Tasks 4, 5, 7, 9).
