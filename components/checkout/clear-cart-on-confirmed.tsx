// components/checkout/clear-cart-on-confirmed.tsx
'use client';

import { useEffect, useRef, type ReactElement } from 'react';
import { clearCartAction } from '@/components/cart/actions';

/**
 * Clears the cart exactly once when an order is confirmed. Rendered on the
 * order-success page so the cart survives a gateway redirect the shopper backs
 * out of (finding 2.1): the cart is only emptied after the order document is
 * confirmed, never before the PayOS redirect.
 */
export default function ClearCartOnConfirmed({
  confirmed,
}: {
  confirmed: boolean;
}): ReactElement | null {
  const done = useRef(false);
  useEffect(() => {
    if (!confirmed || done.current) return;
    done.current = true;
    void clearCartAction();
  }, [confirmed]);
  return null;
}
