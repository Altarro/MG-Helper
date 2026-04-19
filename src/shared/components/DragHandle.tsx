import { GripVertical } from 'lucide-react';
import type { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities';
import type { DraggableAttributes } from '@dnd-kit/core';

interface DragHandleProps {
  listeners?: SyntheticListenerMap;
  attributes?: DraggableAttributes;
  className?: string;
}

export function DragHandle({ listeners, attributes, className = '' }: DragHandleProps) {
  return (
    <button
      type="button"
      className={`cursor-grab touch-none active:cursor-grabbing text-surface-400 hover:text-surface-600 focus:outline-none ${className}`}
      aria-label="Przeciągnij, aby zmienić kolejność"
      {...attributes}
      {...listeners}
    >
      <GripVertical className="h-4 w-4" />
    </button>
  );
}
