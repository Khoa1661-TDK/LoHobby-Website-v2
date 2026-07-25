import { describe, expect, it, vi } from 'vitest';
import { searchMedia, searchCatalog } from '@/lib/page-builder/assistant/resource-search';

type FindArgs = { collection: string; where?: unknown; limit?: number };

function fakePayload(docs: unknown[], capture?: (args: FindArgs) => void) {
  return {
    find: vi.fn(async (args: FindArgs) => {
      capture?.(args);
      return { docs };
    }),
  } as unknown as Parameters<typeof searchMedia>[0];
}

describe('searchMedia', () => {
  it('should map media docs to id, filename, alt, and dimensions', async () => {
    const payload = fakePayload([
      { id: 412, filename: 'bambu-a1-mini.jpg', alt: 'Bambu A1 Mini on desk', width: 1600, height: 1067 },
    ]);
    const out = await searchMedia(payload, '3d printer', 10);
    expect(out).toEqual([
      { id: 412, filename: 'bambu-a1-mini.jpg', alt: 'Bambu A1 Mini on desk', width: 1600, height: 1067 },
    ]);
  });

  it('should omit the where clause when the query is empty, returning recent uploads', async () => {
    let seen: FindArgs | undefined;
    const payload = fakePayload([], (a) => { seen = a; });
    await searchMedia(payload, '', 10);
    expect(seen?.where).toBeUndefined();
  });

  it('should return an empty array when the lookup throws', async () => {
    const payload = { find: vi.fn(async () => { throw new Error('db down'); }) } as unknown as Parameters<typeof searchMedia>[0];
    await expect(searchMedia(payload, 'x', 10)).resolves.toEqual([]);
  });

  it('should clamp the limit to the maximum', async () => {
    let seen: FindArgs | undefined;
    const payload = fakePayload([], (a) => { seen = a; });
    await searchMedia(payload, 'x', 999);
    expect(seen?.limit).toBeLessThanOrEqual(50);
  });
});

describe('searchCatalog', () => {
  it('should map catalog docs to id and title', async () => {
    const payload = fakePayload([{ id: 7, title: 'Filament PLA' }]);
    const out = await searchCatalog(payload, 'products', 'pla', 10, 'vi');
    expect(out).toEqual([{ id: 7, title: 'Filament PLA' }]);
  });

  it('should query the requested collection', async () => {
    let seen: FindArgs | undefined;
    const payload = fakePayload([], (a) => { seen = a; });
    await searchCatalog(payload, 'categories', 'x', 10, 'vi');
    expect(seen?.collection).toBe('categories');
  });

  it('should return an empty array when the lookup throws', async () => {
    const payload = { find: vi.fn(async () => { throw new Error('db down'); }) } as unknown as Parameters<typeof searchCatalog>[0];
    await expect(searchCatalog(payload, 'products', 'x', 10, 'vi')).resolves.toEqual([]);
  });
});
