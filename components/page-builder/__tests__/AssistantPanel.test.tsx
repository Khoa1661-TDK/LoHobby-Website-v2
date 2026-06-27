import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AssistantPanel from '../AssistantPanel';
import type { PageBlock } from '@/lib/page-builder';

function ndjsonStream(lines: string[]): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  return new ReadableStream({
    start(c) {
      for (const l of lines) c.enqueue(enc.encode(l + '\n'));
      c.close();
    },
  });
}

describe('AssistantPanel', () => {
  it('should apply a streamed mutation by calling onApply', async () => {
    const layout = [{ blockType: 'hero', heading: 'A' }] as unknown as PageBlock[];
    const onApply = vi.fn();
    const onBeforeRun = vi.fn();

    global.fetch = vi.fn(async () =>
      new Response(
        ndjsonStream([
          '{"type":"mutation","mutation":{"kind":"add","index":1,"block":{"blockType":"faq"}}}',
          '{"type":"summary","text":"Added an FAQ."}',
          '{"type":"done"}',
        ]),
        { headers: { 'Content-Type': 'application/x-ndjson' } },
      ),
    ) as unknown as typeof fetch;

    render(
      <AssistantPanel layout={layout} locale="en" onApply={onApply} onBeforeRun={onBeforeRun} />,
    );
    fireEvent.change(screen.getByPlaceholderText(/describe/i), {
      target: { value: 'add an faq' },
    });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => expect(onApply).toHaveBeenCalled());
    expect(onBeforeRun).toHaveBeenCalledTimes(1);
    const applied = onApply.mock.calls[0]?.[0] as PageBlock[];
    expect(applied.map((b) => b.blockType)).toEqual(['hero', 'faq']);
    await screen.findByText('Added an FAQ.');
  });
});
