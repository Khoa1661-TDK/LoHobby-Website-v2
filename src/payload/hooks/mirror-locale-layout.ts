// src/payload/hooks/mirror-locale-layout.ts — keep the two locales' page layouts structurally
// in sync: adds/deletes/reorders mirror across vi <-> en, while field edits stay per-locale.
// Newly created blocks are auto-translated via OpenRouter (best-effort).
import type {
  CollectionAfterChangeHook,
  CollectionBeforeChangeHook,
  PayloadRequest,
} from 'payload';
import { getBlockSchemas } from '@/lib/page-builder/block-schemas';
import { stripBlockIds } from '@/lib/page-builder/strip-block-ids';
import type { PageBlock } from '@/lib/page-builder';
import { reconcileLayout, blockKeyOf, type KeyedBlock } from '@/lib/page-builder/mirror/reconcile';
import {
  collectTranslatable,
  applyTranslations,
  type TextEntry,
} from '@/lib/page-builder/mirror/translatable';
import { createTranslateClient, translateTextMap } from '@/lib/page-builder/mirror/translate';

const LOCALES = ['vi', 'en'] as const;
type Locale = (typeof LOCALES)[number];

function otherOf(locale: string): Locale | undefined {
  if (!LOCALES.includes(locale as Locale)) return undefined;
  return LOCALES.find((code) => code !== locale) as Locale;
}

type MirrorReq = PayloadRequest & {
  skipMirror?: boolean;
  __mirrorPriorKeys?: Set<string>;
};

export const capturePriorLayoutKeys: CollectionBeforeChangeHook = ({ data, originalDoc, req }) => {
  const mreq = req as MirrorReq;
  if (mreq.skipMirror) return data;
  const prior = Array.isArray(originalDoc?.layout) ? originalDoc.layout : [];
  mreq.__mirrorPriorKeys = new Set(
    prior.map((b: unknown) => blockKeyOf(b)).filter((k: string | undefined): k is string => !!k),
  );
  return data;
};

export const mirrorLocaleLayout: CollectionAfterChangeHook = async ({ doc, req }) => {
  const mreq = req as MirrorReq;
  if (mreq.skipMirror) return doc;

  const activeLocale = typeof req.locale === 'string' ? req.locale : undefined;
  if (!activeLocale) return doc;
  const otherLocale = otherOf(activeLocale);
  if (!otherLocale) return doc;

  const pageId = (doc as { id?: string | number })?.id;
  if (pageId === undefined) return doc;

  // Load both locales at depth 0 so uploads/relationships are bare ids (safe to re-save),
  // and so we compare the just-committed active layout against the other locale's current one.
  let newLayout: KeyedBlock[];
  let otherLayout: KeyedBlock[];
  try {
    const [activeDoc, otherDoc] = await Promise.all([
      req.payload.findByID({ collection: 'pages', id: pageId, locale: activeLocale, depth: 0, req }),
      req.payload.findByID({ collection: 'pages', id: pageId, locale: otherLocale, depth: 0, req }),
    ]);
    newLayout = Array.isArray(activeDoc?.layout) ? (activeDoc.layout as KeyedBlock[]) : [];
    otherLayout = Array.isArray(otherDoc?.layout) ? (otherDoc.layout as KeyedBlock[]) : [];
  } catch (err) {
    console.warn('[mirror] could not load layouts, skipping:', err);
    return doc;
  }

  const priorKeys = mreq.__mirrorPriorKeys ?? new Set<string>();
  const { reconciled, addedForOther, removedKeys, changed } = reconcileLayout(
    newLayout,
    otherLayout,
    priorKeys,
  );
  void removedKeys; // already applied inside reconcile (dropped from the rebuilt array)
  if (!changed) return doc; // pure field edit → leave the other locale alone

  // Collect translatable text from the newly-added blocks. Use composite "blockKey::path"
  // keys in the batch so two added blocks with the same field name (e.g. "heading") don't
  // collide in the single LLM call.
  const schemas = getBlockSchemas();
  const schemaBySlug = new Map(schemas.map((s) => [s.slug, s]));
  const batch: TextEntry[] = [];
  for (const block of reconciled) {
    const k = blockKeyOf(block);
    if (k && addedForOther.has(k)) {
      const schema = schemaBySlug.get(block.blockType ?? '') ?? null;
      for (const e of collectTranslatable(block, schema)) {
        batch.push({ path: `${k}::${e.path}`, value: e.value });
      }
    }
  }

  const translatedMap =
    batch.length > 0
      ? await translateTextMap(batch, activeLocale, otherLocale, createTranslateClient())
      : {};

  // Apply translations back per-block (strip the composite prefix).
  const finalLayout = reconciled.map((block) => {
    const k = blockKeyOf(block);
    if (!k || !addedForOther.has(k)) return block;
    const schema = schemaBySlug.get(block.blockType ?? '') ?? null;
    const mine: Record<string, string> = {};
    for (const e of collectTranslatable(block, schema)) {
      const v = translatedMap[`${k}::${e.path}`];
      if (typeof v === 'string') mine[e.path] = v;
    }
    return applyTranslations(block, mine);
  }) as PageBlock[];

  // Write the other locale. Strip ids (both reused and cloned) so Payload mints fresh
  // per-locale ids — blockKey survives. skipMirror prevents the nested write from
  // re-triggering this hook (infinite recursion).
  try {
    mreq.skipMirror = true;
    await req.payload.update({
      collection: 'pages',
      id: pageId,
      locale: otherLocale,
      data: { layout: stripBlockIds(finalLayout, schemas) },
      req,
    });
  } catch (err) {
    console.warn('[mirror] failed to write other locale:', err);
  } finally {
    mreq.skipMirror = false;
  }
  return doc;
};
