import { Fragment } from 'react';
import { Link } from 'react-router';
import { AlertTriangle, CalendarDays } from 'lucide-react';
import { EmptyState } from '@shared/components/EmptyState';
import type { Session } from '@modules/sessions/types';
import type { Threat } from '@modules/fronts/types';

export interface ThreatSessionMatrixProps {
  sessions: Session[];
  threats: Threat[];
  threatSessionIds: Map<string, Set<string>>;
}

export function ThreatSessionMatrix({ sessions, threats, threatSessionIds }: ThreatSessionMatrixProps) {
  if (sessions.length === 0) {
    return (
      <EmptyState
        icon={<CalendarDays className="h-8 w-8" />}
        title="Brak sesji"
        description="Utwórz co najmniej jedną sesję, aby zobaczyć macierz."
      />
    );
  }

  const colCount = sessions.length;
  const gridCols = `200px repeat(${colCount}, minmax(60px, 1fr))`;

  if (threats.length === 0) {
    return (
      <EmptyState
        icon={<AlertTriangle className="h-8 w-8" />}
        title="Brak zagrożeń"
        description="Dodaj zagrożenia i powiąż je z sesjami, aby śledzić kiedy były na stole."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3" data-testid="backstage-threat-matrix">
      <div className="overflow-x-auto rounded-xl border border-surface-200 bg-white shadow-sm">
        <div className="grid min-w-max" style={{ gridTemplateColumns: gridCols }} role="table" aria-label="Zagrożenia × Sesje">
          <div
            className="sticky left-0 z-10 flex items-center justify-center bg-surface-50 border-b border-r border-surface-200 px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide text-surface-500"
            role="columnheader"
          >
            Zagrożenie
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
              {session.data.date && <div className="font-normal text-surface-400 mt-0.5">{session.data.date.slice(0, 7)}</div>}
            </Link>
          ))}

          {threats.map((threat) => {
            const sessionsForThreat = threatSessionIds.get(threat.id) ?? new Set();
            const completed = threat.data.status === 'completed';
            return (
              <Fragment key={threat.id}>
                <Link
                  to={`/fronts/threats/${threat.id}`}
                  className="sticky left-0 z-10 flex items-center gap-2 border-b border-r border-surface-200 bg-white px-3 py-2 hover:bg-surface-50 transition-colors"
                  role="rowheader"
                  title={threat.name}
                >
                  <AlertTriangle className={`h-3.5 w-3.5 shrink-0 ${completed ? 'text-surface-300' : 'text-amber-500'}`} aria-hidden />
                  <span className="truncate text-sm font-medium text-surface-800 max-w-[140px]">{threat.name}</span>
                  {completed ? <span className="ml-auto shrink-0 text-[10px] text-surface-400">✓</span> : null}
                </Link>
                {sessions.map((session) => {
                  const active = sessionsForThreat.has(session.id);
                  return (
                    <div key={`threat-cell-${threat.id}-${session.id}`} className="border-b border-r border-surface-200 px-1 py-2" role="cell">
                      {active ? (
                        <div className={`h-full min-h-[20px] rounded ${completed ? 'bg-surface-300/70' : 'bg-amber-400/70'}`} />
                      ) : null}
                    </div>
                  );
                })}
              </Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}
