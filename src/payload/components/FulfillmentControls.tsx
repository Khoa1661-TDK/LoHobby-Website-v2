'use client';

import { toast } from '@payloadcms/ui';
import { useRouter } from 'next/navigation';
import { useState, useTransition, type CSSProperties, type ReactElement } from 'react';
import type { OrderFulfillmentView } from '@/lib/order-fulfillment-view';
import { isOrderConfirmable } from '@/lib/order-fulfillment-eligibility';
import { SHIPMENT_CARRIERS } from '@/lib/shipment/carriers';
import { SHIPMENT_STATUS_LABELS, type ShipmentStatus } from '@/lib/shipment/types';

type Props = {
  order: OrderFulfillmentView;
  onUpdated?: () => void;
};

const panelStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
};

const mutedStyle: CSSProperties = {
  color: 'var(--theme-elevation-500)',
  fontSize: '0.75rem',
};

const btnPrimary: CSSProperties = {
  width: '100%',
  borderRadius: '0.5rem',
  padding: '0.625rem 0.75rem',
  fontSize: '0.875rem',
  fontWeight: 600,
  border: 'none',
  cursor: 'pointer',
  background: 'var(--theme-success-500)',
  color: 'white',
};

const btnSecondary: CSSProperties = {
  width: '100%',
  borderRadius: '0.5rem',
  padding: '0.625rem 0.75rem',
  fontSize: '0.875rem',
  fontWeight: 600,
  border: 'none',
  cursor: 'pointer',
  background: 'var(--theme-elevation-800)',
  color: 'white',
};

const inputStyle: CSSProperties = {
  width: '100%',
  borderRadius: '0.375rem',
  border: '1px solid var(--theme-elevation-150)',
  background: 'var(--theme-elevation-0)',
  color: 'var(--theme-text)',
  padding: '0.375rem 0.5rem',
  fontSize: '0.875rem',
};

