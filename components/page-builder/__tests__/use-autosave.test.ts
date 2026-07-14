// components/page-builder/__tests__/use-autosave.test.ts
import { describe, expect, it, vi, afterEach } from 'vitest';
import { buildPatchBody, pagePatchPath, patchPage, shouldPatchOther } from '@/components/page-builder/use-autosave';
import type { PageBlock } from '@/lib/page-builder';

describe('buildPatchBody', () => {
  it('should include a non-empty title in the patch body', () => {
    expect(buildPatchBody([], 'draft', 'About Us')).toEqual({
      layout: [],
      status: 'draft',
      title: 'About Us',
    });
  });

  it('should omit the title when it is empty or whitespace', () => {
    expect(buildPatchBody([], 'draft', '   ')).toEqual({ layout: [], status: 'draft' });
  });

  it('should omit the title when not provided', () => {
    expect(buildPatchBody([], 'published')).toEqual({ layout: [], status: 'published' });
  });
});

describe('pagePatchPath', () => {
  it('should target Payload REST mounted at /admin/api with the locale query', () => {
    expect(pagePatchPath(7, 'vi')).toBe('/admin/api/pages/7?locale=vi');
  });

  it('should scope the write to the given locale', () => {
    expect(pagePatchPath(7, 'en')).toBe('/admin/api/pages/7?locale=en');
  });
});

describe('shouldPatchOther', () => {
  it('should be true when the other locale layout reference changed', () => {
    const a = [] as PageBlock[];
    const b = [] as PageBlock[];
    expect(shouldPatchOther(a, b)).toBe(true);
  });

  it('should be false when the other locale layout is unchanged (same reference)', () => {
    const a = [] as PageBlock[];
    expect(shouldPatchOther(a, a)).toBe(false);
  });
});

describe('patchPage', () => {
  afterEach(() => vi.restoreAllMocks());

  it('should send the X-PB-Skip-Mirror header when skipMirror is set', async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 200 }));
    global.fetch = fetchMock as unknown as typeof fetch;

    await patchPage(7, { layout: [], status: 'draft' }, 'vi', { skipMirror: true });

    const init = (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1];
    expect((init.headers as Record<string, string>)['X-PB-Skip-Mirror']).toBe('1');
  });

  it('should omit the skip-mirror header by default', async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 200 }));
    global.fetch = fetchMock as unknown as typeof fetch;

    await patchPage(7, { layout: [], status: 'draft' }, 'vi');

    const init = (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1];
    expect((init.headers as Record<string, string>)['X-PB-Skip-Mirror']).toBeUndefined();
  });
});
