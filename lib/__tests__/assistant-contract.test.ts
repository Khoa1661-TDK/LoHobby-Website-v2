import { describe, expect, it } from 'vitest';
import { buildBlockIndex, buildAppearanceDoc, describeBlockSpec } from '@/lib/page-builder/assistant/contract';
import { getBlockSchemas, getBlockSchema } from '@/lib/page-builder/block-schemas';
import type { BlockSchema } from '@/lib/page-builder/block-schemas';

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

  it('should never leak an id or blockKey row field inside an array field', () => {
    // Under vitest, `@payload-config` is mocked to `{}` (lib/__tests__/vitest-setup.ts), so
    // getPayload() never actually runs — and it's getPayload() that mutates Payload's shared
    // Block definitions to inject an `id` field into every array at runtime. That means
    // getBlockSchema('faq') here returns the raw FAQ source fields, which never had an `id`
    // sub-field to begin with: there is nothing for contentFields to strip, so asserting
    // against it can't tell an intact HIDDEN_FIELD_NAMES from a broken one.
    //
    // To actually exercise the guard, build a synthetic BlockSchema whose array row shape
    // carries `id` and `blockKey` literally, the way getPayload() would produce it in
    // production. A bare `.not.toMatch(/\bid\b/)` would still be unsafe here because
    // describeBlockSpec renders prose (e.g. relationship/upload field lines say "numeric id
    // of a …", "search_media") that legitimately contains the word "id". Anchor instead to
    // how describeFieldLine actually renders a field line — `${indent}${field.name}: ` at the
    // start of a line — so this only matches an actual "id" FIELD, never the word "id" inside
    // a sentence.
    const syntheticSchema: BlockSchema = {
      slug: 'synthetic',
      label: 'Synthetic',
      fields: [
        {
          name: 'items',
          type: 'array',
          fields: [
            { name: 'id', type: 'text' },
            { name: 'blockKey', type: 'text' },
            { name: 'question', type: 'text' },
            { name: 'answer', type: 'text' },
          ],
        },
      ],
    };
    const spec = describeBlockSpec(syntheticSchema);
    expect(spec).not.toMatch(/^\s+id:/m);
    expect(spec).not.toContain('blockKey');
    // Sanity: the row's real content fields must still be present — proves the array wasn't
    // stripped wholesale (which would make the assertions above pass for the wrong reason).
    expect(spec).toContain('question');
    expect(spec).toContain('answer');
  });

  it('smoke test: describeBlockSpec on a real block (faq) omits id/blockKey too', () => {
    // Not the id-leak guard (see above) — getBlockSchema('faq') under vitest has no `id`
    // sub-field to strip in the first place, since getPayload() (which injects it at
    // runtime) is mocked out. This just confirms describeBlockSpec runs cleanly end-to-end
    // against a real registered block.
    const spec = describeBlockSpec(getBlockSchema('faq')!);
    expect(spec).not.toMatch(/^\s+id:/m);
    expect(spec).not.toContain('blockKey');
  });
});
