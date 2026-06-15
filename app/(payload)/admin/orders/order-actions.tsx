// app/(payload)/admin/orders/order-actions.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition, type FormEvent, type ReactElement } from 'react';
import { toast } from 'sonner';
import { SHIPMENT_CARRIERS } from '@/lib/shipment/carriers';
import { ACTION_LABELS, availableActions, type OrderAction } from '@/lib/order-transitions';
import type { OrderFulfillmentView } from '@/lib/order-fulfillment-view';
import { runOrderAction } from './actions';

type Props = { order: OrderFulfillmentView };

const DESTRUCTIVE: ReadonlySet<OrderAction> = new Set(['cancel', 'refund']);

export default function OrderActions({ order }: Props): ReactElement {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showShip, setShowShip] = useState(false);
  const [carrierKey, setCarrierKey] = useState('ghn');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [customUrl, setCustomUrl] = useState('');

  const actions = availableActions(order);
  const primary = actions[0];
  if (!primary) {
    return <p className="text-xs text-neutral-400">Không có thao tác.</p>;
  }
  const secondary = actions.slice(1);

  const run = (action: OrderAction): void => {
    if (action === 'ship') {
      setShowShip(true);
      return;
    }
    if (DESTRUCTIVE.has(action)) {
      const verb = action === 'cancel' ? 'hủy' : 'hoàn tiền';
      if (!window.confirm(`Bạn chắc chắn muốn ${verb} đơn #${order.orderCode}?`)) return;
    }
    startTransition(async () => {
      const result = await runOrderAction(order.id, action);
      if (result.ok) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  };

  const submitShip = (event: FormEvent): void => {
    event.preventDefault();
    startTransition(async () => {
      const result = await runOrderAction(order.id, 'ship', {
        carrierKey,
        trackingNumber,
        customTrackingUrl: carrierKey === 'other' ? customUrl : null,
      });
      if (result.ok) {
        toast.success(result.message);
        setShowShip(false);
        setTrackingNumber('');
        setCustomUrl('');
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => run(primary)}
          disabled={pending}
          className={`rounded-lg px-3 py-2 text-sm font-semibold text-white transition disabled:opacity-60 ${
            DESTRUCTIVE.has(primary) ? 'bg-rose-600 hover:bg-rose-700' : 'bg-indigo-600 hover:bg-indigo-700'
          }`}
        >
          {ACTION_LABELS[primary]}
        </button>
        {secondary.map((action) => (
          <button
            key={action}
            type="button"
            onClick={() => run(action)}
            disabled={pending}
            className={`rounded-lg border px-3 py-2 text-sm font-medium transition disabled:opacity-60 ${
              DESTRUCTIVE.has(action)
                ? 'border-rose-200 text-rose-700 hover:bg-rose-50'
                : 'border-neutral-300 text-neutral-700 hover:bg-neutral-50'
            }`}
          >
            {ACTION_LABELS[action]}
          </button>
        ))}
      </div>

      {showShip ? (
        <form onSubmit={submitShip} className="space-y-2 rounded-lg border border-neutral-200 p-3">
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
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="flex-1 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
            >
              Tạo vận đơn & giao hàng
            </button>
            <button
              type="button"
              onClick={() => setShowShip(false)}
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-600"
            >
              Hủy
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
