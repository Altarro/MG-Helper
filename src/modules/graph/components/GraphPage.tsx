import { useState } from 'react';
import { GitFork } from 'lucide-react';
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
    <div className="flex h-full flex-col gap-6 p-4 lg:p-6">
      <section className="app-panel-strong shrink-0 rounded-[2rem] px-6 py-7 lg:px-8 lg:py-8">
        <div className="text-primary-700 mb-3 inline-flex items-center gap-2 rounded-full border border-[rgba(33,71,102,0.16)] bg-[rgba(111,146,164,0.12)] px-3 py-1 text-[11px] font-semibold tracking-[0.18em] uppercase">
          <GitFork className="h-3.5 w-3.5" aria-hidden />
          Narzędzia
        </div>
        <h1 className="text-primary-900 text-3xl font-semibold tracking-[-0.04em] lg:text-[2.2rem]">Graf relacji</h1>
        <p className="text-surface-700 mt-2 max-w-[62ch] text-sm leading-7 lg:text-[0.98rem]">
          Wizualna mapa powiązań encji — przydaje się do audytu fabuły i porządków między sesjami.
        </p>
      </section>
      <section className="app-panel shrink-0 rounded-[1.85rem] p-4 lg:p-5">
        <p className="text-surface-500 mb-3 text-[11px] font-semibold tracking-[0.18em] uppercase">
          Presety operacyjne
        </p>
        <div className="flex flex-wrap gap-2">
          {GRAPH_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyPreset(preset)}
              className="app-pill-muted hover:bg-[rgba(223,225,218,0.98)] rounded-full px-4 py-2 text-xs font-semibold tracking-[0.01em] text-surface-800 transition-all hover:text-primary-800"
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
      <div className="app-panel flex min-h-0 flex-1 overflow-hidden rounded-[1.35rem]">
        <GraphView visibleTypes={visibleTypes} visibleRelations={visibleRelations} />
      </div>
    </div>
  );
}
