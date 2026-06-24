# Pagebuilder Rich Text Editing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `richText` block fields editable in the custom pagebuilder via a Markdown textarea that round-trips through native Lexical JSON.

**Architecture:** A new pure, dependency-free module (`lib/page-builder/lexical-markdown.ts`) converts Markdown ↔ Lexical JSON in the browser. A new client component (`RichTextField.tsx`) seeds a textarea from the stored Lexical value and commits converted Lexical JSON on edit. `FieldRenderer` gains a `richText` case, and `default-block.ts` returns `null` for new richText fields.

**Tech Stack:** TypeScript, React 19 (automatic JSX runtime), Vitest (jsdom project for `.tsx`, node project for `.ts`), `@` path alias resolves to repo root.

## Global Constraints

- No new npm dependencies. Conversion is pure TypeScript in `lib/`.
- Stored block value stays native Lexical JSON (`{ root: { type: 'root', children: [...] } }`) — identical shape to what Payload's admin produces. Never store Markdown.
- Markdown subset only: paragraphs, `#`/`##`/`###` headings, `**bold**`, `*italic*`, `` `code` ``, `[text](url)` links, `-`/`*` bulleted lists, `1.` numbered lists. Unknown Lexical nodes degrade to text content; never throw.
- Commit cadence matches the existing `textarea` field — commit per change. The `Field` switch's `set(v)` calls `onChange?.(activeName, v)` where `activeName` is the field name for non-themed fields.
- Follow existing code style: 2-space indent, single quotes, no semicolons (see `FieldRenderer.tsx`), `ReactElement` return types, `'use client'` at top of client components.
- Vitest: pure `.ts` tests run under the `node` project (path `lib/__tests__/**/*.test.ts`); `.tsx` component tests run under the `jsdom` project (path `components/**/__tests__/**/*.test.tsx`). Do not give a pure-logic test a `.tsx` extension.
- TDD: write the failing test first, run it, then implement.

---

### Task 1: Lexical Markdown converter — `markdownToLexical`

**Files:**
- Create: `lib/page-builder/lexical-markdown.ts`
- Test: `lib/__tests__/lexical-markdown.test.ts`

**Interfaces:**
- Produces: `markdownToLexical(md: string): LexicalDoc` and the types `LexicalDoc`, `LexicalNode` (exported from the same module).

- [ ] **Step 1: Write the failing tests**

Create `lib/__tests__/lexical-markdown.test.ts`:

