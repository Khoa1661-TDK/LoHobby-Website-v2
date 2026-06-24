// scripts/__tests__/seed-demo-sale.test.ts
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { applyDemoSale } from '@/scripts/seed-demo-sale';

const catalog = [
  { handle: 'a-keychain', title: 'A Keychain' },
  { handle: 'b-model', title: 'B Model' },
];

const mockFind = vi.fn();
const mockUpdate = vi.fn();

beforeEach(() => {
  mockFind.mockReset();
  mockUpdate.mockReset();
  mockUpdate.mockResolvedValue({ id: 1 });
});

describe('applyDemoSale', () => {
  it('should set onSale and salePercent on a resolved product', async () => {
    mockFind.mockResolvedValue({ docs: [{ id: 5, title: 'A Keychain' }] });

    const result = await applyDemoSale({ find: mockFind, update: mockUpdate } as never, catalog, [
      { handle: 'a-keychain', salePercent: 20 },
    ]);

    expect(result.updated).toBe(1);
    expect(result.missing).toEqual([]);
    const arg = mockUpdate.mock.calls[0]?.[0];
    expect(arg.collection).toBe('products');
    expect(arg.id).toBe(5);
    expect(arg.data).toEqual({ onSale: true, salePercent: 20 });
  });

  it('should report a pick whose handle is not in the catalog as missing', async () => {
    const result = await applyDemoSale({ find: mockFind, update: mockUpdate } as never, catalog, [
      { handle: 'nope', salePercent: 10 },
    ]);

    expect(result.updated).toBe(0);
    expect(result.missing).toEqual(['nope']);
    expect(mockFind).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('should report a known handle with no matching product as missing', async () => {
    mockFind.mockResolvedValue({ docs: [] });

    const result = await applyDemoSale({ find: mockFind, update: mockUpdate } as never, catalog, [
      { handle: 'b-model', salePercent: 15 },
    ]);

    expect(result.updated).toBe(0);
    expect(result.missing).toEqual(['b-model']);
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
