import { useDraggable } from '@dnd-kit/core';
import type { ReactNode } from 'react';

export interface NpcDragData {
  type: 'npc';
  npcId: string;
  npcName: string;
  fromLocationId: string | null;
}

interface DraggableNpcChipProps {
  npcId: string;
  npcName: string;
  fromLocationId: string | null;
  children: ReactNode;
}

export function DraggableNpcChip({
  npcId,
  npcName,
  fromLocationId,
  children,
}: DraggableNpcChipProps) {
  const data: NpcDragData = { type: 'npc', npcId, npcName, fromLocationId };
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `npc-${npcId}`,
    data,
  });

  return (
    <div
      ref={setNodeRef}
      className={`cursor-grab active:cursor-grabbing ${isDragging ? 'opacity-50' : ''}`}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  );
}
