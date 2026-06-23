/// <reference types="vitest" />
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import BlockSlot, { extractBlockHtml } from '../BlockSlot';
import type { PageBlock } from '@/lib/page-builder';

const blockA = { blockType: 'hero', title: 'A' } as PageBlock;
const blockB = { blockType: 'hero', title: 'B' } as PageBlock;

// A full preview-block page document with the block wrapped in the #pb-block-root marker.
const pageDoc = (inner: string): string =>
  `<!DOCTYPE html><html><body><nav>chrome</nav><div id="pb-block-root">${inner}</div></body></html>`;

describe('extractBlockHtml', () => {
  it('should extract only the marker innerHTML, discarding page chrome', () => {
    expect(extractBlockHtml(pageDoc('<p>updated</p>'))).toBe('<p>updated</p>');
  });

  it('should return null when the marker is absent', () => {
    expect(extractBlockHtml('<html><body>no marker</body></html>')).toBeNull();
  });
});

describe('BlockSlot', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should render the seed node and not fetch on mount when seeded', () => {
    const fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    const { container } = render(
      <BlockSlot block={blockA} index={0} locale="en" slug="home" initialNode={<p>seed</p>} />,
    );

    expect(container.innerHTML).toContain('seed');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('should fetch on mount when there is no seed (newly added block)', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(new Response(pageDoc('<p>fresh</p>'), { status: 200 })));
    global.fetch = fetchMock as unknown as typeof fetch;

    const { container } = render(<BlockSlot block={blockA} index={0} locale="en" slug="home" />);

    // Loading placeholder before the fetch resolves.
    expect(container.textContent).toContain('Loading');

    await act(async () => {
      vi.advanceTimersByTime(200);
      await Promise.resolve();
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(container.innerHTML).toContain('fresh');
  });

  it('should fetch the render route when a seeded block changes and inject the extracted markup', async () => {
    let resolveFetch: (value: Response) => void = () => {};
    const fetchMock = vi.fn(
      (_url: string) =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        }),
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const { container, rerender } = render(
      <BlockSlot block={blockA} index={0} locale="en" slug="home" initialNode={<p>seed</p>} />,
    );

    rerender(
      <BlockSlot block={blockB} index={0} locale="en" slug="home" initialNode={<p>seed</p>} />,
    );

    expect(fetchMock).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = fetchMock.mock.calls[0]![0] as string;
    expect(url).toContain('/en/build/home/preview/block?block=');
    expect(url).toContain(encodeURIComponent(JSON.stringify(blockB)));

    // Previous (seed) content stays visible while the request is in flight.
    expect(container.innerHTML).toContain('seed');

    await act(async () => {
      resolveFetch(new Response(pageDoc('<p>updated</p>'), { status: 200 }));
      await Promise.resolve();
    });

    expect(container.innerHTML).toContain('updated');
    expect(container.innerHTML).not.toContain('seed');
  });
});
