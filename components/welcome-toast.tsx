// components/welcome-toast.tsx
'use client';

import { useEffect, type ReactElement } from 'react';
import { toast } from 'sonner';
import { BRAND_DESCRIPTION_SHORT, BRAND_NAME, BRAND_TAGLINE } from '@/lib/brand';

export default function WelcomeToast(): ReactElement | null {
  useEffect(() => {
    if (document.cookie.includes('welcome-toast=')) {
      return;
    }
    toast(`Chào mừng đến ${BRAND_NAME}!`, {
      id: 'welcome-toast',
      duration: 7000,
      onDismiss: () => {
        document.cookie = 'welcome-toast=2; max-age=31536000; path=/';
      },
      description: `${BRAND_DESCRIPTION_SHORT} ${BRAND_TAGLINE}.`,
    });
  }, []);
  return null;
}
