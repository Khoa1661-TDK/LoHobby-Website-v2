import { beforeEach, describe, expect, it, vi } from 'vitest';
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
  // Persisted history leaks across tests via localStorage; reset before each.
  beforeEach(() => {
    localStorage.clear();
  });

  it('should apply a streamed mutation by calling onApply', async () => {
    const layouts = { vi: [{ blockType: 'hero', heading: 'A' }], en: [{ blockType: 'hero', heading: 'A' }] } as unknown as { vi: PageBlock[]; en: PageBlock[] };
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
      <AssistantPanel layouts={layouts} activeLocale="en" onApply={onApply} onBeforeRun={onBeforeRun} />,
    );
    fireEvent.change(screen.getByPlaceholderText(/describe/i), {
      target: { value: 'add an faq' },
    });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => expect(onApply).toHaveBeenCalled());
    expect(onBeforeRun).toHaveBeenCalledTimes(1);
    // An add is structural, so both locale copies get the block.
    const applied = onApply.mock.calls[0]?.[0] as { vi: PageBlock[]; en: PageBlock[] };
    expect(applied.en.map((b) => b.blockType)).toEqual(['hero', 'faq']);
    expect(applied.vi.map((b) => b.blockType)).toEqual(['hero', 'faq']);
    await screen.findByText('Added an FAQ.');
  });

  it('should show the user prompt and assistant reply in the conversation log', async () => {
    const layouts = { vi: [{ blockType: 'hero', heading: 'A' }], en: [{ blockType: 'hero', heading: 'A' }] } as unknown as { vi: PageBlock[]; en: PageBlock[] };

    global.fetch = vi.fn(async () =>
      new Response(
        ndjsonStream([
          '{"type":"summary","text":"Added an FAQ."}',
          '{"type":"done"}',
        ]),
        { headers: { 'Content-Type': 'application/x-ndjson' } },
      ),
    ) as unknown as typeof fetch;

    render(<AssistantPanel layouts={layouts} activeLocale="en" onApply={vi.fn()} onBeforeRun={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText(/describe/i), { target: { value: 'add an faq' } });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));

    // The user's prompt persists in the transcript alongside the assistant reply.
    await screen.findByText('add an faq');
    await screen.findByText('Added an FAQ.');
  });

  it('should render a streamed error as an assistant message', async () => {
    const layouts = { vi: [{ blockType: 'hero', heading: 'A' }], en: [{ blockType: 'hero', heading: 'A' }] } as unknown as { vi: PageBlock[]; en: PageBlock[] };

    global.fetch = vi.fn(async () =>
      new Response(
        ndjsonStream([
          '{"type":"error","error":"Model refused."}',
          '{"type":"done"}',
        ]),
        { headers: { 'Content-Type': 'application/x-ndjson' } },
      ),
    ) as unknown as typeof fetch;

    render(<AssistantPanel layouts={layouts} activeLocale="en" onApply={vi.fn()} onBeforeRun={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText(/describe/i), { target: { value: 'do a thing' } });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));

    await screen.findByText('Model refused.');
  });

  it('should send an attached image as a data URL in the request body', async () => {
    const layouts = { vi: [{ blockType: 'hero', heading: 'A' }], en: [{ blockType: 'hero', heading: 'A' }] } as unknown as { vi: PageBlock[]; en: PageBlock[] };
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

    render(<AssistantPanel layouts={layouts} activeLocale="en" onApply={vi.fn()} onBeforeRun={vi.fn()} />);

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

  it('should accumulate token events into a single live message', async () => {
    const layouts = { vi: [], en: [] } as unknown as { vi: PageBlock[]; en: PageBlock[] };

    global.fetch = vi.fn(async () =>
      new Response(
        ndjsonStream([
          '{"type":"token","text":"Hello "}',
          '{"type":"token","text":"world"}',
          '{"type":"done"}',
        ]),
        { headers: { 'Content-Type': 'application/x-ndjson' } },
      ),
    ) as unknown as typeof fetch;

    render(<AssistantPanel layouts={layouts} activeLocale="en" onApply={vi.fn()} onBeforeRun={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText(/describe/i), { target: { value: 'say hi' } });
    fireEvent.click(screen.getByRole('button', { name: /send message/i }));

    // The two deltas merge into one assistant bubble rather than two separate ones.
    await screen.findByText('Hello world');
  });

  it('should finalize the streamed message with the authoritative summary text', async () => {
    const layouts = { vi: [], en: [] } as unknown as { vi: PageBlock[]; en: PageBlock[] };

    global.fetch = vi.fn(async () =>
      new Response(
        ndjsonStream([
          '{"type":"token","text":"draft reply"}',
          '{"type":"summary","text":"Final answer."}',
          '{"type":"done"}',
        ]),
        { headers: { 'Content-Type': 'application/x-ndjson' } },
      ),
    ) as unknown as typeof fetch;

    render(<AssistantPanel layouts={layouts} activeLocale="en" onApply={vi.fn()} onBeforeRun={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText(/describe/i), { target: { value: 'go' } });
    fireEvent.click(screen.getByRole('button', { name: /send message/i }));

    // Summary replaces the streamed draft; the draft text is gone.
    await screen.findByText('Final answer.');
    expect(screen.queryByText('draft reply')).toBeNull();
  });

  it('should render a change-feed card per mutation and select the block on click', async () => {
    const layouts = { vi: [{ blockType: 'hero' }], en: [{ blockType: 'hero' }] } as unknown as {
      vi: PageBlock[];
      en: PageBlock[];
    };
    const onSelectBlock = vi.fn();

    global.fetch = vi.fn(async () =>
      new Response(
        ndjsonStream([
          '{"type":"mutation","mutation":{"kind":"add","index":1,"block":{"blockType":"faq"}},"locales":["vi","en"]}',
          '{"type":"summary","text":"Done."}',
          '{"type":"done"}',
        ]),
        { headers: { 'Content-Type': 'application/x-ndjson' } },
      ),
    ) as unknown as typeof fetch;

    render(
      <AssistantPanel
        layouts={layouts}
        activeLocale="en"
        onApply={vi.fn()}
        onBeforeRun={vi.fn()}
        onSelectBlock={onSelectBlock}
      />,
    );
    fireEvent.change(screen.getByPlaceholderText(/describe/i), { target: { value: 'add faq' } });
    fireEvent.click(screen.getByRole('button', { name: /send message/i }));

    const card = await screen.findByRole('button', { name: /faq added/i });
    expect(card).toHaveTextContent('(vi+en)');
    fireEvent.click(card);
    expect(onSelectBlock).toHaveBeenCalledWith(1);
  });

  it('should populate the input when a quick-action chip is clicked', () => {
    const layouts = { vi: [], en: [] } as unknown as { vi: PageBlock[]; en: PageBlock[] };

    render(<AssistantPanel layouts={layouts} activeLocale="en" onApply={vi.fn()} onBeforeRun={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /add product section/i }));

    const textarea = screen.getByPlaceholderText(/describe/i) as HTMLTextAreaElement;
    expect(textarea.value).toMatch(/product showcase/i);
  });

  it('should persist history to localStorage, restore it on remount, and clear it', async () => {
    const layouts = { vi: [], en: [] } as unknown as { vi: PageBlock[]; en: PageBlock[] };

    global.fetch = vi.fn(async () =>
      new Response(ndjsonStream(['{"type":"summary","text":"Remembered."}', '{"type":"done"}']), {
        headers: { 'Content-Type': 'application/x-ndjson' },
      }),
    ) as unknown as typeof fetch;

    const first = render(
      <AssistantPanel layouts={layouts} activeLocale="en" onApply={vi.fn()} onBeforeRun={vi.fn()} pageId="p1" />,
    );
    fireEvent.change(screen.getByPlaceholderText(/describe/i), { target: { value: 'remember this' } });
    fireEvent.click(screen.getByRole('button', { name: /send message/i }));
    await screen.findByText('Remembered.');
    expect(localStorage.getItem('pb-assistant-history:p1')).toContain('Remembered.');

    // Remounting a fresh panel for the same page id restores the transcript from storage.
    first.unmount();
    render(
      <AssistantPanel layouts={layouts} activeLocale="en" onApply={vi.fn()} onBeforeRun={vi.fn()} pageId="p1" />,
    );
    await screen.findByText('Remembered.');
    await screen.findByText('remember this');

    // Clear empties the transcript; the persisted history becomes empty.
    fireEvent.click(screen.getByRole('button', { name: /clear history/i }));
    expect(screen.queryByText('Remembered.')).toBeNull();
    await waitFor(() =>
      expect(JSON.parse(localStorage.getItem('pb-assistant-history:p1') ?? '[]')).toEqual([]),
    );
  });
});
