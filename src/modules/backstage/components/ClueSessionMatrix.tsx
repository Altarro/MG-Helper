import { Fragment } from 'react';
import { Link } from 'react-router';
import { CalendarDays, KeyRound } from 'lucide-react';
import { EmptyState } from '@shared/components/EmptyState';
import type { Session } from '@modules/sessions/types';
import type { Clue } from '@modules/clues/types';

export type ClueMatrixFilter = 'all' | 'discovered' | 'undiscovered';

export interface ClueSessionMatrixProps {
  sessions: Session[];
  clues: Clue[];
  clueSessionIds: Map<string, Set<string>>;
  filter: ClueMatrixFilter;
}

export function ClueSessionMatrix({ sessions, clues, clueSessionIds, filter }: ClueSessionMatrixProps) {
  if (sessions.length === 0) {
    return (
      <EmptyState
        icon={<CalendarDays className="h-8 w-8" />}
        title="Brak sesji"
        description="Utwórz co najmniej jedną sesję, aby zobaczyć macierz."
      />
    );
  }

  const filteredClues = clues.filter((clue) => {
    if (filter === 'discovered') return clue.data.discovered === true;
    if (filter === 'undiscovered') return clue.data.discovered !== true;
    return true;
  });

  if (filteredClues.length === 0) {
    return (
      <EmptyState
        icon={<KeyRound className="h-8 w-8" />}
        title="Brak wskazówek"
        description="Brak wskazówek dla aktywnego filtra. Zmień filtr albo dodaj wskazówki do sesji."
      />
    );
  }

  const colCount = sessions.length;
  const gridCols = `220px repeat(${colCount}, minmax(60px, 1fr))`;

  return (
    <div className="flex flex-col gap-3" data-testid="backstage-clue-matrix">
      <div className="overflow-x-auto rounded-xl border border-surface-200 bg-white shadow-sm">
        <div className="grid min-w-max" style={{ gridTemplateColumns: gridCols }} role="table" aria-label="Wskazówki × Sesje">
          <div
            className="sticky left-0 z-10 flex items-center justify-center bg-surface-50 border-b border-r border-surface-200 px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide text-surface-500"
            role="columnheader"
          >
            Wskazówka
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

          {filteredClues.map((clue) => {
            const sessionsForClue = clueSessionIds.get(clue.id) ?? new Set();
            const discovered = clue.data.discovered === true;
            return (
              <Fragment key={clue.id}>
                <Link
                  to={`/clues/${clue.id}`}
                  className="sticky left-0 z-10 flex items-center gap-2 border-b border-r border-surface-200 bg-white px-3 py-2 hover:bg-surface-50 transition-colors"
                  role="rowheader"
                  title={clue.name}
                >
                  <KeyRound className={`h-3.5 w-3.5 shrink-0 ${discovered ? 'text-emerald-500' : 'text-surface-400'}`} aria-hidden />
                  <span className="truncate text-sm font-medium text-surface-800 max-w-[150px]">{clue.name}</span>
                  <span className={`ml-auto shrink-0 text-[10px] ${discovered ? 'text-emerald-600' : 'text-surface-400'}`}>
                    {discovered ? 'odkryta' : 'ukryta'}
                  </span>
                </Link>
                {sessions.map((session) => {
                  const active = sessionsForClue.has(session.id);
                  return (
                    <div key={`clue-cell-${clue.id}-${session.id}`} className="border-b border-r border-surface-200 px-1 py-2" role="cell">
                      {active ? <div className={`h-full min-h-[20px] rounded ${discovered ? 'bg-emerald-400/60' : 'bg-surface-300/70'}`} /> : null}
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
