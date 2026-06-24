/// <reference types="vitest" />
import { describe, expect, it } from 'vitest';
import {
  markdownToLexical,
  lexicalToMarkdown,
  type LexicalDoc,
} from '@/lib/page-builder/lexical-markdown';

function children(doc: LexicalDoc) {
  return doc.root.children as { type: string; [k: string]: unknown }[];
}

describe('markdownToLexical', () => {
  it('should return a single empty paragraph for empty input', () => {
    const doc = markdownToLexical('');
    expect(doc.root.type).toBe('root');
    expect(children(doc)).toHaveLength(1);
    expect(children(doc)[0]!.type).toBe('paragraph');
  });

  it('should render a plain line as a paragraph', () => {
    const doc = markdownToLexical('Hello world');
    expect(children(doc)[0]!.type).toBe('paragraph');
  });

  it('should render # as a heading with tag h1', () => {
    const doc = markdownToLexical('# Title');
    const node = children(doc)[0]!;
    expect(node.type).toBe('heading');
    expect(node.tag).toBe('h1');
  });

  it('should render ## and ### as h2 and h3', () => {
    expect(children(markdownToLexical('## Sub'))[0]!.tag).toBe('h2');
    expect(children(markdownToLexical('### Sub'))[0]!.tag).toBe('h3');
  });

  it('should split paragraphs on blank lines', () => {
    const doc = markdownToLexical('First\n\nSecond');
    expect(children(doc).filter((n) => n.type === 'paragraph')).toHaveLength(2);
  });

  it('should parse **bold** into a text node with bold format', () => {
    const doc = markdownToLexical('**hi**');
    const para = children(doc)[0] as unknown as { children: { format: number; text: string }[] };
    expect(para.children[0]!.text).toBe('hi');
    expect(para.children[0]!.format & 1).toBe(1); // IS_BOLD bit
  });

  it('should parse *italic* into a text node with italic format', () => {
    const doc = markdownToLexical('*hi*');
    const para = children(doc)[0] as unknown as { children: { format: number; text: string }[] };
    expect(para.children[0]!.text).toBe('hi');
    expect(para.children[0]!.format & 2).toBe(2); // IS_ITALIC bit
  });

  it('should parse `code` into a text node with code format', () => {
    const doc = markdownToLexical('`hi`');
    const para = children(doc)[0] as unknown as { children: { format: number; text: string }[] };
    expect(para.children[0]!.text).toBe('hi');
    expect(para.children[0]!.format & 16).toBe(16); // IS_CODE bit
  });

  it('should parse [text](url) into a link node', () => {
    const doc = markdownToLexical('[go](https://example.com)');
    const para = children(doc)[0]! as unknown as {
      children: { type: string; fields?: { url: string }; children?: { text: string }[] }[];
    };
    const link = para.children[0]!;
    expect(link.type).toBe('link');
    expect(link.fields?.url).toBe('https://example.com');
    const textChild = link.children?.[0];
    expect(textChild?.text).toBe('go');
  });

  it('should parse - and * bullets into an unordered list', () => {
    const doc = markdownToLexical('- a\n- b');
    const list = children(doc)[0]!;
    expect(list.type).toBe('list');
    expect(list.tag).toBe('ul');
    expect((list as unknown as { list: unknown[] }).list).toHaveLength(2);
  });

  it('should parse 1. items into an ordered list', () => {
    const doc = markdownToLexical('1. a\n2. b');
    const list = children(doc)[0]!;
    expect(list.type).toBe('list');
    expect(list.tag).toBe('ol');
  });

  it('should support nested unordered lists under two-space indent', () => {
    const doc = markdownToLexical('- a\n  - b');
    const list = children(doc)[0] as unknown as {
      list: { children: { type: string; children?: unknown[] }[] }[];
    };
    const outerItem = list.list[0]!;
    const nested = outerItem.children?.find((c) => (c as { type: string }).type === 'list');
    expect(nested).toBeDefined();
    expect((nested as { type: string }).type).toBe('list');
  });

  // Nested lists do NOT round-trip to the exact original indent (depth is
  // reconstructed, not the original spacing) — only assert flat-list round-trip.
});

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
