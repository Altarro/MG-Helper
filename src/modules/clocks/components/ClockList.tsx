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

type Filter = 'all' | 'active' | 'completed';

export function ClockList() {
  const clocks = useClocks();
  const navigate = useNavigate();
  const { db } = useCampaign();
  const [filter, setFilter] = useState<Filter>('all');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<ClockType | null>(null);

  const filtered = clocks?.filter((c) => {
    if (filter === 'active') return c.data.filled < c.data.segments && c.data.isActive !== false;
    if (filter === 'completed') return c.data.filled >= c.data.segments;
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
        data: { segments: values.segments, filled: 0, tickLabels: [], isActive: true },
      });
      toast.success(`Zegar „${values.name}" utworzony`);
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
      toast.success(`Zegar „${clock.name}" usunięty`);
    } catch {
      toast.error('Nie udało się usunąć zegara');
    } finally {
      setToDelete(null);
    }
  }

  const FILTERS: { id: Filter; label: string }[] = [
    { id: 'all', label: 'Wszystkie' },
    { id: 'active', label: 'Aktywne' },
    { id: 'completed', label: 'Ukończone' },
  ];

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-surface-900">Zegary</h1>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          <Plus className="h-4 w-4" />
          Nowy zegar
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-surface-900">Nowy zegar</h2>
          <ClockForm
            onSubmit={handleCreate}
            onCancel={() => setShowForm(false)}
            isSaving={saving}
          />
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 rounded-lg bg-surface-100 p-1 w-fit">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              filter === f.id
                ? 'bg-white text-surface-900 shadow-sm'
                : 'text-surface-500 hover:text-surface-700'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      {clocks === undefined && (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      )}

      {clocks !== undefined && filtered!.length === 0 && (
        <EmptyState
          icon={<Clock className="h-8 w-8" />}
          title="Brak zegarów"
          description={
            filter === 'all'
              ? 'Utwórz pierwszy zegar klikając „Nowy zegar".'
              : `Brak ${filter === 'active' ? 'aktywnych' : 'ukończonych'} zegarów.`
          }
          action={
            filter === 'all' ? (
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
              >
                Nowy zegar
              </button>
            ) : undefined
          }
        />
      )}

      {filtered && filtered.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((clock) => (
            <ClockCard
              key={clock.id}
              clock={clock}
              onClick={() => navigate(`/clocks/${clock.id}`)}
            />
          ))}
        </div>
      )}

      {/* Delete confirm */}
      <ConfirmDialog
        open={toDelete !== null}
        title="Usuń zegar"
        description={`Czy na pewno chcesz usunąć zegar „${toDelete?.name ?? ''}"? Tej operacji nie można cofnąć.`}
        confirmLabel="Usuń"
        destructive
        onConfirm={() => toDelete && handleDelete(toDelete)}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
