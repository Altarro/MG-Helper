import { memo } from 'react';
import { Link } from 'react-router';
import { BookOpen, CalendarDays, FileText, Radio } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { pl } from 'date-fns/locale';
import {
  getSessionLifecycleStatus,
  getSessionProgressStatus,
  type Session,
  type SessionLifecycleStatus,
  type SessionProgressStatus,
} from '../types';

interface SessionCardProps {
  session: Session;
}

export const SessionCard = memo(function SessionCard({ session }: SessionCardProps) {
  const { data, name, tags } = session;
  const formattedDate = data.date ? format(parseISO(data.date), 'd MMMM yyyy', { locale: pl }) : '';

  const title = name || `Sesja ${data.number}`;
  const lifecycle = getSessionLifecycleStatus(data);
  const progressStatus = getSessionProgressStatus(data);
  const progressMeta: Record<SessionProgressStatus, { label: string; className: string }> = {
    planned: {
      label: 'Zaplanowana',
      className: 'border-[rgba(86,93,94,0.16)] bg-[rgba(223,225,218,0.72)] text-surface-700',
    },
    completed: {
      label: 'Zakończona',
      className: 'border-primary-500/18 bg-[rgba(111,146,164,0.12)] text-primary-800',
    },
  };
  const statusMeta: Record<SessionLifecycleStatus, { label: string; className: string }> = {
    live: {
      label: 'Na żywo',
      className: 'border-warning-500/30 bg-[rgba(242,196,88,0.18)] text-[#8b5b0c]',
    },
    cleanup_pending: {
      label: 'Cleanup',
      className: 'border-danger-500/24 bg-[rgba(176,108,103,0.12)] text-danger-700',
    },
    cleanup_completed: {
      label: 'Zamknięta',
      className: 'border-primary-500/18 bg-[rgba(111,146,164,0.12)] text-primary-800',
    },
  };
  const reportStatusLabel = data.reportAvailable === true ? 'Raport gotowy' : 'Raport niegotowy';
  const reportClassName =
    data.reportAvailable === true
      ? 'border-success-500/24 bg-[rgba(106,143,135,0.13)] text-success-600'
      : 'border-[rgba(86,93,94,0.14)] bg-[rgba(223,225,218,0.64)] text-surface-600';

  return (
    <Link
      to={`/sessions/${session.id}`}
      className="app-card group focus-visible:ring-primary-500/35 relative flex min-h-[18.5rem] overflow-hidden rounded-[1.65rem] p-0 transition-all hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:outline-none"
    >
      <div className="absolute inset-y-0 left-0 w-1.5 bg-[linear-gradient(180deg,var(--color-primary-500)_0%,var(--color-warning-500)_100%)] opacity-80" />
      <div className="flex min-w-0 flex-1 flex-col gap-4 p-5 pl-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[rgba(33,71,102,0.12)] shadow-[inset_0_1px_0_rgba(255,250,240,0.24)]">
              <BookOpen className="text-primary-800 h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-surface-500 text-[11px] font-semibold tracking-[0.18em] uppercase">
                Sesja {data.number}
              </p>
              <h3 className="text-surface-900 group-hover:text-primary-800 mt-1 line-clamp-2 text-[1.34rem] leading-tight font-semibold tracking-[-0.03em]">
                {title}
              </h3>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <span
              className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${progressMeta[progressStatus].className}`}
            >
              {progressMeta[progressStatus].label}
            </span>
            {lifecycle !== 'cleanup_completed' ? (
              <span
                className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${statusMeta[lifecycle].className}`}
              >
                {statusMeta[lifecycle].label}
              </span>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-2xl border border-[rgba(86,93,94,0.1)] bg-[rgba(255,250,240,0.16)] px-3 py-2.5">
            <p className="text-surface-500 flex items-center gap-1.5 text-[11px] font-semibold tracking-wide uppercase">
              <CalendarDays className="h-3.5 w-3.5" />
              Data
            </p>
            <p className="text-surface-800 mt-1 truncate text-sm font-medium">
              {formattedDate || 'Bez daty'}
            </p>
          </div>
          <div className="rounded-2xl border border-[rgba(86,93,94,0.1)] bg-[rgba(255,250,240,0.16)] px-3 py-2.5">
            <p className="text-surface-500 flex items-center gap-1.5 text-[11px] font-semibold tracking-wide uppercase">
              {data.reportAvailable === true ? (
                <FileText className="h-3.5 w-3.5" />
              ) : (
                <Radio className="h-3.5 w-3.5" />
              )}
              Raport
            </p>
            <p className="text-surface-800 mt-1 truncate text-sm font-medium">
              {reportStatusLabel}
            </p>
          </div>
        </div>

        {data.sessionGoal && (
          <div className="border-primary-500/45 rounded-r-2xl border-l-2 bg-[rgba(111,146,164,0.07)] py-2.5 pr-2.5 pl-3">
            <p className="text-primary-800 mb-1.5 text-[11px] font-semibold tracking-wide uppercase">
              Cel sesji
            </p>
            <p className="text-surface-700 line-clamp-3 text-sm leading-6">{data.sessionGoal}</p>
          </div>
        )}

        {progressStatus === 'completed' && data.summary && (
          <div className="border-l-primary-500/45 rounded-r-2xl border-l-2 bg-[rgba(111,146,164,0.07)] py-2.5 pr-2.5 pl-3">
            <p className="text-primary-800 mb-1.5 text-[11px] font-semibold tracking-wide uppercase">
              Streszczenie
            </p>
            <p className="text-surface-700 line-clamp-4 text-sm leading-6">{data.summary}</p>
          </div>
        )}

        <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-[rgba(86,93,94,0.1)] pt-3">
          <span
            className={`rounded-full border px-2.5 py-1 text-xs font-medium ${reportClassName}`}
          >
            {reportStatusLabel}
          </span>

          {tags && tags.length > 0 && (
            <>
              {tags.slice(0, 3).map((tag) => (
                <span key={tag} className="app-pill-muted rounded-full px-2.5 py-1 text-xs">
                  {tag}
                </span>
              ))}
              {tags.length > 3 && (
                <span className="app-pill-muted rounded-full px-2.5 py-1 text-xs">
                  +{tags.length - 3}
                </span>
              )}
            </>
          )}
        </div>
      </div>
    </Link>
  );
});
