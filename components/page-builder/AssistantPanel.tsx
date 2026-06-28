// components/page-builder/AssistantPanel.tsx — chat panel that drives the layout.
'use client';
import { useState, type ReactElement } from 'react';
import type { PageBlock } from '@/lib/page-builder';
import { applyMutation } from '@/lib/page-builder/assistant/apply';
import { parseAssistantStream } from '@/lib/page-builder/assistant/parse-stream';

type Props = {
  layout: PageBlock[];
  locale: string;
  onApply: (next: PageBlock[]) => void;
  onBeforeRun: () => void;
};

export default function AssistantPanel({ layout, locale, onApply, onBeforeRun }: Props): ReactElement {
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState('');
  const [error, setError] = useState('');

  async function run(): Promise<void> {
    if (!prompt.trim() || busy) return;
    setBusy(true);
    setSummary('');
    setError('');
    onBeforeRun();
    // Local working copy so each mutation builds on the previous one this turn.
    let working = layout;
    try {
      const res = await fetch('/api/page-builder/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ prompt, layout, locale }),
      });
      if (!res.ok || !res.body) {
        setError(`Request failed (${res.status}).`);
        return;
      }
      for await (const event of parseAssistantStream(res.body)) {
        if (event.type === 'mutation') {
          working = applyMutation(working, event.mutation);
          onApply(working);
        } else if (event.type === 'summary') {
          setSummary(event.text);
        } else if (event.type === 'error') {
          setError(event.error);
        }
      }
      setPrompt('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Assistant failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
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
      {summary && <p className="text-xs text-warm-700">{summary}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
