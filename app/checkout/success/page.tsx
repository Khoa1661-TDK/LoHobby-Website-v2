// app/checkout/success/page.tsx
import type { Metadata } from 'next';
import type { ReactElement } from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import OrderStatusPoller from '@/components/checkout/order-status-poller';
import { prisma } from '@/src/lib/db-adapter';

type SearchParams = Promise<{ orderCode?: string }>;

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Payment confirmation',
  robots: { index: false, follow: false },
};

export default async function CheckoutSuccessPage(props: {
  searchParams: SearchParams;
}): Promise<ReactElement> {
  const { orderCode } = await props.searchParams;
  const code = Number(orderCode);
  if (!Number.isInteger(code)) redirect('/');

  const order = await prisma.order.findUnique({ where: { orderCode: code } });
  if (!order) redirect('/');

  const isPaid = order.status === 'PAID';

  return (
    <section className="mx-auto max-w-xl">
      <OrderStatusPoller orderCode={order.orderCode} initialStatus={order.status} />
      <h1 className="text-2xl font-semibold">
        {isPaid
          ? 'Thanks — your toys are entering the print queue!'
          : 'Awaiting payment confirmation'}
      </h1>

      <dl className="mt-6 space-y-2 text-sm">
        <div className="flex justify-between border-b py-2">
          <dt>Order code</dt>
          <dd className="font-mono">{order.orderCode}</dd>
        </div>
        <div className="flex justify-between border-b py-2">
          <dt>Amount</dt>
          <dd>{order.amount.toLocaleString('vi-VN')} VND</dd>
        </div>
        <div className="flex justify-between border-b py-2">
          <dt>Status</dt>
          <dd>{order.status}</dd>
        </div>
        {order.paidAt && (
          <div className="flex justify-between border-b py-2">
            <dt>Paid at</dt>
            <dd>{order.paidAt.toLocaleString('vi-VN')}</dd>
          </div>
        )}
      </dl>

      {!isPaid && (
        <p className="mt-6 text-sm text-neutral-500 dark:text-neutral-400">
          Bank settlement is in progress. This page will flip to <strong>PAID</strong> as soon as
          payOS delivers the webhook (usually within seconds), then we slice your files and start
          the printers.
        </p>
      )}

      <Link
        href="/"
        className="mt-8 inline-block rounded-full bg-filament-500 px-5 py-2 text-sm font-medium text-white hover:bg-filament-600"
      >
        Continue browsing toys
      </Link>
    </section>
  );
}
