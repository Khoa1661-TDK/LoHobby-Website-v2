// app/checkout/cancel/page.tsx
import type { Metadata } from 'next';
import type { ReactElement } from 'react';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { isAdminEmail } from '@/lib/admin-emails';
import { getPayloadOrderByCode } from '@/lib/payload-orders';
import {
  cancelPendingGatewayOrder,
  mapPayloadOrderToStorefrontStatus,
  ownsPayloadOrder,
} from '@/lib/payload-order-storefront';

type SearchParams = Promise<{ orderCode?: string }>;

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('checkout.cancel');
  return {
    title: t('metaTitle'),
    robots: { index: false, follow: false },
  };
}

export default async function CheckoutCancelPage(props: {
  searchParams: SearchParams;
}): Promise<ReactElement> {
  const t = await getTranslations('checkout.cancel');
  const { orderCode } = await props.searchParams;
  const code = Number(orderCode);

  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=/checkout/cancel?orderCode=${orderCode ?? ''}`);
  }

  if (Number.isInteger(code)) {
    const order = await getPayloadOrderByCode(code);
    if (order) {
      const isOwner = ownsPayloadOrder(order, {
        userId: session.user.id,
        email: session.user.email,
      });
      const isAdmin = isAdminEmail(session.user.email);
      const status = mapPayloadOrderToStorefrontStatus(order);
      if ((isOwner || isAdmin) && status === 'PENDING_ONLINE') {
        await cancelPendingGatewayOrder(code);
      }
    }
  }

  return (
    <section className="mx-auto max-w-xl p-8">
      <h1 className="font-display text-2xl font-semibold text-warm-900 dark:text-warm-100">{t('heading')}</h1>
      <p className="mt-4 text-sm text-warm-600 dark:text-warm-400">
        {t('body')}
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-warm-900 px-6 py-3 text-sm font-semibold text-warm-50 shadow-soft-md transition-all duration-300 hover:-translate-y-px hover:bg-warm-800 hover:shadow-soft-lg active:scale-[0.98] dark:bg-warm-100 dark:text-warm-900 dark:hover:bg-warm-200"
      >
        {t('backToCatalog')}
      </Link>
    </section>
  );
}
