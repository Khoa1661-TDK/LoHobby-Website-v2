// lib/page-builder/assistant/markdown-lite.ts — a tiny, self-contained renderer for the
// small Markdown subset the assistant's replies use: **bold**, *italic*, "- " bullet
// lists, and line breaks. Deliberately not a general Markdown parser and deliberately
// NOT dangerouslySetInnerHTML — it builds React elements directly via createElement, so
// any literal HTML in the model's reply (e.g. "<img onerror=...>") ends up as plain text
// content of a React node and is escaped by React the same way any other string child is.
import { createElement, Fragment, type ReactNode } from 'react';

/** Parse inline **bold** / *italic* runs within a single line of text into React nodes.
 * Plain text segments are returned as-is (React escapes string children automatically). */
function parseInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /\*\*([^*]+)\*\*|\*([^*]+)\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let i = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    if (match[1] !== undefined) {
      nodes.push(createElement('strong', { key: `${keyPrefix}-b-${i++}` }, match[1]));
    } else if (match[2] !== undefined) {
      nodes.push(createElement('em', { key: `${keyPrefix}-i-${i++}` }, match[2]));
    }
    lastIndex = pattern.lastIndex;
  }
  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }
  return nodes;
}

/** Render a small Markdown subset (bold, italic, "- " bullet lists, line breaks) as React
 * nodes. Consecutive "- " lines are grouped into a single <ul>; every other non-empty line
 * becomes its own paragraph, which is what gives plain line breaks their visual separation. */
export function renderMarkdownLite(input: string): ReactNode {
  const lines = input.split('\n');
  const blocks: ReactNode[] = [];
  let listItems: string[] = [];
  let key = 0;

  function flushList(): void {
    if (listItems.length === 0) return;
    const items = listItems;
    listItems = [];
    blocks.push(
      createElement(
        'ul',
        { key: `ul-${key++}`, className: 'list-disc space-y-0.5 pl-4' },
        items.map((item, i) => createElement('li', { key: i }, parseInline(item, `li-${key}-${i}`))),
      ),
    );
  }

  for (const line of lines) {
    const bulletMatch = /^\s*-\s+(.*)$/.exec(line);
    if (bulletMatch) {
      listItems.push(bulletMatch[1] ?? '');
      continue;
    }
    flushList();
    if (line.trim().length === 0) {
      // Blank line between paragraphs — a bit of vertical space, no content.
      blocks.push(createElement('div', { key: `sp-${key++}`, className: 'h-1' }));
      continue;
    }
    blocks.push(createElement('p', { key: `p-${key++}` }, parseInline(line, `p-${key}`)));
  }
  flushList();

  return createElement(Fragment, null, ...blocks);
}
