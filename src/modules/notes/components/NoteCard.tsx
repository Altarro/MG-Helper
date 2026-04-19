import { Link } from 'react-router';
import { StickyNote, Calendar } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { pl } from 'date-fns/locale';
import type { Note } from '../types';

interface NoteCardProps {
  note: Note;
}

export function NoteCard({ note }: NoteCardProps) {
  const dateStr = note.data.createdAt;
  let formatted = '';
  try {
    const d = parseISO(dateStr);
    if (isValid(d)) formatted = format(d, 'd MMM yyyy, HH:mm', { locale: pl });
  } catch {
    // ignore
  }

  return (
    <Link
      to={`/notes/${note.id}`}
      className="flex flex-col gap-1.5 rounded-xl border border-surface-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-start gap-2">
        <StickyNote className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
        <p className="flex-1 text-sm text-surface-800 line-clamp-3">{note.data.content}</p>
      </div>
      {formatted && (
        <div className="flex items-center gap-1 text-xs text-surface-400">
          <Calendar className="h-3 w-3" />
          {formatted}
        </div>
      )}
    </Link>
  );
}
