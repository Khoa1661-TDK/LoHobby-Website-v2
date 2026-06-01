// components/cart/index.tsx — server wrapper that fetches the cookie cart
import type { ReactElement } from 'react';
import { auth } from '@/auth';
import CartModal from '@/components/cart/modal';
import { getCart } from '@/lib/cart';

export default async function Cart(): Promise<ReactElement> {
  const session = await auth();
  const cart = await getCart(session?.user?.id ?? null);
  return <CartModal cart={cart} />;
}
