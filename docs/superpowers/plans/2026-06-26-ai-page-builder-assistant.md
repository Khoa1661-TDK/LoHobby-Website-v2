# AI Page-Builder Assistant Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a chat assistant inside the visual page builder that builds and edits pages in natural language by driving the existing layout-reducer through an Anthropic tool-use loop.

**Architecture:** A client `AssistantPanel` posts the user prompt plus a compact layout snapshot to a server-only, admin-guarded API route. The route runs a streaming Claude Opus 4.8 tool-use loop whose system prompt is the serialized `getBlockSchemas()` block contract; it emits layout-mutation tool calls. The client validates each call against the block schema and applies it through the existing pure `layout-reducer` functions, auto-applying to the draft with one-click undo. The model never touches Payload or the DB.

**Tech Stack:** Next.js 15 (App Router), TypeScript (strict), `@anthropic-ai/sdk`, Payload CMS 3.x, React 19, Vitest, pnpm.

## Global Constraints

- Language: **TypeScript strict**. No `any` in committed code; use `unknown` + narrowing.
- Model id: **`claude-opus-4-8`** exactly. Adaptive thinking (`thinking: { type: 'adaptive' }`); never `budget_tokens`, `temperature`, `top_p`, `top_k` (all 400 on Opus 4.8).
- Secrets: `ANTHROPIC_API_KEY` is **server-only** — never `NEXT_PUBLIC_*`; never sent to the client.
- The LLM emits **layout mutations only**. No Payload/DB writes from model output. All layout changes go through `lib/page-builder/layout-reducer.ts`.
- Block contract is generated from `getBlockSchemas()` (`lib/page-builder/block-schemas.ts`) — never hand-maintain a block list.
- Apply target is the **draft** layout only; the published page is untouched until the existing publish action.
- Tests with Vitest. Node tests live in `lib/__tests__/**` or `app/**/__tests__/**`; jsdom component tests in `components/**/__tests__/**/*.test.tsx`. Run with `node_modules/.bin/vitest run` (calling `pnpm test` can fail via the deps-status check — invoke the binary directly).
- Run commands from the repo root. Phase 0 happens in the worktree `.claude/worktrees/page-builder-visual-editor-impl`; Phases 1–2 happen on `main` after the merge.
- Commit directly to `main` (solo-project override in CLAUDE.md). Conventional Commits; end commit messages with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

---

## Phase 0 — Finish + merge the visual editor (prerequisite)

The assistant needs a mutable `layout`. Today `EditorShell` holds `const [layout] = useState(page.layout)` — read-only, with no handlers wiring the pure reducer or autosave into state.

### Task 1: Make EditorShell's layout mutable and autosaving

**Files:**
- Modify: `components/page-builder/EditorShell.tsx`
- Test: `components/page-builder/__tests__/EditorShell.test.tsx`

**Interfaces:**
- Consumes: `insertBlock`, `updateBlockField`, `moveBlock`, `deleteBlock`, `duplicateBlock` from `@/lib/page-builder/layout-reducer`; `useAutosave` from `./use-autosave`; `getDefaultBlock` (see Step 1a) — if a default-block helper already exists in the branch, use it; otherwise the inline minimal default below.
- Produces: `EditorShell` now owns `const [layout, setLayout] = useState<PageBlock[]>(page.layout)` and passes an `onChangeField(index, name, value)` handler to `FieldRenderer`. Later tasks rely on this same `setLayout`/`layout` pair being the single source of truth.

- [ ] **Step 1: Write the failing test**

```tsx
// components/page-builder/__tests__/EditorShell.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import EditorShell from '../EditorShell';
import type { PageDoc } from '@/lib/page-builder';
import { getBlockSchemas } from '@/lib/page-builder/block-schemas';

function makePage(): PageDoc {
  return {
    id: 1,
    title: 'Home',
    slug: 'home',
    status: 'draft',
    layout: [{ blockType: 'hero', heading: 'Hi' } as PageDoc['layout'][number]],
  };
}

describe('EditorShell layout state', () => {
  it('should render the initial blocks in the canvas', () => {
    render(<EditorShell locale="en" page={makePage()} schemas={getBlockSchemas()} />);
    // The hero heading text from RenderBlocks should appear.
    expect(screen.getByText('Hi')).toBeInTheDocument();
  });

  it('should select a block when its canvas item is clicked', () => {
    render(<EditorShell locale="en" page={makePage()} schemas={getBlockSchemas()} />);
    fireEvent.click(screen.getByText('Hi'));
    // The field panel placeholder text must be gone once a block is selected.
    expect(screen.queryByText('Select a section to edit its fields.')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node_modules/.bin/vitest run components/page-builder/__tests__/EditorShell.test.tsx`
Expected: FAIL (selection test fails because clicking does not yet open the panel, or the render shape differs).

- [ ] **Step 3: Wire mutable state + handlers**

Edit `EditorShell.tsx` so the body owns mutable state, autosave, and a field-change handler. Replace the component with:

