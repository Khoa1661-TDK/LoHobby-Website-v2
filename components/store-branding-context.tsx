'use client';

import { createContext, useContext, type ReactElement, type ReactNode } from 'react';
import type { StoreBranding } from '@/lib/store-branding';

const StoreBrandingContext = createContext<StoreBranding | null>(null);

export function StoreBrandingProvider({
  branding,
  children,
}: {
  branding: StoreBranding;
  children: ReactNode;
}): ReactElement {
  return (
    <StoreBrandingContext.Provider value={branding}>{children}</StoreBrandingContext.Provider>
  );
}

export function useStoreBranding(): StoreBranding {
  const branding = useContext(StoreBrandingContext);
  if (!branding) {
    throw new Error('useStoreBranding must be used within StoreBrandingProvider');
  }
  return branding;
}

/** Safe hook for optional client usage outside the provider tree. */
export function useStoreBrandingOptional(): StoreBranding | null {
  return useContext(StoreBrandingContext);
}
