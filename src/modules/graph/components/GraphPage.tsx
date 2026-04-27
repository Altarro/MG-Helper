import { useState } from 'react';
import { ENTITY_TYPES } from '@shared/types/entity';
import { RELATION_TYPES } from '@shared/types/relation';
import { GraphView } from './GraphView';
import { GraphControls } from './GraphControls';
import type { EntityType } from '@shared/types/entity';
import type { RelationType } from '@shared/types/relation';

type GraphPreset = {
  id: string;
  label: string;
  description: string;
  types: EntityType[];
  relations: RelationType[];
};

const GRAPH_PRESETS: GraphPreset[] = [
  {
    id: 'all',
    label: 'Pełny świat',
    description: 'Cała kampania bez filtrowania.',
    types: [...ENTITY_TYPES],
    relations: [...RELATION_TYPES],
  },
  {
    id: 'threat-thread-clue',
    label: 'Zagrożenie -> Wątek -> Wskazówka',
    description: 'Szybki przegląd łańcucha presji i tropów.',
    types: ['threat', 'thread', 'clue', 'clock'],
    relations: ['affects', 'clues_for', 'tracks', 'appears_in', 'related_to'],
  },
  {
    id: 'session-impact',
    label: 'Wpływ sesji',
    description: 'Co faktycznie pojawia się w sesjach.',
    types: ['session', 'threat', 'thread', 'npc', 'location', 'clue', 'item'],
    relations: ['appears_in', 'affects', 'related_to', 'clues_for'],
  },
];

export function GraphPage() {
  const [visibleTypes, setVisibleTypes] = useState<Set<EntityType>>(new Set(ENTITY_TYPES));
  const [visibleRelations, setVisibleRelations] = useState<Set<RelationType>>(new Set(RELATION_TYPES));

  function toggleType(type: EntityType) {
    setVisibleTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  function toggleRelation(rel: RelationType) {
    setVisibleRelations((prev) => {
      const next = new Set(prev);
      if (next.has(rel)) next.delete(rel);
      else next.add(rel);
      return next;
    });
  }

  function applyPreset(preset: GraphPreset) {
    setVisibleTypes(new Set(preset.types));
    setVisibleRelations(new Set(preset.relations));
  }

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <h1 className="text-xl font-bold text-surface-900">Graf relacji</h1>
      <section className="rounded-xl border border-surface-200 bg-surface-50/70 p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-surface-500">Presety operacyjne</p>
        <div className="flex flex-wrap gap-2">
          {GRAPH_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyPreset(preset)}
              className="rounded-full border border-surface-200 bg-white px-3 py-1.5 text-xs font-medium text-surface-700 hover:border-primary-300 hover:text-primary-800"
              title={preset.description}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </section>
      <GraphControls
        visibleTypes={visibleTypes}
        onToggleType={toggleType}
        visibleRelations={visibleRelations}
        onToggleRelation={toggleRelation}
      />
      <div className="flex flex-1 min-h-0 rounded-xl border border-surface-200 overflow-hidden">
        <GraphView visibleTypes={visibleTypes} visibleRelations={visibleRelations} />
      </div>
    </div>
  );
}
