import { Link } from 'react-router';
import { CalendarDays } from 'lucide-react';
import { useTimeline } from '../hooks/useTimeline';
import { LoadingSpinner } from '@shared/components/LoadingSpinner';
import { EmptyState } from '@shared/components/EmptyState';

export function TimelinePage() {
  const data = useTimeline();

  if (data === undefined) return <LoadingSpinner />;

  const { sessions, threads, threadSessionIds } = data;

  if (sessions.length === 0) {
    return (
      <div className="p-6">
        <h1 className="mb-6 text-xl font-semibold text-surface-900">Oś czasu</h1>
        <EmptyState
          icon={<CalendarDays className="h-8 w-8" />}
          title="Brak sesji"
          description="Utwórz co najmniej jedną sesję, aby zobaczyć oś czasu."
        />
      </div>
    );
  }

  // Find session IDs that have at least one thread
  const sessionIdsWithThreads = new Set<string>();
  for (const sessionSet of threadSessionIds.values()) {
    for (const sid of sessionSet) sessionIdsWithThreads.add(sid);
  }
  const orphanSessions = sessions.filter((s) => !sessionIdsWithThreads.has(s.id));

  // Number of columns = sessions.length; grid template
  const colCount = sessions.length;
  // gridTemplateColumns: label column + one column per session
  const gridCols = `200px repeat(${colCount}, minmax(60px, 1fr))`;

  return (
    <div className="flex flex-col gap-4 p-6 min-h-0">
      <h1 className="text-xl font-semibold text-surface-900 shrink-0">Oś czasu</h1>

      {threads.length === 0 && (
        <EmptyState
          icon={<CalendarDays className="h-8 w-8" />}
          title="Brak wątków"
          description="Utwórz wątki fabularne i powiąż je z sesjami, aby zobaczyć oś czasu."
        />
      )}

      {threads.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-surface-200 bg-white shadow-sm">
          <div
            className="grid min-w-max"
            style={{ gridTemplateColumns: gridCols }}
            role="table"
            aria-label="Oś czasu kampanii"
          >
            {/* Header row */}
            <div
              className="sticky left-0 z-10 bg-surface-50 border-b border-r border-surface-200 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-surface-500"
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

            {/* Thread rows */}
            {threads.map((thread) => {
              const sessionsForThread = threadSessionIds.get(thread.id) ?? new Set();
              return (
                <>
                  {/* Thread label cell */}
                  <Link
                    key={`label-${thread.id}`}
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

                  {/* Session cells */}
                  {sessions.map((session) => {
                    const active = sessionsForThread.has(session.id);
                    return (
                      <div
                        key={`cell-${thread.id}-${session.id}`}
                        className="border-b border-r border-surface-200 px-1 py-2"
                        role="cell"
                        aria-label={
                          active
                            ? `${thread.name} — sesja ${session.data.number}`
                            : undefined
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
                </>
              );
            })}

            {/* Orphan sessions row */}
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
                      {isOrphan && (
                        <div className="h-full min-h-[20px] rounded bg-surface-200" />
                      )}
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>
      )}

      {/* Legend */}
      {threads.length > 0 && (
        <div className="flex flex-wrap gap-3 text-xs text-surface-500">
          {threads.slice(0, 8).map((thread) => (
            <span key={thread.id} className="flex items-center gap-1.5">
              <span
                className="inline-block h-2.5 w-5 rounded"
                style={{ backgroundColor: thread.data.color, opacity: 0.75 }}
              />
              {thread.name}
            </span>
          ))}
          {threads.length > 8 && <span>+{threads.length - 8} więcej…</span>}
        </div>
      )}
    </div>
  );
}
