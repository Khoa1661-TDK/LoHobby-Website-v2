// lib/__tests__/page-builder-draft.test.ts
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { getPayload } from 'payload';
import { fetchPageBySlugDraft } from '@/lib/page-builder';

vi.mock('@payload-config', () => ({ default: {} }));
vi.mock('payload', () => ({ getPayload: vi.fn() }));
vi.mock('next/cache', () => ({
  unstable_cache: (fn: unknown) => fn,
  revalidateTag: vi.fn(),
}));

const mockFind = vi.fn();

beforeEach(() => {
  mockFind.mockReset();
  (getPayload as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ find: mockFind });
});

describe('fetchPageBySlugDraft', () => {
  it('should return an unpublished page (no status filter)', async () => {
    mockFind.mockResolvedValue({
      docs: [{ id: 1, title: 'Draft Page', slug: 'draft-page', status: 'draft', layout: [] }],
    });

    const result = await fetchPageBySlugDraft('draft-page');

    expect(result?.title).toBe('Draft Page');
    expect(result?.status).toBe('draft');
    // The where clause must NOT filter on status.
    const whereArg = mockFind.mock.calls[0]?.[0]?.where;
    expect(JSON.stringify(whereArg)).not.toContain('status');
  });

  it('should return null for a blank slug without querying', async () => {
    const result = await fetchPageBySlugDraft('   ');
    expect(result).toBeNull();
    expect(mockFind).not.toHaveBeenCalled();
  });

  it('should return null when no doc is found', async () => {
    mockFind.mockResolvedValue({ docs: [] });
    const result = await fetchPageBySlugDraft('missing');
    expect(result).toBeNull();
  });
});
