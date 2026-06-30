// components/blocks/ProductShowcase.tsx — server block: resolves selected
// products, renders heading/subheading, and hands off to the client island for
// category-tab filtering + sorting.
import type { ReactElement } from 'react';
import type { BlockAppearance } from '@/lib/page-builder';
import { blockAppearanceClasses } from '@/lib/page-builder';
import { getPayloadProductsByIds } from '@/lib/payload-products';
import ProductShowcaseClient from './ProductShowcase.client';

type ProductRef = { id: string | number } | string | number;

type Props = {
  eyebrow?: string | null;
  heading?: string | null;
  subheading?: string | null;
  products?: ProductRef[] | null;
  showTabs?: boolean | null;
  showSort?: boolean | null;
} & BlockAppearance;

function toId(ref: ProductRef): string {
  return typeof ref === 'object' && ref !== null ? String(ref.id) : String(ref);
}

export default async function ProductShowcaseBlock(props: Props): Promise<ReactElement> {
  const { eyebrow, heading, subheading, products, showTabs = true, showSort = true } = props;
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
        {eyebrow ? (
          <p className="mb-2 text-center text-xs font-semibold uppercase tracking-[0.3em] text-accent-2">
            {eyebrow}
          </p>
        ) : null}
        {heading ? (
          <h2 className="mb-3 text-center font-display text-2xl font-bold tracking-tight text-ink md:text-3xl">
            {heading}
          </h2>
        ) : null}
        {subheading ? (
          <p className="mx-auto mb-10 max-w-2xl text-center text-sm text-ink/60">{subheading}</p>
        ) : null}
        <ProductShowcaseClient
          products={resolved}
          showTabs={showTabs !== false}
          showSort={showSort !== false}
        />
      </div>
    </section>
  );
}
