// lib/page-builder/mirror/structure-sync.ts — editor-side guard against the two locale
// layouts drifting structurally out of sync.
//
// The builder applies structural edits (add/move/remove/duplicate) to BOTH locale layouts
// by index, in lockstep. That is only safe when the layouts are structurally aligned — same
// length, same `blockKey` at each position. Legacy pages (edited before the mirror hook),
// pages edited in the Payload admin on one locale only, or a duplicate-blockKey bug can leave
// them misaligned, where an index-based edit would corrupt the other locale.
//
// `isStructurallyAligned` detects that state; `syncFromActive` repairs it by rebuilding the
// other locale to mirror the active locale position-for-position (reusing matched blocks'
// per-locale copy, cloning the active block where the other is missing one, dropping
// other-only orphans), and assigning shared keys to any unkeyed legacy blocks so the result
// is always alignable.
import type { KeyedBlock } from '@/lib/page-builder/mirror/reconcile';
import { blockKeyOf } from '@/lib/page-builder/mirror/reconcile';

function newBlockKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `bk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

/** True when the two layouts are safe to edit in index-based lockstep: identical length and
 *  a defined, matching `blockKey` at every position. Any unkeyed block or key mismatch
 *  makes them misaligned (unsafe). */
export function isStructurallyAligned(a: KeyedBlock[], b: KeyedBlock[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const ka = blockKeyOf(a[i]);
    const kb = blockKeyOf(b[i]);
    if (!ka || !kb || ka !== kb) return false;
  }
  return true;
}

function withKey(block: KeyedBlock, key: string): KeyedBlock {
  if (blockKeyOf(block) === key) return block;
  return { ...structuredClone(block), blockKey: key } as KeyedBlock;
}

/** Rebuild both layouts so the `other` locale mirrors the `active` locale's structure exactly,
 *  making them index-aligned. The active layout is returned too because unkeyed legacy blocks
 *  are assigned fresh keys (mirrored into the other copy) — otherwise the result could not be
 *  aligned. Matched blocks keep the other locale's own (translated) copy; unmatched positions
 *  clone the active block; other-only orphan blocks are dropped (active is the source of truth
 *  for structure). */
export function syncFromActive(
  active: KeyedBlock[],
  other: KeyedBlock[],
): { active: KeyedBlock[]; other: KeyedBlock[] } {
  const otherByKey = new Map<string, KeyedBlock>();
  for (const b of other) {
    const k = blockKeyOf(b);
    if (k) otherByKey.set(k, b);
  }

  const nextActive: KeyedBlock[] = [];
  const nextOther: KeyedBlock[] = [];
  for (const a of active) {
    const existingKey = blockKeyOf(a);
    const key = existingKey ?? newBlockKey();
    nextActive.push(withKey(a, key));
    // Reuse the other locale's matching block (its translated copy) when the active block
    // already had a key that the other locale shares; otherwise clone the active block.
    const match = existingKey ? otherByKey.get(existingKey) : undefined;
    nextOther.push(match ? withKey(match, key) : withKey(a, key));
  }
  return { active: nextActive, other: nextOther };
}
