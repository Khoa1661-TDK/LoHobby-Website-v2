// app/[locale]/(storefront)/cart/page.tsx
import type { Metadata } from 'next';
import type { ReactElement } from 'react';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { auth } from '@/auth';
import CartPageClient from '@/components/cart/cart-page-client';
import { getCart } from '@/lib/cart';
import { getShippingSettings } from '@/lib/shipping-settings';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('cart');
  return {
    title: t('metaTitle'),
    robots: { index: false, follow: true },
  };
}

export default async function CartPage(): Promise<ReactElement> {
  const t = await getTranslations('cart');
  const session = await auth();

  const [cart, shipping] = await Promise.all([
    getCart(session?.user?.id ?? null),
    getShippingSettings(),
  ]);

  if (cart.lines.length === 0) {
    return (
      <section className="mx-auto max-w-xl p-8 text-center">
        <h1 className="font-display text-2xl font-semibold text-warm-900 dark:text-warm-100">
          {t('empty')}
        </h1>
        <p className="mt-3 text-sm text-warm-600 dark:text-warm-400">{t('emptyBody')}</p>
        <Link
          href="/search"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-warm-900 px-5 py-2.5 text-sm font-semibold text-warm-50 shadow-soft-md transition-all duration-200 hover:bg-warm-800 hover:shadow-soft-lg active:scale-[0.98] dark:bg-warm-100 dark:text-warm-900 dark:hover:bg-warm-200"
        >
          {t('exploreNow')}
        </Link>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-screen-xl px-4 py-10 md:py-14">
      <h1 className="mb-8 font-display text-2xl font-bold tracking-tight text-warm-900 dark:text-warm-100">
        {t('pageTitle')}
      </h1>
      <CartPageClient
        cart={cart}
        freeShippingThresholdVnd={shipping.freeShippingThresholdVnd}
      />
    </section>
  );
}
