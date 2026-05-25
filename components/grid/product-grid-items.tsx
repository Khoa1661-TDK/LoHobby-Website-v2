// components/grid/product-grid-items.tsx
import Link from 'next/link';
import type { ReactElement } from 'react';
import Grid from '@/components/grid';
import GridTileImage from '@/components/grid/tile';
import type { Product } from '@/lib/shopify/types';

export default function ProductGridItems({
  products,
}: {
  products: Product[];
}): ReactElement {
  return (
    <>
      {products.map((product) => (
        <Grid.Item key={product.handle} className="animate-fade">
          <Link
            className="relative inline-block h-full w-full"
            href={`/product/${product.handle}`}
            prefetch
          >
            <GridTileImage
              src={product.featuredImage.url}
              fill
              sizes="(min-width: 768px) 33vw, (min-width: 640px) 50vw, 100vw"
              alt={product.title}
              label={{
                title: product.title,
                amount: product.priceRange.maxVariantPrice.amount,
                currencyCode: product.priceRange.maxVariantPrice.currencyCode,
              }}
            />
          </Link>
        </Grid.Item>
      ))}
    </>
  );
}
