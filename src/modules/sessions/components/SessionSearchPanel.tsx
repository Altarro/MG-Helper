import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router';
import { Search, MapPin, MapPinOff, Eye, Skull, OctagonAlert, Undo2 } from 'lucide-react';
import { useCampaign } from '@shared/db/CampaignContext';
import type { Entity } from '@shared/types/entity';
import {
  getEntityDetailPath,
  getEntityTypeBadgeClasses,
  getEntityTypeLabel,
} from '@shared/utils/entityTypeMeta';
import { useLiveSessionState } from '../hooks/useLiveSessionState';
import { NpcPreviewModal } from './NpcPreviewModal';
import { LocationPreviewModal } from './LocationPreviewModal';
import { ThreatPreviewModal } from './ThreatPreviewModal';
import { EntityPreviewModal } from './EntityPreviewModal';
import { getDraftLocationId, ensureSessionDraftLocation } from '../utils/draftScene';
import { ensureEntityAppearsInSession, setNpcCurrentLocation } from '../utils/liveSessionCommands';
import { updateEntity } from '@shared/db/operations';
import { toast } from 'sonner';
import { withLifecycleStatus } from '@shared/types/entityLifecycle';
import { recordEntityMutationInSession, recordSessionSignal } from '../utils/sessionSignals';
import { getItemLifecycleStatus, getLocationLifecycleStatus, getNpcLifecycleStatus } from '@shared/utils/entityData';
import { Modal } from '@shared/components/Modal';
import type { LocationData } from '@modules/locations/types';

interface SessionSearchPanelProps {
  sessionId: string;
  onLifecycleSnapshotsCaptured?: (snapshots: Array<{ entityId: string; prevData: Record<string, unknown> }>) => void;
  onUndoLastLifecycleChange?: () => void;
  canUndoLifecycle?: boolean;
}

type LifecycleQuickAction = 'npc_dead' | 'location_destroyed' | 'item_lost_or_destroyed' | 'location_survived';

