// components/welcome-toast.tsx
'use client';

import { useEffect, type ReactElement } from 'react';
import { toast } from 'sonner';

export default function WelcomeToast(): ReactElement | null {
  useEffect(() => {
    if (document.cookie.includes('welcome-toast=')) {
      return;
    }
    toast('Welcome to PolyToys!', {
      id: 'welcome-toast',
      duration: 7000,
      onDismiss: () => {
        document.cookie = 'welcome-toast=2; max-age=31536000; path=/';
      },
      description: 'Hand-printed plastic toys, articulated figures, and tabletop bits — paid via VietQR.',
    });
  }, []);
  return null;
}
