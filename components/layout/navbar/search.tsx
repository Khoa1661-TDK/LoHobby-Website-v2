// components/layout/navbar/search.tsx
'use client';

import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, type FormEvent, type ReactElement } from 'react';

export default function Search(): ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get('q') ?? '');

  useEffect(() => {
    setValue(searchParams.get('q') ?? '');
  }, [searchParams]);

  function onSubmit(e: FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    const q = value.trim();
    router.push(q ? `/search?q=${encodeURIComponent(q)}` : '/search');
  }

  return (
    <form onSubmit={onSubmit} className="w-max-[550px] relative w-full lg:w-80 xl:w-full">
      <input
        type="search"
        name="q"
        placeholder="Tìm móc khóa, mô hình, figure…"
        autoComplete="off"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="text-md w-full rounded-lg border bg-white px-4 py-2 text-black placeholder:text-neutral-500 dark:border-neutral-800 dark:bg-transparent dark:text-white dark:placeholder:text-neutral-400 md:text-sm"
      />
      <div className="absolute right-0 top-0 mr-3 flex h-full items-center">
        <MagnifyingGlassIcon className="h-4" />
      </div>
    </form>
  );
}

export function SearchSkeleton(): ReactElement {
  return (
    <form className="w-max-[550px] relative w-full lg:w-80 xl:w-full">
      <input
        placeholder="Tìm móc khóa, mô hình, figure…"
        className="w-full rounded-lg border bg-white px-4 py-2 text-sm text-black placeholder:text-neutral-500 dark:border-neutral-800 dark:bg-transparent dark:text-white dark:placeholder:text-neutral-400"
      />
      <div className="absolute right-0 top-0 mr-3 flex h-full items-center">
        <MagnifyingGlassIcon className="h-4" />
      </div>
    </form>
  );
}
