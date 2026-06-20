'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { PageBlock } from '@/lib/page-builder';

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
// not the default '/api', so patch requests must target that prefix.
export function pagePatchPath(id: string | number): string {
  return `/admin/api/pages/${id}`;
}

async function patchPage(id: string | number, body: PatchBody): Promise<void> {
  const res = await fetch(pagePatchPath(id), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Autosave failed: ${res.status}`);
}

export function useAutosave(pageId: string | number, layout: PageBlock[], title: string) {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstRun = useRef(true);

  // Debounced draft save whenever layout or title changes (skip the initial mount).
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    setStatus('saving');
    timer.current = setTimeout(() => {
      patchPage(pageId, buildPatchBody(layout, 'draft', title))
        .then(() => setStatus('saved'))
        .catch(() => setStatus('error'));
    }, 800);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [pageId, layout, title]);

  const publish = useCallback(async () => {
    setStatus('saving');
    try {
      await patchPage(pageId, buildPatchBody(layout, 'published', title));
      setStatus('saved');
    } catch {
      setStatus('error');
    }
  }, [pageId, layout, title]);

  return { status, publish };
}
