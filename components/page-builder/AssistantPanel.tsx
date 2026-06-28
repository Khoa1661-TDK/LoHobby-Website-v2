// components/page-builder/AssistantPanel.tsx — chat panel that drives the layout.
// Renders a scrollable conversation log (user prompts + assistant replies) above a
// pinned input. History is in-memory for the session; a full page reload clears it.
'use client';
import { useEffect, useRef, useState, type ReactElement } from 'react';
import type { PageBlock } from '@/lib/page-builder';
import { applyMutation } from '@/lib/page-builder/assistant/apply';
import { parseAssistantStream } from '@/lib/page-builder/assistant/parse-stream';

type Message = { role: 'user' | 'assistant'; text: string; error?: boolean };

type Props = {
  layout: PageBlock[];
  locale: string;
  onApply: (next: PageBlock[]) => void;
  onBeforeRun: () => void;
};

export default function AssistantPanel({ layout, locale, onApply, onBeforeRun }: Props): ReactElement {
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const logRef = useRef<HTMLDivElement | null>(null);

  // Keep the transcript scrolled to the latest message.
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [messages, busy]);

  async function run(): Promise<void> {
    const text = prompt.trim();
    if (!text || busy) return;
    setBusy(true);
    setMessages((prev) => [...prev, { role: 'user', text }]);
    setPrompt('');
    onBeforeRun();
    // Local working copy so each mutation builds on the previous one this turn.
    let working = layout;
    try {
      const res = await fetch('/api/page-builder/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ prompt: text, layout, locale }),
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

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div ref={logRef} className="flex-1 space-y-2 overflow-y-auto p-3">
        {messages.length === 0 ? (
          <p className="text-xs text-warm-400">Describe the page or change you want, and I&apos;ll build it.</p>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
              <span
                className={
                  m.role === 'user'
                    ? 'max-w-[85%] rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white'
                    : m.error
                      ? 'max-w-[85%] rounded-lg bg-red-50 px-3 py-1.5 text-sm text-red-700'
                      : 'max-w-[85%] rounded-lg bg-warm-100 px-3 py-1.5 text-sm text-warm-800'
                }
              >
                {m.text}
              </span>
            </div>
          ))
        )}
        {busy && <p className="text-xs text-warm-400">Working…</p>}
      </div>
      <div className="flex flex-col gap-2 border-t border-warm-200 p-3">
        <textarea
          className="min-h-16 w-full resize-none rounded border border-warm-300 bg-white p-2 text-sm text-warm-950 placeholder:text-warm-500"
          placeholder="Describe the page or change you want…"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={busy}
        />
        <button
          type="button"
          onClick={run}
          disabled={busy || !prompt.trim()}
          className="self-end rounded bg-blue-600 px-3 py-1 text-sm text-white disabled:opacity-50"
        >
          {busy ? 'Working…' : 'Send'}
        </button>
      </div>
    </div>
  );
}