```ts
/// <reference types="vitest" />
import { describe, expect, it } from 'vitest';
import { markdownToLexical, type LexicalDoc } from '@/lib/page-builder/lexical-markdown';

function children(doc: LexicalDoc) {
  return doc.root.children as { type: string; [k: string]: unknown }[];
}

describe('markdownToLexical', () => {
  it('should return a single empty paragraph for empty input', () => {
    const doc = markdownToLexical('');
    expect(doc.root.type).toBe('root');
    expect(children(doc)).toHaveLength(1);
    expect(children(doc)[0].type).toBe('paragraph');
  });

  it('should render a plain line as a paragraph', () => {
    const doc = markdownToLexical('Hello world');
    expect(children(doc)[0].type).toBe('paragraph');
  });

  it('should render # as a heading with tag h1', () => {
    const doc = markdownToLexical('# Title');
    const node = children(doc)[0];
    expect(node.type).toBe('heading');
    expect(node.tag).toBe('h1');
  });

  it('should render ## and ### as h2 and h3', () => {
    expect(children(markdownToLexical('## Sub'))[0].tag).toBe('h2');
    expect(children(markdownToLexical('### Sub'))[0].tag).toBe('h3');
  });

  it('should split paragraphs on blank lines', () => {
    const doc = markdownToLexical('First\n\nSecond');
    expect(children(doc).filter((n) => n.type === 'paragraph')).toHaveLength(2);
  });

  it('should parse **bold** into a text node with bold format', () => {
    const doc = markdownToLexical('**hi**');
    const para = children(doc)[0] as { children: { format: number; text: string }[] };
    expect(para.children[0].text).toBe('hi');
    expect(para.children[0].format & 1).toBe(1); // IS_BOLD bit
  });

  it('should parse *italic* into a text node with italic format', () => {
    const doc = markdownToLexical('*hi*');
    const para = children(doc)[0] as { children: { format: number; text: string }[] };
    expect(para.children[0].text).toBe('hi');
    expect(para.children[0].format & 2).toBe(2); // IS_ITALIC bit
  });

  it('should parse `code` into a text node with code format', () => {
    const doc = markdownToLexical('`hi`');
    const para = children(doc)[0] as { children: { format: number; text: string }[] };
    expect(para.children[0].text).toBe('hi');
    expect(para.children[0].format & 16).toBe(16); // IS_CODE bit
  });

  it('should parse [text](url) into a link node', () => {
    const doc = markdownToLexical('[go](https://example.com)');
    const para = children(doc)[0] as {
      children: { type: string; fields?: { url: string }; value?: { text: string } }[];
    };
    const link = para.children[0];
    expect(link.type).toBe('link');
    expect(link.fields?.url).toBe('https://example.com');
    expect(link.value?.text).toBe('go');
  });

  it('should parse - and * bullets into an unordered list', () => {
    const doc = markdownToLexical('- a\n- b');
    const list = children(doc)[0];
    expect(list.type).toBe('list');
    expect(list.tag).toBe('ul');
    expect((list as { list: unknown[] }).list).toHaveLength(2);
  });

  it('should parse 1. items into an ordered list', () => {
    const doc = markdownToLexical('1. a\n2. b');
    const list = children(doc)[0];
    expect(list.type).toBe('list');
    expect(list.tag).toBe('ol');
  });

  it('should support nested unordered lists under two-space indent', () => {
    const doc = markdownToLexical('- a\n  - b');
    const list = children(doc)[0] as {
      list: { children: { type: string; children?: unknown[] }[] }[];
    };
    const outerItem = list.list[0];
    const nested = outerItem.children?.find((c) => (c as { type: string }).type === 'list');
    expect(nested).toBeDefined();
    expect((nested as { type: string }).type).toBe('list');
  });

  // Nested lists do NOT round-trip to the exact original indent (depth is
  // reconstructed, not the original spacing) — only assert flat-list round-trip.
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run lib/__tests__/lexical-markdown.test.ts`
Expected: FAIL — `Failed to resolve import '@/lib/page-builder/lexical-markdown'`.

- [ ] **Step 3: Write the implementation**

Create `lib/page-builder/lexical-markdown.ts`:

```ts
// lib/page-builder/lexical-markdown.ts — pure Markdown ↔ Lexical JSON converter.
// Dependency-free; runs in the browser. Supports a Markdown subset:
// paragraphs, #/##/### headings, **bold**, *italic*, `code`, [text](url) links,
// - /* bulleted lists, 1. ordered lists, two-space nested lists.

export type LexicalNode = { type: string; [k: string]: unknown };

export type LexicalDoc = {
  root: { type: 'root'; children: LexicalNode[] };
};

// Lexical FormatFlags (subset of @lexical/text).
const IS_BOLD = 1;
const IS_ITALIC = 2;
const IS_CODE = 16;

type TextFormat = { format: number };

type InlineSegment =
  | { kind: 'text'; text: string; format: number }
  | { kind: 'link'; url: string; text: string };

// Parse inline markdown (bold/italic/code/link) into Lexical text/link nodes.
// Order matters: links first (they may contain formatted text), then code, then
// bold, then italic.
function parseInline(line: string): LexicalNode[] {
  const segments: InlineSegment[] = [{ kind: 'text', text: '', format: 0 }];
  let i = 0;

  const pushText = (ch: string, format: number) => {
    const last = segments[segments.length - 1];
    if (last.kind === 'text' && last.format === format) {
      last.text += ch;
    } else {
      segments.push({ kind: 'text', text: ch, format });
    }
  };

  while (i < line.length) {
    const rest = line.slice(i);

    // [text](url)
    const link = /^\[([^\]]*)\]\(([^)\s]+)\)/.exec(rest);
    if (link) {
      segments.push({ kind: 'link', url: link[2]!, text: link[1]! });
      i += link[0].length;
      continue;
    }

    // `code`
    const code = /^`([^`]+)`/.exec(rest);
    if (code) {
      segments.push({ kind: 'text', text: code[1]!, format: IS_CODE });
      i += code[0].length;
      continue;
    }

    // **bold**
    const bold = /^\*\*([^*]+)\*\*/.exec(rest);
    if (bold) {
      for (const ch of bold[1]!) pushText(ch, IS_BOLD);
      i += bold[0].length;
      continue;
    }

    // *italic*
    const italic = /^\*([^*]+)\*/.exec(rest);
    if (italic) {
      for (const ch of italic[1]!) pushText(ch, IS_ITALIC);
      i += italic[0].length;
      continue;
    }

    pushText(line[i]!, 0);
    i += 1;
  }

  const nodes: LexicalNode[] = [];
  for (const seg of segments) {
    if (seg.kind === 'text' && seg.text === '') continue;
    if (seg.kind === 'text') {
      nodes.push({
        type: 'text',
        text: seg.text,
        format: seg.format,
        version: 1,
      } as LexicalNode & TextFormat);
    } else {
      nodes.push({
        type: 'link',
        fields: { url: seg.url },
        children: [{ type: 'text', text: seg.text, format: 0, version: 1 }],
        direction: 'ltr',
        format: '',
        indent: 0,
        version: 1,
      });
    }
  }
  return nodes;
}

