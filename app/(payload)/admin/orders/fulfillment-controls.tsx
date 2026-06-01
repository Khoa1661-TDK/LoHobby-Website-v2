// app/(payload)/admin/orders/fulfillment-controls.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition, type FormEvent, type ReactElement } from 'react';
import { toast } from 'sonner';
import { isOrderConfirmable } from '@/lib/order-fulfillment-eligibility';
import { SHIPMENT_CARRIERS } from '@/lib/shipment/carriers';
import { SHIPMENT_STATUS_LABELS, type ShipmentStatus } from '@/lib/shipment/types';
import type { OrderFulfillmentView } from '@/lib/order-fulfillment';
import {
  assignShipmentAction,
  confirmOrderAction,
  syncShipmentAction,
} from './fulfillment-actions';

type Props = {
  order: OrderFulfillmentView;
  onUpdated?: () => void;
};

function formatDateTime(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

export default function FulfillmentControls({ order, onUpdated }: Props): ReactElement {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [carrierKey, setCarrierKey] = useState('ghn');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [customUrl, setCustomUrl] = useState('');

  const canConfirm = isOrderConfirmable({
    paymentStatus: order.paymentStatus,
    orderStatus: order.orderStatus,
    paymentKind: order.paymentKind,
    confirmedAt: order.confirmedAt,
  });

  const canShip =
    Boolean(order.confirmedAt) &&
    !order.trackingNumber &&
    order.deliveryMethod === 'SHIPMENT' &&
    order.orderStatus !== 'delivered';

  const canSync =
    Boolean(order.trackingNumber) &&
    order.shipmentStatus !== 'delivered' &&
    order.shipmentStatus !== 'failed';

  const notifyUpdated = (): void => {
    onUpdated?.();
    router.refresh();
  };

  const handleConfirm = (): void => {
    startTransition(async () => {
      const result = await confirmOrderAction(order.id);
      if (result.ok) {
        toast.success(result.message);
        notifyUpdated();
      } else toast.error(result.message);
    });
  };

  const handleShip = (event: FormEvent): void => {
    event.preventDefault();
    startTransition(async () => {
      const result = await assignShipmentAction({
        docId: order.id,
        carrierKey,
        trackingNumber,
        customTrackingUrl: carrierKey === 'other' ? customUrl : null,
      });
      if (result.ok) {
        toast.success(result.message);
        setTrackingNumber('');
        setCustomUrl('');
        notifyUpdated();
      } else {
        toast.error(result.message);
      }
    });
  };

  const handleSync = (): void => {
    startTransition(async () => {
      const result = await syncShipmentAction(order.id);
      if (result.ok) {
        toast.success(result.message);
        notifyUpdated();
      } else toast.error(result.message);
    });
  };

  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-neutral-600">
        <div>
          <dt className="font-semibold uppercase tracking-wider text-neutral-400">Xác nhận</dt>
          <dd>{order.confirmedAt ? formatDateTime(order.confirmedAt) : 'Chưa xác nhận'}</dd>
        </div>
        <div>
          <dt className="font-semibold uppercase tracking-wider text-neutral-400">Giao hàng</dt>
          <dd>{order.shippedAt ? formatDateTime(order.shippedAt) : '—'}</dd>
        </div>
        <div>
          <dt className="font-semibold uppercase tracking-wider text-neutral-400">Hoàn tất</dt>
          <dd>{order.deliveredAt ? formatDateTime(order.deliveredAt) : '—'}</dd>
        </div>
        <div>
          <dt className="font-semibold uppercase tracking-wider text-neutral-400">Vận chuyển</dt>
          <dd>
            {order.shipmentStatus
              ? SHIPMENT_STATUS_LABELS[order.shipmentStatus as ShipmentStatus]
              : '—'}
          </dd>
        </div>
      </dl>

      {order.trackingNumber ? (
        <div className="rounded-lg bg-neutral-50 p-3 text-xs">
          <p className="font-semibold text-neutral-800">
            {order.shippingCarrierLabel || 'Đơn vị vận chuyển'}
          </p>
          <p className="mt-1 font-mono">{order.trackingNumber}</p>
          {order.trackingUrl ? (
            <a
              href={order.trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block text-filament-600 underline"
            >
              Mở trang theo dõi
            </a>
          ) : null}
        </div>
      ) : null}

      {canConfirm ? (
        <button
          type="button"
          onClick={handleConfirm}
          disabled={pending}
          className="w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
        >
          Xác nhận đơn hàng
        </button>
      ) : null}

      {canShip ? (
        <form onSubmit={handleShip} className="space-y-2 rounded-lg border border-neutral-200 p-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Giao cho đơn vị vận chuyển
          </p>
          <select
            value={carrierKey}
            onChange={(e) => setCarrierKey(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
          >
            {SHIPMENT_CARRIERS.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
            placeholder="Mã vận đơn"
            required
            className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm font-mono"
          />
          {carrierKey === 'other' ? (
            <input
              type="url"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="https://… (liên kết theo dõi)"
              required
              className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
            />
          ) : null}
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
          >
            Tạo vận đơn & giao hàng
          </button>
        </form>
      ) : null}

      {canSync ? (
        <button
          type="button"
          onClick={handleSync}
          disabled={pending}
          className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-60"
        >
          Cập nhật trạng thái từ đơn vị vận chuyển
        </button>
      ) : null}

      {order.deliveryMethod === 'PICKUP' && order.confirmedAt && !order.deliveredAt ? (
        <p className="text-xs text-neutral-500">
          Đơn nhận tại cửa hàng — đánh dấu &quot;Delivered&quot; trong Payload khi khách đã nhận.
        </p>
      ) : null}
    </div>
  );
}
