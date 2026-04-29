import { useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { ArrowLeft, Edit2, Trash2, X, Flag, Users, MapPin, Plus, Search } from 'lucide-react';
import { useFactionById } from '../hooks/useFactionById';
import { FactionForm } from './FactionForm';
import { DetailNotFound } from '@shared/components/DetailNotFound';
import { DetailSection } from '@shared/components/DetailSection';
import { DetailScrollTopFab } from '@shared/components/DetailScrollTopFab';
import { DetailTocBar } from '@shared/components/DetailTocBar';
import { LoadingSpinner } from '@shared/components/LoadingSpinner';
import { ConfirmDialog } from '@shared/components/ConfirmDialog';
import { EntityDetailPortrait } from '@shared/components/EntityDetailPortrait';
import { NotesList } from '@modules/notes/components/NotesList';
import {
  deleteEntity,
  updateEntity,
  getEntityById,
  deleteRelation,
  assignBelongsTo,
} from '@shared/db/operations';
import { deleteAsset } from '@shared/db/assets';
import { useCampaign } from '@shared/db/CampaignContext';
import type { MgHelperDb } from '@shared/db/database';
import type { Entity } from '@shared/types';
import { toast } from 'sonner';
import { useLiveQuery } from 'dexie-react-hooks';
import type { FactionFormValues } from './FactionForm';
import { getFactionLifecycleStatus } from '@shared/utils/entityData';
import { withLifecycleStatus } from '@shared/types/entityLifecycle';
import { Modal } from '@shared/components/Modal';
import { useEntitiesByType } from '@shared/hooks/useEntitiesByType';

type FactionAttachment = {
  relationId: string;
  entity: Entity;
};

function useFactionMembers(db: MgHelperDb, factionId: string | undefined) {
  return (
    useLiveQuery(async () => {
      if (!factionId) return [];
      const rels = await db.relations
        .where('targetId')
        .equals(factionId)
        .filter((r) => r.type === 'belongs_to')
        .toArray();
      const entities = await Promise.all(
        rels.map(async (relation) => {
          const entity = await getEntityById(db, relation.sourceId);
          if (!entity || entity.type !== 'npc') return null;
          return { relationId: relation.id, entity } as FactionAttachment;
        }),
      );
      return entities.filter((item): item is FactionAttachment => item !== null);
    }, [db, factionId]) ?? []
  );
}

function useFactionLocations(db: MgHelperDb, factionId: string | undefined) {
  return (
    useLiveQuery(async () => {
      if (!factionId) return [];
      const rels = await db.relations
        .where('targetId')
        .equals(factionId)
        .filter((r) => r.type === 'belongs_to')
        .toArray();
      const entities = await Promise.all(
        rels.map(async (relation) => {
          const entity = await getEntityById(db, relation.sourceId);
          if (!entity || entity.type !== 'location') return null;
          return { relationId: relation.id, entity } as FactionAttachment;
        }),
      );
      return entities.filter((item): item is FactionAttachment => item !== null);
    }, [db, factionId]) ?? []
  );
}

export function FactionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { db } = useCampaign();
  const { faction } = useFactionById(id);
  const members = useFactionMembers(db, id);
  const locations = useFactionLocations(db, id);
  const npcs = useEntitiesByType('npc');
  const allLocations = useEntitiesByType('location');

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showMemberPicker, setShowMemberPicker] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [memberQuery, setMemberQuery] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [assigningEntityId, setAssigningEntityId] = useState<string | null>(null);
  const [relationToDelete, setRelationToDelete] = useState<{
    relationId: string;
    entityName: string;
    entityTypeLabel: string;
  } | null>(null);
  const [statusConfirm, setStatusConfirm] = useState<'disband' | 'restore' | null>(null);
  const [statusSaving, setStatusSaving] = useState(false);
  const memberIds = useMemo(() => new Set(members.map((item) => item.entity.id)), [members]);
  const locationIds = useMemo(() => new Set(locations.map((item) => item.entity.id)), [locations]);

  const filteredMemberCandidates = useMemo(() => {
    const normalized = memberQuery.trim().toLowerCase();
    return npcs.filter((npc) => {
      if (memberIds.has(npc.id)) return false;
      if (!normalized) return true;
      return npc.name.toLowerCase().includes(normalized);
    });
  }, [npcs, memberIds, memberQuery]);

  const filteredLocationCandidates = useMemo(() => {
    const normalized = locationQuery.trim().toLowerCase();
    return allLocations.filter((location) => {
      if (locationIds.has(location.id)) return false;
      if (!normalized) return true;
      return location.name.toLowerCase().includes(normalized);
    });
  }, [allLocations, locationIds, locationQuery]);

  const factionTocItems = useMemo(() => {
    if (!faction || isEditing) return [];
    const items: { id: string; label: string }[] = [];
    if (faction.data.goals.length > 0 || faction.data.resources.length > 0) {
      items.push({ id: 'faction-detail-kontekst', label: 'Kontekst' });
    }
    if (faction.description) items.push({ id: 'faction-detail-opis', label: 'Opis' });
    items.push(
      { id: 'faction-detail-headquarters', label: 'Siedziby' },
      { id: 'faction-detail-members', label: 'Członkowie' },
      { id: 'faction-detail-notatki', label: 'Notatki' },
      { id: 'faction-detail-tagi', label: 'Tagi' },
    );
    return items;
  }, [faction, isEditing]);

  if (faction === undefined) return <LoadingSpinner />;
  if (!faction) {
    return (
      <DetailNotFound
        icon={Flag}
        title="Frakcja nie znaleziona"
        description="Mogła zostać usunięta albo odnośnik jest nieaktualny."
        to="/factions"
        linkLabel="Wróć do listy frakcji"
      />
    );
  }

  async function handleUpdate(values: FactionFormValues) {
    setSaving(true);
    try {
      const previousImageId = faction!.data.imageId ?? null;
      const nextImageId = values.imageId ?? null;
      await updateEntity(db, faction!.id, {
        name: values.name,
        description: values.description,
        tags: values.tags,
        data: withLifecycleStatus(
          {
            goals: values.goals,
            resources: values.resources,
            imageId: nextImageId,
            imageAlt: values.imageAlt ?? '',
          },
          getFactionLifecycleStatus({ data: faction!.data }),
        ) as unknown as Record<string, unknown>,
      });
      if (previousImageId && previousImageId !== nextImageId) {
        await deleteAsset(db, previousImageId).catch(() => undefined);
      }
      toast.success('Frakcja zaktualizowana');
      setIsEditing(false);
    } catch {
      toast.error('Nie udało się zapisać zmian');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    try {
      await deleteEntity(db, faction!.id);
      toast.success(`Frakcja „${faction!.name}" usunięta`);
      navigate('/factions');
    } catch {
      toast.error('Nie udało się usunąć');
    }
  }

  async function handleConfirmStatusChange() {
    if (!statusConfirm || statusSaving) return;
    setStatusSaving(true);
    try {
      const nextStatus = statusConfirm === 'disband' ? 'completed' : 'active';
      await updateEntity(db, faction!.id, {
        data: withLifecycleStatus(faction!.data, nextStatus) as unknown as Record<string, unknown>,
      });
      toast.success(nextStatus === 'completed' ? 'Frakcja oznaczona jako rozbita' : 'Frakcja przywrócona');
      setStatusConfirm(null);
    } catch {
      toast.error('Nie udało się zapisać statusu');
    } finally {
      setStatusSaving(false);
    }
  }

  async function handleConfirmRelationDelete() {
    if (!relationToDelete) return;
    try {
      await deleteRelation(db, relationToDelete.relationId);
      toast.success(`Usunięto powiązanie (${relationToDelete.entityTypeLabel.toLowerCase()})`);
      setRelationToDelete(null);
    } catch {
      toast.error('Nie udało się usunąć powiązania');
    }
  }

  async function handleAssignToFaction(entityId: string, entityTypeLabel: 'Postać' | 'Lokacja') {
    if (!faction || assigningEntityId) return;
    setAssigningEntityId(entityId);
    try {
      await assignBelongsTo(db, { sourceId: entityId, targetId: faction.id });
      toast.success(`${entityTypeLabel} dodana do frakcji`);
      if (entityTypeLabel === 'Postać') {
        setShowMemberPicker(false);
        setMemberQuery('');
      } else {
        setShowLocationPicker(false);
        setLocationQuery('');
      }
    } catch {
      toast.error(`Nie udało się dodać: ${entityTypeLabel.toLowerCase()}`);
    } finally {
      setAssigningEntityId(null);
    }
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-6">
      <Link
        to="/factions"
        className="text-surface-500 hover:text-primary-700 flex w-fit items-center gap-1.5 text-sm"
      >
        <ArrowLeft className="h-4 w-4" /> Frakcje
      </Link>

      <div className="app-panel-strong flex flex-col gap-5 rounded-[1.9rem] border border-white/40 px-6 py-6 shadow-[0_28px_60px_rgba(18,45,66,0.12)] lg:flex-row lg:items-start lg:justify-between lg:px-7">
        <div className="flex min-w-0 items-center gap-4">
          {!isEditing && faction.data.imageId ? (
            <EntityDetailPortrait
              imageId={faction.data.imageId}
              alt={faction.data.imageAlt ?? faction.name}
              size="lg"
            />
          ) : (
            <div className="app-panel text-primary-700 rounded-[1.25rem] p-3 shadow-[0_14px_28px_rgba(18,45,66,0.12)]">
              <Flag className="h-5 w-5 shrink-0" />
            </div>
          )}
          <div className="flex min-w-0 flex-col gap-2">
            <h1 className="text-surface-900 min-w-0 text-3xl font-semibold tracking-[-0.03em]">
              {faction.name}
            </h1>
            {getFactionLifecycleStatus({ data: faction.data }) === 'completed' && (
              <span className="app-pill-muted w-fit rounded-full px-3 py-1 text-xs font-semibold tracking-wide uppercase">
                Rozbita
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          {!isEditing && (
            <button
              type="button"
              onClick={() =>
                setStatusConfirm(getFactionLifecycleStatus({ data: faction.data }) === 'completed' ? 'restore' : 'disband')}
              className="app-button-secondary inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium"
            >
              {getFactionLifecycleStatus({ data: faction.data }) === 'completed'
                ? 'Przywróć frakcję'
                : 'Oznacz jako rozbitą'}
            </button>
          )}
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
          <button
            onClick={() => setConfirmDelete(true)}
            className="app-button-danger inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium"
          >
            <Trash2 className="h-3.5 w-3.5" /> Usuń
          </button>
        </div>
      </div>

      {!isEditing && (
        <DetailTocBar ariaLabel="Sekcje karty frakcji" items={factionTocItems} className="mb-2" />
      )}

      {isEditing && (
        <div className="app-panel rounded-[1.75rem] p-4 shadow-[0_20px_40px_rgba(18,45,66,0.08)] lg:p-6">
          <FactionForm
            defaultValues={{
              name: faction.name,
              goals: faction.data.goals,
              resources: faction.data.resources,
              description: faction.description,
              tags: faction.tags,
              imageId: faction.data.imageId ?? null,
              imageAlt: faction.data.imageAlt ?? '',
            }}
            onSubmit={handleUpdate}
            isSaving={saving}
            onCancel={() => setIsEditing(false)}
          />
        </div>
      )}

      {!isEditing &&
        (faction.data.goals.length > 0 || faction.data.resources.length > 0) && (
          <DetailSection
            sectionId="faction-detail-kontekst"
            title="Kontekst frakcji"
            tone="accent"
            contentClassName="flex flex-col gap-4"
          >
            {faction.data.goals.length > 0 && (
              <div className="rounded-[1.25rem] border border-[rgba(186,81,47,0.4)] bg-[linear-gradient(180deg,rgba(255,178,102,0.34)_0%,rgba(182,58,58,0.24)_100%)] px-5 py-4 shadow-[0_12px_24px_rgba(128,44,31,0.14),inset_0_1px_0_rgba(255,255,255,0.32)]">
                <h2 className="mb-2 text-xs font-semibold tracking-wide text-[rgb(107,33,18)] uppercase">Cele</h2>
                <ul className="list-inside list-disc space-y-1.5">
                  {faction.data.goals.map((g, i) => (
                    <li key={i} className="text-surface-800 text-sm">
                      {g}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {faction.data.resources.length > 0 && (
              <div className="app-panel rounded-[1.25rem] p-5">
                <h2 className="text-surface-500 mb-3 text-xs font-semibold tracking-wide uppercase">Zasoby</h2>
                <ul className="m-0 grid list-none grid-cols-1 gap-2 p-0 sm:grid-cols-2">
                  {faction.data.resources.map((r, i) => (
                    <li
                      key={i}
                      className="app-input-shell flex min-w-0 items-start gap-2 rounded-[1rem] px-3.5 py-3"
                    >
                      <span className="app-pill-muted mt-0.5 inline-flex h-fit shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums">
                        {i + 1}
                      </span>
                      <span className="text-surface-700 min-w-0 text-sm leading-6 break-words">{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

          </DetailSection>
        )}

      {!isEditing && faction.description && (
        <DetailSection sectionId="faction-detail-opis" title="Opis">
          <div className="app-panel rounded-[1.25rem] p-5">
            <div
              className="prose prose-sm text-surface-700 max-w-none"
              dangerouslySetInnerHTML={{ __html: faction.description }}
            />
          </div>
        </DetailSection>
      )}

      {/* Headquarters (locations) */}
      {!isEditing && (
        <div id="faction-detail-headquarters" className="app-panel rounded-[1.6rem] p-5 lg:p-6">
          <div className="mb-3 flex items-center gap-2">
            <MapPin className="text-surface-400 h-4 w-4" />
            <h2 className="text-surface-700 text-sm font-semibold">Siedziby (lokacje)</h2>
            <button
              type="button"
              onClick={() => setShowLocationPicker(true)}
              className="app-button-secondary ml-auto inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium"
            >
              <Plus className="h-3.5 w-3.5" /> Dodaj
            </button>
          </div>
          {locations.length === 0 ? (
            <p className="text-surface-400 text-xs">
              Brak przypiętych lokacji.
            </p>
          ) : (
            <ul className="space-y-2">
              {locations.map(({ relationId, entity }) => (
                <li key={entity.id}>
                  <div className="app-input-shell flex items-center gap-2 rounded-[1rem] px-3 py-2">
                    <Link
                      to={`/locations/${entity.id}`}
                      className="text-surface-700 hover:text-primary-700 min-w-0 flex-1 text-sm font-medium transition-colors"
                    >
                      {entity.name}
                    </Link>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        setRelationToDelete({
                          relationId,
                          entityName: entity.name,
                          entityTypeLabel: 'Lokacja',
                        });
                      }}
                      className="text-surface-400 hover:text-danger-700 hover:bg-danger-50 shrink-0 rounded-full p-1 transition-colors"
                      aria-label={`Usuń lokację ${entity.name} z frakcji`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Members */}
      {!isEditing && (
        <div id="faction-detail-members" className="app-panel rounded-[1.6rem] p-5 lg:p-6">
          <div className="mb-3 flex items-center gap-2">
            <Users className="text-surface-400 h-4 w-4" />
            <h2 className="text-surface-700 text-sm font-semibold">Członkowie (Postacie)</h2>
            <button
              type="button"
              onClick={() => setShowMemberPicker(true)}
              className="app-button-secondary ml-auto inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium"
            >
              <Plus className="h-3.5 w-3.5" /> Dodaj
            </button>
          </div>
          {members.length === 0 ? (
            <p className="text-surface-400 text-xs">
              Brak przypiętych postaci.
            </p>
          ) : (
            <ul className="space-y-2">
              {members.map(({ relationId, entity }) => (
                <li key={entity.id}>
                  <div className="app-input-shell flex items-center gap-2 rounded-[1rem] px-3 py-2">
                    <Link
                      to={`/npcs/${entity.id}`}
                      className="text-surface-700 hover:text-primary-700 min-w-0 flex-1 text-sm font-medium transition-colors"
                    >
                      {entity.name}
                    </Link>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        setRelationToDelete({
                          relationId,
                          entityName: entity.name,
                          entityTypeLabel: 'Postać',
                        });
                      }}
                      className="text-surface-400 hover:text-danger-700 hover:bg-danger-50 shrink-0 rounded-full p-1 transition-colors"
                      aria-label={`Usuń postać ${entity.name} z frakcji`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div id="faction-detail-notatki">
        <NotesList entityId={id!} />
      </div>

      {!isEditing && (
        <DetailSection sectionId="faction-detail-tagi" title="Tagi">
          {faction.tags.length === 0 ? (
            <p className="text-surface-500 text-sm">Brak tagów — dodaj je w trybie edycji frakcji.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {faction.tags.map((t) => (
                <span key={t} className="app-pill rounded-full px-2.5 py-1 text-xs font-medium">
                  {t}
                </span>
              ))}
            </div>
          )}
        </DetailSection>
      )}

      <DetailScrollTopFab enabled={!isEditing && factionTocItems.length > 0} />

      <ConfirmDialog
        open={confirmDelete}
        title="Usuń frakcję"
        description={`Czy na pewno chcesz usunąć frakcję „${faction.name}"?`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />

      <ConfirmDialog
        open={statusConfirm !== null}
        title={statusConfirm === 'disband' ? 'Oznaczyć jako rozbitą?' : 'Przywrócić frakcję?'}
        description={
          statusConfirm === 'disband'
            ? `Frakcja „${faction.name}" zostanie oznaczona jako rozbita (fabularnie zakończona). Encja pozostanie w kampanii — możesz to cofnąć później.`
            : `Przywrócisz frakcję „${faction.name}" do stanu aktywnego (nie rozbita).`
        }
        confirmLabel={statusConfirm === 'disband' ? 'Oznacz jako rozbitą' : 'Przywróć'}
        destructive={false}
        onConfirm={() => void handleConfirmStatusChange()}
        onCancel={() => !statusSaving && setStatusConfirm(null)}
      />

      <ConfirmDialog
        open={relationToDelete !== null}
        title="Usunąć powiązanie?"
        description={
          relationToDelete
            ? `Czy na pewno chcesz usunąć powiązanie „${relationToDelete.entityName}" (${relationToDelete.entityTypeLabel.toLowerCase()}) z tą frakcją?`
            : ''
        }
        onConfirm={() => void handleConfirmRelationDelete()}
        onCancel={() => setRelationToDelete(null)}
      />

      {showLocationPicker && (
        <Modal
          title="Dodaj lokację do frakcji"
          size="md"
          onClose={() => {
            setShowLocationPicker(false);
            setLocationQuery('');
          }}
        >
          <div className="flex flex-col gap-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-surface-400" />
              <input
                value={locationQuery}
                onChange={(event) => setLocationQuery(event.target.value)}
                placeholder="Szukaj lokacji..."
                className="w-full rounded-md border border-surface-300 py-2 pl-8 pr-3 text-sm placeholder:text-surface-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <ul className="max-h-64 space-y-1 overflow-auto">
              {filteredLocationCandidates.length === 0 && (
                <li className="py-2 text-center text-xs text-surface-400">Brak lokacji do dodania</li>
              )}
              {filteredLocationCandidates.map((location) => (
                <li key={location.id}>
                  <button
                    type="button"
                    disabled={assigningEntityId !== null}
                    onClick={() => void handleAssignToFaction(location.id, 'Lokacja')}
                    className="flex w-full items-center rounded-md px-3 py-2 text-left text-sm hover:bg-primary-50 disabled:opacity-50"
                  >
                    <span className="text-surface-800 font-medium">{location.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </Modal>
      )}

      {showMemberPicker && (
        <Modal
          title="Dodaj postać do frakcji"
          size="md"
          onClose={() => {
            setShowMemberPicker(false);
            setMemberQuery('');
          }}
        >
          <div className="flex flex-col gap-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-surface-400" />
              <input
                value={memberQuery}
                onChange={(event) => setMemberQuery(event.target.value)}
                placeholder="Szukaj postaci..."
                className="w-full rounded-md border border-surface-300 py-2 pl-8 pr-3 text-sm placeholder:text-surface-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <ul className="max-h-64 space-y-1 overflow-auto">
              {filteredMemberCandidates.length === 0 && (
                <li className="py-2 text-center text-xs text-surface-400">Brak postaci do dodania</li>
              )}
              {filteredMemberCandidates.map((npc) => (
                <li key={npc.id}>
                  <button
                    type="button"
                    disabled={assigningEntityId !== null}
                    onClick={() => void handleAssignToFaction(npc.id, 'Postać')}
                    className="flex w-full items-center rounded-md px-3 py-2 text-left text-sm hover:bg-primary-50 disabled:opacity-50"
                  >
                    <span className="text-surface-800 font-medium">{npc.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </Modal>
      )}
    </div>
  );
}
