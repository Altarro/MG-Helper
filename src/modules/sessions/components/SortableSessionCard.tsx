import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SessionCard } from './SessionCard';
import { DragHandle } from '@shared/components/DragHandle';
import type { Session } from '../types';

interface SortableSessionCardProps {
  session: Session;
}

export function SortableSessionCard({ session }: SortableSessionCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: session.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    position: 'relative',
  };

  return (
    <div ref={setNodeRef} style={style} className="group/sortable">
      <div className="absolute left-1.5 top-1.5 z-10 hidden group-hover/sortable:flex">
        <DragHandle listeners={listeners} attributes={attributes} />
      </div>
      <SessionCard session={session} />
    </div>
  );
}
