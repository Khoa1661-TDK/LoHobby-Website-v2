// lib/__tests__/home-seed.test.ts
import { describe, expect, it } from 'vitest';
import { buildHomeSeedLayout } from '@/lib/page-builder/home-seed';

describe('buildHomeSeedLayout', () => {
  it('should produce a non-empty layout of valid block types', () => {
    const layout = buildHomeSeedLayout();
    expect(layout.length).toBeGreaterThan(0);
    const types = layout.map((b) => b.blockType);
    expect(types).toContain('hero');
    expect(types).toContain('featuredProducts');
  });
  it('should produce blocks that carry blockType (renderable)', () => {
    for (const block of buildHomeSeedLayout()) {
      expect(typeof block.blockType).toBe('string');
    }
  });
});