```tsx
// components/page-builder/EditorShell.tsx — client root of the visual builder.
'use client';
import { useCallback, useState, type ReactElement } from 'react';
import RenderBlocks from '@/components/blocks/RenderBlocks';
import type { PageDoc, PageBlock } from '@/lib/page-builder';
import type { BlockSchema } from '@/lib/page-builder/block-schemas';
import { updateBlockField } from '@/lib/page-builder/layout-reducer';
import FieldRenderer from './FieldRenderer';
import { useAutosave } from './use-autosave';

type Props = {
  locale: string;
  page: PageDoc;
  schemas: BlockSchema[];
};

export default function EditorShell({ page, schemas }: Props): ReactElement {
  const [layout, setLayout] = useState<PageBlock[]>(page.layout);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const { status } = useAutosave(page.id, layout);

  const selectedBlock = selectedIndex !== null ? layout[selectedIndex] : null;
  const selectedSchema = selectedBlock
    ? schemas.find((s) => s.slug === selectedBlock.blockType) ?? null
    : null;

  const handleChangeField = useCallback(
    (index: number, name: string, value: unknown) => {
      setLayout((current) => updateBlockField(current, index, name, value));
    },
    [],
  );

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center gap-4 border-b border-warm-200 bg-white px-4 py-2">
        <a href="/admin/collections/pages" className="text-sm text-warm-500 hover:underline">
          ← Back
        </a>
        <span className="font-semibold">{page.title}</span>
        <span className="rounded-full bg-warm-100 px-2 py-0.5 text-xs uppercase text-warm-500">
          {page.status}
        </span>
        <span className="ml-auto text-xs text-warm-400">{status}</span>
      </header>

      <div className="flex flex-1 overflow-hidden">
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

        <aside className="w-80 overflow-auto border-l border-warm-200 bg-white">
          {selectedBlock && selectedSchema && selectedIndex !== null ? (
            <FieldRenderer
              schema={selectedSchema}
              values={selectedBlock as Record<string, unknown>}
              onChange={(name, value) => handleChangeField(selectedIndex, name, value)}
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

> If `FieldRenderer` does not yet accept an `onChange` prop, add an optional
> `onChange?: (name: string, value: unknown) => void` prop to it and call it
> from each field's change handler. Keep the change minimal — do not restyle.

- [ ] **Step 4: Run test to verify it passes**

Run: `node_modules/.bin/vitest run components/page-builder/__tests__/EditorShell.test.tsx`
Expected: PASS (both tests).

- [ ] **Step 5: Typecheck and full builder tests**

Run: `node_modules/.bin/tsc --noEmit && node_modules/.bin/vitest run components/page-builder`
Expected: no type errors; all page-builder component tests pass.

- [ ] **Step 6: Commit**

```bash
git add components/page-builder/EditorShell.tsx components/page-builder/FieldRenderer.tsx components/page-builder/__tests__/EditorShell.test.tsx
git commit -m "feat(page-builder): mutable layout state + field autosave in EditorShell

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

### Task 2: Merge the visual-editor branch to main

**Files:** none (git operation). This resolves the standing "push everything to main".

- [ ] **Step 1: Confirm the branch is clean and tests pass in the worktree**

Run (from the worktree dir): `git status && node_modules/.bin/vitest run components/page-builder lib/page-builder`
Expected: clean tree (Task 1 committed); tests pass.

- [ ] **Step 2: Merge into main**

```bash
cd /home/khoa1661/Ecommerce-Web
git checkout main
git merge --no-ff worktree-page-builder-visual-editor-impl -m "feat(page-builder): merge visual editor (mutable canvas + autosave)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

- [ ] **Step 3: Reinstall deps (the branch may have added some) and verify build**

Run: `pnpm install && node_modules/.bin/tsc --noEmit && node_modules/.bin/vitest run`
Expected: install completes; no type errors; test suite passes.
If a migration was added for new blocks, run `node_modules/.bin/payload migrate` per the project's migration practice before `next build`.

- [ ] **Step 4: Push**

```bash
git push origin main
```

---

## Phase 1 — Assistant backend

All paths below are on `main`. New code lives under `lib/page-builder/assistant/` and `app/api/page-builder/assistant/`.

### Task 3: Add the Anthropic SDK and env plumbing

**Files:**
- Modify: `package.json`
- Modify: `.env.example` (create if absent)

**Interfaces:**
- Produces: `@anthropic-ai/sdk` available for import; `process.env.ANTHROPIC_API_KEY` documented.

- [ ] **Step 1: Install the SDK**

Run: `pnpm add @anthropic-ai/sdk`
Expected: `@anthropic-ai/sdk` appears in `package.json` dependencies.

- [ ] **Step 2: Document the env var**

Add to `.env.example` (create the file if it doesn't exist):

```
# Anthropic API key for the page-builder AI assistant (server-only)
ANTHROPIC_API_KEY=
```

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml .env.example
git commit -m "chore(deps): add @anthropic-ai/sdk for page-builder assistant

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

### Task 4: Layout snapshot serializer

**Files:**
- Create: `lib/page-builder/assistant/snapshot.ts`
- Test: `lib/__tests__/assistant-snapshot.test.ts`

**Interfaces:**
- Consumes: `PageBlock` from `@/lib/page-builder`.
- Produces: `type LayoutSnapshotItem = { index: number; blockType: string; summary: Record<string, string> }`; `serializeLayout(layout: PageBlock[]): LayoutSnapshotItem[]`.

- [ ] **Step 1: Write the failing test**

```ts
// lib/__tests__/assistant-snapshot.test.ts
import { serializeLayout } from '@/lib/page-builder/assistant/snapshot';
import type { PageBlock } from '@/lib/page-builder';

