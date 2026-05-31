import { describe, expect, it } from 'vitest';
import { darkenHex, normalizeHexColor } from '@/lib/color-utils';

describe('color-utils', () => {
  it('normalizes hex without hash', () => {
    expect(normalizeHexColor('2563eb', '#000000')).toBe('#2563eb');
  });

  it('darkens hex colors', () => {
    expect(darkenHex('#ffffff', 50)).toBe('#808080');
  });
});
