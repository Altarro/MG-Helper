import { Link } from 'react-router';
import { Calendar, StickyNote } from 'lucide-react';
import { format, isValid, parseISO } from 'date-fns';
import { pl } from 'date-fns/locale';
import type { Note } from '../types';

interface NoteCardProps {
  note: Note;
}

export function NoteCard({ note }: NoteCardProps) {
  const parsedDate = parseISO(note.data.createdAt);
  const formattedDate = isValid(parsedDate)
    ? format(parsedDate, 'd MMM yyyy, HH:mm', { locale: pl })
    : '';

  return (
    <Link
      to={`/notes/${note.id}`}
      className="app-card group flex min-h-[176px] flex-col gap-4 rounded-[1.35rem] p-5 transition-all hover:-translate-y-0.5"
    >
      <div className="flex items-start gap-3">
        <div className="rounded-[1rem] border border-amber-200/70 bg-amber-100/70 p-2.5 text-amber-800 shadow-[0_10px_22px_rgba(210,166,67,0.14)]">
          <StickyNote className="h-4 w-4" />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="text-surface-900 group-hover:text-primary-800 truncate text-base font-semibold tracking-[-0.02em]">
            {note.name}
          </h3>
          <p className="text-surface-700 mt-2 line-clamp-4 text-sm leading-6">
            {note.data.content}
          </p>
        </div>
      </div>

      {formattedDate && (
        <div className="text-surface-500 mt-auto inline-flex items-center gap-2 text-xs">
          <Calendar className="h-3.5 w-3.5" />
          {formattedDate}
        </div>
      )}
    </Link>
  );
}
