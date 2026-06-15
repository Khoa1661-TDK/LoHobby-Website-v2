'use client';

import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useTransition, type ReactElement } from 'react';
import { toast } from 'sonner';
import { toggleWishlistAction } from '@/app/[locale]/(storefront)/wishlist-actions';
import Price from '@/components/price';
import { useWishlist } from '@/components/wishlist/wishlist-provider';
import { toNextImageSrc } from '@/lib/product-image-snapshot';
import type { ProfileWishlistProduct } from '@/app/[locale]/(storefront)/profile/types';

export default function WishlistPanel({
  products,
}: {
  products: ProfileWishlistProduct[];
}): ReactElement {
  const t = useTranslations('profile');
  const router = useRouter();
  const { setSaved } = useWishlist();
  const [pending, startTransition] = useTransition();

  if (products.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-10 text-center shadow-sm dark:border-neutral-700 dark:bg-neutral-950">
        <h2 className="text-lg font-semibold">{t('noWishlistTitle')}</h2>
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
          {t('noWishlistBody')}
        </p>
        <Link
          href="/search"
          className="mt-4 inline-block rounded-full bg-filament-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-filament-600"
        >
          {t('exploreProducts')}
        </Link>
      </div>
    );
  }

  const remove = (productId: string, productHandle: string) => {
    startTransition(async () => {
      const result = await toggleWishlistAction(productId, productHandle);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setSaved(productId, false);
      toast.success(t('removedFromWishlist'));
      router.refresh();
    });
  };

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {products.map((product) => (
        <div
          key={product.id}
          className="flex flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"
        >
          <Link href={`/product/${product.handle}`} className="relative block aspect-square">
            <Image
              src={toNextImageSrc(product.imageUrl)}
              alt={product.imageAlt}
              fill
              sizes="(min-width: 768px) 25vw, 50vw"
              className="img-fit p-2"
            />
          </Link>
          <div className="flex flex-1 flex-col gap-2 p-3">
            <Link
              href={`/product/${product.handle}`}
              className="line-clamp-2 text-sm text-neutral-800 hover:underline dark:text-neutral-200"
            >
              {product.title}
            </Link>
            <Price
              amount={product.price}
              currencyCode={product.currencyCode}
              className="mt-auto text-sm font-semibold text-red-600 dark:text-red-400"
            />
            <button
              type="button"
              disabled={pending}
              onClick={() => remove(product.id, product.handle)}
              className="rounded-full border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-600 transition hover:border-rose-300 hover:text-rose-600 disabled:opacity-60 dark:border-neutral-700 dark:text-neutral-300"
            >
              {t('unsave')}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
