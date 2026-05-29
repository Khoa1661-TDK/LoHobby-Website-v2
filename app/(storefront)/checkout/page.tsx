// app/checkout/page.tsx
import type { Metadata } from 'next';
import type { ReactElement } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import CheckoutForm, { type SavedAddress } from '@/components/checkout-form';
import { getCart } from '@/lib/cart';
import { getCheckoutPaymentMethods } from '@/lib/payment-methods';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Thanh toán',
  robots: { index: false, follow: false },
};

export default async function CheckoutPage(): Promise<ReactElement> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login?callbackUrl=/checkout');
  }

  const cart = await getCart();

  if (cart.lines.length === 0) {
    return (
      <section className="mx-auto max-w-xl p-8 text-center">
        <h1 className="text-2xl font-semibold">Giỏ hàng trống</h1>
        <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-400">
          Thêm vài mô hình vào bộ sưu tập trước khi thanh toán nhé.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-full bg-filament-500 px-5 py-2 text-sm font-medium text-white hover:bg-filament-600 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
        >
          Xem danh mục
        </Link>
      </section>
    );
  }

  const [addressRows, paymentMethods] = await Promise.all([
    prisma.userAddress.findMany({
      where: { userId: session.user.id },
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
    }),
    getCheckoutPaymentMethods(),
  ]);

  const savedAddresses: SavedAddress[] = addressRows.map((row) => ({
    id: row.id,
    title: row.title,
    fullName: row.fullName,
    phone: row.phone,
    addressLine: row.addressLine,
    ward: row.ward,
    district: row.district,
    city: row.city,
    country: row.country,
    isDefault: row.isDefault,
  }));

  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Thanh toán</h1>
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
          Cho chúng tôi biết nơi giao hàng và cách bạn muốn thanh toán.
        </p>
      </header>
      <CheckoutForm
        cart={cart}
        paymentMethods={paymentMethods}
        savedAddresses={savedAddresses}
        defaultName={session.user.name ?? ''}
      />
    </section>
  );
}
