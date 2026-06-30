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

  it('should show the user prompt and assistant reply in the conversation log', async () => {
    const layout = [{ blockType: 'hero', heading: 'A' }] as unknown as PageBlock[];

    global.fetch = vi.fn(async () =>
      new Response(
        ndjsonStream([
          '{"type":"summary","text":"Added an FAQ."}',
          '{"type":"done"}',
        ]),
        { headers: { 'Content-Type': 'application/x-ndjson' } },
      ),
    ) as unknown as typeof fetch;

    render(<AssistantPanel layout={layout} locale="en" onApply={vi.fn()} onBeforeRun={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText(/describe/i), { target: { value: 'add an faq' } });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));

    // The user's prompt persists in the transcript alongside the assistant reply.
    await screen.findByText('add an faq');
    await screen.findByText('Added an FAQ.');
  });

  it('should render a streamed error as an assistant message', async () => {
    const layout = [{ blockType: 'hero', heading: 'A' }] as unknown as PageBlock[];

    global.fetch = vi.fn(async () =>
      new Response(
        ndjsonStream([
          '{"type":"error","error":"Model refused."}',
          '{"type":"done"}',
        ]),
        { headers: { 'Content-Type': 'application/x-ndjson' } },
      ),
    ) as unknown as typeof fetch;

    render(<AssistantPanel layout={layout} locale="en" onApply={vi.fn()} onBeforeRun={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText(/describe/i), { target: { value: 'do a thing' } });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));

    await screen.findByText('Model refused.');
  });

  it('should send an attached image as a data URL in the request body', async () => {
    const layout = [{ blockType: 'hero', heading: 'A' }] as unknown as PageBlock[];
    const dataUrl = 'data:image/png;base64,AAAA';

    // crypto.randomUUID is used to key attachments; jsdom may not provide it.
    if (!globalThis.crypto?.randomUUID) {
      Object.defineProperty(globalThis, 'crypto', {
        value: { randomUUID: () => Math.random().toString(36).slice(2) },
        configurable: true,
      });
    }

    const fetchMock = vi.fn(async () =>
      new Response(ndjsonStream(['{"type":"summary","text":"Built it."}', '{"type":"done"}']), {
        headers: { 'Content-Type': 'application/x-ndjson' },
      }),
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<AssistantPanel layout={layout} locale="en" onApply={vi.fn()} onBeforeRun={vi.fn()} />);

    // Drive the hidden file input directly (the visible button just forwards a click to it).
    const fileInput = screen.getByLabelText(/image file input/i) as HTMLInputElement;
    const file = new File(['x'], 'shot.png', { type: 'image/png' });
    Object.defineProperty(file, 'size', { value: 1024 });
    // jsdom's FileReader.readAsDataURL is unreliable; stub it to resolve our known data URL.
    vi.spyOn(FileReader.prototype, 'readAsDataURL').mockImplementation(function (this: FileReader) {
      Object.defineProperty(this, 'result', { value: dataUrl, configurable: true });
      this.onload?.(new ProgressEvent('load') as unknown as ProgressEvent<FileReader>);
    });

    fireEvent.change(fileInput, { target: { files: [file] } });

    // Preview thumbnail appears once the file is read.
    await screen.findByAltText('Attachment preview');

    fireEvent.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const init = (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1];
    const body = JSON.parse(init.body as string);
    expect(body.images).toEqual([dataUrl]);
    await screen.findByText('Built it.');
  });
});
