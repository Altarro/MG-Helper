import { useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Search, Zap, X } from 'lucide-react';
import { useClues } from '../hooks/useClues';
import { ClueCard } from './ClueCard';
import { ClueForm } from './ClueForm';
import { LoadingSpinner } from '@shared/components/LoadingSpinner';
import { EmptyState } from '@shared/components/EmptyState';
import { addEntity, updateEntity } from '@shared/db/operations';
import { useCampaign } from '@shared/db/CampaignContext';
import { toast } from 'sonner';
import type { Clue } from '../types';
import type { ClueFormValues } from './ClueForm';
import { getEntityDetailPath, getEntityTypeLabel } from '@shared/utils/entityTypeMeta';
import type { Entity } from '@shared/types/entity';

type FilterTab = 'all' | 'discovered' | 'hidden' | 'character' | 'location' | 'event' | 'item';

const TAB_LABELS: Record<FilterTab, string> = {
  all: 'Wszystkie',
  discovered: 'Odkryte',
  hidden: 'Nieodkryte',
  character: 'Postacie',
  location: 'Lokacje',
  event: 'Zdarzenia',
  item: 'Przedmioty',
};

const STORY_TARGET_ORDER: Record<string, number> = {
  front: 0,
  threat: 1,
  thread: 2,
};

