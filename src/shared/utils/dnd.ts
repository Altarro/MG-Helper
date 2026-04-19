import { arrayMove } from '@dnd-kit/sortable';

export { arrayMove };

/**
 * Pure helper: returns a new array with the item at `activeId` moved
 * to the position of `overId`. No mutation.
 */
export function reorderEntities<T extends { id: string }>(
  items: T[],
  activeId: string,
  overId: string,
): T[] {
  const oldIndex = items.findIndex((i) => i.id === activeId);
  const newIndex = items.findIndex((i) => i.id === overId);
  if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return items;
  return arrayMove(items, oldIndex, newIndex);
}
