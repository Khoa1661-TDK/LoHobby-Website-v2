import { describe, expect, it } from 'vitest';
import { addRow, removeRow, moveRow, updateRowField } from '@/lib/page-builder/array-reducer';

const rows = [{ question: 'A', answer: 'a' }, { question: 'B', answer: 'b' }];

describe('array-reducer', () => {
  it('should add a row built from a template', () => {
    const next = addRow(rows, { question: '', answer: '' });
    expect(next).toHaveLength(3);
    expect(next[2]).toEqual({ question: '', answer: '' });
  });
  it('should remove a row immutably', () => {
    const next = removeRow(rows, 0);
    expect(next).toEqual([{ question: 'B', answer: 'b' }]);
    expect(rows).toHaveLength(2);
  });
  it('should move a row', () => {
    const next = moveRow(rows, 0, 1);
    expect(next.map((r) => r.question as string)).toEqual(['B', 'A']);
  });
  it('should update a sub-field on a row', () => {
    const next = updateRowField(rows, 1, 'question', 'Z');
    expect((next[1] as (typeof rows)[number]).question).toBe('Z');
    expect((rows[1] as (typeof rows)[number]).question).toBe('B');
  });
});