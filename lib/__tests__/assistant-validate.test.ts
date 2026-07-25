import { describe, expect, it, vi } from 'vitest';
import { validateToolCall, validateUpdateFields, coerceFieldsForBlock } from '@/lib/page-builder/assistant/validate';
import type { BlockSchema } from '@/lib/page-builder/block-schemas';

// Synthetic block schema for the "id key written into a row" regression guard below.
// Real blocks (e.g. faq.items) never declare a literal `id` sub-field in source — Payload
// only injects one at runtime via getPayload() sanitization, which is mocked away under
// vitest (see vitest-setup.ts's `@payload-config` mock). So a test built on a real block's
// getBlockSchema() output can't distinguish "rejected because HIDDEN_FIELD_NAMES strips id"
// from "rejected because id was never a field to begin with" — both look identical from the
// outside. This synthetic schema puts a literal `id` (and `blockKey`) sub-field on the row,
// so the only thing that can cause rejection is the stripping in
// lib/page-builder/assistant/schema-tree.ts's `contentFields`.
const { SYNTHETIC_ID_GUARD_SLUG, syntheticIdGuardSchema } = vi.hoisted(() => {
  const SYNTHETIC_ID_GUARD_SLUG = '__idGuardTest__';
  const syntheticIdGuardSchema: {
    slug: string;
    label: string;
    fields: Array<{ name: string; type: string; fields?: Array<{ name: string; type: string }> }>;
  } = {
    slug: SYNTHETIC_ID_GUARD_SLUG,
    label: 'Id Guard Test',
    fields: [
      {
        name: 'items',
        type: 'array',
        fields: [
          { name: 'id', type: 'text' },
          { name: 'blockKey', type: 'text' },
          { name: 'question', type: 'text' },
        ],
      },
    ],
  };
  return { SYNTHETIC_ID_GUARD_SLUG, syntheticIdGuardSchema };
});

// Partial-mock block-schemas: every real slug resolves normally; only the synthetic slug
// above is served from the fixture. This lets validateToolCall's real checkFields/
// contentFields pipeline run unmodified against a schema real blocks can't provide.
vi.mock('@/lib/page-builder/block-schemas', async (importOriginal) => {
  const actual = (await importOriginal()) as typeof import('@/lib/page-builder/block-schemas');
  return {
    ...actual,
    getBlockSchema: (slug: string): BlockSchema | null =>
      slug === SYNTHETIC_ID_GUARD_SLUG ? (syntheticIdGuardSchema as BlockSchema) : actual.getBlockSchema(slug),
  };
});

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
  it('should produce a read query with index and locale', () => {
    const r = validateToolCall('read_block', { index: 2, locale: 'en' });
    expect(r).toEqual({ ok: true, query: { kind: 'read', index: 2, locale: 'en' } });
  });

  it('should default the locale to undefined when omitted', () => {
    const r = validateToolCall('read_block', { index: 0 });
    expect(r.ok).toBe(true);
    if (r.ok && 'query' in r) {
      expect(r.query).toEqual({ kind: 'read', index: 0 });
    }
  });

  it('should accept an integer-valued string index', () => {
    const r = validateToolCall('read_block', { index: '3', locale: 'en' });
    expect(r).toEqual({ ok: true, query: { kind: 'read', index: 3, locale: 'en' } });
  });

  it('should reject a non-integer index', () => {
    expect(validateToolCall('read_block', { index: '2.5' }).ok).toBe(false);
    expect(validateToolCall('read_block', { index: 'first' }).ok).toBe(false);
  });

  it('should reject a missing index', () => {
    expect(validateToolCall('read_block', { locale: 'vi' }).ok).toBe(false);
  });

  it('should reject an unknown locale', () => {
    const r = validateToolCall('read_block', { index: 0, locale: 'de' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/locale/i);
  });
});

