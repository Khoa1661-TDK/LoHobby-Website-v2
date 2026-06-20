// scripts/__tests__/seed-home-page.test.ts
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/lib/page-builder/home-seed', () => ({ buildHomeSeedLayout: () => [] }));

import { ensureHomePage } from '@/scripts/seed-home-page';

const mockFind = vi.fn();
const mockCreate = vi.fn();

beforeEach(() => {
  mockFind.mockReset();
  mockCreate.mockReset();
});

describe('ensureHomePage', () => {
  it('should create the home page when none exists', async () => {
    mockFind.mockResolvedValue({ docs: [] });
    mockCreate.mockResolvedValue({ id: 1, slug: 'home' });

    const result = await ensureHomePage({ find: mockFind, create: mockCreate } as never);

    expect(result).toBe('created');
    const arg = mockCreate.mock.calls[0]?.[0];
    expect(arg.collection).toBe('pages');
    expect(arg.data.slug).toBe('home');
    expect(arg.data.title).toBe('Home');
  });

  it('should skip creation when the home page already exists', async () => {
    mockFind.mockResolvedValue({ docs: [{ id: 1, slug: 'home' }] });

    const result = await ensureHomePage({ find: mockFind, create: mockCreate } as never);

    expect(result).toBe('exists');
    expect(mockCreate).not.toHaveBeenCalled();
  });
});
