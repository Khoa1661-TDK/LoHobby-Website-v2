'use client';

import { Link } from '@/i18n/navigation';
import { useEffect, useState, type ReactElement } from 'react';

export const CONSENT_COOKIE = 'cookie-consent';
export const CONSENT_EVENT = 'cookie-consent-change';

/**
 * First-party, pseudonymous analytics is recorded by default; a visitor is only
 * excluded once they explicitly opt out ("Chỉ cookie cần thiết" → `rejected`).
 * SSR returns false so we never emit a beacon before the client confirms intent.
 */
export function hasAnalyticsConsent(): boolean {
  if (typeof document === 'undefined') return false;
  return !document.cookie.includes(`${CONSENT_COOKIE}=rejected`);
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
      className="fixed inset-x-0 bottom-[var(--cta-bar-offset,0px)] z-50 border-t border-warm-200/80 bg-white/95 p-4 shadow-soft-xl backdrop-blur-xl transition-[bottom] duration-300 dark:border-warm-800/40 dark:bg-warm-950/95"
    >
      <div className="mx-auto flex max-w-screen-2xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-warm-600 dark:text-warm-400">
          Chúng tôi dùng cookie cần thiết để vận hành cửa hàng và cookie phân tích để cải thiện trải
          nghiệm. Xem{' '}
          <Link href="/info/cookies" className="font-medium underline underline-offset-2 transition-colors hover:text-warm-900 dark:hover:text-warm-200">
            chính sách cookie
          </Link>
          .
        </p>
        <div className="flex flex-none gap-2">
          <button
            type="button"
            onClick={() => decide('rejected')}
            className="rounded-xl border border-warm-200/80 px-4 py-2 text-sm font-medium text-warm-700 transition-all duration-200 hover:bg-warm-50 dark:border-warm-800/60 dark:text-warm-300 dark:hover:bg-warm-900"
          >
            Chỉ cookie cần thiết
          </button>
          <button
            type="button"
            onClick={() => decide('accepted')}
            className="rounded-xl bg-warm-900 px-4 py-2 text-sm font-semibold text-warm-50 shadow-soft-sm transition-all duration-200 hover:bg-warm-800 hover:shadow-soft-md active:scale-[0.98] dark:bg-warm-100 dark:text-warm-900 dark:hover:bg-warm-200"
          >
            Chấp nhận tất cả
          </button>
        </div>
      </div>
    </div>
  );
}