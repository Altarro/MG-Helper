import { Fragment } from 'react';
import { Link } from 'react-router';
import { CalendarDays, User } from 'lucide-react';
import { EmptyState } from '@shared/components/EmptyState';
import type { Session } from '@modules/sessions/types';
import type { Npc } from '@modules/npcs/types';

export interface NpcSessionMatrixProps {
  sessions: Session[];
  npcs: Npc[];
  npcSessionIds: Map<string, Set<string>>;
}

export function NpcSessionMatrix({ sessions, npcs, npcSessionIds }: NpcSessionMatrixProps) {
  if (sessions.length === 0) {
    return (
      <EmptyState
        icon={<CalendarDays className="h-8 w-8" />}
        title="Brak sesji"
        description="Utwórz co najmniej jedną sesję, aby zobaczyć macierz."
      />
    );
  }

  const sessionIdsWithNpcs = new Set<string>();
  for (const sessionSet of npcSessionIds.values()) {
    for (const sid of sessionSet) sessionIdsWithNpcs.add(sid);
  }
  const orphanSessions = sessions.filter((s) => !sessionIdsWithNpcs.has(s.id));

  const colCount = sessions.length;
  const gridCols = `200px repeat(${colCount}, minmax(60px, 1fr))`;

  if (npcs.length === 0) {
    return (
      <EmptyState
        icon={<User className="h-8 w-8" />}
        title="Brak postaci"
        description="Dodaj NPC i przypnij ich do sesji (w sesji na żywo lub z detalu), aby zobaczyć macierz."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3" data-testid="backstage-npc-matrix">
      <div className="overflow-x-auto rounded-xl border border-surface-200 bg-white shadow-sm">
        <div
          className="grid min-w-max"
          style={{ gridTemplateColumns: gridCols }}
          role="table"
          aria-label="NPC × Sesje"
        >
          <div
            className="sticky left-0 z-10 flex items-center justify-center bg-surface-50 border-b border-r border-surface-200 px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide text-surface-500"
            role="columnheader"
          >
            Postać
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

          {npcs.map((npc) => {
            const sessionsForNpc = npcSessionIds.get(npc.id) ?? new Set();
            return (
              <Fragment key={npc.id}>
                <Link
                  to={`/npcs/${npc.id}`}
                  className="sticky left-0 z-10 flex items-center gap-2 border-b border-r border-surface-200 bg-white px-3 py-2 hover:bg-surface-50 transition-colors"
                  role="rowheader"
                  title={npc.name}
                >
                  <User
                    className={`h-3.5 w-3.5 shrink-0 ${npc.data?.isPC === true ? 'text-warning-600' : 'text-surface-400'}`}
                    aria-hidden
                  />
                  <span className="truncate text-sm font-medium text-surface-800 max-w-[140px]">{npc.name}</span>
                </Link>
                {sessions.map((session) => {
                  const active = sessionsForNpc.has(session.id);
                  return (
                    <div
                      key={`npc-cell-${npc.id}-${session.id}`}
                      className="border-b border-r border-surface-200 px-1 py-2"
                      role="cell"
                      aria-label={active ? `${npc.name} — sesja ${session.data.number}` : undefined}
                    >
                      {active && <div className="h-full min-h-[20px] rounded bg-primary-400/55" />}
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
                <span className="text-xs italic text-surface-400">Bez postaci</span>
              </div>
              {sessions.map((session) => {
                const isOrphan = orphanSessions.some((s) => s.id === session.id);
                return (
                  <div
                    key={`npc-orphan-${session.id}`}
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
