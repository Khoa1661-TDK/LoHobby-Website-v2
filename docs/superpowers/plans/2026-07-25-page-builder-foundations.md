# Page Builder Foundations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add editor redo, a shared icon registry usable by any block, and a sanitized `customHtml` block — the three foundations the HTML importer depends on.

**Architecture:** Undo/redo moves out of `EditorShell` into a pure, unit-testable history module the component wires up. Icons become one lucide-free name registry (Payload-importable) plus one static-map React component. `customHtml` stores markup and CSS as localized/shared `code` fields, sanitized server-side at render: HTML through an allowlist, CSS through postcss with every selector prefixed to that block's wrapper so a rule cannot escape its section.

**Tech Stack:** Next.js 15 App Router, Payload CMS 3.x (Postgres), TypeScript strict, Tailwind 4, Vitest (node + jsdom projects), lucide-react, `sanitize-html`, `postcss` + `postcss-selector-parser`.

## Global Constraints

- **`pnpm <script>` fails in this environment** via `runDepsStatusCheck`. Call binaries directly: `node_modules/.bin/vitest`, `node_modules/.bin/payload`, `node_modules/.bin/tsc`.
- **Every new Payload block or field requires a generated migration**, or the storefront throws Postgres error `42P01` at runtime. Create with `node_modules/.bin/payload migrate:create <name>`; apply with `yes | node_modules/.bin/payload migrate` (it blocks on an un-suppressable dev-mode y/N prompt).
- **Payload 3.84 *blocks* have no `admin.description`**, and there is no field-level `RowLabel`. Use `admin.components.Label` on the block for row labelling. Individual *fields* do support `admin.description` — `src/payload/blocks/FeatureGrid.ts` uses it — and this plan relies on that.
- **A new field name must not collide with any name in `src/payload/blocks/_appearance.ts`.** Only `node_modules/.bin/payload generate:types` catches a collision; `tsc --noEmit` does not.
- **Test files must import their globals explicitly** — `import { describe, expect, it } from 'vitest'` — even though `globals: true` is set. `tsc --noEmit` fails without the import.
- **Vitest projects:** `.test.ts` under `lib/__tests__/`, `components/**/__tests__/`, `app/**/__tests__/`, `src/**/__tests__/` run in **node**; `.test.tsx` under `components/**/__tests__/` runs in **jsdom**.
- **`lib/page-builder.ts` and anything it imports is client-imported.** Do not add `import 'server-only'` to modules reachable from it.
- **Tailwind purges classes it cannot see** — `tailwind.config.ts` uses source globs. Never rely on a class name that exists only in a database string or a computed string in `lib/`.
- Commit directly to `main` with Conventional Commit messages. No feature branch, no PR.

---

## File Structure

**Created:**
- `lib/page-builder/history.ts` — pure undo/redo stack operations. No React.
- `lib/__tests__/page-builder-history.test.ts` — its tests.
- `lib/page-builder/icons.ts` — lucide **name** registry, grouped. No lucide import (Payload schemas import this).
- `lib/__tests__/page-builder-icons.test.ts` — registry tests.
- `components/blocks/_icon.tsx` — `<BlockIcon>`, static lucide import map.
- `lib/page-builder/sanitize-html.ts` — `sanitizeBlockHtml` + `scopeBlockCss`.
- `lib/__tests__/page-builder-sanitize-html.test.ts` — XSS + CSS-scoping tests.
- `src/payload/blocks/CustomHtml.ts` — block schema.
- `components/blocks/CustomHtml.tsx` — renderer.
- `components/blocks/__tests__/custom-html.test.tsx` — renderer test (jsdom).
- `components/page-builder/use-layout-history.ts` — the undo/redo callbacks and keyboard-shortcut effect, extracted from `EditorShell` so the state machine is testable without mounting the editor's full dependency tree. *(Added during Task 2; not in the original plan.)*
- `components/page-builder/__tests__/use-layout-history.test.tsx` — its tests.

**Modified:**
- `components/page-builder/EditorShell.tsx` — wire history module, redo button, keyboard shortcuts.
- `components/page-builder/AssistantPanel.tsx:35-36,153-154,324-345` — redo props + button.
- `components/page-builder/FieldRenderer.tsx:~530` — add a `code` field case.
- `lib/page-builder/feature-icons.ts` — becomes a re-export shim.
- `components/blocks/FeatureGrid.tsx:5-9,126` — use `BlockIcon`, drop the private map.
- `src/payload/blocks/{Steps,Stats,CardGrid,PricingTable,Tabs,Banner,CallToAction,InfoSection}.ts` — add `icon` fields.
- `src/payload/blocks/index.ts` — export `CustomHtml`.
- `lib/page-builder/block-schemas.ts:5-43,83-121` — register `CustomHtml`.
- `components/blocks/RenderBlocks.tsx:87+` — `case 'customHtml'`.
- `package.json` — add `sanitize-html`, `postcss-selector-parser`, `@types/sanitize-html`.

---

### Task 1: Pure history module

**Files:**
- Create: `lib/page-builder/history.ts`
- Test: `lib/__tests__/page-builder-history.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `type History<T> = { past: T[]; future: T[] }`, `emptyHistory<T>(): History<T>`, `recordHistory<T>(h, present, limit?): History<T>`, `undoHistory<T>(h, present): { history: History<T>; present: T } | null`, `redoHistory<T>(h, present): { history: History<T>; present: T } | null`. Task 2 consumes all five.

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/page-builder-history.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  emptyHistory,
  recordHistory,
  redoHistory,
  undoHistory,
} from '@/lib/page-builder/history';

describe('page-builder history', () => {
  it('should return null when undoing with no recorded past', () => {
    expect(undoHistory(emptyHistory<string>(), 'a')).toBeNull();
  });

  it('should restore the previous state when undoing one recorded change', () => {
    const h = recordHistory(emptyHistory<string>(), 'a');
    const result = undoHistory(h, 'b');
    expect(result?.present).toBe('a');
    expect(result?.history.past).toEqual([]);
  });

  it('should restore the undone state when redoing', () => {
    const h = recordHistory(emptyHistory<string>(), 'a');
    const undone = undoHistory(h, 'b');
    const redone = redoHistory(undone!.history, undone!.present);
    expect(redone?.present).toBe('b');
    expect(redone?.history.past).toEqual(['a']);
  });

  it('should clear the redo stack when a new change is recorded after an undo', () => {
    const h = recordHistory(emptyHistory<string>(), 'a');
    const undone = undoHistory(h, 'b')!;
    expect(undone.history.future).toEqual(['b']);
    const afterEdit = recordHistory(undone.history, 'c');
    expect(afterEdit.future).toEqual([]);
    expect(redoHistory(afterEdit, 'd')).toBeNull();
  });

  it('should cap the past stack at the given limit', () => {
    let h = emptyHistory<number>();
    for (let i = 0; i < 60; i += 1) h = recordHistory(h, i, 50);
    expect(h.past).toHaveLength(50);
    expect(h.past[0]).toBe(10);
    expect(h.past[49]).toBe(59);
  });

  it('should not grow the past stack past the limit across an undo/redo cycle', () => {
    // Build well past the cap: at exactly the cap this assertion would still pass with
    // the .slice(-limit) removed from redoHistory, so it would pin down nothing.
    let h = emptyHistory<number>();
    for (let i = 0; i < 60; i += 1) h = recordHistory(h, i, 50);
    const undone = undoHistory(h, 60)!;
    const redone = redoHistory(undone.history, undone.present)!;
    expect(redone.history.past.length).toBeLessThanOrEqual(50);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node_modules/.bin/vitest run lib/__tests__/page-builder-history.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/page-builder/history"`.

