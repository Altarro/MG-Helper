import { StickyNote } from 'lucide-react';
import { useNotes } from '../hooks/useNotes';
import { NoteCard } from './NoteCard';
import { LoadingSpinner } from '@shared/components/LoadingSpinner';
import { EmptyState } from '@shared/components/EmptyState';

export function NoteList() {
  const notes = useNotes();

  if (notes === undefined) return <LoadingSpinner />;

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center gap-3">
        <StickyNote className="h-6 w-6 text-amber-500" />
        <h1 className="text-xl font-semibold text-surface-900">Notatki</h1>
        <span className="ml-auto rounded-full bg-surface-100 px-2.5 py-0.5 text-xs text-surface-600">
          {notes.length}
        </span>
      </div>

      {notes.length === 0 ? (
        <EmptyState
          icon={<StickyNote className="h-10 w-10" />}
          title="Brak notatek"
          description="Notatki tworzone są w trybie na żywo podczas sesji."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {notes.map((note) => (
            <NoteCard key={note.id} note={note} />
          ))}
        </div>
      )}
    </div>
  );
}
