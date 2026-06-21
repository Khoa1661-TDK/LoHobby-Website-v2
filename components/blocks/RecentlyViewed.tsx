// components/blocks/RecentlyViewed.tsx
import type { ReactElement } from 'react';
import ProductCard from '@/components/product/product-card';
import type { BlockAppearance } from '@/lib/page-builder';
import { blockAppearanceClasses } from '@/lib/page-builder';
import { getPayloadProductsByIds } from '@/lib/payload-products';

type ProductRef = { id: string | number } | string | number;

type Props = {
  title?: string | null;
  limit?: number | null;
  products?: ProductRef[] | null;
} & BlockAppearance;

function toId(ref: ProductRef): string {
  return typeof ref === 'object' && ref !== null ? String(ref.id) : String(ref);
}

export default async function RecentlyViewedBlock(props: Props): Promise<ReactElement> {
  const { title, limit = 8, products } = props;
  const { section, container } = blockAppearanceClasses({ background: 'theme' });

  const ids = (products ?? []).map(toId).filter(Boolean);
  const pinned = ids.length > 0 ? await getPayloadProductsByIds(ids) : [];

  if (pinned.length > 0) {
    return (
      <section className={section}>
        <div className={container}>
          {title && <h2 className="mb-6 font-display text-2xl font-bold text-ink">{title}</h2>}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {pinned.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={section}>
      <div className={container}>
        {title && <h2 className="mb-6 font-display text-2xl font-bold text-ink">{title}</h2>}
        <p className="text-sm text-ink/60">Recently viewed items for {limit} items (client-side)</p>
      </div>
    </section>
  );
}