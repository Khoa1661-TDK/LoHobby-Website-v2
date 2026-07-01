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
    // Default locales is a single locale, so no per-locale mirroring update runs.
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

  it('should write the layout to every configured locale when creating', async () => {
    mockFind.mockResolvedValue({ docs: [] });
    mockCreate.mockResolvedValue({ id: 9, slug: 'home' });
    mockUpdate.mockResolvedValue({ id: 9, slug: 'home' });

    const result = await ensureHomePage(
      { find: mockFind, create: mockCreate, update: mockUpdate } as never,
      ['vi', 'en'],
    );

    expect(result).toBe('created');
    // Default locale is created; the remaining locale is mirrored via update.
    expect(mockCreate.mock.calls[0]?.[0].locale).toBe('vi');
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    const updateArg = mockUpdate.mock.calls[0]?.[0];
    expect(updateArg.id).toBe(9);
    expect(updateArg.locale).toBe('en');
    expect(updateArg.data.status).toBe('published');
  });

  it('should update every configured locale when the home page already exists', async () => {
    mockFind.mockResolvedValue({ docs: [{ id: 7, slug: 'home' }] });
    mockUpdate.mockResolvedValue({ id: 7, slug: 'home' });

    const result = await ensureHomePage(
      { find: mockFind, create: mockCreate, update: mockUpdate } as never,
      ['vi', 'en'],
    );

    expect(result).toBe('updated');
    expect(mockCreate).not.toHaveBeenCalled();
    // One update per locale, each targeting the same page id.
    expect(mockUpdate).toHaveBeenCalledTimes(2);
    expect(mockUpdate.mock.calls[0]?.[0].locale).toBe('vi');
    expect(mockUpdate.mock.calls[1]?.[0].locale).toBe('en');
    expect(mockUpdate.mock.calls.every((c) => c[0].id === 7)).toBe(true);
  });
});
