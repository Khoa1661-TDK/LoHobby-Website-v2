'use client';

import { toast, useDocumentInfo } from '@payloadcms/ui';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition, type CSSProperties, type ReactElement } from 'react';
import { isOrderConfirmable } from '@/lib/order-fulfillment-eligibility';
import { mapOrderToFulfillmentView } from '@/lib/order-fulfillment-view';
import type { OrderFulfillmentView } from '@/lib/order-fulfillment-view';
import { SHIPMENT_CARRIERS } from '@/lib/shipment/carriers';
import { SHIPMENT_STATUS_LABELS, type ShipmentStatus } from '@/lib/shipment/types';
import type { Order } from '@/src/payload/payload-types';

const boxStyle: CSSProperties = {
  marginBottom: '1.5rem',
  padding: '1rem',
  borderRadius: '0.75rem',
  border: '2px solid var(--theme-success-500)',
  background: 'var(--theme-elevation-50)',
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

function FulfillmentActions({
  order,
  onUpdated,
}: {
  order: OrderFulfillmentView;
  onUpdated: () => void;
}): ReactElement {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [carrierKey, setCarrierKey] = useState('ghn');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [customUrl, setCustomUrl] = useState('');

  const canMarkPaid = order.paymentStatus !== 'paid' && order.orderStatus !== 'canceled';
  const canConfirm = isOrderConfirmable(order);
  const canShip =
    Boolean(order.confirmedAt) &&
    !order.trackingNumber &&
    order.deliveryMethod === 'SHIPMENT' &&
    order.orderStatus !== 'delivered';

  const refresh = (): void => {
    onUpdated();
    router.refresh();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {order.paymentKind === 'gateway' && order.paymentStatus === 'pending' ? (
        <p style={{ margin: 0, fontSize: '0.8125rem', lineHeight: 1.5, color: 'var(--theme-text)' }}>
          Khách đã thanh toán nhưng webhook chưa cập nhật? Bấm <strong>Đánh dấu đã thanh toán</strong> bên
          dưới.
        </p>
      ) : null}

      {canMarkPaid ? (
        <button
          type="button"
          disabled={pending}
          style={{ ...btnPrimary, background: '#d97706' }}
          onClick={() => {
            startTransition(async () => {
              const res = await fetch(`/api/admin/orders/${order.id}/mark-paid`, { method: 'POST' });
              const result = (await res.json()) as { ok: boolean; message?: string };
              if (result.ok) {
                toast.success(result.message ?? 'Đã đánh dấu thanh toán.');
                refresh();
              } else {
                toast.error(result.message ?? 'Không thể cập nhật.');
              }
            });
          }}
        >
          Đánh dấu đã thanh toán
        </button>
      ) : null}

      {canConfirm ? (
        <button
          type="button"
          disabled={pending}
          style={btnPrimary}
          onClick={() => {
            startTransition(async () => {
              const res = await fetch(`/api/admin/orders/${order.id}/confirm`, { method: 'POST' });
              const result = (await res.json()) as { ok: boolean; message?: string };
              if (result.ok) {
                toast.success(result.message ?? 'Đã xác nhận.');
                refresh();
              } else {
                toast.error(result.message ?? 'Không thể xác nhận.');
              }
            });
          }}
        >
          Xác nhận đơn hàng
        </button>
      ) : null}

      {canShip ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <select
            value={carrierKey}
            onChange={(e) => setCarrierKey(e.target.value)}
            style={{ padding: '0.375rem', borderRadius: '0.375rem' }}
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
            style={{ padding: '0.375rem', borderRadius: '0.375rem', fontFamily: 'monospace' }}
          />
          {carrierKey === 'other' ? (
            <input
              type="url"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="Liên kết theo dõi"
              style={{ padding: '0.375rem', borderRadius: '0.375rem' }}
            />
          ) : null}
          <button
            type="button"
            disabled={pending}
            style={{ ...btnPrimary, background: 'var(--theme-elevation-800)' }}
            onClick={() => {
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
                  toast.success(result.message ?? 'Đã giao hàng.');
                  refresh();
                } else {
                  toast.error(result.message ?? 'Lỗi.');
                }
              });
            }}
          >
            Tạo vận đơn & giao hàng
          </button>
        </div>
      ) : null}

      {order.shipmentStatus ? (
        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--theme-elevation-500)' }}>
          Vận chuyển: {SHIPMENT_STATUS_LABELS[order.shipmentStatus as ShipmentStatus]}
        </p>
      ) : null}

        Hoặc quay lại{' '}
        <a href="/admin/collections/orders" style={{ color: 'var(--theme-success-500)' }}>
          danh sách đơn hàng
        </a>
        .
    </div>
  );
}

/** Fulfillment panel on Payload order edit (client-safe — no server imports). */
export function OrderFulfillmentPanel(): ReactElement {
  const { id, data } = useDocumentInfo();
  const router = useRouter();

  const order = useMemo(() => {
    if (!id || !data) return null;
    return mapOrderToFulfillmentView(data as Order);
  }, [id, data]);

  if (!id) {
    return (
      <div style={boxStyle}>
        <p style={{ margin: 0, fontSize: '0.875rem' }}>Lưu đơn trước khi xử lý vận chuyển.</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div style={boxStyle}>
        <p style={{ margin: 0, fontSize: '0.875rem' }}>Đang tải…</p>
      </div>
    );
  }

  return (
    <div style={boxStyle}>
      <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', fontWeight: 700, color: 'var(--theme-success-500)' }}>
        Xử lý & vận chuyển — #{order.orderCode}
      </h3>
      <FulfillmentActions order={order} onUpdated={() => router.refresh()} />
    </div>
  );
}

export default OrderFulfillmentPanel;
