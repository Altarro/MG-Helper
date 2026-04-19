import { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router';
import { ArrowLeft, MapPin, Pencil, Trash2, Plus } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNpcById } from '../hooks/useNpcById';
import type { NpcLocationHistoryEvent } from '../types';
import { NpcForm } from './NpcForm';
import { RelationList } from '@shared/components/RelationList';
import { MarkdownExportButton } from '@shared/components/MarkdownExportButton';
import { NotesList } from '@modules/notes/components/NotesList';
import { RelationPicker } from '@shared/components/RelationPicker';
import { ConfirmDialog } from '@shared/components/ConfirmDialog';
import { LoadingPage } from '@shared/components/LoadingSpinner';
import { EmptyState } from '@shared/components/EmptyState';
import { ClockWidget } from '@modules/clocks/components/ClockWidget';
import { updateEntity, deleteEntity } from '@shared/db/operations';
import { useCampaign } from '@shared/db/CampaignContext';
import { isClock } from '@modules/clocks/types';
import { isDraftLocation, isLocation } from '@modules/locations/types';
import { LocationPickerModal } from '@modules/sessions/components/LocationPickerModal';
import { isSession } from '@modules/sessions/types';
import { getNpcLocationHistory } from '../locationHistory';
import { Modal } from '@shared/components/Modal';
import { toast } from 'sonner';
import { formatDate, formatDateTime } from '@shared/utils/date';
import { getSessionData } from '@shared/utils/entityData';
import { getEntityDetailPath } from '@shared/utils/entityTypeMeta';
import type { NpcFormValues } from './NpcForm';
import type { Entity } from '@shared/types/entity';
import { setNpcCurrentLocation } from '@modules/sessions/utils/liveSessionCommands';

function compareSessionsDesc(a: Entity & { type: 'session' }, b: Entity & { type: 'session' }): number {
  const aData = getSessionData(a);
  const bData = getSessionData(b);
  const byNumber = (bData.number ?? 0) - (aData.number ?? 0);
  if (byNumber !== 0) return byNumber;
  return (bData.date ?? '').localeCompare(aData.date ?? '');
}

