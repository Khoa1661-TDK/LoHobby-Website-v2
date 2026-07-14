// components/page-builder/LayersRail.tsx — left rail listing blocks; click to select,
// drag to reorder, per-row duplicate/delete, and add buttons. Structural editing lives
// here because dragging server-rendered blocks across the iframe boundary is unreliable.
'use client';
import type { ReactElement } from 'react';
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { PageBlock } from '@/lib/page-builder';
import type { BlockSchema } from '@/lib/page-builder/block-schemas';

type Props = {
  layout: PageBlock[];
  schemas: BlockSchema[];
  selectedIndex: number | null;
  onSelect: (index: number) => void;
  onReorder: (from: number, to: number) => void;
  onDuplicate: (index: number) => void;
  onDelete: (index: number) => void;
  onAdd: (at: number) => void;
  /** When true, structural affordances (add/reorder/duplicate/delete) are disabled — the two
   *  locale layouts are misaligned and lockstep edits would corrupt the other locale until the
   *  user syncs structure. Selection still works. */
  locked?: boolean;
};

function labelFor(block: PageBlock, schemas: BlockSchema[]): string {
  return schemas.find((s) => s.slug === block.blockType)?.label ?? block.blockType;
}

function Row({
  id,
  index,
  label,
  selected,
  locked,
  onSelect,
  onDuplicate,
  onDelete,
}: {
  id: string;
  index: number;
  label: string;
  selected: boolean;
  locked: boolean;
  onSelect: (index: number) => void;
  onDuplicate: (index: number) => void;
  onDelete: (index: number) => void;
}): ReactElement {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled: locked });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return (
    <li ref={setNodeRef} style={style} {...attributes}>
      <div
        onClick={() => onSelect(index)}
        className={
          'group flex items-center gap-2 rounded px-2 py-1.5 text-sm ' +
          (selected ? 'bg-blue-50 text-blue-700' : 'hover:bg-warm-100')
        }
      >
        <button
          type="button"
          {...(locked ? {} : listeners)}
          disabled={locked}
          className="cursor-grab text-warm-400 hover:text-warm-600 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Drag to reorder"
          onClick={(e) => e.stopPropagation()}
        >
          ⠿
        </button>
        <span className="flex-1 truncate">{label}</span>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDuplicate(index); }}
          disabled={locked}
          className="opacity-0 group-hover:opacity-100 text-warm-400 hover:text-warm-700 disabled:hidden"
          aria-label="Duplicate"
        >
          ⧉
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDelete(index); }}
          disabled={locked}
          className="opacity-0 group-hover:opacity-100 text-warm-400 hover:text-red-600 disabled:hidden"
          aria-label="Delete"
        >
          ✕
        </button>
      </div>
    </li>
  );
}

export default function LayersRail({
  layout,
  schemas,
  selectedIndex,
  onSelect,
  onReorder,
  onDuplicate,
  onDelete,
  onAdd,
  locked = false,
}: Props): ReactElement {
  const handleDragEnd = (event: DragEndEvent): void => {
    if (locked) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    onReorder(Number(active.id), Number(over.id));
  };

  return (
    <aside className="flex w-64 flex-col border-r border-warm-200 bg-white">
      <div className="flex items-center justify-between border-b border-warm-200 px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-warm-500">Sections</span>
        <button
          type="button"
          onClick={() => onAdd(layout.length)}
          disabled={locked}
          className="text-sm text-blue-600 hover:underline disabled:cursor-not-allowed disabled:text-warm-300 disabled:no-underline"
        >
          + Add
        </button>
      </div>
      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={layout.map((_, i) => String(i))} strategy={verticalListSortingStrategy}>
          <ul className="flex-1 space-y-0.5 overflow-auto p-2">
            {layout.length === 0 && (
              <li className="px-2 py-4 text-center text-xs text-warm-400">No sections yet.</li>
            )}
            {layout.map((block, index) => (
              <Row
                key={index}
                id={String(index)}
                index={index}
                label={labelFor(block, schemas)}
                selected={selectedIndex === index}
                locked={locked}
                onSelect={onSelect}
                onDuplicate={onDuplicate}
                onDelete={onDelete}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </aside>
  );
}
