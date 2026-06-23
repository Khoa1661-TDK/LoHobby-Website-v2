import { describe, it, expect } from 'vitest';
import { parsePreviewBlockParam } from '../parse';

describe('parsePreviewBlockParam', () => {
  it('should parse a valid block JSON param', () => {
    const raw = JSON.stringify({ blockType: 'featuredProducts', title: 'New' });
    expect(parsePreviewBlockParam(raw)).toEqual({ blockType: 'featuredProducts', title: 'New' });
  });

  it('should return null for an undefined or empty param', () => {
    expect(parsePreviewBlockParam(undefined)).toBeNull();
    expect(parsePreviewBlockParam('')).toBeNull();
  });

  it('should return null for invalid JSON', () => {
    expect(parsePreviewBlockParam('{not json')).toBeNull();
  });

  it('should return null when the parsed value lacks a string blockType', () => {
    expect(parsePreviewBlockParam(JSON.stringify({ title: 'x' }))).toBeNull();
    expect(parsePreviewBlockParam(JSON.stringify({ blockType: 5 }))).toBeNull();
    expect(parsePreviewBlockParam(JSON.stringify(['array']))).toBeNull();
  });
});