- [ ] **Step 3: Write the implementation**

Create `lib/page-builder/history.ts`:

```ts
// lib/page-builder/history.ts — pure undo/redo stacks for the page-builder editor.
// Kept free of React so the semantics (cap, redo invalidation) are unit-testable.

export type History<T> = { past: T[]; future: T[] };

const DEFAULT_LIMIT = 50;

export function emptyHistory<T>(): History<T> {
  return { past: [], future: [] };
}

/** Snapshot `present` onto the undo stack. A fresh edit invalidates the redo branch. */
export function recordHistory<T>(
  history: History<T>,
  present: T,
  limit: number = DEFAULT_LIMIT,
): History<T> {
  return { past: [...history.past, present].slice(-limit), future: [] };
}

/** Step back one state. Returns null at the head of history. */
export function undoHistory<T>(
  history: History<T>,
  present: T,
  limit: number = DEFAULT_LIMIT,
): { history: History<T>; present: T } | null {
  const previous = history.past[history.past.length - 1];
  if (previous === undefined) return null;
  return {
    history: {
      past: history.past.slice(0, -1),
      future: [present, ...history.future].slice(0, limit),
    },
    present: previous,
  };
}

/** Step forward one state. Returns null when nothing has been undone. */
export function redoHistory<T>(
  history: History<T>,
  present: T,
  limit: number = DEFAULT_LIMIT,
): { history: History<T>; present: T } | null {
  const next = history.future[0];
  if (next === undefined) return null;
  return {
    history: {
      past: [...history.past, present].slice(-limit),
      future: history.future.slice(1),
    },
    present: next,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node_modules/.bin/vitest run lib/__tests__/page-builder-history.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/page-builder/history.ts lib/__tests__/page-builder-history.test.ts
git commit -m "feat(page-builder): add pure undo/redo history module"
```

---

### Task 2: Wire redo into the editor

**Files:**
- Modify: `components/page-builder/EditorShell.tsx`
- Modify: `components/page-builder/AssistantPanel.tsx`

**Interfaces:**
- Consumes: `emptyHistory`, `recordHistory`, `undoHistory`, `redoHistory`, `History<T>` from Task 1.
- Produces: `AssistantPanel` props `redoAvailable?: boolean` and `onRedo?: () => void`, mirroring the existing `undoAvailable` / `onUndo`.

**Context:** `EditorShell.tsx` currently has *uncommitted* changes that replaced a single `undoSnapshot` with a capped `past` array (lines ~48-50, ~89-108). This task builds directly on that; commit it together.

- [ ] **Step 1: Replace the past-only state with the history module**

In `components/page-builder/EditorShell.tsx`, add to the imports:

```tsx
import type { History } from '@/lib/page-builder/history';
import {
  emptyHistory,
  recordHistory,
  redoHistory,
  undoHistory,
} from '@/lib/page-builder/history';
```

Replace the `past` state declaration (currently `const [past, setPast] = useState<LocaleLayouts[]>([]);`) with:

```tsx
  // Undo/redo history. A snapshot is pushed before every mutation — manual structural and
  // field edits, and each AI turn — so one Undo reverts the last change and Redo replays it.
  const [history, setHistory] = useState<History<LocaleLayouts>>(() => emptyHistory());
```

- [ ] **Step 2: Rewrite record/undo and add redo**

Replace the existing `record` / `undoAvailable` / `undoLastChange` block with:

```tsx
  // Push the current layouts onto the undo stack just before a mutation is applied.
  const record = useCallback((): void => {
    setHistory((h) => recordHistory(h, layoutsRef.current));
  }, []);

  const undoAvailable = history.past.length > 0;
  const redoAvailable = history.future.length > 0;

  const undoLastChange = useCallback((): void => {
    setHistory((h) => {
      const stepped = undoHistory(h, layoutsRef.current);
      if (!stepped) return h;
      setLayouts(stepped.present);
      setSelectedIndex(null);
      return stepped.history;
    });
  }, []);

  const redoLastChange = useCallback((): void => {
    setHistory((h) => {
      const stepped = redoHistory(h, layoutsRef.current);
      if (!stepped) return h;
      setLayouts(stepped.present);
      setSelectedIndex(null);
      return stepped.history;
    });
  }, []);
```

`layoutsRef` is already maintained by the existing effect above these lines, so both callbacks stay dependency-free and are not re-created on every layout change.

- [ ] **Step 3: Add the keyboard shortcuts**

Add below the callbacks:

```tsx
  // Cmd/Ctrl+Z undo, Cmd/Ctrl+Shift+Z or Ctrl+Y redo. Suppressed while focus is in a text
  // control so they don't fight the browser's native field-level undo.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      if (!e.metaKey && !e.ctrlKey) return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable) return;

      const key = e.key.toLowerCase();
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undoLastChange();
      } else if ((key === 'z' && e.shiftKey) || key === 'y') {
        e.preventDefault();
        redoLastChange();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [undoLastChange, redoLastChange]);
```

- [ ] **Step 4: Add the toolbar button**

Immediately after the existing Undo `<button>` (around line 288, the one with `title="Undo last change"`), add a sibling with the same classes:

```tsx
        <button
          type="button"
          onClick={redoLastChange}
          disabled={!redoAvailable}
          title="Redo last undone change"
          className="rounded-md border border-warm-200 px-3 py-1.5 text-sm disabled:opacity-40"
        >
          ↷ Redo
        </button>
```

Match the `className` to whatever the adjacent Undo button actually uses — copy it verbatim rather than the sample above if it differs.

- [ ] **Step 5: Pass redo through to the assistant panel**

At both `AssistantPanel` usages (around lines 383 and 410), add the two props beside the existing undo pair:

```tsx
              undoAvailable={undoAvailable}
              onUndo={undoLastChange}
              redoAvailable={redoAvailable}
              onRedo={redoLastChange}
```

In `components/page-builder/AssistantPanel.tsx`, add to the props type (beside `undoAvailable` / `onUndo` at lines 35-36):

```tsx
  redoAvailable?: boolean;
  onRedo?: () => void;
```

Destructure them in the component signature (beside line 153-154), and add a button next to the existing Undo control in the header (around line 329):

```tsx
          {redoAvailable && onRedo && (
            <button
              type="button"
              onClick={onRedo}
              aria-label="Redo"
              className="text-xs text-warm-500 hover:text-warm-700"
            >
              Redo
            </button>
          )}
```

