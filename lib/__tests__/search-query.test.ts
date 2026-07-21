import { describe, expect, it } from 'vitest';
import {
  buildProductSearchWhere,
  deaccentText,
  tokenizeSearchQuery,
} from '@/lib/search-query';

describe('deaccentText', () => {
  it('should strip Vietnamese tone and vowel marks when given accented text', () => {
    expect(deaccentText('mô hình')).toBe('mo hinh');
    expect(deaccentText('móc khóa')).toBe('moc khoa');
  });

  it('should fold d-stroke to d when given the Vietnamese letter đ', () => {
    // đ (U+0111) is a distinct letter, not a combining mark, so NFD does not
    // decompose it. Without this the query "do choi" cannot reach "đồ chơi".
    expect(deaccentText('đồ chơi')).toBe('do choi');
    expect(deaccentText('Đồ')).toBe('Do');
  });

  it('should leave unaccented text unchanged when there is nothing to strip', () => {
    expect(deaccentText('cheems bonk')).toBe('cheems bonk');
  });

  it('should return an empty string when given an empty string', () => {
    expect(deaccentText('')).toBe('');
  });
});

describe('tokenizeSearchQuery', () => {
  it('should split on whitespace and lowercase when given a multi-word query', () => {
    expect(tokenizeSearchQuery('Mo Hinh')).toEqual(['mo', 'hinh']);
  });

  it('should treat hyphens and underscores as separators when given a slug-like query', () => {
    expect(tokenizeSearchQuery('mo-hinh_cheems')).toEqual(['mo', 'hinh', 'cheems']);
  });

  it('should collapse repeated separators when given padded input', () => {
    expect(tokenizeSearchQuery('  mo   hinh  ')).toEqual(['mo', 'hinh']);
  });

  it('should return an empty array when given only separators', () => {
    expect(tokenizeSearchQuery('   ---  ')).toEqual([]);
  });
});

describe('buildProductSearchWhere', () => {
  it('should match everything when given an undefined query', () => {
    expect(buildProductSearchWhere(undefined)).toEqual({});
  });

  it('should match everything when given a whitespace-only query', () => {
    expect(buildProductSearchWhere('   ')).toEqual({});
  });

  it('should require every token when given a multi-word query', () => {
    const where = buildProductSearchWhere('mo hinh');
    expect(where.and).toHaveLength(2);
  });

  it('should offer title, description and slug alternatives for an unaccented token', () => {
    const where = buildProductSearchWhere('mo');
    expect(where.and?.[0]).toEqual({
      or: [
        { title: { contains: 'mo' } },
        { description: { contains: 'mo' } },
        { slug: { contains: 'mo' } },
      ],
    });
  });

  it('should add a deaccented slug alternative when the token carries diacritics', () => {
    const where = buildProductSearchWhere('hình');
    expect(where.and?.[0]).toEqual({
      or: [
        { title: { contains: 'hình' } },
        { description: { contains: 'hình' } },
        { slug: { contains: 'hình' } },
        { slug: { contains: 'hinh' } },
      ],
    });
  });

  it('should produce an order-independent filter when given reordered tokens', () => {
    // "cheems bonk" and "bonk cheems" must yield the same set of AND clauses,
    // just permuted -- this is what fixes word-order sensitivity.
    const forward = buildProductSearchWhere('cheems bonk').and;
    const reverse = buildProductSearchWhere('bonk cheems').and;
    expect(forward).toEqual(expect.arrayContaining(reverse ?? []));
    expect(reverse).toEqual(expect.arrayContaining(forward ?? []));
  });
});
