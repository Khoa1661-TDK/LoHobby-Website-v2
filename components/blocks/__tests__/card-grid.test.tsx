import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

// CardGrid wraps linked cards in next-intl's Link, which needs routing context;
// stub it so the block renders as a plain anchor under jsdom.
vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import CardGridBlock from '@/components/blocks/CardGrid';

describe('CardGridBlock', () => {
  it('should render an empty-state message with no cards', () => {
    const html = renderToStaticMarkup(<CardGridBlock cards={[]} />);
    expect(html).toContain('No cards');
  });

  it('should render titles and body when provided', () => {
    const html = renderToStaticMarkup(
      <CardGridBlock cards={[{ title: 'Widget', body: 'A fine widget' }]} />,
    );
    expect(html).toContain('Widget');
    expect(html).toContain('A fine widget');
  });

  it('should render the icon svg when the card has no image', () => {
    const html = renderToStaticMarkup(
      <CardGridBlock cards={[{ icon: 'zap', title: 'No image' }]} />,
    );
    expect(html).toContain('No image');
    expect(html).toContain('<svg');
  });

  it('should suppress the icon when the card has an image', () => {
    const html = renderToStaticMarkup(
      <CardGridBlock
        cards={[{ icon: 'zap', image: { url: '/img/card.jpg' }, title: 'Image wins' }]}
      />,
    );
    expect(html).toContain('Image wins');
    // next/image URL-encodes the src into its optimizer query string.
    expect(html).toContain('%2Fimg%2Fcard.jpg');
    // The icon's lucide svg must not render when an image is present.
    expect(html).not.toContain('<svg');
  });
});
