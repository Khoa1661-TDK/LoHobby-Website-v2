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
    <div className="mx-auto w-full max-w-md rounded-2xl border border-warm-200/80 bg-white p-6 shadow-soft-md dark:border-warm-800/40 dark:bg-warm-900">
      <div className="mb-6 flex rounded-xl bg-warm-100 p-1 text-sm font-medium dark:bg-warm-800">
        <button
          type="button"
          onClick={() => setMode('login')}
          className={`flex-1 rounded-lg px-4 py-2 transition-all duration-200 ${
            !isRegister
              ? 'bg-white text-warm-900 shadow-soft-sm dark:bg-warm-700 dark:text-warm-100'
              : 'text-warm-500 hover:text-warm-700 dark:text-warm-400'
          }`}
        >
          Đăng nhập
        </button>
        <button
          type="button"
          onClick={() => setMode('register')}
          className={`flex-1 rounded-lg px-4 py-2 transition-all duration-200 ${
            isRegister
              ? 'bg-white text-warm-900 shadow-soft-sm dark:bg-warm-700 dark:text-warm-100'
              : 'text-warm-500 hover:text-warm-700 dark:text-warm-400'
          }`}
        >
          Đăng ký
        </button>
      </div>

      <h1 className="mb-1 font-display text-2xl font-bold tracking-tight text-warm-900 dark:text-warm-100">
        {isRegister ? 'Tạo tài khoản' : 'Chào mừng trở lại'}
      </h1>
      <p className="mb-6 text-sm text-warm-500 dark:text-warm-400">
        {isRegister
          ? 'Đăng ký để theo dõi đơn hàng và lưu mô hình yêu thích.'
          : 'Đăng nhập để tiếp tục.'}
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {isRegister && (
          <div>
            <label
              htmlFor="name"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-warm-500 dark:text-warm-400"
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
              className="w-full rounded-xl border border-warm-200/80 bg-white px-3 py-2.5 text-sm text-warm-900 shadow-soft-sm transition-colors placeholder:text-warm-400 focus:border-terracotta-400 focus:outline-none focus:ring-2 focus:ring-terracotta-400/20 dark:border-warm-800/60 dark:bg-warm-950 dark:text-warm-100 dark:placeholder:text-warm-600"
            />
          </div>
        )}

        <div>
          <label
            htmlFor="email"
            className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-warm-500 dark:text-warm-400"
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
            className="w-full rounded-xl border border-warm-200/80 bg-white px-3 py-2.5 text-sm text-warm-900 shadow-soft-sm transition-colors placeholder:text-warm-400 focus:border-terracotta-400 focus:outline-none focus:ring-2 focus:ring-terracotta-400/20 dark:border-warm-800/60 dark:bg-warm-950 dark:text-warm-100 dark:placeholder:text-warm-600"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-warm-500 dark:text-warm-400"
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
            className="w-full rounded-xl border border-warm-200/80 bg-white px-3 py-2.5 text-sm text-warm-900 shadow-soft-sm transition-colors placeholder:text-warm-400 focus:border-terracotta-400 focus:outline-none focus:ring-2 focus:ring-terracotta-400/20 dark:border-warm-800/60 dark:bg-warm-950 dark:text-warm-100 dark:placeholder:text-warm-600"
          />
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-xl border border-terracotta-200 bg-terracotta-50 px-3 py-2.5 text-sm text-terracotta-700 dark:border-terracotta-900 dark:bg-terracotta-950 dark:text-terracotta-300"
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-warm-900 px-4 py-3 text-sm font-semibold text-warm-50 shadow-soft-md transition-all duration-200 hover:bg-warm-800 hover:shadow-soft-lg active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-warm-100 dark:text-warm-900 dark:hover:bg-warm-200"
        >
          {loading ? 'Vui lòng đợi…' : isRegister ? 'Tạo tài khoản' : 'Đăng nhập'}
        </button>
      </form>

      <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wider text-warm-400">
        <span className="h-px flex-1 bg-warm-200 dark:bg-warm-800" />
        hoặc tiếp tục với
        <span className="h-px flex-1 bg-warm-200 dark:bg-warm-800" />
      </div>

      <button
        type="button"
        onClick={handleGoogleSignIn}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-warm-200/80 bg-white px-4 py-2.5 text-sm font-medium text-warm-700 shadow-soft-sm transition-all duration-200 hover:bg-warm-50 dark:border-warm-800/60 dark:bg-warm-900 dark:text-warm-300 dark:hover:bg-warm-800/50"
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