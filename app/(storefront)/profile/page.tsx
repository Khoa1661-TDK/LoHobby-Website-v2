// app/profile/page.tsx
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import type { ReactElement } from 'react';
import { auth } from '@/auth';
import ProfileShell from '@/app/(storefront)/profile/profile-shell';
import type {
  ProfileAddress,
  ProfileOrder,
  ProfileOrderStatus,
  ProfileTabId,
  ProfileUser,
} from '@/app/(storefront)/profile/types';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Tài khoản của tôi',
  description: 'Quản lý hồ sơ, theo dõi đơn hàng và lưu địa chỉ giao hàng.',
  robots: { index: false, follow: false },
};

const VALID_TABS = new Set<ProfileTabId>(['account', 'orders', 'addresses']);

type SearchParams = Promise<{ tab?: string }>;

export default async function ProfilePage(props: {
  searchParams: SearchParams;
}): Promise<ReactElement> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login?callbackUrl=/profile');
  }

  const userId = session.user.id;

  const [userRow, orderRows, addressRows] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, image: true, createdAt: true },
    }),
    prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { items: true } } },
    }),
    prisma.userAddress.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
    }),
  ]);

  if (!userRow) {
    redirect('/login?callbackUrl=/profile');
  }

  const user: ProfileUser = {
    id: userRow.id,
    name: userRow.name,
    email: userRow.email,
    image: userRow.image,
    createdAt: userRow.createdAt.toISOString(),
  };

  const orders: ProfileOrder[] = orderRows.map((row) => ({
    id: row.id,
    orderCode: row.orderCode,
    status: row.status as ProfileOrderStatus,
    amount: row.amount,
    itemCount: row._count.items,
    deliveryMethod: row.deliveryMethod,
    paymentMethod: row.paymentMethod,
    shippingAddress: row.shippingAddress,
    createdAt: row.createdAt.toISOString(),
    paidAt: row.paidAt ? row.paidAt.toISOString() : null,
  }));

  const addresses: ProfileAddress[] = addressRows.map((row) => ({
    id: row.id,
    title: row.title,
    fullName: row.fullName,
    phone: row.phone,
    addressLine: row.addressLine,
    ward: row.ward,
    district: row.district,
    city: row.city,
    country: row.country,
    isDefault: row.isDefault,
    createdAt: row.createdAt.toISOString(),
  }));

  const { tab } = await props.searchParams;
  const initialTab: ProfileTabId =
    typeof tab === 'string' && VALID_TABS.has(tab as ProfileTabId)
      ? (tab as ProfileTabId)
      : 'account';

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-10">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-filament-600 dark:text-filament-300">
          Lô Hobby của tôi
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">
          Chào mừng trở lại, {user.name ?? user.email.split('@')[0]}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-neutral-500 dark:text-neutral-400">
          Cập nhật hồ sơ, theo dõi từng đơn hàng từ lúc in đến khi giao tận tay, và lưu sẵn địa
          chỉ giao hàng yêu thích chỉ với một cú nhấp.
        </p>
      </header>

      <ProfileShell
        user={user}
        orders={orders}
        addresses={addresses}
        initialTab={initialTab}
      />
    </section>
  );
}
