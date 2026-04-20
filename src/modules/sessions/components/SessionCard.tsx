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
      className="app-card flex flex-col gap-3 rounded-[1.35rem] p-5 transition-all hover:-translate-y-0.5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[rgba(33,71,102,0.09)]">
            <BookOpen className="h-4 w-4 text-primary-700" />
          </div>
          <h3 className="truncate text-[1.02rem] font-semibold tracking-[-0.02em] text-surface-900">{title}</h3>
        </div>
        <span className="shrink-0 text-xs font-medium uppercase tracking-[0.12em] text-surface-500">{formattedDate}</span>
      </div>

      {data.summary && (
        <p className="line-clamp-3 text-sm leading-6 text-surface-700">{data.summary}</p>
      )}

      {tags && tags.length > 0 && (
        <div className="mt-auto flex flex-wrap gap-2">
          {tags.slice(0, 3).map((tag) => (
            <span key={tag} className="app-pill rounded-full px-2.5 py-1 text-xs">
              {tag}
            </span>
          ))}
          {tags.length > 3 && (
            <span className="app-pill-muted rounded-full px-2.5 py-1 text-xs">+{tags.length - 3}</span>
          )}
        </div>
      )}
    </Link>
  );
});
