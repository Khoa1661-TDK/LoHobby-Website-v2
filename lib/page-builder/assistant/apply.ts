import type { PageBlock } from '@/lib/page-builder';
import {
  insertBlock,
  updateBlockField,
  moveBlock,
  deleteBlock,
  duplicateBlock,
} from '@/lib/page-builder/layout-reducer';
import type { Mutation } from './validate';

export function applyMutation(layout: PageBlock[], mutation: Mutation): PageBlock[] {
  switch (mutation.kind) {
    case 'add':
      return insertBlock(layout, mutation.index, mutation.block as PageBlock);
    case 'update': {
      let next = layout;
      for (const [name, value] of Object.entries(mutation.fields)) {
        next = updateBlockField(next, mutation.index, name, value);
      }
      return next;
    }
    case 'move':
      return moveBlock(layout, mutation.from, mutation.to);
    case 'remove':
      return deleteBlock(layout, mutation.index);
    case 'duplicate':
      return duplicateBlock(layout, mutation.index);
  }
}
