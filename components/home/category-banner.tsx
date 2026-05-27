// components/home/category-banner.tsx — compact banner for category listing pages
import Image from 'next/image';
import type { ReactElement } from 'react';
import { getCategoryIcon } from '@/lib/categories';
import type { StoreCategory } from '@/lib/categories';

type Props = {
  category: StoreCategory;
  bannerImage: string;
  productCount: number;
};

export default function CategoryBanner({
  category,
  bannerImage,
  productCount,
}: Props): ReactElement {
  const icon = getCategoryIcon(category.slug);

  return (
    <div className="relative overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
      <div className="relative aspect-[3/1] min-h-[100px] sm:aspect-[4/1] sm:min-h-[120px]">
        <Image
          src={bannerImage}
          alt={category.title}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/40 to-transparent" />
        <div className="absolute inset-0 flex items-center gap-3 p-4 sm:p-6">
          <span className="hidden text-3xl sm:inline" aria-hidden="true">
            {icon}
          </span>
          <div>
            <h2 className="text-lg font-bold text-white sm:text-2xl">{category.title}</h2>
            <p className="mt-0.5 line-clamp-1 text-xs text-white/80 sm:text-sm">
              {category.subtitle}
            </p>
            <p className="mt-1 text-xs text-white/60">{productCount} sản phẩm</p>
          </div>
        </div>
      </div>
    </div>
  );
}
