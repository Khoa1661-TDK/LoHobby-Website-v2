/// <reference types="vitest" />
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import DataBlockSlot from '../DataBlockSlot';
import type { PageBlock } from '@/lib/page-builder';

const blockA = { blockType: 'featuredProducts', title: 'A' } as PageBlock;
const blockB = { blockType: 'featuredProducts', title: 'B' } as PageBlock;

describe('DataBlockSlot', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should render initialHtml and not fetch on mount', () => {
    const fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    const { container } = render(
      <DataBlockSlot block={blockA} index={0} locale="en" initialHtml="<p>initial</p>" />,
    );

    expect(container.innerHTML).toContain('initial');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('should fetch once after 250ms when the block changes and inject the response', async () => {
    let resolveFetch: (value: Response) => void = () => {};
    const fetchMock = vi.fn(
      (_url: string, _init?: RequestInit) =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        }),
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const { container, rerender } = render(
      <DataBlockSlot block={blockA} index={0} locale="en" initialHtml="<p>initial</p>" />,
    );

    // Change the block prop — should schedule a debounced fetch.
    rerender(
      <DataBlockSlot block={blockB} index={0} locale="en" initialHtml="<p>initial</p>" />,
    );

    // Before the debounce fires, nothing happens yet.
    expect(fetchMock).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(250);
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const firstCall = fetchMock.mock.calls[0];
    expect(firstCall).toBeDefined();
    const init = firstCall![1] as RequestInit;
    const body = JSON.parse(init.body as string);
    expect(body).toEqual({ locale: 'en', block: { blockType: 'featuredProducts', title: 'B' } });

    // Previous HTML stays visible while the request is in flight.
    expect(container.innerHTML).toContain('initial');

    // Resolve the fetch — the injected HTML updates.
    await act(async () => {
      resolveFetch(new Response('<p>updated</p>', { status: 200 }));
      await Promise.resolve();
    });

    expect(container.innerHTML).toContain('updated');
  });
});
