// components/page-builder/AddSectionPicker.tsx
'use client';
import type { ReactElement } from 'react';
import type { BlockSchema } from '@/lib/page-builder/block-schemas';

type Props = {
  schemas: BlockSchema[];
  onPick: (slug: string) => void;
  onClose: () => void;
};

export default function AddSectionPicker({ schemas, onPick, onClose }: Props): ReactElement {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="max-h-[80vh] w-[640px] overflow-auto rounded-lg bg-white p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-3 text-sm font-semibold">Add a section</h2>
        <div className="grid grid-cols-3 gap-3">
          {schemas.map((schema) => (
            <button
              key={schema.slug}
              type="button"
              onClick={() => onPick(schema.slug)}
              className="flex flex-col items-center gap-2 rounded border border-warm-200 p-2 text-xs hover:border-blue-400"
            >
              {schema.imageURL && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={schema.imageURL} alt="" className="h-16 w-full object-contain" />
              )}
              <span>{schema.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}