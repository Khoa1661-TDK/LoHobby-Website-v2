// components/home/category-banner.tsx — compact banner for category listing pages
import Image from 'next/image';
import type { ReactElement } from 'react';
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
  return (
    <div className="group relative overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
      <div className="relative aspect-[3/1] min-h-[100px] overflow-hidden sm:aspect-[4/1] sm:min-h-[120px]">
        <Image
          src={bannerImage}
          alt={category.title}
          fill
          priority
          sizes="100vw"
          className="img-banner transition duration-700 ease-out group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/40 to-transparent transition-all duration-500 group-hover:from-black/85 group-hover:via-black/50" />
        <div className="absolute inset-0 flex items-center p-4 sm:p-6">
          <div>
            <h1 className="text-lg font-bold text-white sm:text-2xl">{category.title}</h1>
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
