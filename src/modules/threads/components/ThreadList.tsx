import { useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { Plus, Milestone, Search, X } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
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

  void Link;
  void Search;
  void X;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const lowerQuery = query.trim().toLowerCase();
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

  const filtered = threads?.filter((thread) => {
    const relatedThreats = (threadThreatMap.get(thread.id) ?? [])
      .map((threatId) => threatMap.get(threatId))
      .filter((threat): threat is NonNullable<typeof threat> => Boolean(threat));
    const matchesQuery =
      !lowerQuery ||
      thread.name.toLowerCase().includes(lowerQuery) ||
      thread.tags.some((t) => t.toLowerCase().includes(lowerQuery)) ||
      relatedThreats.some((threat) => threat.name.toLowerCase().includes(lowerQuery));

    const matchesTab =
      tab === 'all' || thread.data.status === tab;

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

  void viewMode;
  void setViewMode;
  void groupedSections;
  void freeThreads;

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
      toast.success(`Wątek „${values.name}" utworzony`);
      setShowForm(false);
      navigate(`/threads/${entity.id}`);
    } catch {
      toast.error('Nie udało się utworzyć wątku');
    } finally {
      setSaving(false);
    }
  }

  function handleDragStart(event: DragStartEvent) {
    const active = threads?.find((t) => t.id === event.active.id);
    setActiveDragThread(active ?? null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveDragThread(null);
    const { active, over } = event;
    if (!over || active.id === over.id || !threads) return;
    const reordered = reorderEntities(threads, String(active.id), String(over.id));
    try {
      await updateSortOrders(db, reordered.map((t) => t.id));
      toast.success('Kolejność zaktualizowana');
    } catch {
      toast.error('Nie udało się zapisać kolejności');
    }
  }

  if (threads === undefined) return <LoadingSpinner />;

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-surface-900">Wątki fabularne</h1>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          <Plus className="h-4 w-4" />
          Nowy wątek
        </button>
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

      {/* Search */}
      <div className="relative">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Szukaj wątków…"
          className="w-full rounded-md border border-surface-300 py-2 pl-9 pr-3 text-sm focus:border-primary-500 focus:outline-none"
        />
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-surface-400">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-surface-200">
        {(Object.entries(TAB_LABELS) as [FilterTab, string][]).map(([value, label]) => (
          <button
            key={value}
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

      {filtered && filtered.length === 0 && (
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
      )}

      {filtered && filtered.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={filtered.map((t) => t.id)} strategy={rectSortingStrategy}>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((thread) => (
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
              <div className="opacity-80 shadow-xl rounded-lg">
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