export function ClueList() {
  const clues = useClues();
  const navigate = useNavigate();
  const { db } = useCampaign();

  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<FilterTab>('all');
  const [viewMode, setViewMode] = useState<'grouped' | 'flat'>('grouped');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const clueLinkData = useLiveQuery(async () => {
    const relations = await db.relations.toArray();
    const clueRelations = relations.filter((relation) => relation.type === 'clues_for');
    const targetIds = [...new Set(clueRelations.map((relation) => relation.targetId))];
    const targets =
      targetIds.length > 0 ? await db.entities.where('id').anyOf(targetIds).toArray() : [];
    return {
      relations: clueRelations,
      targets: new Map(targets.map((target) => [target.id, target])),
    };
  }, [db]);

  const lowerQuery = query.trim().toLowerCase();
  const filtered = clues?.filter((clue) => {
    const relatedTargets = (clueLinkData?.relations ?? [])
      .filter((relation) => relation.sourceId === clue.id)
      .map((relation) => clueLinkData?.targets.get(relation.targetId))
      .filter((target): target is Entity => Boolean(target));

    const matchesQuery =
      !lowerQuery ||
      clue.name.toLowerCase().includes(lowerQuery) ||
      clue.data.hint.toLowerCase().includes(lowerQuery) ||
      clue.tags.some((tag) => tag.toLowerCase().includes(lowerQuery)) ||
      relatedTargets.some((target) => target.name.toLowerCase().includes(lowerQuery));

    const matchesTab =
      tab === 'all' ||
      (tab === 'discovered' && clue.data.discovered) ||
      (tab === 'hidden' && !clue.data.discovered) ||
      (tab !== 'discovered' && tab !== 'hidden' && clue.data.clueTypes.includes(tab));

    return matchesQuery && matchesTab;
  });

  const groupedSections = useMemo(() => {
    const sections = new Map<string, { target: Entity; clues: Clue[] }>();

    for (const clue of filtered ?? []) {
      const relations = (clueLinkData?.relations ?? []).filter(
        (relation) => relation.sourceId === clue.id,
      );

      for (const relation of relations) {
        const target = clueLinkData?.targets.get(relation.targetId);
        if (!target) continue;

        const existing = sections.get(target.id);
        if (existing) {
          existing.clues.push(clue);
        } else {
          sections.set(target.id, { target, clues: [clue] });
        }
      }
    }

    return [...sections.values()].sort((a, b) => {
      const typeOrder =
        (STORY_TARGET_ORDER[a.target.type] ?? 99) - (STORY_TARGET_ORDER[b.target.type] ?? 99);
      if (typeOrder !== 0) return typeOrder;
      return a.target.name.localeCompare(b.target.name);
    });
  }, [filtered, clueLinkData]);

  const freeClues = useMemo(
    () =>
      (filtered ?? []).filter(
        (clue) =>
          !(clueLinkData?.relations ?? []).some((relation) => relation.sourceId === clue.id),
      ),
    [filtered, clueLinkData],
  );

  async function handleCreate(values: ClueFormValues) {
    setSaving(true);
    try {
      const entity = await addEntity(db, {
        type: 'clue',
        name: values.name,
        description: values.description,
        tags: values.tags,
        data: {
          clueTypes: values.clueTypes,
          clueType: values.clueTypes[0],
          hint: values.hint,
          discovered: values.discovered,
        },
      });
      toast.success(`Wskazówka "${values.name}" utworzona`);
      setShowForm(false);
      navigate(`/clues/${entity.id}`);
    } catch {
      toast.error('Nie udało się utworzyć wskazówki');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleDiscovered(clue: Clue) {
    try {
      await updateEntity(db, clue.id, {
        data: { ...clue.data, discovered: !clue.data.discovered },
      });
      toast.success(clue.data.discovered ? 'Wskazówka ukryta' : 'Wskazówka odkryta');
    } catch {
      toast.error('Nie udało się zaktualizować wskazówki');
    }
  }

  if (clues === undefined) return <LoadingSpinner />;

  return (
    <div className="flex flex-col gap-6">
      <section className="app-panel-strong rounded-[2rem] px-6 py-7 lg:px-8 lg:py-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-3xl">
            <div className="text-primary-700 mb-3 inline-flex items-center rounded-full border border-[rgba(33,71,102,0.16)] bg-[rgba(111,146,164,0.12)] px-3 py-1 text-[11px] font-semibold tracking-[0.18em] uppercase">
              Wskazówki
            </div>
            <h1 className="text-primary-900 text-3xl font-semibold tracking-[-0.04em] lg:text-[2.2rem]">
              Wskazówki
            </h1>
            <p className="text-surface-700 mt-2 max-w-[64ch] text-sm leading-7 lg:text-[0.98rem]">
              Tropy i sekrety kampanii, grupowane względem celu albo pokazywane jako wolne
              wskazówki.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setViewMode('grouped')}
              className={`rounded-full px-4 py-2 text-xs font-semibold tracking-[0.01em] transition-all ${
                viewMode === 'grouped'
                  ? 'app-pill'
                  : 'app-pill-muted hover:bg-[rgba(223,225,218,0.98)]'
              }`}
            >
              Grupowanie
            </button>
            <button
              type="button"
              onClick={() => setViewMode('flat')}
              className={`rounded-full px-4 py-2 text-xs font-semibold tracking-[0.01em] transition-all ${
                viewMode === 'flat'
                  ? 'app-pill'
                  : 'app-pill-muted hover:bg-[rgba(223,225,218,0.98)]'
              }`}
            >
              Siatka
            </button>
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="app-button-primary flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition-transform hover:-translate-y-0.5"
            >
              <Plus className="h-4 w-4" />
              Nowa wskazówka
            </button>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2.5">
          {(Object.entries(TAB_LABELS) as [FilterTab, string][]).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value)}
              className={`rounded-full px-4 py-2 text-xs font-semibold tracking-[0.01em] transition-all ${
                tab === value ? 'app-pill' : 'app-pill-muted hover:bg-[rgba(223,225,218,0.98)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="relative mt-6">
          <Search className="text-surface-500 pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Szukaj wskazówek, hintów albo celów..."
            className="app-input text-surface-900 placeholder:text-surface-500 focus:border-primary-500 focus:ring-primary-500/20 w-full rounded-2xl py-3 pr-10 pl-11 text-sm focus:ring-2 focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="text-surface-500 hover:text-primary-700 absolute top-1/2 right-3 -translate-y-1/2 rounded-full p-1 transition-colors"
              aria-label="Wyczyść wyszukiwanie wskazówek"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </section>

      {showForm && (
        <div className="app-panel rounded-[1.8rem] p-5 lg:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-primary-900 text-base font-semibold tracking-[-0.02em]">
              Nowa wskazówka
            </h2>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-surface-500 hover:text-primary-700 rounded-xl p-2 transition-colors hover:bg-[rgba(223,225,218,0.75)]"
              aria-label="Zamknij formularz nowej wskazówki"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <ClueForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} isSaving={saving} />
        </div>
      )}

      {clues.length === 0 ? (
        <div className="app-panel rounded-[1.8rem] p-6">
          <EmptyState
            icon={<Zap className="text-primary-300 h-8 w-8" />}
            title="Brak wskazówek"
            description="Dodaj pierwszą wskazówkę dla tej kampanii."
            action={
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="app-button-primary rounded-2xl px-4 py-3 text-sm font-semibold"
              >
                Nowa wskazówka
              </button>
            }
          />
        </div>
      ) : filtered?.length === 0 ? (
        <div className="app-panel rounded-[1.8rem] p-6">
          <EmptyState
            icon={<Search className="text-primary-300 h-8 w-8" />}
            title="Brak wyników"
            description="Zmień filtry albo wyszukiwaną frazę."
          />
        </div>
      ) : viewMode === 'grouped' ? (
        <div className="flex flex-col gap-5">
          {groupedSections.map((section) => {
            const detailPath = getEntityDetailPath(section.target.type, section.target.id);

            return (
              <section key={section.target.id} className="app-panel rounded-[1.85rem] p-4 lg:p-5">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-surface-500 text-[11px] font-semibold tracking-[0.18em] uppercase">
                      {getEntityTypeLabel(section.target.type)}
                    </p>
                    {detailPath ? (
                      <Link
                        to={detailPath}
                        className="text-primary-900 mt-2 inline-flex max-w-full truncate text-lg font-semibold tracking-[-0.03em] hover:underline"
                      >
                        {section.target.name}
                      </Link>
                    ) : (
                      <h2 className="text-primary-900 mt-2 text-lg font-semibold tracking-[-0.03em]">
                        {section.target.name}
                      </h2>
                    )}
                  </div>
                  <span className="app-pill-muted shrink-0 rounded-full px-3 py-1 text-xs">
                    {section.clues.length} wsk.
                  </span>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {section.clues.map((clue) => (
                    <ClueCard
                      key={`${section.target.id}:${clue.id}`}
                      clue={clue}
                      onClick={() => navigate(`/clues/${clue.id}`)}
                      onToggleDiscovered={handleToggleDiscovered}
                    />
                  ))}
                </div>
              </section>
            );
          })}

          {freeClues.length > 0 && (
            <section className="app-panel rounded-[1.85rem] p-4 lg:p-5">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold tracking-[0.18em] text-[#8c6416] uppercase">
                    Wolne wskazówki
                  </p>
                  <p className="text-surface-700 mt-2 max-w-[58ch] text-sm leading-7">
                    Sekrety i tropy, które nie mają jeszcze przypiętego celu fabularnego.
                  </p>
                </div>
                <span className="app-danger-pill shrink-0 rounded-full px-3 py-1 text-xs">
                  {freeClues.length} szt.
                </span>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {freeClues.map((clue) => (
                  <ClueCard
                    key={clue.id}
                    clue={clue}
                    onClick={() => navigate(`/clues/${clue.id}`)}
                    onToggleDiscovered={handleToggleDiscovered}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      ) : (
        <div className="app-panel rounded-[1.85rem] p-4 lg:p-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {(filtered ?? []).map((clue) => (
              <ClueCard
                key={clue.id}
                clue={clue}
                onClick={() => navigate(`/clues/${clue.id}`)}
                onToggleDiscovered={handleToggleDiscovered}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