function formatDateTime(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

function getWaitingMessage(order: OrderFulfillmentView): string | null {
  if (order.confirmedAt) return null;
  if (isOrderConfirmable(order)) return null;

  if (order.paymentKind === 'gateway' && order.paymentStatus === 'pending') {
    return 'Khách đã thanh toán nhưng webhook chưa cập nhật? Dùng nút bên dưới để đánh dấu đã thanh toán, sau đó xác nhận đơn.';
  }

  if (order.paymentStatus !== 'paid') {
    return 'Chỉ xác nhận đơn đã thanh toán, COD hoặc chuyển khoản.';
  }

  return null;
}

export function FulfillmentControls({ order, onUpdated }: Props): ReactElement {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [carrierKey, setCarrierKey] = useState('ghn');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [customUrl, setCustomUrl] = useState('');

  const canMarkPaid =
    order.paymentStatus !== 'paid' &&
    order.orderStatus !== 'canceled';

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

  const waitingMessage = getWaitingMessage(order);

  const notifyUpdated = (): void => {
    onUpdated?.();
    router.refresh();
  };

  const handleMarkPaid = (): void => {
    startTransition(async () => {
      const res = await fetch(`/api/admin/orders/${order.id}/mark-paid`, { method: 'POST' });
      const result = (await res.json()) as { ok: boolean; message?: string };
      if (result.ok) {
        toast.success(result.message ?? 'Đã đánh dấu thanh toán.');
        notifyUpdated();
      } else {
        toast.error(result.message ?? 'Không thể cập nhật thanh toán.');
      }
    });
  };

  const handleConfirm = (): void => {
    startTransition(async () => {
      const res = await fetch(`/api/admin/orders/${order.id}/confirm`, { method: 'POST' });
      const result = (await res.json()) as { ok: boolean; message?: string };
      if (result.ok) {
        toast.success(result.message ?? 'Đã xác nhận.');
        notifyUpdated();
      } else {
        toast.error(result.message ?? 'Không thể xác nhận đơn.');
      }
    });
  };

  const handleShip = (): void => {
    if (trackingNumber.trim().length < 3) {
      toast.error('Mã vận đơn không hợp lệ.');
      return;
    }
    if (carrierKey === 'other' && !customUrl.trim()) {
      toast.error('Vui lòng nhập liên kết theo dõi.');
      return;
    }

    startTransition(async () => {
      const res = await fetch(`/api/admin/orders/${order.id}/ship`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          carrierKey,
          trackingNumber,
          customTrackingUrl: carrierKey === 'other' ? customUrl : null,
        }),
      });
      const result = (await res.json()) as { ok: boolean; message?: string };
      if (result.ok) {
        toast.success(result.message ?? 'Đã tạo vận đơn.');
        setTrackingNumber('');
        setCustomUrl('');
        notifyUpdated();
      } else {
        toast.error(result.message ?? 'Không thể giao hàng.');
      }
    });
  };

  const handleSync = (): void => {
    startTransition(async () => {
      const res = await fetch(`/api/admin/orders/${order.id}/sync`, { method: 'POST' });
      const result = (await res.json()) as { ok: boolean; message?: string };
      if (result.ok) {
        toast.success(result.message ?? 'Đã cập nhật.');
        notifyUpdated();
      } else {
        toast.error(result.message ?? 'Không thể cập nhật.');
      }
    });
  };

  return (
    <div style={panelStyle}>
      <dl
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '0.5rem 1rem',
          margin: 0,
          fontSize: '0.75rem',
        }}
      >
        <div>
          <dt style={{ ...mutedStyle, fontWeight: 600, textTransform: 'uppercase' }}>Xác nhận</dt>
          <dd style={{ margin: '0.25rem 0 0', color: 'var(--theme-text)' }}>
            {order.confirmedAt ? formatDateTime(order.confirmedAt) : 'Chưa xác nhận'}
          </dd>
        </div>
        <div>
          <dt style={{ ...mutedStyle, fontWeight: 600, textTransform: 'uppercase' }}>Giao hàng</dt>
          <dd style={{ margin: '0.25rem 0 0', color: 'var(--theme-text)' }}>
            {order.shippedAt ? formatDateTime(order.shippedAt) : '—'}
          </dd>
        </div>
        <div>
          <dt style={{ ...mutedStyle, fontWeight: 600, textTransform: 'uppercase' }}>Hoàn tất</dt>
          <dd style={{ margin: '0.25rem 0 0', color: 'var(--theme-text)' }}>
            {order.deliveredAt ? formatDateTime(order.deliveredAt) : '—'}
          </dd>
        </div>
        <div>
          <dt style={{ ...mutedStyle, fontWeight: 600, textTransform: 'uppercase' }}>Vận chuyển</dt>
          <dd style={{ margin: '0.25rem 0 0', color: 'var(--theme-text)' }}>
            {order.shipmentStatus
              ? SHIPMENT_STATUS_LABELS[order.shipmentStatus as ShipmentStatus]
              : '—'}
          </dd>
        </div>
      </dl>

      {waitingMessage ? (
        <p
          style={{
            margin: 0,
            padding: '0.75rem',
            borderRadius: '0.5rem',
            background: 'var(--theme-elevation-100)',
            color: 'var(--theme-text)',
            fontSize: '0.8125rem',
            lineHeight: 1.5,
          }}
        >
          {waitingMessage}
        </p>
      ) : null}

      {order.trackingNumber ? (
        <div
          style={{
            padding: '0.75rem',
            borderRadius: '0.5rem',
            background: 'var(--theme-elevation-50)',
            fontSize: '0.75rem',
          }}
        >
          <p style={{ margin: 0, fontWeight: 600 }}>{order.shippingCarrierLabel || 'Đơn vị vận chuyển'}</p>
          <p style={{ margin: '0.25rem 0 0', fontFamily: 'monospace' }}>{order.trackingNumber}</p>
          {order.trackingUrl ? (
            <a href={order.trackingUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.75rem' }}>
              Mở trang theo dõi
            </a>
          ) : null}
        </div>
      ) : null}

      {canMarkPaid ? (
        <button
          type="button"
          onClick={handleMarkPaid}
          disabled={pending}
          style={{
            ...btnPrimary,
            background: 'var(--theme-warning-500, #d97706)',
          }}
        >
          Đánh dấu đã thanh toán
        </button>
      ) : null}

      {canConfirm ? (
        <button type="button" onClick={handleConfirm} disabled={pending} style={btnPrimary}>
          Xác nhận đơn hàng
        </button>
      ) : null}

      {canShip ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            padding: '0.75rem',
            borderRadius: '0.5rem',
            border: '1px solid var(--theme-elevation-150)',
          }}
        >
          <p style={{ ...mutedStyle, margin: 0, fontWeight: 600, textTransform: 'uppercase' }}>
            Giao cho đơn vị vận chuyển
          </p>
          <select
            value={carrierKey}
            onChange={(e) => setCarrierKey(e.target.value)}
            style={inputStyle}
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
            style={{ ...inputStyle, fontFamily: 'monospace' }}
          />
          {carrierKey === 'other' ? (
            <input
              type="url"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="https://… (liên kết theo dõi)"
              style={inputStyle}
            />
          ) : null}
          <button type="button" onClick={handleShip} disabled={pending} style={btnSecondary}>
            Tạo vận đơn & giao hàng
          </button>
        </div>
      ) : null}

      {canSync ? (
        <button
          type="button"
          onClick={handleSync}
          disabled={pending}
          style={{
            ...btnPrimary,
            background: 'var(--theme-elevation-100)',
            color: 'var(--theme-text)',
            border: '1px solid var(--theme-elevation-150)',
          }}
        >
          Cập nhật trạng thái từ đơn vị vận chuyển
        </button>
      ) : null}
    </div>
  );
}

export default FulfillmentControls;
