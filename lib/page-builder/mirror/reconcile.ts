// lib/page-builder/mirror/reconcile.ts — pure structural reconciliation of one locale's
// layout against the other, keyed by the stable `blockKey` field.
//
// Field-level edits are NOT propagated: blocks that already exist in the other locale are
// reused as-is, so their (possibly translated) text is preserved. Only structure
// (add/delete/reorder) follows the active locale. Blocks that exist only in the other locale
// are kept; blocks without a blockKey are left untouched in both (run the backfill script to
// assign keys to legacy data).
import type { PageBlock } from '@/lib/page-builder';

export type KeyedBlock = PageBlock & { blockKey?: string };

export function blockKeyOf(block: unknown): string | undefined {
  if (block && typeof block === 'object' && 'blockKey' in block) {
    const key = (block as { blockKey?: unknown }).blockKey;
    if (typeof key === 'string' && key) return key;
  }
  return undefined;
}

export type ReconcileResult = {
  reconciled: KeyedBlock[];
  /** Keys present in the active layout but absent in the other locale → newly created in
   *  the other locale; their text fields should be translated. */
  addedForOther: Set<string>;
  /** Keys present in the prior active layout but absent in the new one → dropped. */
  removedKeys: Set<string>;
  /** The shared blocks' order differs between the two locales. */
  orderChanged: boolean;
  /** False when there is nothing to write (pure field-edit save). */
  changed: boolean;
};

function clone(block: KeyedBlock): KeyedBlock {
  return structuredClone(block) as KeyedBlock;
}

export function reconcileLayout(
  newActive: KeyedBlock[],
  other: KeyedBlock[],
  priorActiveKeys: ReadonlySet<string>,
): ReconcileResult {
  const otherByKey = new Map<string, KeyedBlock>();
  for (const b of other) {
    const k = blockKeyOf(b);
    if (k) otherByKey.set(k, b);
  }

  const newKeys = new Set<string>();
  for (const b of newActive) {
    const k = blockKeyOf(b);
    if (k) newKeys.add(k);
  }
  const otherKeys = new Set(otherByKey.keys());

  const addedForOther = new Set<string>();
  for (const k of newKeys) if (!otherKeys.has(k)) addedForOther.add(k);

  const removedKeys = new Set<string>();
  for (const k of priorActiveKeys) if (!newKeys.has(k)) removedKeys.add(k);

  // Order comparison over the shared keys (present in both locales).
  const sharedActive = newActive.map(blockKeyOf).filter((k): k is string => !!k && otherKeys.has(k));
  const sharedOther = other.map(blockKeyOf).filter((k): k is string => !!k && newKeys.has(k));
  const orderChanged = sharedActive.some((k, i) => k !== sharedOther[i]);

  const reconciled: KeyedBlock[] = [];
  for (const b of newActive) {
    const k = blockKeyOf(b);
    if (!k) continue; // unkeyed active block: cannot mirror, skip
    if (otherByKey.has(k)) {
      reconciled.push(otherByKey.get(k)!); // reuse other locale's text
    } else {
      reconciled.push(clone(b)); // new for the other locale → translate later
    }
  }
  // Preserve blocks that exist only in the other locale, except those just removed from the
  // active locale (removedKeys), which must be dropped. Unkeyed other blocks stay in place.
  for (const b of other) {
    const k = blockKeyOf(b);
    if (!k) {
      reconciled.push(b);
      continue;
    }
    if (!newKeys.has(k) && !removedKeys.has(k)) reconciled.push(b);
  }

  const changed = addedForOther.size > 0 || removedKeys.size > 0 || orderChanged;
  return { reconciled, addedForOther, removedKeys, orderChanged, changed };
}
