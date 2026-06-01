'use client';

import { toast } from '@payloadcms/ui';
import type { DefaultCellComponentProps } from 'payload';
import { useRouter } from 'next/navigation';
import { useTransition, type CSSProperties, type ReactElement } from 'react';

const btnStyle: CSSProperties = {
  borderRadius: '0.375rem',
  padding: '0.25rem 0.5rem',
  fontSize: '0.75rem',
  fontWeight: 600,
  border: 'none',
  cursor: 'pointer',
  background: '#d97706',
  color: 'white',
};

/** Quick actions column on /admin/collections/orders list. */
export function OrderFulfillmentListCell({ rowData }: DefaultCellComponentProps): ReactElement {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const id = rowData?.id;
  const paymentStatus = typeof rowData?.paymentStatus === 'string' ? rowData.paymentStatus : '';
  const orderStatus = typeof rowData?.orderStatus === 'string' ? rowData.orderStatus : '';

  if (!id) return <span>—</span>;

  const editUrl = `/admin/collections/orders/${String(id)}`;

  if (paymentStatus === 'paid') {
    return (
      <a href={editUrl} style={{ fontSize: '0.75rem', fontWeight: 600 }}>
        Xử lý →
      </a>
    );
  }

  if (orderStatus === 'canceled') {
    return <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>Đã hủy</span>;
  }

  return (
    <button
      type="button"
      disabled={pending}
      style={btnStyle}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        startTransition(async () => {
          const controller = new AbortController();
          const timeout = window.setTimeout(() => controller.abort(), 15_000);
          try {
            const res = await fetch(`/api/admin/orders/${String(id)}/mark-paid`, {
              method: 'POST',
              signal: controller.signal,
            });
            const result = (await res.json()) as { ok: boolean; message?: string };
            if (result.ok) {
              toast.success(result.message ?? 'Đã đánh dấu thanh toán.');
              router.refresh();
            } else {
              toast.error(result.message ?? 'Không thể cập nhật.');
            }
          } catch {
            toast.error('Yêu cầu quá lâu. Thử tải lại trang hoặc mở lại đơn hàng.');
          } finally {
            window.clearTimeout(timeout);
          }
        });
      }}
    >
      {pending ? '…' : 'Đánh dấu TT'}
    </button>
  );
}

export default OrderFulfillmentListCell;