Again, copy the `className` from the adjacent Undo button so the two match.

- [ ] **Step 6: Typecheck**

Run: `node_modules/.bin/tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Verify in the running app**

Start the dev server, open `/build/<a page>`, and confirm: an edit enables Undo; Undo enables Redo; Redo restores the edit; making a new edit after an undo disables Redo; `Cmd/Ctrl+Z` and `Cmd/Ctrl+Shift+Z` do the same; typing in a heading field and pressing `Cmd/Ctrl+Z` undoes text in the field, not the layout.

- [ ] **Step 8: Commit**

```bash
git add components/page-builder/EditorShell.tsx components/page-builder/AssistantPanel.tsx
git commit -m "feat(page-builder): add redo to the visual editor

Replaces the single undo snapshot with the shared history module: a capped
past stack plus a future stack that a fresh edit invalidates. Surfaced in the
toolbar and the assistant panel, with Cmd/Ctrl+Z and Cmd/Ctrl+Shift+Z / Ctrl+Y
bound outside text controls."
```

---

### Task 3: Code-field support in the builder panel

**Files:**
- Modify: `components/page-builder/FieldRenderer.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: `FieldRenderer` renders Payload `code` fields as an editable monospace textarea. Task 7's `customHtml` block depends on this — without it the block's `html`/`css` fields render the placeholder badge "code field — editable in a later phase" and cannot be edited.

- [ ] **Step 1: Add the `code` case**

In `components/page-builder/FieldRenderer.tsx`, inside the `switch (field.type)` block, add a case immediately after `case 'textarea':`'s return:

```tsx
      case 'code':
        return (
          <textarea
            id={id}
            value={typeof value === 'string' ? value : ''}
            disabled={disabled}
            onChange={(e) => set(e.target.value)}
            spellCheck={false}
            rows={12}
            className="w-full rounded-md border border-warm-200 bg-warm-50 px-3 py-2 font-mono text-xs leading-relaxed"
          />
        );
```

Match `className` to the existing `case 'textarea':` control, changing only the font to `font-mono text-xs` and the row count.

- [ ] **Step 2: Typecheck**

Run: `node_modules/.bin/tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/page-builder/FieldRenderer.tsx
git commit -m "feat(page-builder): render code fields as a monospace textarea"
```

---

### Task 4: Shared icon registry

**Files:**
- Create: `lib/page-builder/icons.ts`
- Modify: `lib/page-builder/feature-icons.ts`
- Test: `lib/__tests__/page-builder-icons.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `BLOCK_ICON_NAMES: readonly string[]` (all 64), `BLOCK_ICON_OPTIONS: { label: string; value: string }[]` (grouped, for Payload selects), `type BlockIconName`. Task 5 (`BlockIcon`) and Task 6 (icon fields) both consume these. `lib/page-builder/feature-icons.ts` keeps exporting `FEATURE_ICON_NAMES` and `FEATURE_ICON_OPTIONS` unchanged in content and order.

**Why lucide-free:** Payload block schemas import the option list. Importing `lucide-react` there would pull the icon bundle into the Payload config and the server build.

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/page-builder-icons.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  BLOCK_ICON_NAMES,
  BLOCK_ICON_OPTIONS,
  LEGACY_ICON_ALIASES,
} from '@/lib/page-builder/icons';
import { FEATURE_ICON_NAMES, FEATURE_ICON_OPTIONS } from '@/lib/page-builder/feature-icons';

describe('block icon registry', () => {
  it('should expose at least 60 icon names', () => {
    expect(BLOCK_ICON_NAMES.length).toBeGreaterThanOrEqual(60);
  });

  it('should contain no duplicate names', () => {
    expect(new Set(BLOCK_ICON_NAMES).size).toBe(BLOCK_ICON_NAMES.length);
  });

  it('should use kebab-case names only', () => {
    for (const name of BLOCK_ICON_NAMES) {
      expect(name).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it('should produce one select option per name', () => {
    expect(BLOCK_ICON_OPTIONS).toHaveLength(BLOCK_ICON_NAMES.length);
    for (const option of BLOCK_ICON_OPTIONS) {
      expect(BLOCK_ICON_NAMES).toContain(option.value);
      expect(option.label.length).toBeGreaterThan(0);
    }
  });

  it('should keep every legacy feature-grid icon resolvable, directly or via an alias', () => {
    for (const name of FEATURE_ICON_NAMES) {
      const resolved = LEGACY_ICON_ALIASES[name] ?? name;
      expect(BLOCK_ICON_NAMES).toContain(resolved);
    }
  });

  it('should keep the legacy feature-grid exports intact', () => {
    expect(FEATURE_ICON_NAMES).toHaveLength(16);
    expect(FEATURE_ICON_OPTIONS).toHaveLength(16);
    expect(FEATURE_ICON_NAMES[0]).toBe('zap');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node_modules/.bin/vitest run lib/__tests__/page-builder-icons.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/page-builder/icons"`.

- [ ] **Step 3: Write the registry**

Create `lib/page-builder/icons.ts`:

```ts
// lib/page-builder/icons.ts — curated lucide icon NAMES for page-builder blocks.
// Deliberately lucide-free: Payload block schemas import the option list, and pulling
// lucide-react into the Payload config would bundle every icon into the server build.
// The name -> component mapping lives in components/blocks/_icon.tsx.

export const BLOCK_ICON_GROUPS = {
  Commerce: [
    'truck', 'package', 'box', 'tag', 'shopping-cart', 'shopping-bag',
    'credit-card', 'receipt', 'gift', 'percent', 'store', 'wallet',
  ],
  Trust: [
    'shield', 'shield-check', 'award', 'badge-check', 'lock', 'thumbs-up',
    'star', 'heart', 'headphones', 'life-buoy', 'handshake', 'verified',
  ],
  Making: [
    'printer', 'ruler', 'layers', 'wrench', 'palette', 'scissors',
    'hammer', 'recycle', 'leaf', 'sparkles', 'wand', 'brush',
  ],
  Interface: [
    'arrow-right', 'arrow-up-right', 'check', 'check-circle', 'circle-help',
    'clock', 'calendar', 'mail', 'phone', 'map-pin', 'globe', 'search',
    'zap', 'flame', 'trending-up', 'bar-chart', 'users', 'user',
    'message-circle', 'bell', 'settings', 'refresh-cw', 'download', 'play',
    'image', 'video', 'file-text', 'book-open',
  ],
} as const satisfies Record<string, readonly string[]>;

export const BLOCK_ICON_NAMES = Object.values(BLOCK_ICON_GROUPS).flat() as readonly string[];

export type BlockIconName = (typeof BLOCK_ICON_NAMES)[number];

/** Title-case a kebab name for the Payload select label: "shield-check" -> "Shield Check". */
function labelFor(name: string): string {
  return name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/** Options for a Payload `select`, prefixed with their group so the list stays scannable. */
export const BLOCK_ICON_OPTIONS: { label: string; value: string }[] = Object.entries(
  BLOCK_ICON_GROUPS,
).flatMap(([group, names]) =>
  names.map((value) => ({ label: `${group} — ${labelFor(value)}`, value })),
);
```

