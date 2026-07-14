'use client';

import { useTranslations } from 'next-intl';
import { useState, type FormEvent, type ReactElement } from 'react';
import { toast } from 'sonner';

const inputClass =
  'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900';

export default function ResendVerificationForm({
  initialEmail = '',
}: {
  initialEmail?: string;
}): ReactElement {
  const t = useTranslations('auth');
  const [email, setEmail] = useState(initialEmail);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        toast.error(t('resendVerificationError'));
        return;
      }
      toast.success(t('resendVerificationSent'));
    } catch {
      toast.error(t('resendVerificationError'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="resend-verification-email" className="mb-1 block text-sm font-medium">
          {t('resendVerificationEmailLabel')}
        </label>
        <input
          id="resend-verification-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
        />
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-full bg-black px-6 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
      >
        {submitting ? t('resendVerificationSubmitting') : t('resendVerificationSubmit')}
      </button>
    </form>
  );
}
