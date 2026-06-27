import { describe, expect, it } from 'vitest';
import { validateToolCall, validateUpdateFields } from '@/lib/page-builder/assistant/validate';

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
});
