// app/checkout/success/page.tsx
import type { Metadata } from 'next';
import type { ReactElement } from 'react';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { auth } from '@/auth';
import OrderStatusPoller from '@/components/checkout/order-status-poller';
import ClearCartOnConfirmed from '@/components/checkout/clear-cart-on-confirmed';
import { isAdminEmail } from '@/lib/admin-emails';
import { getPaymentMethodByKey, type PaymentMethodKind } from '@/lib/payment-methods';
import { getPayloadOrderByCode } from '@/lib/payload-orders';
import {
  mapPayloadOrderToStorefrontStatus,
  ownsPayloadOrder,
} from '@/lib/payload-order-storefront';
import { orderStatusLabelKey } from '@/lib/order-status-labels';

type SearchParams = Promise<{ orderCode?: string }>;

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('checkout.success');
  return {
    title: t('metaTitle'),
    robots: { index: false, follow: false },
  };
}

export default async function CheckoutSuccessPage(props: {
  searchParams: SearchParams;
}): Promise<ReactElement> {
  const t = await getTranslations('checkout.success');
  // `checkout.statusLabels` lives one level up from the `checkout.success`
  // namespace `t` is scoped to, so it needs its own translator.
  const tCheckout = await getTranslations('checkout');
  const { orderCode } = await props.searchParams;
  const code = Number(orderCode);
  if (!Number.isInteger(code)) redirect('/');

  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=/checkout/success?orderCode=${code}`);
  }

  const order = await getPayloadOrderByCode(code);
  if (!order) redirect('/');

  const isOwner = ownsPayloadOrder(order, {
    userId: session.user.id,
    email: session.user.email,
  });
  const isAdmin = isAdminEmail(session.user.email);
  if (!isOwner && !isAdmin) {
    redirect('/');
  }

  const status = mapPayloadOrderToStorefrontStatus(order);
  const method = order.paymentMethodKey
    ? await getPaymentMethodByKey(order.paymentMethodKey)
    : null;
  const kind: PaymentMethodKind =
    (order.paymentKind as PaymentMethodKind | null) ??
    (status === 'PENDING_ONLINE' ? 'gateway' : 'cod');

  const isPaid = status === 'PAID';
  const isCod = kind === 'cod' || status === 'PENDING_COD';
  const isTransfer = kind === 'manual_transfer' || status === 'PENDING_TRANSFER';
  const isGateway = kind === 'gateway' || status === 'PENDING_ONLINE';
  const isPickup = order.deliveryMethod === 'PICKUP';
  const amount = typeof order.totalAmount === 'number' ? order.totalAmount : 0;
  const paidAt =
    typeof order.paidAt === 'string' ? new Date(order.paidAt) : null;

  const heading = isPaid
    ? t('headingPaid')
    : isCod
      ? t('headingCod')
      : isTransfer
        ? t('headingTransfer')
        : t('headingPending');

  const shouldPoll = isGateway && !isPaid;

  // The order is committed (safe to clear the cart) once it is no longer
  // merely awaiting online payment. COD/transfer land already-committed.
  const cartConfirmed = status !== 'PENDING' && status !== 'PENDING_ONLINE';

  const paymentLabel =
    method?.label ??
    (isCod
      ? t('paymentCod')
      : isTransfer
        ? t('paymentTransfer')
        : t('paymentGateway'));
  const transfer = isTransfer ? (method?.transfer ?? null) : null;
  const transferContent = method?.transfer?.transferNote
    ? `${method.transfer.transferNote} ${code}`
    : String(code);

  return (
    <section className="mx-auto max-w-xl px-4 py-8">
      {shouldPoll && <OrderStatusPoller orderCode={code} initialStatus={status} />}
      <ClearCartOnConfirmed confirmed={cartConfirmed} />

      <h1 className="font-display text-2xl font-semibold text-warm-900 dark:text-warm-100">{heading}</h1>

      <dl className="mt-6 space-y-2 rounded-2xl border border-line bg-surface-raised p-5 text-sm shadow-soft-sm">
        <div className="flex justify-between border-b py-2">
          <dt>{t('orderCode')}</dt>
          <dd className="font-mono">{code}</dd>
        </div>
        <div className="flex justify-between border-b py-2">
          <dt>{t('total')}</dt>
          <dd>{amount.toLocaleString('vi-VN')} VND</dd>
        </div>
        <div className="flex justify-between border-b py-2">
          <dt>{t('status')}</dt>
          <dd>{tCheckout(`statusLabels.${orderStatusLabelKey(status)}`)}</dd>
        </div>
        <div className="flex justify-between border-b py-2">
          <dt>{t('payment')}</dt>
          <dd>{paymentLabel}</dd>
        </div>
        {order.deliveryMethod && (
          <div className="flex justify-between border-b py-2">
            <dt>{t('delivery')}</dt>
            <dd>{isPickup ? t('pickup') : t('homeDelivery')}</dd>
          </div>
        )}
        {order.shippingAddress && (
          <div className="flex justify-between gap-4 border-b py-2">
            <dt className="shrink-0">{isPickup ? t('pickupAt') : t('deliverTo')}</dt>
            <dd className="text-right">{order.shippingAddress}</dd>
          </div>
        )}
        {order.customerName && (
          <div className="flex justify-between border-b py-2">
            <dt>{t('customer')}</dt>
            <dd>{order.customerName}</dd>
          </div>
        )}
        {order.phoneNumber && (
          <div className="flex justify-between border-b py-2">
            <dt>{t('phone')}</dt>
            <dd>{order.phoneNumber}</dd>
          </div>
        )}
        {paidAt && (
          <div className="flex justify-between border-b py-2">
            <dt>{t('paidAt')}</dt>
            <dd>{paidAt.toLocaleString('vi-VN')}</dd>
          </div>
        )}
      </dl>

      {isCod && !isPaid && (
        <p className="mt-6 rounded-lg border border-spool-200 bg-spool-50 p-4 text-sm text-spool-800 dark:border-spool-800 dark:bg-spool-900/40 dark:text-spool-100">
          {isPickup
            ? t('notificationCodPickup')
            : t('notificationCodDelivery')}
        </p>
      )}

      {isTransfer && !isPaid && (
        <div className="mt-6 rounded-lg border border-spool-200 bg-spool-50 p-4 text-sm text-spool-800 dark:border-spool-800 dark:bg-spool-900/40 dark:text-spool-100">
          <p className="font-semibold">{t('transferHeading')}</p>
          <p className="mt-1 text-xs">
            {t('transferInstructions')}
          </p>
          <dl className="mt-3 space-y-1">
            {transfer?.bankName && (
              <div className="flex justify-between gap-4">
                <dt className="shrink-0 text-spool-700 dark:text-spool-200">{t('bank')}</dt>
                <dd className="text-right font-medium">{transfer.bankName}</dd>
              </div>
            )}
            {transfer?.accountNumber && (
              <div className="flex justify-between gap-4">
                <dt className="shrink-0 text-spool-700 dark:text-spool-200">{t('accountNumber')}</dt>
                <dd className="text-right font-mono font-medium">{transfer.accountNumber}</dd>
              </div>
            )}
            {transfer?.accountHolder && (
              <div className="flex justify-between gap-4">
                <dt className="shrink-0 text-spool-700 dark:text-spool-200">{t('accountHolder')}</dt>
                <dd className="text-right font-medium">{transfer.accountHolder}</dd>
              </div>
            )}
            <div className="flex justify-between gap-4">
              <dt className="shrink-0 text-spool-700 dark:text-spool-200">{t('amount')}</dt>
              <dd className="text-right font-medium">{amount.toLocaleString('vi-VN')} VND</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="shrink-0 text-spool-700 dark:text-spool-200">{t('content')}</dt>
              <dd className="text-right font-mono font-medium">{transferContent}</dd>
            </div>
          </dl>
          {transfer?.qrImageUrl && (
            <div className="mt-4 flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={transfer.qrImageUrl}
                alt={t('qrAlt')}
                className="h-48 w-48 rounded-lg border border-spool-200 bg-white object-contain p-2"
              />
            </div>
          )}
          {method?.instructions && (
            <p className="mt-3 whitespace-pre-line text-xs text-spool-700 dark:text-spool-200">
              {method.instructions}
            </p>
          )}
        </div>
      )}

      {isGateway && !isPaid && (
        <p
          className="mt-6 text-sm text-neutral-500 dark:text-neutral-400"
          dangerouslySetInnerHTML={{ __html: t.raw('gatewayPending') }}
        />
      )}

      <Link
        href="/"
        className="mt-8 inline-block rounded-full bg-filament-500 px-5 py-2 text-sm font-medium text-white hover:bg-filament-600 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
      >
        {t('continueShopping')}
      </Link>
    </section>
  );
}
