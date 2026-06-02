'use client';

import { useRouter } from 'next/navigation';
import { useTransition, type ReactElement } from 'react';
import { toast } from 'sonner';
import { toggleWishlistAction } from '@/app/(storefront)/wishlist-actions';
import { useWishlist } from '@/components/wishlist/wishlist-provider';

type Props = {
  productId: string;
  productHandle: string;
  variant?: 'overlay' | 'inline';
  className?: string;
};

export default function WishlistButton({
  productId,
  productHandle,
  variant = 'overlay',
  className,
}: Props): ReactElement {
  const router = useRouter();
  const { has, setSaved } = useWishlist();
  const [pending, startTransition] = useTransition();
  const saved = has(productId);

  const onClick = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    startTransition(async () => {
      const result = await toggleWishlistAction(productId, productHandle);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setSaved(productId, result.saved);
      toast.success(result.saved ? 'Đã lưu vào yêu thích' : 'Đã bỏ khỏi yêu thích');
      router.refresh();
    });
  };

  const base =
    variant === 'overlay'
      ? 'absolute right-2.5 top-2.5 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-soft-sm backdrop-blur-sm transition-all duration-200 hover:bg-white hover:scale-110 dark:bg-warm-900/90 dark:hover:bg-warm-900'
      : 'inline-flex h-11 items-center gap-2 rounded-xl border border-warm-200/80 px-5 text-sm font-medium transition-all duration-200 hover:border-warm-300 hover:bg-warm-50 dark:border-warm-800/60 dark:hover:bg-warm-900';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-pressed={saved}
      aria-label={saved ? 'Bỏ khỏi danh sách yêu thích' : 'Lưu vào danh sách yêu thích'}
      title={saved ? 'Bỏ khỏi yêu thích' : 'Lưu vào yêu thích'}
      className={`${base} ${className ?? ''} disabled:opacity-60`}
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden
        className={`h-5 w-5 transition-colors duration-200 ${saved ? 'text-rose-500 scale-110' : 'text-warm-400 hover:text-rose-400 dark:text-warm-500'}`}
        fill={saved ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={1.8}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.687 0-3.163.91-3.937 2.262C11.601 4.66 10.124 3.75 8.437 3.75 5.85 3.75 3.75 5.765 3.75 8.25c0 7.22 8.25 11.25 8.25 11.25s8.25-4.03 8.25-11.25z"
        />
      </svg>
      {variant === 'inline' ? <span className="text-warm-700 dark:text-warm-300">{saved ? 'Đã lưu' : 'Lưu sản phẩm'}</span> : null}
    </button>
  );
}