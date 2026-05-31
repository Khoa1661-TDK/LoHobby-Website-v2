// components/cart/merge-on-login.tsx — merge guest cookie cart after auth (Phase 2)
'use client';

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { mergeCartOnLoginAction } from '@/components/cart/actions';

export default function MergeCartOnLogin(): null {
  const { status } = useSession();
  const mergedRef = useRef(false);

  useEffect(() => {
    if (status !== 'authenticated' || mergedRef.current) return;
    mergedRef.current = true;
    void mergeCartOnLoginAction();
  }, [status]);

  return null;
}
