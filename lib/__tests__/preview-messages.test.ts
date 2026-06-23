import { describe, it, expect } from 'vitest';
import {
  ready,
  select,
  highlight,
  setLayout,
  setTheme,
  isPreviewToParent,
  isParentToPreview,
} from '@/lib/page-builder/preview-messages';
import type { PageBlock } from '@/lib/page-builder';

describe('preview-messages protocol', () => {
  it('should build a select message carrying the block index', () => {
    expect(select(3)).toEqual({ source: 'pb', type: 'select', index: 3 });
  });

  it('should build a highlight message allowing null to clear selection', () => {
    expect(highlight(null)).toEqual({ source: 'pb', type: 'highlight', index: null });
  });

  it('should accept its own factory output as valid messages', () => {
    expect(isPreviewToParent(ready())).toBe(true);
    expect(isPreviewToParent(select(0))).toBe(true);
    expect(isParentToPreview(highlight(1))).toBe(true);
    expect(isParentToPreview(setLayout([]))).toBe(true);
  });

  it('should reject foreign or malformed messages', () => {
    expect(isPreviewToParent({ type: 'select', index: 1 })).toBe(false); // missing source
    expect(isPreviewToParent({ source: 'pb', type: 'select' })).toBe(false); // missing index
    expect(isPreviewToParent('hello')).toBe(false);
    expect(isParentToPreview({ source: 'pb', type: 'bogus' })).toBe(false);
    expect(isParentToPreview(null)).toBe(false);
  });

  it('should not cross-accept directions', () => {
    expect(isParentToPreview(select(0))).toBe(false);
    expect(isPreviewToParent(setLayout([]))).toBe(false);
  });
});

describe('setLayout preview message', () => {
  const blocks: PageBlock[] = [{ blockType: 'text', content: 'hi' } as PageBlock];

  it('should build a typed setLayout message carrying the blocks', () => {
    expect(setLayout(blocks)).toEqual({ source: 'pb', type: 'setLayout', blocks });
  });

  it('should accept a valid setLayout message in the parent->preview guard', () => {
    expect(isParentToPreview(setLayout(blocks))).toBe(true);
  });

  it('should reject a setLayout message whose blocks is not an array', () => {
    expect(isParentToPreview({ source: 'pb', type: 'setLayout', blocks: 'nope' })).toBe(false);
  });
});

describe('setTheme preview message', () => {
  it('should build a typed setTheme message', () => {
    expect(setTheme('dark')).toEqual({ source: 'pb', type: 'setTheme', mode: 'dark' });
  });

  it('should accept a valid setTheme message in the guard', () => {
    expect(isParentToPreview(setTheme('light'))).toBe(true);
  });

  it('should reject a setTheme message with an invalid mode', () => {
    expect(isParentToPreview({ source: 'pb', type: 'setTheme', mode: 'blue' })).toBe(false);
  });
});