type ListItem = { value: LexicalNode[]; children: ListItem[] };
type ListBlock = { tag: 'ul' | 'ol'; items: ListItem[] };

const LIST_LINE = /^(\s*)([-*]|\d+\.)\s+(.*)$/;

// Parse a list whose items all share `minIndent` leading spaces. Returns the
// parsed block and the index of the first line that is not part of this list.
function parseList(lines: string[], start: number, minIndent: number): { block: ListBlock; next: number } {
  const items: ListItem[] = [];
  let i = start;
  let tag: 'ul' | 'ol' | null = null;

  while (i < lines.length) {
    const m = LIST_LINE.exec(lines[i]!);
    if (!m) break;
    const indent = m[1]!.length;
    if (indent < minIndent) break;
    if (indent > minIndent) break; // deeper lines belong to a nested list
    const mark = m[2]!;
    const itemTag: 'ul' | 'ol' = /^\d+\./.test(mark) ? 'ol' : 'ul';
    if (tag === null) tag = itemTag;
    if (itemTag !== tag) break; // mixed marker ends the list
    const text = m[3]!;
    const item: ListItem = { value: parseInline(text), children: [] };
    i += 1;
    // Gather nested children at a deeper indent.
    if (i < lines.length) {
      const nm = LIST_LINE.exec(lines[i]!);
      if (nm && nm[1]!.length > minIndent) {
        const nested = parseList(lines, i, nm[1]!.length);
        item.children.push(...nested.block.items);
        i = nested.next;
      }
    }
    items.push(item);
  }

  return {
    block: { tag: tag ?? 'ul', items },
    next: i,
  };
}

function listItemToNode(item: ListItem, tag: 'ul' | 'ol'): LexicalNode {
  return {
    type: 'listitem',
    value: item.value,
    children: item.children.length ? [listItemsToListNode(item.children, tag)] : [],
    format: '',
    indent: 0,
    version: 1,
  };
}

function listItemsToListNode(items: ListItem[], tag: 'ul' | 'ol'): LexicalNode {
  return {
    type: 'list',
    tag,
    list: items.map((it) => listItemToNode(it, tag)),
    start: 1,
    format: '',
    indent: 0,
    direction: 'ltr',
    version: 1,
  };
}

export function markdownToLexical(md: string): LexicalDoc {
  const text = md.replace(/\r\n/g, '\n');
  const lines = text.split('\n');
  const children: LexicalNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i]!;

    // Blank line → skip (paragraph separator).
    if (line.trim() === '') {
      i += 1;
      continue;
    }

    // Heading.
    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      const tag = `h${heading[1]!.length}` as 'h1' | 'h2' | 'h3';
      children.push({
        type: 'heading',
        tag,
        children: parseInline(heading[2]!),
        direction: 'ltr',
        format: '',
        indent: 0,
        version: 1,
      });
      i += 1;
      continue;
    }

    // List.
    if (/^\s*([-*]|\d+\.)\s+/.test(line)) {
      const { block, next } = parseList(lines, i, 0);
      children.push(listItemsToListNode(block.items, block.tag));
      i = next;
      continue;
    }

    // Paragraph: gather consecutive non-blank, non-special lines.
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i]!.trim() !== '' &&
      !/^(#{1,3})\s+/.test(lines[i]!) &&
      !/^\s*([-*]|\d+\.)\s+/.test(lines[i]!)
    ) {
      paraLines.push(lines[i]!);
      i += 1;
    }
    const inline = parseInline(paraLines.join(' '));
    children.push({
      type: 'paragraph',
      children: inline,
      direction: 'ltr',
      format: '',
      indent: 0,
      textFormat: 0,
      version: 1,
    });
  }

  if (children.length === 0) {
    children.push({
      type: 'paragraph',
      children: [{ type: 'text', text: '', format: 0, version: 1 }],
      direction: 'ltr',
      format: '',
      indent: 0,
      textFormat: 0,
      version: 1,
    });
  }

  return { root: { type: 'root', children } };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run lib/__tests__/lexical-markdown.test.ts`
Expected: PASS (all 12 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/page-builder/lexical-markdown.ts lib/__tests__/lexical-markdown.test.ts
git commit -m "feat(page-builder): add markdownToLexical converter"
```