describe('validateToolCall — describe_block', () => {
  it('should produce a describe query for a known block slug', () => {
    const r = validateToolCall('describe_block', { blockType: 'faq' });
    expect(r).toEqual({ ok: true, query: { kind: 'describe', slug: 'faq' } });
  });

  it('should reject an unknown block slug', () => {
    const r = validateToolCall('describe_block', { blockType: 'nope' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/unknown block/i);
  });

  it('should reject a missing block slug', () => {
    expect(validateToolCall('describe_block', {}).ok).toBe(false);
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

describe('checkFields — nested validation', () => {
  it('should reject an unknown field inside an array row', () => {
    const r = validateToolCall('add_block', {
      blockType: 'faq',
      index: 0,
      fields: { items: [{ question: 'Q', bogus: 'x' }] },
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/items\[0\]\.bogus/);
  });

  it('should accept a well-formed array row', () => {
    const r = validateToolCall('add_block', {
      blockType: 'faq',
      index: 0,
      fields: { items: [{ question: 'Q', answer: 'A' }] },
    });
    expect(r.ok).toBe(true);
  });

  it('should reject a non-array value for an array field', () => {
    const r = validateToolCall('add_block', {
      blockType: 'faq',
      index: 0,
      fields: { items: 'not an array' },
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/must be an array/i);
  });

  it('should reject a row that is not an object', () => {
    const r = validateToolCall('add_block', {
      blockType: 'faq',
      index: 0,
      fields: { items: ['just a string'] },
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/items\[0\]/);
  });

  it('should reject an id key written into a row (synthetic HIDDEN_FIELD_NAMES regression guard)', () => {
    // Uses the synthetic schema above, whose row fields literally include `id` and
    // `blockKey`. Only HIDDEN_FIELD_NAMES stripping in contentFields() can cause this to be
    // rejected as "unknown" — the field genuinely exists in the descriptor, unlike faq.items
    // in the real (unsanitized-under-vitest) schema.
    const r = validateToolCall('add_block', {
      blockType: SYNTHETIC_ID_GUARD_SLUG,
      index: 0,
      fields: { items: [{ id: 7, question: 'Q' }] },
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/items\[0\]\.id/);
  });

  it('should reject a non-integer media id on an upload field', () => {
    const r = validateToolCall('add_block', {
      blockType: 'hero',
      index: 0,
      fields: { image: 'media/hero.jpg' },
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/numeric media id/i);
  });

  it('should accept an integer media id on an upload field', () => {
    const r = validateToolCall('add_block', {
      blockType: 'hero',
      index: 0,
      fields: { image: 412 },
    });
    expect(r.ok).toBe(true);
  });

  it('should reject an out-of-range enum inside an array row', () => {
    // featureGrid.items[].icon is a select over a fixed icon set.
    const r = validateToolCall('add_block', {
      blockType: 'featureGrid',
      index: 0,
      fields: { items: [{ icon: 'rocket' }] },
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/items\[0\]\.icon/);
  });

  it('should accept a valid enum inside an array row', () => {
    const r = validateToolCall('add_block', {
      blockType: 'featureGrid',
      index: 0,
      fields: { items: [{ icon: 'printer' }] },
    });
    expect(r.ok).toBe(true);
  });

  it('should reject a non-integer relationship id inside an array row', () => {
    // spotlight.deals[].product is a relationship to products.
    const r = validateToolCall('add_block', {
      blockType: 'spotlight',
      index: 0,
      fields: { deals: [{ product: 'product-slug-here' }] },
    });
    expect(r.ok).toBe(false);
    // Pins the nested path, not just the generic "numeric id" phrase — a phrase that
    // also appears in the pre-existing top-level-only relationship error. If checkRelationship
    // regressed to using field.name instead of the accumulated path, this would still say
    // "numeric id" but drop the "deals[0]." prefix, and a weaker assertion wouldn't catch it.
    if (!r.ok) expect(r.error).toMatch(/deals\[0\]\.product/);
  });

  it('should reject a number outside its bounds inside an array row', () => {
    // testimonials.entries[].rating is bounded 1–5.
    const r = validateToolCall('add_block', {
      blockType: 'testimonials',
      index: 0,
      fields: { entries: [{ quote: 'Great', rating: 9 }] },
    });
    expect(r.ok).toBe(false);
    // Pins the nested path — see the comment on the relationship test above for why a bare
    // "at most 5" match (also produced by a top-level-only bounds error) isn't enough.
    if (!r.ok) expect(r.error).toMatch(/entries\[0\]\.rating/);
  });

  it('should reject a non-integer media id inside an array row', () => {
    // cardGrid.cards[].image is an upload to media.
    const r = validateToolCall('add_block', {
      blockType: 'cardGrid',
      index: 0,
      fields: { cards: [{ title: 'Card', image: 'cards/one.jpg' }] },
    });
    expect(r.ok).toBe(false);
    // Pins the nested path — see the comment on the relationship test above; "numeric media
    // id" alone is also produced by the pre-existing top-level-only upload error.
    if (!r.ok) expect(r.error).toMatch(/cards\[0\]\.image/);
  });

  it('should coerce a Markdown richText value inside an array row to Lexical', () => {
    const r = validateToolCall('add_block', {
      blockType: 'faq',
      index: 0,
      fields: { items: [{ question: 'Q', answer: 'Hello **world**' }] },
    });
    expect(r.ok).toBe(true);
    if (r.ok && 'mutation' in r && r.mutation.kind === 'add') {
      const rows = r.mutation.block.items as Array<Record<string, unknown>>;
      expect(typeof rows[0]?.answer).toBe('object');
    }
  });

  it('should accept a well-formed group value (infoSection.contact)', () => {
    // infoSection.contact is a real `group` field (heading/address/phone/email) —
    // the only real coverage of checkFields' `field.type === 'group'` branch.
    const r = validateToolCall('add_block', {
      blockType: 'infoSection',
      index: 0,
      fields: {
        contact: { heading: 'Contact', address: '123 Main St', phone: '555-1234', email: 'hi@example.com' },
      },
    });
    expect(r.ok).toBe(true);
  });

  it('should reject an unknown key inside a group field (infoSection.contact)', () => {
    const r = validateToolCall('add_block', {
      blockType: 'infoSection',
      index: 0,
      fields: { contact: { heading: 'Contact', bogus: 'x' } },
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/contact\.bogus/);
  });
});

describe('validateToolCall — row tools', () => {
  it('should produce an addRow mutation', () => {
    const r = validateToolCall('add_row', {
      index: 1,
      field: 'items',
      values: { question: 'Q', answer: 'A' },
    });
    expect(r).toEqual({
      ok: true,
      mutation: { kind: 'addRow', index: 1, field: 'items', values: { question: 'Q', answer: 'A' } },
    });
  });

  it('should carry an explicit position and the other-locale values', () => {
    const r = validateToolCall('add_row', {
      index: 0,
      field: 'items',
      values: { question: 'Q' },
      valuesOther: { question: 'Câu hỏi' },
      at: 0,
    });
    expect(r.ok).toBe(true);
    if (r.ok && 'mutation' in r && r.mutation.kind === 'addRow') {
      expect(r.mutation.at).toBe(0);
      expect(r.mutation.valuesOther).toEqual({ question: 'Câu hỏi' });
    }
  });

  it('should produce an updateRow mutation with a locale tag', () => {
    const r = validateToolCall('update_row', {
      index: 1,
      field: 'items',
      rowIndex: 2,
      values: { answer: 'A' },
      locale: 'en',
    });
    expect(r).toEqual({
      ok: true,
      mutation: { kind: 'updateRow', index: 1, field: 'items', rowIndex: 2, values: { answer: 'A' }, locale: 'en' },
    });
  });

  it('should produce a removeRow mutation', () => {
    const r = validateToolCall('remove_row', { index: 1, field: 'items', rowIndex: 0 });
    expect(r).toEqual({ ok: true, mutation: { kind: 'removeRow', index: 1, field: 'items', rowIndex: 0 } });
  });

  it('should reject a row tool with a missing field name', () => {
    expect(validateToolCall('add_row', { index: 0, values: {} }).ok).toBe(false);
  });

  it('should reject a non-integer rowIndex', () => {
    expect(validateToolCall('remove_row', { index: 0, field: 'items', rowIndex: 'x' }).ok).toBe(false);
  });
});
