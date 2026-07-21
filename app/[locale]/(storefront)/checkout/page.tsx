// app/checkout/page.tsx
import type { Metadata } from 'next';
import type { ReactElement } from 'react';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { auth } from '@/auth';
import CheckoutForm, { type SavedAddress } from '@/components/checkout-form';
import ResendVerificationForm from '@/components/resend-verification-form';
import { getCart } from '@/lib/cart';
import { isEmailVerificationRequired } from '@/lib/feature-flags';
import { getCheckoutPaymentMethods } from '@/lib/payment-methods';
import { prisma } from '@/lib/prisma';
import { getShippingSettings } from '@/lib/shipping-settings';
import { getStoreSettings } from '@/lib/store-settings';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('checkout');
  return {
    title: t('metaTitle'),
    robots: { index: false, follow: false },
  };
}

export default async function CheckoutPage(): Promise<ReactElement> {
  const t = await getTranslations('checkout');
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login?callbackUrl=/checkout');
  }

  const userId = session.user.id;

  const [cart, dbUser] = await Promise.all([
    getCart(userId),
    prisma.user.findUnique({ where: { id: userId }, select: { emailVerified: true } }),
  ]);

  if (isEmailVerificationRequired() && !dbUser?.emailVerified) {
    return (
      <section className="mx-auto max-w-screen-sm px-4 py-12 md:py-16">
        <div className="mx-auto w-full max-w-md rounded-2xl border border-line bg-surface-raised p-6 shadow-soft-md">
          <h1 className="mb-2 font-display text-2xl font-bold tracking-tight text-warm-900 dark:text-warm-100">
            {t('verifyGateHeading')}
          </h1>
          <p className="mb-6 text-sm text-warm-600 dark:text-warm-400">{t('verifyGateBody')}</p>
          <ResendVerificationForm initialEmail={session.user.email ?? ''} />
        </div>
      </section>
    );
  }

  if (cart.lines.length === 0) {
    return (
      <section className="mx-auto max-w-xl p-8 text-center">
        <h1 className="font-display text-2xl font-semibold text-warm-900 dark:text-warm-100">
          {t('emptyCartHeading')}
        </h1>
        <p className="mt-3 text-sm text-warm-600 dark:text-warm-400">
          {t('emptyCartBody')}
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-warm-900 px-5 py-2.5 text-sm font-semibold text-warm-50 shadow-soft-md transition-all duration-200 hover:bg-warm-800 hover:shadow-soft-lg active:scale-[0.98] dark:bg-warm-100 dark:text-warm-900 dark:hover:bg-warm-200"
        >
          {t('browseCta')}
        </Link>
      </section>
    );
  }

  const [addressRows, paymentMethods, shippingSettings, storeSettings] = await Promise.all([
    prisma.userAddress.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
    }),
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

  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-8">
      <header className="mb-8">
        <h1 className="font-display text-3xl font-bold tracking-tight text-balance text-warm-900 dark:text-warm-100">
          {t('heading')}
        </h1>
        <p className="mt-2 text-sm text-warm-600 dark:text-warm-400">
          {t('subtitle')}
        </p>
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
        defaultName={session.user.name ?? ''}
      />
    </section>
  );
}
