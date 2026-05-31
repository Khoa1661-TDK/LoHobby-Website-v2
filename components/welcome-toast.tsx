// components/welcome-toast.tsx
'use client';

import { useEffect, type ReactElement } from 'react';
import { toast } from 'sonner';
import { useStoreBrandingOptional } from '@/components/store-branding-context';
import { BRAND_DESCRIPTION_SHORT, BRAND_NAME, BRAND_TAGLINE } from '@/lib/brand';

export default function WelcomeToast(): ReactElement | null {
  const branding = useStoreBrandingOptional();

  useEffect(() => {
    if (document.cookie.includes('welcome-toast=')) {
      return;
    }

    const storeName = branding?.storeName ?? BRAND_NAME;
    const description = branding?.descriptionShort ?? BRAND_DESCRIPTION_SHORT;
    const tagline = branding?.tagline ?? BRAND_TAGLINE;

    toast(`Chào mừng đến ${storeName}!`, {
      id: 'welcome-toast',
      duration: 7000,
      onDismiss: () => {
        document.cookie = 'welcome-toast=2; max-age=31536000; path=/';
      },
      description: `${description} ${tagline}.`,
    });
  }, [branding]);

  return null;
}
