import { useMemo, useState } from 'react';
import { Filter, GitFork, Network, Search, X } from 'lucide-react';
import { ENTITY_TYPES } from '@shared/types/entity';
import { RELATION_TYPES } from '@shared/types/relation';
import { GraphView } from './GraphView';
import type { EntityType } from '@shared/types/entity';
import type { RelationType } from '@shared/types/relation';
import { useGraphData } from '../hooks/useGraphData';

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
  {
    id: 'social-pressure',
    label: 'Frakcje i presja',
    description: 'Sieć wpływu: frakcje, NPC, zagrożenia i lokacje.',
    types: ['faction', 'npc', 'threat', 'location', 'thread'],
    relations: ['related_to', 'affects', 'belongs_to', 'appears_in'],
  },
];

export function GraphPage({ embedded = false }: { embedded?: boolean }) {
  const [visibleTypes, setVisibleTypes] = useState<Set<EntityType>>(new Set(ENTITY_TYPES));
  const [visibleRelations, setVisibleRelations] = useState<Set<RelationType>>(new Set(RELATION_TYPES));
  const [searchQuery, setSearchQuery] = useState('');
  const data = useGraphData(visibleTypes, visibleRelations);

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

  function selectAll() {
    setVisibleTypes(new Set(ENTITY_TYPES));
    setVisibleRelations(new Set(RELATION_TYPES));
  }

  const summary = useMemo(() => {
    const nodes = data?.nodes.length ?? 0;
    const links = data?.links.length ?? 0;
    return { nodes, links };
  }, [data]);

  return (
    <div className={`flex h-full flex-col gap-4 ${embedded ? 'p-0' : 'p-4 lg:p-6'}`}>
      {!embedded ? (
        <section className="app-panel-strong shrink-0 rounded-[2rem] px-6 py-7 lg:px-8 lg:py-8">
          <div className="text-primary-700 mb-3 inline-flex items-center gap-2 rounded-full border border-[rgba(33,71,102,0.16)] bg-[rgba(111,146,164,0.12)] px-3 py-1 text-[11px] font-semibold tracking-[0.18em] uppercase">
            <GitFork className="h-3.5 w-3.5" aria-hidden />
            Za kulisami
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-primary-900 text-3xl font-semibold tracking-[-0.04em] lg:text-[2.2rem]">
              Graf relacji
            </h1>
            <span className="rounded-full border border-orange-300/70 bg-orange-100 px-3 py-1 text-[11px] font-semibold tracking-[0.12em] text-orange-800 uppercase">
              W budowie
            </span>
          </div>
          <p className="text-surface-700 mt-2 max-w-[62ch] text-sm leading-7 lg:text-[0.98rem]">
            Wizualna mapa powiązań encji — przydaje się do audytu fabuły i porządków między sesjami.
          </p>
        </section>
      ) : null}
      <section className="app-panel shrink-0 rounded-[1.45rem] p-4 lg:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-surface-500 text-[11px] font-semibold tracking-[0.18em] uppercase">Nawigacja grafu</p>
            <p className="text-surface-700 mt-1 text-sm">
              Szybko zawężaj widok, aby znaleźć relacje istotne dla najbliższej sesji.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-surface-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-surface-600">
              Węzły: {summary.nodes}
            </span>
            <span className="rounded-full border border-surface-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-surface-600">
              Relacje: {summary.links}
            </span>
          </div>
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-[1.2fr_1fr]">
          <label className="app-input-shell flex items-center gap-2 rounded-xl px-3 py-2">
            <Search className="h-4 w-4 text-surface-400" />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Szukaj encji po nazwie, typie lub tagu..."
              className="w-full bg-transparent text-sm text-surface-800 outline-none placeholder:text-surface-400"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="rounded-full p-1 text-surface-400 hover:bg-surface-100 hover:text-surface-700"
                aria-label="Wyczyść wyszukiwarkę"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={selectAll}
              className="app-button-secondary inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium"
            >
              <Network className="h-3.5 w-3.5" /> Pełny widok
            </button>
            <button
              type="button"
              onClick={() => {
                setVisibleTypes(new Set(['threat', 'thread', 'clue', 'clock']));
                setVisibleRelations(new Set(['affects', 'clues_for', 'tracks', 'appears_in']));
              }}
              className="app-button-secondary inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium"
            >
              <Filter className="h-3.5 w-3.5" /> Tylko śledztwo
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {GRAPH_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyPreset(preset)}
              className="app-pill-muted rounded-full px-3.5 py-1.5 text-xs font-semibold text-surface-700 transition-colors hover:bg-[rgba(223,225,218,0.95)] hover:text-primary-800"
              title={preset.description}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </section>

      <section className="grid gap-3 lg:grid-cols-[1.25fr_1fr]">
        <div className="rounded-xl border border-surface-200 bg-white p-3.5">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-surface-500">Typy encji</p>
          <div className="flex flex-wrap gap-1.5">
            {ENTITY_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => toggleType(type)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                  visibleTypes.has(type)
                    ? 'bg-primary-700 text-white'
                    : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-surface-200 bg-white p-3.5">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-surface-500">Relacje</p>
          <div className="flex flex-wrap gap-1.5">
            {RELATION_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => toggleRelation(type)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                  visibleRelations.has(type)
                    ? 'bg-surface-700 text-white'
                    : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className={`app-panel flex min-h-0 flex-1 overflow-hidden rounded-[1.35rem] ${embedded ? 'min-h-[66vh]' : ''}`}>
        <GraphView visibleTypes={visibleTypes} visibleRelations={visibleRelations} searchQuery={searchQuery} />
      </div>
    </div>
  );
}
