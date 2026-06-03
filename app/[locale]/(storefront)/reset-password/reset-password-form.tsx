'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent, type ReactElement } from 'react';
import { toast } from 'sonner';

const inputClass =
  'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900';

export default function ResetPasswordForm({ token }: { token: string }): ReactElement {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (password.length < 8) {
      toast.error('Mật khẩu phải có ít nhất 8 ký tự.');
      return;
    }
    if (password !== confirm) {
      toast.error('Mật khẩu xác nhận không khớp.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        toast.error(data?.error ?? 'Không thể đặt lại mật khẩu.');
        return;
      }
      toast.success('Đặt lại mật khẩu thành công. Vui lòng đăng nhập.');
      router.push('/login');
    } catch {
      toast.error('Đã xảy ra lỗi. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="reset-password" className="mb-1 block text-sm font-medium">
          Mật khẩu mới
        </label>
        <input
          id="reset-password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="reset-confirm" className="mb-1 block text-sm font-medium">
          Xác nhận mật khẩu
        </label>
        <input
          id="reset-confirm"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className={inputClass}
        />
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-full bg-black px-6 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
      >
        {submitting ? 'Đang lưu…' : 'Đặt lại mật khẩu'}
      </button>
    </form>
  );
}
