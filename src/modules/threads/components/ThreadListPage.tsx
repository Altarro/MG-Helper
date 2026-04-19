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
import { LoadingSpinner } from '@shared/components/LoadingSpinner';
import { EmptyState } from '@shared/components/EmptyState';
import { addEntity, updateSortOrders } from '@shared/db/operations';
import { useCampaign } from '@shared/db/CampaignContext';
import { toast } from 'sonner';
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
  const filtered = threads?.filter((thread) => {
    const relatedThreats = (threadThreatMap.get(thread.id) ?? [])
      .map((threatId) => threatMap.get(threatId))
      .filter((threat): threat is NonNullable<typeof threat> => Boolean(threat));

    const matchesQuery =
      !lowerQuery ||
      thread.name.toLowerCase().includes(lowerQuery) ||
      thread.tags.some((tag) => tag.toLowerCase().includes(lowerQuery)) ||
      relatedThreats.some((threat) => threat.name.toLowerCase().includes(lowerQuery));

    const matchesTab = tab === 'all' || thread.data.status === tab;

    return matchesQuery && matchesTab;
  });

  const groupedSections = useMemo(() => {
    const sections = new Map<string, { threat: NonNullable<(typeof threats)>[number]; threads: NonNullable<typeof threads> }>();

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
      await updateSortOrders(db, reordered.map((thread) => thread.id));
      toast.success('Kolejność zaktualizowana');
    } catch {
      toast.error('Nie udało się zapisać kolejności');
    }
  }

  if (threads === undefined) return <LoadingSpinner />;

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-surface-900">Wątki fabularne</h1>
          <p className="mt-1 text-sm text-surface-500">
            Questy i sprawy dla stołu, grupowane względem zagrożeń albo pokazywane jako wolne wątki.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setViewMode('grouped')}
            className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              viewMode === 'grouped'
                ? 'bg-primary-100 text-primary-700'
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
                ? 'bg-primary-100 text-primary-700'
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
            Nowy wątek
          </button>
        </div>
      </div>

      {showForm && (
        <div className="rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-surface-700">Nowy wątek</h2>
          <ThreadForm
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
          placeholder="Szukaj wątków, tagów albo zagrożeń..."
          className="w-full rounded-md border border-surface-300 py-2 pl-9 pr-8 text-sm focus:border-primary-500 focus:outline-none"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2"
            aria-label="Wyczyść wyszukiwanie wątków"
          >
            <X className="h-4 w-4 text-surface-400" />
          </button>
        )}
      </div>

      <div className="flex gap-1 border-b border-surface-200">
        {(Object.entries(TAB_LABELS) as [FilterTab, string][]).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={`px-3 pb-2 text-sm font-medium transition-colors ${
              tab === value
                ? 'border-b-2 border-primary-600 text-primary-700'
                : 'text-surface-500 hover:text-surface-800'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {filtered && filtered.length === 0 ? (
        <EmptyState
          icon={<Milestone className="h-8 w-8" />}
          title="Brak wątków"
          description={query ? 'Żaden wątek nie pasuje do wyszukiwania.' : 'Utwórz pierwszy wątek fabularny.'}
          action={
            !query ? (
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
              >
                Nowy wątek
              </button>
            ) : undefined
          }
        />
      ) : viewMode === 'grouped' ? (
        <div className="flex flex-col gap-4">
          {groupedSections.map((section) => (
            <section
              key={section.threat.id}
              className="rounded-2xl border border-surface-200 bg-white p-4 shadow-sm"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-surface-400">
                    Zagrożenie
                  </p>
                  <Link
                    to={`/threats/${section.threat.id}`}
                    className="mt-1 inline-flex max-w-full truncate text-sm font-semibold text-primary-700 hover:underline"
                  >
                    {section.threat.name}
                  </Link>
                </div>
                <span className="shrink-0 rounded-full bg-surface-100 px-2.5 py-1 text-xs text-surface-500">
                  {section.threads.length} wat.
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
            <section className="rounded-2xl border border-violet-200 bg-violet-50/40 p-4 shadow-sm">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">
                    Wolne wątki
                  </p>
                  <p className="mt-1 text-sm text-surface-600">
                    Wątki poboczne albo jeszcze nieprzypięte do żadnego zagrożenia.
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-white/80 px-2.5 py-1 text-xs text-violet-700 ring-1 ring-inset ring-violet-200">
                  {freeThreads.length} szt.
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={(filtered ?? []).map((thread) => thread.id)} strategy={rectSortingStrategy}>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
              <div className="rounded-lg opacity-80 shadow-xl">
                <ThreadCard
                  thread={activeDragThread}
                  onClick={() => navigate(`/threads/${activeDragThread.id}`)}
                />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}
