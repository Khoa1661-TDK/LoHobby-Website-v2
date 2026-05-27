// app/(storefront)/admin-connect/page.tsx — error UI; SSO runs via /api/admin-connect
import { redirect } from 'next/navigation';
import type { ReactElement } from 'react';
import Footer from '@/components/layout/footer';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<{ return?: string; error?: string }>;

function safeReturnPath(value: string | undefined): string {
  if (value?.startsWith('/admin') && !value.startsWith('//')) {
    return value;
  }
  return '/admin';
}

function staleSessionMessage(): ReactElement {
  return (
    <>
      <section className="mx-auto max-w-screen-sm px-4 py-12 md:py-16">
        <div className="mx-auto w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
          <h1 className="mb-2 text-2xl font-bold tracking-tight">Không thể mở trang quản trị</h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Không thể làm mới cookie phiên CMS. Hãy xóa cookie của trang web này, đăng nhập tại{' '}
            <a href="/login" className="font-medium underline">
              /login
            </a>
            , rồi mở{' '}
            <a href="/admin" className="font-medium underline">
              /admin
            </a>
            .
          </p>
        </div>
      </section>
      <Footer />
    </>
  );
}

export default async function AdminConnectPage({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<ReactElement> {
  const { return: returnPath, error } = await searchParams;

  if (error === 'stale-session') {
    return staleSessionMessage();
  }

  const safeReturn = encodeURIComponent(safeReturnPath(returnPath));
  redirect(`/api/admin-connect?return=${safeReturn}`);
}
