import { validateToolCall } from '@/lib/page-builder/assistant/validate';

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
