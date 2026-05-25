// components/layout/search/filter/index.tsx
import type { ReactElement } from 'react';
import FilterItemDropdown from '@/components/layout/search/filter/dropdown';
import FilterItem from '@/components/layout/search/filter/item';
import type { SortFilterItem } from '@/lib/constants';

export type ListItem = SortFilterItem | PathFilterItem;
export type PathFilterItem = { title: string; path: string };

export default function FilterList({
  list,
  title,
}: {
  list: ListItem[];
  title?: string;
}): ReactElement {
  return (
    <nav>
      {title ? (
        <h3 className="hidden text-xs text-neutral-500 md:block dark:text-neutral-400">{title}</h3>
      ) : null}
      <ul className="hidden md:block">
        {list.map((item, i) => (
          <FilterItem key={i} item={item} />
        ))}
      </ul>
      <ul className="md:hidden">
        <FilterItemDropdown list={list} />
      </ul>
    </nav>
  );
}
