// components/cart/index.tsx — server wrapper that fetches the cookie cart
import type { ReactElement } from 'react';
import { auth } from '@/auth';
import CartModal from '@/components/cart/modal';
import { getCart } from '@/lib/cart';
import { getShippingSettings } from '@/lib/shipping-settings';

export default async function Cart(): Promise<ReactElement> {
  const session = await auth();
  const [cart, shipping] = await Promise.all([
    getCart(session?.user?.id ?? null),
    getShippingSettings(),
  ]);
  return (
    <CartModal cart={cart} freeShippingThresholdVnd={shipping.freeShippingThresholdVnd} />
  );
}
