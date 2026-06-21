// scripts/__tests__/seed-home-page.test.ts
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/lib/page-builder/home-seed', () => ({ buildHomeSeedLayout: () => [] }));

import { ensureHomePage } from '@/scripts/seed-home-page';

const mockFind = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();

beforeEach(() => {
  mockFind.mockReset();
  mockCreate.mockReset();
  mockUpdate.mockReset();
});

describe('ensureHomePage', () => {
  it('should create a published home page when none exists', async () => {
    mockFind.mockResolvedValue({ docs: [] });
    mockCreate.mockResolvedValue({ id: 1, slug: 'home' });

    const result = await ensureHomePage({
      find: mockFind,
      create: mockCreate,
      update: mockUpdate,
    } as never);

    expect(result).toBe('created');
    const arg = mockCreate.mock.calls[0]?.[0];
    expect(arg.collection).toBe('pages');
    expect(arg.data.slug).toBe('home');
    expect(arg.data.title).toBe('Home');
    expect(arg.data.status).toBe('published');
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('should update an existing home page to published instead of skipping', async () => {
    mockFind.mockResolvedValue({ docs: [{ id: 7, slug: 'home' }] });
    mockUpdate.mockResolvedValue({ id: 7, slug: 'home' });

    const result = await ensureHomePage({
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
});
