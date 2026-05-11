import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Plus, Search, X, BookOpen } from 'lucide-react';
import { format } from 'date-fns';
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
import { useSessions } from '../hooks/useSessions';
import { SessionCard } from './SessionCard';
import { SortableSessionCard } from './SortableSessionCard';
import { SessionForm } from './SessionForm';
import { LoadingSpinner } from '@shared/components/LoadingSpinner';
import { EmptyState } from '@shared/components/EmptyState';
import { addEntity, updateSortOrders } from '@shared/db/operations';
import { useCampaign } from '@shared/db/CampaignContext';
import { toast } from 'sonner';
import { reorderEntities } from '@shared/utils/dnd';
import type { Session } from '../types';
import type { SessionFormValues } from './SessionForm';

export function SessionList() {
  const sessions = useSessions();
  const navigate = useNavigate();
  const { db } = useCampaign();
  const [query, setQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeDragSession, setActiveDragSession] = useState<Session | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const lowerQuery = query.trim().toLowerCase();
  const filtered = sessions?.filter((s) => {
    if (!lowerQuery) return true;
    const title = s.name || `Sesja ${s.data.number}`;
    return (
      title.toLowerCase().includes(lowerQuery) ||
      s.data.summary.toLowerCase().includes(lowerQuery) ||
      s.data.date.includes(lowerQuery) ||
      s.tags.some((t) => t.toLowerCase().includes(lowerQuery))
    );
  });

  const nextNumber = sessions && sessions.length > 0
    ? Math.max(...sessions.map((s) => s.data.number)) + 1
    : 1;

  async function handleCreate(values: SessionFormValues) {
    setSaving(true);
    try {
      const entity = await addEntity(db, {
        type: 'session',
        name: values.name || `Sesja ${values.number}`,
        description: values.description,
        tags: values.tags,
        data: {
          number: values.number,
          date: values.date,
          summary: values.summary,
          status: 'cleanup_completed',
          reportAvailable: false,
          plannedDurationMin: values.plannedDurationMin,
          scenes: values.scenes,
        },
      });
      toast.success(`Sesja ${values.number} utworzona`);
      setShowForm(false);
      navigate(`/sessions/${entity.id}`);
    } catch {
      toast.error('Nie udało się utworzyć sesji');
    } finally {
      setSaving(false);
    }
  }

  function handleDragStart(event: DragStartEvent) {
    const active = sessions?.find((s) => s.id === event.active.id);
    setActiveDragSession(active ?? null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveDragSession(null);
    const { active, over } = event;
    if (!over || active.id === over.id || !sessions) return;
    const reordered = reorderEntities(sessions, String(active.id), String(over.id));
    try {
      await updateSortOrders(db, reordered.map((s) => s.id));
      toast.success('Kolejność zaktualizowana');
    } catch {
      toast.error('Nie udało się zapisać kolejności');
    }
  }

  const isLoading = sessions === undefined;

  return (
    <div className="flex flex-col gap-6">
      <section className="app-panel-strong rounded-[2rem] px-6 py-7 lg:px-8 lg:py-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex items-center rounded-full border border-[rgba(33,71,102,0.16)] bg-[rgba(111,146,164,0.12)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-700">
              Archiwum kampanii
            </div>
            <h1 className="text-3xl font-semibold tracking-[-0.04em] text-primary-900 lg:text-[2.2rem]">
              Sesje
            </h1>
            <p className="mt-2 max-w-[62ch] text-sm leading-7 text-surface-700 lg:text-[0.98rem]">
              Chronologiczny zapis spotkań i najważniejszych wydarzeń kampanii.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="app-button-primary flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition-transform hover:-translate-y-0.5"
          >
            <Plus className="h-4 w-4" />
            Nowa sesja
          </button>
        </div>

        <div className="relative mt-6">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Szukaj sesji..."
            className="app-input w-full rounded-2xl py-3 pl-11 pr-10 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-surface-500 transition-colors hover:text-primary-700">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </section>

      {showForm && (
        <div className="app-panel rounded-[1.8rem] p-5 lg:p-6">
          <h2 className="mb-4 text-base font-semibold tracking-[-0.02em] text-primary-900">Nowa sesja</h2>
          <SessionForm
            defaultValues={{ number: nextNumber, date: format(new Date(), 'yyyy-MM-dd') }}
            onSubmit={handleCreate}
            isSaving={saving}
            onCancel={() => setShowForm(false)}
            submitLabel="Utwórz"
          />
        </div>
      )}

      {isLoading ? (
        <LoadingSpinner />
      ) : filtered && filtered.length > 0 ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <SortableContext items={filtered.map((s) => s.id)} strategy={rectSortingStrategy}>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((session) => (
                <SortableSessionCard key={session.id} session={session} />
              ))}
            </div>
          </SortableContext>
          <DragOverlay>
            {activeDragSession && (
              <div className="rounded-[1.35rem] opacity-85">
                <SessionCard session={activeDragSession} />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      ) : (
        <div className="app-panel rounded-[1.8rem] p-6">
          <EmptyState
            icon={<BookOpen className="h-10 w-10 text-primary-300" />}
            title={sessions && sessions.length === 0 ? 'Brak sesji' : 'Brak wyników'}
            description={sessions && sessions.length === 0 ? 'Zapisz swoją pierwszą sesję, by zacząć archiwizować kampanię.' : 'Żadna sesja nie pasuje do wyszukiwania.'}
            action={sessions && sessions.length === 0 ? <button onClick={() => setShowForm(true)} className="app-button-primary rounded-2xl px-4 py-3 text-sm font-medium">Nowa sesja</button> : undefined}
          />
        </div>
      )}
    </div>
  );
}
