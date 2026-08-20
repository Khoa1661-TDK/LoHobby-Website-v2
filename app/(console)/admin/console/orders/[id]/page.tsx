// app/(console)/admin/console/orders/[id]/page.tsx
//
// Order detail. Server component; the AppShell chrome comes from the group
// layout, so this page only supplies the content stack.

import { notFound } from 'next/navigation';
import { OrderDetail } from '@/components/console/orders/OrderDetail';
import { getOrderDetail } from '@/lib/console/orders';

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getOrderDetail(id);
  if (!order) notFound();

  return (
    <div className="flex h-full flex-col">
      <OrderDetail order={order} />
    </div>
  );
}
