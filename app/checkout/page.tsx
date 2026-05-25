// app/checkout/page.tsx
import type { Metadata } from 'next';
import type { ReactElement } from 'react';
import { checkoutAction } from '@/components/cart/actions';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Redirecting to payment…',
  robots: { index: false, follow: false },
};

export default async function CheckoutPage(): Promise<ReactElement> {
  await checkoutAction();
  return <p>Redirecting to payOS…</p>;
}
