import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useParams, useNavigate, useLocation } from 'react-router';
import { ArrowLeft, Pencil, Trash2, Plus } from 'lucide-react';
import { useLocationById } from '../hooks/useLocationById';
import { useLocationTree } from '../hooks/useLocationTree';
import { useContained } from '@shared/hooks/useContained';
import { LocationForm } from './LocationForm';
import { LocationTree } from './LocationTree';
import { RelationList } from '@shared/components/RelationList';
import { NotesList } from '@modules/notes/components/NotesList';
import { RelationPicker } from '@shared/components/RelationPicker';
import { ConfirmDialog } from '@shared/components/ConfirmDialog';
import { LoadingPage } from '@shared/components/LoadingSpinner';
import { EmptyState } from '@shared/components/EmptyState';
import { EntityDetailPortrait } from '@shared/components/EntityDetailPortrait';
import { DraggableNpcChip } from '@shared/components/DraggableNpcChip';
import { DroppableLocationZone } from '@shared/components/DroppableLocationZone';
import {
  updateEntity,
  deleteEntity,
  addEntity,
  assignContainment,
  removeContainment,
} from '@shared/db/operations';
import { deleteAsset } from '@shared/db/assets';
import { useCampaign } from '@shared/db/CampaignContext';
import { toast } from 'sonner';
import { formatDate } from '@shared/utils/date';
import { getEntityDetailPath } from '@shared/utils/entityTypeMeta';
import { createLocationData, LOCATION_TYPE_LABELS } from '../types';
import { DndContext } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import type { NpcDragData } from '@shared/components/DraggableNpcChip';
import { moveNpcToLocation } from '@modules/sessions/utils/liveSessionCommands';
import type { LocationFormValues } from './LocationForm';
import type { Entity } from '@shared/types/entity';

const DANGER_LABELS = [
  'Bezpieczna',
  'Spokojnie',
  'Umiarkowane',
  'Niebezpiecznie',
  'Śmiertelnie',
  'Apokaliptyczne',
];
const DANGER_COLORS = [
  'text-green-700 bg-green-100',
  'text-lime-700 bg-lime-100',
  'text-yellow-700 bg-yellow-100',
  'text-orange-700 bg-orange-100',
  'text-red-700 bg-red-100',
  'text-purple-700 bg-purple-100',
];