Append the alias map to the same file. The 16 legacy names are all single lowercase words except `thumbsUp`, which is camelCase and is already stored in `featureGrid` rows in the database — aliasing it avoids a data migration:

```ts
/** Legacy camelCase names still present in stored featureGrid rows. Kept resolvable so
 *  existing content renders; deliberately not offered as new select options. */
export const LEGACY_ICON_ALIASES: Record<string, string> = {
  thumbsUp: 'thumbs-up',
};
```

- [ ] **Step 4: Convert feature-icons.ts to a shim**

Replace the whole body of `lib/page-builder/feature-icons.ts` with:

```ts
// lib/page-builder/feature-icons.ts — legacy alias for the Feature List block's icon set.
// Superseded by lib/page-builder/icons.ts. Kept so the FeatureGrid schema and stored rows
// keep working without a data migration; new blocks should import BLOCK_ICON_OPTIONS.
export const FEATURE_ICON_NAMES = [
  'zap', 'truck', 'shield', 'star',
  'box', 'layers', 'printer', 'sparkles',
  'heart', 'clock', 'award', 'package',
  'wrench', 'ruler', 'palette', 'thumbsUp',
] as const;

export type FeatureIconName = (typeof FEATURE_ICON_NAMES)[number];

export const FEATURE_ICON_OPTIONS = FEATURE_ICON_NAMES.map((value) => ({
  label: value.charAt(0).toUpperCase() + value.slice(1),
  value,
}));
```

This is byte-identical to the current file apart from the comment — the point is that it is now documented as legacy, not that its contents change. Do **not** repoint `FeatureGrid.ts` at the new options: doing so would orphan every stored `thumbsUp` value.

- [ ] **Step 5: Run tests to verify they pass**

Run: `node_modules/.bin/vitest run lib/__tests__/page-builder-icons.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 6: Commit**

```bash
git add lib/page-builder/icons.ts lib/page-builder/feature-icons.ts lib/__tests__/page-builder-icons.test.ts
git commit -m "feat(page-builder): add shared 64-name block icon registry"
```

---

### Task 5: BlockIcon component

**Files:**
- Create: `components/blocks/_icon.tsx`
- Modify: `components/blocks/FeatureGrid.tsx`
- Test: `components/blocks/__tests__/block-icon.test.tsx`

**Interfaces:**
- Consumes: `BLOCK_ICON_NAMES`, `LEGACY_ICON_ALIASES` from Task 4.
- Produces: `<BlockIcon name={string | null | undefined} className?: string size?: number />` — renders nothing for an unknown or absent name. Task 6's blocks and the later new-block plan both use it.

**Why a static map:** a dynamic `lucide-react` lookup defeats tree-shaking and hides the reference from Tailwind's scanner. Every icon must appear as a literal import.

- [ ] **Step 1: Write the failing test**

Create `components/blocks/__tests__/block-icon.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import BlockIcon, { ICON_COMPONENTS } from '@/components/blocks/_icon';
import { BLOCK_ICON_NAMES, LEGACY_ICON_ALIASES } from '@/lib/page-builder/icons';

