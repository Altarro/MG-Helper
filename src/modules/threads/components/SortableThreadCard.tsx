import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ThreadCard } from './ThreadCard';
import type { ThreadQuestlineCardInfo } from './ThreadCard';
import { DragHandle } from '@shared/components/DragHandle';
import type { Thread } from '../types';

interface SortableThreadCardProps {
  thread: Thread;
  onClick?: () => void;
  questline?: ThreadQuestlineCardInfo;
}

export function SortableThreadCard({ thread, onClick, questline }: SortableThreadCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: thread.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    position: 'relative',
  };

  return (
    <div ref={setNodeRef} style={style} className="group/sortable">
      <div className="absolute right-2 top-2 z-10 hidden group-hover/sortable:flex">
        <DragHandle listeners={listeners} attributes={attributes} />
      </div>
      <ThreadCard thread={thread} onClick={onClick} questline={questline} />
    </div>
  );
}
