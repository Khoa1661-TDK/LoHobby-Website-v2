// scripts/__tests__/seed-deals-page.test.ts
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/lib/page-builder/deals-seed', () => ({ buildDealsSeedLayout: () => [] }));

import { ensureDealsPage } from '@/scripts/seed-deals-page';

const mockFind = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();

// Two find() calls per run: first resolves the `sale` page, second the on-sale category.
function mockFinds(pageDocs: unknown[], categoryDocs: unknown[]): void {
  mockFind
    .mockResolvedValueOnce({ docs: pageDocs })
    .mockResolvedValueOnce({ docs: categoryDocs });
}

beforeEach(() => {
  mockFind.mockReset();
  mockCreate.mockReset();
  mockUpdate.mockReset();
});

describe('ensureDealsPage', () => {
  it('should create a published sale page when none exists', async () => {
    mockFinds([], [{ id: 9, slug: 'on-sale' }]);
    mockCreate.mockResolvedValue({ id: 1, slug: 'sale' });

    const result = await ensureDealsPage({
      find: mockFind,
      create: mockCreate,
      update: mockUpdate,
    } as never);

    expect(result).toBe('created');
    const arg = mockCreate.mock.calls[0]?.[0];
    expect(arg.collection).toBe('pages');
    expect(arg.data.slug).toBe('sale');
    expect(arg.data.title).toBe('Sale');
    expect(arg.data.status).toBe('published');
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('should update an existing sale page to published instead of skipping', async () => {
    mockFinds([{ id: 7, slug: 'sale' }], [{ id: 9, slug: 'on-sale' }]);
    mockUpdate.mockResolvedValue({ id: 7, slug: 'sale' });

    const result = await ensureDealsPage({
      find: mockFind,
      create: mockCreate,
      update: mockUpdate,
    } as never);

    expect(result).toBe('updated');
    expect(mockCreate).not.toHaveBeenCalled();
    const arg = mockUpdate.mock.calls[0]?.[0];
    expect(arg.collection).toBe('pages');
    expect(arg.id).toBe(7);
    expect(arg.data.status).toBe('published');
  });

  it('should still create the page when the on-sale category is missing', async () => {
    mockFinds([], []);
    mockCreate.mockResolvedValue({ id: 1, slug: 'sale' });

    const result = await ensureDealsPage({
      find: mockFind,
      create: mockCreate,
      update: mockUpdate,
    } as never);

    expect(result).toBe('created');
    expect(mockCreate).toHaveBeenCalledOnce();
  });
});
