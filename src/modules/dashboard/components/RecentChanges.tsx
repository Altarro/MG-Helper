import { Link } from 'react-router';
import { formatDate } from '@shared/utils/date';
import type { Entity } from '@shared/types/entity';
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
    return <p className="text-sm text-surface-400">Brak danych.</p>;
  }
  return (
    <ul className="divide-y divide-surface-100">
      {entities.map((entity) => {
        const path = getEntityDetailPath(entity.type, entity.id);
        if (!path) return null;

        return (
          <li key={entity.id}>
            <Link
              to={path}
              className="flex items-center gap-3 py-2.5 hover:text-primary-600 transition-colors"
            >
              <span className="shrink-0 rounded-full bg-surface-100 px-2 py-0.5 text-xs text-surface-500 min-w-[80px] text-center">
                {ENTITY_TYPE_LABELS[entity.type] ?? entity.type}
              </span>
              <span className="flex-1 truncate text-sm text-surface-800">{entity.name}</span>
              <span className="shrink-0 text-xs text-surface-400">{formatDate(entity.updatedAt)}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