describe('BlockIcon', () => {
  it('should have a component for every name in the registry', () => {
    for (const name of BLOCK_ICON_NAMES) {
      expect(ICON_COMPONENTS[name]).toBeDefined();
    }
  });

  it('should resolve every legacy alias', () => {
    for (const [legacy, modern] of Object.entries(LEGACY_ICON_ALIASES)) {
      expect(ICON_COMPONENTS[modern]).toBeDefined();
      const { container } = render(<BlockIcon name={legacy} />);
      expect(container.querySelector('svg')).not.toBeNull();
    }
  });

  it('should render an svg for a known name', () => {
    const { container } = render(<BlockIcon name="truck" />);
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('should render nothing for an unknown name', () => {
    const { container } = render(<BlockIcon name="not-a-real-icon" />);
    expect(container.innerHTML).toBe('');
  });

  it('should render nothing when the name is absent', () => {
    const { container } = render(<BlockIcon name={null} />);
    expect(container.innerHTML).toBe('');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node_modules/.bin/vitest run components/blocks/__tests__/block-icon.test.tsx`
Expected: FAIL — `Failed to resolve import "@/components/blocks/_icon"`.

- [ ] **Step 3: Write the component**

Create `components/blocks/_icon.tsx`. Import every name in `BLOCK_ICON_GROUPS` from `lucide-react` as a literal, then build the map. Lucide's exports are PascalCase of the kebab name (`shopping-cart` → `ShoppingCart`, `circle-help` → `CircleHelp`):

```tsx
// components/blocks/_icon.tsx — name -> lucide component map for page-builder blocks.
// The map is STATIC on purpose: a dynamic lookup would defeat tree-shaking and hide the
// references from Tailwind's class scanner. Adding a name to lib/page-builder/icons.ts
// means adding its import here; the block-icon test enforces that.
import type { LucideProps } from 'lucide-react';
import {
  ArrowRight, ArrowUpRight, Award, BadgeCheck, BarChart, Bell, BookOpen, Box, Brush,
  Calendar, Check, CheckCircle, CircleHelp, Clock, CreditCard, Download, FileText,
  Flame, Gift, Globe, Hammer, Handshake, Headphones, Heart, Image as ImageIcon, Layers,
  Leaf, LifeBuoy, Lock, Mail, MapPin, MessageCircle, Package, Palette, Percent, Phone,
  Play, Printer, Receipt, Recycle, RefreshCw, Ruler, Scissors, Search, Settings, Shield,
  ShieldCheck, ShoppingBag, ShoppingCart, Sparkles, Star, Store, Tag, ThumbsUp,
  TrendingUp, Truck, User, Users, Verified, Video, Wallet, Wand, Wrench, Zap,
} from 'lucide-react';
import type { ReactElement } from 'react';
import { LEGACY_ICON_ALIASES } from '@/lib/page-builder/icons';

export const ICON_COMPONENTS: Record<string, (props: LucideProps) => ReactElement> = {
  'truck': Truck, 'package': Package, 'box': Box, 'tag': Tag,
  'shopping-cart': ShoppingCart, 'shopping-bag': ShoppingBag, 'credit-card': CreditCard,
  'receipt': Receipt, 'gift': Gift, 'percent': Percent, 'store': Store, 'wallet': Wallet,

  'shield': Shield, 'shield-check': ShieldCheck, 'award': Award, 'badge-check': BadgeCheck,
  'lock': Lock, 'thumbs-up': ThumbsUp, 'star': Star, 'heart': Heart,
  'headphones': Headphones, 'life-buoy': LifeBuoy, 'handshake': Handshake, 'verified': Verified,

  'printer': Printer, 'ruler': Ruler, 'layers': Layers, 'wrench': Wrench,
  'palette': Palette, 'scissors': Scissors, 'hammer': Hammer, 'recycle': Recycle,
  'leaf': Leaf, 'sparkles': Sparkles, 'wand': Wand, 'brush': Brush,

  'arrow-right': ArrowRight, 'arrow-up-right': ArrowUpRight, 'check': Check,
  'check-circle': CheckCircle, 'circle-help': CircleHelp, 'clock': Clock,
  'calendar': Calendar, 'mail': Mail, 'phone': Phone, 'map-pin': MapPin,
  'globe': Globe, 'search': Search, 'zap': Zap, 'flame': Flame,
  'trending-up': TrendingUp, 'bar-chart': BarChart, 'users': Users, 'user': User,
  'message-circle': MessageCircle, 'bell': Bell, 'settings': Settings,
  'refresh-cw': RefreshCw, 'download': Download, 'play': Play,
  'image': ImageIcon, 'video': Video, 'file-text': FileText, 'book-open': BookOpen,
};

type Props = {
  name?: string | null;
  className?: string;
  size?: number;
};

/** Render a registry icon by name. Unknown or absent names render nothing. */
export default function BlockIcon({ name, className, size = 24 }: Props): ReactElement | null {
  if (!name) return null;
  const resolved = LEGACY_ICON_ALIASES[name] ?? name;
  const Icon = ICON_COMPONENTS[resolved];
  if (!Icon) return null;
  return <Icon className={className} size={size} aria-hidden />;
}
```

If any named import above does not exist in the installed `lucide-react`, the build fails with a clear "has no exported member" error — fix by consulting `node_modules/lucide-react/dist/lucide-react.d.ts` and, if the icon genuinely does not exist, remove that name from `BLOCK_ICON_GROUPS` in Task 4 as well.

- [ ] **Step 4: Run test to verify it passes**

Run: `node_modules/.bin/vitest run components/blocks/__tests__/block-icon.test.tsx`
Expected: PASS, 5 tests.

- [ ] **Step 5: Repoint FeatureGrid at BlockIcon**

In `components/blocks/FeatureGrid.tsx`, delete the `import type { LucideProps } from 'lucide-react'` / `import { … } from 'lucide-react'` pair and the private `ICONS` map, add `import BlockIcon from '@/components/blocks/_icon';`, and replace the render site (currently `const Icon = it.icon ? ICONS[it.icon] : undefined;` around line 126 and its usage) with a direct `<BlockIcon name={it.icon} className="…" />`, keeping whatever `className` the existing `<Icon>` usage passes.

- [ ] **Step 6: Run the feature-grid test and typecheck**

Run: `node_modules/.bin/vitest run components/blocks/__tests__/feature-grid.test.tsx && node_modules/.bin/tsc --noEmit`
Expected: PASS, no type errors.

- [ ] **Step 7: Commit**

```bash
git add components/blocks/_icon.tsx components/blocks/FeatureGrid.tsx components/blocks/__tests__/block-icon.test.tsx
git commit -m "feat(page-builder): add BlockIcon and use it in FeatureGrid"
```

---

### Task 6: Icon fields on existing blocks

**Files:**
- Modify: `src/payload/blocks/Steps.ts`, `Stats.ts`, `CardGrid.ts`, `PricingTable.ts`, `Tabs.ts`, `Banner.ts`, `CallToAction.ts`, `InfoSection.ts`
- Modify: the matching renderers in `components/blocks/`
- Create: one migration in `src/migrations/`

**Interfaces:**
- Consumes: `BLOCK_ICON_OPTIONS` from Task 4, `BlockIcon` from Task 5.
- Produces: an `icon` select on each listed block. The assistant's contract picks these up automatically — `buildBlockIndex` derives from `getBlockSchemas()`, so no prompt change is needed.

- [ ] **Step 1: Check for a name collision before writing anything**

`icon` must not already exist on these blocks, and must not clash with `_appearance.ts`.

Run: `grep -n "name: 'icon'" src/payload/blocks/*.ts && grep -n "name:" src/payload/blocks/_appearance.ts`
Expected: only `FeatureGrid.ts` has an `icon`; `_appearance.ts` has no field named `icon`. If any listed block already defines `icon`, skip that block and note it.

- [ ] **Step 2: Add the field to each schema**

In each of the eight files, add this field object. For row-level blocks (`Steps`, `Stats`, `CardGrid`, `PricingTable`, `Tabs`, `InfoSection`) it goes inside the array field's `fields`; for section-level blocks (`Banner`, `CallToAction`) it goes at the top level, before `...appearanceFields`:

```ts
    { name: 'icon', type: 'select', options: BLOCK_ICON_OPTIONS },
```

with the import added at the top of each file:

```ts
import { BLOCK_ICON_OPTIONS } from '@/lib/page-builder/icons';
```

Read each file first — `InfoSection` and `Tabs` have more than one array, so pick the one that renders a repeated visual item (columns for `InfoSection`, tabs for `Tabs`).

- [ ] **Step 3: Render the icon in each renderer**

In each matching `components/blocks/<Name>.tsx`, add `icon?: string | null` to the item/props type and render it where an icon belongs — typically before the item's title:

```tsx
<BlockIcon name={item.icon} size={20} className="text-accent" />
```

with `import BlockIcon from '@/components/blocks/_icon';`. Use whatever accent/spacing classes that renderer already uses for leading marks; do not introduce new colour tokens.

- [ ] **Step 4: Regenerate Payload types and check for collisions**

Run: `node_modules/.bin/payload generate:types`
Expected: completes without error. A field-name collision surfaces **only** here — if it reports one, rename the offending field rather than the appearance field.

- [ ] **Step 5: Create and apply the migration**

Run: `node_modules/.bin/payload migrate:create block_icon_fields`
Then: `yes | node_modules/.bin/payload migrate`
Expected: migration file appears in `src/migrations/`, applies cleanly. Confirm it only adds columns — review the generated `up` before applying; if it contains a `DROP`, stop and investigate rather than applying.

- [ ] **Step 6: Verify the storefront renders**

Start the dev server and load a page containing one of the modified blocks. A missing migration surfaces as Postgres `42P01` at request time, not at build time — this step is the only thing that catches it.

- [ ] **Step 7: Run the full test suite and typecheck**

Run: `node_modules/.bin/vitest run && node_modules/.bin/tsc --noEmit`
Expected: all pass.

- [ ] **Step 8: Commit**

```bash
git add src/payload/blocks/ components/blocks/ src/migrations/ src/payload/payload-types.ts
git commit -m "feat(page-builder): add icon fields to eight existing blocks"
```

---

### Task 7: HTML and CSS sanitizer

**Files:**
- Create: `lib/page-builder/sanitize-html.ts`
- Test: `lib/__tests__/page-builder-sanitize-html.test.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: nothing.
- Produces: `sanitizeBlockHtml(html: string): string` and `scopeBlockCss(css: string, blockId: string): string`. Task 8's renderer consumes both.

- [ ] **Step 1: Install the dependencies**

Run: `pnpm add sanitize-html postcss postcss-selector-parser && pnpm add -D @types/sanitize-html`
Expected: `package.json` gains all four. `postcss` may already be present transitively — adding it explicitly is correct since we now import it directly.

- [ ] **Step 2: Write the failing test**

Create `lib/__tests__/page-builder-sanitize-html.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { sanitizeBlockHtml, scopeBlockCss } from '@/lib/page-builder/sanitize-html';

describe('sanitizeBlockHtml', () => {
  it('should strip script tags and their contents', () => {
    const out = sanitizeBlockHtml('<p>ok</p><script>alert(1)</script>');
    expect(out).toContain('ok');
    expect(out).not.toContain('alert');
    expect(out).not.toContain('<script');
  });

  it('should strip inline event handlers', () => {
    const out = sanitizeBlockHtml('<img src="/media/a.png" onerror="alert(1)">');
    expect(out).not.toContain('onerror');
  });

  it('should strip javascript: hrefs', () => {
    const out = sanitizeBlockHtml('<a href="javascript:alert(1)">x</a>');
    expect(out).not.toContain('javascript:');
  });

  it('should strip iframes', () => {
    expect(sanitizeBlockHtml('<iframe src="https://evil.test"></iframe>')).not.toContain('<iframe');
  });

  it('should keep layout markup, classes and inline styles', () => {
    const out = sanitizeBlockHtml(
      '<section class="hero" style="padding:4rem"><h1>Hi</h1><p>Body</p></section>',
    );
    expect(out).toContain('<section');
    expect(out).toContain('class="hero"');
    expect(out).toContain('padding');
    expect(out).toContain('<h1>Hi</h1>');
  });

  it('should keep inline svg', () => {
    const out = sanitizeBlockHtml('<svg viewBox="0 0 24 24"><path d="M0 0h24"/></svg>');
    expect(out).toContain('<svg');
    expect(out).toContain('viewBox');
    expect(out).toContain('<path');
  });

  it('should keep root-relative and https image sources', () => {
    const out = sanitizeBlockHtml('<img src="/media/a.png"><img src="https://cdn.test/b.png">');
    expect(out).toContain('/media/a.png');
    expect(out).toContain('https://cdn.test/b.png');
  });

  it('should drop data-uri sources', () => {
    const out = sanitizeBlockHtml('<img src="data:text/html;base64,PHNjcmlwdD4=">');
    expect(out).not.toContain('data:text/html');
  });
});

describe('scopeBlockCss', () => {
  it('should prefix every selector with the block attribute', () => {
    const out = scopeBlockCss('.card { color: red; }', 'abc');
    expect(out).toBe('[data-html-block="abc"] .card { color: red; }');
  });

  it('should prevent a body rule from affecting the page', () => {
    const out = scopeBlockCss('body { display: none; }', 'abc');
    expect(out).toContain('[data-html-block="abc"]');
    expect(out).not.toMatch(/^\s*body\s*\{/);
  });

  it('should scope every selector in a comma-separated list', () => {
    const out = scopeBlockCss('h1, h2 { margin: 0; }', 'abc');
    expect(out).toContain('[data-html-block="abc"] h1');
    expect(out).toContain('[data-html-block="abc"] h2');
  });

  it('should scope selectors inside a media query', () => {
    const out = scopeBlockCss('@media (min-width: 40rem) { .g { display: grid; } }', 'abc');
    expect(out).toContain('@media');
    expect(out).toContain('[data-html-block="abc"] .g');
  });

  it('should namespace keyframe names so two blocks cannot collide', () => {
    const a = scopeBlockCss('@keyframes fade { to { opacity: 1 } } .x { animation: fade 1s }', 'a');
    const b = scopeBlockCss('@keyframes fade { to { opacity: 0 } } .x { animation: fade 1s }', 'b');
    expect(a).toContain('fade-a');
    expect(b).toContain('fade-b');
    expect(a).not.toContain('fade-b');
  });

  it('should drop @import rules', () => {
    const out = scopeBlockCss('@import url("https://evil.test/x.css"); .a { color: red }', 'abc');
    expect(out).not.toContain('@import');
  });

  it('should drop off-origin url() references', () => {
    const out = scopeBlockCss('.a { background: url("https://evil.test/x.png") }', 'abc');
    expect(out).not.toContain('evil.test');
  });

  it('should rewrite position fixed to absolute', () => {
    const out = scopeBlockCss('.a { position: fixed; top: 0 }', 'abc');
    expect(out).toContain('position: absolute');
    expect(out).not.toContain('fixed');
  });

  it('should return an empty string for unparseable css rather than throwing', () => {
    expect(scopeBlockCss('.a { color: ', 'abc')).toBe('');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `node_modules/.bin/vitest run lib/__tests__/page-builder-sanitize-html.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/page-builder/sanitize-html"`.

- [ ] **Step 4: Write the implementation**

Create `lib/page-builder/sanitize-html.ts`:

```ts
// lib/page-builder/sanitize-html.ts — server-side sanitizing for the customHtml block.
// Runs at RENDER time, not save time, so tightening these rules also protects markup that
// is already stored. No `import 'server-only'` — lib/page-builder.ts is client-imported and
// this module sits in the same directory tree.
import postcss from 'postcss';
import selectorParser from 'postcss-selector-parser';
import sanitizeHtml from 'sanitize-html';

const ALLOWED_TAGS = [
  'section', 'div', 'article', 'aside', 'header', 'footer', 'main', 'nav',
  'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'strong', 'em', 'small',
  'ul', 'ol', 'li', 'dl', 'dt', 'dd', 'blockquote', 'cite', 'code', 'pre',
  'a', 'img', 'picture', 'source', 'figure', 'figcaption', 'br', 'hr',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption',
  'svg', 'path', 'circle', 'rect', 'g', 'line', 'polyline', 'polygon', 'ellipse',
];

const COMMON_ATTRS = ['class', 'id', 'style', 'title', 'role'];

const SVG_ATTRS = [
  'viewBox', 'xmlns', 'd', 'fill', 'stroke', 'stroke-width', 'stroke-linecap',
  'stroke-linejoin', 'points', 'cx', 'cy', 'r', 'x', 'y', 'x1', 'y1', 'x2', 'y2',
  'rx', 'ry', 'width', 'height', 'transform', 'opacity',
];

/** Strip everything that can execute, phone home, or break out of the block. */
export function sanitizeBlockHtml(html: string): string {
  if (!html) return '';
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      '*': [...COMMON_ATTRS, 'data-*', 'aria-*'],
      a: [...COMMON_ATTRS, 'href', 'target', 'rel'],
      img: [...COMMON_ATTRS, 'src', 'srcset', 'sizes', 'alt', 'width', 'height', 'loading', 'decoding'],
      source: [...COMMON_ATTRS, 'src', 'srcset', 'sizes', 'media', 'type'],
      svg: [...COMMON_ATTRS, ...SVG_ATTRS],
      path: [...COMMON_ATTRS, ...SVG_ATTRS],
      circle: [...COMMON_ATTRS, ...SVG_ATTRS],
      rect: [...COMMON_ATTRS, ...SVG_ATTRS],
      g: [...COMMON_ATTRS, ...SVG_ATTRS],
      line: [...COMMON_ATTRS, ...SVG_ATTRS],
      polyline: [...COMMON_ATTRS, ...SVG_ATTRS],
      polygon: [...COMMON_ATTRS, ...SVG_ATTRS],
      ellipse: [...COMMON_ATTRS, ...SVG_ATTRS],
      td: [...COMMON_ATTRS, 'colspan', 'rowspan'],
      th: [...COMMON_ATTRS, 'colspan', 'rowspan', 'scope'],
    },
    // Anything not listed here — javascript:, data:, vbscript: — is dropped with the attribute.
    allowedSchemes: ['https', 'mailto', 'tel'],
    allowedSchemesAppliedToAttributes: ['href', 'src', 'srcset'],
    allowProtocolRelative: false,
    // Drop the tag AND its text content for executable containers.
    nonTextTags: ['script', 'style', 'textarea', 'option', 'noscript'],
    // sanitize-html strips on* handlers by virtue of the attribute allowlist above.
  });
}

const OFF_ORIGIN_URL = /url\(\s*['"]?(?:https?:)?\/\//i;

/** Document-level selectors that must collapse to the scope itself rather than become a
 *  descendant of it — `body { … }` scoped naively would never match anything. */
const ROOT_SELECTORS = new Set(['html', 'body', ':root', '*']);

/** Prefix each comma-separated selector with the scope. The parser does the splitting so
 *  commas inside `:is(...)` / `:not(...)` are not mistaken for selector boundaries. */
function prefixSelector(selector: string, scope: string): string {
  const parts: string[] = [];
  selectorParser((root) => {
    root.each((sel) => {
      const text = sel.toString().trim();
      if (text) parts.push(text);
    });
  }).processSync(selector);

  if (parts.length === 0) return scope;
  return parts
    .map((part) => (ROOT_SELECTORS.has(part) ? scope : `${scope} ${part}`))
    .join(', ');
}

/** Prefix every selector with the block's data attribute so a rule cannot match outside
 *  its own section, and neutralise the declarations that can still escape it visually. */
export function scopeBlockCss(css: string, blockId: string): string {
  if (!css) return '';
  const scope = `[data-html-block="${blockId}"]`;

  let root: postcss.Root;
  try {
    root = postcss.parse(css);
  } catch {
    // Malformed CSS from an import or a hand edit — drop it rather than emitting garbage.
    return '';
  }

  // 1. Namespace @keyframes so two custom blocks on one page cannot collide.
  const renamedKeyframes = new Map<string, string>();
  root.walkAtRules('keyframes', (rule) => {
    const original = rule.params.trim();
    const renamed = `${original}-${blockId}`;
    renamedKeyframes.set(original, renamed);
    rule.params = renamed;
  });

  // 2. Drop @import outright — it is a remote fetch we do not control.
  root.walkAtRules('import', (rule) => rule.remove());

  // 3. Scope every selector.
  root.walkRules((rule) => {
    // Selectors inside @keyframes are percentages/from/to, not element selectors.
    if (rule.parent?.type === 'atrule' && (rule.parent as postcss.AtRule).name === 'keyframes') {
      return;
    }
    rule.selector = prefixSelector(rule.selector, scope);
  });

  // 4. Neutralise escaping declarations.
  root.walkDecls((decl) => {
    if (decl.prop === 'position' && decl.value.trim() === 'fixed') decl.value = 'absolute';
    if (OFF_ORIGIN_URL.test(decl.value)) decl.remove();
    if (/expression\s*\(/i.test(decl.value) || decl.prop === 'behavior') decl.remove();
    const renamed = renamedKeyframes.get(decl.value.split(/\s+/)[0] ?? '');
    if ((decl.prop === 'animation' || decl.prop === 'animation-name') && renamed) {
      decl.value = decl.value.replace(/^\S+/, renamed);
    }
  });

  return root.toString();
}
```

`prefixSelector` uses `postcss-selector-parser` only to *split* the selector list, then prefixes each part as a string. That is deliberate — building the prefix through the parser's AST (`selectorParser.attribute({...})`) requires a fiddly `raws` object and buys nothing here, since the scope is a fixed literal.

- [ ] **Step 5: Run tests to verify they pass**

Run: `node_modules/.bin/vitest run lib/__tests__/page-builder-sanitize-html.test.ts`
Expected: PASS, 18 tests. Iterate on the implementation until every one passes — do not weaken a test to make it pass.

- [ ] **Step 6: Commit**

```bash
git add lib/page-builder/sanitize-html.ts lib/__tests__/page-builder-sanitize-html.test.ts package.json pnpm-lock.yaml
git commit -m "feat(page-builder): add HTML sanitizer and scoped-CSS transformer"
```

---

### Task 8: The customHtml block

**Files:**
- Create: `src/payload/blocks/CustomHtml.ts`
- Create: `components/blocks/CustomHtml.tsx`
- Test: `components/blocks/__tests__/custom-html.test.tsx`
- Modify: `src/payload/blocks/index.ts`, `lib/page-builder/block-schemas.ts`, `components/blocks/RenderBlocks.tsx`
- Create: one migration in `src/migrations/`

**Interfaces:**
- Consumes: `sanitizeBlockHtml`, `scopeBlockCss` from Task 7; `appearanceFields` from `src/payload/blocks/_appearance.ts`; `blockAppearanceClasses` from `@/lib/page-builder`; the `code` field renderer from Task 3.
- Produces: block slug `customHtml` with fields `label` (text), `html` (code, localized), `css` (code, not localized), plus appearance. The HTML-importer plan writes to this block.

- [ ] **Step 1: Write the failing renderer test**

Create `components/blocks/__tests__/custom-html.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import CustomHtmlBlock from '@/components/blocks/CustomHtml';

describe('CustomHtml block', () => {
  it('should render nothing when html is empty', () => {
    const { container } = render(<CustomHtmlBlock id="a" html="" />);
    expect(container.innerHTML).toBe('');
  });

  it('should render sanitized markup', () => {
    const { container } = render(
      <CustomHtmlBlock id="a" html='<section class="x"><h2>Title</h2></section>' />,
    );
    expect(container.querySelector('h2')?.textContent).toBe('Title');
  });

  it('should not render a script from the stored html', () => {
    const { container } = render(
      <CustomHtmlBlock id="a" html='<p>ok</p><script>window.x=1</script>' />,
    );
    expect(container.querySelector('script')).toBeNull();
  });

  it('should tag the wrapper with the block id for css scoping', () => {
    const { container } = render(<CustomHtmlBlock id="blk1" html="<p>x</p>" />);
    expect(container.querySelector('[data-html-block="blk1"]')).not.toBeNull();
  });

  it('should emit scoped css when css is provided', () => {
    const { container } = render(
      <CustomHtmlBlock id="blk1" html="<p>x</p>" css=".a { color: red }" />,
    );
    const style = container.querySelector('style');
    expect(style?.textContent).toContain('[data-html-block="blk1"] .a');
  });

  it('should emit no style element when css is absent', () => {
    const { container } = render(<CustomHtmlBlock id="blk1" html="<p>x</p>" />);
    expect(container.querySelector('style')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node_modules/.bin/vitest run components/blocks/__tests__/custom-html.test.tsx`
Expected: FAIL — `Failed to resolve import "@/components/blocks/CustomHtml"`.

- [ ] **Step 3: Write the renderer**

Create `components/blocks/CustomHtml.tsx`:

```tsx
// components/blocks/CustomHtml.tsx — renders admin-authored markup for the customHtml block.
// Both the markup and the CSS are sanitized here, at render time, so tightening the rules in
// sanitize-html.ts also protects rows already stored in the database.
import type { ReactElement } from 'react';
import type { BlockAppearance } from '@/lib/page-builder';
import { blockAppearanceClasses } from '@/lib/page-builder';
import { sanitizeBlockHtml, scopeBlockCss } from '@/lib/page-builder/sanitize-html';

type Props = {
  id?: string | null;
  html?: string | null;
  css?: string | null;
} & BlockAppearance;

export default function CustomHtmlBlock(props: Props): ReactElement | null {
  const { id, html, css } = props;
  const { section, container, style } = blockAppearanceClasses(props);

  const cleanHtml = sanitizeBlockHtml(html ?? '');
  if (!cleanHtml.trim()) return null;

  const scopeId = id ?? 'custom-html';
  const cleanCss = css ? scopeBlockCss(css, scopeId) : '';

  return (
    <section className={section} style={style} data-html-block={scopeId}>
      {cleanCss ? <style>{cleanCss}</style> : null}
      <div className={container} dangerouslySetInnerHTML={{ __html: cleanHtml }} />
    </section>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node_modules/.bin/vitest run components/blocks/__tests__/custom-html.test.tsx`
Expected: PASS, 6 tests.

- [ ] **Step 5: Write the block schema**

Create `src/payload/blocks/CustomHtml.ts`:

```ts
// src/payload/blocks/CustomHtml.ts — raw HTML escape hatch for designs the block set
// cannot express. Markup is sanitized at render (components/blocks/CustomHtml.tsx);
// nothing here is trusted.
import type { Block } from 'payload';
import { appearanceFields } from './_appearance';

export const CustomHtml: Block = {
  slug: 'customHtml',
  labels: { singular: 'Custom HTML', plural: 'Custom HTML' },
  interfaceName: 'CustomHtmlBlock',
  fields: [
    {
      name: 'label',
      type: 'text',
      admin: { description: 'Editor-only name for this section, shown in the layers list.' },
    },
    {
      name: 'html',
      type: 'code',
      required: true,
      localized: true,
      admin: {
        language: 'html',
        description:
          'Markup for this section. Scripts, iframes, forms and event handlers are removed when the page renders.',
      },
    },
    {
      name: 'css',
      type: 'code',
      admin: {
        language: 'css',
        description:
          'Optional CSS. Every selector is automatically scoped to this section, so a rule here cannot affect the rest of the page. Not localized — styling is shared across languages.',
      },
    },
    ...appearanceFields,
  ],
};
```

- [ ] **Step 6: Register the block in all three places**

1. `src/payload/blocks/index.ts` — add `export { CustomHtml } from './CustomHtml';`
2. `lib/page-builder/block-schemas.ts` — add `CustomHtml` to both the import list (lines 5-43) and `REGISTERED_BLOCKS` (lines 83-121).
3. `components/blocks/RenderBlocks.tsx` — add to the `switch (block.blockType)`, following the shape of the neighbouring cases:

```tsx
    case 'customHtml':
      return <CustomHtmlBlock {...block} />;
```

with `import CustomHtmlBlock from '@/components/blocks/CustomHtml';` at the top. If the file's existing cases cast the block (`block as CustomHtmlBlock`), match that pattern — and route any needed cast through `unknown` first, which is what the existing tests require.

Also confirm the `Pages` collection picks blocks up from the shared list rather than an inline array — `grep -n "blocks" src/payload/collections/Pages.ts`. If it lists blocks explicitly, add `CustomHtml` there too.

- [ ] **Step 7: Regenerate types and check for collisions**

Run: `node_modules/.bin/payload generate:types`
Expected: no error, and `CustomHtmlBlock` appears in `src/payload/payload-types.ts`. A name collision between `label`/`html`/`css` and an appearance field surfaces only here.

- [ ] **Step 8: Create and apply the migration**

Run: `node_modules/.bin/payload migrate:create custom_html_block`
Review the generated `up` — it should only create the new block table. Then: `yes | node_modules/.bin/payload migrate`

- [ ] **Step 9: Verify end to end in the app**

Start the dev server. In `/build/<a page>`: add a Custom HTML section from the picker; paste `<section><h2>Hello</h2><p>From imported markup</p></section>` into the HTML field and `h2 { color: crimson }` into the CSS field; confirm the field editors are monospace textareas (Task 3), the preview renders the heading in crimson, and the storefront page renders it too. Then paste `<script>alert(1)</script>` and confirm nothing executes.

- [ ] **Step 10: Run the full suite and typecheck**

Run: `node_modules/.bin/vitest run && node_modules/.bin/tsc --noEmit`
Expected: all pass.

- [ ] **Step 11: Commit**

```bash
git add src/payload/blocks/CustomHtml.ts src/payload/blocks/index.ts components/blocks/CustomHtml.tsx components/blocks/RenderBlocks.tsx components/blocks/__tests__/custom-html.test.tsx lib/page-builder/block-schemas.ts src/migrations/ src/payload/payload-types.ts
git commit -m "feat(page-builder): add sanitized customHtml block

Escape hatch for section designs the block set cannot express. Markup and CSS
are sanitized server-side at render; every CSS selector is scoped to the
block's own wrapper so a rule cannot reach the rest of the page."
```

---

## Verification

After Task 8, the whole plan is done when all of these hold:

- [ ] `node_modules/.bin/vitest run` — full suite green
- [ ] `node_modules/.bin/tsc --noEmit` — clean
- [ ] `node_modules/.bin/payload generate:types` — clean, no collisions
- [ ] `node_modules/.bin/next build` — production build succeeds
- [ ] A storefront page containing a `customHtml` block and an icon-bearing block renders without a `42P01`
- [ ] Undo → Redo → new-edit-clears-redo verified by hand in `/build`

## What this plan does NOT cover

Deliberately deferred to their own plans, per the spec's phasing:

- The six new block types (`bentoGrid`, `timeline`, `comparisonTable`, `teamGrid`, `beforeAfter`, `contactMap`).
- The HTML importer — parser, `list_import_sections` / `import_section` tools, `/api/page-builder/import` route, `ImportHtmlDialog`, and the image download-and-upload pipeline.
