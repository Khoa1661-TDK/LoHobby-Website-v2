import { describe, expect, it } from 'vitest';
import { buildBlockIndex, buildAppearanceDoc } from '@/lib/page-builder/assistant/contract';
import { getBlockSchemas } from '@/lib/page-builder/block-schemas';

const schemas = getBlockSchemas();

describe('buildBlockIndex', () => {
  it('should list every registered block slug', () => {
    const index = buildBlockIndex(schemas);
    for (const s of schemas) {
      expect(index).toContain(s.slug);
    }
  });

  it('should mark array fields with a bracket suffix', () => {
    const index = buildBlockIndex(schemas);
    const faqLine = index.split('\n').find((l) => l.trim().startsWith('faq '));
    expect(faqLine).toContain('items[]');
  });

  it('should collapse the shared appearance group to a single marker', () => {
    const index = buildBlockIndex(schemas);
    const faqLine = index.split('\n').find((l) => l.trim().startsWith('faq '));
    expect(faqLine).toContain('+appearance');
    expect(faqLine).not.toContain('backgroundCustomDark');
  });

  it('should never expose id or blockKey', () => {
    const index = buildBlockIndex(schemas);
    expect(index).not.toContain('blockKey');
    // Match "id" as a complete word (not as a substring in "width", "hidden", "grid", "solid", "video")
    // to catch leaked field names in the comma-separated field list
    expect(index).not.toMatch(/\bid\b/);
  });

  it('should stay well under the full contract size', () => {
    expect(buildBlockIndex(schemas).length).toBeLessThan(12000);
  });
});

describe('buildAppearanceDoc', () => {
  it('should document the appearance options once, with their enum values', () => {
    const doc = buildAppearanceDoc(schemas);
    expect(doc).toContain('background');
    expect(doc).toContain('containerWidth');
    expect(doc).toContain('scrollAnimation');
  });

  it('should state the condition gating custom background', () => {
    const doc = buildAppearanceDoc(schemas);
    expect(doc).toMatch(/backgroundCustom[\s\S]*background="custom"/);
  });

  it('should never expose id or blockKey', () => {
    const doc = buildAppearanceDoc(schemas);
    expect(doc).not.toContain('blockKey');
    // Match "id" as a complete word in the field descriptor lines (e.g., "  id: type")
    expect(doc).not.toMatch(/\bid\b/);
  });
});
