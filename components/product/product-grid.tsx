// components/product/product-grid.tsx
import type { ReactElement } from 'react';
import ProductCard from '@/components/product/product-card';
import type { Product } from '@/lib/shopify/types';

type Props = {
  products: Product[];
  priorityCount?: number;
};

export default function ProductGrid({
  products,
  priorityCount = 4,
}: Props): ReactElement {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 lg:gap-4">
      {products.map((product, index) => (
        <ProductCard
          key={product.handle}
          product={product}
          priority={index < priorityCount}
          index={index}
        />
      ))}
    </div>
  );
}