import { describe, it, expect } from 'vitest';
import { slugifyVietnamese } from '../slugify';

describe('slugifyVietnamese', () => {
  it('strips Vietnamese diacritics', () => {
    expect(slugifyVietnamese('Hà Nội')).toBe('ha-noi');
    expect(slugifyVietnamese('Việt Nam')).toBe('viet-nam');
    expect(slugifyVietnamese('Đà Nẵng')).toBe('da-nang');
  });

  it('converts đ to d', () => {
    expect(slugifyVietnamese('đ')).toBe('d');
    expect(slugifyVietnamese('Đ')).toBe('d');
  });

  it('collapses punctuation to single hyphens', () => {
    expect(slugifyVietnamese('hello   world')).toBe('hello-world');
    expect(slugifyVietnamese('foo-bar!baz')).toBe('foo-bar-baz');
    expect(slugifyVietnamese('a...b')).toBe('a-b');
  });

  it('trims leading and trailing hyphens', () => {
    expect(slugifyVietnamese('  hello  ')).toBe('hello');
    expect(slugifyVietnamese('-hello-')).toBe('hello');
    expect(slugifyVietnamese('---')).toBe('');
  });
});