function NpcLocationHistoryModal({
  entries,
  onClose,
  onNavigate,
}: {
  entries: NpcLocationHistoryEvent[];
  onClose: () => void;
  onNavigate: (path: string) => void;
}) {
  return (
    <Modal title="Historia lokacji NPC" size="md" onClose={onClose}>
      {entries.length === 0 ? (
        <p className="text-sm text-surface-500">Brak zapisanej historii lokacji.</p>
      ) : (
        <div className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto">
          {entries.map((entry) => (
            <div key={entry.id} className="rounded-lg border border-surface-200 bg-surface-50 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-surface-400">
                    {formatDateTime(entry.data.timestamp)}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-surface-900">
                    {entry.data.locationName}
                  </p>
                  {entry.data.sessionName && (
                    <p className="mt-1 text-xs text-surface-500">
                      Podczas: {entry.data.sessionName}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => onNavigate(`/locations/${entry.data.locationId}`)}
                    className="rounded-md border border-surface-300 px-2.5 py-1 text-xs text-surface-700 hover:bg-white"
                  >
                    Lokacja
                  </button>
                  {entry.data.sessionId && (
                    <button
                      type="button"
                      onClick={() => onNavigate(`/sessions/${entry.data.sessionId}`)}
                      className="rounded-md border border-surface-300 px-2.5 py-1 text-xs text-surface-700 hover:bg-white"
                    >
                      Sesja
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

export function NpcDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { db } = useCampaign();
  const { npc } = useNpcById(id);
  const returnToSessionLive = (location.state as { returnToSessionLive?: string } | null)?.returnToSessionLive;
  const backPath = returnToSessionLive ? `/sessions/${returnToSessionLive}/live` : '/npcs';

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRelationPicker, setShowRelationPicker] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const currentLocationRelation = useLiveQuery(async () => {
    if (!id) return undefined;
    return db.relations
      .where('targetId')
      .equals(id)
      .filter((relation) => relation.type === 'contains')
      .first();
  }, [db, id]);

  const currentLocation = useLiveQuery(async () => {
    if (!currentLocationRelation) return null;
    const entity = await db.entities.get(currentLocationRelation.sourceId);
    return entity && isLocation(entity) ? entity : null;
  }, [db, currentLocationRelation?.sourceId]);

  const sessionAppearances = useLiveQuery(async () => {
    if (!id) return [];
    const relations = await db.relations
      .where('sourceId')
      .equals(id)
      .filter((relation) => relation.type === 'appears_in')
      .toArray();
    if (relations.length === 0) return [];
    const entities = await db.entities
      .where('id')
      .anyOf(relations.map((relation) => relation.targetId))
      .toArray();
    return entities.filter(isSession).sort(compareSessionsDesc);
  }, [db, id]) ?? [];

  const locationHistory = useLiveQuery(async () => {
    if (!id) return [];
    return getNpcLocationHistory(db, id);
  }, [db, id]) ?? [];
  const currentNamedLocationId =
    currentLocation && !isDraftLocation(currentLocation) ? currentLocation.id : null;
  const recentLocationHistory = locationHistory.slice(0, 4);

  // Load related clocks for inline widgets
  const relatedClocks = useLiveQuery(async () => {
    if (!id) return [];
    const [asSource, asTarget] = await Promise.all([
      db.relations.where('sourceId').equals(id).toArray(),
      db.relations.where('targetId').equals(id).toArray(),
    ]);
    const clockIds = [...asSource, ...asTarget]
      .filter((r) => r.type === 'related_to' || r.type === 'tracks')
      .map((r) => (r.sourceId === id ? r.targetId : r.sourceId));

    if (!clockIds.length) return [];
    const entities = await Promise.all(clockIds.map((cid) => db.entities.get(cid)));
    return entities.filter((e): e is NonNullable<typeof e> => !!e && isClock(e)).map((e) => isClock(e) ? e : null).filter(Boolean);
  }, [db, id]);

  if (!id) return null;
  if (npc === undefined) return <LoadingPage />;
  if (npc === null) {
    return (
      <EmptyState
        title="Postać nie istnieje"
        description="Nie znaleziono postaci o podanym ID."
        action={
          <button
            type="button"
            onClick={() => navigate('/npcs')}
            className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            Wróć do listy Postaci
          </button>
        }
      />
    );
  }

  async function handleEdit(values: NpcFormValues) {
    setSaving(true);
    try {
      await updateEntity(db, npc!.id, {
        name: values.name,
        description: values.description,
        tags: values.tags,
        data: {
          instinct: values.instinct,
          motivation: values.motivation,
          appearance: values.appearance,
          playStyle: values.playStyle,
          isPC: values.isPC ?? false,
          playerName: values.playerName ?? '',
        },
      });
      toast.success('Postać zaktualizowana');
      setEditing(false);
    } catch {
      toast.error('Nie udało się zapisać zmian');
    } finally {
      setSaving(false);
    }
  }

  async function handleLocationSelect(locationId: string | null) {
    if (!npc) return;

    setShowLocationPicker(false);
    try {
      await setNpcCurrentLocation(db, npc.id, locationId);
      if (locationId) {
        const location = await db.entities.get(locationId);
        toast.success(`Aktualna lokacja ustawiona na ${location?.name ?? 'wybraną lokację'}`);
      } else {
        toast.success('Aktualna lokacja została wyczyszczona');
      }
    } catch {
      toast.error('Nie udało się zaktualizować aktualnej lokacji');
    }
  }

  async function handleDelete() {
    try {
      await deleteEntity(db, npc!.id);
      toast.success(`Postać „${npc!.name}” usunięta`);
      navigate('/npcs');
    } catch {
      toast.error('Nie udało się usunąć NPC');
    }
  }

  function handleNavigateToEntity(entity: Entity) {
    const detailPath = getEntityDetailPath(entity.type, entity.id);
    if (detailPath) {
      navigate(detailPath);
    }
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      {/* Back */}
      <button
        type="button"
        onClick={() => navigate(backPath)}
        className="mb-4 flex items-center gap-1.5 text-sm text-surface-500 hover:text-surface-800"
      >
        <ArrowLeft className="h-4 w-4" />
        {returnToSessionLive ? 'Sesja na żywo' : 'NPC'}
      </button>

      {editing ? (
        <div className="rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-surface-900">Edytuj postać</h2>
          <NpcForm
            defaultValues={{
              name: npc.name,
              instinct: npc.data.instinct,
              motivation: npc.data.motivation,
              appearance: npc.data.appearance,
              playStyle: npc.data.playStyle ?? '',
              isPC: npc.data.isPC ?? false,
              playerName: npc.data.playerName ?? '',
              description: npc.description ?? '',
              tags: npc.tags,
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
              <h1 className="text-2xl font-bold text-surface-900">{npc.name}</h1>
              <p className="mt-1 text-xs text-surface-400">
                Utworzony {formatDate(npc.createdAt)} · Edytowany {formatDate(npc.updatedAt)}
              </p>
            </div>
            <div className="flex gap-1.5">
              <MarkdownExportButton entity={npc} />
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

          <section className="mb-6 rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-surface-800">Aktualna lokacja</h2>
                {currentLocation ? (
                  isDraftLocation(currentLocation) ? (
                    <p className="mt-1 text-sm text-surface-700">Pusta scena sesji</p>
                  ) : (
                    <button
                      type="button"
                      onClick={() => navigate(`/locations/${currentLocation.id}`)}
                      className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-primary-700 hover:underline"
                    >
                      <MapPin className="h-3.5 w-3.5" />
                      {currentLocation.name}
                    </button>
                  )
                ) : (
                  <p className="mt-1 text-sm text-surface-500">Brak aktualnej lokacji.</p>
                )}
                <p className="mt-1 text-xs text-surface-400">
                  Relacja `contains` wskazuje jedną bieżącą lokację kampanijną tej postaci.
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => setShowLocationPicker(true)}
                  className="rounded-md border border-surface-300 px-3 py-1.5 text-xs font-medium text-surface-700 hover:bg-surface-50"
                >
                  {currentLocationRelation ? 'Zmień' : 'Dodaj lokację'}
                </button>
                {currentLocationRelation && (
                  <button
                    type="button"
                    onClick={() => void handleLocationSelect(null)}
                    className="rounded-md border border-surface-300 px-3 py-1.5 text-xs text-surface-600 hover:bg-surface-50"
                  >
                    Wyczyść
                  </button>
                )}
              </div>
            </div>
          </section>

          <section className="mb-6 rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-surface-800">Ostatnio widziany w</h2>
                <p className="mt-1 text-xs text-surface-400">
                  Pierwszy wpis to aktualna lokacja, kolejne 3 pokazują najświeższe archiwum.
                </p>
              </div>
              {locationHistory.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowHistoryModal(true)}
                  className="rounded-md border border-surface-300 px-2.5 py-1 text-xs text-surface-700 hover:bg-surface-50"
                >
                  Cala historia
                </button>
              )}
            </div>
            {recentLocationHistory.length === 0 ? (
              <p className="text-sm text-surface-500">
                Brak zapisanej historii lokacji. Pierwsza zmiana lokacji dopisze wpis do historii.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {recentLocationHistory.map((entry, index) => {
                  const isCurrent =
                    index === 0 &&
                    currentNamedLocationId !== null &&
                    entry.data.locationId === currentNamedLocationId;

                  return (
                  <div
                    key={entry.id}
                    className={`rounded-lg border p-3 ${
                      isCurrent
                        ? 'border-primary-300 bg-primary-50/70'
                        : 'border-surface-200 bg-surface-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p
                            className={`text-xs font-medium uppercase tracking-wide ${
                              isCurrent ? 'text-primary-700' : 'text-surface-400'
                            }`}
                          >
                          {formatDateTime(entry.data.timestamp)}
                          </p>
                          {isCurrent && (
                            <span className="rounded-full bg-primary-100 px-2 py-0.5 text-[11px] font-semibold text-primary-700">
                              Aktualna
                            </span>
                          )}
                        </div>
                        <p className={`mt-1 text-sm font-semibold ${isCurrent ? 'text-primary-900' : 'text-surface-900'}`}>
                          {entry.data.locationName}
                        </p>
                        {entry.data.sessionName && (
                          <p className="mt-1 text-xs text-surface-500">
                            Podczas: {entry.data.sessionName}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => navigate(`/locations/${entry.data.locationId}`)}
                        className="shrink-0 rounded-md border border-surface-300 px-2.5 py-1 text-xs text-surface-700 hover:bg-white"
                      >
                        Otw?rz
                      </button>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="mb-6 rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-surface-800">Obecność w sesjach</h2>
              <span className="text-xs text-surface-400">
                {sessionAppearances.length === 0 ? 'Brak' : `${sessionAppearances.length} powiązań`}
              </span>
            </div>
            {sessionAppearances.length === 0 ? (
              <p className="text-sm text-surface-500">NPC nie jest jeszcze podpięty do żadnej sesji.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {sessionAppearances.map((session) => (
                  <button
                    key={session.id}
                    type="button"
                    onClick={() => navigate(`/sessions/${session.id}`)}
                    className="rounded-full border border-surface-200 bg-surface-50 px-3 py-1.5 text-left text-xs text-surface-700 hover:border-primary-300 hover:text-primary-700"
                  >
                    {session.name || `Sesja ${session.data.number}`}
                    {session.data.date ? ` · ${session.data.date}` : ''}
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* NPC fields */}
          <div className="mb-6 flex flex-col gap-3 rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
            {npc.data.instinct && (
              <div>
                <p className="mb-0.5 text-xs font-medium uppercase tracking-wide text-surface-400">Instynkt</p>
                <p className="text-sm italic text-surface-700">{npc.data.instinct}</p>
              </div>
            )}
            {npc.data.motivation && (
              <div>
                <p className="mb-0.5 text-xs font-medium uppercase tracking-wide text-surface-400">Motywacja</p>
                <p className="text-sm text-surface-700">{npc.data.motivation}</p>
              </div>
            )}
            {npc.data.appearance && (
              <div>
                <p className="mb-0.5 text-xs font-medium uppercase tracking-wide text-surface-400">Wygląd</p>
                <p className="whitespace-pre-wrap text-sm text-surface-700">{npc.data.appearance}</p>
              </div>
            )}
            {npc.data.playStyle && (
              <div>
                <p className="mb-0.5 text-xs font-medium uppercase tracking-wide text-surface-400">Sposób odgrywania</p>
                <p className="whitespace-pre-wrap text-sm text-surface-700">{npc.data.playStyle}</p>
              </div>
            )}
          </div>

          {/* Tags */}
          {npc.tags.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-1.5">
              {npc.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-surface-100 px-2.5 py-1 text-xs text-surface-600">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Description */}
          {npc.description && (
            <div
              className="prose prose-sm mb-6 max-w-none text-surface-700"
              dangerouslySetInnerHTML={{ __html: npc.description }}
            />
          )}

          {/* Inline clocks */}
          {relatedClocks && relatedClocks.length > 0 && (
            <section className="mb-6">
              <h2 className="mb-3 text-sm font-semibold text-surface-800">Powiązane zegary</h2>
              <div className="flex flex-wrap gap-4">
                {relatedClocks.map((clock) =>
                  clock ? (
                    <div key={clock.id} className="flex flex-col items-center gap-1">
                      <ClockWidget clock={clock} size={56} />
                      <span className="max-w-[72px] truncate text-center text-xs text-surface-600">
                        {clock.name}
                      </span>
                    </div>
                  ) : null,
                )}
              </div>
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
            <NotesList entityId={npc.id} />
            <RelationList entityId={npc.id} onNavigate={handleNavigateToEntity} />
          </section>
        </>
      )}

      <ConfirmDialog
        open={showDeleteConfirm}
        title="Usuń NPC"
        description={`Czy na pewno chcesz usunąć „${npc.name}"?`}
        confirmLabel="Usuń"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      {showRelationPicker && (
        <RelationPicker
          sourceId={npc.id}
          sourceType="npc"
          onClose={() => setShowRelationPicker(false)}
        />
      )}

      {showLocationPicker && (
        <LocationPickerModal
          title="Ustaw aktualną lokację NPC"
          emptySelectionLabel="Brak lokacji"
          currentLocationId={currentLocation && !isDraftLocation(currentLocation) ? currentLocation.id : null}
          onSelect={(locationId) => void handleLocationSelect(locationId)}
          onClose={() => setShowLocationPicker(false)}
        />
      )}
      {showHistoryModal && (
        <NpcLocationHistoryModal
          entries={locationHistory}
          onClose={() => setShowHistoryModal(false)}
          onNavigate={(path) => {
            setShowHistoryModal(false);
            navigate(path);
          }}
        />
      )}
    </div>
  );
}
