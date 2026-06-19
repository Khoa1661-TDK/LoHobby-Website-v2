import { describe, it, expect } from 'vitest';
import {
  ready,
  select,
  highlight,
  refresh,
  isPreviewToParent,
  isParentToPreview,
} from '@/lib/page-builder/preview-messages';

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
    expect(isParentToPreview(refresh())).toBe(true);
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
    expect(isPreviewToParent(refresh())).toBe(false);
  });
});
