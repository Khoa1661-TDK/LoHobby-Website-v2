// components/page-builder/AssistantPanel.tsx — chat panel that drives the layout.
// Renders a scrollable conversation log (user prompts + assistant replies) above a
// pinned input. The input accepts a text prompt and/or reference images (file picker or
// paste); images are sent as base64 data URLs to the vision-capable model. History is
// in-memory for the session; a full page reload clears it.
'use client';
import { useEffect, useRef, useState, type ReactElement } from 'react';
import type { PageBlock } from '@/lib/page-builder';
import { applyMutation } from '@/lib/page-builder/assistant/apply';
import { parseAssistantStream } from '@/lib/page-builder/assistant/parse-stream';

type Attachment = { id: string; dataUrl: string };
type Message = { role: 'user' | 'assistant'; text: string; error?: boolean; images?: string[] };

type Props = {
  layout: PageBlock[];
  locale: string;
  onApply: (next: PageBlock[]) => void;
  onBeforeRun: () => void;
};

// Mirror of the server caps (route.ts) so we reject oversized/wrong-type files before
// uploading rather than having the server silently drop them.
const MAX_IMAGES = 4;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ACCEPTED = /^image\/(png|jpeg|jpg|webp|gif)$/;

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file.'));
    reader.readAsDataURL(file);
  });
}

export default function AssistantPanel({ layout, locale, onApply, onBeforeRun }: Props): ReactElement {
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const logRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
      ...dataUrls.map((dataUrl) => ({ id: crypto.randomUUID(), dataUrl })),
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

  async function run(): Promise<void> {
    const text = prompt.trim();
    if ((!text && attachments.length === 0) || busy) return;
    const images = attachments.map((a) => a.dataUrl);
    setBusy(true);
    setMessages((prev) => [...prev, { role: 'user', text, images }]);
    setPrompt('');
    setAttachments([]);
    onBeforeRun();
    // Local working copy so each mutation builds on the previous one this turn.
    let working = layout;
    try {
      const res = await fetch('/api/page-builder/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ prompt: text, layout, locale, images }),
      });
      if (!res.ok || !res.body) {
        setMessages((prev) => [...prev, { role: 'assistant', text: `Request failed (${res.status}).`, error: true }]);
        return;
      }
      for await (const event of parseAssistantStream(res.body)) {
        if (event.type === 'mutation') {
          working = applyMutation(working, event.mutation);
          onApply(working);
        } else if (event.type === 'summary') {
          setMessages((prev) => [...prev, { role: 'assistant', text: event.text }]);
        } else if (event.type === 'error') {
          setMessages((prev) => [...prev, { role: 'assistant', text: event.error, error: true }]);
        }
      }
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: e instanceof Error ? e.message : 'Assistant failed.', error: true },
      ]);
    } finally {
      setBusy(false);
    }
  }

  const canSend = !busy && (prompt.trim().length > 0 || attachments.length > 0);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div ref={logRef} className="flex-1 space-y-2 overflow-y-auto p-3">
        {messages.length === 0 ? (
          <p className="text-xs text-warm-400">
            Describe the page or change you want — or attach a screenshot to reproduce — and I&apos;ll build it.
          </p>
        ) : (
          messages.map((m, i) => (
            <div
              key={i}
              className={`assistant-msg flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={
                  m.role === 'user'
                    ? 'max-w-[85%] rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white'
                    : m.error
                      ? 'max-w-[85%] rounded-lg bg-red-50 px-3 py-1.5 text-sm text-red-700'
                      : 'max-w-[85%] rounded-lg bg-warm-100 px-3 py-1.5 text-sm text-warm-800'
                }
              >
                {m.images && m.images.length > 0 && (
                  <div className="mb-1 flex flex-wrap gap-1">
                    {m.images.map((src, j) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={j}
                        src={src}
                        alt="Attached reference"
                        className="h-12 w-12 rounded object-cover"
                      />
                    ))}
                  </div>
                )}
                {m.text && <span>{m.text}</span>}
              </div>
            </div>
          ))
        )}
        {busy && (
          <div className="flex items-center gap-1.5 px-1 text-xs text-warm-400" aria-live="polite">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-warm-400 [animation-delay:-0.3s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-warm-400 [animation-delay:-0.15s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-warm-400" />
            <span className="ml-1">Working…</span>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-2 border-t border-warm-200 p-3">
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {attachments.map((a) => (
              <div key={a.id} className="relative h-14 w-14">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={a.dataUrl} alt="Attachment preview" className="h-14 w-14 rounded border border-warm-200 object-cover" />
                <button
                  type="button"
                  aria-label="Remove attachment"
                  onClick={() => removeAttachment(a.id)}
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-warm-900 text-xs leading-none text-white shadow transition-transform hover:scale-110"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
        <textarea
          className="min-h-16 w-full resize-none rounded border border-warm-300 bg-white p-2 text-sm text-warm-950 placeholder:text-warm-500"
          placeholder="Describe the page or change you want…"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onPaste={onPaste}
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
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            aria-label="Attach images"
            onClick={() => fileInputRef.current?.click()}
            disabled={busy || attachments.length >= MAX_IMAGES}
            className="rounded border border-warm-300 px-2 py-1 text-sm text-warm-600 transition-colors hover:bg-warm-100 disabled:opacity-50"
          >
            🖼 Attach
          </button>
          <button
            type="button"
            onClick={run}
            disabled={!canSend}
            className="rounded bg-blue-600 px-3 py-1 text-sm text-white transition-all hover:bg-blue-700 active:scale-95 disabled:opacity-50 disabled:active:scale-100"
          >
            {busy ? 'Working…' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}
