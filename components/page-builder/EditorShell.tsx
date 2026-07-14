// components/page-builder/EditorShell.tsx — client root of the visual builder.
// Canvas is a server-rendered iframe; structural editing is in the layers rail;
// field editing in the right panel. No block components are imported here, so no
// server-only code leaks into the client bundle.
'use client';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
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
import GeminiSpark from './GeminiSpark';
import { highlight, setLayout as setLayoutMsg, setTheme, isPreviewToParent } from '@/lib/page-builder/preview-messages';
import { routing, type Locale } from '@/i18n/routing';
import type { LocaleLayouts } from '@/lib/page-builder/assistant/apply-dual';
import { isStructurallyAligned, syncFromActive } from '@/lib/page-builder/mirror/structure-sync';

type Props = {
  locale: string;
  page: PageDoc;
  otherLocale: Locale;
  otherLayout: PageBlock[];
  otherTitle: string;
  schemas: BlockSchema[];
};

export default function EditorShell({ locale, page, otherLocale, otherLayout, schemas }: Props): ReactElement {
  const activeLocale = locale as Locale;
  // Both locale layouts are held in parallel. The active one drives the preview iframe and
  // the field panel exactly as before; structural edits (manual or AI) apply to both in
  // lockstep, field edits only to the active locale.
  const [layouts, setLayouts] = useState<LocaleLayouts>(() => {
    const init: LocaleLayouts = { vi: [], en: [] };
    init[activeLocale] = page.layout;
    init[otherLocale] = otherLayout;
    return init;
  });
  const layout = layouts[activeLocale];
  const [title, setTitle] = useState<string>(page.title);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [addAt, setAddAt] = useState<number | null>(null);
  const [themeMode, setThemeMode] = useState<ThemeMode>('light');
  const [undoSnapshot, setUndoSnapshot] = useState<LocaleLayouts | null>(null);
  const [assistantOpen, setAssistantOpen] = useState(false);
  // Float (default) vs dock-as-right-column, plus the docked column width. Both are a UI
  // preference persisted globally (not per page) in localStorage.
  const [panelMode, setPanelMode] = useState<'float' | 'dock'>('float');
  const [dockWidth, setDockWidth] = useState(384);
  const { status, publish } = useAutosave(page.id, layouts, title, activeLocale, otherLocale, schemas);

  // Restore persisted panel mode + dock width on mount.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedMode = window.localStorage.getItem('pb-assistant-mode');
    if (savedMode === 'dock' || savedMode === 'float') setPanelMode(savedMode);
    const savedWidth = Number(window.localStorage.getItem('pb-assistant-dock-width'));
    if (Number.isFinite(savedWidth) && savedWidth >= 300 && savedWidth <= 640) setDockWidth(savedWidth);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') window.localStorage.setItem('pb-assistant-mode', panelMode);
  }, [panelMode]);
  useEffect(() => {
    if (typeof window !== 'undefined') window.localStorage.setItem('pb-assistant-dock-width', String(dockWidth));
  }, [dockWidth]);

  // Drag the dock's left edge to resize. Width grows as the pointer moves left.
  const startDockResize = useCallback((e: React.PointerEvent): void => {
    e.preventDefault();
    const onMove = (ev: PointerEvent): void => {
      const next = Math.max(300, Math.min(640, window.innerWidth - ev.clientX));
      setDockWidth(next);
    };
    const onUp = (): void => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, []);

  const undoLastChange = useCallback((): void => {
    if (undoSnapshot) {
      setLayouts(undoSnapshot);
      setUndoSnapshot(null);
    }
  }, [undoSnapshot]);
  const togglePanelMode = useCallback(
    () => setPanelMode((m) => (m === 'float' ? 'dock' : 'float')),
    [],
  );

  // Apply a reducer to only the active locale's layout (field edits).
  const setActiveLayout = useCallback(
    (fn: (blocks: PageBlock[]) => PageBlock[]): void => {
      setLayouts((prev) => ({ ...prev, [activeLocale]: fn(prev[activeLocale]) }));
    },
    [activeLocale],
  );

  // Apply the same structural reducer to BOTH locales, keeping indices in lockstep.
  const applyStructural = useCallback((fn: (blocks: PageBlock[]) => PageBlock[]): void => {
    setLayouts((prev) => ({ vi: fn(prev.vi), en: fn(prev.en) }));
  }, []);

  // Structural guard: lockstep edits are index-based, so they only stay correct while the two
  // locale layouts are aligned (same length + blockKey at each position). A page whose locales
  // drifted apart (legacy data, single-locale admin edit, duplicate-key bug) is misaligned;
  // while misaligned we pause every structural + AI edit and prompt the user to sync structure
  // from the active locale, rather than silently corrupting the other language.
  const structuralLocked = useMemo(
    () => !isStructurallyAligned(layouts.vi, layouts.en),
    [layouts.vi, layouts.en],
  );
  const syncStructure = useCallback((): void => {
    setLayouts((prev) => {
      const { active, other } = syncFromActive(prev[activeLocale], prev[otherLocale]);
      const next: LocaleLayouts = { ...prev };
      next[activeLocale] = active;
      next[otherLocale] = other;
      return next;
    });
  }, [activeLocale, otherLocale]);

  // If the page loads misaligned with the assistant somehow open, close it — its mutations are
  // index-based and unsafe until structure is synced.
  useEffect(() => {
    if (structuralLocked) setAssistantOpen(false);
  }, [structuralLocked]);

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
    if (structuralLocked) { setAddAt(null); return; }
    const block = createDefaultBlock(slug);
    if (block && addAt !== null) {
      // Insert into both locales at the same index, sharing one blockKey so the pair stays
      // linked. The other locale gets a clone (same key) — same default copy until localized
      // (accepted trade-off; the assistant writes proper per-locale copy directly).
      const at = addAt;
      setLayouts((prev) => ({
        vi: insertBlock(prev.vi, at, activeLocale === 'vi' ? block : (structuredClone(block) as PageBlock)),
        en: insertBlock(prev.en, at, activeLocale === 'en' ? block : (structuredClone(block) as PageBlock)),
      }));
      setSelectedIndex(addAt);
    }
    setAddAt(null);
  };

  const handleFieldChange = (name: string, value: unknown): void => {
    if (selectedIndex === null) return;
    setActiveLayout((prev) => updateBlockField(prev, selectedIndex, name, value));
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
        <a
          href={`/${locale}/build/header`}
          className="text-xs text-warm-500 hover:underline"
        >
          Edit header &amp; nav
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

      {structuralLocked && (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900"
        >
          <span className="font-medium">⚠ Section structures differ between languages.</span>
          <span className="text-amber-800">
            Structural edits (add, reorder, duplicate, delete) and the AI helper are paused so a
            change here can&apos;t corrupt the other language. Copy edits still work.
          </span>
          <button
            type="button"
            onClick={syncStructure}
            className="ml-auto rounded bg-amber-900 px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-amber-800"
          >
            Sync structure from {activeLocale.toUpperCase()}
          </button>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <LayersRail
          layout={layout}
          schemas={schemas}
          selectedIndex={selectedIndex}
          onSelect={setSelectedIndex}
          onReorder={(from, to) => { applyStructural((prev) => moveBlock(prev, from, to)); setSelectedIndex(to); }}
          onDuplicate={(index) => applyStructural((prev) => duplicateBlock(prev, index))}
          onDelete={(index) => { applyStructural((prev) => deleteBlock(prev, index)); setSelectedIndex(null); }}
          onAdd={(at) => setAddAt(at)}
          locked={structuralLocked}
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
        </aside>

        {/* Docked assistant — a resizable right-hand column beside the field panel. Only
            mounted in dock mode when open; float mode renders the fixed window below. */}
        {panelMode === 'dock' && assistantOpen && (
          <div
            className="relative flex shrink-0 flex-col overflow-hidden border-l border-gemini-border"
            style={{ width: `${dockWidth}px` }}
          >
            <div
              role="separator"
              aria-label="Resize assistant panel"
              onPointerDown={startDockResize}
              className="absolute left-0 top-0 z-10 h-full w-1 cursor-col-resize bg-transparent hover:bg-gemini-border"
            />
            <AssistantPanel
              layouts={layouts}
              activeLocale={activeLocale}
              onApply={setLayouts}
              onBeforeRun={() => setUndoSnapshot(layouts)}
              pageId={page.id}
              onSelectBlock={setSelectedIndex}
              onClose={() => setAssistantOpen(false)}
              mode="dock"
              onToggleMode={togglePanelMode}
              undoAvailable={undoSnapshot !== null}
              onUndo={undoLastChange}
            />
          </div>
        )}
      </div>

      {/* AI helper (float mode): a toggleable floating window, decoupled from the fixed
          sidebar. Kept mounted so the conversation and any attachments survive open/close;
          visibility and the slide/scale animation are driven by the .assistant-panel CSS
          class. In dock mode this is not rendered — the docked column above takes over. */}
      {panelMode === 'float' && (
        <div
          className="assistant-panel fixed bottom-20 right-4 z-40 flex h-[32rem] w-96 flex-col overflow-hidden rounded-2xl border border-gemini-border bg-gemini-bg shadow-2xl"
          data-open={assistantOpen}
          aria-hidden={!assistantOpen}
        >
          <AssistantPanel
            layouts={layouts}
            activeLocale={activeLocale}
            onApply={setLayouts}
            onBeforeRun={() => setUndoSnapshot(layouts)}
            pageId={page.id}
            onSelectBlock={setSelectedIndex}
            onClose={() => setAssistantOpen(false)}
            mode="float"
            onToggleMode={togglePanelMode}
            undoAvailable={undoSnapshot !== null}
            onUndo={undoLastChange}
          />
        </div>
      )}
      <button
        type="button"
        aria-label={assistantOpen ? 'Close AI helper' : 'Open AI helper'}
        aria-pressed={assistantOpen}
        disabled={structuralLocked}
        title={structuralLocked ? 'Sync structure first to use the AI helper' : undefined}
        onClick={() => setAssistantOpen((v) => !v)}
        className="fixed bottom-4 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-gemini-surface shadow-lg ring-1 ring-gemini-border transition-all duration-200 hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
      >
        {assistantOpen ? (
          <span className="text-lg text-gemini-text">✕</span>
        ) : (
          <GeminiSpark size={24} />
        )}
      </button>

      {addAt !== null && (
        <AddSectionPicker schemas={schemas} onPick={handlePick} onClose={() => setAddAt(null)} />
      )}
    </div>
  );
}