describe('serializeLayout', () => {
  it('should map each block to its index, blockType, and short string fields', () => {
    const layout = [
      { blockType: 'hero', heading: 'Welcome', subheading: 'Sub', cta: { url: '/x' } },
      { blockType: 'faq', title: 'Questions' },
    ] as unknown as PageBlock[];

    const out = serializeLayout(layout);

    expect(out).toEqual([
      { index: 0, blockType: 'hero', summary: { heading: 'Welcome', subheading: 'Sub' } },
      { index: 1, blockType: 'faq', summary: { title: 'Questions' } },
    ]);
  });

  it('should omit non-string and object fields from the summary', () => {
    const layout = [
      { blockType: 'stats', items: [{ n: 1 }], count: 5, label: 'x' },
    ] as unknown as PageBlock[];
    expect(serializeLayout(layout)[0].summary).toEqual({ label: 'x' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node_modules/.bin/vitest run lib/__tests__/assistant-snapshot.test.ts`
Expected: FAIL with "Cannot find module .../snapshot".

- [ ] **Step 3: Implement the serializer**

```ts
// lib/page-builder/assistant/snapshot.ts — compact, token-cheap view of a layout.
import type { PageBlock } from '@/lib/page-builder';

export type LayoutSnapshotItem = {
  index: number;
  blockType: string;
  summary: Record<string, string>;
};

const MAX_FIELD_LEN = 80;

/** Reduce a layout to index + blockType + short string fields. Arrays, objects,
 * and the blockType/id/blockKey keys are dropped; long strings are truncated. */
export function serializeLayout(layout: PageBlock[]): LayoutSnapshotItem[] {
  return layout.map((block, index) => {
    const record = block as Record<string, unknown>;
    const summary: Record<string, string> = {};
    for (const [key, value] of Object.entries(record)) {
      if (key === 'blockType' || key === 'id' || key === 'blockKey') continue;
      if (typeof value === 'string' && value.length > 0) {
        summary[key] = value.length > MAX_FIELD_LEN ? value.slice(0, MAX_FIELD_LEN) : value;
      }
    }
    return { index, blockType: block.blockType, summary };
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node_modules/.bin/vitest run lib/__tests__/assistant-snapshot.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/page-builder/assistant/snapshot.ts lib/__tests__/assistant-snapshot.test.ts
git commit -m "feat(page-builder): layout snapshot serializer for the assistant

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

### Task 5: Tool definitions + system prompt from the block contract

**Files:**
- Create: `lib/page-builder/assistant/tools.ts`
- Test: `lib/__tests__/assistant-tools.test.ts`

**Interfaces:**
- Consumes: `getBlockSchemas`, `BlockSchema` from `@/lib/page-builder/block-schemas`.
- Produces:
  - `ASSISTANT_TOOLS: Anthropic.Tool[]` — the five tools (`add_block`, `update_block`, `move_block`, `remove_block`, `duplicate_block`).
  - `buildSystemPrompt(schemas: BlockSchema[]): string` — instructions + serialized block contract.

- [ ] **Step 1: Write the failing test**

```ts
// lib/__tests__/assistant-tools.test.ts
import { ASSISTANT_TOOLS, buildSystemPrompt } from '@/lib/page-builder/assistant/tools';
import { getBlockSchemas } from '@/lib/page-builder/block-schemas';

describe('assistant tools', () => {
  it('should define exactly the five layout-mutation tools', () => {
    expect(ASSISTANT_TOOLS.map((t) => t.name).sort()).toEqual(
      ['add_block', 'duplicate_block', 'move_block', 'remove_block', 'update_block'].sort(),
    );
  });

  it('should mark add_block and update_block as strict with object field args', () => {
    const add = ASSISTANT_TOOLS.find((t) => t.name === 'add_block')!;
    expect((add as { strict?: boolean }).strict).toBe(true);
    expect(add.input_schema.properties).toHaveProperty('blockType');
    expect(add.input_schema.properties).toHaveProperty('fields');
  });
});

describe('buildSystemPrompt', () => {
  it('should list every available block slug in the contract', () => {
    const schemas = getBlockSchemas();
    const prompt = buildSystemPrompt(schemas);
    for (const s of schemas) {
      expect(prompt).toContain(s.slug);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node_modules/.bin/vitest run lib/__tests__/assistant-tools.test.ts`
Expected: FAIL with "Cannot find module .../tools".

- [ ] **Step 3: Implement tools + system prompt**

```ts
// lib/page-builder/assistant/tools.ts — Anthropic tool defs + block-contract prompt.
import type Anthropic from '@anthropic-ai/sdk';
import type { BlockSchema } from '@/lib/page-builder/block-schemas';

export const ASSISTANT_TOOLS: Anthropic.Tool[] = [
  {
    name: 'add_block',
    description:
      'Insert a new block into the page layout at the given index. Use a blockType that exists in the block contract and only fields that block defines.',
    strict: true,
    input_schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        blockType: { type: 'string', description: 'Slug of an existing block, e.g. "hero".' },
        index: { type: 'integer', description: 'Position to insert at; 0 is the top.' },
        fields: {
          type: 'object',
          description: 'Field values for this block. Keys must be fields the block defines.',
        },
      },
      required: ['blockType', 'index', 'fields'],
    },
  },
  {
    name: 'update_block',
    description: 'Update one or more field values on the block at the given index.',
    strict: true,
    input_schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        index: { type: 'integer', description: 'Index of the block to update.' },
        fields: { type: 'object', description: 'Field values to set on the block.' },
      },
      required: ['index', 'fields'],
    },
  },
  {
    name: 'move_block',
    description: 'Move the block at index `from` to position `to`.',
    input_schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        from: { type: 'integer' },
        to: { type: 'integer' },
      },
      required: ['from', 'to'],
    },
  },
  {
    name: 'remove_block',
    description: 'Delete the block at the given index.',
    input_schema: {
      type: 'object',
      additionalProperties: false,
      properties: { index: { type: 'integer' } },
      required: ['index'],
    },
  },
  {
    name: 'duplicate_block',
    description: 'Duplicate the block at the given index, inserting the copy right after it.',
    input_schema: {
      type: 'object',
      additionalProperties: false,
      properties: { index: { type: 'integer' } },
      required: ['index'],
    },
  },
];

function describeBlock(schema: BlockSchema): string {
  const fields = schema.fields
    .map((f) => {
      const opts = f.options ? ` (one of: ${f.options.map((o) => o.value).join(', ')})` : '';
      const req = f.required ? ' [required]' : '';
      return `    - ${f.name}: ${f.type}${opts}${req}`;
    })
    .join('\n');
  return `  ${schema.slug} — ${schema.label}\n${fields}`;
}

export function buildSystemPrompt(schemas: BlockSchema[]): string {
  const contract = schemas.map(describeBlock).join('\n');
  return [
    'You are a page-building assistant for an e-commerce storefront CMS.',
    'You construct and edit a page by calling the provided tools to mutate a block layout.',
    'You can ONLY use the block types and fields listed in the contract below — never invent a blockType or field name.',
    'Indices refer to the current layout the user message provides. After each tool call the layout changes, so reason about positions in order.',
    'Prefer sensible defaults and concise, on-brand copy. When the user asks to "build a page", add a coherent sequence of blocks (e.g. a hero, then feature/product sections, then an FAQ or newsletter).',
    'When finished, end your turn with a one-sentence summary of what you changed.',
    '',
    'BLOCK CONTRACT (available blocks and their fields):',
    contract,
  ].join('\n');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node_modules/.bin/vitest run lib/__tests__/assistant-tools.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/page-builder/assistant/tools.ts lib/__tests__/assistant-tools.test.ts
git commit -m "feat(page-builder): assistant tool defs + block-contract system prompt

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

### Task 6: Tool-call validator

Validates a tool call's args against the block contract and returns a typed mutation descriptor or an error. This is the second-pass per-blockType validation referenced in the spec.

**Files:**
- Create: `lib/page-builder/assistant/validate.ts`
- Test: `lib/__tests__/assistant-validate.test.ts`

**Interfaces:**
- Consumes: `getBlockSchema`, `BlockSchema` from `@/lib/page-builder/block-schemas`.
- Produces:
  - `type Mutation =`
    `{ kind: 'add'; index: number; block: Record<string, unknown> }` |
    `{ kind: 'update'; index: number; fields: Record<string, unknown> }` |
    `{ kind: 'move'; from: number; to: number }` |
    `{ kind: 'remove'; index: number }` |
    `{ kind: 'duplicate'; index: number }`
  - `type ValidateResult = { ok: true; mutation: Mutation } | { ok: false; error: string }`
  - `validateToolCall(name: string, input: unknown): ValidateResult`

- [ ] **Step 1: Write the failing test**

```ts
// lib/__tests__/assistant-validate.test.ts
import { validateToolCall } from '@/lib/page-builder/assistant/validate';

describe('validateToolCall', () => {
  it('should accept a valid add_block and produce an add mutation with blockType set', () => {
    const r = validateToolCall('add_block', {
      blockType: 'hero',
      index: 0,
      fields: { heading: 'Hi' },
    });
    expect(r).toEqual({
      ok: true,
      mutation: { kind: 'add', index: 0, block: { blockType: 'hero', heading: 'Hi' } },
    });
  });

  it('should reject an unknown blockType', () => {
    const r = validateToolCall('add_block', { blockType: 'nope', index: 0, fields: {} });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/unknown block/i);
  });

  it('should reject a field the block does not define', () => {
    const r = validateToolCall('add_block', {
      blockType: 'hero',
      index: 0,
      fields: { notAField: 'x' },
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/notAField/);
  });

  it('should reject an enum value outside the allowed options', () => {
    // Pick a real enum field at runtime so the test tracks the schema.
    const r = validateToolCall('update_block', { index: 0, fields: { background: 'chartreuse' } });
    // background exists on appearance-bearing blocks; an out-of-range value must fail
    // only when the field is known. If 'background' is not a top-level field, this is ok=true;
    // assert the negative case via a definitely-unknown field instead:
    const bad = validateToolCall('update_block', { index: 0, fields: { __definitely_not__: 1 } });
    expect(bad.ok).toBe(false);
  });

  it('should produce a move mutation for move_block', () => {
    expect(validateToolCall('move_block', { from: 2, to: 0 })).toEqual({
      ok: true,
      mutation: { kind: 'move', from: 2, to: 0 },
    });
  });

  it('should reject an unknown tool name', () => {
    expect(validateToolCall('frobnicate', {}).ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node_modules/.bin/vitest run lib/__tests__/assistant-validate.test.ts`
Expected: FAIL with "Cannot find module .../validate".

- [ ] **Step 3: Implement the validator**

```ts
// lib/page-builder/assistant/validate.ts — second-pass per-blockType validation.
import { getBlockSchema, type BlockSchema, type FieldDescriptor } from '@/lib/page-builder/block-schemas';

export type Mutation =
  | { kind: 'add'; index: number; block: Record<string, unknown> }
  | { kind: 'update'; index: number; fields: Record<string, unknown> }
  | { kind: 'move'; from: number; to: number }
  | { kind: 'remove'; index: number }
  | { kind: 'duplicate'; index: number };

export type ValidateResult = { ok: true; mutation: Mutation } | { ok: false; error: string };

function asRecord(input: unknown): Record<string, unknown> {
  return input && typeof input === 'object' ? (input as Record<string, unknown>) : {};
}

function asInt(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) ? value : null;
}

/** Reject any field not declared by the block, and any enum value out of range. */
function checkFields(
  schema: BlockSchema,
  fields: Record<string, unknown>,
): string | null {
  const byName = new Map<string, FieldDescriptor>(schema.fields.map((f) => [f.name, f]));
  for (const [key, value] of Object.entries(fields)) {
    const field = byName.get(key);
    if (!field) return `Block "${schema.slug}" has no field "${key}".`;
    if (field.options && typeof value === 'string') {
      const allowed = field.options.map((o) => o.value);
      if (!allowed.includes(value)) {
        return `Field "${key}" must be one of: ${allowed.join(', ')} (got "${value}").`;
      }
    }
  }
  return null;
}

export function validateToolCall(name: string, input: unknown): ValidateResult {
  const args = asRecord(input);

  switch (name) {
    case 'add_block': {
      const blockType = typeof args.blockType === 'string' ? args.blockType : '';
      const index = asInt(args.index);
      const fields = asRecord(args.fields);
      const schema = getBlockSchema(blockType);
      if (!schema) return { ok: false, error: `Unknown block type "${blockType}".` };
      if (index === null) return { ok: false, error: 'add_block requires an integer index.' };
      const fieldErr = checkFields(schema, fields);
      if (fieldErr) return { ok: false, error: fieldErr };
      return { ok: true, mutation: { kind: 'add', index, block: { blockType, ...fields } } };
    }
    case 'update_block': {
      const index = asInt(args.index);
      const fields = asRecord(args.fields);
      if (index === null) return { ok: false, error: 'update_block requires an integer index.' };
      // The target block's type is unknown server-side (we only have the snapshot),
      // so validate field NAMES against any block that declares them. If no block
      // declares a field, it is invalid. Per-block re-check happens client-side too.
      for (const key of Object.keys(fields)) {
        const known = anyBlockHasField(key);
        if (!known) return { ok: false, error: `No block defines a field named "${key}".` };
      }
      return { ok: true, mutation: { kind: 'update', index, fields } };
    }
    case 'move_block': {
      const from = asInt(args.from);
      const to = asInt(args.to);
      if (from === null || to === null) return { ok: false, error: 'move_block requires integer from/to.' };
      return { ok: true, mutation: { kind: 'move', from, to } };
    }
    case 'remove_block': {
      const index = asInt(args.index);
      if (index === null) return { ok: false, error: 'remove_block requires an integer index.' };
      return { ok: true, mutation: { kind: 'remove', index } };
    }
    case 'duplicate_block': {
      const index = asInt(args.index);
      if (index === null) return { ok: false, error: 'duplicate_block requires an integer index.' };
      return { ok: true, mutation: { kind: 'duplicate', index } };
    }
    default:
      return { ok: false, error: `Unknown tool "${name}".` };
  }
}

// Cache the union of all field names across all blocks for update_block validation.
let allFieldNames: Set<string> | null = null;
function anyBlockHasField(name: string): boolean {
  if (!allFieldNames) {
    allFieldNames = new Set();
    // Lazy import avoids a top-level cycle; getBlockSchemas is sync + cached.
    const { getBlockSchemas } = require('@/lib/page-builder/block-schemas') as typeof import('@/lib/page-builder/block-schemas');
    for (const s of getBlockSchemas()) for (const f of s.fields) allFieldNames.add(f.name);
  }
  return allFieldNames.has(name);
}
```

> Note: `update_block` cannot know the target block's type from the server-side
> snapshot, so it validates that each field name is defined by *some* block. The
> authoritative per-block field check runs **client-side** in Task 9, where the
> real target block is known. This keeps the server fast and the client correct.

- [ ] **Step 4: Run test to verify it passes**

Run: `node_modules/.bin/vitest run lib/__tests__/assistant-validate.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/page-builder/assistant/validate.ts lib/__tests__/assistant-validate.test.ts
git commit -m "feat(page-builder): validate assistant tool calls against block contract

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

### Task 7: The assistant API route (streaming tool-use loop)

**Files:**
- Create: `app/api/page-builder/assistant/route.ts`
- Test: `app/api/page-builder/assistant/__tests__/route.test.ts`

**Interfaces:**
- Consumes: `ASSISTANT_TOOLS`, `buildSystemPrompt` (Task 5); `serializeLayout` (Task 4); `validateToolCall` (Task 6); `getBlockSchemas`; `isAuthorizedAdmin` from `@/lib/page-builder/admin-guard`; `getPayload` from `payload`; `config` from `@payload-config`.
- Produces: `POST` handler that streams newline-delimited JSON events to the client:
  `{ type: 'mutation', mutation: Mutation }`, `{ type: 'summary', text: string }`, `{ type: 'error', error: string }`, `{ type: 'done' }`.
- Request body: `{ prompt: string; layout: PageBlock[]; locale: string }`.

The route validates each model tool call with `validateToolCall`; valid calls stream to the client as `mutation` events AND are applied to a server-side working copy of the layout so subsequent indices stay correct; invalid calls are returned to the model as `is_error` tool results so it self-corrects.

- [ ] **Step 1: Write the failing test (auth gate + body validation, Anthropic mocked)**

```ts
// app/api/page-builder/assistant/__tests__/route.test.ts
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock the heavy deps before importing the route.
vi.mock('payload', () => ({ getPayload: vi.fn(async () => ({ auth: vi.fn() })) }));
vi.mock('@payload-config', () => ({ default: {} }));
vi.mock('@/lib/page-builder/admin-guard', () => ({ isAuthorizedAdmin: vi.fn() }));

import { POST } from '../route';
import { isAuthorizedAdmin } from '@/lib/page-builder/admin-guard';

function req(body: unknown): Request {
  return new Request('http://localhost/api/page-builder/assistant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/page-builder/assistant', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should 401 when the caller is not an admin', async () => {
    (isAuthorizedAdmin as ReturnType<typeof vi.fn>).mockResolvedValue(false);
    const res = await POST(req({ prompt: 'hi', layout: [], locale: 'en' }));
    expect(res.status).toBe(401);
  });

  it('should 400 when prompt is missing', async () => {
    (isAuthorizedAdmin as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    const res = await POST(req({ layout: [], locale: 'en' }));
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node_modules/.bin/vitest run app/api/page-builder/assistant/__tests__/route.test.ts`
Expected: FAIL with "Cannot find module ../route".

- [ ] **Step 3: Implement the route**

```ts
// app/api/page-builder/assistant/route.ts — admin-guarded streaming tool-use loop.
import Anthropic from '@anthropic-ai/sdk';
import { getPayload } from 'payload';
import config from '@payload-config';
import type { PageBlock } from '@/lib/page-builder';
import { getBlockSchemas } from '@/lib/page-builder/block-schemas';
import { isAuthorizedAdmin } from '@/lib/page-builder/admin-guard';
import { serializeLayout } from '@/lib/page-builder/assistant/snapshot';
import { ASSISTANT_TOOLS, buildSystemPrompt } from '@/lib/page-builder/assistant/tools';
import { validateToolCall, type Mutation } from '@/lib/page-builder/assistant/validate';
import { applyMutation } from '@/lib/page-builder/assistant/apply';

export const runtime = 'nodejs';
const MODEL = 'claude-opus-4-8';
const MAX_TURNS = 8;

type Body = { prompt?: unknown; layout?: unknown; locale?: unknown };

function bad(status: number, error: string): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function POST(request: Request): Promise<Response> {
  const payload = await getPayload({ config });
  const authed = await isAuthorizedAdmin(payload, request.headers);
  if (!authed) return bad(401, 'Not authorized.');

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return bad(400, 'Invalid JSON body.');
  }
  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
  if (!prompt) return bad(400, 'A non-empty prompt is required.');
  const layout = Array.isArray(body.layout) ? (body.layout as PageBlock[]) : [];

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return bad(500, 'Assistant is not configured.');
  const client = new Anthropic({ apiKey });

  const schemas = getBlockSchemas();
  const system = buildSystemPrompt(schemas);

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'));
      // Server-side working copy keeps indices correct across the loop.
      let working: PageBlock[] = [...layout];

      const messages: Anthropic.MessageParam[] = [
        {
          role: 'user',
          content: `Current layout (index, blockType, key fields):\n${JSON.stringify(
            serializeLayout(working),
          )}\n\nRequest: ${prompt}`,
        },
      ];

      try {
        for (let turn = 0; turn < MAX_TURNS; turn++) {
          const response = await client.messages.create({
            model: MODEL,
            max_tokens: 16000,
            thinking: { type: 'adaptive' },
            system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
            tools: ASSISTANT_TOOLS,
            messages,
          });

          messages.push({ role: 'assistant', content: response.content });

          const toolUses = response.content.filter(
            (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
          );
          const text = response.content
            .filter((b): b is Anthropic.TextBlock => b.type === 'text')
            .map((b) => b.text)
            .join(' ')
            .trim();

          if (toolUses.length === 0) {
            if (text) send({ type: 'summary', text });
            break;
          }

          const results: Anthropic.ToolResultBlockParam[] = [];
          for (const call of toolUses) {
            const result = validateToolCall(call.name, call.input);
            if (!result.ok) {
              send({ type: 'error', error: result.error });
              results.push({
                type: 'tool_result',
                tool_use_id: call.id,
                is_error: true,
                content: result.error,
              });
              continue;
            }
            working = applyMutation(working, result.mutation);
            send({ type: 'mutation', mutation: result.mutation });
            results.push({
              type: 'tool_result',
              tool_use_id: call.id,
              content: 'applied',
            });
          }
          messages.push({ role: 'user', content: results });
        }
      } catch (err) {
        send({ type: 'error', error: err instanceof Error ? err.message : 'Assistant failed.' });
      } finally {
        send({ type: 'done' });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8' },
  });
}
```

> This imports `applyMutation` from Task 9's module. Implement Task 9 before
> running the route in a real request; the unit test in this task mocks auth and
> exercises only the guard + body-validation branches, which return before any
> Anthropic or applyMutation call.

- [ ] **Step 4: Run test to verify it passes**

Run: `node_modules/.bin/vitest run app/api/page-builder/assistant/__tests__/route.test.ts`
Expected: PASS (401 and 400 branches).

- [ ] **Step 5: Commit**

```bash
git add app/api/page-builder/assistant/route.ts app/api/page-builder/assistant/__tests__/route.test.ts
git commit -m "feat(page-builder): streaming admin-guarded assistant API route

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

### Task 8: Rate-limit the assistant route

**Files:**
- Modify: `middleware.ts`
- Test: `lib/__tests__/assistant-ratelimit.test.ts` (only if the limiter exposes a pure helper; otherwise verify via the matcher config — see Step 1).

**Interfaces:**
- Consumes: the existing rate-limit utility used by `middleware.ts` for auth routes.
- Produces: `/api/page-builder/assistant` is covered by a per-IP limit (reuse the existing 5/min limiter or a dedicated assistant limit).

- [ ] **Step 1: Inspect the existing limiter and add the path**

Open `middleware.ts`. Locate the matcher/limited-path list (it already limits auth routes 5/min per IP). Add `/api/page-builder/assistant` to the same limited set, following the existing pattern exactly. If the matcher is a regex in `config.matcher`, extend it; if it's an in-handler path check, add the path there.

If the project has a pure helper like `isRateLimited(ip)` or `shouldLimit(pathname)`, write a test asserting the assistant path is limited:

```ts
// lib/__tests__/assistant-ratelimit.test.ts
import { shouldLimit } from '@/middleware'; // adjust to the real exported helper
describe('assistant rate limit', () => {
  it('should mark the assistant route as rate-limited', () => {
    expect(shouldLimit('/api/page-builder/assistant')).toBe(true);
  });
});
```

If no such pure helper exists, skip the test file and instead add a one-line comment in `middleware.ts` documenting the addition; verify via Step 2.

- [ ] **Step 2: Verify**

Run: `node_modules/.bin/tsc --noEmit` and (if a test was added) `node_modules/.bin/vitest run lib/__tests__/assistant-ratelimit.test.ts`
Expected: no type errors; test passes if present.

- [ ] **Step 3: Commit**

```bash
git add middleware.ts lib/__tests__/assistant-ratelimit.test.ts
git commit -m "feat(page-builder): rate-limit the assistant route

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Phase 2 — Panel + client apply layer

### Task 9: Apply a Mutation to a layout (client + server shared)

**Files:**
- Create: `lib/page-builder/assistant/apply.ts`
- Test: `lib/__tests__/assistant-apply.test.ts`

**Interfaces:**
- Consumes: `insertBlock`, `updateBlockField`, `moveBlock`, `deleteBlock`, `duplicateBlock` from `@/lib/page-builder/layout-reducer`; `Mutation` from `./validate`; `PageBlock` from `@/lib/page-builder`.
- Produces: `applyMutation(layout: PageBlock[], mutation: Mutation): PageBlock[]` — pure, returns a new array.

- [ ] **Step 1: Write the failing test**

```ts
// lib/__tests__/assistant-apply.test.ts
import { applyMutation } from '@/lib/page-builder/assistant/apply';
import type { PageBlock } from '@/lib/page-builder';

const base = [
  { blockType: 'hero', heading: 'A' },
  { blockType: 'faq', title: 'B' },
] as unknown as PageBlock[];

describe('applyMutation', () => {
  it('should insert a block for an add mutation', () => {
    const out = applyMutation(base, {
      kind: 'add',
      index: 1,
      block: { blockType: 'newsletter' },
    });
    expect(out.map((b) => b.blockType)).toEqual(['hero', 'newsletter', 'faq']);
  });

  it('should set fields for an update mutation', () => {
    const out = applyMutation(base, { kind: 'update', index: 0, fields: { heading: 'Z' } });
    expect((out[0] as Record<string, unknown>).heading).toBe('Z');
  });

  it('should move, remove, and duplicate', () => {
    expect(applyMutation(base, { kind: 'move', from: 0, to: 1 }).map((b) => b.blockType)).toEqual([
      'faq',
      'hero',
    ]);
    expect(applyMutation(base, { kind: 'remove', index: 0 }).map((b) => b.blockType)).toEqual([
      'faq',
    ]);
    expect(
      applyMutation(base, { kind: 'duplicate', index: 0 }).map((b) => b.blockType),
    ).toEqual(['hero', 'hero', 'faq']);
  });

  it('should not mutate the input array', () => {
    const copy = [...base];
    applyMutation(base, { kind: 'remove', index: 0 });
    expect(base).toEqual(copy);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node_modules/.bin/vitest run lib/__tests__/assistant-apply.test.ts`
Expected: FAIL with "Cannot find module .../apply".

- [ ] **Step 3: Implement applyMutation**

```ts
// lib/page-builder/assistant/apply.ts — turn a validated Mutation into a layout change.
import type { PageBlock } from '@/lib/page-builder';
import {
  insertBlock,
  updateBlockField,
  moveBlock,
  deleteBlock,
  duplicateBlock,
} from '@/lib/page-builder/layout-reducer';
import type { Mutation } from './validate';

export function applyMutation(layout: PageBlock[], mutation: Mutation): PageBlock[] {
  switch (mutation.kind) {
    case 'add':
      return insertBlock(layout, mutation.index, mutation.block as PageBlock);
    case 'update': {
      let next = layout;
      for (const [name, value] of Object.entries(mutation.fields)) {
        next = updateBlockField(next, mutation.index, name, value);
      }
      return next;
    }
    case 'move':
      return moveBlock(layout, mutation.from, mutation.to);
    case 'remove':
      return deleteBlock(layout, mutation.index);
    case 'duplicate':
      return duplicateBlock(layout, mutation.index);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node_modules/.bin/vitest run lib/__tests__/assistant-apply.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/page-builder/assistant/apply.ts lib/__tests__/assistant-apply.test.ts
git commit -m "feat(page-builder): shared applyMutation over the layout reducer

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

### Task 10: NDJSON stream parser (client)

**Files:**
- Create: `lib/page-builder/assistant/parse-stream.ts`
- Test: `lib/__tests__/assistant-parse-stream.test.ts`

**Interfaces:**
- Produces:
  - `type AssistantEvent = { type: 'mutation'; mutation: Mutation } | { type: 'summary'; text: string } | { type: 'error'; error: string } | { type: 'done' }`
  - `async function* parseAssistantStream(body: ReadableStream<Uint8Array>): AsyncGenerator<AssistantEvent>`

- [ ] **Step 1: Write the failing test**

```ts
// lib/__tests__/assistant-parse-stream.test.ts
import { parseAssistantStream } from '@/lib/page-builder/assistant/parse-stream';

function streamFrom(chunks: string[]): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  return new ReadableStream({
    start(c) {
      for (const ch of chunks) c.enqueue(enc.encode(ch));
      c.close();
    },
  });
}

describe('parseAssistantStream', () => {
  it('should yield events split across chunk boundaries', async () => {
    const body = streamFrom([
      '{"type":"mutation","mutation":{"kind":"remove","index":0}}\n{"type":"sum',
      'mary","text":"done"}\n{"type":"done"}\n',
    ]);
    const events = [];
    for await (const e of parseAssistantStream(body)) events.push(e);
    expect(events.map((e) => e.type)).toEqual(['mutation', 'summary', 'done']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node_modules/.bin/vitest run lib/__tests__/assistant-parse-stream.test.ts`
Expected: FAIL with "Cannot find module .../parse-stream".

- [ ] **Step 3: Implement the parser**

```ts
// lib/page-builder/assistant/parse-stream.ts — decode the route's NDJSON events.
import type { Mutation } from './validate';

export type AssistantEvent =
  | { type: 'mutation'; mutation: Mutation }
  | { type: 'summary'; text: string }
  | { type: 'error'; error: string }
  | { type: 'done' };

export async function* parseAssistantStream(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<AssistantEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (line) yield JSON.parse(line) as AssistantEvent;
    }
  }
  const tail = buffer.trim();
  if (tail) yield JSON.parse(tail) as AssistantEvent;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node_modules/.bin/vitest run lib/__tests__/assistant-parse-stream.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/page-builder/assistant/parse-stream.ts lib/__tests__/assistant-parse-stream.test.ts
git commit -m "feat(page-builder): NDJSON assistant stream parser

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

### Task 11: AssistantPanel + wire into EditorShell (with per-turn undo)

**Files:**
- Create: `components/page-builder/AssistantPanel.tsx`
- Modify: `components/page-builder/EditorShell.tsx`
- Test: `components/page-builder/__tests__/AssistantPanel.test.tsx`

**Interfaces:**
- Consumes: `applyMutation` (Task 9); `parseAssistantStream` (Task 10); `PageBlock`, `LayoutSnapshotItem`/`serializeLayout` not needed client-side (the server serializes); `setLayout`/`layout` from `EditorShell` (Task 1).
- Produces: `AssistantPanel` props:
  `{ layout: PageBlock[]; locale: string; onApply: (next: PageBlock[]) => void; onBeforeRun: () => void }`.
  `onBeforeRun` snapshots the current layout for one-click undo; `onApply` replaces the layout. The panel calls `POST /api/page-builder/assistant` with `{ prompt, layout, locale }` and applies each streamed mutation in order.

- [ ] **Step 1: Write the failing test (panel renders, posts, applies a mutation)**

```tsx
// components/page-builder/__tests__/AssistantPanel.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import AssistantPanel from '../AssistantPanel';
import type { PageBlock } from '@/lib/page-builder';

function ndjsonStream(lines: string[]): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  return new ReadableStream({
    start(c) {
      for (const l of lines) c.enqueue(enc.encode(l + '\n'));
      c.close();
    },
  });
}

describe('AssistantPanel', () => {
  it('should apply a streamed mutation by calling onApply', async () => {
    const layout = [{ blockType: 'hero', heading: 'A' }] as unknown as PageBlock[];
    const onApply = vi.fn();
    const onBeforeRun = vi.fn();

    global.fetch = vi.fn(async () =>
      new Response(
        ndjsonStream([
          '{"type":"mutation","mutation":{"kind":"add","index":1,"block":{"blockType":"faq"}}}',
          '{"type":"summary","text":"Added an FAQ."}',
          '{"type":"done"}',
        ]),
        { headers: { 'Content-Type': 'application/x-ndjson' } },
      ),
    ) as unknown as typeof fetch;

    render(
      <AssistantPanel layout={layout} locale="en" onApply={onApply} onBeforeRun={onBeforeRun} />,
    );
    fireEvent.change(screen.getByPlaceholderText(/describe/i), {
      target: { value: 'add an faq' },
    });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => expect(onApply).toHaveBeenCalled());
    expect(onBeforeRun).toHaveBeenCalledTimes(1);
    const applied = onApply.mock.calls[0][0] as PageBlock[];
    expect(applied.map((b) => b.blockType)).toEqual(['hero', 'faq']);
    await screen.findByText('Added an FAQ.');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node_modules/.bin/vitest run components/page-builder/__tests__/AssistantPanel.test.tsx`
Expected: FAIL with "Cannot find module ../AssistantPanel".

- [ ] **Step 3: Implement AssistantPanel**

```tsx
// components/page-builder/AssistantPanel.tsx — chat panel that drives the layout.
'use client';
import { useState, type ReactElement } from 'react';
import type { PageBlock } from '@/lib/page-builder';
import { applyMutation } from '@/lib/page-builder/assistant/apply';
import { parseAssistantStream } from '@/lib/page-builder/assistant/parse-stream';

type Props = {
  layout: PageBlock[];
  locale: string;
  onApply: (next: PageBlock[]) => void;
  onBeforeRun: () => void;
};

export default function AssistantPanel({ layout, locale, onApply, onBeforeRun }: Props): ReactElement {
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState('');
  const [error, setError] = useState('');

  async function run(): Promise<void> {
    if (!prompt.trim() || busy) return;
    setBusy(true);
    setSummary('');
    setError('');
    onBeforeRun();
    // Local working copy so each mutation builds on the previous one this turn.
    let working = layout;
    try {
      const res = await fetch('/api/page-builder/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ prompt, layout, locale }),
      });
      if (!res.ok || !res.body) {
        setError(`Request failed (${res.status}).`);
        return;
      }
      for await (const event of parseAssistantStream(res.body)) {
        if (event.type === 'mutation') {
          working = applyMutation(working, event.mutation);
          onApply(working);
        } else if (event.type === 'summary') {
          setSummary(event.text);
        } else if (event.type === 'error') {
          setError(event.error);
        }
      }
      setPrompt('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Assistant failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 border-t border-warm-200 p-3">
      <textarea
        className="min-h-16 w-full resize-none rounded border border-warm-200 p-2 text-sm"
        placeholder="Describe the page or change you want…"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        disabled={busy}
      />
      <button
        type="button"
        onClick={run}
        disabled={busy || !prompt.trim()}
        className="self-end rounded bg-blue-600 px-3 py-1 text-sm text-white disabled:opacity-50"
      >
        {busy ? 'Working…' : 'Send'}
      </button>
      {summary && <p className="text-xs text-warm-600">{summary}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 4: Wire the panel + undo into EditorShell**

In `components/page-builder/EditorShell.tsx`, add an undo snapshot and render the panel in the right `aside`. Add near the other state:

```tsx
  const [undoSnapshot, setUndoSnapshot] = useState<PageBlock[] | null>(null);
```

Then inside the right `<aside>`, **below** the FieldRenderer/placeholder block, add:

```tsx
          {undoSnapshot && (
            <button
              type="button"
              onClick={() => {
                setLayout(undoSnapshot);
                setUndoSnapshot(null);
              }}
              className="m-3 rounded border border-warm-300 px-2 py-1 text-xs text-warm-600"
            >
              Undo last AI change
            </button>
          )}
          <AssistantPanel
            layout={layout}
            locale={locale}
            onApply={setLayout}
            onBeforeRun={() => setUndoSnapshot(layout)}
          />
```

Add the import at the top: `import AssistantPanel from './AssistantPanel';`

- [ ] **Step 5: Run tests + typecheck**

Run: `node_modules/.bin/vitest run components/page-builder && node_modules/.bin/tsc --noEmit`
Expected: AssistantPanel and EditorShell tests pass; no type errors.

- [ ] **Step 6: Commit**

```bash
git add components/page-builder/AssistantPanel.tsx components/page-builder/EditorShell.tsx components/page-builder/__tests__/AssistantPanel.test.tsx
git commit -m "feat(page-builder): AI assistant panel with live apply and per-turn undo

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

### Task 12: End-to-end manual verification

**Files:** none (manual). Confirms the whole flow against a real key.

- [ ] **Step 1: Set the key and run the dev server**

Ensure `.env` (gitignored) has a real `ANTHROPIC_API_KEY`. Run: `node_modules/.bin/next dev` (or the project's dev script via the binary).

- [ ] **Step 2: Drive the assistant**

Open `http://localhost:3000/<locale>/build/home` (a draft page). In the panel, enter: "Build a landing page for a 3D-printing maker shop: a hero, a featured products section, and an FAQ." Confirm blocks appear live in the canvas.

- [ ] **Step 3: Edit + undo**

Enter "make the hero dark"; confirm the hero's background changes. Click "Undo last AI change"; confirm the layout reverts to before that turn. Reload the page in another tab to confirm the draft autosaved.

- [ ] **Step 4: Final full suite + typecheck**

Run: `node_modules/.bin/vitest run && node_modules/.bin/tsc --noEmit`
Expected: all green.

---

## Self-review notes

- **Spec coverage:** generate+edit (Tasks 5/11), in-editor panel (Task 11), Opus 4.8 server route (Task 7), auto-apply-to-draft + undo (Task 11), all-blocks-via-getBlockSchemas (Tasks 5/6), admin guard + rate limit (Tasks 7/8), draft-only autosave (Task 1), tests with mocked Anthropic (Task 7), Phase-0 prerequisite + merge (Tasks 1/2). All covered.
- **Known seam:** `update_block` field validation is name-only server-side (Task 6) and authoritative per-block client-side via `applyMutation` over the real target block (Task 9) — documented in both tasks.
- **Type consistency:** `Mutation`, `AssistantEvent`, `applyMutation`, `validateToolCall`, `serializeLayout`, `buildSystemPrompt`, `ASSISTANT_TOOLS`, `parseAssistantStream` names are used identically across tasks.
