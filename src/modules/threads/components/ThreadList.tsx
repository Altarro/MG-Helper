import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
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
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeDragThread, setActiveDragThread] = useState<Thread | null>(null);

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

    const matchesTab = tab === 'all' || thread.data.status === tab;
    return matchesQuery && matchesTab;
  });

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
    <div className="flex flex-col gap-6">
      <section className="app-panel-strong rounded-[2rem] px-6 py-7 lg:px-8 lg:py-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex items-center rounded-full border border-[rgba(33,71,102,0.16)] bg-[rgba(111,146,164,0.12)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-700">
              Sprawy przy stole
            </div>
            <h1 className="text-3xl font-semibold tracking-[-0.04em] text-primary-900 lg:text-[2.2rem]">
              Wątki fabularne
            </h1>
            <p className="mt-2 max-w-[62ch] text-sm leading-7 text-surface-700 lg:text-[0.98rem]">
              Questy i sprawy dla stołu, grupowane względem zagrożeń albo prowadzone samodzielnie.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="app-button-primary flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition-transform hover:-translate-y-0.5"
          >
            <Plus className="h-4 w-4" />
            Nowy wątek
          </button>
        </div>

        <div className="relative mt-6">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-500" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Szukaj wątków, tagów albo zagrożeń..."
            className="app-input w-full rounded-2xl py-3 pl-11 pr-10 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-surface-500 transition-colors hover:text-primary-700">
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
              className={`rounded-full px-4 py-2 text-xs font-semibold transition-all ${tab === value ? 'app-pill' : 'app-pill-muted hover:bg-[rgba(223,225,218,0.98)]'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {showForm && (
        <div className="app-panel rounded-[1.8rem] p-5 lg:p-6">
          <h2 className="mb-4 text-base font-semibold tracking-[-0.02em] text-primary-900">Nowy wątek</h2>
          <ThreadForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} isSaving={saving} />
        </div>
      )}

      {filtered && filtered.length === 0 ? (
        <div className="app-panel rounded-[1.8rem] p-6">
          <EmptyState
            icon={<Milestone className="h-8 w-8 text-primary-300" />}
            title="Brak wątków"
            description={query ? 'Żaden wątek nie pasuje do wyszukiwania.' : 'Utwórz pierwszy wątek fabularny.'}
            action={!query ? <button type="button" onClick={() => setShowForm(true)} className="app-button-primary rounded-2xl px-4 py-3 text-sm font-medium">Nowy wątek</button> : undefined}
          />
        </div>
      ) : filtered && filtered.length > 0 ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <SortableContext items={filtered.map((t) => t.id)} strategy={rectSortingStrategy}>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((thread) => (
                <SortableThreadCard key={thread.id} thread={thread} onClick={() => navigate(`/threads/${thread.id}`)} />
              ))}
            </div>
          </SortableContext>
          <DragOverlay>
            {activeDragThread && (
              <div className="rounded-[1.35rem] opacity-85">
                <ThreadCard thread={activeDragThread} onClick={() => navigate(`/threads/${activeDragThread.id}`)} />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      ) : null}
    </div>
  );
}
