// lib/__tests__/page-builder-locale.test.ts
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { getPayload } from 'payload';
import { getHomePage, getPageBySlug } from '@/lib/page-builder';

vi.mock('@payload-config', () => ({ default: {} }));
vi.mock('payload', () => ({ getPayload: vi.fn() }));
// unstable_cache is identity here so we exercise the real fetch path per call.
vi.mock('next/cache', () => ({
  unstable_cache: (fn: unknown) => fn,
  revalidateTag: vi.fn(),
}));

const mockFind = vi.fn();

beforeEach(() => {
  mockFind.mockReset();
  (getPayload as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ find: mockFind });
});

describe('getPageBySlug locale resolution', () => {
  it('should forward the requested locale to Payload', async () => {
    mockFind.mockResolvedValue({
      docs: [{ id: 1, title: 'Trang chủ', slug: 'home', status: 'published', layout: [] }],
    });

    await getPageBySlug('home', 'en');

    expect(mockFind.mock.calls[0]?.[0]?.locale).toBe('en');
  });

  it('should return the locale-specific content Payload resolves', async () => {
    mockFind.mockResolvedValue({
      docs: [{ id: 1, title: 'Home', slug: 'home', status: 'published', layout: [] }],
    });

    const result = await getPageBySlug('home', 'en');

    expect(result?.title).toBe('Home');
  });
});

describe('getHomePage', () => {
  it('should query the home slug with the given locale', async () => {
    mockFind.mockResolvedValue({
      docs: [{ id: 1, title: 'Trang chủ', slug: 'home', status: 'published', layout: [] }],
    });

    await getHomePage('vi');

    const arg = mockFind.mock.calls[0]?.[0];
    expect(arg?.locale).toBe('vi');
    expect(JSON.stringify(arg?.where)).toContain('home');
  });

  it('should warn when an unpublished home page exists and falls back', async () => {
    // Published query returns nothing; the status-agnostic draft check finds a draft.
    mockFind
      .mockResolvedValueOnce({ docs: [] })
      .mockResolvedValueOnce({
        docs: [{ id: 5, title: 'Trang chủ', slug: 'home', status: 'draft', layout: [] }],
      });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await getHomePage('vi');

    expect(result).toBeNull();
    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0]?.[0]).toContain('"draft"');
    warn.mockRestore();
  });

  it('should not warn when no home page exists at all', async () => {
    // Both the published query and the draft check come back empty.
    mockFind.mockResolvedValue({ docs: [] });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await getHomePage('vi');

    expect(result).toBeNull();
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});
