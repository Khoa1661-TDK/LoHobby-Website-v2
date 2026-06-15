'use client';

import { useTranslations } from 'next-intl';
import { FormEvent, useState, useTransition, type ReactElement } from 'react';
import { toast } from 'sonner';
import { subscribeNewsletterAction } from '@/components/layout/newsletter-action';

export default function FooterNewsletter(): ReactElement {
  const t = useTranslations('footer');
  const [email, setEmail] = useState('');
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!email.trim()) {
      toast.error(t('emailRequired'));
      return;
    }
    startTransition(async () => {
      const result = await subscribeNewsletterAction(email);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(t('subscribed'));
      setEmail('');
    });
  }

  return (
    <div>
      <p className="text-sm leading-relaxed text-warm-400">
        {t('newsletterIntro')}
      </p>
      <form
        onSubmit={handleSubmit}
        className="mt-4 rounded-xl border border-warm-800 bg-warm-900/80 p-4"
      >
        <label htmlFor="footer-email" className="text-[10px] font-semibold uppercase tracking-widest text-warm-500">
          {t('emailLabel')}
        </label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            id="footer-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={t('emailPlaceholder')}
            className="min-w-0 flex-1 rounded-lg border border-warm-800 bg-warm-950 px-3 py-2.5 text-sm text-warm-100 placeholder:text-warm-600 transition-colors duration-200 focus:border-terracotta-500 focus:outline-none focus:ring-1 focus:ring-terracotta-500"
          />
          <button
            type="submit"
            disabled={isPending}
            className="shrink-0 rounded-lg bg-warm-100 px-5 py-2.5 text-sm font-semibold text-warm-900 transition-all duration-200 hover:bg-warm-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? t('subscribing') : t('subscribe')}
          </button>
        </div>
      </form>
      <p className="mt-3 text-xs leading-relaxed text-warm-700">
        {t('consent')}
      </p>
    </div>
  );
}