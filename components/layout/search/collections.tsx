// components/layout/search/collections.tsx
import type { ReactElement } from 'react';
import CollectionsNav from '@/components/layout/search/collections-nav';
import { getCollections } from '@/lib/shopify';

export default async function Collections(): Promise<ReactElement> {
  const collections = await getCollections();
  const items = collections.map((collection) => ({
    title: collection.title,
    path: collection.handle === '' ? '/search' : `/search/${collection.handle}`,
  }));

  return <CollectionsNav items={items} />;
}
