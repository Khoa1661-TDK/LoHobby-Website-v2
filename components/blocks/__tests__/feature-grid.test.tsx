import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

// FeatureGrid now wraps linked items in next-intl's Link, which needs routing
// context; stub it so the block renders as a plain anchor under jsdom.
vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import FeatureGridBlock from '@/components/blocks/FeatureGrid';

describe('FeatureGridBlock', () => {
  it('should render null with no items', () => {
    expect(FeatureGridBlock({ items: [] })).toBeNull();
  });

  it('should render titles, text and an icon svg when provided', () => {
    const html = renderToStaticMarkup(
      <FeatureGridBlock items={[{ icon: 'zap', title: 'Fast', text: 'Quick prints' }]} />,
    );
    expect(html).toContain('Fast');
    expect(html).toContain('Quick prints');
    expect(html).toContain('<svg');
  });

  it('should skip an unknown icon name without crashing', () => {
    const html = renderToStaticMarkup(
      <FeatureGridBlock items={[{ icon: 'nonsense', title: 'Still ok' }]} />,
    );
    expect(html).toContain('Still ok');
  });

  it('should render an item image in the list variant', () => {
    const html = renderToStaticMarkup(
      <FeatureGridBlock
        variant="list"
        items={[{ image: { url: '/img/feature.jpg', alt: 'Feature' }, title: 'With image' }]}
      />,
    );
    expect(html).toContain('With image');
    // next/image URL-encodes the src into its optimizer query string.
    expect(html).toContain('%2Fimg%2Ffeature.jpg');
    expect(html).toContain('alt="Feature"');
  });

  it('should prefer the image over the icon in the list variant', () => {
    const html = renderToStaticMarkup(
      <FeatureGridBlock
        variant="list"
        items={[{ icon: 'zap', image: { url: '/img/feature.jpg' }, title: 'Image wins' }]}
      />,
    );
    expect(html).toContain('%2Fimg%2Ffeature.jpg');
    // The icon's lucide svg must not render when an image is present.
    expect(html).not.toContain('<svg');
  });
});
