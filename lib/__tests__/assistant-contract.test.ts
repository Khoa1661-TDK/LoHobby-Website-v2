import { describe, expect, it } from 'vitest';
import { buildBlockIndex, buildAppearanceDoc, describeBlockSpec } from '@/lib/page-builder/assistant/contract';
import { getBlockSchemas, getBlockSchema } from '@/lib/page-builder/block-schemas';

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

describe('describeBlockSpec', () => {
  it('should expand array row shapes', () => {
    const spec = describeBlockSpec(getBlockSchema('faq')!);
    expect(spec).toContain('items: array of rows, each:');
    expect(spec).toContain('question');
    expect(spec).toContain('answer');
  });

  it('should list enum options and defaults', () => {
    const spec = describeBlockSpec(getBlockSchema('faq')!);
    expect(spec).toContain('accordion');
    expect(spec).toContain('twoCol');
    expect(spec).toContain('[default "accordion"]');
  });

  it('should surface admin descriptions', () => {
    const spec = describeBlockSpec(getBlockSchema('hero')!);
    expect(spec).toMatch(/headlineHighlight[\s\S]*match the headline/i);
  });

  it('should point upload fields at search_media', () => {
    const spec = describeBlockSpec(getBlockSchema('hero')!);
    expect(spec).toMatch(/image: numeric media id[\s\S]*search_media/);
  });

  it('should omit appearance fields and id', () => {
    const spec = describeBlockSpec(getBlockSchema('faq')!);
    expect(spec).not.toContain('backgroundCustomDark');
    expect(spec).not.toContain('blockKey');
  });

  it('should never leak an id or blockKey row field inside an array field (faq.items)', () => {
    // faq.items is an array with row sub-fields (question, answer) — the exact shape
    // Payload's getPayload() mutates in place by injecting an `id` field into. A bare
    // `.not.toMatch(/\bid\b/)` is unsafe here because describeBlockSpec renders prose
    // (e.g. relationship/upload field lines say "numeric id of a …", "search_media") that
    // legitimately contains the word "id". Anchor instead to how describeFieldLine actually
    // renders a field line — `${indent}${field.name}: ` at the start of a line — so this
    // only matches an actual "id" FIELD, never the word "id" inside a sentence.
    const spec = describeBlockSpec(getBlockSchema('faq')!);
    expect(spec).not.toMatch(/^\s+id:/m);
    expect(spec).not.toContain('blockKey');
  });
});
