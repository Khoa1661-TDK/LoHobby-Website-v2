// components/cart/index.tsx — server wrapper that fetches the cookie cart
import type { ReactElement } from 'react';
import CartModal from '@/components/cart/modal';
import { getCart } from '@/lib/cart';

export default async function Cart(): Promise<ReactElement> {
  const cart = await getCart();
  return <CartModal cart={cart} />;
}
