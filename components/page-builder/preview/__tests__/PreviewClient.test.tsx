/// <reference types="vitest" />
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import PreviewClient from '../PreviewClient';
import type { PageBlock } from '@/lib/page-builder';

const heroBlock = (title: string): PageBlock =>
  ({ blockType: 'hero', title } as unknown as PageBlock);

function dispatchSetLayout(blocks: PageBlock[]): void {
  const event = new MessageEvent('message', {
    data: { source: 'pb', type: 'setLayout', blocks },
    origin: window.location.origin,
  });
  window.dispatchEvent(event);
}

describe('PreviewClient', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    global.fetch = vi.fn(() =>
      Promise.resolve(new Response('<div id="pb-block-root"></div>')),
    ) as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should render the initial seed node for each block', () => {
    const { container } = render(
      <PreviewClient
        initialBlocks={[heroBlock('Hello')]}
        initialNodes={{ 0: <div>Hello</div> }}
        locale="en"
        slug="home"
      />,
    );
    expect(container.textContent).toContain('Hello');
  });

  it('should post a ready message to the parent on mount', () => {
    const spy = vi.spyOn(window.parent, 'postMessage');
    render(
      <PreviewClient
        initialBlocks={[heroBlock('Hello')]}
        initialNodes={{ 0: <div>Hello</div> }}
        locale="en"
        slug="home"
      />,
    );
    expect(spy).toHaveBeenCalledWith({ source: 'pb', type: 'ready' }, window.location.origin);
  });

  it('should re-fetch the changed block when the parent posts setLayout', async () => {
    const fetchMock = vi.fn((_url: string) =>
      Promise.resolve(new Response('<div id="pb-block-root"></div>')),
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    render(
      <PreviewClient
        initialBlocks={[heroBlock('Hello')]}
        initialNodes={{ 0: <div>Hello</div> }}
        locale="en"
        slug="home"
      />,
    );

    // Seeded block: no fetch yet.
    expect(fetchMock).not.toHaveBeenCalled();

    act(() => {
      dispatchSetLayout([heroBlock('Updated')]);
    });

    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = fetchMock.mock.calls[0]![0] as string;
    expect(url).toContain(encodeURIComponent(JSON.stringify(heroBlock('Updated'))));
  });
});
