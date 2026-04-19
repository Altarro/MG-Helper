import { Link } from 'react-router';
import { StickyNote } from 'lucide-react';
import { useNotesFor } from '@modules/notes/hooks/useNotesFor';
import { InlineEmptyState } from '@shared/components/InlineEmptyState';

interface NotesListProps {
  entityId: string;
  title?: string;
  showTitle?: boolean;
  emptyMessage?: string;
}

export function NotesList({
  entityId,
  title = 'Notatki',
  showTitle = true,
  emptyMessage,
}: NotesListProps) {
  const notes = useNotesFor(entityId);

  if (!notes || notes.length === 0) {
    if (!emptyMessage) return null;

    return (
      <div className="flex flex-col gap-1">
        {showTitle && (
          <p className="text-xs font-semibold uppercase tracking-wide text-surface-400">{title}</p>
        )}
        <InlineEmptyState
          message={emptyMessage}
          icon={<StickyNote className="h-4 w-4" />}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {showTitle && (
        <p className="text-xs font-semibold uppercase tracking-wide text-surface-400">{title}</p>
      )}
      <ul className="space-y-1">
        {notes.map((note) => (
          <li key={note.id}>
            <Link
              to={`/notes/${note.id}`}
              className="flex items-start gap-1.5 rounded-md bg-amber-50 px-2 py-1.5 text-xs text-surface-700 hover:bg-amber-100"
            >
              <StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
              <span className="line-clamp-2">{note.data.content}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
