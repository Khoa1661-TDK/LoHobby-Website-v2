// components/layout/navbar/auth-nav.tsx
import { UserCircleIcon } from '@heroicons/react/24/outline';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import type { ReactElement } from 'react';
import { auth } from '@/auth';
import UserMenu from '@/components/user-menu';
import { isAdminEmail } from '@/lib/admin-emails';

export async function AuthNav(): Promise<ReactElement> {
  const session = await auth();
  const t = await getTranslations('nav');

  if (session?.user?.email) {
    return (
      <UserMenu
        name={session.user.name ?? null}
        email={session.user.email}
        image={session.user.image ?? null}
        isAdmin={isAdminEmail(session.user.email)}
      />
    );
  }

  return (
    <Link
      href="/login"
      prefetch
      aria-label={t('login')}
      className="inline-flex h-10 items-center gap-2 rounded-xl border border-warm-200/80 px-3.5 text-sm font-medium text-warm-600 transition-all duration-200 hover:border-terracotta-300 hover:bg-terracotta-50 hover:text-terracotta-700 dark:border-warm-800/60 dark:text-warm-400 dark:hover:border-terracotta-800 dark:hover:bg-terracotta-950/50 dark:hover:text-terracotta-300"
    >
      <UserCircleIcon className="h-5 w-5 shrink-0" />
      <span className="hidden sm:inline">{t('login')}</span>
    </Link>
  );
}