// components/page-builder/EditorShell.tsx — client root of the visual builder.
'use client';
import { useState, type ReactElement } from 'react';
import RenderBlocks from '@/components/blocks/RenderBlocks';
import type { PageDoc, PageBlock } from '@/lib/page-builder';
import type { BlockSchema } from '@/lib/page-builder/block-schemas';
import FieldRenderer from './FieldRenderer';
import { updateBlockField, insertBlock, moveBlock, duplicateBlock, deleteBlock } from '@/lib/page-builder/layout-reducer';
import BlockToolbar from './BlockToolbar';
import { createDefaultBlock } from '@/lib/page-builder/default-block';
import { useAutosave } from './use-autosave';
import AddSectionPicker from './AddSectionPicker';
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type Props = {
  locale: string;
  page: PageDoc;
  schemas: BlockSchema[];
};

function SortableBlock({
  id,
  index,
  selectedIndex,
  onSelect,
  layoutLength,
  setLayout,
  setSelectedIndex,
  block,
}: {
  id: string;
  index: number;
  selectedIndex: number | null;
  onSelect: (index: number) => void;
  layoutLength: number;
  setLayout: React.Dispatch<React.SetStateAction<PageBlock[]>>;
  setSelectedIndex: React.Dispatch<React.SetStateAction<number | null>>;
  block: PageBlock;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div
        onClick={() => onSelect(index)}
        className={
          'relative cursor-pointer outline-offset-2 ' +
          (selectedIndex === index ? 'outline outline-2 outline-blue-500' : '')
        }
      >
        <RenderBlocks blocks={[block]} />
        {selectedIndex === index && (
          <BlockToolbar
            index={index}
            count={layoutLength}
            onMoveUp={() => {
              setLayout((prev) => moveBlock(prev, index, index - 1));
              setSelectedIndex(index - 1);
            }}
            onMoveDown={() => {
              setLayout((prev) => moveBlock(prev, index, index + 1));
              setSelectedIndex(index + 1);
            }}
            onDuplicate={() => setLayout((prev) => duplicateBlock(prev, index))}
            onDelete={() => {
              setLayout((prev) => deleteBlock(prev, index));
              setSelectedIndex(null);
            }}
            dragHandleProps={listeners}
          />
        )}
      </div>
    </div>
  );
}

export default function EditorShell({ locale, page, schemas }: Props): ReactElement {
  const [layout, setLayout] = useState<PageBlock[]>(page.layout);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const { status, publish } = useAutosave(page.id, layout);
  const [addAt, setAddAt] = useState<number | null>(null);

  const handlePick = (slug: string) => {
    const block = createDefaultBlock(slug);
    if (block && addAt !== null) setLayout((prev) => insertBlock(prev, addAt, block));
    setAddAt(null);
  };

  const handleFieldChange = (name: string, value: unknown) => {
    if (selectedIndex === null) return;
    setLayout((prev) => updateBlockField(prev, selectedIndex, name, value));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = Number(active.id);
    const to = Number(over.id);
    setLayout((prev) => moveBlock(prev, from, to));
    setSelectedIndex(to);
  };

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
        <span className="ml-auto text-xs text-warm-400">
          {status === 'saving' && 'Saving...'}
          {status === 'saved' && 'All changes saved'}
          {status === 'error' && 'Save failed -- retry'}
        </span>
        <button
          type="button"
          onClick={publish}
          className="rounded bg-warm-900 px-3 py-1 text-sm text-white"
        >
          Publish
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Canvas */}
        <main className="flex-1 overflow-auto bg-warm-50 p-6">
          <div className="mx-auto max-w-screen-xl bg-white shadow-sm">
            <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext
                items={layout.map((_, i) => String(i))}
                strategy={verticalListSortingStrategy}
              >
                {/* Add button before first block */}
                <div className="py-2 text-center">
                  <button
                    type="button"
                    onClick={() => setAddAt(0)}
                    className="text-xs text-warm-400 hover:text-blue-500"
                  >
                    + Add section
                  </button>
                </div>
                {layout.map((block, index) => (
                  <div key={index}>
                    <SortableBlock
                      id={String(index)}
                      index={index}
                      selectedIndex={selectedIndex}
                      onSelect={setSelectedIndex}
                      layoutLength={layout.length}
                      setLayout={setLayout}
                      setSelectedIndex={setSelectedIndex}
                      block={block}
                    />
                    {/* Add button after each block */}
                    <div className="py-2 text-center">
                      <button
                        type="button"
                        onClick={() => setAddAt(index + 1)}
                        className="text-xs text-warm-400 hover:text-blue-500"
                      >
                        + Add section
                      </button>
                    </div>
                  </div>
                ))}
              </SortableContext>
            </DndContext>
          </div>
        </main>

        {/* Right panel */}
        <aside className="w-80 overflow-auto border-l border-warm-200 bg-white">
          {selectedBlock && selectedSchema ? (
            <FieldRenderer
              schema={selectedSchema}
              values={selectedBlock as Record<string, unknown>}
              onChange={handleFieldChange}
            />
          ) : (
            <p className="p-4 text-sm text-warm-400">Select a section to edit its fields.</p>
          )}
        </aside>
      </div>

      {addAt !== null && (
        <AddSectionPicker schemas={schemas} onPick={handlePick} onClose={() => setAddAt(null)} />
      )}
    </div>
  );
}