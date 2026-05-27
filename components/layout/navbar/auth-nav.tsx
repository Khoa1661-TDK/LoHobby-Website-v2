// components/layout/navbar/auth-nav.tsx
import { UserCircleIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import type { ReactElement } from 'react';
import { auth } from '@/auth';
import UserMenu from '@/components/user-menu';
import { isAdminEmail } from '@/lib/admin-emails';

export async function AuthNav(): Promise<ReactElement> {
  const session = await auth();

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
      aria-label="Đăng nhập"
      className="flex h-11 items-center gap-2 rounded-md border border-neutral-200 px-3 text-sm font-medium text-black transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:text-white dark:hover:bg-neutral-900"
    >
      <UserCircleIcon className="h-5 w-5 shrink-0" />
      <span className="hidden sm:inline">Đăng nhập</span>
    </Link>
  );
}
