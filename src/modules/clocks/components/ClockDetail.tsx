import { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router';
import { ArrowLeft, Pencil, Trash2, RotateCcw, Plus } from 'lucide-react';
import { useClockById } from '../hooks/useClockById';
import { ClockVisual } from './ClockVisual';
import { ClockForm } from './ClockForm';
import { RelationList } from '@shared/components/RelationList';
import { RelationPicker } from '@shared/components/RelationPicker';
import { ConfirmDialog } from '@shared/components/ConfirmDialog';
import { LoadingPage } from '@shared/components/LoadingSpinner';
import { EmptyState } from '@shared/components/EmptyState';
import { updateEntity, deleteEntity } from '@shared/db/operations';
import { useCampaign } from '@shared/db/CampaignContext';
import { toast } from 'sonner';
import { formatDate } from '@shared/utils/date';
import { getEntityDetailPath } from '@shared/utils/entityTypeMeta';
import type { ClockFormValues } from './ClockForm';
import type { Entity } from '@shared/types/entity';

export function ClockDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { db } = useCampaign();
  const { clock } = useClockById(id);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRelationPicker, setShowRelationPicker] = useState(false);
  const returnToSessionLive = typeof location.state === 'object'
    && location.state !== null
    && 'returnToSessionLive' in location.state
    && typeof (location.state as { returnToSessionLive?: unknown }).returnToSessionLive === 'string'
      ? (location.state as { returnToSessionLive: string }).returnToSessionLive
      : null;
  const backPath = returnToSessionLive ? `/sessions/${returnToSessionLive}/live` : '/clocks';
  const backLabel = returnToSessionLive ? 'Sesja na żywo' : 'Zegary';

  if (!id) return null;
  if (clock === undefined) return <LoadingPage />;
  if (clock === null || (clock as unknown) === undefined) {
    return (
      <EmptyState
        title="Zegar nie istnieje"
        description="Nie znaleziono zegara o podanym ID."
        action={
          <button
            type="button"
            onClick={() => navigate(backPath)}
            className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            {`Wróć do ${backLabel.toLowerCase()}`}
          </button>
        }
      />
    );
  }

  const { segments, filled, tickLabels, isActive } = clock.data;
  const completed = filled >= segments;
  const dead = isActive === false;

  async function handleTick(newFilled: number) {
    try {
      const clampedFilled = Math.max(0, Math.min(newFilled, segments));
      await updateEntity(db, clock!.id, {
        data: { ...clock!.data, filled: clampedFilled },
      });
      if (clampedFilled >= segments) {
        toast.success('Zegar ukończony!');
      } else {
        toast.success('Tick dodany');
      }
    } catch {
      toast.error('Nie udało się zaktualizować zegara');
    }
  }

  async function handleReset() {
    try {
      await updateEntity(db, clock!.id, { data: { ...clock!.data, filled: 0 } });
      toast.success('Zegar zresetowany');
    } catch {
      toast.error('Nie udało się zresetować zegara');
    }
  }

  async function handleToggleActive() {
    try {
      await updateEntity(db, clock!.id, { data: { ...clock!.data, isActive: !isActive } });
      toast.success(isActive ? 'Zegar oznaczony jako martwy' : 'Zegar reaktywowany');
    } catch {
      toast.error('Nie udało się zaktualizować zegara');
    }
  }

  async function handleEdit(values: ClockFormValues) {
    setSaving(true);
    try {
      await updateEntity(db, clock!.id, {
        name: values.name,
        description: values.description,
        tags: values.tags,
        data: {
          ...clock!.data,
          segments: values.segments,
          tickLabels: values.tickLabels.map((t) => t.value),
          isActive: values.isActive,
        },
      });
      toast.success('Zegar zaktualizowany');
      setEditing(false);
    } catch {
      toast.error('Nie udało się zapisać zmian');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    try {
      await deleteEntity(db, clock!.id);
      toast.success(`Zegar „${clock!.name}" usunięty`);
      navigate(backPath);
    } catch {
      toast.error('Nie udało się usunąć zegara');
    }
  }

  function handleNavigateToEntity(entity: Entity) {
    const detailPath = getEntityDetailPath(entity.type, entity.id);
    if (detailPath) {
      navigate(detailPath, {
        state: returnToSessionLive ? { returnToSessionLive } : undefined,
      });
    }
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      {/* Back button */}
      <button
        type="button"
        onClick={() => navigate(backPath)}
        className="mb-4 flex items-center gap-1.5 text-sm text-surface-500 hover:text-surface-800"
      >
        <ArrowLeft className="h-4 w-4" />
        {backLabel}
      </button>

      {editing ? (
        <div className="rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-surface-900">Edytuj zegar</h2>
          <ClockForm
            defaultValues={{
              name: clock.name,
              segments: clock.data.segments,
              description: clock.description ?? '',
              tags: clock.tags,
              tickLabels: (clock.data.tickLabels ?? []).map((v) => ({ value: v })),
              isActive: clock.data.isActive ?? true,
            }}
            onSubmit={handleEdit}
            onCancel={() => setEditing(false)}
            isSaving={saving}
            submitLabel="Zapisz zmiany"
          />
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-surface-900">{clock.name}</h1>
                {completed && (
                  <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">
                    Ukończony
                  </span>
                )}
                {dead && (
                  <span className="rounded-full bg-surface-200 px-2.5 py-1 text-xs font-medium text-surface-500">
                    Martwy
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-surface-400">
                Utworzony {formatDate(clock.createdAt)} · Edytowany {formatDate(clock.updatedAt)}
              </p>
            </div>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setEditing(true)}
                aria-label="Edytuj"
                className="rounded-md border border-surface-200 p-2 text-surface-500 hover:bg-surface-50 hover:text-surface-800"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                aria-label="Usuń"
                className="rounded-md border border-surface-200 p-2 text-surface-500 hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Clock visual + controls */}
          <div className="mb-6 flex flex-col items-center gap-4 rounded-xl border border-surface-200 bg-white p-6 shadow-sm">
            <ClockVisual segments={segments} filled={filled} size={180} onTick={handleTick} />

            <p className="text-sm text-surface-600">
              <span className="text-2xl font-bold tabular-nums text-primary-700">{filled}</span>
              <span className="mx-1 text-surface-400">/</span>
              <span className="font-medium">{segments}</span>
              <span className="ml-1 text-surface-400">segmentów</span>
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                disabled={filled >= segments || dead}
                onClick={() => handleTick(filled + 1)}
                className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-40"
              >
                Tick +1
              </button>
              <button
                type="button"
                disabled={filled === 0 || dead}
                onClick={handleReset}
                className="flex items-center gap-1.5 rounded-md border border-surface-300 px-4 py-2 text-sm font-medium text-surface-700 hover:bg-surface-50 disabled:opacity-40"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </button>
              <button
                type="button"
                onClick={handleToggleActive}
                className={`rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
                  dead
                    ? 'border-primary-300 text-primary-700 hover:bg-primary-50'
                    : 'border-surface-300 text-surface-700 hover:bg-surface-50'
                }`}
              >
                {dead ? 'Reaktywuj' : 'Oznacz jako martwy'}
              </button>
            </div>
          </div>

          {/* Tick labels */}
          {tickLabels && tickLabels.length > 0 && (
            <div className="mb-6 rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold text-surface-800">Opisy tyknięć</h2>
              <ol className="flex flex-col gap-2">
                {tickLabels.map((label, i) => {
                  const isCurrent = i === filled - 1;
                  const isPast = i < filled - 1;
                  const isFuture = i >= filled;
                  return (
                    <li key={i} className="flex items-start gap-2.5">
                      <span
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                          isCurrent
                            ? 'bg-primary-600 text-white'
                            : isPast
                            ? 'bg-primary-200 text-primary-700'
                            : 'bg-surface-200 text-surface-500'
                        }`}
                      >
                        {i + 1}
                      </span>
                      <span
                        className={`text-sm ${
                          isCurrent
                            ? 'font-semibold text-primary-700'
                            : isPast
                            ? 'text-surface-500'
                            : isFuture
                            ? 'text-surface-400'
                            : ''
                        }`}
                      >
                        {label || <span className="italic text-surface-300">brak opisu</span>}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}

          {/* Tags */}
          {clock.tags.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-1.5">
              {clock.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-surface-100 px-2.5 py-1 text-xs text-surface-600">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Description */}
          {clock.description && (
            <div
              className="prose prose-sm mb-6 max-w-none text-surface-700"
              dangerouslySetInnerHTML={{ __html: clock.description }}
            />
          )}

          {/* Relations */}
          <section className="mb-6">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-surface-800">Relacje</h2>
              <button
                type="button"
                onClick={() => setShowRelationPicker(true)}
                className="flex items-center gap-1 rounded-md border border-surface-200 px-2.5 py-1 text-xs text-surface-600 hover:bg-surface-50"
              >
                <Plus className="h-3.5 w-3.5" />
                Dodaj
              </button>
            </div>
            <RelationList entityId={clock.id} onNavigate={handleNavigateToEntity} />
          </section>
        </>
      )}

      <ConfirmDialog
        open={showDeleteConfirm}
        title="Usuń zegar"
        description={`Czy na pewno chcesz usunąć zegar „${clock.name}"?`}
        confirmLabel="Usuń"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      {showRelationPicker && (
        <RelationPicker
          sourceId={clock.id}
          sourceType="clock"
          onClose={() => setShowRelationPicker(false)}
        />
      )}
    </div>
  );
}