export function SessionSearchPanel({
  sessionId,
  onLifecycleSnapshotsCaptured,
  onUndoLastLifecycleChange,
  canUndoLifecycle = false,
}: SessionSearchPanelProps) {
  const { db } = useCampaign();
  const [scope, setScope] = useState<'session' | 'campaign'>('session');
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | Entity['type']>('all');
  const [preview, setPreview] = useState<{
    type: Exclude<Entity['type'], 'session' | 'event' | 'faction'>;
    id: string;
  } | null>(null);
  const { currentLocationId, openCardIds, openCard, closeCard } = useLiveSessionState(sessionId);
  const [quickActionTarget, setQuickActionTarget] = useState<{
    entity: Entity;
    action: LifecycleQuickAction;
  } | null>(null);
  const [quickActionReason, setQuickActionReason] = useState('');
  const openCardSet = useMemo(() => new Set(openCardIds), [openCardIds]);
  const sceneLocationId = currentLocationId ?? getDraftLocationId(sessionId);

  const sessionEntitiesQuery = useLiveQuery(async () => {
    const relations = await db.relations
      .where('targetId')
      .equals(sessionId)
      .filter((relation) => relation.type === 'appears_in')
      .toArray();

    const sourceIds = [...new Set(relations.map((relation) => relation.sourceId))];
    if (sourceIds.length === 0) return [] as Entity[];

    const entities = await db.entities.where('id').anyOf(sourceIds).toArray();
    return entities
      .filter((entity) => entity.type !== 'event')
      .sort((a, b) => a.name.localeCompare(b.name, 'pl'));
  }, [db, sessionId]);
  const sessionEntities = useMemo(() => sessionEntitiesQuery ?? [], [sessionEntitiesQuery]);
  const campaignEntitiesQuery = useLiveQuery(
    async () =>
      (await db.entities.toArray())
        .filter((entity) => entity.type !== 'event')
        .sort((a, b) => a.name.localeCompare(b.name, 'pl')),
    [db],
  );
  const campaignEntities = useMemo(() => campaignEntitiesQuery ?? [], [campaignEntitiesQuery]);
  const sourceEntities = scope === 'session' ? sessionEntities : campaignEntities;
  const sessionEntityIdSet = useMemo(
    () => new Set(sessionEntities.map((entity) => entity.id)),
    [sessionEntities],
  );

  const sceneNpcIdSet =
    useLiveQuery(async () => {
      const npcIds = sessionEntities
        .filter((entity) => entity.type === 'npc')
        .map((entity) => entity.id);
      if (npcIds.length === 0) return new Set<string>();
      const relations = await db.relations
        .where('targetId')
        .anyOf(npcIds)
        .filter((relation) => relation.type === 'contains' && relation.sourceId === sceneLocationId)
        .toArray();
      return new Set(relations.map((relation) => relation.targetId));
    }, [db, sceneLocationId, sessionEntities]) ?? new Set<string>();

  const normalized = query.trim().toLowerCase();
  const availableTypes = useMemo(
    () => [...new Set(sourceEntities.map((entity) => entity.type))].sort(),
    [sourceEntities],
  );
  const filtered = useMemo(
    () =>
      normalized
        ? sourceEntities.filter((entity) => {
            const haystack = `${entity.name} ${entity.description ?? ''}`.toLowerCase();
            const queryMatch = haystack.includes(normalized);
            const typeMatch = typeFilter === 'all' || entity.type === typeFilter;
            return queryMatch && typeMatch;
          })
        : sourceEntities.filter((entity) => typeFilter === 'all' || entity.type === typeFilter),
    [sourceEntities, normalized, typeFilter],
  );

  const lifecycleReasonPresets: Record<LifecycleQuickAction, string[]> = {
    npc_dead: ['Zginął w walce', 'Poświęcenie fabularne', 'Śmierć poza kadrem'],
    location_destroyed: ['Spalona/zbombardowana', 'Runęła po katastrofie', 'Pochłonięta przez zagrożenie'],
    item_lost_or_destroyed: ['Zgubiony w trakcie sceny', 'Zniszczony w konflikcie', 'Oddany/utracony fabularnie'],
    location_survived: ['Ocalona decyzją MG', 'Wyjątek od propagacji', 'Ewakuacja i zabezpieczenie'],
  };

  async function collectDescendantLocations(parentId: string): Promise<Entity[]> {
    const descendants: Entity[] = [];
    const queue: string[] = [parentId];
    const visited = new Set<string>([parentId]);
    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) continue;
      const childRelations = await db.relations
        .where('sourceId')
        .equals(current)
        .filter((relation) => relation.type === 'contains')
        .toArray();
      const childIds = childRelations.map((relation) => relation.targetId).filter((id) => !visited.has(id));
      childIds.forEach((id) => visited.add(id));
      if (childIds.length === 0) continue;
      const children = await db.entities.where('id').anyOf(childIds).toArray();
      const childLocations = children.filter((entity) => entity.type === 'location');
      descendants.push(...childLocations);
      childLocations.forEach((child) => queue.push(child.id));
    }
    return descendants;
  }

  async function applyLifecycleQuickAction() {
    if (!quickActionTarget) return;
    const reason = quickActionReason.trim();
    if (!reason) {
      toast.error('Powód jest wymagany.');
      return;
    }
    const target = quickActionTarget.entity;
    const snapshots: Array<{ entityId: string; prevData: Record<string, unknown> }> = [];
    try {
      if (quickActionTarget.action === 'npc_dead' && target.type === 'npc') {
        snapshots.push({ entityId: target.id, prevData: { ...target.data } });
        const nextData = withLifecycleStatus(target.data, 'completed');
        await updateEntity(db, target.id, {
          data: {
            ...nextData,
            lifecycleReason: reason,
          } as unknown as Record<string, unknown>,
        });
        await recordEntityMutationInSession(db, {
          sessionId,
          entityType: 'npc',
          entityId: target.id,
          entityName: target.name,
          changedFields: ['status', 'lifecycleReason'],
          source: 'session-live/quick-action',
          extra: { status: 'completed', reason },
        });
        await recordSessionSignal(db, {
          sessionId,
          signalType: 'entity_died_in_session',
          entityType: 'npc',
          entityId: target.id,
          entityName: target.name,
          metadata: { source: 'manual', reason },
        });
      }

      if (quickActionTarget.action === 'item_lost_or_destroyed' && target.type === 'item') {
        snapshots.push({ entityId: target.id, prevData: { ...target.data } });
        const nextData = withLifecycleStatus(target.data, 'completed');
        await updateEntity(db, target.id, {
          data: {
            ...nextData,
            lifecycleReason: reason,
          } as unknown as Record<string, unknown>,
        });
        await recordEntityMutationInSession(db, {
          sessionId,
          entityType: 'item',
          entityId: target.id,
          entityName: target.name,
          changedFields: ['status', 'lifecycleReason'],
          source: 'session-live/quick-action',
          extra: { status: 'completed', reason },
        });
      }

      if (quickActionTarget.action === 'location_survived' && target.type === 'location') {
        snapshots.push({ entityId: target.id, prevData: { ...target.data } });
        await updateEntity(db, target.id, {
          data: {
            ...(withLifecycleStatus(target.data, 'active') as unknown as Record<string, unknown>),
            survivedParentDestruction: true,
            lifecycleReason: reason,
          },
        });
        await recordEntityMutationInSession(db, {
          sessionId,
          entityType: 'location',
          entityId: target.id,
          entityName: target.name,
          changedFields: ['status', 'survivedParentDestruction', 'lifecycleReason'],
          source: 'session-live/quick-action',
          extra: { status: 'active', survivedParentDestruction: true, reason },
        });
      }

      if (quickActionTarget.action === 'location_destroyed' && target.type === 'location') {
        snapshots.push({ entityId: target.id, prevData: { ...target.data } });
        const targetData = withLifecycleStatus(target.data, 'completed') as LocationData & { status: 'completed' };
        await updateEntity(db, target.id, {
          data: {
            ...targetData,
            lifecycleReason: reason,
            destroyedByParentId: null,
          } as unknown as Record<string, unknown>,
        });
        await recordEntityMutationInSession(db, {
          sessionId,
          entityType: 'location',
          entityId: target.id,
          entityName: target.name,
          changedFields: ['status', 'lifecycleReason'],
          source: 'session-live/quick-action',
          extra: { status: 'completed', reason },
        });

        const descendants = await collectDescendantLocations(target.id);
        for (const child of descendants) {
          const childData = child.data as LocationData;
          if (childData.survivedParentDestruction === true) continue;
          snapshots.push({ entityId: child.id, prevData: { ...child.data } });
          const nextChildData = withLifecycleStatus(child.data, 'completed') as LocationData & {
            status: 'completed';
          };
          await updateEntity(db, child.id, {
            data: {
              ...nextChildData,
              destroyedByParentId: target.id,
              lifecycleReason: reason,
            } as unknown as Record<string, unknown>,
          });
          await recordEntityMutationInSession(db, {
            sessionId,
            entityType: 'location',
            entityId: child.id,
            entityName: child.name,
            changedFields: ['status', 'destroyedByParentId', 'lifecycleReason'],
            source: 'session-live/quick-action/location-propagation',
            extra: { status: 'completed', destroyedByParentId: target.id, reason },
          });
        }
      }

      onLifecycleSnapshotsCaptured?.(snapshots);
      toast.success('Zapisano zmianę lifecycle.');
      setQuickActionTarget(null);
      setQuickActionReason('');
    } catch {
      toast.error('Nie udało się zapisać zmiany lifecycle.');
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-[1.45rem] border border-[rgba(86,93,94,0.12)] bg-[rgba(223,225,218,0.64)] p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-surface-500 text-xs font-semibold tracking-[0.18em] uppercase">Wyszukaj</p>
          <div className="flex items-center gap-2">
            {onUndoLastLifecycleChange && (
              <button
                type="button"
                onClick={onUndoLastLifecycleChange}
                disabled={!canUndoLifecycle}
                className="rounded-full border border-[rgba(86,93,94,0.14)] bg-white/80 px-2 py-0.5 text-[10px] font-semibold text-surface-700 disabled:opacity-40"
              >
                <span className="inline-flex items-center gap-1"><Undo2 className="h-3 w-3" /> Cofnij lifecycle</span>
              </button>
            )}
            <span className="rounded-full bg-white/80 px-1.5 py-0.5 text-[10px] font-semibold text-primary-700 ring-1 ring-primary-200 ring-inset">
              {filtered.length}
            </span>
          </div>
        </div>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setScope('session');
              setTypeFilter('all');
            }}
            className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition-all ${
              scope === 'session' ? 'app-pill' : 'app-pill-muted hover:bg-[rgba(223,225,218,0.98)]'
            }`}
          >
            W sesji
          </button>
          <button
            type="button"
            onClick={() => {
              setScope('campaign');
              setTypeFilter('all');
            }}
            className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition-all ${
              scope === 'campaign'
                ? 'app-pill'
                : 'app-pill-muted hover:bg-[rgba(223,225,218,0.98)]'
            }`}
          >
            W kampanii
          </button>
        </div>
        <label className="app-input-shell flex items-center gap-2 rounded-2xl px-3 py-2.5">
          <Search className="text-surface-500 h-3.5 w-3.5" />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={
              scope === 'session'
                ? 'Szukaj po wszystkim w sesji...'
                : 'Szukaj po całej kampanii...'
            }
            aria-label={scope === 'session' ? 'Szukaj encji w sesji' : 'Szukaj encji w kampanii'}
            className="text-surface-900 placeholder:text-surface-500 w-full bg-transparent text-sm outline-none"
            autoFocus
          />
        </label>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setTypeFilter('all')}
            className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition-all ${
              typeFilter === 'all' ? 'app-pill' : 'app-pill-muted hover:bg-[rgba(223,225,218,0.98)]'
            }`}
          >
            Wszystkie
          </button>
          {availableTypes.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setTypeFilter(type)}
              className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition-all ${
                typeFilter === type
                  ? 'app-pill'
                  : 'app-pill-muted hover:bg-[rgba(223,225,218,0.98)]'
              }`}
            >
              {getEntityTypeLabel(type)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        {filtered.length === 0 ? (
          <p className="text-surface-600 rounded-[1.35rem] border border-[rgba(86,93,94,0.12)] bg-[rgba(223,225,218,0.64)] p-4 text-sm">
            {normalized
              ? 'Brak wyników dla tego zapytania. Spróbuj innej frazy lub typu encji.'
              : scope === 'session'
                ? 'Brak encji w sesji. Dodaj encje z paneli sesji.'
                : 'Brak encji w kampanii.'}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-2.5">
            {filtered.map((entity) => {
              const path = getEntityDetailPath(entity.type, entity.id);
              const badgeClasses = getEntityTypeBadgeClasses(entity.type);
              const typeLabel = getEntityTypeLabel(entity.type);
              const canPin =
                entity.type === 'npc' || entity.type === 'thread' || entity.type === 'threat';
              const isPinned =
                entity.type === 'npc' ? sceneNpcIdSet.has(entity.id) : openCardSet.has(entity.id);
              const canPreview =
                entity.type !== 'session' && entity.type !== 'event' && entity.type !== 'faction';
              const cardClass = isPinned
                ? 'rounded-[1.35rem] border border-[rgba(33,71,102,0.18)] bg-[rgba(111,146,164,0.14)] p-4 shadow-[0_10px_24px_rgba(18,45,66,0.08)] transition-colors hover:bg-[rgba(111,146,164,0.18)]'
                : 'rounded-[1.35rem] border border-[rgba(86,93,94,0.12)] bg-[rgba(223,225,218,0.68)] p-4 shadow-[0_10px_24px_rgba(18,45,66,0.06)] transition-colors hover:bg-[rgba(223,225,218,0.86)]';

              const content = (
                <>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ring-1 ${badgeClasses}`}
                    >
                      {typeLabel}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {canPin && (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            void (async () => {
                              if (entity.type === 'npc') {
                                try {
                                  if (!sessionEntityIdSet.has(entity.id)) {
                                    await ensureEntityAppearsInSession(db, entity.id, sessionId);
                                  }
                                  if (isPinned) {
                                    await setNpcCurrentLocation(db, entity.id, null);
                                  } else {
                                    const targetLocationId =
                                      currentLocationId ??
                                      (await ensureSessionDraftLocation(db, sessionId)).id;
                                    await setNpcCurrentLocation(
                                      db,
                                      entity.id,
                                      targetLocationId,
                                      sessionId,
                                    );
                                  }
                                } catch {
                                  toast.error(
                                    'Nie udało się zaktualizować obecności postaci na scenie',
                                  );
                                }
                                return;
                              }
                              if (!sessionEntityIdSet.has(entity.id)) {
                                await ensureEntityAppearsInSession(db, entity.id, sessionId);
                              }
                              if (isPinned) closeCard(entity.id);
                              else openCard(entity.id);
                            })();
                          }}
                          className={`rounded-xl border px-2 py-1 text-[10px] font-semibold transition-colors ${
                            isPinned
                              ? 'text-primary-700 border-[rgba(33,71,102,0.16)] bg-[rgba(111,146,164,0.12)]'
                              : 'text-surface-600 hover:text-primary-800 border-[rgba(86,93,94,0.12)] bg-[rgba(223,225,218,0.82)]'
                          }`}
                          title={isPinned ? 'Odepnij ze sceny' : 'Przypnij do sceny'}
                          aria-label={`${isPinned ? 'Odepnij ze sceny' : 'Przypnij do sceny'}: ${entity.name}`}
                        >
                          <span className="inline-flex items-center gap-1">
                            {isPinned ? (
                              <MapPinOff className="h-3 w-3" />
                            ) : (
                              <MapPin className="h-3 w-3" />
                            )}
                            {isPinned ? 'Odepnij ze sceny' : 'Przypnij do sceny'}
                          </span>
                        </button>
                      )}
                      {entity.type === 'npc' && getNpcLifecycleStatus(entity) !== 'completed' && (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            setQuickActionTarget({ entity, action: 'npc_dead' });
                            setQuickActionReason('');
                          }}
                          className="rounded-xl border border-danger-200 bg-danger-50 px-2 py-1 text-[10px] font-semibold text-danger-800"
                        >
                          <span className="inline-flex items-center gap-1"><Skull className="h-3 w-3" /> Nie żyje</span>
                        </button>
                      )}
                      {entity.type === 'location' && getLocationLifecycleStatus(entity) !== 'completed' && (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            setQuickActionTarget({ entity, action: 'location_destroyed' });
                            setQuickActionReason('');
                          }}
                          className="rounded-xl border border-danger-200 bg-danger-50 px-2 py-1 text-[10px] font-semibold text-danger-800"
                        >
                          <span className="inline-flex items-center gap-1"><OctagonAlert className="h-3 w-3" /> Zniszczona</span>
                        </button>
                      )}
                      {entity.type === 'location' &&
                        getLocationLifecycleStatus(entity) === 'completed' &&
                        (entity.data as LocationData).destroyedByParentId && (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              setQuickActionTarget({ entity, action: 'location_survived' });
                              setQuickActionReason('');
                            }}
                            className="rounded-xl border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-800"
                          >
                            Ocal jako wyjątek
                          </button>
                        )}
                      {entity.type === 'item' && getItemLifecycleStatus(entity) !== 'completed' && (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            setQuickActionTarget({ entity, action: 'item_lost_or_destroyed' });
                            setQuickActionReason('');
                          }}
                          className="rounded-xl border border-danger-200 bg-danger-50 px-2 py-1 text-[10px] font-semibold text-danger-800"
                        >
                          Zgubiony / zniszczony
                        </button>
                      )}
                      {canPreview && (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            if (
                              entity.type !== 'session' &&
                              entity.type !== 'event' &&
                              entity.type !== 'faction'
                            ) {
                              setPreview({ type: entity.type, id: entity.id });
                            }
                          }}
                          className="text-surface-600 hover:text-primary-800 rounded-xl border border-[rgba(86,93,94,0.12)] bg-[rgba(223,225,218,0.82)] px-2 py-1 text-[10px] font-semibold transition-colors"
                          title="Szybki podgląd"
                          aria-label={`Szybki podgląd: ${entity.name}`}
                        >
                          <span className="inline-flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            Podgląd
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-surface-900 truncate text-sm font-semibold tracking-[-0.02em]">
                    {entity.name}
                  </p>
                  {entity.description && (
                    <p className="text-surface-600 mt-1 line-clamp-2 text-xs leading-5">
                      {entity.description}
                    </p>
                  )}
                </>
              );

              return path ? (
                <Link
                  key={entity.id}
                  to={path}
                  state={{ returnToSessionLive: sessionId }}
                  className={cardClass}
                >
                  {content}
                </Link>
              ) : (
                <div key={entity.id} className={cardClass}>
                  {content}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {preview?.type === 'npc' && (
        <NpcPreviewModal
          npcId={preview.id}
          sessionId={sessionId}
          onClose={() => setPreview(null)}
        />
      )}
      {preview?.type === 'location' && (
        <LocationPreviewModal
          locationId={preview.id}
          sessionId={sessionId}
          onClose={() => setPreview(null)}
        />
      )}
      {preview?.type === 'threat' && (
        <ThreatPreviewModal
          threatId={preview.id}
          sessionId={sessionId}
          onClose={() => setPreview(null)}
        />
      )}
      {preview &&
        preview.type !== 'npc' &&
        preview.type !== 'location' &&
        preview.type !== 'threat' && (
          <EntityPreviewModal
            entityId={preview.id}
            entityType={preview.type}
            sessionId={sessionId}
            onClose={() => setPreview(null)}
          />
        )}

      {quickActionTarget && (
        <Modal
          title="Powód zmiany lifecycle"
          size="md"
          onClose={() => {
            setQuickActionTarget(null);
            setQuickActionReason('');
          }}
        >
          <div className="space-y-3">
            <p className="text-sm text-surface-700">
              Encja: <span className="font-semibold">{quickActionTarget.entity.name}</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {lifecycleReasonPresets[quickActionTarget.action].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setQuickActionReason(preset)}
                  className="rounded-full border border-[rgba(86,93,94,0.14)] px-2.5 py-1 text-xs text-surface-700"
                >
                  {preset}
                </button>
              ))}
            </div>
            <textarea
              value={quickActionReason}
              onChange={(event) => setQuickActionReason(event.target.value)}
              rows={4}
              placeholder="Podaj powód (wymagane)..."
              className="app-input w-full rounded-xl px-3 py-2 text-sm"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setQuickActionTarget(null);
                  setQuickActionReason('');
                }}
                className="app-button-secondary rounded-xl px-3 py-2 text-sm"
              >
                Anuluj
              </button>
              <button
                type="button"
                onClick={() => void applyLifecycleQuickAction()}
                disabled={!quickActionReason.trim()}
                className="app-button-primary rounded-xl px-3 py-2 text-sm disabled:opacity-40"
              >
                Zapisz zmianę
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
