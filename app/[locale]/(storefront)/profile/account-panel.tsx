// app/profile/account-panel.tsx
'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect, useState, useTransition, type FormEvent, type ReactElement } from 'react';
import { toast } from 'sonner';
import { updateProfileAction } from '@/app/(storefront)/profile/actions';
import type { ProfileUser } from '@/app/(storefront)/profile/types';

type Props = {
  user: ProfileUser;
};

export default function AccountPanel({ user }: Props): ReactElement {
  const router = useRouter();
  const { update: updateSession } = useSession();
  const [name, setName] = useState<string>(user.name ?? '');
  const [image, setImage] = useState<string>(user.image ?? '');
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setName(user.name ?? '');
    setImage(user.image ?? '');
  }, [user.name, user.image]);

  const initial = (name.trim().charAt(0) || user.email.charAt(0) || 'P').toUpperCase();
  const previewSrc = image.trim().length > 0 ? image.trim() : null;

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await updateProfileAction(formData);
      if (result.ok) {
        await updateSession();
        toast.success('Đã cập nhật hồ sơ.');
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-950"
    >
      <header>
        <h2 className="text-lg font-semibold">Cài đặt tài khoản</h2>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Cập nhật tên và ảnh đại diện hiển thị trên Lô Hobby.
        </p>
      </header>

      <div className="flex items-center gap-4">
        <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-100 text-2xl font-semibold text-neutral-800 dark:bg-neutral-800 dark:text-neutral-100">
          {previewSrc ? (
            <Image
              src={previewSrc}
              alt={name || user.email}
              fill
              sizes="64px"
              className="object-cover"
              unoptimized
            />
          ) : (
            <span aria-hidden="true">{initial}</span>
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-50">
            {name || user.email}
          </p>
          <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">{user.email}</p>
          <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">
            Tham gia {new Date(user.createdAt).toLocaleDateString('vi-VN')}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tên hiển thị" htmlFor="profile-name">
          <input
            id="profile-name"
            name="name"
            type="text"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="name"
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-filament-500 focus:outline-none focus:ring-2 focus:ring-filament-500/30 dark:border-neutral-700 dark:bg-neutral-900"
          />
        </Field>
        <Field label="Địa chỉ email" htmlFor="profile-email">
          <input
            id="profile-email"
            type="email"
            value={user.email}
            disabled
            className="w-full cursor-not-allowed rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900/40 dark:text-neutral-500"
          />
        </Field>
      </div>

      <Field label="URL ảnh đại diện" htmlFor="profile-image">
        <input
          id="profile-image"
          name="image"
          type="url"
          inputMode="url"
          placeholder="https://example.com/avatar.png"
          value={image}
          onChange={(event) => setImage(event.target.value)}
          className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-filament-500 focus:outline-none focus:ring-2 focus:ring-filament-500/30 dark:border-neutral-700 dark:bg-neutral-900"
        />
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          Để trống nếu muốn dùng chữ cái đầu như ở trên.
        </p>
      </Field>

      <div className="flex items-center justify-end">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-filament-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-filament-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? 'Đang lưu…' : 'Lưu thay đổi'}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactElement | ReactElement[];
}): ReactElement {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-300"
      >
        {label}
      </label>
      {children}
    </div>
  );
}
