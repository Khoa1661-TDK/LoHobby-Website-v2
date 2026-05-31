// components/providers.tsx
'use client';

import { SessionProvider } from 'next-auth/react';
import type { ReactElement, ReactNode } from 'react';
import MergeCartOnLogin from '@/components/cart/merge-on-login';
import { StoreBrandingProvider } from '@/components/store-branding-context';
import { WishlistProvider } from '@/components/wishlist/wishlist-provider';
import type { StoreBranding } from '@/lib/store-branding';

export default function Providers({
  children,
  branding,
}: {
  children: ReactNode;
  branding: StoreBranding;
}): ReactElement {
  return (
    <SessionProvider>
      <StoreBrandingProvider branding={branding}>
        <MergeCartOnLogin />
        <WishlistProvider>{children}</WishlistProvider>
      </StoreBrandingProvider>
    </SessionProvider>
  );
}
