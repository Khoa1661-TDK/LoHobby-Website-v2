import { describe, expect, it, vi } from 'vitest';

// Mock the translator so no network/key is needed: appends " [tr]" to each value.
vi.mock('@/lib/page-builder/mirror/translate', () => ({
  createTranslateClient: () => null,
  translateTextMap: vi.fn(async (entries: { path: string; value: string }[]) => {
    const out: Record<string, string> = {};
    for (const e of entries) out[e.path] = `${e.value} [tr]`;
    return out;
  }),
}));

import { mirrorLocaleLayout, capturePriorLayoutKeys } from '@/src/payload/hooks/mirror-locale-layout';
import { blockKeyOf } from '@/lib/page-builder/mirror/reconcile';

type Layout = Record<string, unknown>[];

function makeReq(locale: string, store: { vi: Layout; en: Layout }, priorKeys?: Set<string>) {
  return {
    locale,
    skipMirror: undefined as boolean | undefined,
    __mirrorPriorKeys: priorKeys,
    payload: {
      findByID: vi.fn(async ({ locale: loc }: { locale: string }) => ({ id: 1, layout: store[loc as 'vi' | 'en'] ?? [] })),
      update: vi.fn(async ({ locale: loc, data }: { locale: string; data: { layout: Layout } }) => {
        store[loc as 'vi' | 'en'] = data.layout;
        return { id: 1 };
      }),
    },
  };
}

describe('mirrorLocaleLayout', () => {
  it('should mirror and translate a newly added block to the other locale', async () => {
    const store = { vi: [{ blockType: 'text', blockKey: 'k1', heading: 'Hello', background: 'theme' }] as Layout, en: [] as Layout };
    const req = makeReq('vi', store);
    await mirrorLocaleLayout({ doc: { id: 1 }, req } as never);
    expect(req.payload.update).toHaveBeenCalledTimes(1);
    const [{ locale, data }] = (req.payload.update as ReturnType<typeof vi.fn>).mock.calls[0] as [{ locale: string; data: { layout: Layout } }];
    expect(locale).toBe('en');
    expect(data.layout[0]?.blockKey).toBe('k1');
    expect(data.layout[0]?.heading).toBe('Hello [tr]');
  });

  it('should not write the other locale on a pure field edit', async () => {
    const store = {
      vi: [{ blockType: 'text', blockKey: 'k1', heading: 'Edited', background: 'theme' }] as Layout,
      en: [{ blockType: 'text', blockKey: 'k1', heading: 'Hola', background: 'theme' }] as Layout,
    };
    const req = makeReq('vi', store, new Set(['k1']));
    await mirrorLocaleLayout({ doc: { id: 1 }, req } as never);
    expect(req.payload.update).not.toHaveBeenCalled();
  });

  it('should delete a removed block from the other locale', async () => {
    const store = { vi: [] as Layout, en: [{ blockType: 'text', blockKey: 'k1', heading: 'Hola' }] as Layout };
    const req = makeReq('vi', store, new Set(['k1']));
    await mirrorLocaleLayout({ doc: { id: 1 }, req } as never);
    expect(req.payload.update).toHaveBeenCalledTimes(1);
    const [{ locale, data }] = (req.payload.update as ReturnType<typeof vi.fn>).mock.calls[0] as [{ locale: string; data: { layout: Layout } }];
    expect(locale).toBe('en');
    expect(data.layout).toEqual([]);
  });

  it('should reorder the other locale to match the active order, preserving text', async () => {
    const store = {
      vi: [{ blockType: 'text', blockKey: 'k2' }, { blockType: 'text', blockKey: 'k1' }] as Layout,
      en: [{ blockType: 'text', blockKey: 'k1', heading: 'A' }, { blockType: 'text', blockKey: 'k2', heading: 'B' }] as Layout,
    };
    const req = makeReq('vi', store, new Set(['k1', 'k2']));
    await mirrorLocaleLayout({ doc: { id: 1 }, req } as never);
    const [{ data }] = (req.payload.update as ReturnType<typeof vi.fn>).mock.calls[0] as [{ data: { layout: Layout } }];
    expect(data.layout.map(blockKeyOf)).toEqual(['k2', 'k1']);
    expect(data.layout[0]?.heading).toBe('B');
    expect(data.layout[1]?.heading).toBe('A');
  });

  it('should preserve other-locale-only blocks and not write when nothing structural changed', async () => {
    const store = {
      vi: [{ blockType: 'text', blockKey: 'k1', heading: 'Hi' }] as Layout,
      en: [{ blockType: 'text', blockKey: 'k1', heading: 'Hola' }, { blockType: 'text', blockKey: 'kOther', heading: 'en-only' }] as Layout,
    };
    const req = makeReq('vi', store, new Set(['k1']));
    await mirrorLocaleLayout({ doc: { id: 1 }, req } as never);
    expect(req.payload.update).not.toHaveBeenCalled(); // en-only block already there, no change
  });

  it('should short-circuit when skipMirror is set', async () => {
    const store = { vi: [{ blockType: 'text', blockKey: 'k1', heading: 'Hi' }] as Layout, en: [] as Layout };
    const req = makeReq('vi', store);
    req.skipMirror = true;
    await mirrorLocaleLayout({ doc: { id: 1 }, req } as never);
    expect(req.payload.update).not.toHaveBeenCalled();
  });

  it('should mirror all blocks on first create', async () => {
    const store = {
      vi: [{ blockType: 'text', blockKey: 'k1', heading: 'A' }, { blockType: 'text', blockKey: 'k2', heading: 'B' }] as Layout,
      en: [] as Layout,
    };
    const req = makeReq('vi', store);
    await mirrorLocaleLayout({ doc: { id: 1 }, req } as never);
    const [{ data }] = (req.payload.update as ReturnType<typeof vi.fn>).mock.calls[0] as [{ data: { layout: Layout } }];
    expect(data.layout.map(blockKeyOf)).toEqual(['k1', 'k2']);
    expect(data.layout[0]?.heading).toBe('A [tr]');
  });
});

describe('capturePriorLayoutKeys', () => {
  it('should stash the prior blockKey set from originalDoc onto req', () => {
    const req = makeReq('vi', { vi: [], en: [] });
    const data = { layout: [{ blockType: 'text', blockKey: 'new' }] };
    capturePriorLayoutKeys({ data, originalDoc: { layout: [{ blockType: 'text', blockKey: 'old1' }, { blockType: 'text', blockKey: 'old2' }] }, req } as never);
    expect(req.__mirrorPriorKeys).toEqual(new Set(['old1', 'old2']));
  });

  it('should short-circuit when skipMirror is set', () => {
    const req = makeReq('vi', { vi: [], en: [] });
    req.skipMirror = true;
    const data = { layout: [] };
    capturePriorLayoutKeys({ data, originalDoc: { layout: [{ blockType: 'text', blockKey: 'x' }] }, req } as never);
    expect(req.__mirrorPriorKeys).toBeUndefined();
  });
});