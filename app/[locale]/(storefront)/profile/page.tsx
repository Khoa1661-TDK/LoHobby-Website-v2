// app/profile/page.tsx
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import type { ReactElement } from 'react';
import { auth } from '@/auth';
import ProfileShell from '@/app/[locale]/(storefront)/profile/profile-shell';
import type {
  ProfileAddress,
  ProfileOrder,
  ProfileTabId,
  ProfileUser,
  ProfileWishlistProduct,
} from '@/app/[locale]/(storefront)/profile/types';
import { loadProfileOrders } from '@/lib/profile-orders';
import { getPayloadProductsByIds } from '@/lib/payload-products';
import { prisma } from '@/lib/prisma';
import { getWishlistProductIds } from '@/lib/wishlist';

export const dynamic = 'force-dynamic';

type LocaleParams = { locale: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<LocaleParams>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'profile' });
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    robots: { index: false, follow: false },
  };
}

const VALID_TABS = new Set<ProfileTabId>(['account', 'orders', 'addresses', 'wishlist']);

type SearchParams = Promise<{ tab?: string }>;

export default async function ProfilePage(props: {
  searchParams: SearchParams;
}): Promise<ReactElement> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login?callbackUrl=/profile');
  }

  const userId = session.user.id;

  const [userRow, addressRows, t] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, image: true, createdAt: true },
    }),
    prisma.userAddress.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
    }),
    getTranslations('profile'),
  ]);

  const orders = await loadProfileOrders({
    userId,
    email: userRow?.email ?? session.user.email ?? '',
  });

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

  const wishlistIds = await getWishlistProductIds(userId);
  const wishlistProducts = wishlistIds.length > 0 ? await getPayloadProductsByIds(wishlistIds) : [];
  const wishlist: ProfileWishlistProduct[] = wishlistProducts.map((product) => ({
    id: product.id,
    handle: product.handle,
    title: product.title,
    imageUrl: product.featuredImage.url,
    imageAlt: product.featuredImage.altText || product.title,
    price: product.priceRange.minVariantPrice.amount,
    currencyCode: product.priceRange.minVariantPrice.currencyCode,
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
          {t('eyebrow')}
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">
          {t('welcomeBack', { name: user.name ?? user.email.split('@')[0] ?? user.email })}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-neutral-500 dark:text-neutral-400">
          {t('heroSubtitle')}
        </p>
      </header>

      <ProfileShell
        user={user}
        orders={orders}
        addresses={addresses}
        wishlist={wishlist}
        initialTab={initialTab}
      />
    </section>
  );
}
