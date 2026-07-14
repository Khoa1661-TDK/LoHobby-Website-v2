// components/page-builder/AssistantPanel.tsx — Gemini-styled chat panel that drives the
// layout. Renders a scrollable transcript (user prompts, markdown-lite assistant replies,
// and compact change-feed cards) above a pill input. Text streams in token-by-token; the
// trailing `summary` event replaces the streamed text with the authoritative copy. The
// transcript (minus attached images) persists per page id in localStorage.
'use client';
import { useEffect, useRef, useState, type ReactElement } from 'react';
import { applyDualMutation, type LocaleLayouts } from '@/lib/page-builder/assistant/apply-dual';
import { parseAssistantStream } from '@/lib/page-builder/assistant/parse-stream';
import type { Mutation } from '@/lib/page-builder/assistant/validate';
import { renderMarkdownLite } from '@/lib/page-builder/assistant/markdown-lite';
import type { Locale } from '@/i18n/routing';
import type { PageBlock } from '@/lib/page-builder';
import GeminiSpark from './GeminiSpark';

type Attachment = { id: string; dataUrl: string };

// Transcript entries. `change` cards summarize a mutation; `user`/`assistant` are chat.
type ChatEntry =
  | { kind: 'user'; text: string; images?: string[] }
  | { kind: 'assistant'; id?: string; text: string; error?: boolean; streaming?: boolean }
  | { kind: 'change'; symbol: string; label: string; index: number | null; locales: string };

type Props = {
  layouts: LocaleLayouts;
  activeLocale: Locale;
  onApply: (next: LocaleLayouts) => void;
  onBeforeRun: () => void;
  // Phase B additions (all optional so existing callers/tests keep compiling):
  pageId?: string | number;
  onSelectBlock?: (index: number) => void;
  onClose?: () => void;
  mode?: 'float' | 'dock';
  onToggleMode?: () => void;
  undoAvailable?: boolean;
  onUndo?: () => void;
};

// Mirror of the server caps (route.ts) so we reject oversized/wrong-type files before
// uploading rather than having the server silently drop them.
const MAX_IMAGES = 4;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ACCEPTED = /^image\/(png|jpeg|jpg|webp|gif)$/;

const LOCALE_LABEL: Record<Locale, string> = { vi: 'Vietnamese', en: 'English' };

function historyKey(pageId: string | number | undefined): string {
  return `pb-assistant-history:${pageId ?? 'default'}`;
}

function uid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file.'));
    reader.readAsDataURL(file);
  });
}

/** Prettify a blockType slug for a change-feed label: `productShowcase` → `Product Showcase`. */
function prettifyBlockType(blockType?: string): string {
  if (!blockType) return 'Section';
  const spaced = blockType.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[-_]+/g, ' ').trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** `['vi','en']` → `(vi+en)`, `['vi']` → `(vi)`. */
function localesSuffix(locales: Locale[]): string {
  const uniq = [...new Set(locales)];
  return uniq.length >= 2 ? '(vi+en)' : `(${uniq[0] ?? ''})`;
}

/** Build a compact change-feed card for a mutation, using the pre-mutation layout of the
 *  active locale to resolve the block-type label for index-only mutations. */
function describeMutation(
  mutation: Mutation,
  locales: Locale[],
  beforeLayout: PageBlock[],
): { symbol: string; label: string; index: number | null; locales: string } {
  const suffix = localesSuffix(locales);
  switch (mutation.kind) {
    case 'add': {
      const label = prettifyBlockType((mutation.block as { blockType?: string }).blockType);
      return { symbol: '+', label: `${label} added`, index: mutation.index, locales: suffix };
    }
    case 'update': {
      const label = prettifyBlockType(beforeLayout[mutation.index]?.blockType);
      return { symbol: '~', label: `${label} updated`, index: mutation.index, locales: suffix };
    }
    case 'move': {
      const label = prettifyBlockType(beforeLayout[mutation.from]?.blockType);
      return { symbol: '↕', label: `${label} moved`, index: mutation.to, locales: suffix };
    }
    case 'remove': {
      const label = prettifyBlockType(beforeLayout[mutation.index]?.blockType);
      return { symbol: '✕', label: `${label} removed`, index: null, locales: suffix };
    }
    case 'duplicate': {
      const label = prettifyBlockType(beforeLayout[mutation.index]?.blockType);
      return { symbol: '⧉', label: `${label} duplicated`, index: mutation.index, locales: suffix };
    }
  }
}

