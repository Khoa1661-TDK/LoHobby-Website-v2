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
        value: { text: seg.text },
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
      const lines: string[] = [];
      for (const item of asNodes(block.list)) {
        lines.push(...listItemToMarkdown(item, ordered, 0, n));
        n += 1;
      }
      out.push(lines.join('\n'));
    } else {
      // Unknown block: best-effort text extraction, never throw.
      out.push(inlineToMarkdown(block.children));
    }
  }

  return out.join('\n\n');
}