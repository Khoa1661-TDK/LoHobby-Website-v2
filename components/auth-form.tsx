// components/auth-form.tsx
'use client';

import { useState, type FormEvent, type ReactElement } from 'react';
import { signIn } from 'next-auth/react';

type Mode = 'login' | 'register';

type Props = {
  callbackUrl?: string;
};

export default function AuthForm({ callbackUrl = '/' }: Props): ReactElement {
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isRegister = mode === 'register';

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (isRegister) {
        const res = await fetch('/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password }),
        });
        if (!res.ok) {
          const payload = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(payload.error ?? 'Đăng ký thất bại');
        }
      }

      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (!result || result.error) {
        throw new Error('Email hoặc mật khẩu không đúng');
      }

      window.location.assign(callbackUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đã xảy ra lỗi');
    } finally {
      setLoading(false);
    }
  }

  function handleGoogleSignIn(): void {
    setError(null);
    void signIn('google', { callbackUrl });
  }

  return (
    <div className="mx-auto w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
      <div className="mb-6 flex rounded-full bg-neutral-100 p-1 text-sm font-medium dark:bg-neutral-900">
        <button
          type="button"
          onClick={() => setMode('login')}
          className={`flex-1 rounded-full px-4 py-2 transition ${
            !isRegister
              ? 'bg-white text-neutral-900 shadow dark:bg-neutral-800 dark:text-neutral-50'
              : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400'
          }`}
        >
          Đăng nhập
        </button>
        <button
          type="button"
          onClick={() => setMode('register')}
          className={`flex-1 rounded-full px-4 py-2 transition ${
            isRegister
              ? 'bg-white text-neutral-900 shadow dark:bg-neutral-800 dark:text-neutral-50'
              : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400'
          }`}
        >
          Đăng ký
        </button>
      </div>

      <h1 className="mb-1 text-2xl font-bold tracking-tight">
        {isRegister ? 'Tạo tài khoản' : 'Chào mừng trở lại'}
      </h1>
      <p className="mb-6 text-sm text-neutral-500 dark:text-neutral-400">
        {isRegister
          ? 'Đăng ký để theo dõi đơn hàng và lưu mô hình yêu thích.'
          : 'Đăng nhập để tiếp tục.'}
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {isRegister && (
          <div>
            <label
              htmlFor="name"
              className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-300"
            >
              Họ tên
            </label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-filament-500 focus:outline-none focus:ring-2 focus:ring-filament-500/30 dark:border-neutral-700 dark:bg-neutral-900"
            />
          </div>
        )}

        <div>
          <label
            htmlFor="email"
            className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-300"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-filament-500 focus:outline-none focus:ring-2 focus:ring-filament-500/30 dark:border-neutral-700 dark:bg-neutral-900"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-300"
          >
            Mật khẩu
          </label>
          <input
            id="password"
            type="password"
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-filament-500 focus:outline-none focus:ring-2 focus:ring-filament-500/30 dark:border-neutral-700 dark:bg-neutral-900"
          />
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          {loading ? 'Vui lòng đợi…' : isRegister ? 'Tạo tài khoản' : 'Đăng nhập'}
        </button>
      </form>

      <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wider text-neutral-400">
        <span className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
        hoặc tiếp tục với
        <span className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
      </div>

      <button
        type="button"
        onClick={handleGoogleSignIn}
        className="flex w-full items-center justify-center gap-2 rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-800 transition hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
          <path
            fill="#EA4335"
            d="M12 10.2v3.9h5.5c-.2 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.6 14.6 2.7 12 2.7 6.9 2.7 2.7 6.9 2.7 12s4.2 9.3 9.3 9.3c5.4 0 8.9-3.8 8.9-9.1 0-.6-.1-1.1-.2-2H12z"
          />
        </svg>
        Google
      </button>
    </div>
  );
}
