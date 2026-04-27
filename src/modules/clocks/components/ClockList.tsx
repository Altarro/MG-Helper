import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Plus } from 'lucide-react';
import { useClocks } from '../hooks/useClocks';
import { ClockCard } from './ClockCard';
import { ClockForm } from './ClockForm';
import { LoadingSpinner } from '@shared/components/LoadingSpinner';
import { EmptyState } from '@shared/components/EmptyState';
import { ConfirmDialog } from '@shared/components/ConfirmDialog';
import { addEntity, deleteEntity } from '@shared/db/operations';
import { useCampaign } from '@shared/db/CampaignContext';
import { toast } from 'sonner';
import { Clock } from 'lucide-react';
import type { ClockFormValues } from './ClockForm';
import type { Clock as ClockType } from '../types';

type StatusFilter = 'all' | 'active' | 'completed';
type KindFilter = 'all' | 'session' | 'free' | 'threat';

export function ClockList() {
  const clocks = useClocks();
  const navigate = useNavigate();
  const { db } = useCampaign();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [kindFilter, setKindFilter] = useState<KindFilter>('all');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<ClockType | null>(null);

  const filtered = clocks?.filter((c) => {
    const kind = c.data.kind ?? 'free';
    if (kindFilter !== 'all' && kind !== kindFilter) return false;
    if (statusFilter === 'active') return c.data.filled < c.data.segments && c.data.isActive !== false;
    if (statusFilter === 'completed') return c.data.filled >= c.data.segments;
    return true;
  });

  async function handleCreate(values: ClockFormValues) {
    setSaving(true);
    try {
      const entity = await addEntity(db, {
        type: 'clock',
        name: values.name,
        description: values.description,
        tags: values.tags,
        data: { kind: 'free', segments: values.segments, filled: 0, tickLabels: [], isActive: true },
      });
      toast.success(`Zegar "${values.name}" utworzony`);
      setShowForm(false);
      navigate(`/clocks/${entity.id}`);
    } catch {
      toast.error('Nie udało się utworzyć zegara');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(clock: ClockType) {
    try {
      await deleteEntity(db, clock.id);
      toast.success(`Zegar "${clock.name}" usunięty`);
    } catch {
      toast.error('Nie udało się usunąć zegara');
    } finally {
      setToDelete(null);
    }
  }

  const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
    { id: 'all', label: 'Wszystkie' },
    { id: 'active', label: 'Aktywne' },
    { id: 'completed', label: 'Ukończone' },
  ];
  const KIND_FILTERS: { id: KindFilter; label: string }[] = [
    { id: 'all', label: 'Wszystkie typy' },
    { id: 'session', label: 'Sesyjne' },
    { id: 'free', label: 'Wolne' },
    { id: 'threat', label: 'Zagrożeń' },
  ];

  return (
    <div className="flex flex-col gap-6">
      <section className="app-panel-strong rounded-[2rem] px-6 py-7 lg:px-8 lg:py-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex items-center rounded-full border border-[rgba(33,71,102,0.16)] bg-[rgba(111,146,164,0.12)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-700">
              Presja i tempo
            </div>
            <h1 className="text-3xl font-semibold tracking-[-0.04em] text-primary-900 lg:text-[2.2rem]">
              Zegary
            </h1>
            <p className="mt-2 max-w-[62ch] text-sm leading-7 text-surface-700 lg:text-[0.98rem]">
              Odliczania, liczniki i mechaniczne źródła napięcia w kampanii.
            </p>
          </div>

          <button type="button" onClick={() => setShowForm(true)} className="app-button-primary flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition-transform hover:-translate-y-0.5">
            <Plus className="h-4 w-4" />
            Nowy zegar
          </button>
        </div>

        <div className="mt-6 flex flex-wrap gap-2.5">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setStatusFilter(f.id)}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition-all ${statusFilter === f.id ? 'app-pill' : 'app-pill-muted hover:bg-[rgba(223,225,218,0.98)]'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2.5">
          {KIND_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setKindFilter(f.id)}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition-all ${kindFilter === f.id ? 'app-pill' : 'app-pill-muted hover:bg-[rgba(223,225,218,0.98)]'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </section>

      {showForm && (
        <div className="app-panel rounded-[1.8rem] p-5 lg:p-6">
          <h2 className="mb-4 text-base font-semibold tracking-[-0.02em] text-primary-900">Nowy zegar</h2>
          <ClockForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} isSaving={saving} />
        </div>
      )}

      {clocks === undefined ? (
        <LoadingSpinner />
      ) : filtered && filtered.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((clock) => (
            <ClockCard key={clock.id} clock={clock} onClick={() => navigate(`/clocks/${clock.id}`)} />
          ))}
        </div>
      ) : (
        <div className="app-panel rounded-[1.8rem] p-6">
          <EmptyState
            icon={<Clock className="h-8 w-8 text-primary-300" />}
            title="Brak zegarów"
            description={
              statusFilter === 'all' && kindFilter === 'all'
                ? 'Utwórz pierwszy zegar klikając „Nowy zegar”.'
                : 'Brak zegarów dla wybranych filtrów.'
            }
            action={
              statusFilter === 'all' && kindFilter === 'all'
                ? <button type="button" onClick={() => setShowForm(true)} className="app-button-primary rounded-2xl px-4 py-3 text-sm font-medium">Nowy zegar</button>
                : undefined
            }
          />
        </div>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title="Usuń zegar"
        description={`Czy na pewno chcesz usunąć zegar "${toDelete?.name ?? ''}"? Tej operacji nie można cofnąć.`}
        confirmLabel="Usuń"
        destructive
        onConfirm={() => toDelete && handleDelete(toDelete)}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
