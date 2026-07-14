// components/page-builder/HeaderEditorShell.tsx — visual editor for the site-header
// global's announcement banner + navigation tabs. Reuses the page-builder FieldRenderer
// (its ArrayField gives add/delete/reorder; GroupField edits the announcement) and
// autosaves to the Payload global over REST. No iframe/layers rail — this surface edits
// global chrome, not a page layout.
'use client';
import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';
import type { BlockSchema } from '@/lib/page-builder/block-schemas';
import FieldRenderer from './FieldRenderer';

export type HeaderGlobalValues = {
  announcement?: Record<string, unknown> | null;
  tabs?: Record<string, unknown>[] | null;
};

type Props = {
  locale: string;
  announcementSchema: BlockSchema;
  tabsSchema: BlockSchema;
  initial: HeaderGlobalValues;
};

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

// Payload REST is mounted at '/admin/api' (payload.config.ts routes.api); globals are
// updated with POST /admin/api/globals/{slug}. The route is admin-gated, so the session
// cookie is present.
async function saveHeaderGlobal(values: HeaderGlobalValues): Promise<void> {
  const res = await fetch('/admin/api/globals/site-header', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(values),
  });
  if (!res.ok) throw new Error(`Save failed: ${res.status}`);
}

export default function HeaderEditorShell({
  announcementSchema,
  tabsSchema,
  initial,
}: Props): ReactElement {
  const [announcement, setAnnouncement] = useState<Record<string, unknown>>(
    initial.announcement && typeof initial.announcement === 'object' ? initial.announcement : {},
  );
  const [tabs, setTabs] = useState<Record<string, unknown>[]>(
    Array.isArray(initial.tabs) ? initial.tabs : [],
  );
  const [status, setStatus] = useState<SaveStatus>('idle');

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstRun = useRef(true);

  // Debounced autosave whenever the announcement or tabs change (skip initial mount).
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    setStatus('saving');
    timer.current = setTimeout(() => {
      saveHeaderGlobal({ announcement, tabs })
        .then(() => setStatus('saved'))
        .catch(() => setStatus('error'));
    }, 800);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [announcement, tabs]);

  const save = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    setStatus('saving');
    try {
      await saveHeaderGlobal({ announcement, tabs });
      setStatus('saved');
    } catch {
      setStatus('error');
    }
  }, [announcement, tabs]);

  // The announcement group is a single object: FieldRenderer edits it as top-level fields,
  // so map its inner fields to the panel and merge changes back into the object.
  const onAnnouncementChange = (name: string, value: unknown): void =>
    setAnnouncement((prev) => ({ ...prev, [name]: value }));

  // The tabs array is driven by a one-field schema whose sole field is the `tabs` array,
  // so FieldRenderer renders the add/remove/reorder ArrayField. onChange replaces the array.
  const onTabsChange = (_name: string, value: unknown): void =>
    setTabs(Array.isArray(value) ? (value as Record<string, unknown>[]) : []);

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center gap-4 border-b border-warm-200 bg-white px-4 py-2">
        <a href="/admin/globals/site-header" className="text-sm text-warm-500 hover:underline">
          ← Back
        </a>
        <span className="font-semibold text-warm-900">Header &amp; navigation</span>
        <span className="ml-auto text-xs text-warm-400">
          {status === 'saving' && 'Saving...'}
          {status === 'saved' && 'All changes saved'}
          {status === 'error' && 'Save failed -- retry'}
        </span>
        <button
          type="button"
          onClick={save}
          className="rounded bg-warm-900 px-3 py-1 text-sm text-white"
        >
          Save
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="flex w-96 flex-col overflow-auto border-r border-warm-200 bg-white">
          <FieldRenderer
            schema={announcementSchema}
            values={announcement}
            onChange={onAnnouncementChange}
          />
        </aside>
        <main className="flex-1 overflow-auto bg-warm-50">
          <div className="mx-auto max-w-2xl">
            <FieldRenderer schema={tabsSchema} values={{ tabs }} onChange={onTabsChange} />
            <p className="px-4 pb-8 text-xs text-warm-400">
              These custom tabs appear after the built-in Home / Shop / Categories tabs. The
              default tabs cannot be removed. Changes save automatically.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
