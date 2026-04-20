import { StickyNote } from 'lucide-react';
import { useNotes } from '../hooks/useNotes';
import { NoteCard } from './NoteCard';
import { LoadingSpinner } from '@shared/components/LoadingSpinner';
import { EmptyState } from '@shared/components/EmptyState';

export function NoteList() {
  const notes = useNotes();

  if (notes === undefined) return <LoadingSpinner />;

  return (
    <div className="flex flex-col gap-6">
      <section className="app-panel-strong rounded-[2rem] px-6 py-7 lg:px-8 lg:py-8">
        <div className="flex items-center gap-4">
          <div>
            <div className="mb-3 inline-flex items-center rounded-full border border-[rgba(210,166,67,0.42)] bg-[rgba(242,196,88,0.12)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8c6416]">
              Zapis stołu
            </div>
            <h1 className="text-3xl font-semibold tracking-[-0.04em] text-primary-900 lg:text-[2.2rem]">Notatki</h1>
          </div>
          <span className="app-pill-muted ml-auto rounded-full px-3 py-1 text-xs">{notes.length}</span>
        </div>
        <p className="mt-3 max-w-[62ch] text-sm leading-7 text-surface-700 lg:text-[0.98rem]">
          Notatki tworzone są w trybie na żywo podczas sesji i zbierają bieżące ustalenia.
        </p>
      </section>

      {notes.length === 0 ? (
        <div className="app-panel rounded-[1.8rem] p-6">
          <EmptyState
            icon={<StickyNote className="h-10 w-10 text-primary-300" />}
            title="Brak notatek"
            description="Notatki tworzone są w trybie na żywo podczas sesji."
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {notes.map((note) => (
            <NoteCard key={note.id} note={note} />
          ))}
        </div>
      )}
    </div>
  );
}
