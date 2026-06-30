// components/blocks/ProductShowcase.client.tsx — client island for the
// ProductShowcase block: category tab filter + sort dropdown over a fixed
// product set, all client-side (no reload).
'use client';

import { useMemo, useState, type ReactElement } from 'react';
import { useTranslations } from 'next-intl';
import ProductCard from '@/components/product/product-card';
import type { Product } from '@/lib/shopify/types';
import {
  buildShowcaseTabs,
  filterAndSortShowcase,
  type ShowcaseSort,
} from '@/lib/page-builder/product-showcase';

type Props = {
  products: Product[];
  showTabs: boolean;
  showSort: boolean;
};

export default function ProductShowcaseClient({
  products,
  showTabs,
  showSort,
}: Props): ReactElement {
  const t = useTranslations('product');
  const [activeTab, setActiveTab] = useState('all');
  const [sort, setSort] = useState<ShowcaseSort>('featured');

  const tabs = useMemo(
    () => buildShowcaseTabs(products, t('showcaseAll')),
    [products, t],
  );
  const visible = useMemo(
    () => filterAndSortShowcase(products, activeTab, sort),
    [products, activeTab, sort],
  );

  return (
    <div>
      {(showTabs && tabs.length > 1) || showSort ? (
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          {showTabs && tabs.length > 1 ? (
            <div className="flex flex-wrap gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab.slug}
                  type="button"
                  onClick={() => setActiveTab(tab.slug)}
                  aria-pressed={activeTab === tab.slug}
                  className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                    activeTab === tab.slug
                      ? 'border-ink bg-ink text-surface'
                      : 'border-line text-ink/70 hover:border-ink/40 hover:text-ink'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          ) : (
            <span />
          )}
          {showSort ? (
            <label className="flex items-center gap-2 text-sm text-ink/60">
              <span className="sr-only sm:not-sr-only">{t('showcaseSortLabel')}</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as ShowcaseSort)}
                className="rounded-full border border-line bg-surface px-4 py-1.5 text-sm text-ink focus:border-ink focus:outline-none"
              >
                <option value="featured">{t('showcaseSortFeatured')}</option>
                <option value="price-asc">{t('showcaseSortPriceAsc')}</option>
                <option value="price-desc">{t('showcaseSortPriceDesc')}</option>
              </select>
            </label>
          ) : null}
        </div>
      ) : null}

      {visible.length === 0 ? (
        <p className="py-12 text-center text-sm text-ink/50">{t('showcaseEmpty')}</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {visible.map((product, i) => (
            <ProductCard key={product.id} product={product} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
