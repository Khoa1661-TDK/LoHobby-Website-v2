'use client';

import { useEffect, useState, type ReactElement } from 'react';

const DISMISS_KEY = 'pwa-install-dismissed';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export default function PwaInstallPrompt(): ReactElement | null {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (localStorage.getItem(DISMISS_KEY) === '1') return;

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  if (!deferred) return null;

  const install = async () => {
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  };

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1');
    setDeferred(null);
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 z-40 mx-auto max-w-sm rounded-xl border border-neutral-200 bg-white p-4 shadow-lg sm:left-auto dark:border-neutral-800 dark:bg-neutral-900">
      <p className="text-sm font-medium">Cài đặt ứng dụng</p>
      <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
        Thêm cửa hàng vào màn hình chính để mua sắm nhanh hơn.
      </p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={install}
          className="rounded-full bg-black px-4 py-1.5 text-xs font-medium text-white transition hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
        >
          Cài đặt
        </button>
        <button
          type="button"
          onClick={dismiss}
          className="rounded-full border border-neutral-300 px-4 py-1.5 text-xs font-medium text-neutral-600 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          Để sau
        </button>
      </div>
    </div>
  );
}