---

### Task 2: Lexical Markdown converter — `lexicalToMarkdown` (reverse + round-trip)

**Files:**
- Modify: `lib/page-builder/lexical-markdown.ts` (add `lexicalToMarkdown`)
- Test: append to `lib/__tests__/lexical-markdown.test.ts`

**Interfaces:**
- Consumes: `LexicalDoc`, `LexicalNode` from Task 1.
- Produces: `lexicalToMarkdown(doc: LexicalDoc | null | undefined): string`.

- [ ] **Step 1: Write the failing tests**

Append to `lib/__tests__/lexical-markdown.test.ts` (after the existing `markdownToLexical` describe block, still importing `lexicalToMarkdown` — update the import line):

Update the top import to:
```ts
import {
  markdownToLexical,
  lexicalToMarkdown,
  type LexicalDoc,
} from '@/lib/page-builder/lexical-markdown';
```

Append:

```ts
describe('lexicalToMarkdown', () => {
  it('should return empty string for null/undefined', () => {
    expect(lexicalToMarkdown(null)).toBe('');
    expect(lexicalToMarkdown(undefined)).toBe('');
  });

  it('should return empty string for a non-object value', () => {
    expect(lexicalToMarkdown('hello' as unknown as LexicalDoc)).toBe('');
  });

  it('should render a paragraph as plain text', () => {
    const doc = markdownToLexical('Hello world');
    expect(lexicalToMarkdown(doc)).toBe('Hello world');
  });

  it('should render bold/italic/code back to markdown', () => {
    expect(lexicalToMarkdown(markdownToLexical('**b** *i* `c`'))).toBe('**b** *i* `c`');
  });

  it('should render a link back to markdown', () => {
    expect(lexicalToMarkdown(markdownToLexical('[go](https://example.com)'))).toBe(
      '[go](https://example.com)',
    );
  });

  it('should render headings back to markdown', () => {
    expect(lexicalToMarkdown(markdownToLexical('# T'))).toBe('# T');
    expect(lexicalToMarkdown(markdownToLexical('## T'))).toBe('## T');
  });

  it('should render lists back to markdown', () => {
    expect(lexicalToMarkdown(markdownToLexical('- a\n- b'))).toBe('- a\n- b');
    expect(lexicalToMarkdown(markdownToLexical('1. a\n2. b'))).toBe('1. a\n2. b');
  });

  it('should fall back to text for unknown node types', () => {
    const doc: LexicalDoc = {
      root: {
        type: 'root',
        children: [
          {
            type: 'unknown-type',
            children: [{ type: 'text', text: 'fallback', format: 0, version: 1 }],
          } as unknown as LexicalDoc['root']['children'][number],
        ],
      },
    };
    // Must not throw; produces some text containing 'fallback'.
    expect(lexicalToMarkdown(doc)).toContain('fallback');
  });

  it('should round-trip a multi-paragraph markdown doc', () => {
    const md = '# Title\n\nFirst paragraph.\n\n- one\n- two';
    expect(lexicalToMarkdown(markdownToLexical(md))).toBe(md);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run lib/__tests__/lexical-markdown.test.ts`
Expected: FAIL — `lexicalToMarkdown is not a function` (import error).

- [ ] **Step 3: Write the implementation**

Append to `lib/page-builder/lexical-markdown.ts` (after `markdownToLexical`):

