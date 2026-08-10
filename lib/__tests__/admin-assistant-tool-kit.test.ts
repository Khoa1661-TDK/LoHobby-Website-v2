import { describe, expect, it } from 'vitest';
import { asInt, asStr, fail, ok, optInt } from '@/lib/admin-assistant/tool-kit';

describe('ok', () => {
  it('should carry content and no emit by default', () => {
    expect(ok('hello')).toEqual({ content: 'hello' });
  });

  it('should carry an emit payload when given', () => {
    expect(ok('hi', { kind: 'link' })).toEqual({ content: 'hi', emit: { kind: 'link' } });
  });

  it('should serialize a non-string body as json', () => {
    expect(ok([{ id: 1 }])).toEqual({ content: '[{"id":1}]' });
  });
});

describe('fail', () => {
  it('should prefix ERROR so the model can self-correct', () => {
    expect(fail('no such order')).toEqual({ content: 'ERROR: no such order' });
  });
});

describe('asStr', () => {
  it('should read and trim a string argument', () => {
    expect(asStr({ q: '  hi  ' }, 'q')).toBe('hi');
  });

  it('should return an empty string for a missing or non-string value', () => {
    expect(asStr({}, 'q')).toBe('');
    expect(asStr({ q: 5 }, 'q')).toBe('');
  });
});

describe('asInt', () => {
  it('should read an integer', () => {
    expect(asInt({ id: 7 }, 'id')).toBe(7);
  });

  it('should parse a numeric string', () => {
    expect(asInt({ id: '7' }, 'id')).toBe(7);
  });

  it('should return null for anything else', () => {
    expect(asInt({ id: 'abc' }, 'id')).toBeNull();
    expect(asInt({ id: 1.5 }, 'id')).toBeNull();
    expect(asInt({}, 'id')).toBeNull();
  });
});

describe('optInt', () => {
  it('should clamp to the given bounds', () => {
    expect(optInt({ limit: 999 }, 'limit', 10, 25)).toBe(25);
    expect(optInt({ limit: 0 }, 'limit', 10, 25)).toBe(10);
  });

  it('should fall back to the default when absent', () => {
    expect(optInt({}, 'limit', 10, 25)).toBe(10);
  });
});
