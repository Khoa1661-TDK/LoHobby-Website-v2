'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { PageBlock } from '@/lib/page-builder';
import type { BlockSchema } from '@/lib/page-builder/block-schemas';
import { stripBlockIds } from '@/lib/page-builder/strip-block-ids';
import type { LocaleLayouts } from '@/lib/page-builder/assistant/apply-dual';
import type { Locale } from '@/i18n/routing';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

type PatchBody = {
  layout: PageBlock[];
  status: 'draft' | 'published';
  title?: string;
};

export function buildPatchBody(
  layout: PageBlock[],
  status: 'draft' | 'published',
  title?: string,
): PatchBody {
  const trimmed = typeof title === 'string' ? title.trim() : '';
  return trimmed ? { layout, status, title: trimmed } : { layout, status };
}

// Payload's REST API is mounted at routes.api = '/admin/api' (see payload.config.ts),
// not the default '/api', so patch requests must target that prefix. The `locale`
// query param scopes the write to that locale's values for localized fields.
export function pagePatchPath(id: string | number, locale: string): string {
  return `/admin/api/pages/${id}?locale=${locale}`;
}

// The editor now owns cross-locale consistency (it writes both locales itself), so builder
// saves must NOT trigger the server-side mirror/auto-translate hook. The header tells
// mirror-locale-layout.ts to skip. Admin-UI saves (no header) keep mirroring.
const SKIP_MIRROR_HEADER = 'X-PB-Skip-Mirror';

export async function patchPage(
  id: string | number,
  body: PatchBody,
  locale: string,
  opts: { skipMirror?: boolean } = {},
): Promise<void> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (opts.skipMirror) headers[SKIP_MIRROR_HEADER] = '1';
  const res = await fetch(pagePatchPath(id, locale), {
    method: 'PATCH',
    headers,
    credentials: 'same-origin',
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Autosave failed: ${res.status}`);
}

/** True when the other locale's layout changed since the last successful save. Reference
 *  compare is sufficient: structural edits build new arrays for both locales, while an
 *  active-locale field edit leaves the other locale's array reference untouched. */
export function shouldPatchOther(prev: PageBlock[], next: PageBlock[]): boolean {
  return prev !== next;
}

export function useAutosave(
  pageId: string | number,
  layouts: LocaleLayouts,
  title: string,
  activeLocale: Locale,
  otherLocale: Locale,
  schemas: BlockSchema[],
) {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstRun = useRef(true);
  // Baseline of the last successfully saved layouts, so the other-locale PATCH fires only
  // when that locale actually changed.
  const lastSaved = useRef<LocaleLayouts>(layouts);

  // Debounced draft save whenever either layout or the title changes (skip initial mount).
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      lastSaved.current = layouts;
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    setStatus('saving');
    const snapshot = layouts;
    timer.current = setTimeout(async () => {
      try {
        // Active locale first, then the other — sequenced (not parallel) to avoid a write
        // race on the same page row. Both carry the skip-mirror header.
        await patchPage(
          pageId,
          buildPatchBody(stripBlockIds(snapshot[activeLocale], schemas), 'draft', title),
          activeLocale,
          { skipMirror: true },
        );
        if (shouldPatchOther(lastSaved.current[otherLocale], snapshot[otherLocale])) {
          await patchPage(
            pageId,
            buildPatchBody(stripBlockIds(snapshot[otherLocale], schemas), 'draft'),
            otherLocale,
            { skipMirror: true },
          );
        }
        lastSaved.current = snapshot;
        setStatus('saved');
      } catch {
        setStatus('error');
      }
    }, 800);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [pageId, layouts, title, activeLocale, otherLocale, schemas]);

  const publish = useCallback(async () => {
    setStatus('saving');
    try {
      // Publish both locales; the active one carries the title.
      await patchPage(
        pageId,
        buildPatchBody(stripBlockIds(layouts[activeLocale], schemas), 'published', title),
        activeLocale,
        { skipMirror: true },
      );
      await patchPage(
        pageId,
        buildPatchBody(stripBlockIds(layouts[otherLocale], schemas), 'published'),
        otherLocale,
        { skipMirror: true },
      );
      lastSaved.current = layouts;
      setStatus('saved');
    } catch {
      setStatus('error');
    }
  }, [pageId, layouts, title, activeLocale, otherLocale, schemas]);

  return { status, publish };
}
