// lib/__tests__/preview.test.ts
import { describe, expect, it, afterEach } from 'vitest';
import { isValidPreviewToken } from '@/lib/preview';

const original = process.env.PREVIEW_SECRET;
afterEach(() => {
  process.env.PREVIEW_SECRET = original;
});

describe('isValidPreviewToken', () => {
  it('should accept a token equal to PREVIEW_SECRET', () => {
    process.env.PREVIEW_SECRET = 'topsecret';
    expect(isValidPreviewToken('topsecret')).toBe(true);
  });

  it('should reject a wrong token', () => {
    process.env.PREVIEW_SECRET = 'topsecret';
    expect(isValidPreviewToken('nope')).toBe(false);
  });

  it('should reject a null/empty token', () => {
    process.env.PREVIEW_SECRET = 'topsecret';
    expect(isValidPreviewToken(null)).toBe(false);
    expect(isValidPreviewToken('')).toBe(false);
  });

  it('should reject any token when PREVIEW_SECRET is unset', () => {
    delete process.env.PREVIEW_SECRET;
    expect(isValidPreviewToken('anything')).toBe(false);
  });
});
