import { Fragment } from 'react';
import { Link } from 'react-router';
import { CalendarDays } from 'lucide-react';
import { EmptyState } from '@shared/components/EmptyState';
import type { Session } from '@modules/sessions/types';
import type { Thread } from '@modules/threads/types';

export interface ThreadSessionMatrixProps {
  sessions: Session[];
  threads: Thread[];
  threadSessionIds: Map<string, Set<string>>;
}

export function ThreadSessionMatrix({ sessions, threads, threadSessionIds }: ThreadSessionMatrixProps) {
  if (sessions.length === 0) {
    return (
      <EmptyState
        icon={<CalendarDays className="h-8 w-8" />}
        title="Brak sesji"
        description="Utwórz co najmniej jedną sesję, aby zobaczyć macierz."
      />
    );
  }

  const sessionIdsWithThreads = new Set<string>();
  for (const sessionSet of threadSessionIds.values()) {
    for (const sid of sessionSet) sessionIdsWithThreads.add(sid);
  }
  const orphanSessions = sessions.filter((s) => !sessionIdsWithThreads.has(s.id));

  const colCount = sessions.length;
  const gridCols = `200px repeat(${colCount}, minmax(60px, 1fr))`;

  if (threads.length === 0) {
    return (
      <EmptyState
        icon={<CalendarDays className="h-8 w-8" />}
        title="Brak wątków"
        description="Utwórz wątki fabularne i powiąż je z sesjami, aby zobaczyć macierz."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3" data-testid="backstage-thread-matrix">
      <div className="overflow-x-auto rounded-xl border border-surface-200 bg-white shadow-sm">
        <div
          className="grid min-w-max"
          style={{ gridTemplateColumns: gridCols }}
          role="table"
          aria-label="Wątki × Sesje"
        >
          <div
            className="sticky left-0 z-10 flex items-center justify-center bg-surface-50 border-b border-r border-surface-200 px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide text-surface-500"
            role="columnheader"
          >
            Wątek
          </div>
          {sessions.map((session) => (
            <Link
              key={session.id}
              to={`/sessions/${session.id}`}
              className="border-b border-r border-surface-200 bg-surface-50 px-2 py-2 text-center text-xs font-semibold text-primary-700 hover:bg-primary-50 hover:text-primary-900 transition-colors"
              role="columnheader"
              title={session.name || `Sesja ${session.data.number}`}
            >
              <div>#{session.data.number}</div>
              {session.data.date && (
                <div className="font-normal text-surface-400 mt-0.5">{session.data.date.slice(0, 7)}</div>
              )}
            </Link>
          ))}

          {threads.map((thread) => {
            const sessionsForThread = threadSessionIds.get(thread.id) ?? new Set();
            return (
              <Fragment key={thread.id}>
                <Link
                  to={`/threads/${thread.id}`}
                  className="sticky left-0 z-10 flex items-center gap-2 border-b border-r border-surface-200 bg-white px-3 py-2 hover:bg-surface-50 transition-colors"
                  role="rowheader"
                  title={thread.name}
                >
                  <span
                    className="h-3 w-3 rounded-full shrink-0"
                    style={{ backgroundColor: thread.data.color }}
                    aria-hidden="true"
                  />
                  <span className="truncate text-sm font-medium text-surface-800 max-w-[140px]">
                    {thread.name}
                  </span>
                  {thread.data.status === 'completed' && (
                    <span className="ml-auto shrink-0 text-[10px] text-surface-400">✓</span>
                  )}
                </Link>
                {sessions.map((session) => {
                  const active = sessionsForThread.has(session.id);
                  return (
                    <div
                      key={`cell-${thread.id}-${session.id}`}
                      className="border-b border-r border-surface-200 px-1 py-2"
                      role="cell"
                      aria-label={
                        active ? `${thread.name} — sesja ${session.data.number}` : undefined
                      }
                    >
                      {active && (
                        <div
                          className="h-full min-h-[20px] rounded"
                          style={{ backgroundColor: thread.data.color, opacity: 0.75 }}
                        />
                      )}
                    </div>
                  );
                })}
              </Fragment>
            );
          })}

          {orphanSessions.length > 0 && (
            <>
              <div
                className="sticky left-0 z-10 flex items-center border-r border-surface-200 bg-white px-3 py-2"
                role="rowheader"
              >
                <span className="text-xs italic text-surface-400">Bez wątku</span>
              </div>
              {sessions.map((session) => {
                const isOrphan = orphanSessions.some((s) => s.id === session.id);
                return (
                  <div
                    key={`orphan-${session.id}`}
                    className="border-r border-surface-200 px-1 py-2"
                    role="cell"
                  >
                    {isOrphan && <div className="h-full min-h-[20px] rounded bg-surface-200" />}
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>

    </div>
  );
}
