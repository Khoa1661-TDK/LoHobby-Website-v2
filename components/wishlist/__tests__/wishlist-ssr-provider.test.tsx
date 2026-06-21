/// <reference types="vitest" />
// Regression guard for the page-builder preview 500: the builder layout omits the
// storefront providers, but the preview iframe server-renders real storefront blocks
// (ProductCard -> WishlistButton) that consume the wishlist context. Without a
// WishlistProvider those consumers throw during SSR, crashing the preview route.
// The preview route now wraps its canvas in the storefront <Providers>; this test
// locks in the underlying contract that makes that wrap necessary and sufficient.
import React, { type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { WishlistProvider, useWishlist } from '@/components/wishlist/wishlist-provider';

function WishlistConsumer(): ReactElement {
  useWishlist();
  return <span>rendered</span>;
}

describe('wishlist provider SSR contract (page-builder preview regression)', () => {
  it('should throw during server render when no WishlistProvider is present', () => {
    expect(() => renderToStaticMarkup(<WishlistConsumer />)).toThrow(/WishlistProvider/);
  });

  it('should server-render a wishlist consumer when wrapped in WishlistProvider', () => {
    const html = renderToStaticMarkup(
      <WishlistProvider>
        <WishlistConsumer />
      </WishlistProvider>,
    );
    expect(html).toContain('rendered');
  });
});
