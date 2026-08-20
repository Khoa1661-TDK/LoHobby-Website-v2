// lib/__tests__/console-categories.test.ts
import { describe, it, expect } from 'vitest';
import type { Category } from '@/src/payload/payload-types';
import { toCategoryRows } from '@/lib/console/categories';

function makeCategory(id: number, title: string): Category {
  return { id, title, updatedAt: '', createdAt: '' } as Category;
}

describe('toCategoryRows', () => {
  it('should pair each category with its product count', () => {
    const rows = toCategoryRows(
      [makeCategory(1, 'Mô hình'), makeCategory(2, 'Móc khóa')],
      new Map([
        [1, 27],
        [2, 14],
      ]),
    );
    expect(rows).toEqual([
      { id: '1', name: 'Mô hình', count: 27, child: false },
      { id: '2', name: 'Móc khóa', count: 14, child: false },
    ]);
  });

  it('should report zero for a category with no products', () => {
    const rows = toCategoryRows([makeCategory(1, 'Mô hình')], new Map());
    expect(rows[0]?.count).toBe(0);
  });

  it('should render a placeholder name when the title is empty', () => {
    const rows = toCategoryRows([makeCategory(1, '')], new Map());
    expect(rows[0]?.name).toBe('Chưa đặt tên');
  });

  it('should return an empty list when there are no categories', () => {
    expect(toCategoryRows([], new Map())).toEqual([]);
  });
});
