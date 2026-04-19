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
import { DraggableNpcChip } from '@shared/components/DraggableNpcChip';
import { DroppableLocationZone } from '@shared/components/DroppableLocationZone';
import {
  updateEntity,
  deleteEntity,
  addEntity,
  assignContainment,
  removeContainment,
} from '@shared/db/operations';
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

const DANGER_LABELS = ['Bezpieczna', 'Spokojnie', 'Umiarkowane', 'Niebezpiecznie', 'Śmiertelnie', 'Apokaliptyczne'];
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
  const returnToSessionLive = (locationState.state as { returnToSessionLive?: string } | null)?.returnToSessionLive;
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
            className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
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
      await updateEntity(db, locationId, {
        name: values.name,
        description: values.description,
        tags: values.tags,
        data: createLocationData({
          locationType: values.locationType,
          danger: values.danger,
          senses: { see: values.see, hear: values.hear, smell: values.smell, feel: values.feel },
          isDraft: locationIsDraft,
        }),
      });
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
    <div className="mx-auto max-w-2xl p-6">
      {/* Back */}
      <button
        type="button"
        onClick={() => navigate(backPath)}
        className="mb-4 flex items-center gap-1.5 text-sm text-surface-500 hover:text-surface-800"
      >
        <ArrowLeft className="h-4 w-4" />
        {returnToSessionLive ? 'Sesja na żywo' : 'Lokacje'}
      </button>

      {editing ? (
        <div className="rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-surface-900">Edytuj lokację</h2>
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
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold text-surface-900">{location.name}</h1>
                <span className="rounded-full bg-surface-100 px-2.5 py-1 text-xs text-surface-600">
                  {LOCATION_TYPE_LABELS[locationType]}
                </span>
                {danger > 0 && (
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${DANGER_COLORS[danger] ?? ''}`}>
                    ⚠ {DANGER_LABELS[danger] ?? `Danger ${danger}`}
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-surface-400">
                Utworzona {formatDate(location.createdAt)} · Edytowana {formatDate(location.updatedAt)}
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

          {/* Senses */}
          {(senses.see || senses.hear || senses.smell || senses.feel) && (
            <div className="mb-6 grid grid-cols-2 gap-3 rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
              {senses.see && (
                <div>
                  <p className="mb-0.5 text-xs font-medium uppercase tracking-wide text-surface-400">Widzisz</p>
                  <p className="text-sm text-surface-700">{senses.see}</p>
                </div>
              )}
              {senses.hear && (
                <div>
                  <p className="mb-0.5 text-xs font-medium uppercase tracking-wide text-surface-400">Słyszysz</p>
                  <p className="text-sm text-surface-700">{senses.hear}</p>
                </div>
              )}
              {senses.smell && (
                <div>
                  <p className="mb-0.5 text-xs font-medium uppercase tracking-wide text-surface-400">Czujesz (zapach)</p>
                  <p className="text-sm text-surface-700">{senses.smell}</p>
                </div>
              )}
              {senses.feel && (
                <div>
                  <p className="mb-0.5 text-xs font-medium uppercase tracking-wide text-surface-400">Atmosfera</p>
                  <p className="text-sm text-surface-700">{senses.feel}</p>
                </div>
              )}
            </div>
          )}

          {/* Tags */}
          {location.tags.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-1.5">
              {location.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-surface-100 px-2.5 py-1 text-xs text-surface-600">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Description */}
          {location.description && (
            <div
              className="prose prose-sm mb-6 max-w-none text-surface-700"
              dangerouslySetInnerHTML={{ __html: location.description }}
            />
          )}

          {/* Sub-location tree */}
          <section className="mb-6">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-surface-800">Podlokacje</h2>
              <button
                type="button"
                onClick={() => setAddChildToId(id)}
                className="flex items-center gap-1 rounded-md border border-surface-200 px-2.5 py-1 text-xs text-surface-600 hover:bg-surface-50"
              >
                <Plus className="h-3.5 w-3.5" />
                Dodaj
              </button>
            </div>

            {addChildToId === id && (
              <div className="mb-3 rounded-xl border border-surface-200 bg-white p-4 shadow-sm">
                <h3 className="mb-3 text-sm font-semibold text-surface-900">Nowa podlokacja</h3>
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
              <p className="text-sm text-surface-400">Brak podlokacji</p>
            )}
            <LocationTree
              nodes={tree}
              onNavigate={(lid) => navigate(`/locations/${lid}`)}
              onAddChild={(parentId) => setAddChildToId(parentId)}
            />
          </section>

          {/* Contained entities */}
          {(containedNpcs.length > 0 || containedItems.length > 0 || containedThreats.length > 0) && (
            <section className="mb-6 flex flex-col gap-4">
              {containedNpcs.length > 0 && (
                <DndContext onDragEnd={handleNpcDrop}>
                  <DroppableLocationZone locationId={location.id}>
                    <h2 className="mb-2 text-sm font-semibold text-surface-800">Postacie w tej lokacji</h2>
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
                              className="w-full rounded-md px-3 py-2 text-left text-sm text-surface-700 hover:bg-surface-50"
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
                  <h2 className="mb-2 text-sm font-semibold text-surface-800">Przedmioty</h2>
                  <ul className="flex flex-col gap-1">
                    {containedItems.map((e) => (
                      <li key={e.id}>
                        <button
                          type="button"
                          onClick={() => navigate(`/items/${e.id}`)}
                          className="w-full rounded-md px-3 py-2 text-left text-sm text-surface-700 hover:bg-surface-50"
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
                  <h2 className="mb-2 text-sm font-semibold text-surface-800">Zagrożenia</h2>
                  <ul className="flex flex-col gap-1">
                    {containedThreats.map((e) => (
                      <li key={e.id}>
                        <button
                          type="button"
                          onClick={() => navigate(`/fronts/${e.id}`)}
                          className="w-full rounded-md px-3 py-2 text-left text-sm text-surface-700 hover:bg-surface-50"
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
