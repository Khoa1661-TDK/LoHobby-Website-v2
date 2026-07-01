import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

// Spotlight wraps its CTA in next-intl's Link, which needs routing context;
// stub it so the block renders as a plain anchor under the test renderer.
vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import SpotlightBlock from '@/components/blocks/Spotlight';

describe('SpotlightBlock', () => {
  it('should render null when it has no product and no heading or price override', async () => {
    expect(await SpotlightBlock({})).toBeNull();
  });

  it('should render heading, override prices and the discount badge', async () => {
    const html = renderToStaticMarkup(
      await SpotlightBlock({
        heading: 'Deal pick',
        priceNow: '₫899,000',
        priceWas: '₫1,290,000',
        discountLabel: '-30%',
      }),
    );
    expect(html).toContain('Deal pick');
    expect(html).toContain('₫899,000');
    expect(html).toContain('₫1,290,000');
    expect(html).toContain('-30%');
  });

  it('should render the CTA as a link when an href override is set', async () => {
    const html = renderToStaticMarkup(
      await SpotlightBlock({ heading: 'Deal', ctaLabel: 'Grab it', ctaHref: '/search' }),
    );
    expect(html).toContain('Grab it');
    expect(html).toContain('href="/search"');
  });

  it('should render a fixed dark banner by default and drop it for an explicit background', async () => {
    // The default banner uses fixed warm-900/white — NOT the theme-relative
    // bg-ink/text-surface tokens, which swap in dark mode and would flip the
    // banner to a light surface with theme-tracking (poorly-contrasting) text.
    const def = renderToStaticMarkup(await SpotlightBlock({ heading: 'Deal' }));
    expect(def).toContain('bg-warm-900');
    expect(def).toContain('text-white');
    expect(def).not.toContain('bg-ink');
    const light = renderToStaticMarkup(
      await SpotlightBlock({ heading: 'Deal', background: 'light' }),
    );
    expect(light).not.toContain('bg-warm-900');
  });

  it('should render countdown digits in the server markup for a future target date', async () => {
    // Regression: the countdown must render its digits during SSR (not only after the
    // client effect), so the builder preview's static HTML injection shows the timer
    // instead of empty cells. A far-future date keeps the value stable across runs.
    const targetDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
    const html = renderToStaticMarkup(
      await SpotlightBlock({ heading: 'Deal', targetDate }),
    );
    expect(html).toContain('Days');
    expect(html).toContain('Hrs');
    // Every unit cell must carry a two-digit value (not an empty cell), proving the
    // remaining time was computed at render time rather than only after the client
    // effect. The exact day count is boundary-sensitive, so match any zero-padded pair.
    const digitCells = html.match(/tabular-nums[^>]*>\d\d<\/div>/g) ?? [];
    expect(digitCells).toHaveLength(4);
  });

  it('should show the expired text when the target date has already passed', async () => {
    const targetDate = new Date(Date.now() - 60 * 1000).toISOString();
    const html = renderToStaticMarkup(
      await SpotlightBlock({ heading: 'Deal', targetDate, expiredText: 'Deal over' }),
    );
    expect(html).toContain('Deal over');
  });
});
