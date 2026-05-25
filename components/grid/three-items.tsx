// components/grid/three-items.tsx
import Link from 'next/link';
import type { ReactElement } from 'react';
import GridTileImage from '@/components/grid/tile';
import { getProducts } from '@/lib/shopify';
import type { Product } from '@/lib/shopify/types';

function ThreeItemGridItem({
  item,
  size,
  priority,
}: {
  item: Product;
  size: 'full' | 'half';
  priority?: boolean;
}): ReactElement {
  return (
    <div
      className={
        size === 'full'
          ? 'md:col-span-4 md:row-span-2'
          : 'md:col-span-2 md:row-span-1'
      }
    >
      <Link
        className="relative block aspect-square h-full w-full"
        href={`/product/${item.handle}`}
        prefetch
      >
        <GridTileImage
          src={item.featuredImage.url}
          fill
          sizes={
            size === 'full' ? '(min-width: 768px) 66vw, 100vw' : '(min-width: 768px) 33vw, 100vw'
          }
          priority={priority}
          alt={item.title}
          label={{
            position: size === 'full' ? 'center' : 'bottom',
            title: item.title,
            amount: item.priceRange.maxVariantPrice.amount,
            currencyCode: item.priceRange.maxVariantPrice.currencyCode,
          }}
        />
      </Link>
    </div>
  );
}

export async function ThreeItemGrid(): Promise<ReactElement | null> {
  const homepageItems = await getProducts({
    sortKey: 'CREATED_AT',
    reverse: true,
  });

  if (!homepageItems[0] || !homepageItems[1] || !homepageItems[2]) {
    return null;
  }

  const [firstProduct, secondProduct, thirdProduct] = homepageItems;

  return (
    <section className="mx-auto grid max-w-screen-2xl gap-4 px-4 pb-4 md:grid-cols-6 md:grid-rows-2 lg:max-h-[calc(100vh-200px)]">
      <ThreeItemGridItem size="full" item={firstProduct} priority />
      <ThreeItemGridItem size="half" item={secondProduct} priority />
      <ThreeItemGridItem size="half" item={thirdProduct} />
    </section>
  );
}
