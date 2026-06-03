// app/checkout/page.tsx
import type { Metadata } from 'next';
import type { ReactElement } from 'react';
import Link from 'next/link';
import { auth } from '@/auth';
import CheckoutForm, { type SavedAddress } from '@/components/checkout-form';
import { getCart } from '@/lib/cart';
import { getCheckoutPaymentMethods } from '@/lib/payment-methods';
import { prisma } from '@/lib/prisma';
import { getShippingSettings } from '@/lib/shipping-settings';
import { getStoreSettings } from '@/lib/store-settings';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Thanh toán',
  robots: { index: false, follow: false },
};

export default async function CheckoutPage(): Promise<ReactElement> {
  const session = await auth();
  const userId = session?.user?.id ?? null;

  const cart = await getCart(userId);

  if (cart.lines.length === 0) {
    return (
      <section className="mx-auto max-w-xl p-8 text-center">
        <h1 className="text-2xl font-semibold">Giỏ hàng trống</h1>
        <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-400">
          Thêm vài mô hình vào bộ sưu tập trước khi thanh toán nhé.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-warm-900 px-5 py-2.5 text-sm font-semibold text-warm-50 shadow-soft-md transition-all duration-200 hover:bg-warm-800 hover:shadow-soft-lg active:scale-[0.98] dark:bg-warm-100 dark:text-warm-900 dark:hover:bg-warm-200"
        >
          Xem danh mục
        </Link>
      </section>
    );
  }

  const [addressRows, paymentMethods, shippingSettings, storeSettings] = await Promise.all([
    userId
      ? prisma.userAddress.findMany({
          where: { userId },
          orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
        })
      : Promise.resolve([]),
    getCheckoutPaymentMethods(),
    getShippingSettings(),
    getStoreSettings(),
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

  const isGuest = !userId;

  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Thanh toán</h1>
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
          Cho chúng tôi biết nơi giao hàng và cách bạn muốn thanh toán.
        </p>
        {isGuest ? (
          <p className="mt-3 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">
            Bạn đang thanh toán với tư cách khách.{' '}
            <Link href="/login?callbackUrl=/checkout" className="font-medium underline">
              Đăng nhập
            </Link>{' '}
            để lưu địa chỉ và theo dõi đơn hàng dễ dàng hơn.
          </p>
        ) : null}
      </header>
      <CheckoutForm
        cart={cart}
        paymentMethods={paymentMethods}
        shipping={{
          flatRateVnd: shippingSettings.flatRateVnd,
          freeShippingThresholdVnd: shippingSettings.freeShippingThresholdVnd,
          pickupAddress: shippingSettings.pickupAddress,
          pickupInstructions: shippingSettings.pickupInstructions,
          shipmentEnabled: shippingSettings.shipmentEnabled,
          pickupEnabled: shippingSettings.pickupEnabled,
          zones: shippingSettings.zones,
        }}
        tax={{
          taxEnabled: storeSettings.taxEnabled,
          taxRatePercent: storeSettings.taxRatePercent,
        }}
        checkoutNote={storeSettings.checkoutNote}
        savedAddresses={savedAddresses}
        defaultName={session?.user?.name ?? ''}
        requireEmail={isGuest}
      />
    </section>
  );
}
