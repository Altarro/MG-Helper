import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Plus,
  Radio,
  Search,
  X,
  type LucideIcon,
} from 'lucide-react';
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
import { getSessionLifecycleStatus, type Session } from '../types';
import type { SessionFormValues } from './SessionForm';

function SessionStat({
  icon: Icon,
  label,
  value,
  tone = 'primary',
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  tone?: 'primary' | 'warning' | 'danger' | 'success';
}) {
  const toneClass = {
    primary: 'bg-[rgba(111,146,164,0.14)] text-primary-800',
    warning: 'bg-[rgba(242,196,88,0.18)] text-[#8b5b0c]',
    danger: 'bg-[rgba(176,108,103,0.12)] text-danger-700',
    success: 'bg-[rgba(106,143,135,0.14)] text-success-600',
  }[tone];

  return (
    <div className="rounded-2xl border border-[rgba(86,93,94,0.1)] bg-[rgba(223,225,218,0.55)] p-3">
      <div className={`mb-3 flex h-8 w-8 items-center justify-center rounded-xl ${toneClass}`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-surface-900 text-2xl leading-none font-semibold tracking-[-0.04em]">
        {value}
      </p>
      <p className="text-surface-500 mt-1 text-[11px] font-semibold tracking-wide uppercase">
        {label}
      </p>
    </div>
  );
}

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

  const nextNumber =
    sessions && sessions.length > 0 ? Math.max(...sessions.map((s) => s.data.number)) + 1 : 1;
  const sessionStats = useMemo(() => {
    const list = sessions ?? [];
    return {
      total: list.length,
      live: list.filter((session) => getSessionLifecycleStatus(session.data) === 'live').length,
      cleanup: list.filter(
        (session) => getSessionLifecycleStatus(session.data) === 'cleanup_pending',
      ).length,
      reports: list.filter((session) => session.data.reportAvailable === true).length,
    };
  }, [sessions]);

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
      await updateSortOrders(
        db,
        reordered.map((s) => s.id),
      );
      toast.success('Kolejność zaktualizowana');
    } catch {
      toast.error('Nie udało się zapisać kolejności');
    }
  }

  const isLoading = sessions === undefined;

  return (
    <div className="flex flex-col gap-6">
      <section className="app-panel-strong overflow-hidden rounded-[2.2rem] p-0">
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1.25fr)_minmax(22rem,0.75fr)]">
          <div className="relative px-6 py-7 lg:px-8 lg:py-8">
            <div className="absolute inset-y-0 left-0 w-1.5 bg-[linear-gradient(180deg,var(--color-primary-500)_0%,var(--color-warning-500)_100%)]" />
            <div className="text-primary-700 mb-4 inline-flex items-center rounded-full border border-[rgba(33,71,102,0.16)] bg-[rgba(111,146,164,0.12)] px-3 py-1 text-[11px] font-semibold tracking-[0.18em] uppercase">
              Archiwum kampanii
            </div>
            <h1 className="text-primary-900 max-w-[12ch] text-[2.7rem] leading-[0.95] font-semibold tracking-[-0.06em] lg:text-[4.2rem]">
              Sesje
            </h1>
            <p className="text-surface-700 mt-4 max-w-[68ch] text-sm leading-7 lg:text-[0.98rem]">
              Każde spotkanie jako czytelny rekord: plan, przebieg, cleanup i raport w jednym
              miejscu.
            </p>
            <div className="relative mt-6">
              <Search className="text-surface-500 pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Szukaj po tytule, dacie, streszczeniu albo tagach..."
                className="app-input focus:border-primary-500 focus:ring-primary-500/20 w-full rounded-2xl py-3 pr-10 pl-11 text-sm focus:ring-2 focus:outline-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="text-surface-500 hover:text-primary-700 absolute top-1/2 right-3 -translate-y-1/2 rounded-full p-1 transition-colors"
                  aria-label="Wyczyść wyszukiwanie"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          <div className="border-t border-[rgba(86,93,94,0.1)] bg-[rgba(255,250,240,0.11)] p-5 lg:border-t-0 lg:border-l lg:p-6">
            <div className="grid grid-cols-2 gap-3">
              <SessionStat icon={BookOpen} label="W archiwum" value={sessionStats.total} />
              <SessionStat icon={Radio} label="Live" value={sessionStats.live} tone="warning" />
              <SessionStat
                icon={ClipboardList}
                label="Cleanup"
                value={sessionStats.cleanup}
                tone="danger"
              />
              <SessionStat
                icon={CheckCircle2}
                label="Raporty"
                value={sessionStats.reports}
                tone="success"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="app-button-primary mt-5 flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition-transform hover:-translate-y-0.5"
            >
              <Plus className="h-4 w-4" />
              Nowa sesja
            </button>
          </div>
        </div>
      </section>

      {showForm && (
        <div className="app-panel rounded-[1.8rem] p-5 lg:p-6">
          <h2 className="text-primary-900 mb-4 text-base font-semibold tracking-[-0.02em]">
            Nowa sesja
          </h2>
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
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={filtered.map((s) => s.id)} strategy={rectSortingStrategy}>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
            icon={<BookOpen className="text-primary-300 h-10 w-10" />}
            title={sessions && sessions.length === 0 ? 'Brak sesji' : 'Brak wyników'}
            description={
              sessions && sessions.length === 0
                ? 'Zapisz swoją pierwszą sesję, by zacząć archiwizować kampanię.'
                : 'Żadna sesja nie pasuje do wyszukiwania.'
            }
            action={
              sessions && sessions.length === 0 ? (
                <button
                  onClick={() => setShowForm(true)}
                  className="app-button-primary rounded-2xl px-4 py-3 text-sm font-medium"
                >
                  Nowa sesja
                </button>
              ) : undefined
            }
          />
        </div>
      )}
    </div>
  );
}
