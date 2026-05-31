'use client';

import { useRouter } from 'next/navigation';
import { useTransition, type ReactElement } from 'react';
import { toast } from 'sonner';
import { toggleWishlistAction } from '@/app/(storefront)/wishlist-actions';
import { useWishlist } from '@/components/wishlist/wishlist-provider';

type Props = {
  productId: string;
  productHandle: string;
  /** Compact circular variant used as an overlay on product cards. */
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
    // Product cards wrap the tile in a Link; don't navigate when toggling.
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
      ? 'absolute right-1.5 top-1.5 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-sm transition hover:bg-white dark:bg-neutral-900/90 dark:hover:bg-neutral-900'
      : 'inline-flex h-11 items-center gap-2 rounded-full border border-neutral-300 px-5 text-sm font-medium transition hover:border-neutral-500 dark:border-neutral-700';

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
        className={`h-5 w-5 ${saved ? 'text-rose-500' : 'text-neutral-500 dark:text-neutral-400'}`}
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
      {variant === 'inline' ? <span>{saved ? 'Đã lưu' : 'Lưu sản phẩm'}</span> : null}
    </button>
  );
}
