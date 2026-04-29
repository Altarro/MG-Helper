import { useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Milestone, Search, X } from 'lucide-react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { useThreads } from '../hooks/useThreads';
import { useThreats } from '@modules/fronts/hooks/useThreats';
import { ThreadCard } from './ThreadCard';
import { SortableThreadCard } from './SortableThreadCard';
import { ThreadForm } from './ThreadForm';
import { FilterCountBadge } from '@shared/components/FilterCountBadge';
import { LoadingSpinner } from '@shared/components/LoadingSpinner';
import { EmptyState } from '@shared/components/EmptyState';
import { addEntity, updateSortOrders } from '@shared/db/operations';
import { useCampaign } from '@shared/db/CampaignContext';
import { toast } from 'sonner';
import { formatPolishThreadCount } from '@shared/utils/polishPlural';
import { reorderEntities } from '@shared/utils/dnd';
import type { Thread } from '../types';
import type { ThreadFormValues } from './ThreadForm';

type FilterTab = 'all' | 'active' | 'completed';

const TAB_LABELS: Record<FilterTab, string> = {
  all: 'Wszystkie',
  active: 'Aktywne',
  completed: 'Zakończone',
};

export function ThreadList() {
  const threads = useThreads();
  const threats = useThreats();
  const navigate = useNavigate();
  const { db } = useCampaign();

  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<FilterTab>('all');
  const [viewMode, setViewMode] = useState<'grouped' | 'flat'>('grouped');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeDragThread, setActiveDragThread] = useState<Thread | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const threatLinks = useLiveQuery(async () => {
    const relations = await db.relations.toArray();
    return relations.filter((relation) => relation.type === 'affects');
  }, [db]);

  const threatMap = useMemo(
    () => new Map((threats ?? []).map((threat) => [threat.id, threat])),
    [threats],
  );

  const threadThreatMap = useMemo(() => {
    const map = new Map<string, string[]>();

    for (const relation of threatLinks ?? []) {
      const sourceThreat = threatMap.has(relation.sourceId) ? relation.sourceId : null;
      const targetThreat = threatMap.has(relation.targetId) ? relation.targetId : null;
      const threadId = sourceThreat ? relation.targetId : targetThreat ? relation.sourceId : null;
      const threatId = sourceThreat ?? targetThreat;

      if (!threadId || !threatId) continue;

      const existing = map.get(threadId) ?? [];
      if (!existing.includes(threatId)) {
        existing.push(threatId);
        map.set(threadId, existing);
      }
    }

    return map;
  }, [threatLinks, threatMap]);

  const lowerQuery = query.trim().toLowerCase();
  const queryMatchedThreads = threads?.filter((thread) => {
    const relatedThreats = (threadThreatMap.get(thread.id) ?? [])
      .map((threatId) => threatMap.get(threatId))
      .filter((threat): threat is NonNullable<typeof threat> => Boolean(threat));

    return (
      !lowerQuery ||
      thread.name.toLowerCase().includes(lowerQuery) ||
      thread.tags.some((tag) => tag.toLowerCase().includes(lowerQuery)) ||
      relatedThreats.some((threat) => threat.name.toLowerCase().includes(lowerQuery))
    );
  });
  const filtered = queryMatchedThreads?.filter(
    (thread) => tab === 'all' || thread.data.status === tab,
  );
  const tabStats = useMemo(() => {
    const list = queryMatchedThreads ?? [];
    return {
      all: list.length,
      active: list.filter((t) => t.data.status === 'active').length,
      completed: list.filter((t) => t.data.status === 'completed').length,
    };
  }, [queryMatchedThreads]);
  const viewModeCount = filtered?.length ?? 0;

  const groupedSections = useMemo(() => {
    const sections = new Map<
      string,
      { threat: NonNullable<typeof threats>[number]; threads: NonNullable<typeof threads> }
    >();

    for (const thread of filtered ?? []) {
      const threatIds = threadThreatMap.get(thread.id) ?? [];
      for (const threatId of threatIds) {
        const threat = threatMap.get(threatId);
        if (!threat) continue;

        const existing = sections.get(threat.id);
        if (existing) {
          existing.threads.push(thread);
        } else {
          sections.set(threat.id, { threat, threads: [thread] });
        }
      }
    }

    return [...sections.values()].sort((a, b) => a.threat.name.localeCompare(b.threat.name));
  }, [filtered, threadThreatMap, threatMap]);

  const freeThreads = useMemo(
    () => (filtered ?? []).filter((thread) => (threadThreatMap.get(thread.id) ?? []).length === 0),
    [filtered, threadThreatMap],
  );

  async function handleCreate(values: ThreadFormValues) {
    setSaving(true);
    try {
      const entity = await addEntity(db, {
        type: 'thread',
        name: values.name,
        description: values.description,
        tags: values.tags,
        data: {
          color: values.color,
          status: values.status,
          kind: values.kind,
          priority: values.priority,
          resolution: values.resolution,
        },
      });
      toast.success(`Wątek "${values.name}" utworzony`);
      setShowForm(false);
      navigate(`/threads/${entity.id}`);
    } catch {
      toast.error('Nie udało się utworzyć wątku');
    } finally {
      setSaving(false);
    }
  }

  function handleDragStart(event: DragStartEvent) {
    const active = threads?.find((thread) => thread.id === event.active.id);
    setActiveDragThread(active ?? null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveDragThread(null);
    const { active, over } = event;
    if (!over || active.id === over.id || !threads) return;

    const reordered = reorderEntities(threads, String(active.id), String(over.id));
    try {
      await updateSortOrders(
        db,
        reordered.map((thread) => thread.id),
      );
      toast.success('Kolejność zaktualizowana');
    } catch {
      toast.error('Nie udało się zapisać kolejności');
    }
  }

  if (threads === undefined) return <LoadingSpinner />;

  return (
    <div className="flex flex-col gap-6">
      <section className="app-panel-strong rounded-[2rem] px-6 py-7 lg:px-8 lg:py-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-3xl">
            <div className="text-primary-700 mb-3 inline-flex items-center rounded-full border border-[rgba(33,71,102,0.16)] bg-[rgba(111,146,164,0.12)] px-3 py-1 text-[11px] font-semibold tracking-[0.18em] uppercase">
              Wątki fabularne
            </div>
            <h1 className="text-primary-900 text-3xl font-semibold tracking-[-0.04em] lg:text-[2.2rem]">
              Wątki fabularne
            </h1>
            <p className="text-surface-700 mt-2 max-w-[64ch] text-sm leading-7 lg:text-[0.98rem]">
              Questy i sprawy dla stołu, grupowane względem zagrożeń albo pokazywane jako wolne
              wątki.
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
              <span>Grupowanie</span>
              <FilterCountBadge selected={viewMode === 'grouped'} count={viewModeCount} />
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
              <span>Siatka</span>
              <FilterCountBadge selected={viewMode === 'flat'} count={viewModeCount} />
            </button>
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="app-button-primary flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition-transform hover:-translate-y-0.5"
            >
              <Plus className="h-4 w-4" />
              Nowy wątek
            </button>
          </div>
        </div>

        <div className="relative mt-6">
          <Search className="text-surface-500 pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Szukaj wątków, tagów albo zagrożeń..."
            className="app-input text-surface-900 placeholder:text-surface-500 focus:border-primary-500 focus:ring-primary-500/20 w-full rounded-2xl py-3 pr-10 pl-11 text-sm focus:ring-2 focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="text-surface-500 hover:text-primary-700 absolute top-1/2 right-3 -translate-y-1/2 rounded-full p-1 transition-colors"
              aria-label="Wyczyść wyszukiwanie wątków"
            >
              <X className="h-4 w-4" />
            </button>
          )}
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
              <span>{label}</span>
              <FilterCountBadge
                selected={tab === value}
                count={
                  value === 'all'
                    ? tabStats.all
                    : value === 'active'
                      ? tabStats.active
                      : tabStats.completed
                }
              />
            </button>
          ))}
        </div>
      </section>

      {showForm && (
        <div className="app-panel rounded-[1.8rem] p-5 lg:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-primary-900 text-base font-semibold tracking-[-0.02em]">
              Nowy wątek
            </h2>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-surface-500 hover:text-primary-700 rounded-xl p-2 transition-colors hover:bg-[rgba(223,225,218,0.75)]"
              aria-label="Zamknij formularz nowego wątku"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <ThreadForm
            onSubmit={handleCreate}
            onCancel={() => setShowForm(false)}
            isSaving={saving}
          />
        </div>
      )}

      {filtered && filtered.length === 0 ? (
        <div className="app-panel rounded-[1.8rem] p-6">
          <EmptyState
            icon={<Milestone className="text-primary-300 h-8 w-8" />}
            title="Brak wątków"
            description={
              query ? 'Żaden wątek nie pasuje do wyszukiwania.' : 'Utwórz pierwszy wątek fabularny.'
            }
            action={
              !query ? (
                <button
                  type="button"
                  onClick={() => setShowForm(true)}
                  className="app-button-primary rounded-2xl px-4 py-3 text-sm font-semibold"
                >
                  Nowy wątek
                </button>
              ) : undefined
            }
          />
        </div>
      ) : viewMode === 'grouped' ? (
        <div className="flex flex-col gap-5">
          {groupedSections.map((section) => (
            <section key={section.threat.id} className="app-panel rounded-[1.85rem] p-4 lg:p-5">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-surface-500 text-[11px] font-semibold tracking-[0.18em] uppercase">
                    Zagrożenie
                  </p>
                  <Link
                    to={`/threats/${section.threat.id}`}
                    className="text-primary-900 mt-2 inline-flex max-w-full truncate text-lg font-semibold tracking-[-0.03em] hover:underline"
                  >
                    {section.threat.name}
                  </Link>
                </div>
                <span className="app-pill-muted shrink-0 rounded-full px-3 py-1 text-xs">
                  {formatPolishThreadCount(section.threads.length)}
                </span>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {section.threads.map((thread) => (
                  <ThreadCard
                    key={`${section.threat.id}:${thread.id}`}
                    thread={thread}
                    onClick={() => navigate(`/threads/${thread.id}`)}
                  />
                ))}
              </div>
            </section>
          ))}

          {freeThreads.length > 0 && (
            <section className="app-panel rounded-[1.85rem] p-4 lg:p-5">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold tracking-[0.18em] text-[#8c6416] uppercase">
                    Wolne wątki
                  </p>
                  <p className="text-surface-700 mt-2 max-w-[58ch] text-sm leading-7">
                    Wątki poboczne albo jeszcze nieprzypięte do żadnego zagrożenia.
                  </p>
                </div>
                <span className="app-danger-pill shrink-0 rounded-full px-3 py-1 text-xs">
                  {formatPolishThreadCount(freeThreads.length)}
                </span>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {freeThreads.map((thread) => (
                  <ThreadCard
                    key={thread.id}
                    thread={thread}
                    onClick={() => navigate(`/threads/${thread.id}`)}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      ) : (
        <div className="app-panel rounded-[1.85rem] p-4 lg:p-5">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={(filtered ?? []).map((thread) => thread.id)}
              strategy={rectSortingStrategy}
            >
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {(filtered ?? []).map((thread) => (
                  <SortableThreadCard
                    key={thread.id}
                    thread={thread}
                    onClick={() => navigate(`/threads/${thread.id}`)}
                  />
                ))}
              </div>
            </SortableContext>
            <DragOverlay>
              {activeDragThread && (
                <div className="rounded-[1.35rem] opacity-[0.85] shadow-2xl">
                  <ThreadCard
                    thread={activeDragThread}
                    onClick={() => navigate(`/threads/${activeDragThread.id}`)}
                  />
                </div>
              )}
            </DragOverlay>
          </DndContext>
        </div>
      )}
    </div>
  );
}