```ts
// --- Reverse: Lexical JSON -> Markdown -----------------------------------

type LexicalNodeLike = { type: string; [k: string]: unknown };

function asNodes(value: unknown): LexicalNodeLike[] {
  return Array.isArray(value) ? (value as LexicalNodeLike[]) : [];
}

function inlineNodeToMarkdown(node: LexicalNodeLike): string {
  if (node.type === 'text') {
    const format = typeof node.format === 'number' ? node.format : 0;
    let text = typeof node.text === 'string' ? node.text : '';
    if (format & IS_BOLD) text = `**${text}**`;
    if (format & IS_ITALIC) text = `*${text}*`;
    if (format & IS_CODE) text = `\`${text}\``;
    return text;
  }
  if (node.type === 'link') {
    const fields = (node.fields ?? {}) as { url?: string };
    const url = typeof fields.url === 'string' ? fields.url : '';
    const inner = asNodes(node.children).map(inlineNodeToMarkdown).join('');
    return `[${inner}](${url})`;
  }
  // Unknown inline: best-effort text extraction.
  return asNodes(node.children).map(inlineNodeToMarkdown).join('');
}

function inlineToMarkdown(children: unknown): string {
  return asNodes(children).map(inlineNodeToMarkdown).join('');
}

function listItemToMarkdown(item: LexicalNodeLike, ordered: boolean, depth: number, index: number): string[] {
  const indent = '  '.repeat(depth);
  const prefix = ordered ? `${index}. ` : '- ';
  const value = inlineToMarkdown(item.value);
  const lines = [`${indent}${prefix}${value}`];
  for (const child of asNodes(item.children)) {
    if (child.type === 'list') {
      const childOrdered = child.tag === 'ol';
      let n = 1;
      for (const sub of asNodes(child.list)) {
        lines.push(...listItemToMarkdown(sub, childOrdered, depth + 1, n));
        n += 1;
      }
    }
  }
  return lines;
}

