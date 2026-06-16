// components/page-builder/EditorShell.tsx — client root of the visual builder.
'use client';
import { useState, type ReactElement } from 'react';
import RenderBlocks from '@/components/blocks/RenderBlocks';
import type { PageDoc, PageBlock } from '@/lib/page-builder';
import type { BlockSchema } from '@/lib/page-builder/block-schemas';
import FieldRenderer from './FieldRenderer';

type Props = {
  locale: string;
  page: PageDoc;
  schemas: BlockSchema[];
};

export default function EditorShell({ locale, page, schemas }: Props): ReactElement {
  const [layout] = useState<PageBlock[]>(page.layout);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const selectedBlock = selectedIndex !== null ? layout[selectedIndex] : null;
  const selectedSchema = selectedBlock
    ? schemas.find((s) => s.slug === selectedBlock.blockType) ?? null
    : null;

  return (
    <div className="flex h-screen flex-col">
      {/* Top bar */}
      <header className="flex items-center gap-4 border-b border-warm-200 bg-white px-4 py-2">
        <a href={`/admin/collections/pages`} className="text-sm text-warm-500 hover:underline">
          ← Back
        </a>
        <span className="font-semibold">{page.title}</span>
        <span className="rounded-full bg-warm-100 px-2 py-0.5 text-xs uppercase text-warm-500">
          {page.status}
        </span>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Canvas */}
        <main className="flex-1 overflow-auto bg-warm-50 p-6">
          <div className="mx-auto max-w-screen-xl bg-white shadow-sm">
            {layout.map((block, index) => (
              <div
                key={index}
                onClick={() => setSelectedIndex(index)}
                className={
                  'relative cursor-pointer outline-offset-2 ' +
                  (selectedIndex === index ? 'outline outline-2 outline-blue-500' : '')
                }
              >
                <RenderBlocks blocks={[block]} />
              </div>
            ))}
          </div>
        </main>

        {/* Right panel */}
        <aside className="w-80 overflow-auto border-l border-warm-200 bg-white">
          {selectedBlock && selectedSchema ? (
            <FieldRenderer
              schema={selectedSchema}
              values={selectedBlock as Record<string, unknown>}
            />
          ) : (
            <p className="p-4 text-sm text-warm-400">Select a section to edit its fields.</p>
          )}
        </aside>
      </div>
    </div>
  );
}