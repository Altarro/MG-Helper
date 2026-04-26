import { useState } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router';
import { ArrowLeft, Edit2, Trash2, X, Package, OctagonAlert } from 'lucide-react';
import { useItemById } from '../hooks/useItemById';
import { ItemForm } from './ItemForm';
import { LoadingSpinner } from '@shared/components/LoadingSpinner';
import { ConfirmDialog } from '@shared/components/ConfirmDialog';
import { EntityDetailPortrait } from '@shared/components/EntityDetailPortrait';
import { NotesList } from '@modules/notes/components/NotesList';
import { deleteEntity, updateEntity } from '@shared/db/operations';
import { deleteAsset } from '@shared/db/assets';
import { useCampaign } from '@shared/db/CampaignContext';
import { toast } from 'sonner';
import { ITEM_TYPE_LABELS } from '../types';
import { getItemLifecycleStatus } from '@shared/utils/entityData';
import { withLifecycleStatus } from '@shared/types/entityLifecycle';
import { recordEntityMutationInSession } from '@modules/sessions/utils/sessionSignals';
import type { ItemFormValues } from './ItemForm';

export function ItemDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { db } = useCampaign();
  const { item } = useItemById(id);

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmDestroy, setConfirmDestroy] = useState(false);
  const returnToSessionLive =
    typeof location.state === 'object' &&
    location.state !== null &&
    'returnToSessionLive' in location.state &&
    typeof (location.state as { returnToSessionLive?: unknown }).returnToSessionLive === 'string'
      ? (location.state as { returnToSessionLive: string }).returnToSessionLive
      : null;
  const backPath = returnToSessionLive ? `/sessions/${returnToSessionLive}/live` : '/items';
  const backLabel = returnToSessionLive ? 'Sesja na żywo' : 'Przedmioty';

  if (item === undefined) return <LoadingSpinner />;
  if (!item) {
    return (
      <div className="mx-auto flex max-w-5xl flex-col gap-4 p-6">
        <p className="text-surface-500">Przedmiot nie znaleziony.</p>
        <Link
          to="/items"
          className="text-surface-500 hover:text-primary-700 flex w-fit items-center gap-1.5 text-sm transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Przedmioty
        </Link>
      </div>
    );
  }

  async function handleUpdate(values: ItemFormValues) {
    setSaving(true);
    try {
      const previousImageId = item!.data.imageId ?? null;
      const nextImageId = values.imageId ?? null;
      await updateEntity(db, item!.id, {
        name: values.name,
        description: values.description,
        tags: values.tags,
        data: withLifecycleStatus(
          {
            itemType: values.itemType,
            properties: values.properties,
            imageId: nextImageId,
            imageAlt: values.imageAlt ?? '',
          },
          getItemLifecycleStatus({ data: item!.data }),
        ) as unknown as Record<string, unknown>,
      });
      if (previousImageId && previousImageId !== nextImageId) {
        await deleteAsset(db, previousImageId).catch(() => undefined);
      }
      toast.success('Przedmiot zaktualizowany');
      setIsEditing(false);
    } catch {
      toast.error('Nie udało się zapisać zmian');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    try {
      await deleteEntity(db, item!.id);
      toast.success(`Przedmiot „${item!.name}" usunięty`);
      navigate(backPath);
    } catch {
      toast.error('Nie udało się usunąć');
    }
  }

  async function applyItemDestroyed(nextDestroyed: boolean) {
    try {
      await updateEntity(db, item!.id, {
        data: withLifecycleStatus(item!.data, nextDestroyed ? 'completed' : 'active') as unknown as Record<string, unknown>,
      });
      if (returnToSessionLive) {
        await recordEntityMutationInSession(db, {
          sessionId: returnToSessionLive,
          entityType: 'item',
          entityId: item!.id,
          entityName: item!.name,
          changedFields: ['status'],
          source: 'item-detail/toggle-destroyed',
          extra: { status: nextDestroyed ? 'completed' : 'active' },
        });
      }
      toast.success(
        nextDestroyed
          ? 'Przedmiot oznaczony jako zniszczony lub zgubiony (karta zostaje w kampanii)'
          : 'Przedmiot przywrócony',
      );
      setConfirmDestroy(false);
    } catch {
      toast.error('Nie udało się zapisać stanu przedmiotu');
    }
  }

  const itemIsDestroyed = getItemLifecycleStatus({ data: item!.data }) === 'completed';

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-6">
      <Link
        to={backPath}
        className="text-surface-500 hover:text-primary-700 flex w-fit items-center gap-1.5 text-sm"
      >
        <ArrowLeft className="h-4 w-4" /> {backLabel}
      </Link>

      <div
        className={`app-panel-strong flex flex-col gap-5 rounded-[1.9rem] border border-white/40 px-6 py-6 shadow-[0_28px_60px_rgba(18,45,66,0.12)] lg:flex-row lg:items-start lg:justify-between lg:px-7 ${
          itemIsDestroyed ? 'opacity-90' : ''
        }`}
      >
        <div className="flex items-center gap-4">
          {!isEditing && item.data.imageId ? (
            <EntityDetailPortrait
              imageId={item.data.imageId}
              alt={item.data.imageAlt ?? item.name}
              size="lg"
            />
          ) : (
            <div className="app-danger-card rounded-[1.25rem] p-3 text-amber-700 shadow-[0_14px_28px_rgba(210,166,67,0.18)]">
              <Package className="h-5 w-5 shrink-0" />
            </div>
          )}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-surface-900 text-3xl font-semibold tracking-[-0.03em]">
                {item.name}
              </h1>
              {itemIsDestroyed && (
                <span className="inline-flex items-center gap-1 rounded-full border border-danger-300/60 bg-danger-50 px-2.5 py-1 text-xs font-semibold text-danger-800">
                  <OctagonAlert className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  Zniszczony / zgubiony
                </span>
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="app-danger-pill rounded-full px-3 py-1 text-xs font-semibold">
                {ITEM_TYPE_LABELS[item.data.itemType]}
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="app-button-secondary inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium"
          >
            {isEditing ? (
              <>
                <X className="h-3.5 w-3.5" /> Anuluj
              </>
            ) : (
              <>
                <Edit2 className="h-3.5 w-3.5" /> Edytuj
              </>
            )}
          </button>
          {!isEditing &&
            (itemIsDestroyed ? (
              <button
                type="button"
                onClick={() => void applyItemDestroyed(false)}
                className="app-button-secondary inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium"
              >
                Przywróć przedmiot
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDestroy(true)}
                className="app-button-secondary inline-flex items-center gap-1.5 rounded-full border border-danger-200 px-4 py-2 text-sm font-medium text-danger-800 hover:bg-danger-50"
              >
                <OctagonAlert className="h-4 w-4" />
                Zniszcz / zgub
              </button>
            ))}
          <button
            onClick={() => setConfirmDelete(true)}
            className="app-button-danger inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium"
          >
            <Trash2 className="h-3.5 w-3.5" /> Usuń
          </button>
        </div>
      </div>

      {isEditing && (
        <div className="app-panel rounded-[1.75rem] p-4 shadow-[0_20px_40px_rgba(18,45,66,0.08)] lg:p-6">
          <ItemForm
            defaultValues={{
              name: item.name,
              itemType: item.data.itemType,
              properties: item.data.properties,
              description: item.description,
              tags: item.tags,
              imageId: item.data.imageId ?? null,
              imageAlt: item.data.imageAlt ?? '',
            }}
            onSubmit={handleUpdate}
            isSaving={saving}
            onCancel={() => setIsEditing(false)}
          />
        </div>
      )}

      {!isEditing && item.data.properties.length > 0 && (
        <div className="app-panel rounded-[1.6rem] p-5 lg:p-6">
          <h2 className="text-surface-500 mb-3 text-sm font-semibold tracking-wide uppercase">
            Właściwości
          </h2>
          <div className="flex flex-wrap gap-2">
            {item.data.properties.map((p, i) => (
              <span key={i} className="app-pill-muted rounded-full px-3 py-1 text-sm font-medium">
                {p}
              </span>
            ))}
          </div>
        </div>
      )}

      {!isEditing && item.description && (
        <div className="app-panel rounded-[1.6rem] p-5 lg:p-6">
          <h2 className="text-surface-500 mb-3 text-sm font-semibold tracking-wide uppercase">
            Opis
          </h2>
          <div
            className="prose prose-sm text-surface-700 max-w-none"
            dangerouslySetInnerHTML={{ __html: item.description }}
          />
        </div>
      )}

      {!isEditing && item.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {item.tags.map((t) => (
            <span key={t} className="app-danger-pill rounded-full px-2.5 py-1 text-xs font-medium">
              {t}
            </span>
          ))}
        </div>
      )}

      <NotesList entityId={id!} />

      <ConfirmDialog
        open={confirmDelete}
        title="Usuń przedmiot"
        description={`Czy na pewno chcesz usunąć przedmiot „${item.name}"?`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />

      <ConfirmDialog
        open={confirmDestroy}
        title="Zniszcz lub zgub (bez usuwania)"
        description={`Przedmiot „${item.name}” zostanie oznaczony jako niedostępny fabularnie. Karta zostanie w kampanii.`}
        confirmLabel="Oznacz"
        destructive={false}
        onConfirm={() => void applyItemDestroyed(true)}
        onCancel={() => setConfirmDestroy(false)}
      />
    </div>
  );
}
