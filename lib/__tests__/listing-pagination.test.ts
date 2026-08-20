import { describe, expect, it } from 'vitest';
import { paginateList } from '@/lib/listing-pagination';

describe('paginateList', () => {
  it('should return the first page when pageParam is undefined', () => {
    const items = ['a', 'b', 'c', 'd', 'e'];
    const result = paginateList(items, undefined, 2);
    expect(result.currentPage).toBe(1);
    expect(result.page).toEqual(['a', 'b']);
    expect(result.totalPages).toBe(3);
  });

  it('should return the first page when pageParam is an empty string', () => {
    const items = ['a', 'b', 'c', 'd'];
    const result = paginateList(items, '', 2);
    expect(result.currentPage).toBe(1);
    expect(result.page).toEqual(['a', 'b']);
  });

  it('should return the requested page when given a valid numeric string', () => {
    const items = ['a', 'b', 'c', 'd', 'e', 'f'];
    const result = paginateList(items, '2', 2);
    expect(result.currentPage).toBe(2);
    expect(result.page).toEqual(['c', 'd']);
  });

  it('should take the first element when pageParam is an array', () => {
    const items = ['a', 'b', 'c', 'd', 'e', 'f'];
    const result = paginateList(items, ['2', '3'], 2);
    expect(result.currentPage).toBe(2);
    expect(result.page).toEqual(['c', 'd']);
  });

  it('should fall back to page 1 for a non-numeric string', () => {
    const items = ['a', 'b', 'c', 'd'];
    const result = paginateList(items, 'abc', 2);
    expect(result.currentPage).toBe(1);
    expect(result.page).toEqual(['a', 'b']);
  });

  it('should fall back to page 1 for zero or negative page numbers', () => {
    const items = ['a', 'b', 'c', 'd'];
    const result0 = paginateList(items, '0', 2);
    expect(result0.currentPage).toBe(1);

    const resultNeg = paginateList(items, '-3', 2);
    expect(resultNeg.currentPage).toBe(1);
  });

  it('should clamp to the last page when requested page is beyond the end', () => {
    const items = ['a', 'b', 'c', 'd', 'e'];
    const result = paginateList(items, '99', 2);
    expect(result.currentPage).toBe(result.totalPages);
    expect(result.page).toEqual(['e']);
  });

  it('should return totalPages 1 and currentPage 1 and empty page for an empty items array', () => {
    const items: string[] = [];
    const result = paginateList(items, '1', 2);
    expect(result.totalPages).toBe(1);
    expect(result.currentPage).toBe(1);
    expect(result.page).toEqual([]);
  });

  it('should compute totalPages with a partial final page', () => {
    const items = ['a', 'b', 'c', 'd', 'e'];
    const result = paginateList(items, '1', 2);
    expect(result.totalPages).toBe(3);
    expect(result.page.length).toBe(2);

    const result3 = paginateList(items, '3', 2);
    expect(result3.page).toEqual(['e']);
    expect(result3.page.length).toBe(1);
  });

  it('should fall back to PAGE_SIZE (24) when pageSize is 0 or negative', () => {
    const items = Array.from({ length: 30 }, (_, i) => `item${i}`);
    const resultZero = paginateList(items, '1', 0);
    expect(resultZero.totalPages).toBe(2);
    expect(resultZero.page.length).toBe(24);

    const resultNeg = paginateList(items, '1', -5);
    expect(resultNeg.totalPages).toBe(2);
    expect(resultNeg.page.length).toBe(24);
  });

  it('should default to PAGE_SIZE (24) when pageSize argument is omitted', () => {
    const items = Array.from({ length: 30 }, (_, i) => `item${i}`);
    const result = paginateList(items, '1');
    expect(result.totalPages).toBe(2);
    expect(result.page.length).toBe(24);
  });
});