export function lexicalToMarkdown(doc: LexicalDoc | null | undefined): string {
  if (!doc || typeof doc !== 'object') return '';
  const root = (doc as { root?: { children?: unknown } }).root;
  if (!root || typeof root !== 'object') return '';
  const blocks = asNodes((root as { children?: unknown }).children);

  const out: string[] = [];
  for (const block of blocks) {
    if (block.type === 'paragraph') {
      out.push(inlineToMarkdown(block.children));
    } else if (block.type === 'heading') {
      const tag = typeof block.tag === 'string' ? block.tag : 'h1';
      const hashes = '#'.repeat(Number(tag.slice(1)) || 1);
      out.push(`${hashes} ${inlineToMarkdown(block.children)}`);
    } else if (block.type === 'list') {
      const ordered = block.tag === 'ol';
      let n = 1;
      for (const item of asNodes(block.list)) {
        out.push(...listItemToMarkdown(item, ordered, 0, n));
        n += 1;
      }
    } else {
      // Unknown block: best-effort text extraction, never throw.
      out.push(inlineToMarkdown(block.children));
    }
  }

  return out.join('\n');
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run lib/__tests__/lexical-markdown.test.ts`
Expected: PASS (all tests).

- [ ] **Step 5: Commit**

```bash
git add lib/page-builder/lexical-markdown.ts lib/__tests__/lexical-markdown.test.ts
git commit -m "feat(page-builder): add lexicalToMarkdown reverse converter"
```

---

### Task 3: `RichTextField` client component

**Files:**
- Create: `components/page-builder/RichTextField.tsx`
- Test: `components/page-builder/__tests__/RichTextField.test.tsx`

**Interfaces:**
- Consumes: `markdownToLexical`, `lexicalToMarkdown`, `LexicalDoc` from `lib/page-builder/lexical-markdown.ts`.
- Produces: default export `RichTextField({ value, disabled, onChange })` where `onChange(v: unknown)` receives native Lexical JSON.

- [ ] **Step 1: Write the failing test**

Create `components/page-builder/__tests__/RichTextField.test.tsx`:

```tsx
/// <reference types="vitest" />
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import RichTextField from '@/components/page-builder/RichTextField';
import { markdownToLexical } from '@/lib/page-builder/lexical-markdown';

describe('RichTextField', () => {
  it('should seed the textarea from a stored Lexical value', () => {
    const doc = markdownToLexical('Existing text');
    render(<RichTextField value={doc} onChange={() => {}} />);
    expect(screen.getByRole('textbox')).toHaveValue('Existing text');
  });

  it('should seed empty when value is null', () => {
    render(<RichTextField value={null} onChange={() => {}} />);
    expect(screen.getByRole('textbox')).toHaveValue('');
  });

  it('should commit Lexical JSON on change', () => {
    const onChange = vi.fn();
    render(<RichTextField value={null} onChange={onChange} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '**bold**' } });
    expect(onChange).toHaveBeenCalled();
    const committed = onChange.mock.calls[0]![0];
    expect(committed).toHaveProperty('root.type', 'root');
  });

  it('should render a markdown hint', () => {
    render(<RichTextField value={null} onChange={() => {}} />);
    expect(screen.getByText(/Markdown/i)).toBeInTheDocument();
  });

  it('should disable the textarea when disabled', () => {
    render(<RichTextField value={null} disabled onChange={() => {}} />);
    expect(screen.getByRole('textbox')).toBeDisabled();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run components/page-builder/__tests__/RichTextField.test.tsx`
Expected: FAIL — cannot resolve `@/components/page-builder/RichTextField`.

- [ ] **Step 3: Write the implementation**

Create `components/page-builder/RichTextField.tsx`:

```tsx
// components/page-builder/RichTextField.tsx — Markdown textarea that round-trips
// through native Lexical JSON, so the stored value matches Payload's richText shape.
'use client';
import { useEffect, useRef, useState, type ReactElement } from 'react';
import {
  markdownToLexical,
  lexicalToMarkdown,
  type LexicalDoc,
} from '@/lib/page-builder/lexical-markdown';

type Props = {
  value: unknown;
  disabled?: boolean;
  onChange: (value: unknown) => void;
};

export default function RichTextField({ value, disabled, onChange }: Props): ReactElement {
  // Seed the textarea once from the stored Lexical JSON. Ref so we don't re-seed
  // on every external value change (the textarea is the source of truth while
  // editing, exactly like the plain text/textarea fields above).
  const seeded = useRef(false);
  const [md, setMd] = useState<string>(() => lexicalToMarkdown(value as LexicalDoc | null));

  useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;
    setMd(lexicalToMarkdown(value as LexicalDoc | null));
  }, [value]);

  return (
    <div className="flex flex-col gap-1">
      <textarea
        rows={5}
        className="rounded border border-warm-300 bg-warm-50 px-2 py-1 text-sm text-warm-900 dark:border-warm-700 dark:bg-warm-900 dark:text-warm-100"
        value={md}
        disabled={disabled}
        placeholder="Write the answer in Markdown…"
        onChange={(e) => {
          const next = e.target.value;
          setMd(next);
          onChange(markdownToLexical(next));
        }}
      />
      <span className="text-xs text-warm-400">
        Markdown — <strong>**bold**</strong>, <em>*italic*</em>, [link](url), - lists
      </span>
    </div>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run components/page-builder/__tests__/RichTextField.test.tsx`
Expected: PASS (all 5 tests).

- [ ] **Step 5: Commit**

```bash
git add components/page-builder/RichTextField.tsx components/page-builder/__tests__/RichTextField.test.tsx
git commit -m "feat(page-builder): add RichTextField markdown editor"
```

---

### Task 4: Wire `richText` into `FieldRenderer`

**Files:**
- Modify: `components/page-builder/FieldRenderer.tsx` (import + new case in the `Field` switch, around lines 481–490)
- Test: `components/page-builder/__tests__/FieldRenderer-richtext.test.tsx`

**Interfaces:**
- Consumes: `RichTextField` default export from Task 3.

- [ ] **Step 1: Write the failing test**

Create `components/page-builder/__tests__/FieldRenderer-richtext.test.tsx`:

```tsx
/// <reference types="vitest" />
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import FieldRenderer from '@/components/page-builder/FieldRenderer';
import type { BlockSchema } from '@/lib/page-builder/block-schemas';

const schema: BlockSchema = {
  slug: 'faq',
  label: 'FAQ',
  fields: [{ name: 'answer', type: 'richText' }],
};

describe('FieldRenderer richText', () => {
  it('should render a textarea (not the deferred placeholder) for a richText field', () => {
    render(<FieldRenderer schema={schema} values={{}} onChange={() => {}} />);
    expect(screen.queryByText(/editable in a later phase/i)).not.toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('should commit Lexical JSON through onChange', () => {
    const onChange = vi.fn();
    render(<FieldRenderer schema={schema} values={{}} onChange={onChange} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'hello' } });
    expect(onChange).toHaveBeenCalledWith('answer', expect.objectContaining({ root: expect.any(Object) }));
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run components/page-builder/__tests__/FieldRenderer-richtext.test.tsx`
Expected: FAIL — placeholder text is present / no textbox.

- [ ] **Step 3: Write the implementation**

In `components/page-builder/FieldRenderer.tsx`:

Add the import near the other component imports (after the `MediaPicker` import, line 8):
```tsx
import RichTextField from './RichTextField';
```

In the `Field` component's `control` switch, replace the `default` case's richText handling. Insert a new `case 'richText'` **before** the `default` case (i.e. before the current lines 481–490):

```tsx
      case 'richText':
        return (
          <RichTextField value={value} disabled={disabled} onChange={set} />
        );
```

The existing `default` case stays as-is for any other genuinely-unsupported types:
```tsx
      default:
        // richText handled in a later phase; show a placeholder badge.
        return (
          <span className="text-xs italic text-warm-400">
            {field.type} field — editable in a later phase
          </span>
        );
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run components/page-builder/__tests__/FieldRenderer-richtext.test.tsx`
Expected: PASS (both tests).

- [ ] **Step 5: Commit**

```bash
git add components/page-builder/FieldRenderer.tsx components/page-builder/__tests__/FieldRenderer-richtext.test.tsx
git commit -m "feat(page-builder): render richText fields with RichTextField"
```

---

### Task 5: Default value for new richText fields

**Files:**
- Modify: `lib/page-builder/default-block.ts:21` (add richText case to `defaultForField`)
- Test: `lib/__tests__/page-builder-blocks.test.ts` (append a case) — if this file exists and covers defaults; otherwise add to the lexical-markdown test or create `lib/__tests__/default-block.test.ts`.

- [ ] **Step 1: Confirm an existing test file for defaults**

Run: `ls lib/__tests__/ | grep -i "default\|blocks"`

If `lib/__tests__/page-builder-blocks.test.ts` exists and tests `createDefaultBlock`/`defaultForField`, append there. Otherwise create `lib/__tests__/default-block.test.ts`:

```ts
/// <reference types="vitest" />
import { describe, expect, it } from 'vitest';
import { defaultForField } from '@/lib/page-builder/default-block';
import type { FieldDescriptor } from '@/lib/page-builder/block-schemas';

describe('defaultForField richText', () => {
  it('should return null for a richText field', () => {
    const field: FieldDescriptor = { name: 'answer', type: 'richText' };
    expect(defaultForField(field)).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to confirm current behavior**

Run: `pnpm vitest run lib/__tests__/default-block.test.ts` (or the existing blocks test file)
Expected: PASS already — a `richText` field with no `defaultValue` falls through to the trailing `return null` in `defaultForField`. This task is a **regression guard + explicitness**: the test locks in `null` so a future refactor of the trailing return can't silently change richText's default. It is not red→green.

- [ ] **Step 3: Write the implementation**

In `lib/page-builder/default-block.ts`, in `defaultForField`, add the explicit richText case before the final `return null`:

```ts
  if (field.type === 'text' || field.type === 'textarea') return '';
  if (field.type === 'richText') return null;
  if (field.type === 'relationship') return field.hasMany ? [] : null;
  return null;
```

- [ ] **Step 4: Run the test to verify it still passes**

Run: `pnpm vitest run lib/__tests__/default-block.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/page-builder/default-block.ts lib/__tests__/default-block.test.ts
git commit -m "feat(page-builder): return null default for richText fields"
```

---

### Task 6: Full suite + typecheck

**Files:** none (verification only).

- [ ] **Step 1: Run the whole vitest suite**

Run: `pnpm vitest run`
Expected: all tests pass, including the existing page-builder tests (no regressions in `FieldRenderer-color`, `FieldRenderer-relationship`, `use-autosave`, `RelationshipPicker`, `BlockSlot`, `PreviewClient`).

- [ ] **Step 2: Typecheck**

Run: `pnpm tsc --noEmit` (or the project's typecheck script — check `package.json` scripts: `grep '"typecheck"\|"type-check"\|"lint"' package.json`; if none, run `pnpm exec tsc --noEmit`)
Expected: no type errors. If `tsc` reports errors only in unrelated files, note them but do not fix unrelated code (existing-code rule: separate refactoring from features).

- [ ] **Step 3: Final commit (if any test/format fixes were needed)**

Only if Steps 1–2 surfaced fixes:
```bash
git add -A
git commit -m "test(page-builder): fix suite after richText integration"
```
Otherwise skip — no empty commit.
