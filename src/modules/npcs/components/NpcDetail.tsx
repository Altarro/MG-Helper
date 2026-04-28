import { useMemo, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router';
import { ArrowLeft, MapPin, Pencil, Trash2, Plus, Skull, Users } from 'lucide-react';
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
import { DetailNotFound } from '@shared/components/DetailNotFound';
import { DetailScrollTopFab } from '@shared/components/DetailScrollTopFab';
import { DetailTocBar } from '@shared/components/DetailTocBar';
import { ClockWidget } from '@modules/clocks/components/ClockWidget';
import { updateEntity, deleteEntity } from '@shared/db/operations';
import { deleteAsset } from '@shared/db/assets';
import { useCampaign } from '@shared/db/CampaignContext';
import { isClock } from '@modules/clocks/types';
import { isDraftLocation, isLocation } from '@modules/locations/types';
import { LocationPickerModal } from '@modules/sessions/components/LocationPickerModal';
import { isSession } from '@modules/sessions/types';
import { getNpcLocationHistory } from '../locationHistory';
import { Modal } from '@shared/components/Modal';
import { EntityDetailPortrait } from '@shared/components/EntityDetailPortrait';
import { toast } from 'sonner';
import { formatDate, formatDateTime } from '@shared/utils/date';
import { getNpcLifecycleStatus, getSessionData } from '@shared/utils/entityData';
import { withLifecycleStatus } from '@shared/types/entityLifecycle';
import { getEntityDetailPath } from '@shared/utils/entityTypeMeta';
import type { NpcFormValues } from './NpcForm';
import type { Entity } from '@shared/types/entity';
import { setNpcCurrentLocation } from '@modules/sessions/utils/liveSessionCommands';
import { recordEntityMutationInSession, recordSessionSignal } from '@modules/sessions/utils/sessionSignals';

function compareSessionsDesc(
  a: Entity & { type: 'session' },
  b: Entity & { type: 'session' },
): number {
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
        <p className="text-surface-500 text-sm">Brak zapisanej historii lokacji.</p>
      ) : (
        <div className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="app-panel rounded-[1.25rem] p-4 shadow-[0_14px_28px_rgba(18,45,66,0.08)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-surface-400 text-xs font-medium tracking-wide uppercase">
                    {formatDateTime(entry.data.timestamp)}
                  </p>
                  <p className="text-surface-900 mt-1 text-sm font-semibold">
                    {entry.data.locationName}
                  </p>
                  {entry.data.sessionName && (
                    <p className="text-surface-500 mt-1 text-xs">
                      Podczas: {entry.data.sessionName}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => onNavigate(`/locations/${entry.data.locationId}`)}
                    className="app-button-secondary rounded-full px-3 py-1.5 text-xs font-medium"
                  >
                    Lokacja
                  </button>
                  {entry.data.sessionId && (
                    <button
                      type="button"
                      onClick={() => onNavigate(`/sessions/${entry.data.sessionId}`)}
                      className="app-button-secondary rounded-full px-3 py-1.5 text-xs font-medium"
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
  const returnToSessionLive = (location.state as { returnToSessionLive?: string } | null)
    ?.returnToSessionLive;
  const backPath = returnToSessionLive ? `/sessions/${returnToSessionLive}/live` : '/npcs';

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showKillConfirm, setShowKillConfirm] = useState(false);
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

  const sessionAppearances =
    useLiveQuery(async () => {
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

  const locationHistory =
    useLiveQuery(async () => {
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
    return entities
      .filter((e): e is NonNullable<typeof e> => !!e && isClock(e))
      .map((e) => (isClock(e) ? e : null))
      .filter(Boolean);
  }, [db, id]);

  const npcTocItems = useMemo(() => {
    if (!npc || editing) return [];
    const items: { id: string; label: string }[] = [
      { id: 'npc-detail-lokacja', label: 'Lokacja' },
      { id: 'npc-detail-historia-lokacji', label: 'Historia lokacji' },
      { id: 'npc-detail-sesje', label: 'Sesje' },
      { id: 'npc-detail-karta', label: 'Karta postaci' },
    ];
    if (npc.description) items.push({ id: 'npc-detail-opis', label: 'Opis' });
    const clocks = relatedClocks ?? [];
    if (clocks.length > 0) items.push({ id: 'npc-detail-zegary', label: 'Zegary' });
    items.push({ id: 'npc-detail-relacje', label: 'Relacje' });
    return items;
  }, [npc, editing, relatedClocks]);

  if (!id) return null;
  if (npc === undefined) return <LoadingPage />;
  if (npc === null) {
    return (
      <DetailNotFound
        icon={Users}
        title="Postać nie znaleziona"
        description="Mogła zostać usunięta albo odnośnik jest nieaktualny."
        to="/npcs"
        linkLabel="Wróć do listy postaci"
      />
    );
  }

  async function handleEdit(values: NpcFormValues) {
    setSaving(true);
    try {
      const previousImageId = npc!.data.imageId ?? null;
      const nextImageId = values.imageId ?? null;
      await updateEntity(db, npc!.id, {
        name: values.name,
        description: values.description,
        tags: values.tags,
        data: withLifecycleStatus(
          {
            instinct: values.instinct,
            motivation: values.motivation,
            appearance: values.appearance,
            playStyle: values.playStyle,
            isPC: values.isPC ?? false,
            playerName: values.playerName ?? '',
            imageId: nextImageId,
            imageAlt: values.imageAlt ?? '',
          },
          getNpcLifecycleStatus({ data: npc!.data }),
        ) as unknown as Record<string, unknown>,
      });
      if (previousImageId && previousImageId !== nextImageId) {
        await deleteAsset(db, previousImageId).catch(() => undefined);
      }
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

  async function applyNpcDead(nextDead: boolean) {
    try {
      await updateEntity(db, npc!.id, {
        data: withLifecycleStatus(npc!.data, nextDead ? 'completed' : 'active') as unknown as Record<string, unknown>,
      });
      if (returnToSessionLive) {
        await recordEntityMutationInSession(db, {
          sessionId: returnToSessionLive,
          entityType: 'npc',
          entityId: npc!.id,
          entityName: npc!.name,
          changedFields: ['status'],
          source: 'npc-detail/toggle-dead',
          extra: { status: nextDead ? 'completed' : 'active', isPC: npc!.data.isPC === true },
        });
        if (nextDead) {
          await recordSessionSignal(db, {
            sessionId: returnToSessionLive,
            signalType: 'entity_died_in_session',
            entityType: 'npc',
            entityId: npc!.id,
            entityName: npc!.name,
            metadata: { source: 'npc-detail/kill', isPC: npc!.data.isPC === true },
          });
        }
      }
      toast.success(
        nextDead ? 'Postać oznaczona jako nie żyje (encja pozostaje w kampanii)' : 'Postać przywrócona do żywych',
      );
      setShowKillConfirm(false);
    } catch {
      toast.error('Nie udało się zapisać stanu postaci');
    }
  }

  function handleNavigateToEntity(entity: Entity) {
    const detailPath = getEntityDetailPath(entity.type, entity.id);
    if (detailPath) {
      navigate(detailPath);
    }
  }

  const npcIsDead = getNpcLifecycleStatus({ data: npc!.data }) === 'completed';

  return (
    <div className="mx-auto max-w-5xl p-6">
      {/* Back */}
      <button
        type="button"
        onClick={() => navigate(backPath)}
        className="text-surface-500 hover:text-primary-700 mb-4 flex items-center gap-1.5 text-sm"
      >
        <ArrowLeft className="h-4 w-4" />
        {returnToSessionLive ? 'Sesja na żywo' : 'NPC'}
      </button>

      {editing ? (
        <div className="app-panel rounded-[1.75rem] p-5 shadow-[0_20px_40px_rgba(18,45,66,0.08)] lg:p-6">
          <h2 className="text-surface-900 mb-4 text-base font-semibold">Edytuj postać</h2>
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
              imageId: npc.data.imageId ?? null,
              imageAlt: npc.data.imageAlt ?? '',
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
          <div
            className={`app-panel-strong mb-6 flex flex-col gap-5 rounded-[1.9rem] border border-white/40 px-6 py-6 shadow-[0_28px_60px_rgba(18,45,66,0.12)] lg:flex-row lg:items-start lg:justify-between lg:px-7 ${
              npcIsDead ? 'opacity-90' : ''
            }`}
          >
            <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start">
              {npc.data.imageId && (
                <EntityDetailPortrait
                  imageId={npc.data.imageId}
                  alt={npc.data.imageAlt ?? npc.name}
                  size="lg"
                />
              )}
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-surface-900 text-3xl font-semibold tracking-[-0.03em]">
                    {npc.name}
                  </h1>
                  {npcIsDead && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-danger-300/60 bg-danger-50 px-2.5 py-1 text-xs font-semibold text-danger-800">
                      <Skull className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      Nie żyje
                    </span>
                  )}
                </div>
                <p className="text-surface-400 mt-1 text-xs">
                  Utworzony {formatDate(npc.createdAt)} · Edytowany {formatDate(npc.updatedAt)}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <MarkdownExportButton entity={npc} />
              <button
                type="button"
                onClick={() => setEditing(true)}
                aria-label="Edytuj"
                className="app-button-secondary inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium"
              >
                <Pencil className="h-4 w-4" />
                Edytuj
              </button>
              {npcIsDead ? (
                <button
                  type="button"
                  onClick={() => void applyNpcDead(false)}
                  className="app-button-secondary inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium"
                >
                  Przywróć (żyje)
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowKillConfirm(true)}
                  className="app-button-secondary inline-flex items-center gap-1.5 rounded-full border border-danger-200 px-4 py-2 text-sm font-medium text-danger-800 hover:bg-danger-50"
                >
                  <Skull className="h-4 w-4" />
                  Zabij postać
                </button>
              )}
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

          <DetailTocBar
            ariaLabel="Sekcje karty postaci"
            items={npcTocItems}
            className="mb-2"
          />

          <section
            id="npc-detail-lokacja"
            className="app-panel mb-6 rounded-[1.6rem] p-5 shadow-[0_16px_32px_rgba(18,45,66,0.08)] lg:p-6"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-surface-800 text-sm font-semibold">Aktualna lokacja</h2>
                {currentLocation ? (
                  isDraftLocation(currentLocation) ? (
                    <p className="text-surface-700 mt-1 text-sm">Pusta scena sesji</p>
                  ) : (
                    <button
                      type="button"
                      onClick={() => navigate(`/locations/${currentLocation.id}`)}
                      className="text-primary-700 hover:text-primary-800 mt-1 inline-flex items-center gap-1 text-sm font-medium transition-colors"
                    >
                      <MapPin className="h-3.5 w-3.5" />
                      {currentLocation.name}
                    </button>
                  )
                ) : (
                  <p className="text-surface-500 mt-1 text-sm">Brak aktualnej lokacji.</p>
                )}
                <p className="text-surface-400 mt-1 text-xs">
                  Relacja `contains` wskazuje jedną bieżącą lokację kampanijną tej postaci.
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => setShowLocationPicker(true)}
                  className="app-button-secondary rounded-full px-3 py-1.5 text-xs font-medium"
                >
                  {currentLocationRelation ? 'Zmień' : 'Dodaj lokację'}
                </button>
                {currentLocationRelation && (
                  <button
                    type="button"
                    onClick={() => void handleLocationSelect(null)}
                    className="app-button-secondary rounded-full px-3 py-1.5 text-xs font-medium"
                  >
                    Wyczyść
                  </button>
                )}
              </div>
            </div>
          </section>

          <section
            id="npc-detail-historia-lokacji"
            className="app-panel mb-6 rounded-[1.6rem] p-5 shadow-[0_16px_32px_rgba(18,45,66,0.08)] lg:p-6"
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-surface-800 text-sm font-semibold">Ostatnio widziany w</h2>
                <p className="text-surface-400 mt-1 text-xs">
                  Pierwszy wpis to aktualna lokacja, kolejne 3 pokazują najświeższe archiwum.
                </p>
              </div>
              {locationHistory.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowHistoryModal(true)}
                  className="app-button-secondary rounded-full px-3 py-1.5 text-xs font-medium"
                >
                  Cala historia
                </button>
              )}
            </div>
            {recentLocationHistory.length === 0 ? (
              <p className="text-surface-500 text-sm">
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
                      className={`rounded-[1.2rem] border p-4 shadow-[0_12px_24px_rgba(18,45,66,0.06)] ${
                        isCurrent
                          ? 'border-primary-300 bg-primary-50/65'
                          : 'border-white/55 bg-[rgba(244,245,240,0.9)]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p
                              className={`text-xs font-medium tracking-wide uppercase ${
                                isCurrent ? 'text-primary-700' : 'text-surface-400'
                              }`}
                            >
                              {formatDateTime(entry.data.timestamp)}
                            </p>
                            {isCurrent && (
                              <span className="bg-primary-100 text-primary-700 rounded-full px-2 py-0.5 text-[11px] font-semibold">
                                Aktualna
                              </span>
                            )}
                          </div>
                          <p
                            className={`mt-1 text-sm font-semibold ${isCurrent ? 'text-primary-900' : 'text-surface-900'}`}
                          >
                            {entry.data.locationName}
                          </p>
                          {entry.data.sessionName && (
                            <p className="text-surface-500 mt-1 text-xs">
                              Podczas: {entry.data.sessionName}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => navigate(`/locations/${entry.data.locationId}`)}
                          className="app-button-secondary shrink-0 rounded-full px-3 py-1.5 text-xs font-medium"
                        >
                          Otwórz
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section
            id="npc-detail-sesje"
            className="app-panel mb-6 rounded-[1.6rem] p-5 shadow-[0_16px_32px_rgba(18,45,66,0.08)] lg:p-6"
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-surface-800 text-sm font-semibold">Obecność w sesjach</h2>
              <span className="text-surface-400 text-xs">
                {sessionAppearances.length === 0 ? 'Brak' : `${sessionAppearances.length} powiązań`}
              </span>
            </div>
            {sessionAppearances.length === 0 ? (
              <p className="text-surface-500 text-sm">
                NPC nie jest jeszcze podpięty do żadnej sesji.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {sessionAppearances.map((session) => (
                  <button
                    key={session.id}
                    type="button"
                    onClick={() => navigate(`/sessions/${session.id}`)}
                    className="app-input-shell text-surface-700 hover:border-primary-300 hover:text-primary-700 rounded-full px-3 py-1.5 text-left text-xs transition-colors"
                  >
                    {session.name || `Sesja ${session.data.number}`}
                    {session.data.date ? ` · ${session.data.date}` : ''}
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* NPC fields */}
          <div
            id="npc-detail-karta"
            className="app-panel mb-6 flex flex-col gap-3 rounded-[1.6rem] p-5 shadow-[0_16px_32px_rgba(18,45,66,0.08)] lg:p-6"
          >
            {npc.data.instinct && (
              <div>
                <p className="text-surface-400 mb-0.5 text-xs font-medium tracking-wide uppercase">
                  Instynkt
                </p>
                <p className="text-surface-700 text-sm italic">{npc.data.instinct}</p>
              </div>
            )}
            {npc.data.motivation && (
              <div>
                <p className="text-surface-400 mb-0.5 text-xs font-medium tracking-wide uppercase">
                  Motywacja
                </p>
                <p className="text-surface-700 text-sm">{npc.data.motivation}</p>
              </div>
            )}
            {npc.data.appearance && (
              <div>
                <p className="text-surface-400 mb-0.5 text-xs font-medium tracking-wide uppercase">
                  Wygląd
                </p>
                <p className="text-surface-700 text-sm whitespace-pre-wrap">
                  {npc.data.appearance}
                </p>
              </div>
            )}
            {npc.data.playStyle && (
              <div>
                <p className="text-surface-400 mb-0.5 text-xs font-medium tracking-wide uppercase">
                  Sposób odgrywania
                </p>
                <p className="text-surface-700 text-sm whitespace-pre-wrap">{npc.data.playStyle}</p>
              </div>
            )}
          </div>

          {/* Tags */}
          {npc.tags.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-1.5">
              {npc.tags.map((tag) => (
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
          {npc.description && (
            <section
              id="npc-detail-opis"
              className="app-panel mb-6 rounded-[1.6rem] p-5 shadow-[0_16px_32px_rgba(18,45,66,0.08)] lg:p-6"
            >
              <h2 className="text-surface-500 mb-3 text-sm font-semibold tracking-wide uppercase">
                Opis
              </h2>
              <div
                className="prose prose-sm text-surface-700 max-w-none"
                dangerouslySetInnerHTML={{ __html: npc.description }}
              />
            </section>
          )}

          {/* Inline clocks */}
          {relatedClocks && relatedClocks.length > 0 && (
            <section id="npc-detail-zegary" className="mb-6">
              <h2 className="text-surface-800 mb-3 text-sm font-semibold">Powiązane zegary</h2>
              <div className="flex flex-wrap gap-4">
                {relatedClocks.map((clock) =>
                  clock ? (
                    <div key={clock.id} className="flex flex-col items-center gap-1">
                      <ClockWidget clock={clock} size={56} />
                      <span className="text-surface-600 max-w-[72px] truncate text-center text-xs">
                        {clock.name}
                      </span>
                    </div>
                  ) : null,
                )}
              </div>
            </section>
          )}

          {/* Relations */}
          <section id="npc-detail-relacje" className="mb-6">
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
            <NotesList entityId={npc.id} />
            <RelationList entityId={npc.id} onNavigate={handleNavigateToEntity} />
          </section>

          <DetailScrollTopFab enabled={npcTocItems.length > 0} />
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

      <ConfirmDialog
        open={showKillConfirm}
        title="Zabij postać (bez usuwania)"
        description={
          npc.data.isPC
            ? `Postać gracza „${npc.name}” zostanie oznaczona jako nie żyje. Karta pozostanie w kampanii.`
            : `NPC „${npc.name}” zostanie oznaczony jako nie żyje. Encja pozostanie w kampanii — relacje i historia zostaną zachowane.`
        }
        confirmLabel="Oznacz jako nie żyje"
        destructive={false}
        onConfirm={() => void applyNpcDead(true)}
        onCancel={() => setShowKillConfirm(false)}
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
          currentLocationId={
            currentLocation && !isDraftLocation(currentLocation) ? currentLocation.id : null
          }
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
