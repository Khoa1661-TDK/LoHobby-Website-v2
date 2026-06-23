import { describe, expect, it } from 'vitest';
import { getBlockSchemas } from '@/lib/page-builder/block-schemas';
import { createDefaultBlock } from '@/lib/page-builder/default-block';
import { stripBlockIds } from '@/lib/page-builder/strip-block-ids';
import { isExternalUrl, linkAttrs } from '@/lib/page-builder/link';
import { SOCIAL_PLATFORMS, socialPlatformLabel } from '@/lib/social-platforms';
import { hasSocialIcon } from '@/components/social/SocialIcon';
import type { PageBlock } from '@/lib/page-builder';

const asRecord = (block: PageBlock | undefined): Record<string, unknown> =>
  block as unknown as Record<string, unknown>;

const fieldNames = (slug: string): string[] => {
  const schema = getBlockSchemas().find((s) => s.slug === slug);
  return (schema?.fields ?? []).map((f) => f.name);
};

describe('new page-builder block schemas', () => {
  it('should register button, text and socialBar blocks', () => {
    const slugs = getBlockSchemas().map((s) => s.slug);
    expect(slugs).toEqual(expect.arrayContaining(['button', 'text', 'socialBar']));
  });

  it('should expose link fields on the button block', () => {
    expect(fieldNames('button')).toEqual(
      expect.arrayContaining(['label', 'url', 'openInNewTab', 'style', 'align']),
    );
  });

  it('should expose heading, body, style and an optional link on the text block', () => {
    expect(fieldNames('text')).toEqual(
      expect.arrayContaining(['heading', 'body', 'textAlign', 'size', 'url', 'openInNewTab']),
    );
  });

  it('should expose a platform/url item array on the socialBar block', () => {
    const schema = getBlockSchemas().find((s) => s.slug === 'socialBar');
    const items = schema?.fields.find((f) => f.name === 'items');
    expect(items?.type).toBe('array');
    expect((items?.fields ?? []).map((f) => f.name)).toEqual(['platform', 'url']);
  });

  it('should expose an optional href on gallery images', () => {
    const schema = getBlockSchemas().find((s) => s.slug === 'gallery');
    const images = schema?.fields.find((f) => f.name === 'images');
    expect((images?.fields ?? []).map((f) => f.name)).toContain('href');
  });
});

describe('section-library block schemas', () => {
  it('should register all eight new presentational blocks', () => {
    const slugs = getBlockSchemas().map((s) => s.slug);
    expect(slugs).toEqual(
      expect.arrayContaining([
        'spacer',
        'columns',
        'callToAction',
        'stats',
        'quote',
        'cardGrid',
        'banner',
        'steps',
      ]),
    );
  });

  it('should expose a height select with five options on spacer', () => {
    const schema = getBlockSchemas().find((s) => s.slug === 'spacer');
    const height = schema?.fields.find((f) => f.name === 'height');
    expect(height?.type).toBe('select');
    expect((height?.options ?? []).map((o) => o.value)).toEqual(['xs', 'sm', 'md', 'lg', 'xl']);
    expect(height?.defaultValue).toBe('md');
  });

  it('should expose a column array with link fields on columns', () => {
    const schema = getBlockSchemas().find((s) => s.slug === 'columns');
    const columns = schema?.fields.find((f) => f.name === 'columns');
    expect(columns?.type).toBe('array');
    expect((columns?.fields ?? []).map((f) => f.name)).toEqual([
      'heading',
      'body',
      'image',
      'url',
      'openInNewTab',
    ]);
  });

  it('should require the quote text on the quote block', () => {
    const schema = getBlockSchemas().find((s) => s.slug === 'quote');
    const quote = schema?.fields.find((f) => f.name === 'quote');
    expect(quote).toMatchObject({ type: 'textarea', required: true });
  });

  it('should expose two button links on callToAction', () => {
    expect(fieldNames('callToAction')).toEqual(
      expect.arrayContaining([
        'primaryLabel',
        'primaryUrl',
        'primaryOpenInNewTab',
        'secondaryLabel',
        'secondaryUrl',
        'align',
      ]),
    );
  });

  it('should require text on the banner block', () => {
    const schema = getBlockSchemas().find((s) => s.slug === 'banner');
    const text = schema?.fields.find((f) => f.name === 'text');
    expect(text).toMatchObject({ type: 'text', required: true });
  });
});

describe('link support added to visual blocks (Part B)', () => {
  it('should expose url + openInNewTab on the imageWithText block', () => {
    expect(fieldNames('imageWithText')).toEqual(
      expect.arrayContaining(['image', 'url', 'openInNewTab']),
    );
  });

  it('should expose url + openInNewTab on the promoBanner block', () => {
    expect(fieldNames('promoBanner')).toEqual(
      expect.arrayContaining(['text', 'url', 'openInNewTab']),
    );
  });
});

describe('createDefaultBlock for new blocks', () => {
  it('should default a button to its schema values', () => {
    const block = asRecord(createDefaultBlock('button') ?? undefined);
    expect(block.blockType).toBe('button');
    expect(block.label).toBe('');
    expect(block.openInNewTab).toBe(false);
    expect(block.style).toBe('primary');
  });

  it('should default a socialBar with an empty items array', () => {
    const block = asRecord(createDefaultBlock('socialBar') ?? undefined);
    expect(block.blockType).toBe('socialBar');
    expect(block.items).toEqual([]);
    expect(block.iconStyle).toBe('solid');
  });
});

describe('stripBlockIds with a socialBar block', () => {
  it('should strip block and nested row ids while keeping values', () => {
    const layout = [
      {
        id: 'b1',
        blockType: 'socialBar',
        items: [
          { id: 'r1', platform: 'discord', url: 'https://discord.gg/x' },
          { id: 'r2', platform: 'x', url: 'https://x.com/y' },
        ],
      },
    ] as unknown as PageBlock[];

    const out = stripBlockIds(layout, getBlockSchemas());
    const items = asRecord(out[0]).items as Record<string, unknown>[];

    expect(asRecord(out[0]).id).toBeUndefined();
    expect(items[0]?.id).toBeUndefined();
    expect(items[0]?.platform).toBe('discord');
    expect(items[1]?.url).toBe('https://x.com/y');
  });
});

describe('link helpers', () => {
  it('should treat absolute http(s) urls as external', () => {
    expect(isExternalUrl('https://example.com')).toBe(true);
    expect(isExternalUrl('http://example.com')).toBe(true);
    expect(isExternalUrl('/search')).toBe(false);
  });

  it('should open external urls in a new tab with safe rel', () => {
    expect(linkAttrs('https://example.com')).toEqual({
      target: '_blank',
      rel: 'noopener noreferrer',
    });
  });

  it('should not add target/rel for internal links unless requested', () => {
    expect(linkAttrs('/search')).toEqual({});
    expect(linkAttrs('/search', true)).toEqual({ target: '_blank', rel: 'noopener noreferrer' });
  });
});

describe('social icons', () => {
  it('should have an icon defined for every registered platform', () => {
    for (const { value } of SOCIAL_PLATFORMS) {
      expect(hasSocialIcon(value)).toBe(true);
    }
  });

  it('should report no icon for an unknown platform', () => {
    expect(hasSocialIcon('myspace')).toBe(false);
  });

  it('should resolve a human label for a platform value', () => {
    expect(socialPlatformLabel('x')).toBe('X (Twitter)');
    expect(socialPlatformLabel('unknown')).toBe('unknown');
  });
});
