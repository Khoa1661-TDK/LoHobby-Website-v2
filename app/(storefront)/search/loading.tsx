import type { ReactElement } from 'react';
import ProductGridSkeleton from '@/components/product/product-grid-skeleton';

export default function SearchLoading(): ReactElement {
  return (
    <div className="py-4">
      <div className="mb-4 h-7 w-48 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
      <ProductGridSkeleton />
    </div>
  );
}
