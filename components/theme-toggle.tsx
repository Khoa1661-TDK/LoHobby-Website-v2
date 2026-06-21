'use client';

import { MoonIcon, SunIcon } from '@heroicons/react/24/outline';
import { useEffect, useState, type ReactElement } from 'react';

const STORAGE_KEY = 'theme';

function applyTheme(theme: 'light' | 'dark'): void {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
}

export default function ThemeToggle(): ReactElement {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const stored = localStorage.getItem(STORAGE_KEY);
    const initial =
      stored === 'dark' || stored === 'light' ? stored : mql.matches ? 'dark' : 'light';
    setTheme(initial);
    setMounted(true);

    // Track OS appearance changes live, but only while the user hasn't made an
    // explicit choice — a saved preference always overrides the system setting.
    function handleSystemChange(event: MediaQueryListEvent): void {
      if (localStorage.getItem(STORAGE_KEY)) return;
      const next = event.matches ? 'dark' : 'light';
      setTheme(next);
      applyTheme(next);
    }

    mql.addEventListener('change', handleSystemChange);
    return () => mql.removeEventListener('change', handleSystemChange);
  }, []);

  function toggle(): void {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
      className="flex h-10 w-10 items-center justify-center rounded-xl border border-warm-200/80 text-warm-500 transition-all duration-200 hover:bg-warm-100/60 hover:text-warm-800 dark:border-warm-800/60 dark:text-warm-400 dark:hover:bg-warm-800/50 dark:hover:text-warm-200"
    >
      {mounted && theme === 'dark' ? (
        <SunIcon className="h-4 w-4" />
      ) : (
        <MoonIcon className="h-4 w-4" />
      )}
    </button>
  );
}