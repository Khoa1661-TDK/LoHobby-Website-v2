/// <reference types="vitest" />
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';

// next-intl's Link needs routing context; stub it (and next/image) so these block
// components render as plain anchors/imgs under jsdom and we can assert the link wrap.
vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

import ImageWithTextBlock from '../ImageWithText';
import PromoBannerBlock from '../PromoBanner';

describe('ImageWithText link support', () => {
  const image = { url: '/uploads/p.jpg', alt: 'A part' };

  it('should wrap the image in an anchor when url is set', () => {
    const { container } = render(
      <ImageWithTextBlock headline="Hi" image={image} url="/search" />,
    );
    const anchor = container.querySelector('a');
    expect(anchor).not.toBeNull();
    expect(anchor).toHaveAttribute('href', '/search');
    // the anchor wraps the image
    expect(anchor!.querySelector('img')).not.toBeNull();
  });

  it('should render no anchor when url is empty', () => {
    const { container } = render(<ImageWithTextBlock headline="Hi" image={image} />);
    expect(container.querySelector('a')).toBeNull();
    expect(container.querySelector('img')).not.toBeNull();
  });

  it('should add target/rel for an external url', () => {
    const { container } = render(
      <ImageWithTextBlock headline="Hi" image={image} url="https://example.com" />,
    );
    const anchor = container.querySelector('a');
    expect(anchor).toHaveAttribute('target', '_blank');
    expect(anchor).toHaveAttribute('rel', 'noopener noreferrer');
  });
});

describe('PromoBanner link support', () => {
  it('should wrap the banner text in an anchor when url is set', () => {
    const { container } = render(<PromoBannerBlock text="Sale!" url="/sale" />);
    const anchor = container.querySelector('a');
    expect(anchor).not.toBeNull();
    expect(anchor).toHaveAttribute('href', '/sale');
    expect(anchor!.textContent).toContain('Sale!');
  });

  it('should render no banner anchor when url is empty and no CTA is set', () => {
    const { container } = render(<PromoBannerBlock text="Sale!" />);
    expect(container.querySelector('a')).toBeNull();
  });
});
