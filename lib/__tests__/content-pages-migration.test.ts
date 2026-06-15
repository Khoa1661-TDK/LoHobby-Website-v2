// lib/__tests__/content-pages-migration.test.ts
import { describe, expect, it } from 'vitest';
import {
  plainTextToLexical,
  mapContentBlock,
  mapContentPageToPageData,
} from '@/lib/content-pages-migration';

describe('plainTextToLexical', () => {
  it('should wrap a single line in one paragraph node', () => {
    const state = plainTextToLexical('Hello world');
    expect(state.root.children).toHaveLength(1);
    expect(state.root.children[0]?.children[0]?.text).toBe('Hello world');
  });

  it('should split newlines into separate paragraphs', () => {
    const state = plainTextToLexical('line one\nline two');
    expect(state.root.children).toHaveLength(2);
    expect(state.root.children[1]?.children[0]?.text).toBe('line two');
  });

  it('should produce one empty paragraph for empty input', () => {
    const state = plainTextToLexical('');
    expect(state.root.children).toHaveLength(1);
    expect(state.root.children[0]?.children[0]?.text).toBe('');
  });
});

describe('mapContentBlock', () => {
  it('should map a hero block field-for-field', () => {
    const result = mapContentBlock({
      blockType: 'hero',
      headline: 'Big news',
      subheadline: 'sub',
      ctaLabel: 'Shop',
      ctaHref: '/shop',
      image: 7,
    });
    expect(result).toEqual({
      blockType: 'hero',
      headline: 'Big news',
      subheadline: 'sub',
      ctaLabel: 'Shop',
      ctaHref: '/shop',
      image: 7,
    });
  });

  it('should map richText plain content into a Lexical richText block', () => {
    const result = mapContentBlock({ blockType: 'richText', content: 'paragraph' }) as {
      blockType: string;
      content: { root: { children: unknown[] } };
    };
    expect(result.blockType).toBe('richText');
    expect(result.content.root.children).toHaveLength(1);
  });

  it('should map a cta block to a promoBanner block', () => {
    const result = mapContentBlock({
      blockType: 'cta',
      title: 'Sale',
      body: '20% off',
      buttonLabel: 'Buy',
      buttonHref: '/buy',
    });
    expect(result).toEqual({
      blockType: 'promoBanner',
      text: 'Sale — 20% off',
      ctaLabel: 'Buy',
      ctaHref: '/buy',
    });
  });

  it('should return null for an unknown block type', () => {
    expect(mapContentBlock({ blockType: 'mystery' })).toBeNull();
  });
});

describe('mapContentPageToPageData', () => {
  it('should map title, slug, published state and layout', () => {
    const result = mapContentPageToPageData({
      title: 'About',
      slug: 'about',
      published: true,
      layout: [{ blockType: 'richText', content: 'hi' }],
    });
    expect(result.title).toBe('About');
    expect(result.slug).toBe('about');
    expect(result.status).toBe('published');
    expect(result.layout).toHaveLength(1);
  });

  it('should map unpublished pages to draft status', () => {
    const result = mapContentPageToPageData({ title: 'X', slug: 'x', published: false, layout: [] });
    expect(result.status).toBe('draft');
  });

  it('should drop unmappable blocks from the layout', () => {
    const result = mapContentPageToPageData({
      title: 'X',
      slug: 'x',
      published: false,
      layout: [{ blockType: 'mystery' }, { blockType: 'richText', content: 'ok' }],
    });
    expect(result.layout).toHaveLength(1);
  });
});
