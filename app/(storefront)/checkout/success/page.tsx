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
  title: 'Xác nhận đơn hàng',
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
  const isCod = order.paymentMethod === 'COD' || order.status === 'PENDING_COD';
  const isPickup = order.deliveryMethod === 'PICKUP';

  const heading = isPaid
    ? 'Cảm ơn bạn — đơn hàng đang được chuẩn bị!'
    : isCod
      ? 'Đã xác nhận đơn hàng — hẹn gặp bạn sớm!'
      : 'Đang chờ xác nhận thanh toán';

  // Only poll for online payments still pending — COD orders never auto-flip to PAID.
  const shouldPoll = !isCod && !isPaid;

  return (
    <section className="mx-auto max-w-xl px-4 py-8">
      {shouldPoll && (
        <OrderStatusPoller orderCode={order.orderCode} initialStatus={order.status} />
      )}

      <h1 className="text-2xl font-semibold">{heading}</h1>

      <dl className="mt-6 space-y-2 text-sm">
        <div className="flex justify-between border-b py-2">
          <dt>Mã đơn hàng</dt>
          <dd className="font-mono">{order.orderCode}</dd>
        </div>
        <div className="flex justify-between border-b py-2">
          <dt>Tổng tiền</dt>
          <dd>{order.amount.toLocaleString('vi-VN')} VND</dd>
        </div>
        <div className="flex justify-between border-b py-2">
          <dt>Trạng thái</dt>
          <dd>{order.status}</dd>
        </div>
        {order.paymentMethod && (
          <div className="flex justify-between border-b py-2">
            <dt>Thanh toán</dt>
            <dd>{order.paymentMethod === 'COD' ? 'Thanh toán khi nhận hàng' : 'Thanh toán online (payOS)'}</dd>
          </div>
        )}
        {order.deliveryMethod && (
          <div className="flex justify-between border-b py-2">
            <dt>Giao hàng</dt>
            <dd>{isPickup ? 'Nhận tại cửa hàng' : 'Giao tận nhà'}</dd>
          </div>
        )}
        {order.shippingAddress && (
          <div className="flex justify-between gap-4 border-b py-2">
            <dt className="shrink-0">{isPickup ? 'Nhận tại' : 'Giao đến'}</dt>
            <dd className="text-right">{order.shippingAddress}</dd>
          </div>
        )}
        {order.customerName && (
          <div className="flex justify-between border-b py-2">
            <dt>Khách hàng</dt>
            <dd>{order.customerName}</dd>
          </div>
        )}
        {order.phoneNumber && (
          <div className="flex justify-between border-b py-2">
            <dt>Số điện thoại</dt>
            <dd>{order.phoneNumber}</dd>
          </div>
        )}
        {order.paidAt && (
          <div className="flex justify-between border-b py-2">
            <dt>Thanh toán lúc</dt>
            <dd>{order.paidAt.toLocaleString('vi-VN')}</dd>
          </div>
        )}
      </dl>

      {isCod && !isPaid && (
        <p className="mt-6 rounded-lg border border-spool-200 bg-spool-50 p-4 text-sm text-spool-800 dark:border-spool-800 dark:bg-spool-900/40 dark:text-spool-100">
          {isPickup
            ? 'Chúng tôi sẽ nhắn tin khi đơn hàng đã đóng gói và sẵn sàng để bạn đến lấy tại cửa hàng.'
            : 'Chúng tôi sẽ giao hàng sớm. Vui lòng chuẩn bị tiền mặt cho shipper khi nhận hàng.'}
        </p>
      )}

      {!isCod && !isPaid && (
        <p className="mt-6 text-sm text-neutral-500 dark:text-neutral-400">
          Ngân hàng đang xử lý giao dịch. Trang này sẽ chuyển sang <strong>ĐÃ THANH TOÁN</strong> ngay
          khi payOS gửi webhook (thường trong vài giây), sau đó chúng tôi sẽ cắt file và bắt đầu in.
        </p>
      )}

      <Link
        href="/"
        className="mt-8 inline-block rounded-full bg-filament-500 px-5 py-2 text-sm font-medium text-white hover:bg-filament-600 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
      >
        Tiếp tục mua sắm
      </Link>
    </section>
  );
}
