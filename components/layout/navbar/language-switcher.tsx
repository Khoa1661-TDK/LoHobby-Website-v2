'use client';

import { LanguageIcon } from '@heroicons/react/24/outline';
import { useLocale, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useTransition, type ReactElement } from 'react';
import { usePathname, useRouter } from '@/i18n/navigation';
import { routing, type Locale } from '@/i18n/routing';

const LABEL_KEY: Record<Locale, 'vietnamese' | 'english'> = {
  vi: 'vietnamese',
  en: 'english',
};

/**
 * Toggles the active locale while preserving the current path + query. Persists
 * via the NEXT_LOCALE cookie that next-intl's middleware sets on navigation.
 *
 * - `compact`: an icon button showing the active code (for the navbar row).
 * - `full`: labelled rows for each locale (for the mobile menu).
 */
export default function LanguageSwitcher({
  variant = 'compact',
}: {
  variant?: 'compact' | 'full';
}): ReactElement {
  const t = useTranslations('common');
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function switchTo(next: Locale): void {
    if (next === locale || isPending) return;
    const query = Object.fromEntries(searchParams.entries());
    startTransition(() => {
      router.replace({ pathname, query }, { locale: next });
    });
  }

  if (variant === 'full') {
    return (
      <div className="flex items-center gap-1.5" role="group" aria-label={t('language')}>
        {routing.locales.map((loc) => {
          const active = loc === locale;
          return (
            <button
              key={loc}
              type="button"
              onClick={() => switchTo(loc)}
              aria-current={active ? 'true' : undefined}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors duration-200 ${
                active
                  ? 'border-warm-900 bg-warm-900 text-warm-50 dark:border-warm-100 dark:bg-warm-100 dark:text-warm-900'
                  : 'border-warm-200/80 text-warm-600 hover:bg-warm-100/60 dark:border-warm-800/60 dark:text-warm-400 dark:hover:bg-warm-800/50'
              }`}
            >
              {t(LABEL_KEY[loc])}
            </button>
          );
        })}
      </div>
    );
  }

  // Compact: cycle to the next locale (two-locale toggle).
  const other = routing.locales.find((loc) => loc !== locale) ?? locale;
  return (
    <button
      type="button"
      onClick={() => switchTo(other)}
      aria-label={`${t('language')}: ${t(LABEL_KEY[locale])}`}
      title={t(LABEL_KEY[other])}
      className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-warm-200/80 px-2.5 text-xs font-semibold uppercase text-warm-500 transition-all duration-200 hover:bg-warm-100/60 hover:text-warm-800 dark:border-warm-800/60 dark:text-warm-400 dark:hover:bg-warm-800/50 dark:hover:text-warm-200"
    >
      <LanguageIcon className="h-4 w-4" />
      {locale}
    </button>
  );
}
