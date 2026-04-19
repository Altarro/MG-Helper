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

type FilterTab = 'all' | 'discovered' | 'hidden' | 'character' | 'location' | 'event';

const TAB_LABELS: Record<FilterTab, string> = {
  all: 'Wszystkie',
  discovered: 'Odkryte',
  hidden: 'Nieodkryte',
  character: 'Postacie',
  location: 'Lokacje',
  event: 'Zdarzenia',
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
    const targets = targetIds.length > 0 ? await db.entities.where('id').anyOf(targetIds).toArray() : [];
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
      clue.data.clueType === tab;

    return matchesQuery && matchesTab;
  });

  const groupedSections = useMemo(() => {
    const sections = new Map<string, { target: Entity; clues: Clue[] }>();

    for (const clue of filtered ?? []) {
      const relations = (clueLinkData?.relations ?? []).filter((relation) => relation.sourceId === clue.id);

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
      const typeOrder = (STORY_TARGET_ORDER[a.target.type] ?? 99) - (STORY_TARGET_ORDER[b.target.type] ?? 99);
      if (typeOrder !== 0) return typeOrder;
      return a.target.name.localeCompare(b.target.name);
    });
  }, [filtered, clueLinkData]);

  const freeClues = useMemo(
    () =>
      (filtered ?? []).filter(
        (clue) => !(clueLinkData?.relations ?? []).some((relation) => relation.sourceId === clue.id),
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
          clueType: values.clueType,
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
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-surface-900">Wskazówki</h1>
          <p className="mt-1 text-sm text-surface-500">
            Tropy i sekrety kampanii, grupowane względem celu albo pokazywane jako wolne wskazówki.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setViewMode('grouped')}
            className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              viewMode === 'grouped'
                ? 'bg-cyan-100 text-cyan-700'
                : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
            }`}
          >
            Grupowanie
          </button>
          <button
            type="button"
            onClick={() => setViewMode('flat')}
            className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              viewMode === 'flat'
                ? 'bg-cyan-100 text-cyan-700'
                : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
            }`}
          >
            Siatka
          </button>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            <Plus className="h-4 w-4" />
            Nowa wskazówka
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 rounded-lg border border-surface-200 bg-surface-50 p-1 w-fit">
        {(Object.entries(TAB_LABELS) as [FilterTab, string][]).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === value
                ? 'bg-white text-surface-900 shadow-sm'
                : 'text-surface-500 hover:text-surface-800'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {showForm && (
        <div className="rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-surface-900">Nowa wskazówka</h2>
          <ClueForm
            onSubmit={handleCreate}
            onCancel={() => setShowForm(false)}
            isSaving={saving}
          />
        </div>
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Szukaj wskazówek, hintów albo celów..."
          className="w-full rounded-md border border-surface-300 py-2 pl-9 pr-8 text-sm focus:border-primary-500 focus:outline-none"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2"
            aria-label="Wyczyść wyszukiwanie wskazówek"
          >
            <X className="h-4 w-4 text-surface-400" />
          </button>
        )}
      </div>

      {clues.length === 0 ? (
        <EmptyState
          icon={<Zap className="h-8 w-8" />}
          title="Brak wskazówek"
          description="Dodaj pierwszą wskazówkę dla tej kampanii."
        />
      ) : filtered?.length === 0 ? (
        <EmptyState
          icon={<Search className="h-8 w-8" />}
          title="Brak wyników"
          description="Zmień filtry albo wyszukiwaną frazę."
        />
      ) : viewMode === 'grouped' ? (
        <div className="flex flex-col gap-4">
          {groupedSections.map((section) => {
            const detailPath = getEntityDetailPath(section.target.type, section.target.id);

            return (
              <section
                key={section.target.id}
                className="rounded-2xl border border-surface-200 bg-white p-4 shadow-sm"
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-surface-400">
                      {getEntityTypeLabel(section.target.type)}
                    </p>
                    {detailPath ? (
                      <Link
                        to={detailPath}
                        className="mt-1 inline-flex max-w-full truncate text-sm font-semibold text-primary-700 hover:underline"
                      >
                        {section.target.name}
                      </Link>
                    ) : (
                      <h2 className="mt-1 text-sm font-semibold text-surface-900">{section.target.name}</h2>
                    )}
                  </div>
                  <span className="shrink-0 rounded-full bg-surface-100 px-2.5 py-1 text-xs text-surface-500">
                    {section.clues.length} wsk.
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
            <section className="rounded-2xl border border-cyan-200 bg-cyan-50/40 p-4 shadow-sm">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">
                    Wolne wskazówki
                  </p>
                  <p className="mt-1 text-sm text-surface-600">
                    Sekrety i tropy, które nie mają jeszcze przypiętego celu fabularnego.
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-white/80 px-2.5 py-1 text-xs text-cyan-700 ring-1 ring-inset ring-cyan-200">
                  {freeClues.length} szt.
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(filtered ?? []).map((clue) => (
            <ClueCard
              key={clue.id}
              clue={clue}
              onClick={() => navigate(`/clues/${clue.id}`)}
              onToggleDiscovered={handleToggleDiscovered}
            />
          ))}
        </div>
      )}
    </div>
  );
}
