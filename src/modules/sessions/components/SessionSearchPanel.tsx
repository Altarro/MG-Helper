import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router';
import { Search, MapPin, MapPinOff, Eye } from 'lucide-react';
import { useCampaign } from '@shared/db/CampaignContext';
import type { Entity } from '@shared/types/entity';
import { getEntityDetailPath, getEntityTypeBadgeClasses, getEntityTypeLabel } from '@shared/utils/entityTypeMeta';
import { useLiveSessionState } from '../hooks/useLiveSessionState';
import { NpcPreviewModal } from './NpcPreviewModal';
import { LocationPreviewModal } from './LocationPreviewModal';
import { ThreatPreviewModal } from './ThreatPreviewModal';
import { EntityPreviewModal } from './EntityPreviewModal';
import { getDraftLocationId, ensureSessionDraftLocation } from '../utils/draftScene';
import { setNpcCurrentLocation } from '../utils/liveSessionCommands';
import { toast } from 'sonner';

interface SessionSearchPanelProps {
  sessionId: string;
}

export function SessionSearchPanel({ sessionId }: SessionSearchPanelProps) {
  const { db } = useCampaign();
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | Entity['type']>('all');
  const [preview, setPreview] = useState<{ type: Exclude<Entity['type'], 'session' | 'event' | 'faction'>; id: string } | null>(null);
  const { currentLocationId, openCardIds, openCard, closeCard } = useLiveSessionState(sessionId);
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
  const sceneNpcIdSet = useLiveQuery(async () => {
    const npcIds = sessionEntities
      .filter((entity) => entity.type === 'npc')
      .map((entity) => entity.id);
    if (npcIds.length === 0) return new Set<string>();
    const rels = await db.relations
      .where('targetId')
      .anyOf(npcIds)
      .filter((relation) => relation.type === 'contains' && relation.sourceId === sceneLocationId)
      .toArray();
    return new Set(rels.map((relation) => relation.targetId));
  }, [db, sceneLocationId, sessionEntities]) ?? new Set<string>();

  const normalized = query.trim().toLowerCase();
  const availableTypes = useMemo(
    () => [...new Set(sessionEntities.map((entity) => entity.type))].sort(),
    [sessionEntities],
  );
  const filtered = useMemo(
    () => (normalized
      ? sessionEntities.filter((entity) => {
        const haystack = `${entity.name} ${entity.description ?? ''}`.toLowerCase();
        const queryMatch = haystack.includes(normalized);
        const typeMatch = typeFilter === 'all' || entity.type === typeFilter;
        return queryMatch && typeMatch;
      })
      : sessionEntities.filter((entity) => typeFilter === 'all' || entity.type === typeFilter)),
    [sessionEntities, normalized, typeFilter],
  );

  return (
    <div className="flex h-full flex-col gap-3 p-2">
      <div className="rounded-xl border border-surface-200 bg-white p-2 shadow-sm">
        <label className="flex items-center gap-2 rounded-lg border border-surface-200 bg-surface-50 px-2.5 py-2">
          <Search className="h-3.5 w-3.5 text-surface-400" />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Szukaj po wszystkim w sesji..."
            className="w-full bg-transparent text-sm outline-none placeholder:text-surface-400"
            autoFocus
          />
        </label>
        <div className="mt-2 flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => setTypeFilter('all')}
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold transition-colors ${
              typeFilter === 'all'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-surface-600 ring-1 ring-inset ring-surface-200 hover:bg-surface-50'
            }`}
          >
            Wszystkie
          </button>
          {availableTypes.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setTypeFilter(type)}
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold transition-colors ${
                typeFilter === type
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-surface-600 ring-1 ring-inset ring-surface-200 hover:bg-surface-50'
              }`}
            >
              {getEntityTypeLabel(type)}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="rounded-xl border border-surface-200 bg-white p-3 text-sm text-surface-500 shadow-sm">
            {normalized ? 'Brak wyników dla tego zapytania.' : 'Brak encji przypiętych do sesji.'}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-2">
            {filtered.map((entity) => {
              const path = getEntityDetailPath(entity.type, entity.id);
              const badgeClasses = getEntityTypeBadgeClasses(entity.type);
              const typeLabel = getEntityTypeLabel(entity.type);
              const canPin = entity.type === 'npc' || entity.type === 'thread' || entity.type === 'threat';
              const isPinned = entity.type === 'npc'
                ? sceneNpcIdSet.has(entity.id)
                : openCardSet.has(entity.id);
              const canPreview = entity.type !== 'session' && entity.type !== 'event' && entity.type !== 'faction';
              const cardClass = isPinned
                ? 'rounded-xl border border-primary-200 bg-primary-50/35 p-3 shadow-sm transition-colors hover:border-primary-300 hover:bg-primary-50/60'
                : 'rounded-xl border border-surface-200 bg-white p-3 shadow-sm transition-colors hover:border-primary-300 hover:bg-primary-50/40';
              const content = (
                <>
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${badgeClasses}`}>
                      {typeLabel}
                    </span>
                    <div className="flex items-center gap-1">
                      {canPin && (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            void (async () => {
                              if (entity.type === 'npc') {
                                try {
                                  if (isPinned) {
                                    await setNpcCurrentLocation(db, entity.id, null);
                                  } else {
                                    const targetLocationId = currentLocationId ?? (await ensureSessionDraftLocation(db, sessionId)).id;
                                    await setNpcCurrentLocation(db, entity.id, targetLocationId, sessionId);
                                  }
                                } catch {
                                  toast.error('Nie udało się zaktualizować obecności postaci na scenie');
                                }
                                return;
                              }
                              if (isPinned) closeCard(entity.id);
                              else openCard(entity.id);
                            })();
                          }}
                          className={`rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${
                            isPinned
                              ? 'border-primary-200 bg-primary-50 text-primary-700'
                              : 'border-surface-200 bg-white text-surface-600 hover:border-primary-200 hover:text-primary-700'
                          }`}
                          title={isPinned ? 'Odepnij ze sceny' : 'Przypnij do sceny'}
                        >
                          <span className="inline-flex items-center gap-1">
                            {isPinned ? <MapPinOff className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
                            {isPinned ? 'Odepnij' : 'Przypnij'}
                          </span>
                        </button>
                      )}
                      {canPreview && (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            if (entity.type !== 'session' && entity.type !== 'event' && entity.type !== 'faction') {
                              setPreview({ type: entity.type, id: entity.id });
                            }
                          }}
                          className="rounded-md border border-surface-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-surface-600 hover:border-primary-200 hover:text-primary-700"
                          title="Szybki podgląd"
                        >
                          <span className="inline-flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            Podgląd
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="truncate text-sm font-semibold text-surface-900">{entity.name}</p>
                  {entity.description && (
                    <p className="mt-1 line-clamp-2 text-xs text-surface-500">{entity.description}</p>
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
        <NpcPreviewModal npcId={preview.id} sessionId={sessionId} onClose={() => setPreview(null)} />
      )}
      {preview?.type === 'location' && (
        <LocationPreviewModal locationId={preview.id} sessionId={sessionId} onClose={() => setPreview(null)} />
      )}
      {preview?.type === 'threat' && (
        <ThreatPreviewModal threatId={preview.id} sessionId={sessionId} onClose={() => setPreview(null)} />
      )}
      {preview && preview.type !== 'npc' && preview.type !== 'location' && preview.type !== 'threat' && (
        <EntityPreviewModal
          entityId={preview.id}
          entityType={preview.type}
          sessionId={sessionId}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  );
}
