/** Order status enum → key under `checkout.statusLabels` in messages/*.json. */
const STATUS_LABEL_KEYS: Record<string, string> = {
  PENDING: 'pending',
  PENDING_COD: 'pendingCod',
  PENDING_ONLINE: 'pendingOnline',
  PENDING_TRANSFER: 'pendingTransfer',
  PAID: 'paid',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
};

export function orderStatusLabelKey(status: string): string {
  return STATUS_LABEL_KEYS[status] ?? 'pending';
}
