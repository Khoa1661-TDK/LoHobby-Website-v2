// app/(payload)/admin/orders/page.tsx
import Link from 'next/link';
import type { ReactElement } from 'react';
import type { DeliveryMethod, OrderStatus, PaymentMethod } from '@/generated/prisma/enums';
import { prisma } from '@/lib/prisma';
import OrderStatusSelect from './status-select';

const dateFormatter = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'short',
  timeStyle: 'short',
});

type OrderRow = {
  id: string;
  orderCode: number;
  customerName: string;
  phoneNumber: string;
  deliveryMethod: DeliveryMethod | null;
  paymentMethod: PaymentMethod | null;
  status: OrderStatus;
  createdAt: Date;
};

async function loadOrders(): Promise<OrderRow[]> {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true,
      orderCode: true,
      customerName: true,
      buyerName: true,
      phoneNumber: true,
      buyerPhone: true,
      deliveryMethod: true,
      paymentMethod: true,
      status: true,
      createdAt: true,
    },
  });

  return orders.map((order) => ({
    id: order.id,
    orderCode: order.orderCode,
    customerName: order.customerName ?? order.buyerName ?? '—',
    phoneNumber: order.phoneNumber ?? order.buyerPhone ?? '—',
    deliveryMethod: order.deliveryMethod,
    paymentMethod: order.paymentMethod,
    status: order.status,
    createdAt: order.createdAt,
  }));
}

export default async function AdminOrdersPage(): Promise<ReactElement> {
  const orders = await loadOrders();

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 md:p-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Quản trị
          </p>
          <h1 className="text-2xl font-semibold text-neutral-900">Đơn hàng</h1>
          <p className="mt-1 text-sm text-neutral-600">
            {orders.length.toLocaleString('vi-VN')} đơn gần nhất. Cập nhật trạng thái trực tiếp để
            tiến hành xử lý.
          </p>
        </div>
        <Link
          href="/admin"
          className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
        >
          ← Về danh mục
        </Link>
      </header>

      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200 text-sm">
            <thead className="bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">
              <tr>
                <th className="px-4 py-3">Đơn hàng</th>
                <th className="px-4 py-3">Khách hàng</th>
                <th className="px-4 py-3">Điện thoại</th>
                <th className="px-4 py-3">Giao hàng</th>
                <th className="px-4 py-3">Thanh toán</th>
                <th className="px-4 py-3">Ngày tạo</th>
                <th className="px-4 py-3">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 bg-white">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-neutral-500">
                    Chưa có đơn hàng nào.
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="hover:bg-neutral-50">
                    <td className="px-4 py-3 font-mono text-xs text-neutral-700">
                      #{order.orderCode}
                    </td>
                    <td className="px-4 py-3 font-medium text-neutral-900">
                      {order.customerName}
                    </td>
                    <td className="px-4 py-3 text-neutral-700">{order.phoneNumber}</td>
                    <td className="px-4 py-3 text-neutral-700">
                      {order.deliveryMethod ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-neutral-700">
                      {order.paymentMethod ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-neutral-600">
                      {dateFormatter.format(order.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <OrderStatusSelect
                        orderId={order.id}
                        currentStatus={order.status}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
