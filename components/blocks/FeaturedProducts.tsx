// components/blocks/FeaturedProducts.tsx
import type { ReactElement } from 'react';
import ProductCard from '@/components/product/product-card';
import type { BlockAppearance } from '@/lib/page-builder';
import { blockAppearanceClasses } from '@/lib/page-builder';

type Props = {
  title?: string | null;
  products?: { id: string | number; title: string; handle: string; [key: string]: unknown }[];
  layout?: 'grid' | 'carousel' | null;
} & BlockAppearance;

export default function FeaturedProductsBlock(props: Props): ReactElement {
  const { title, products, layout = 'grid' } = props;
  const { section, container, style } = blockAppearanceClasses(props);

  if (!products || products.length === 0) {
    return (
      <section className={section} style={style}>
        <div className={container}>
          <p className="text-center text-sm text-warm-500">
            No products selected — configure this block in the admin panel.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className={section} style={style}>
      <div className={container}>
        {title ? (
          <h2 className="mb-8 font-display text-2xl font-bold tracking-tight md:text-3xl">
            {title}
          </h2>
        ) : null}
        <div
          className={
            layout === 'carousel'
              ? 'flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide'
              : 'grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4'
          }
        >
          {products.map((product) => (
            <div
              key={String(product.id)}
              className={layout === 'carousel' ? 'min-w-[250px] snap-start' : ''}
            >
              <ProductCard product={product as Parameters<typeof ProductCard>[0]['product']} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}