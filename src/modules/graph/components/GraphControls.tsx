import { ENTITY_TYPES } from '@shared/types/entity';
import { RELATION_TYPES } from '@shared/types/relation';
import type { EntityType } from '@shared/types/entity';
import type { RelationType } from '@shared/types/relation';

const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
  npc: 'NPC',
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

const RELATION_TYPE_LABELS: Record<RelationType, string> = {
  contains: 'zawiera',
  belongs_to: 'należy do',
  tracks: 'śledzi',
  appears_in: 'pojawia się',
  owns: 'posiada',
  related_to: 'powiązany',
  clues_for: 'wskazówka do',
  derives_from: 'wynika z',
  affects: 'wplywa na',
};

interface GraphControlsProps {
  visibleTypes: Set<EntityType>;
  onToggleType: (type: EntityType) => void;
  visibleRelations: Set<RelationType>;
  onToggleRelation: (rel: RelationType) => void;
}

export function GraphControls({
  visibleTypes,
  onToggleType,
  visibleRelations,
  onToggleRelation,
}: GraphControlsProps) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-surface-200 bg-white p-4 shadow-sm text-sm">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-surface-500">Typy encji</p>
        <div className="flex flex-wrap gap-1.5">
          {ENTITY_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => onToggleType(t)}
              className={`rounded-full px-3 py-0.5 text-xs font-medium transition-colors ${
                visibleTypes.has(t)
                  ? 'bg-primary-600 text-white'
                  : 'bg-surface-100 text-surface-500 hover:bg-surface-200'
              }`}
            >
              {ENTITY_TYPE_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-surface-500">Relacje</p>
        <div className="flex flex-wrap gap-1.5">
          {RELATION_TYPES.map((r) => (
            <button
              key={r}
              onClick={() => onToggleRelation(r)}
              className={`rounded-full px-3 py-0.5 text-xs font-medium transition-colors ${
                visibleRelations.has(r)
                  ? 'bg-surface-700 text-white'
                  : 'bg-surface-100 text-surface-500 hover:bg-surface-200'
              }`}
            >
              {RELATION_TYPE_LABELS[r]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
