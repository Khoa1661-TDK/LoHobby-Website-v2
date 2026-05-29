// app/checkout/cancel/page.tsx
import type { Metadata } from 'next';
import type { ReactElement } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { isAdminEmail } from '@/lib/admin-emails';
import { prisma } from '@/src/lib/db-adapter';

type SearchParams = Promise<{ orderCode?: string }>;

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Đã hủy thanh toán',
  robots: { index: false, follow: false },
};

export default async function CheckoutCancelPage(props: {
  searchParams: SearchParams;
}): Promise<ReactElement> {
  const { orderCode } = await props.searchParams;
  const code = Number(orderCode);

  // Cancellation is a sensitive state transition: require an authenticated
  // session and verify ownership before flipping any row.
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=/checkout/cancel?orderCode=${orderCode ?? ''}`);
  }

  if (Number.isInteger(code)) {
    const order = await prisma.order.findUnique({
      where: { orderCode: code },
      select: { id: true, userId: true, status: true },
    });

    if (order) {
      const isOwner = order.userId === session.user.id;
      const isAdmin = isAdminEmail(session.user.email);
      // Only the order owner (or an admin) can transition the order. Any
      // other authenticated user is silently ignored — they should not be
      // able to confirm a foreign order's existence.
      if ((isOwner || isAdmin) && order.status === 'PENDING_ONLINE') {
        await prisma.order.update({
          where: { id: order.id },
          data: { status: 'CANCELLED' },
        });
      }
    }
  }

  return (
    <section className="mx-auto max-w-xl p-8">
      <h1 className="text-2xl font-semibold">Đã hủy thanh toán</h1>
      <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">
        Bạn chưa bị trừ tiền. Giỏ hàng vẫn được lưu.
      </p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-full bg-filament-500 px-5 py-2 text-sm font-medium text-white hover:bg-filament-600 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
      >
        Quay lại danh mục
      </Link>
    </section>
  );
}
