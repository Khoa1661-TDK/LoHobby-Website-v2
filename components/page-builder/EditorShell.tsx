// components/page-builder/EditorShell.tsx — client root of the visual builder.
// Canvas is a server-rendered iframe; structural editing is in the layers rail;
// field editing in the right panel. No block components are imported here, so no
// server-only code leaks into the client bundle.
'use client';
import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';
import type { PageDoc, PageBlock } from '@/lib/page-builder';
import type { BlockSchema } from '@/lib/page-builder/block-schemas';
import type { ThemeMode } from '@/lib/page-builder/themed-color';
import FieldRenderer from './FieldRenderer';
import LayersRail from './LayersRail';
import AddSectionPicker from './AddSectionPicker';
import { updateBlockField, insertBlock, moveBlock, duplicateBlock, deleteBlock } from '@/lib/page-builder/layout-reducer';
import { createDefaultBlock } from '@/lib/page-builder/default-block';
import { useAutosave } from './use-autosave';
import AssistantPanel from './AssistantPanel';
import { highlight, setLayout as setLayoutMsg, setTheme, isPreviewToParent } from '@/lib/page-builder/preview-messages';
import { routing } from '@/i18n/routing';

type Props = { locale: string; page: PageDoc; schemas: BlockSchema[] };

export default function EditorShell({ locale, page, schemas }: Props): ReactElement {
  const [layout, setLayout] = useState<PageBlock[]>(page.layout);
  const [title, setTitle] = useState<string>(page.title);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [addAt, setAddAt] = useState<number | null>(null);
  const [themeMode, setThemeMode] = useState<ThemeMode>('light');
  const [undoSnapshot, setUndoSnapshot] = useState<PageBlock[] | null>(null);
  const { status, publish } = useAutosave(page.id, layout, title, locale, schemas);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const readyRef = useRef(false);

  const post = useCallback((msg: ReturnType<typeof highlight> | ReturnType<typeof setLayoutMsg> | ReturnType<typeof setTheme>): void => {
    iframeRef.current?.contentWindow?.postMessage(msg, window.location.origin);
  }, []);

  // Receive select/ready from the iframe.
  useEffect(() => {
    function onMessage(event: MessageEvent): void {
      if (event.origin !== window.location.origin) return;
      const msg = event.data;
      if (!isPreviewToParent(msg)) return;
      if (msg.type === 'select') setSelectedIndex(msg.index);
      if (msg.type === 'ready') {
        readyRef.current = true;
        post(setTheme(themeMode));
        // Sync the iframe to current editor state on (re)load.
        post(setLayoutMsg(layout));
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [post, themeMode, layout]);

  // Mirror selection into the iframe.
  useEffect(() => {
    if (readyRef.current) post(highlight(selectedIndex));
  }, [selectedIndex, post]);

  // Reflect the editor theme mode into the preview iframe.
  useEffect(() => {
    if (readyRef.current) post(setTheme(themeMode));
  }, [themeMode, post]);

  // Push layout into the preview iframe on every change so edits reflect live, decoupled
  // from autosave. On (re)load the ready handler also syncs the iframe to current state.
  useEffect(() => {
    if (readyRef.current) post(setLayoutMsg(layout));
  }, [layout, post]);

  const handlePick = (slug: string): void => {
    const block = createDefaultBlock(slug);
    if (block && addAt !== null) {
      setLayout((prev) => insertBlock(prev, addAt, block));
      setSelectedIndex(addAt);
    }
    setAddAt(null);
  };

  const handleFieldChange = (name: string, value: unknown): void => {
    if (selectedIndex === null) return;
    setLayout((prev) => updateBlockField(prev, selectedIndex, name, value));
  };

  const selectedBlock = selectedIndex !== null ? layout[selectedIndex] : null;
  const selectedSchema = selectedBlock ? schemas.find((s) => s.slug === selectedBlock.blockType) ?? null : null;

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center gap-4 border-b border-warm-200 bg-white px-4 py-2">
        <a href="/admin/collections/pages" className="text-sm text-warm-500 hover:underline">← Back</a>
        <input
          aria-label="Page title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="min-w-0 flex-1 max-w-xs rounded border border-transparent bg-transparent px-2 py-1 font-semibold hover:border-warm-200 focus:border-warm-300 focus:outline-none"
        />
        <span className="rounded-full bg-warm-100 px-2 py-0.5 text-xs uppercase text-warm-500">{page.status}</span>
        <div
          role="group"
          aria-label="Editing language"
          className="flex items-center gap-1 rounded-full border border-warm-200 p-0.5"
        >
          {routing.locales.map((code) => (
            <a
              key={code}
              href={`/${code}/build/${page.slug}`}
              aria-current={code === locale ? 'true' : undefined}
              className={
                code === locale
                  ? 'rounded-full bg-warm-900 px-2.5 py-0.5 text-xs font-semibold uppercase text-white'
                  : 'rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase text-warm-500 hover:text-warm-800'
              }
            >
              {code}
            </a>
          ))}
        </div>
        <div
          role="group"
          aria-label="Editing theme"
          className="flex items-center gap-1 rounded-full border border-warm-200 p-0.5"
        >
          {(['light', 'dark'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setThemeMode(mode)}
              aria-pressed={mode === themeMode}
              className={
                mode === themeMode
                  ? 'rounded-full bg-warm-900 px-2.5 py-0.5 text-xs font-semibold uppercase text-white'
                  : 'rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase text-warm-500 hover:text-warm-800'
              }
            >
              {mode}
            </button>
          ))}
        </div>
        <a
          href={`/admin/collections/pages/${page.id}`}
          className="text-xs text-warm-500 hover:underline"
        >
          Advanced settings
        </a>
        <span className="ml-auto text-xs text-warm-400">
          {status === 'saving' && 'Saving...'}
          {status === 'saved' && 'All changes saved'}
          {status === 'error' && 'Save failed -- retry'}
        </span>
        <button type="button" onClick={publish} className="rounded bg-warm-900 px-3 py-1 text-sm text-white">
          Publish
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <LayersRail
          layout={layout}
          schemas={schemas}
          selectedIndex={selectedIndex}
          onSelect={setSelectedIndex}
          onReorder={(from, to) => { setLayout((prev) => moveBlock(prev, from, to)); setSelectedIndex(to); }}
          onDuplicate={(index) => setLayout((prev) => duplicateBlock(prev, index))}
          onDelete={(index) => { setLayout((prev) => deleteBlock(prev, index)); setSelectedIndex(null); }}
          onAdd={(at) => setAddAt(at)}
        />

        <main className="flex-1 overflow-hidden bg-warm-50">
          <iframe
            ref={iframeRef}
            title="Page preview"
            src={`/${locale}/build/${page.slug}/preview`}
            className="h-full w-full border-0 bg-white"
          />
        </main>

        <aside className="flex w-80 flex-col overflow-auto border-l border-warm-200 bg-white">
          {selectedBlock && selectedSchema ? (
            <FieldRenderer
              schema={selectedSchema}
              values={selectedBlock as Record<string, unknown>}
              onChange={handleFieldChange}
              themeMode={themeMode}
            />
          ) : (
            <p className="p-4 text-sm text-warm-400">Select a section to edit its fields.</p>
          )}
          {undoSnapshot && (
            <button
              type="button"
              onClick={() => { setLayout(undoSnapshot); setUndoSnapshot(null); }}
              className="m-3 rounded border border-warm-300 px-2 py-1 text-xs text-warm-600"
            >
              Undo last AI change
            </button>
          )}
          <AssistantPanel
            layout={layout}
            locale={locale}
            onApply={setLayout}
            onBeforeRun={() => setUndoSnapshot(layout)}
          />
        </aside>
      </div>

      {addAt !== null && (
        <AddSectionPicker schemas={schemas} onPick={handlePick} onClose={() => setAddAt(null)} />
      )}
    </div>
  );
}
