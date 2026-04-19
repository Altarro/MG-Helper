import { useDroppable } from '@dnd-kit/core';
import type { ReactNode } from 'react';
import type { NpcDragData } from './DraggableNpcChip';

interface DroppableLocationZoneProps {
  locationId: string;
  children: ReactNode;
  /** The id of the location the npc is being dragged from — used to prevent same-location drops */
  activeFromLocationId?: string | null;
}

export function DroppableLocationZone({
  locationId,
  children,
  activeFromLocationId,
}: DroppableLocationZoneProps) {
  const { setNodeRef, isOver, active } = useDroppable({
    id: `location-drop-${locationId}`,
    data: { locationId },
  });

  const dragData = active?.data.current as NpcDragData | undefined;
  const isNpcDrag = dragData?.type === 'npc';
  const canDrop = isNpcDrag && (activeFromLocationId ?? dragData?.fromLocationId) !== locationId;
  const highlight = isOver && canDrop;

  return (
    <div
      ref={setNodeRef}
      className={`rounded transition-colors ${
        highlight
          ? 'ring-2 ring-primary-400 bg-primary-50 dark:bg-primary-900/20'
          : ''
      }`}
    >
      {children}
    </div>
  );
}
