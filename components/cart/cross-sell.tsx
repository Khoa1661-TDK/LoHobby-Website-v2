'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition, type ReactElement } from 'react';
import { toast } from 'sonner';
import { addItemAction } from '@/components/cart/actions';
import Price from '@/components/price';
import type { CrossSellProduct } from '@/app/api/cross-sell/route';
import { toNextImageSrc } from '@/lib/product-image-snapshot';

export default function CartCrossSell({
  excludeHandles,
}: {
  excludeHandles: string[];
}): ReactElement | null {
  const router = useRouter();
  const [items, setItems] = useState<CrossSellProduct[]>([]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const params = new URLSearchParams();
    if (excludeHandles.length > 0) params.set('exclude', excludeHandles.join(','));
    fetch(`/api/cross-sell?${params.toString()}`, { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : { suggestions: [] }))
      .then((data: { suggestions?: CrossSellProduct[] }) => setItems(data.suggestions ?? []))
      .catch(() => undefined);
  }, [excludeHandles]);

  if (items.length === 0) return null;

  return (
    <div className="border-t border-neutral-200 py-3 dark:border-neutral-700">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
        Gợi ý thêm
      </p>
      <ul className="flex gap-3 overflow-x-auto">
        {items.map((item) => (
          <li key={item.id} className="w-24 flex-none">
            <div className="relative aspect-square overflow-hidden rounded-md border border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-950">
              <Image
                src={toNextImageSrc(item.image)}
                alt={item.title}
                fill
                sizes="96px"
                className="img-fit p-1"
              />
            </div>
            <p className="mt-1 line-clamp-2 text-[11px] leading-tight text-neutral-700 dark:text-neutral-300">
              {item.title}
            </p>
            <Price
              amount={item.price}
              currencyCode={item.currencyCode}
              className="text-[11px] font-semibold text-red-600 dark:text-red-400"
            />
            <button
              type="button"
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  const result = await addItemAction(item.id);
                  if (result?.error) {
                    toast.error(result.error);
                    return;
                  }
                  toast.success('Đã thêm vào giỏ');
                  router.refresh();
                })
              }
              className="mt-1 w-full rounded-full border border-neutral-300 py-1 text-[11px] font-medium transition hover:bg-neutral-100 disabled:opacity-60 dark:border-neutral-700 dark:hover:bg-neutral-800"
            >
              + Thêm
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
