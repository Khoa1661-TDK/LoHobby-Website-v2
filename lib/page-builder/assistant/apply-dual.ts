// lib/page-builder/assistant/apply-dual.ts — route a single assistant mutation across the
// two locale layouts the editor now holds. Structure (add/move/remove/duplicate) is shared,
// so it applies to BOTH copies in lockstep; field edits (update) apply only to the tagged
// locale(s). Used identically on the server (route working copies) and the client
// (EditorShell state) so the two never drift.
import type { PageBlock } from '@/lib/page-builder';
import { applyMutation } from './apply';
import type { Locale } from '@/i18n/routing';
import type { Mutation } from './validate';

export type LocaleLayouts = { vi: PageBlock[]; en: PageBlock[] };

const LOCALES: readonly Locale[] = ['vi', 'en'];

function otherLocale(locale: Locale): Locale {
  return locale === 'vi' ? 'en' : 'vi';
}

/** Which locale copies a validated mutation touches. Structure is always both; an
 *  `update` follows its `locale` tag (default = active), and `both` fans out to both. */
export function resolveLocales(mutation: Mutation, activeLocale: Locale): Locale[] {
  if (mutation.kind === 'update') {
    const tag = mutation.locale ?? activeLocale;
    return tag === 'both' ? [...LOCALES] : [tag];
  }
  return [...LOCALES];
}

/** Apply one mutation to the pair of layouts. `activeLocale` decides which copy gets the
 *  primary `block` on an add; the other gets `blockOther` (or a clone) so both share the
 *  same blockKey while carrying per-locale copy. Returns new arrays; inputs are untouched. */
export function applyDualMutation(
  layouts: LocaleLayouts,
  mutation: Mutation,
  activeLocale: Locale,
): LocaleLayouts {
  const next: LocaleLayouts = { vi: layouts.vi, en: layouts.en };

  if (mutation.kind === 'add') {
    const other = otherLocale(activeLocale);
    next[activeLocale] = applyMutation(next[activeLocale], mutation);
    const otherBlock = mutation.blockOther ?? structuredClone(mutation.block);
    next[other] = applyMutation(next[other], { kind: 'add', index: mutation.index, block: otherBlock });
    return next;
  }

  if (mutation.kind === 'update') {
    for (const loc of resolveLocales(mutation, activeLocale)) {
      next[loc] = applyMutation(next[loc], mutation);
    }
    return next;
  }

  // move / remove / duplicate — structural, apply to both copies.
  next.vi = applyMutation(next.vi, mutation);
  next.en = applyMutation(next.en, mutation);
  return next;
}