/** Serializable subset of the transcript — drops attached images and transient stream flags. */
function persistable(entries: ChatEntry[]): ChatEntry[] {
  return entries.map((e) => {
    if (e.kind === 'user') return { kind: 'user', text: e.text };
    if (e.kind === 'assistant') return { kind: 'assistant', text: e.text, error: e.error };
    return e;
  });
}

function loadHistory(pageId: string | number | undefined): ChatEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(historyKey(pageId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ChatEntry[]) : [];
  } catch {
    return [];
  }
}

export default function AssistantPanel({
  layouts,
  activeLocale,
  onApply,
  onBeforeRun,
  pageId,
  onSelectBlock,
  onClose,
  mode = 'float',
  onToggleMode,
  undoAvailable,
  onUndo,
}: Props): ReactElement {
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<ChatEntry[]>(() => loadHistory(pageId));
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const logRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const streamIdRef = useRef<string | null>(null);

  const otherLocale: Locale = activeLocale === 'vi' ? 'en' : 'vi';

  // Persist the transcript (sans images) whenever it changes, keyed by page id.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(historyKey(pageId), JSON.stringify(persistable(messages)));
    } catch {
      // Storage full / disabled — persistence is best-effort, keep the session going.
    }
  }, [messages, pageId]);

  // Keep the transcript scrolled to the latest message.
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [messages, busy]);

  async function addFiles(files: FileList | File[]): Promise<void> {
    const incoming = Array.from(files).filter((f) => ACCEPTED.test(f.type) && f.size <= MAX_IMAGE_BYTES);
    if (incoming.length === 0) return;
    const room = Math.max(0, MAX_IMAGES - attachments.length);
    const dataUrls = await Promise.all(incoming.slice(0, room).map(readAsDataUrl));
    setAttachments((prev) => [
      ...prev,
      ...dataUrls.map((dataUrl) => ({ id: uid(), dataUrl })),
    ]);
  }

  function onPaste(e: React.ClipboardEvent): void {
    const files = Array.from(e.clipboardData.files);
    if (files.length > 0) {
      e.preventDefault();
      void addFiles(files);
    }
  }

  function removeAttachment(id: string): void {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }

  function clearHistory(): void {
    setMessages([]);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(historyKey(pageId));
      } catch {
        /* best-effort */
      }
    }
  }

  function fillPrompt(text: string): void {
    setPrompt(text);
    textareaRef.current?.focus();
  }

  // Quick-action chips. Each prewrites a prompt (or, for "Build from image", opens the
  // file picker) so a click primes the input the user can edit before sending.
  const chips: Array<{ label: string; run: () => void }> = [
    {
      label: `Translate page to ${LOCALE_LABEL[otherLocale]}`,
      run: () =>
        fillPrompt(
          `Translate the entire page into ${LOCALE_LABEL[otherLocale]} (${otherLocale}), keeping the block structure identical.`,
        ),
    },
    { label: 'Build from image', run: () => fileInputRef.current?.click() },
    {
      label: 'Add product section',
      run: () => fillPrompt('Add a product showcase section featuring our products.'),
    },
    {
      label: 'Match dark mode to light',
      run: () => fillPrompt('Match every section’s dark-mode appearance to its light-mode styling.'),
    },
  ];

  async function run(): Promise<void> {
    const text = prompt.trim();
    if ((!text && attachments.length === 0) || busy) return;
    const images = attachments.map((a) => a.dataUrl);
    setBusy(true);
    setMessages((prev) => [...prev, { kind: 'user', text, images }]);
    setPrompt('');
    setAttachments([]);
    streamIdRef.current = null;
    onBeforeRun();
    // Local working copies so each mutation builds on the previous one this turn, routed
    // to the right locale(s) exactly as the server does.
    let working: LocaleLayouts = { vi: layouts.vi, en: layouts.en };
    try {
      const res = await fetch('/api/page-builder/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ prompt: text, layouts, activeLocale, images }),
      });
      if (!res.ok || !res.body) {
        setMessages((prev) => [...prev, { kind: 'assistant', text: `Request failed (${res.status}).`, error: true }]);
        return;
      }
      for await (const event of parseAssistantStream(res.body)) {
        if (event.type === 'mutation') {
          const card = describeMutation(event.mutation, event.locales, working[activeLocale]);
          working = applyDualMutation(working, event.mutation, activeLocale);
          onApply(working);
          setMessages((prev) => [...prev, { kind: 'change', ...card }]);
        } else if (event.type === 'token') {
          if (!streamIdRef.current) streamIdRef.current = uid();
          const id = streamIdRef.current;
          setMessages((prev) => {
            const exists = prev.some((m) => m.kind === 'assistant' && m.id === id);
            if (!exists) return [...prev, { kind: 'assistant', id, text: event.text, streaming: true }];
            return prev.map((m) =>
              m.kind === 'assistant' && m.id === id ? { ...m, text: m.text + event.text } : m,
            );
          });
        } else if (event.type === 'summary') {
          const id = streamIdRef.current;
          setMessages((prev) => {
            if (id && prev.some((m) => m.kind === 'assistant' && m.id === id)) {
              return prev.map((m) =>
                m.kind === 'assistant' && m.id === id ? { ...m, text: event.text, streaming: false } : m,
              );
            }
            return [...prev, { kind: 'assistant', text: event.text }];
          });
          streamIdRef.current = null;
        } else if (event.type === 'error') {
          setMessages((prev) => [...prev, { kind: 'assistant', text: event.error, error: true }]);
        }
      }
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { kind: 'assistant', text: e instanceof Error ? e.message : 'Assistant failed.', error: true },
      ]);
    } finally {
      streamIdRef.current = null;
      setBusy(false);
    }
  }

  const canSend = !busy && (prompt.trim().length > 0 || attachments.length > 0);

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-gemini-bg text-gemini-text">
      {/* Header — spark logo, title, dock/float + undo + clear + close controls. */}
      <div className="flex items-center gap-2 border-b border-gemini-border px-3 py-2">
        <GeminiSpark size={18} />
        <span className="text-sm font-semibold text-gemini-text">AI helper</span>
        <div className="ml-auto flex items-center gap-1">
          {undoAvailable && onUndo && (
            <button
              type="button"
              onClick={onUndo}
              className="rounded-md border border-gemini-border px-2 py-0.5 text-xs text-gemini-muted transition-colors hover:bg-gemini-raised hover:text-gemini-text"
            >
              Undo
            </button>
          )}
          <button
            type="button"
            onClick={clearHistory}
            aria-label="Clear history"
            className="rounded-md px-2 py-1 text-xs text-gemini-muted transition-colors hover:bg-gemini-raised hover:text-gemini-text"
          >
            Clear history
          </button>
          {onToggleMode && (
            <button
              type="button"
              onClick={onToggleMode}
              aria-label={mode === 'dock' ? 'Float panel' : 'Dock panel'}
              aria-pressed={mode === 'dock'}
              className="rounded-md p-1 text-gemini-muted transition-colors hover:bg-gemini-raised hover:text-gemini-text"
            >
              {mode === 'dock' ? '⧉' : '⇥'}
            </button>
          )}
          {onClose && (
            <button
              type="button"
              aria-label="Close AI helper"
              onClick={onClose}
              className="rounded-md p-1 text-gemini-muted transition-colors hover:bg-gemini-raised hover:text-gemini-text"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Context bar — what the assistant currently sees / edits. */}
      <div className="border-b border-gemini-border px-3 py-1.5 text-[11px] text-gemini-muted">
        sees vi + en · light + dark · editing {activeLocale.toUpperCase()}
      </div>

      <div ref={logRef} className="flex-1 space-y-2 overflow-y-auto p-3">
        {messages.length === 0 ? (
          <p className="text-xs text-gemini-muted">
            Describe the page or change you want — or attach a screenshot to reproduce — and I&apos;ll build it.
          </p>
        ) : (
          messages.map((m, i) => {
            if (m.kind === 'change') {
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    if (m.index !== null) onSelectBlock?.(m.index);
                  }}
                  disabled={m.index === null}
                  className="flex w-full items-center gap-2 rounded-lg border border-gemini-border bg-gemini-surface px-2.5 py-1.5 text-left text-xs text-gemini-text transition-colors enabled:hover:bg-gemini-raised disabled:cursor-default"
                >
                  <span className="font-mono text-gemini-muted">{m.symbol}</span>
                  <span className="flex-1 truncate">{m.label}</span>
                  <span className="text-gemini-muted">{m.locales}</span>
                </button>
              );
            }
            return (
              <div
                key={i}
                className={`assistant-msg flex ${m.kind === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={
                    m.kind === 'user'
                      ? 'max-w-[85%] rounded-2xl bg-gemini-bubble px-3 py-1.5 text-sm text-gemini-text'
                      : m.error
                        ? 'max-w-[85%] rounded-2xl bg-gemini-raised px-3 py-1.5 text-sm text-gemini-pink'
                        : 'max-w-[90%] rounded-2xl px-1 py-0.5 text-sm text-gemini-text'
                  }
                >
                  {m.kind === 'user' && m.images && m.images.length > 0 && (
                    <div className="mb-1 flex flex-wrap gap-1">
                      {m.images.map((src, j) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={j} src={src} alt="Attached reference" className="h-12 w-12 rounded object-cover" />
                      ))}
                    </div>
                  )}
                  {m.kind === 'assistant' && !m.error && !m.streaming ? (
                    <div className="space-y-1 leading-relaxed">{renderMarkdownLite(m.text)}</div>
                  ) : (
                    m.text && <span>{m.text}</span>
                  )}
                  {m.kind === 'assistant' && m.streaming && (
                    <span className="ml-0.5 inline-block h-3 w-0.5 animate-pulse bg-gemini-muted align-middle" />
                  )}
                </div>
              </div>
            );
          })
        )}
        {busy && (
          <div className="flex items-center gap-1.5 px-1 text-xs text-gemini-muted" aria-live="polite">
            <GeminiSpark size={14} className="animate-pulse" />
            <span className="ml-1">Working…</span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 border-t border-gemini-border p-3">
        {/* Quick-action chips. */}
        <div className="flex flex-wrap gap-1.5">
          {chips.map((chip) => (
            <button
              key={chip.label}
              type="button"
              onClick={chip.run}
              disabled={busy}
              className="rounded-full border border-gemini-border bg-gemini-surface px-2.5 py-1 text-xs text-gemini-muted transition-colors hover:bg-gemini-raised hover:text-gemini-text disabled:opacity-50"
            >
              {chip.label}
            </button>
          ))}
        </div>

        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {attachments.map((a) => (
              <div key={a.id} className="relative h-14 w-14">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={a.dataUrl} alt="Attachment preview" className="h-14 w-14 rounded border border-gemini-border object-cover" />
                <button
                  type="button"
                  aria-label="Remove attachment"
                  onClick={() => removeAttachment(a.id)}
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-gemini-bubble text-xs leading-none text-gemini-text shadow transition-transform hover:scale-110"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Pill input row: rounded field + attach + gradient send button. */}
        <div className="flex items-end gap-2 rounded-3xl border border-gemini-border bg-gemini-surface px-3 py-2">
          <button
            type="button"
            aria-label="Attach images"
            onClick={() => fileInputRef.current?.click()}
            disabled={busy || attachments.length >= MAX_IMAGES}
            className="shrink-0 rounded-full p-1 text-gemini-muted transition-colors hover:bg-gemini-raised hover:text-gemini-text disabled:opacity-50"
          >
            🖼
          </button>
          <textarea
            ref={textareaRef}
            className="max-h-32 min-h-6 w-full resize-none bg-transparent text-sm text-gemini-text placeholder:text-gemini-muted focus:outline-none"
            rows={1}
            placeholder="Describe the page or change you want…"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onPaste={onPaste}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void run();
              }
            }}
            disabled={busy}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            multiple
            aria-label="Image file input"
            className="hidden"
            onChange={(e) => {
              if (e.target.files) void addFiles(e.target.files);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            aria-label="Send message"
            onClick={run}
            disabled={!canSend}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white transition-all active:scale-95 disabled:opacity-40 disabled:active:scale-100"
            style={{
              backgroundImage:
                'linear-gradient(135deg, var(--gemini-blue), var(--gemini-purple), var(--gemini-pink))',
            }}
          >
            {busy ? (
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <span className="text-sm leading-none">↑</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
