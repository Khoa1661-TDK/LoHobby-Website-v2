'use client';

import { useTranslations } from 'next-intl';
import { useRef, useState, useTransition, type ReactElement } from 'react';
import { toast } from 'sonner';
import { submitContactAction } from './actions';

const inputClass =
  'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900';

export default function ContactForm(): ReactElement {
  const t = useTranslations('info');
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await submitContactAction(formData);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(t('contactFormSuccessTitle'));
      setDone(true);
      formRef.current?.reset();
    });
  };

  if (done) {
    return (
      <div
        role="status"
        className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
      >
        <p className="font-semibold">{t('contactFormSuccessTitle')}</p>
        <p className="mt-1">{t('contactFormSuccessBody')}</p>
        <button
          type="button"
          onClick={() => setDone(false)}
          className="mt-4 inline-flex rounded-full border border-emerald-300 px-4 py-2 text-xs font-medium"
        >
          {t('contactFormSendAnother')}
        </button>
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="contact-name" className="mb-1 block text-sm font-medium">
            {t('contactFormNameLabel')}
          </label>
          <input id="contact-name" name="name" type="text" required className={inputClass} />
        </div>
        <div>
          <label htmlFor="contact-email" className="mb-1 block text-sm font-medium">
            {t('contactFormEmailLabel')}
          </label>
          <input id="contact-email" name="email" type="email" required className={inputClass} />
        </div>
      </div>
      <div>
        <label htmlFor="contact-order" className="mb-1 block text-sm font-medium">
          {t('contactFormOrderLabel')} <span className="text-neutral-400">{t('contactFormOrderOptional')}</span>
        </label>
        <input id="contact-order" name="orderCode" type="text" className={inputClass} />
      </div>
      <div>
        <label htmlFor="contact-message" className="mb-1 block text-sm font-medium">
          {t('contactFormMessageLabel')}
        </label>
        <textarea
          id="contact-message"
          name="message"
          required
          rows={5}
          className={inputClass}
          placeholder={t('contactFormMessagePlaceholder')}
        />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="inline-flex rounded-full bg-black px-6 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
      >
        {isPending ? t('contactFormSubmitting') : t('contactFormSubmit')}
      </button>
    </form>
  );
}