'use client';

import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState, useTransition, type ReactElement } from 'react';
import { toast } from 'sonner';
import { cancelOrderAction } from '@/app/[locale]/(storefront)/profile/actions';

const REASONS = [
  'changed_mind',
  'ordered_by_mistake',
  'found_better_price',
  'delivery_too_slow',
  'other',
] as const;

const REASON_KEY: Record<(typeof REASONS)[number], string> = {
  changed_mind: 'cancelReasonChanged_mind',
  ordered_by_mistake: 'cancelReasonOrdered_by_mistake',
  found_better_price: 'cancelReasonFound_better_price',
  delivery_too_slow: 'cancelReasonDelivery_too_slow',
  other: 'cancelReasonOther',
};

export default function CancelOrderButton({ orderId }: { orderId: string }): ReactElement {
  const t = useTranslations('profile');
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<(typeof REASONS)[number]>('changed_mind');
  const [note, setNote] = useState('');
  const [pending, startTransition] = useTransition();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex rounded-full border border-rose-300 px-5 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 dark:border-rose-500/40 dark:text-rose-300 dark:hover:bg-rose-500/10"
      >
        {t('cancelOrder')}
      </button>

      <Dialog open={open} onClose={() => !pending && setOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="w-full max-w-md rounded-2xl bg-white p-6 dark:bg-neutral-900">
            <DialogTitle className="text-lg font-bold">{t('cancelOrderTitle')}</DialogTitle>
            <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">{t('cancelOrderBody')}</p>

            <fieldset className="mt-4 space-y-2">
              {REASONS.map((r) => (
                <label key={r} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="cancel-reason"
                    value={r}
                    checked={reason === r}
                    onChange={() => setReason(r)}
                  />
                  {t(REASON_KEY[r])}
                </label>
              ))}
            </fieldset>

            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t('cancelNotePlaceholder')}
              maxLength={500}
              className="mt-4 w-full rounded-lg border border-neutral-300 p-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
              rows={3}
            />

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={pending}
                onClick={() => setOpen(false)}
                className="rounded-full px-4 py-2 text-sm font-medium text-neutral-600 disabled:opacity-60 dark:text-neutral-300"
              >
                {t('cancelDismiss')}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const result = await cancelOrderAction(orderId, reason, note);
                    if (!result.ok) {
                      toast.error(result.error);
                      return;
                    }
                    toast.success(t('cancelSuccess'));
                    setOpen(false);
                    router.refresh();
                  })
                }
                className="rounded-full bg-rose-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pending ? t('cancelPending') : t('cancelConfirm')}
              </button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </>
  );
}
