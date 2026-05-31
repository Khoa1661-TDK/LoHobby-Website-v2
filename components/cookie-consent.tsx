'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactElement } from 'react';

export const CONSENT_COOKIE = 'cookie-consent';
export const CONSENT_EVENT = 'cookie-consent-change';

/** Read the current analytics-cookie consent decision on the client. */
export function hasAnalyticsConsent(): boolean {
  if (typeof document === 'undefined') return false;
  return document.cookie.includes(`${CONSENT_COOKIE}=accepted`);
}

function persist(value: 'accepted' | 'rejected'): void {
  document.cookie = `${CONSENT_COOKIE}=${value}; max-age=15552000; path=/; samesite=lax`;
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: value }));
}

export default function CookieConsent(): ReactElement | null {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!document.cookie.includes(`${CONSENT_COOKIE}=`)) {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  const decide = (value: 'accepted' | 'rejected') => {
    persist(value);
    setVisible(false);
  };

  return (
    <div
      role="dialog"
      aria-label="Thông báo cookie"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-neutral-200 bg-white p-4 shadow-lg dark:border-neutral-800 dark:bg-neutral-900"
    >
      <div className="mx-auto flex max-w-screen-2xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-neutral-600 dark:text-neutral-300">
          Chúng tôi dùng cookie cần thiết để vận hành cửa hàng và cookie phân tích để cải thiện trải
          nghiệm. Xem{' '}
          <Link href="/info/cookies" className="underline">
            chính sách cookie
          </Link>
          .
        </p>
        <div className="flex flex-none gap-2">
          <button
            type="button"
            onClick={() => decide('rejected')}
            className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
          >
            Chỉ cookie cần thiết
          </button>
          <button
            type="button"
            onClick={() => decide('accepted')}
            className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
          >
            Chấp nhận tất cả
          </button>
        </div>
      </div>
    </div>
  );
}
