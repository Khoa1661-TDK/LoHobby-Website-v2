import { describe, expect, it } from 'vitest';
import { collectTranslatable, applyTranslations } from '@/lib/page-builder/mirror/translatable';
import type { BlockSchema } from '@/lib/page-builder/block-schemas';
import type { KeyedBlock } from '@/lib/page-builder/mirror/reconcile';

const faqSchema: BlockSchema = {
  slug: 'faq',
  label: 'FAQ',
  fields: [
    { name: 'title', type: 'text' },
    { name: 'blockKey', type: 'text' },
    { name: 'background', type: 'select', options: [] },
    { name: 'backgroundCustom', type: 'text' },
    {
      name: 'items',
      type: 'array',
      fields: [
        { name: 'question', type: 'text' },
        { name: 'answer', type: 'richText' },
        { name: 'url', type: 'text' },
      ],
    },
  ],
};

describe('collectTranslatable', () => {
  it('should collect top-level text fields, excluding blockKey and color hex', () => {
    const block = { blockType: 'faq', title: 'Questions', blockKey: 'k1', backgroundCustom: '#fff' } as KeyedBlock;
    const entries = collectTranslatable(block, faqSchema);
    const paths = entries.map((e) => e.path);
    expect(paths).toContain('title');
    expect(paths).not.toContain('blockKey');
    expect(paths).not.toContain('backgroundCustom');
  });

  it('should recurse into array rows with indexed paths', () => {
    const block = {
      blockType: 'faq',
      items: [
        { question: 'q1', url: 'https://x' },
        { question: 'q2', url: 'https://y' },
      ],
    } as KeyedBlock;
    const entries = collectTranslatable(block, faqSchema);
    const map = Object.fromEntries(entries.map((e) => [e.path, e.value]));
    expect(map['items.0.question']).toBe('q1');
    expect(map['items.1.question']).toBe('q2');
    // url is denied; richText answer is skipped.
    expect(Object.keys(map).some((p) => p.endsWith('.url'))).toBe(false);
    expect(Object.keys(map).some((p) => p.endsWith('.answer'))).toBe(false);
  });

  it('should skip empty/whitespace-only strings', () => {
    const block = { blockType: 'faq', title: '   ', items: [] } as KeyedBlock;
    expect(collectTranslatable(block, faqSchema)).toEqual([]);
  });

  it('should return no entries when the schema is null', () => {
    const block = { blockType: 'mystery', title: 'x' } as unknown as KeyedBlock;
    expect(collectTranslatable(block, null)).toEqual([]);
  });
});

describe('applyTranslations', () => {
  it('should write translated values back at top-level and array paths without mutating input', () => {
    const block = {
      blockType: 'faq',
      title: 'Questions',
      items: [{ question: 'q1' }, { question: 'q2' }],
    } as KeyedBlock;
    const before = structuredClone(block);
    const out = applyTranslations(block, { title: 'Preguntas', 'items.0.question': 'q1-tr' });
    const outRecord = out as unknown as Record<string, unknown>;
    expect(outRecord.title).toBe('Preguntas');
    const items = outRecord.items as unknown as Record<string, unknown>[];
    expect(items[0]!.question).toBe('q1-tr');
    // Untouched array row preserved.
    expect(items[1]!.question).toBe('q2');
    // Input not mutated.
    expect(block).toEqual(before);
  });
});
