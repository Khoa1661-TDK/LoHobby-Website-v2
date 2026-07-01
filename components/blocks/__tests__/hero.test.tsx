import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

// Hero wraps its CTAs in next-intl's Link, which needs routing context;
// stub it so the block renders as a plain anchor under the test renderer.
vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import HeroBlock from '@/components/blocks/Hero';

describe('HeroBlock', () => {
  it('should render the headline as plain text when no highlight is set', () => {
    const html = renderToStaticMarkup(
      <HeroBlock headline="Collectibles, models & keychains" imagePosition="none" />,
    );
    expect(html).toContain('Collectibles, models &amp; keychains');
    // No accent-underline wrapper without a highlight.
    expect(html).not.toContain('whitespace-nowrap text-accent');
  });

  it('should accent-underline the matching phrase case-insensitively', () => {
    const html = renderToStaticMarkup(
      <HeroBlock
        headline="Collectibles, models & keychains"
        headlineHighlight="KEYCHAINS"
        imagePosition="none"
      />,
    );
    // The matched slice preserves the headline's original casing inside the span.
    expect(html).toContain('whitespace-nowrap text-accent');
    expect(html).toContain('keychains');
  });

  it('should fall back to plain text when the highlight is not found', () => {
    const html = renderToStaticMarkup(
      <HeroBlock headline="Models & figures" headlineHighlight="keychains" imagePosition="none" />,
    );
    expect(html).not.toContain('whitespace-nowrap text-accent');
    expect(html).toContain('Models &amp; figures');
  });

  it('should render a 2x2 tile grid from the collage with gradient fallbacks', () => {
    const html = renderToStaticMarkup(
      <HeroBlock
        headline="Shop"
        imagePosition="right"
        collage={[{ alt: 'Models' }, { alt: 'Figures' }, { alt: 'Keychains' }, { alt: 'New' }]}
      />,
    );
    expect(html).toContain('Models');
    expect(html).toContain('New');
    // Gradient fallback classes appear for image-less tiles.
    expect(html).toContain('bg-gradient-to-br');
  });

  it('should render the media badge with a pulsing dot when provided', () => {
    const html = renderToStaticMarkup(
      <HeroBlock
        headline="Shop"
        imagePosition="right"
        collage={[{ alt: 'Models' }]}
        mediaBadge="New stock daily"
      />,
    );
    expect(html).toContain('New stock daily');
    expect(html).toContain('animate-ping');
  });

  it('should not render a visual column when imagePosition is none and no collage', () => {
    const html = renderToStaticMarkup(<HeroBlock headline="Shop" imagePosition="none" />);
    expect(html).not.toContain('bg-gradient-to-br');
    expect(html).not.toContain('animate-ping');
  });
});
