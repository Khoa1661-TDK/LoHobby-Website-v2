'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useTransition, type ReactElement } from 'react';
import { toast } from 'sonner';
import { reorderAction } from '@/app/[locale]/(storefront)/profile/actions';

export default function ReorderButton({ orderId }: { orderId: string }): ReactElement {
  const t = useTranslations('profile');
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await reorderAction(orderId);
          if (!result.ok) {
            toast.error(result.error);
            return;
          }
          toast.success(t('reorderSuccess'));
          router.refresh();
        })
      }
      className="inline-flex rounded-full bg-filament-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-filament-600 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
    >
      {pending ? t('reorderAdding') : t('reorder')}
    </button>
  );
}
