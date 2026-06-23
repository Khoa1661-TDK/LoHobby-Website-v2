import { describe, it, expect } from 'vitest';
import { parsePreviewBlockBody } from '../parse';

describe('parsePreviewBlockBody', () => {
  it('should parse a valid body with a known locale and a block', () => {
    const result = parsePreviewBlockBody({
      locale: 'en',
      block: { blockType: 'featuredProducts', title: 'New' },
    });
    expect(result).toEqual({
      locale: 'en',
      block: { blockType: 'featuredProducts', title: 'New' },
    });
  });

  it('should return null when data is not an object', () => {
    expect(parsePreviewBlockBody(null)).toBeNull();
    expect(parsePreviewBlockBody('nope')).toBeNull();
    expect(parsePreviewBlockBody(42)).toBeNull();
  });

  it('should return null when locale is not in the allowlist', () => {
    expect(
      parsePreviewBlockBody({ locale: 'fr', block: { blockType: 'hero' } }),
    ).toBeNull();
  });

  it('should return null when locale is missing or not a string', () => {
    expect(parsePreviewBlockBody({ block: { blockType: 'hero' } })).toBeNull();
    expect(
      parsePreviewBlockBody({ locale: 1, block: { blockType: 'hero' } }),
    ).toBeNull();
  });

  it('should return null when block is missing or not an object', () => {
    expect(parsePreviewBlockBody({ locale: 'vi' })).toBeNull();
    expect(parsePreviewBlockBody({ locale: 'vi', block: 'hero' })).toBeNull();
  });

  it('should return null when block has no string blockType', () => {
    expect(parsePreviewBlockBody({ locale: 'vi', block: {} })).toBeNull();
    expect(
      parsePreviewBlockBody({ locale: 'vi', block: { blockType: 7 } }),
    ).toBeNull();
  });
});
