// app/checkout/success/page.tsx
import type { Metadata } from 'next';
import type { ReactElement } from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/auth';
import OrderStatusPoller from '@/components/checkout/order-status-poller';
import { isAdminEmail } from '@/lib/admin-emails';
import { getPaymentMethodByKey, type PaymentMethodKind } from '@/lib/payment-methods';
import { getPayloadOrderByCode } from '@/lib/payload-orders';
import {
  mapPayloadOrderToStorefrontStatus,
  ownsPayloadOrder,
} from '@/lib/payload-order-storefront';

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
    ? 'Cảm ơn bạn — đơn hàng đang được chuẩn bị!'
    : isCod
      ? 'Đã xác nhận đơn hàng — hẹn gặp bạn sớm!'
      : isTransfer
        ? 'Đã ghi nhận đơn hàng — vui lòng chuyển khoản'
        : 'Đang chờ xác nhận thanh toán';

  const shouldPoll = isGateway && !isPaid;

  const paymentLabel =
    method?.label ??
    (isCod
      ? 'Thanh toán khi nhận hàng'
      : isTransfer
        ? 'Chuyển khoản ngân hàng'
        : 'Thanh toán online');
  const transfer = isTransfer ? (method?.transfer ?? null) : null;
  const transferContent = method?.transfer?.transferNote
    ? `${method.transfer.transferNote} ${code}`
    : String(code);

  return (
    <section className="mx-auto max-w-xl px-4 py-8">
      {shouldPoll && <OrderStatusPoller orderCode={code} initialStatus={status} />}

      <h1 className="text-2xl font-semibold">{heading}</h1>

      <dl className="mt-6 space-y-2 text-sm">
        <div className="flex justify-between border-b py-2">
          <dt>Mã đơn hàng</dt>
          <dd className="font-mono">{code}</dd>
        </div>
        <div className="flex justify-between border-b py-2">
          <dt>Tổng tiền</dt>
          <dd>{amount.toLocaleString('vi-VN')} VND</dd>
        </div>
        <div className="flex justify-between border-b py-2">
          <dt>Trạng thái</dt>
          <dd>{status}</dd>
        </div>
        <div className="flex justify-between border-b py-2">
          <dt>Thanh toán</dt>
          <dd>{paymentLabel}</dd>
        </div>
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
        {paidAt && (
          <div className="flex justify-between border-b py-2">
            <dt>Thanh toán lúc</dt>
            <dd>{paidAt.toLocaleString('vi-VN')}</dd>
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

      {isTransfer && !isPaid && (
        <div className="mt-6 rounded-lg border border-spool-200 bg-spool-50 p-4 text-sm text-spool-800 dark:border-spool-800 dark:bg-spool-900/40 dark:text-spool-100">
          <p className="font-semibold">Thông tin chuyển khoản</p>
          <p className="mt-1 text-xs">
            Vui lòng chuyển đúng số tiền và nội dung bên dưới. Đơn hàng sẽ được xử lý sau khi
            chúng tôi xác nhận đã nhận được thanh toán.
          </p>
          <dl className="mt-3 space-y-1">
            {transfer?.bankName && (
              <div className="flex justify-between gap-4">
                <dt className="shrink-0 text-spool-700 dark:text-spool-200">Ngân hàng</dt>
                <dd className="text-right font-medium">{transfer.bankName}</dd>
              </div>
            )}
            {transfer?.accountNumber && (
              <div className="flex justify-between gap-4">
                <dt className="shrink-0 text-spool-700 dark:text-spool-200">Số tài khoản</dt>
                <dd className="text-right font-mono font-medium">{transfer.accountNumber}</dd>
              </div>
            )}
            {transfer?.accountHolder && (
              <div className="flex justify-between gap-4">
                <dt className="shrink-0 text-spool-700 dark:text-spool-200">Chủ tài khoản</dt>
                <dd className="text-right font-medium">{transfer.accountHolder}</dd>
              </div>
            )}
            <div className="flex justify-between gap-4">
              <dt className="shrink-0 text-spool-700 dark:text-spool-200">Số tiền</dt>
              <dd className="text-right font-medium">{amount.toLocaleString('vi-VN')} VND</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="shrink-0 text-spool-700 dark:text-spool-200">Nội dung</dt>
              <dd className="text-right font-mono font-medium">{transferContent}</dd>
            </div>
          </dl>
          {transfer?.qrImageUrl && (
            <div className="mt-4 flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={transfer.qrImageUrl}
                alt="Mã QR chuyển khoản"
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
