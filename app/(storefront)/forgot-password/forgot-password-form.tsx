'use client';

import Link from 'next/link';
import { useState, type FormEvent, type ReactElement } from 'react';

const inputClass =
  'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900';

export default function ForgotPasswordForm(): ReactElement {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setSubmitting(true);
    try {
      await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      setSent(true);
    } catch {
      setSent(true);
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <div className="text-sm text-neutral-600 dark:text-neutral-400">
        <p>
          Nếu <span className="font-medium">{email}</span> đã đăng ký, một liên kết đặt lại mật khẩu
          đã được gửi. Vui lòng kiểm tra hộp thư của bạn.
        </p>
        <Link href="/login" className="mt-4 inline-block font-medium underline">
          Về trang đăng nhập
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="forgot-email" className="mb-1 block text-sm font-medium">
          Email
        </label>
        <input
          id="forgot-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
        />
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-full bg-black px-6 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
      >
        {submitting ? 'Đang gửi…' : 'Gửi liên kết đặt lại'}
      </button>
      <Link
        href="/login"
        className="block text-center text-sm text-neutral-500 underline hover:text-neutral-800 dark:hover:text-neutral-200"
      >
        Về trang đăng nhập
      </Link>
    </form>
  );
}
