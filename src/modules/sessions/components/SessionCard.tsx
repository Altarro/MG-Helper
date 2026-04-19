import { memo } from 'react';
import { Link } from 'react-router';
import { BookOpen } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { pl } from 'date-fns/locale';
import type { Session } from '../types';

interface SessionCardProps {
  session: Session;
}

export const SessionCard = memo(function SessionCard({ session }: SessionCardProps) {
  const { data, name, tags } = session;
  const formattedDate = data.date
    ? format(parseISO(data.date), 'd MMMM yyyy', { locale: pl })
    : '';

  const title = name || `Sesja ${data.number}`;

  return (
    <Link
      to={`/sessions/${session.id}`}
      className="flex flex-col gap-2 rounded-lg border border-surface-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <BookOpen className="h-4 w-4 shrink-0 text-primary-500" />
          <h3 className="truncate font-semibold text-surface-900">{title}</h3>
        </div>
        <span className="shrink-0 text-xs text-surface-400">{formattedDate}</span>
      </div>

      {data.summary && (
        <p className="text-xs text-surface-500 line-clamp-2">{data.summary}</p>
      )}

      {tags && tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tags.slice(0, 3).map((tag) => (
            <span key={tag} className="rounded-full bg-primary-50 px-2 py-0.5 text-xs text-primary-700">
              {tag}
            </span>
          ))}
          {tags.length > 3 && (
            <span className="rounded-full bg-surface-100 px-2 py-0.5 text-xs text-surface-500">
              +{tags.length - 3}
            </span>
          )}
        </div>
      )}
    </Link>
  );
});
