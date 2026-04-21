import { Link } from 'react-router';
import { ArrowUpRight } from 'lucide-react';
import type { Entity } from '@shared/types/entity';
import { formatDate } from '@shared/utils/date';
import { getEntityDetailPath } from '@shared/utils/entityTypeMeta';

const ENTITY_TYPE_LABELS: Record<string, string> = {
  npc: 'Postać',
  location: 'Lokacja',
  front: 'Front',
  threat: 'Zagrożenie',
  clock: 'Zegar',
  session: 'Sesja',
  faction: 'Frakcja',
  item: 'Przedmiot',
  clue: 'Wskazówka',
  thread: 'Wątek',
  note: 'Notatka',
  event: 'Zdarzenie',
};

interface RecentChangesProps {
  entities: Entity[];
}

export function RecentChanges({ entities }: RecentChangesProps) {
  if (entities.length === 0) {
    return (
      <div className="app-input-shell text-surface-500 rounded-[1.35rem] border-dashed px-4 py-5 text-sm">
        Brak danych do pokazania.
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {entities.map((entity) => {
        const path = getEntityDetailPath(entity.type, entity.id);
        if (!path) return null;

        return (
          <li key={entity.id}>
            <Link
              to={path}
              className="app-input-shell group flex items-center gap-4 rounded-[1.25rem] px-4 py-3 transition-colors hover:bg-[rgba(229,231,223,0.98)]"
            >
              <span className="app-pill-muted text-surface-600 min-w-[88px] rounded-full px-2.5 py-1 text-center text-[11px] font-semibold tracking-[0.12em] uppercase">
                {ENTITY_TYPE_LABELS[entity.type] ?? entity.type}
              </span>

              <div className="min-w-0 flex-1">
                <p className="text-surface-900 group-hover:text-primary-800 truncate text-sm font-medium">
                  {entity.name}
                </p>
              </div>

              <span className="text-surface-500 hidden text-xs sm:block">
                {formatDate(entity.updatedAt)}
              </span>

              <ArrowUpRight className="text-surface-400 group-hover:text-primary-700 h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
