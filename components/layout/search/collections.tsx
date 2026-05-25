// components/layout/search/collections.tsx
import clsx from 'clsx';
import Link from 'next/link';
import type { ReactElement } from 'react';
import { getCollections } from '@/lib/shopify';

export default async function Collections(): Promise<ReactElement> {
  const collections = await getCollections();

  return (
    <nav>
      <h3 className="hidden text-xs text-neutral-500 md:block dark:text-neutral-400">Collections</h3>
      <ul className="hidden md:block">
        {collections.map((collection) => {
          const path = collection.handle === '' ? '/search' : `/search/${collection.handle}`;
          return (
            <li key={collection.handle} className="mt-2 flex text-black dark:text-white">
              <Link
                href={path}
                prefetch
                className={clsx(
                  'w-full text-sm underline-offset-4 hover:underline',
                )}
              >
                {collection.title}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
