// components/blocks/FeaturedProducts.tsx
import type { ReactElement } from 'react';
import ProductCard from '@/components/product/product-card';
import type { BlockAppearance } from '@/lib/page-builder';
import { blockAppearanceClasses } from '@/lib/page-builder';
import { getPayloadProductsByIds } from '@/lib/payload-products';

// The `products` field is a Payload relationship: depending on populate depth it
// arrives as full product docs or bare IDs. Either way ProductCard needs the
// Shopify-shaped Product, so we resolve the IDs through the data layer rather than
// passing raw Payload docs (which lack priceRange/featuredImage and crash the card).
type ProductRef = { id: string | number } | string | number;

type Props = {
  title?: string | null;
  products?: ProductRef[] | null;
  layout?: 'grid' | 'carousel' | null;
} & BlockAppearance;

function toId(ref: ProductRef): string {
  return typeof ref === 'object' && ref !== null ? String(ref.id) : String(ref);
}

export default async function FeaturedProductsBlock(props: Props): Promise<ReactElement> {
  const { title, products, layout = 'grid' } = props;
  const { section, container, style } = blockAppearanceClasses(props);

  const ids = (products ?? []).map(toId).filter(Boolean);
  const resolved = ids.length > 0 ? await getPayloadProductsByIds(ids) : [];

  if (resolved.length === 0) {
    return (
      <section className={section} style={style}>
        <div className={container}>
          <p className="text-center text-sm text-ink/60">
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
          <h2 className="mb-8 font-display text-2xl font-bold tracking-tight text-ink md:text-3xl">
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
          {resolved.map((product) => (
            <div
              key={product.id}
              className={layout === 'carousel' ? 'min-w-[250px] snap-start' : ''}
            >
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
