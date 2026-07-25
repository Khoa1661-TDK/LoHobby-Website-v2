// Reproduction for the "AI page-builder deleted my hero and stripped the marquee" bug.
// These tests are DELIBERATELY red-flag demonstrations of two mechanisms, not the fixed
// behavior — they document how a well-formed tool sequence damages an existing layout.
//
// Root cause (see docs/superpowers/specs/2026-06-26-ai-page-builder-assistant-design.md,
// "Open risks → Index drift"): the design says the server should "echo the running layout
// each loop turn" so multi-step edits target correctly. The implemented route
// (app/api/page-builder/assistant/route.ts) sends the layout snapshot exactly ONCE and then
// only replies "applied" after each mutation — the model never sees the shifted indices.
import { describe, expect, it } from 'vitest';
import { applyDualMutation, type LocaleLayouts } from '@/lib/page-builder/assistant/apply-dual';
import { serializeLayout } from '@/lib/page-builder/assistant/snapshot';
import type { PageBlock } from '@/lib/page-builder';

function homepage(): LocaleLayouts {
  // A typical starting page: hero at the top, a marquee strip, then an FAQ.
  const vi = [
    { blockType: 'hero', blockKey: 'hero-1', heading: 'Chào mừng' },
    { blockType: 'marquee', blockKey: 'mq-1', items: [{ text: 'Miễn phí ship' }, { text: 'Hàng mới về' }] },
    { blockType: 'faq', blockKey: 'faq-1', heading: 'Câu hỏi' },
  ] as unknown as PageBlock[];
  return { vi, en: structuredClone(vi) };
}

describe('BUG REPRO — index drift deletes the wrong block', () => {
  it('deletes the hero when the model targets a stale index after inserting a block', () => {
    let layouts = homepage();

    // The model sees this snapshot ONCE (route sends it a single time in the user message).
    // In it: hero=0, marquee=1, faq=2. The user asked: "add a promo banner at the top and
    // remove the marquee."
    const snapshotSeenByModel = serializeLayout(layouts.vi);
    expect(snapshotSeenByModel.map((b) => b.blockType)).toEqual(['hero', 'marquee', 'faq']);

    // Turn 1: insert the promo banner at index 0. Everything shifts down by one:
    // hero is now 1, marquee is now 2, faq is now 3.
    layouts = applyDualMutation(
      layouts,
      { kind: 'add', index: 0, block: { blockType: 'promoBanner', blockKey: 'promo-1' } as Record<string, unknown> },
      'vi',
    );

    // Turn 2: the model removes "the marquee" using the index from the ONLY snapshot it was
    // given — marquee=1 there. But index 1 is now the HERO. The route just says "applied",
    // so the model never learns the layout shifted.
    layouts = applyDualMutation(layouts, { kind: 'remove', index: 1 }, 'vi');

    const survivors = layouts.vi.map((b) => (b as { blockType: string }).blockType);
    // What the user wanted: [promoBanner, hero, faq] — marquee gone.
    // What ACTUALLY happens (the bug): the HERO is deleted and the marquee survives,
    // because index 1 pointed at the hero after the insert shifted everything down.
    expect(survivors).toEqual(['promoBanner', 'marquee', 'faq']);
    expect(survivors).not.toContain('hero'); // the user's hero is gone
  });
});

describe('FIXED (Task 9) — the marquee items array is now visible as a row count', () => {
  it('reports the row count in the snapshot instead of dropping the array', () => {
    const layouts = homepage();
    const snapshot = serializeLayout(layouts.vi);
    const marquee = snapshot.find((b) => b.blockType === 'marquee')!;
    // serializeLayout now collapses arrays to a row count rather than dropping them, so the
    // model can see the marquee has 2 rows and knows to use read_block / row tools rather
    // than blindly overwriting the array via update_block.
    expect(marquee.summary.items).toBe('2 rows');
  });

  it('wholesale-replaces the items array on update, stripping existing phrases', () => {
    let layouts = homepage();
    // The model updates the marquee (index 1). Because updateBlockField does { ...block,
    // [name]: value }, sending items at all overwrites the whole array. Sending [] strips it.
    layouts = applyDualMutation(
      layouts,
      { kind: 'update', index: 1, fields: { items: [] } },
      'vi',
    );
    const marquee = layouts.vi[1] as unknown as { blockType: string; items: unknown[] };
    expect(marquee.blockType).toBe('marquee');
    expect(marquee.items).toEqual([]); // the two phrases are gone
  });
});