export function LocationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const locationState = useLocation();
  const { db } = useCampaign();
  const { location } = useLocationById(id);
  const returnToSessionLive = (locationState.state as { returnToSessionLive?: string } | null)
    ?.returnToSessionLive;
  const backPath = returnToSessionLive ? `/sessions/${returnToSessionLive}/live` : '/locations';
  const { tree, children: descendantLocations } = useLocationTree(id);
  const contained = useContained(id);
  const currentParentLocationId = useLiveQuery(async () => {
    if (!id) return undefined;
    const relation = await db.relations
      .where('targetId')
      .equals(id)
      .filter((candidate) => candidate.type === 'contains')
      .first();
    return relation?.sourceId;
  }, [db, id]);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRelationPicker, setShowRelationPicker] = useState(false);
  const [addChildToId, setAddChildToId] = useState<string | null>(null);
  const [savingChild, setSavingChild] = useState(false);

  if (!id) return null;
  if (location === undefined) return <LoadingPage />;
  if (location === null) {
    return (
      <EmptyState
        title="Lokacja nie istnieje"
        description="Nie znaleziono lokacji o podanym ID."
        action={
          <button
            type="button"
            onClick={() => navigate('/locations')}
            className="app-button-primary rounded-full px-4 py-2 text-sm font-medium"
          >
            Wróć do lokacji
          </button>
        }
      />
    );
  }

  const locationId = location.id;
  const locationIsDraft = location.data.isDraft;
  const { locationType, danger, senses } = location.data;
  const descendantIds = descendantLocations.map((location) => location.id);

  async function handleEdit(values: LocationFormValues) {
    setSaving(true);
    try {
      if (values.parentLocationId) {
        await assignContainment(db, { sourceId: values.parentLocationId, targetId: locationId });
      } else {
        await removeContainment(db, locationId);
      }
      const previousImageId = location!.data.imageId ?? null;
      const nextImageId = values.imageId ?? null;
      await updateEntity(db, locationId, {
        name: values.name,
        description: values.description,
        tags: values.tags,
        data: createLocationData({
          locationType: values.locationType,
          danger: values.danger,
          senses: { see: values.see, hear: values.hear, smell: values.smell, feel: values.feel },
          isDraft: locationIsDraft,
          imageId: nextImageId,
          imageAlt: values.imageAlt ?? '',
        }),
      });
      if (previousImageId && previousImageId !== nextImageId) {
        await deleteAsset(db, previousImageId).catch(() => undefined);
      }
      toast.success('Lokacja zaktualizowana');
      setEditing(false);
    } catch {
      toast.error('Nie udało się zapisać zmian');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    try {
      await deleteEntity(db, location!.id);
      toast.success(`Lokacja „${location!.name}" usunięta`);
      navigate('/locations');
    } catch {
      toast.error('Nie udało się usunąć lokacji');
    }
  }

  async function handleAddChild(parentId: string, values: LocationFormValues) {
    setSavingChild(true);
    try {
      const entity = await addEntity(db, {
        type: 'location',
        name: values.name,
        description: values.description,
        tags: values.tags,
        data: createLocationData({
          locationType: values.locationType,
          danger: values.danger,
          senses: { see: values.see, hear: values.hear, smell: values.smell, feel: values.feel },
          imageId: values.imageId ?? null,
          imageAlt: values.imageAlt ?? '',
        }),
      });
      await assignContainment(db, { sourceId: parentId, targetId: entity.id });
      toast.success(`Podlokacja „${values.name}" utworzona`);
      setAddChildToId(null);
      navigate(`/locations/${entity.id}`);
    } catch {
      toast.error('Nie udało się utworzyć podlokacji');
    } finally {
      setSavingChild(false);
    }
  }

  function handleNavigateToEntity(entity: Entity) {
    const detailPath = getEntityDetailPath(entity.type, entity.id);
    if (detailPath) {
      navigate(detailPath);
    }
  }

  async function handleNpcDrop(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const dragData = active.data.current as NpcDragData | undefined;
    if (dragData?.type !== 'npc') return;

    const toLocationId = (over.data.current as { locationId?: string } | undefined)?.locationId;
    if (!toLocationId || toLocationId === dragData.fromLocationId) return;

    const { npcId, npcName, fromLocationId } = dragData;
    try {
      await moveNpcToLocation(db, { npcId, toLocationId, fromLocationId });
      const toLocation = await db.entities.get(toLocationId);
      toast.success(`${npcName} przeniesiony do ${toLocation?.name ?? 'lokacji'}`);
    } catch {
      toast.error('Nie udało się przenieść postaci');
    }
  }

  // Group contained entities by type
  const containedNpcs = contained.filter((e) => e.type === 'npc');
  const containedItems = contained.filter((e) => e.type === 'item');
  const containedThreats = contained.filter((e) => e.type === 'threat');

  return (
    <div className="mx-auto max-w-5xl p-6">
      {/* Back */}
      <button
        type="button"
        onClick={() => navigate(backPath)}
        className="text-surface-500 hover:text-primary-700 mb-4 flex items-center gap-1.5 text-sm"
      >
        <ArrowLeft className="h-4 w-4" />
        {returnToSessionLive ? 'Sesja na żywo' : 'Lokacje'}
      </button>

      {editing ? (
        <div className="app-panel rounded-[1.75rem] p-5 shadow-[0_20px_40px_rgba(18,45,66,0.08)] lg:p-6">
          <h2 className="text-surface-900 mb-4 text-base font-semibold">Edytuj lokację</h2>
          <LocationForm
            key={`${location.id}:${currentParentLocationId ?? 'root'}`}
            defaultValues={{
              name: location.name,
              locationType: location.data.locationType,
              danger: location.data.danger,
              see: location.data.senses.see,
              hear: location.data.senses.hear,
              smell: location.data.senses.smell,
              feel: location.data.senses.feel,
              parentLocationId: currentParentLocationId,
              description: location.description ?? '',
              tags: location.tags,
              imageId: location.data.imageId ?? null,
              imageAlt: location.data.imageAlt ?? '',
            }}
            excludeId={location.id}
            excludeIds={descendantIds}
            onSubmit={handleEdit}
            onCancel={() => setEditing(false)}
            isSaving={saving}
            submitLabel="Zapisz zmiany"
          />
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="app-panel-strong mb-6 flex flex-col gap-5 rounded-[1.9rem] border border-white/40 px-6 py-6 shadow-[0_28px_60px_rgba(18,45,66,0.12)] lg:flex-row lg:items-start lg:justify-between lg:px-7">
            <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start">
              {location.data.imageId && (
                <EntityDetailPortrait
                  imageId={location.data.imageId}
                  alt={location.data.imageAlt ?? location.name}
                  size="lg"
                />
              )}
              <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-surface-900 text-3xl font-semibold tracking-[-0.03em]">
                  {location.name}
                </h1>
                <span className="app-pill-muted rounded-full px-2.5 py-1 text-xs font-medium">
                  {LOCATION_TYPE_LABELS[locationType]}
                </span>
                {danger > 0 && (
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${DANGER_COLORS[danger] ?? ''}`}
                  >
                    ⚠ {DANGER_LABELS[danger] ?? `Danger ${danger}`}
                  </span>
                )}
              </div>
              <p className="text-surface-400 mt-1 text-xs">
                Utworzona {formatDate(location.createdAt)} · Edytowana{' '}
                {formatDate(location.updatedAt)}
              </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEditing(true)}
                aria-label="Edytuj"
                className="app-button-secondary inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium"
              >
                <Pencil className="h-4 w-4" />
                Edytuj
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                aria-label="Usuń"
                className="app-button-danger inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium"
              >
                <Trash2 className="h-4 w-4" />
                Usuń
              </button>
            </div>
          </div>

          {/* Senses */}
          {(senses.see || senses.hear || senses.smell || senses.feel) && (
            <div className="app-panel mb-6 grid grid-cols-2 gap-4 rounded-[1.6rem] p-5 shadow-[0_16px_32px_rgba(18,45,66,0.08)] lg:p-6">
              {senses.see && (
                <div>
                  <p className="text-surface-400 mb-0.5 text-xs font-medium tracking-wide uppercase">
                    Widzisz
                  </p>
                  <p className="text-surface-700 text-sm">{senses.see}</p>
                </div>
              )}
              {senses.hear && (
                <div>
                  <p className="text-surface-400 mb-0.5 text-xs font-medium tracking-wide uppercase">
                    Słyszysz
                  </p>
                  <p className="text-surface-700 text-sm">{senses.hear}</p>
                </div>
              )}
              {senses.smell && (
                <div>
                  <p className="text-surface-400 mb-0.5 text-xs font-medium tracking-wide uppercase">
                    Czujesz (zapach)
                  </p>
                  <p className="text-surface-700 text-sm">{senses.smell}</p>
                </div>
              )}
              {senses.feel && (
                <div>
                  <p className="text-surface-400 mb-0.5 text-xs font-medium tracking-wide uppercase">
                    Atmosfera
                  </p>
                  <p className="text-surface-700 text-sm">{senses.feel}</p>
                </div>
              )}
            </div>
          )}

          {/* Tags */}
          {location.tags.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-1.5">
              {location.tags.map((tag) => (
                <span
                  key={tag}
                  className="app-pill-muted rounded-full px-2.5 py-1 text-xs font-medium"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Description */}
          {location.description && (
            <section className="app-panel mb-6 rounded-[1.6rem] p-5 shadow-[0_16px_32px_rgba(18,45,66,0.08)] lg:p-6">
              <h2 className="text-surface-500 mb-3 text-sm font-semibold tracking-wide uppercase">
                Opis
              </h2>
              <div
                className="prose prose-sm text-surface-700 max-w-none"
                dangerouslySetInnerHTML={{ __html: location.description }}
              />
            </section>
          )}

          {/* Sub-location tree */}
          <section className="mb-6">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-surface-800 text-sm font-semibold">Podlokacje</h2>
              <button
                type="button"
                onClick={() => setAddChildToId(id)}
                className="app-button-secondary flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium"
              >
                <Plus className="h-3.5 w-3.5" />
                Dodaj
              </button>
            </div>

            {addChildToId === id && (
              <div className="app-panel mb-3 rounded-[1.4rem] p-4 shadow-[0_16px_30px_rgba(18,45,66,0.08)]">
                <h3 className="text-surface-900 mb-3 text-sm font-semibold">Nowa podlokacja</h3>
                <LocationForm
                  onSubmit={(v) => handleAddChild(id, v)}
                  onCancel={() => setAddChildToId(null)}
                  isSaving={savingChild}
                  excludeId={id}
                  lockedParentId={id}
                />
              </div>
            )}

            {tree.length === 0 && !addChildToId && (
              <p className="text-surface-400 text-sm">Brak podlokacji</p>
            )}
            <LocationTree
              nodes={tree}
              onNavigate={(lid) => navigate(`/locations/${lid}`)}
              onAddChild={(parentId) => setAddChildToId(parentId)}
            />
          </section>

          {/* Contained entities */}
          {(containedNpcs.length > 0 ||
            containedItems.length > 0 ||
            containedThreats.length > 0) && (
            <section className="mb-6 flex flex-col gap-4">
              {containedNpcs.length > 0 && (
                <DndContext onDragEnd={handleNpcDrop}>
                  <DroppableLocationZone locationId={location.id}>
                    <h2 className="text-surface-800 mb-2 text-sm font-semibold">
                      Postacie w tej lokacji
                    </h2>
                    <ul className="flex flex-col gap-1">
                      {containedNpcs.map((e) => (
                        <li key={e.id}>
                          <DraggableNpcChip
                            npcId={e.id}
                            npcName={e.name}
                            fromLocationId={location.id}
                          >
                            <button
                              type="button"
                              onClick={() => navigate(`/npcs/${e.id}`)}
                              className="app-input-shell text-surface-700 hover:border-primary-300 w-full rounded-[1.1rem] px-3 py-2.5 text-left text-sm transition-colors hover:bg-[rgba(229,231,223,0.98)]"
                            >
                              {e.name}
                            </button>
                          </DraggableNpcChip>
                        </li>
                      ))}
                    </ul>
                  </DroppableLocationZone>
                </DndContext>
              )}
              {containedItems.length > 0 && (
                <div>
                  <h2 className="text-surface-800 mb-2 text-sm font-semibold">Przedmioty</h2>
                  <ul className="flex flex-col gap-1">
                    {containedItems.map((e) => (
                      <li key={e.id}>
                        <button
                          type="button"
                          onClick={() => navigate(`/items/${e.id}`)}
                          className="app-input-shell text-surface-700 hover:border-primary-300 w-full rounded-[1.1rem] px-3 py-2.5 text-left text-sm transition-colors hover:bg-[rgba(229,231,223,0.98)]"
                        >
                          {e.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {containedThreats.length > 0 && (
                <div>
                  <h2 className="text-surface-800 mb-2 text-sm font-semibold">Zagrożenia</h2>
                  <ul className="flex flex-col gap-1">
                    {containedThreats.map((e) => (
                      <li key={e.id}>
                        <button
                          type="button"
                          onClick={() => navigate(`/fronts/${e.id}`)}
                          className="app-input-shell text-surface-700 hover:border-primary-300 w-full rounded-[1.1rem] px-3 py-2.5 text-left text-sm transition-colors hover:bg-[rgba(229,231,223,0.98)]"
                        >
                          {e.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}

          {/* Relations */}
          <section className="mb-6">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-surface-800 text-sm font-semibold">Relacje</h2>
              <button
                type="button"
                onClick={() => setShowRelationPicker(true)}
                className="app-button-secondary flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium"
              >
                <Plus className="h-3.5 w-3.5" />
                Dodaj
              </button>
            </div>
            <NotesList entityId={location.id} />
            <RelationList entityId={location.id} onNavigate={handleNavigateToEntity} />
          </section>
        </>
      )}

      <ConfirmDialog
        open={showDeleteConfirm}
        title="Usuń lokację"
        description={`Czy na pewno chcesz usunąć „${location.name}"?`}
        confirmLabel="Usuń"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      {showRelationPicker && (
        <RelationPicker
          sourceId={location.id}
          sourceType="location"
          onClose={() => setShowRelationPicker(false)}
        />
      )}
    </div>
  );
}
