// app/checkout/cancel/page.tsx
import type { Metadata } from 'next';
import type { ReactElement } from 'react';
import Link from 'next/link';
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
  if (Number.isInteger(code)) {
    await prisma.order.updateMany({
      where: { orderCode: code, status: 'PENDING' },
      data: { status: 'CANCELLED' },
    });
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
