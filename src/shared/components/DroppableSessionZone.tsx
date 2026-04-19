import { useDroppable } from '@dnd-kit/core';
import type { ReactNode } from 'react';
import type { NpcDragData } from './DraggableNpcChip';

interface DroppableSessionZoneProps {
  sessionId: string;
  children: ReactNode;
}

export function DroppableSessionZone({ sessionId, children }: DroppableSessionZoneProps) {
  const { setNodeRef, isOver, active } = useDroppable({
    id: `session-drop-${sessionId}`,
    data: { sessionId },
  });

  const dragData = active?.data.current as NpcDragData | undefined;
  const isNpcDrag = dragData?.type === 'npc';
  const highlight = isOver && isNpcDrag;

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 flex flex-col rounded-xl transition-all ${
        highlight ? 'ring-2 ring-green-400 bg-green-50/40 dark:bg-green-900/10' : ''
      }`}
    >
      {children}
    </div>
  );
}
