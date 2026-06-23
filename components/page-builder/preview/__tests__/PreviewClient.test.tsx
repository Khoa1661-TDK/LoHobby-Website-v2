/// <reference types="vitest" />
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import '@testing-library/jest-dom';

// PreviewClient statically pulls in clientBlockMap → all 14 block components, whose
// transitive imports (next-intl navigation, lib/prisma) can't load in the vitest
// environment. This suite exercises PreviewClient's message/state wiring, not real block
// rendering, so stub the block map with a trivial presentational renderer.
vi.mock('../clientBlockMap', () => ({
  DATA_BLOCK_TYPES: new Set(['featuredCollection', 'featuredProducts', 'recommendations', 'recentlyViewed']),
  renderClientBlock: (block: { heading?: string }) => <div>{block.heading}</div>,
}));

import PreviewClient from '../PreviewClient';
import type { PageBlock } from '@/lib/page-builder';

// Presentational text block (no `url`, so it doesn't render the intl <Link>).
const textBlock = (heading: string): PageBlock =>
  ({ blockType: 'text', heading } as unknown as PageBlock);

function dispatchSetLayout(blocks: PageBlock[]): void {
  const event = new MessageEvent('message', {
    data: { source: 'pb', type: 'setLayout', blocks },
    origin: window.location.origin,
  });
  window.dispatchEvent(event);
}

describe('PreviewClient', () => {
  beforeEach(() => {
    global.fetch = vi.fn(() => Promise.resolve(new Response(''))) as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render the initial presentational block content', () => {
    const { container } = render(
      <PreviewClient initialBlocks={[textBlock('Hello')]} initialBlockHtml={{}} locale="en" />,
    );
    expect(container.textContent).toContain('Hello');
  });

  it('should re-render when the parent posts a setLayout message', () => {
    const { container } = render(
      <PreviewClient initialBlocks={[textBlock('Hello')]} initialBlockHtml={{}} locale="en" />,
    );

    act(() => {
      dispatchSetLayout([textBlock('Updated')]);
    });

    expect(container.textContent).toContain('Updated');
    expect(container.textContent).not.toContain('Hello');
  });

  it('should post a ready message to the parent on mount', () => {
    const spy = vi.spyOn(window.parent, 'postMessage');
    render(
      <PreviewClient initialBlocks={[textBlock('Hello')]} initialBlockHtml={{}} locale="en" />,
    );
    expect(spy).toHaveBeenCalledWith(
      { source: 'pb', type: 'ready' },
      window.location.origin,
    );
  });
});
