import { describe, expect, it } from 'vitest';
import { applyDualMutation, resolveLocales, type LocaleLayouts } from '@/lib/page-builder/assistant/apply-dual';
import type { Mutation } from '@/lib/page-builder/assistant/validate';
import type { PageBlock } from '@/lib/page-builder';

function layouts(vi: unknown[], en: unknown[]): LocaleLayouts {
  return { vi: vi as PageBlock[], en: en as PageBlock[] };
}

describe('resolveLocales', () => {
  it('should return both locales for a structural add', () => {
    const m: Mutation = { kind: 'add', index: 0, block: { blockType: 'hero' } };
    expect(resolveLocales(m, 'vi').sort()).toEqual(['en', 'vi']);
  });

  it('should return both locales for move/remove/duplicate', () => {
    expect(resolveLocales({ kind: 'move', from: 0, to: 1 }, 'vi').sort()).toEqual(['en', 'vi']);
    expect(resolveLocales({ kind: 'remove', index: 0 }, 'en').sort()).toEqual(['en', 'vi']);
    expect(resolveLocales({ kind: 'duplicate', index: 0 }, 'vi').sort()).toEqual(['en', 'vi']);
  });

  it('should default an untagged update to the active locale only', () => {
    expect(resolveLocales({ kind: 'update', index: 0, fields: {} }, 'vi')).toEqual(['vi']);
  });

  it('should honor an explicit update locale tag', () => {
    expect(resolveLocales({ kind: 'update', index: 0, fields: {}, locale: 'en' }, 'vi')).toEqual(['en']);
  });

  it('should fan a "both" update out to both locales', () => {
    expect(resolveLocales({ kind: 'update', index: 0, fields: {}, locale: 'both' }, 'vi').sort()).toEqual(['en', 'vi']);
  });
});

describe('applyDualMutation — structure stays in sync', () => {
  it('should insert a block into both locales at the same index', () => {
    const start = layouts([{ blockType: 'hero', blockKey: 'k0' }], [{ blockType: 'hero', blockKey: 'k0' }]);
    const next = applyDualMutation(
      start,
      { kind: 'add', index: 1, block: { blockType: 'faq', blockKey: 'k1' } },
      'vi',
    );
    expect(next.vi.map((b) => (b as { blockKey?: string }).blockKey)).toEqual(['k0', 'k1']);
    expect(next.en.map((b) => (b as { blockKey?: string }).blockKey)).toEqual(['k0', 'k1']);
  });

  it('should use fieldsOther copy for the non-active locale while sharing the key', () => {
    const start = layouts([], []);
    const next = applyDualMutation(
      start,
      {
        kind: 'add',
        index: 0,
        block: { blockType: 'hero', blockKey: 'k1', headline: 'Xin chào' },
        blockOther: { blockType: 'hero', blockKey: 'k1', headline: 'Hello' },
      },
      'vi',
    );
    expect((next.vi[0] as { headline?: string }).headline).toBe('Xin chào');
    expect((next.en[0] as { headline?: string }).headline).toBe('Hello');
    expect((next.vi[0] as { blockKey?: string }).blockKey).toBe('k1');
    expect((next.en[0] as { blockKey?: string }).blockKey).toBe('k1');
  });

  it('should keep both locales in sync across add, move, remove, duplicate', () => {
    let s = layouts(
      [{ blockType: 'a', blockKey: 'ka' }, { blockType: 'b', blockKey: 'kb' }],
      [{ blockType: 'a', blockKey: 'ka' }, { blockType: 'b', blockKey: 'kb' }],
    );
    s = applyDualMutation(s, { kind: 'add', index: 2, block: { blockType: 'c', blockKey: 'kc' } }, 'en');
    s = applyDualMutation(s, { kind: 'move', from: 2, to: 0 }, 'en');
    s = applyDualMutation(s, { kind: 'duplicate', index: 0 }, 'en');
    s = applyDualMutation(s, { kind: 'remove', index: 3 }, 'en');
    const keys = (blocks: PageBlock[]) => blocks.map((b) => (b as { blockKey?: string }).blockKey);
    expect(keys(s.vi)).toEqual(keys(s.en));
    expect(keys(s.vi)).toEqual(['kc', 'kc', 'ka']);
  });
});

describe('applyDualMutation — field edits are per-locale', () => {
  it('should update only the active locale by default', () => {
    const start = layouts(
      [{ blockType: 'hero', blockKey: 'k', headline: 'vi-old' }],
      [{ blockType: 'hero', blockKey: 'k', headline: 'en-old' }],
    );
    const next = applyDualMutation(start, { kind: 'update', index: 0, fields: { headline: 'vi-new' } }, 'vi');
    expect((next.vi[0] as { headline?: string }).headline).toBe('vi-new');
    expect((next.en[0] as { headline?: string }).headline).toBe('en-old');
  });

  it('should update only the tagged locale', () => {
    const start = layouts(
      [{ blockType: 'hero', blockKey: 'k', headline: 'vi-old' }],
      [{ blockType: 'hero', blockKey: 'k', headline: 'en-old' }],
    );
    const next = applyDualMutation(start, { kind: 'update', index: 0, fields: { headline: 'en-new' }, locale: 'en' }, 'vi');
    expect((next.vi[0] as { headline?: string }).headline).toBe('vi-old');
    expect((next.en[0] as { headline?: string }).headline).toBe('en-new');
  });

  it('should update both locales for a "both"-tagged update', () => {
    const start = layouts(
      [{ blockType: 'hero', blockKey: 'k', backgroundCustom: '#000' }],
      [{ blockType: 'hero', blockKey: 'k', backgroundCustom: '#000' }],
    );
    const next = applyDualMutation(start, { kind: 'update', index: 0, fields: { backgroundCustom: '#fff' }, locale: 'both' }, 'vi');
    expect((next.vi[0] as { backgroundCustom?: string }).backgroundCustom).toBe('#fff');
    expect((next.en[0] as { backgroundCustom?: string }).backgroundCustom).toBe('#fff');
  });
});
