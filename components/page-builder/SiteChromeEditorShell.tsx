// components/page-builder/SiteChromeEditorShell.tsx — SharePoint-style site-chrome editor.
// A live storefront preview iframe fills the surface; a dockable right panel holds
// Header / Footer / Branding tabs, each rendering page-builder FieldRenderer panels.
// State is one full doc per global; edits autosave the full doc to that global (globals
// have no draft state), then the iframe reloads to re-render the real chrome.
'use client';
import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';
import type { BlockSchema } from '@/lib/page-builder/block-schemas';
import { saveChromeGlobal } from '@/lib/page-builder/save-chrome';
import FieldRenderer from './FieldRenderer';

export type ChromeGlobalSlug = 'site-header' | 'store-settings' | 'navigation';

export type ChromePanel = {
  key: string;
  slug: ChromeGlobalSlug;
  schema: BlockSchema;
  get: (doc: Record<string, unknown>) => Record<string, unknown>;
  set: (doc: Record<string, unknown>, name: string, value: unknown) => Record<string, unknown>;
};

export type ChromeTab = { id: string; label: string; panels: ChromePanel[] };

export type SiteChromeEditorProps = {
  locale: string;
  tabs: ChromeTab[];
  initialDocs: Record<ChromeGlobalSlug, Record<string, unknown>>;
};

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export default function SiteChromeEditorShell({
  locale,
  tabs,
  initialDocs,
}: SiteChromeEditorProps): ReactElement {
  const [activeTab, setActiveTab] = useState(tabs[0]?.id ?? '');
  const [docs, setDocs] = useState(initialDocs);
  // Tracked per-slug: three globals can autosave concurrently on independent timers, and a
  // single shared status would let whichever save resolves LAST clobber an earlier failure
  // with "saved". Keeping one entry per slug means a failed save stays visible until that
  // slug is retried, regardless of what other slugs do.
  const [statuses, setStatuses] = useState<Record<ChromeGlobalSlug, SaveStatus>>({
    'site-header': 'idle',
    'store-settings': 'idle',
    navigation: 'idle',
  });
  const [panelOpen, setPanelOpen] = useState(true);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  // Hold the freshest docs for the debounced save closure without re-arming the timer.
  const docsRef = useRef(docs);
  docsRef.current = docs;

  const reloadPreview = useCallback(() => {
    // Same-origin iframe; re-fetch the server render (post-save, cache already busted).
    iframeRef.current?.contentWindow?.location.reload();
  }, []);

  const scheduleSave = useCallback(
    (slug: ChromeGlobalSlug) => {
      setStatuses((prev) => ({ ...prev, [slug]: 'saving' }));
      if (timers.current[slug]) clearTimeout(timers.current[slug]);
      timers.current[slug] = setTimeout(() => {
        saveChromeGlobal(slug, docsRef.current[slug])
          .then(() => {
            setStatuses((prev) => ({ ...prev, [slug]: 'saved' }));
            reloadPreview();
          })
          .catch(() => setStatuses((prev) => ({ ...prev, [slug]: 'error' })));
      }, 800);
    },
    [reloadPreview],
  );

  useEffect(() => {
    const pending = timers.current;
    return () => {
      Object.values(pending).forEach(clearTimeout);
    };
  }, []);

  const onPanelChange = useCallback(
    (panel: ChromePanel, name: string, value: unknown) => {
      setDocs((prev) => ({ ...prev, [panel.slug]: panel.set(prev[panel.slug], name, value) }));
      scheduleSave(panel.slug);
    },
    [scheduleSave],
  );

  const current = tabs.find((t) => t.id === activeTab) ?? tabs[0];

  // Worst-of across slugs so a lingering error is never masked by a different slug's
  // later success: error beats saving beats saved beats idle.
  const statusValues = Object.values(statuses);
  const status: SaveStatus = statusValues.includes('error')
    ? 'error'
    : statusValues.includes('saving')
      ? 'saving'
      : statusValues.includes('saved')
        ? 'saved'
        : 'idle';

  return (
    <div className="flex h-screen">
      {/* Live preview */}
      <div className="relative flex-1 bg-warm-100">
        <iframe
          ref={iframeRef}
          src={`/${locale}/build/header/preview`}
          title="Storefront preview"
          className="h-full w-full border-0"
        />
        {!panelOpen && (
          <button
            type="button"
            onClick={() => setPanelOpen(true)}
            className="absolute right-4 top-4 rounded bg-warm-900 px-3 py-1 text-sm text-white shadow"
          >
            Edit chrome
          </button>
        )}
      </div>

      {/* Right settings panel */}
      {panelOpen && (
        <aside className="flex w-[380px] shrink-0 flex-col border-l border-warm-200 bg-white">
          <header className="flex items-center gap-2 border-b border-warm-200 px-3 py-2">
            <a href="/admin" className="text-sm text-warm-500 hover:underline">
              ← Admin
            </a>
            <span className="ml-1 font-semibold text-warm-900">Site</span>
            <span className="ml-auto text-xs text-warm-400">
              {status === 'saving' && 'Saving…'}
              {status === 'saved' && 'All changes saved'}
              {status === 'error' && 'Save failed — retry'}
            </span>
            <button
              type="button"
              onClick={() => setPanelOpen(false)}
              aria-label="Hide panel"
              className="rounded px-2 text-warm-500 hover:bg-warm-100"
            >
              ✕
            </button>
          </header>

          {/* Tabs */}
          <nav className="flex border-b border-warm-200">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 px-3 py-2 text-sm font-medium ${
                  tab.id === activeTab
                    ? 'border-b-2 border-warm-900 text-warm-900'
                    : 'text-warm-500 hover:text-warm-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Active tab's panels */}
          <div className="flex-1 overflow-auto">
            {current?.panels.map((panel) => (
              <FieldRenderer
                key={panel.key}
                schema={panel.schema}
                values={panel.get(docs[panel.slug])}
                onChange={(name, value) => onPanelChange(panel, name, value)}
              />
            ))}
          </div>
        </aside>
      )}
    </div>
  );
}
