// components/page-builder/RelationshipPicker.tsx — search + select a Payload
// products/categories relationship, mirroring MediaPicker.
'use client';
import { useEffect, useState, type ReactElement } from 'react';

export type RelationItem = { id: string | number; title: string };

type Props = {
  relationTo: 'products' | 'categories';
  onSelect: (item: RelationItem) => void;
  onClose: () => void;
};

export default function RelationshipPicker({ relationTo, onSelect, onClose }: Props): ReactElement {
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<RelationItem[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ limit: '20', depth: '0' });
    if (query.trim()) params.set('where[title][like]', query.trim());
    // Payload's REST API is mounted at routes.api = '/admin/api' (see payload.config.ts),
    // not the default '/api' — match use-autosave.ts's pagePatchPath base.
    fetch(`/admin/api/${relationTo}?${params.toString()}`, {
      credentials: 'same-origin',
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data) => {
        const docs = Array.isArray(data?.docs) ? data.docs : [];
        setItems(
          docs.map((d: { id: string | number; title?: string }) => ({
            id: d.id,
            title: typeof d.title === 'string' ? d.title : `#${d.id}`,
          })),
        );
      })
      .catch(() => {
        /* aborted or failed — keep current list */
      });
    return () => controller.abort();
  }, [relationTo, query]);

  const noun = relationTo === 'products' ? 'product' : 'collection';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="max-h-[80vh] w-[560px] overflow-auto rounded-lg bg-white p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Select {noun}</h2>
          <input
            autoFocus
            type="search"
            placeholder="Search…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="rounded border border-warm-300 px-2 py-1 text-sm"
          />
        </div>
        <ul className="flex flex-col gap-1">
          {items.map((it) => (
            <li key={it.id}>
              <button
                type="button"
                onClick={() => onSelect(it)}
                className="w-full rounded border border-warm-200 px-2 py-1 text-left text-sm hover:border-blue-400"
              >
                {it.title}
              </button>
            </li>
          ))}
          {items.length === 0 && <li className="px-1 text-xs text-warm-400">No results.</li>}
        </ul>
      </div>
    </div>
  );
}
