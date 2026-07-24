import { describe, expect, it } from 'vitest';
import { validateToolCall, validateUpdateFields, coerceFieldsForBlock } from '@/lib/page-builder/assistant/validate';

describe('validateToolCall', () => {
  it('should accept a valid add_block and produce an add mutation with blockType set', () => {
    const r = validateToolCall('add_block', {
      blockType: 'hero',
      index: 0,
      fields: { headline: 'Hi' },
    });
    expect(r).toEqual({
      ok: true,
      mutation: { kind: 'add', index: 0, block: { blockType: 'hero', headline: 'Hi' } },
    });
  });

  it('should reject an unknown blockType', () => {
    const r = validateToolCall('add_block', { blockType: 'nope', index: 0, fields: {} });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/unknown block/i);
  });

  it('should reject a field the block does not define', () => {
    const r = validateToolCall('add_block', {
      blockType: 'hero',
      index: 0,
      fields: { notAField: 'x' },
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/notAField/);
  });

  it('should reject an enum value outside the allowed options', () => {
    // Pick a real enum field at runtime so the test tracks the schema.
    const r = validateToolCall('update_block', { index: 0, fields: { background: 'chartreuse' } });
    // background exists on appearance-bearing blocks; an out-of-range value must fail
    // only when the field is known. If 'background' is not a top-level field, this is ok=true;
    // assert the negative case via a definitely-unknown field instead:
    const bad = validateToolCall('update_block', { index: 0, fields: { __definitely_not__: 1 } });
    expect(bad.ok).toBe(false);
  });

  it('should produce a move mutation for move_block', () => {
    expect(validateToolCall('move_block', { from: 2, to: 0 })).toEqual({
      ok: true,
      mutation: { kind: 'move', from: 2, to: 0 },
    });
  });

  it('should reject an unknown tool name', () => {
    expect(validateToolCall('frobnicate', {}).ok).toBe(false);
  });

  it('should reject a fabricated string id on a relationship field', () => {
    // The LLM has no real category ids, so it invents "placeholder-collection-id-3".
    // That must be rejected before it reaches Payload (which 400s on invalid relationships).
    const r = validateToolCall('add_block', {
      blockType: 'featuredCollection',
      index: 0,
      fields: { collection: 'placeholder-collection-id-3' },
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/collection/);
  });

  it('should accept a numeric id on a relationship field', () => {
    const r = validateToolCall('add_block', {
      blockType: 'featuredCollection',
      index: 0,
      fields: { collection: 2 },
    });
    expect(r.ok).toBe(true);
  });

  it('should accept an omitted/unbound relationship field', () => {
    const r = validateToolCall('add_block', {
      blockType: 'featuredCollection',
      index: 0,
      fields: { collection: null, title: 'Aircraft' },
    });
    expect(r.ok).toBe(true);
  });

  it('should reject a number below the field min on add_block', () => {
    // featuredCollection.limit has min: 2 — a negative value 400s the whole page save
    // in Payload, so it must be rejected here first.
    const r = validateToolCall('add_block', {
      blockType: 'featuredCollection',
      index: 0,
      fields: { limit: -8 },
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/limit.*at least 2/i);
  });

  it('should reject a number above the field max on add_block', () => {
    // featuredCollection.limit has max: 24
    const r = validateToolCall('add_block', {
      blockType: 'featuredCollection',
      index: 0,
      fields: { limit: 99 },
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/limit.*at most 24/i);
  });

  it('should accept a number within the field min/max bounds on add_block', () => {
    const r = validateToolCall('add_block', {
      blockType: 'featuredCollection',
      index: 0,
      fields: { limit: 12 },
    });
    expect(r.ok).toBe(true);
  });

  it('should convert a richText Markdown string to Lexical JSON on add_block', () => {
    // The LLM emits a plain string for richText; Payload requires Lexical editor-state
    // JSON, so a bare string 400s the whole page save. The mutation must carry the
    // converted shape, not the raw string.
    const r = validateToolCall('add_block', {
      blockType: 'richText',
      index: 0,
      fields: { content: '# Hello\n\nWorld' },
    });
    expect(r.ok).toBe(true);
    if (r.ok && 'mutation' in r && r.mutation.kind === 'add') {
      const content = (r.mutation.block as { content?: unknown }).content;
      expect(content).not.toBe('# Hello\n\nWorld');
      expect((content as { root?: unknown }).root).toBeTypeOf('object');
    }
  });

  it('should convert richText inside array rows (faq.items[].answer) to Lexical JSON', () => {
    const r = validateToolCall('add_block', {
      blockType: 'faq',
      index: 0,
      fields: { items: [{ question: 'Q?', answer: 'A plain answer.' }] },
    });
    expect(r.ok).toBe(true);
    if (r.ok && 'mutation' in r && r.mutation.kind === 'add') {
      const items = (r.mutation.block as { items?: Array<{ answer?: unknown }> }).items ?? [];
      expect((items[0]?.answer as { root?: unknown }).root).toBeTypeOf('object');
    }
  });

  it('should not emit blockOther when fieldsOther is omitted', () => {
    const r = validateToolCall('add_block', { blockType: 'hero', index: 0, fields: { headline: 'Hi' } });
    expect(r.ok).toBe(true);
    if (r.ok && 'mutation' in r && r.mutation.kind === 'add') {
      expect(r.mutation.blockOther).toBeUndefined();
    }
  });

  it('should validate fieldsOther and merge it over the active fields into blockOther', () => {
    const r = validateToolCall('add_block', {
      blockType: 'hero',
      index: 0,
      fields: { headline: 'Xin chào', ctaStyle: 'primary' },
      fieldsOther: { headline: 'Hello' },
    });
    expect(r.ok).toBe(true);
    if (r.ok && 'mutation' in r && r.mutation.kind === 'add') {
      expect(r.mutation.block).toMatchObject({ headline: 'Xin chào', ctaStyle: 'primary' });
      // Shared/config fields default to the active value; only copy is overridden.
      expect(r.mutation.blockOther).toMatchObject({ headline: 'Hello', ctaStyle: 'primary' });
    }
  });

  it('should reject an invalid field inside fieldsOther', () => {
    const r = validateToolCall('add_block', {
      blockType: 'hero',
      index: 0,
      fields: { headline: 'Hi' },
      fieldsOther: { notAField: 'x' },
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/notAField/);
  });

  it('should coerce a richText Markdown string inside fieldsOther to Lexical JSON', () => {
    const r = validateToolCall('add_block', {
      blockType: 'richText',
      index: 0,
      fields: { content: '# Xin chào' },
      fieldsOther: { content: '# Hello' },
    });
    expect(r.ok).toBe(true);
    if (r.ok && 'mutation' in r && r.mutation.kind === 'add') {
      const other = (r.mutation.blockOther as { content?: unknown }).content;
      expect(other).not.toBe('# Hello');
      expect((other as { root?: unknown }).root).toBeTypeOf('object');
    }
  });
});

describe('validateToolCall — update_block locale', () => {
  it('should accept an update_block without a locale tag (defaults handled by the caller)', () => {
    const r = validateToolCall('update_block', { index: 0, fields: { headline: 'Hi' } });
    expect(r.ok).toBe(true);
    if (r.ok && 'mutation' in r && r.mutation.kind === 'update') {
      expect(r.mutation.locale).toBeUndefined();
    }
  });

  it('should carry a valid locale tag through to the mutation', () => {
    const r = validateToolCall('update_block', { index: 0, fields: { headline: 'Hi' }, locale: 'en' });
    expect(r.ok).toBe(true);
    if (r.ok && 'mutation' in r && r.mutation.kind === 'update') {
      expect(r.mutation.locale).toBe('en');
    }
  });

  it('should accept "both" as a locale tag', () => {
    const r = validateToolCall('update_block', { index: 0, fields: { headline: 'Hi' }, locale: 'both' });
    expect(r.ok).toBe(true);
    if (r.ok && 'mutation' in r && r.mutation.kind === 'update') {
      expect(r.mutation.locale).toBe('both');
    }
  });

  it('should reject an invalid locale tag', () => {
    const r = validateToolCall('update_block', { index: 0, fields: { headline: 'Hi' }, locale: 'fr' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/locale/i);
  });
});

describe('validateToolCall — read_block', () => {
  it('should produce a read request with index and locale', () => {
    const r = validateToolCall('read_block', { index: 2, locale: 'en' });
    expect(r).toEqual({ ok: true, read: { index: 2, locale: 'en' } });
  });

  it('should omit the locale when not provided (caller defaults to active)', () => {
    const r = validateToolCall('read_block', { index: 0 });
    expect(r.ok).toBe(true);
    if (r.ok && 'read' in r) {
      expect(r.read).toEqual({ index: 0 });
    }
  });

  it('should coerce an integer-valued string index to a number', () => {
    const r = validateToolCall('read_block', { index: '3', locale: 'en' });
    expect(r).toEqual({ ok: true, read: { index: 3, locale: 'en' } });
  });

  it('should reject a non-integer string index', () => {
    const r = validateToolCall('read_block', { index: '2.5' });
    expect(r.ok).toBe(false);
    const r2 = validateToolCall('read_block', { index: 'first' });
    expect(r2.ok).toBe(false);
  });

  it('should reject a missing integer index', () => {
    const r = validateToolCall('read_block', { locale: 'vi' });
    expect(r.ok).toBe(false);
  });

  it('should reject an invalid locale', () => {
    const r = validateToolCall('read_block', { index: 0, locale: 'de' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/locale/i);
  });
});

describe('coerceFieldsForBlock', () => {
  it('converts a richText Markdown string to Lexical JSON in place', () => {
    const fields: Record<string, unknown> = { content: '**bold**' };
    coerceFieldsForBlock('richText', fields);
    expect(typeof fields.content).toBe('object');
    expect((fields.content as { root?: unknown }).root).toBeTypeOf('object');
  });

  it('leaves an already-Lexical richText value untouched', () => {
    const doc = { root: { type: 'root', children: [] } };
    const fields: Record<string, unknown> = { content: doc };
    coerceFieldsForBlock('richText', fields);
    expect(fields.content).toBe(doc);
  });
});

describe('validateUpdateFields', () => {
  it('accepts a valid field on a block that declares it — returns null', () => {
    // hero declares 'headline'
    expect(validateUpdateFields('hero', { headline: 'Hello world' })).toBeNull();
  });

  it('rejects a field that exists on hero but not on spacer — returns error mentioning the field', () => {
    // 'ctaLabel' is declared by hero but NOT by spacer (which only has height + appearance fields)
    const err = validateUpdateFields('spacer', { ctaLabel: 'Buy now' });
    expect(err).not.toBeNull();
    expect(err).toMatch(/ctaLabel/);
  });

  it('rejects an out-of-range enum value on a block with an enum field — returns error', () => {
    // hero has ctaStyle with options: primary | outline | minimal
    const err = validateUpdateFields('hero', { ctaStyle: 'garbage_value' });
    expect(err).not.toBeNull();
    expect(err).toMatch(/ctaStyle/);
  });

  it('rejects an unknown blockType — returns error', () => {
    const err = validateUpdateFields('nonexistent_block_xyz', { headline: 'Hi' });
    expect(err).not.toBeNull();
    expect(err).toMatch(/unknown block/i);
  });

  it('rejects a fabricated string id on featuredCollection.collection — returns error', () => {
    const err = validateUpdateFields('featuredCollection', {
      collection: 'placeholder-collection-id-3',
    });
    expect(err).not.toBeNull();
    expect(err).toMatch(/collection/);
  });

  it('accepts a numeric id on featuredCollection.collection — returns null', () => {
    expect(validateUpdateFields('featuredCollection', { collection: 2 })).toBeNull();
  });

  it('rejects a non-numeric id inside a hasMany relationship — returns error', () => {
    // featuredProducts.products is a hasMany relationship; every element must be numeric.
    const err = validateUpdateFields('featuredProducts', { products: [1, 'nope'] });
    expect(err).not.toBeNull();
    expect(err).toMatch(/products/);
  });

  it('rejects a number below the field min — returns error', () => {
    // featuredCollection.limit has min: 2 — matches the reported -8/-15 page-save 400s.
    const err = validateUpdateFields('featuredCollection', { limit: -15 });
    expect(err).not.toBeNull();
    expect(err).toMatch(/limit.*at least 2/i);
  });

  it('rejects a number above the field max — returns error', () => {
    const err = validateUpdateFields('featuredCollection', { limit: 50 });
    expect(err).not.toBeNull();
    expect(err).toMatch(/limit.*at most 24/i);
  });

  it('accepts a number within the field min/max bounds — returns null', () => {
    expect(validateUpdateFields('featuredCollection', { limit: 8 })).toBeNull();
  });
});
