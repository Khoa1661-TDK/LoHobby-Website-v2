// app/(payload)/admin/orders/status-select.tsx
'use client';

import { useState, useTransition } from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import { toast } from 'sonner';
import {
  mapPayloadOrderToStorefrontStatus,
  type StorefrontOrderStatus,
} from '@/lib/payload-order-storefront';
import { updateOrderStatus } from './actions';

const STATUS_OPTIONS: readonly StorefrontOrderStatus[] = [
  'PENDING',
  'PENDING_COD',
  'PENDING_ONLINE',
  'PENDING_TRANSFER',
  'PAID',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
];

const STATUS_BADGE_CLASS: Record<StorefrontOrderStatus, string> = {
  PENDING: 'bg-neutral-200 text-neutral-700 ring-neutral-300',
  PENDING_COD: 'bg-amber-100 text-amber-800 ring-amber-200',
  PENDING_ONLINE: 'bg-sky-100 text-sky-800 ring-sky-200',
  PENDING_TRANSFER: 'bg-purple-100 text-purple-800 ring-purple-200',
  PAID: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
  SHIPPED: 'bg-indigo-100 text-indigo-800 ring-indigo-200',
  DELIVERED: 'bg-teal-100 text-teal-800 ring-teal-200',
  CANCELLED: 'bg-rose-100 text-rose-800 ring-rose-200',
};

type Props = {
  orderDocId: string | number;
  paymentStatus?: string | null;
  orderStatus?: string | null;
  paymentKind?: string | null;
};

export default function OrderStatusSelect({
  orderDocId,
  paymentStatus,
  orderStatus,
  paymentKind,
}: Props): ReactElement {
  const initial = mapPayloadOrderToStorefrontStatus({
    paymentStatus,
    orderStatus,
    paymentKind,
  });
  const [value, setValue] = useState<StorefrontOrderStatus>(initial);
  const [pending, startTransition] = useTransition();

  const onChange = (event: ChangeEvent<HTMLSelectElement>): void => {
    const next = event.target.value as StorefrontOrderStatus;
    const previous = value;
    setValue(next);

    startTransition(async () => {
      const result = await updateOrderStatus(orderDocId, next);
      if (!result.ok) {
        setValue(previous);
        toast.error(result.message);
      } else {
        toast.success(`Đã cập nhật đơn → ${next}`);
      }
    });
  };

  return (
    <div className="flex items-center gap-2">
      <span
        className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_BADGE_CLASS[value]}`}
      >
        {value}
      </span>
      <select
        value={value}
        onChange={onChange}
        disabled={pending}
        className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-xs font-medium text-neutral-800 shadow-sm transition focus:border-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {STATUS_OPTIONS.map((status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </select>
      {pending ? <span className="text-xs text-neutral-400">đang lưu…</span> : null}
    </div>
  );
}
