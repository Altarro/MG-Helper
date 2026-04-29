import { Fragment } from 'react';
import { Link } from 'react-router';
import { CalendarDays, MapPinned } from 'lucide-react';
import { EmptyState } from '@shared/components/EmptyState';
import type { Session } from '@modules/sessions/types';
import type { Location } from '@modules/locations/types';

export interface LocationSessionMatrixProps {
  sessions: Session[];
  locations: Location[];
  locationSessionIds: Map<string, Set<string>>;
}

export function LocationSessionMatrix({ sessions, locations, locationSessionIds }: LocationSessionMatrixProps) {
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

  if (locations.length === 0) {
    return (
      <EmptyState
        icon={<MapPinned className="h-8 w-8" />}
        title="Brak lokacji"
        description="Dodaj lokacje i przypisz je do sesji, aby zobaczyć które miejsca są używane."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3" data-testid="backstage-location-matrix">
      <div className="overflow-x-auto rounded-xl border border-surface-200 bg-white shadow-sm">
        <div className="grid min-w-max" style={{ gridTemplateColumns: gridCols }} role="table" aria-label="Lokacje × Sesje">
          <div
            className="sticky left-0 z-10 flex items-center justify-center bg-surface-50 border-b border-r border-surface-200 px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide text-surface-500"
            role="columnheader"
          >
            Lokacja
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

          {locations.map((location) => {
            const sessionsForLocation = locationSessionIds.get(location.id) ?? new Set();
            return (
              <Fragment key={location.id}>
                <Link
                  to={`/locations/${location.id}`}
                  className="sticky left-0 z-10 flex items-center gap-2 border-b border-r border-surface-200 bg-white px-3 py-2 hover:bg-surface-50 transition-colors"
                  role="rowheader"
                  title={location.name}
                >
                  <MapPinned className="h-3.5 w-3.5 shrink-0 text-surface-400" aria-hidden />
                  <span className="truncate text-sm font-medium text-surface-800 max-w-[140px]">{location.name}</span>
                </Link>
                {sessions.map((session) => {
                  const active = sessionsForLocation.has(session.id);
                  return (
                    <div key={`location-cell-${location.id}-${session.id}`} className="border-b border-r border-surface-200 px-1 py-2" role="cell">
                      {active ? <div className="h-full min-h-[20px] rounded bg-cyan-400/60" /> : null}
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
