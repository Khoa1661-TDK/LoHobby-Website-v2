import { describe, expect, it } from 'vitest';
import {
  activeColorSlot,
  THEMED_COLOR_BASES,
  THEMED_DARK_SLOTS,
} from '@/lib/page-builder/themed-color';

describe('themed-color helper', () => {
  it('should return the base field name in light mode', () => {
    expect(activeColorSlot('backgroundCustom', 'light')).toBe('backgroundCustom');
  });

  it('should return the Dark-suffixed field name in dark mode', () => {
    expect(activeColorSlot('backgroundCustom', 'dark')).toBe('backgroundCustomDark');
  });

  it('should register backgroundCustom as a themed base and its Dark slot', () => {
    expect(THEMED_COLOR_BASES.has('backgroundCustom')).toBe(true);
    expect(THEMED_DARK_SLOTS.has('backgroundCustomDark')).toBe(true);
  });
});
