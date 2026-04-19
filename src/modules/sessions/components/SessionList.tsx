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

  // Next session number suggestion
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
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-surface-900">Sesje</h1>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          <Plus className="h-4 w-4" />
          Nowa sesja
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-surface-900">Nowa sesja</h2>
          <SessionForm
            defaultValues={{
              number: nextNumber,
              date: format(new Date(), 'yyyy-MM-dd'),
            }}
            onSubmit={handleCreate}
            isSaving={saving}
            onCancel={() => setShowForm(false)}
            submitLabel="Utwórz"
          />
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Szukaj sesji…"
          className="w-full rounded-md border border-surface-300 bg-white py-2 pl-9 pr-8 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
        {query && (
          <button onClick={() => setQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2">
            <X className="h-4 w-4 text-surface-400" />
          </button>
        )}
      </div>

      {/* List */}
      {isLoading ? (
        <LoadingSpinner />
      ) : filtered && filtered.length > 0 ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={filtered.map((s) => s.id)} strategy={rectSortingStrategy}>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((session) => (
                <SortableSessionCard key={session.id} session={session} />
              ))}
            </div>
          </SortableContext>
          <DragOverlay>
            {activeDragSession && (
              <div className="opacity-80 shadow-xl rounded-lg">
                <SessionCard session={activeDragSession} />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      ) : sessions && sessions.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="h-10 w-10 text-surface-300" />}
          title="Brak sesji"
          description="Zapisz swoją pierwszą sesję, by zacząć archiwizować kampanię."
          action={
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
            >
              <Plus className="h-4 w-4" /> Nowa sesja
            </button>
          }
        />
      ) : (
        <EmptyState
          title="Brak wyników"
          description="Żadna sesja nie pasuje do wyszukiwania."
        />
      )}
    </div>
  );
}
