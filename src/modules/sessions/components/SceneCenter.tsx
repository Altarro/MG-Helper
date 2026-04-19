import { useLiveQuery } from 'dexie-react-hooks';
import { useCampaign } from '@shared/db/CampaignContext';
import { Link } from 'react-router';
import { LocationBreadcrumb } from './LocationBreadcrumb';
import { ThreatSceneCard, LocationSceneCard } from './SceneCards';
import { useState, useEffect, useImperativeHandle, forwardRef, useRef, useCallback } from 'react';
import { AlertTriangle, Eye, Ear, Wind, Hand, ExternalLink, X, Maximize2, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { LOCATION_TYPE_LABELS } from '@modules/locations/types';
import { isNpc } from '@modules/npcs/types';
import { THREAD_KIND_LABELS } from '@modules/threads/types';
import { isPlayerNpc } from '@shared/utils/entityData';
import type { Entity } from '@shared/types';
import {
  useContainedNpcIds,
  useDraftSceneNpcs,
  useLiveLocation,
} from '../hooks/useLiveSessionQueries';
import { createNamedSceneFromDraft } from '../utils/liveSessionCommands';

const DANGER_LABELS = ['Bezpieczna', 'Spokojnie', 'Umiarkowane', 'Niebezpiecznie', 'Śmiertelnie', 'Apokaliptyczne'];
const DANGER_COLORS = [
  'text-green-700 bg-green-100',
  'text-lime-700 bg-lime-100',
  'text-yellow-700 bg-yellow-100',
  'text-orange-700 bg-orange-100',
  'text-red-700 bg-red-100',
  'text-purple-700 bg-purple-100',
];

function LocationInfoCard({ locationId }: { locationId: string }) {
  const location = useLiveLocation(locationId);
  if (!location) return null;

  const { locationType, danger, senses } = location.data;
  const hasSenses = senses.see || senses.hear || senses.smell || senses.feel;

  return (
    <>
      {/* Name row */}
      <div className="flex items-center gap-2 flex-wrap border-b border-surface-100 bg-white px-5 py-2">
        <h2 className="text-base font-bold text-surface-900 truncate">{location.name}</h2>
        <span className="shrink-0 rounded-full bg-surface-100 px-2.5 py-0.5 text-xs text-surface-500">
          {LOCATION_TYPE_LABELS[locationType]}
        </span>
        {danger > 0 && (
          <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${DANGER_COLORS[danger] ?? ''}`}>
            ⚠ {DANGER_LABELS[danger]}
          </span>
        )}
        {location.tags.map((tag) => (
          <span key={tag} className="rounded-full bg-surface-100 px-2 py-0.5 text-[11px] text-surface-400">{tag}</span>
        ))}
      </div>

      {/* Description */}
      {location.description && (
        <div
          className="prose prose-sm max-w-none border-b border-surface-100 bg-white px-5 py-2.5 text-surface-700"
          dangerouslySetInnerHTML={{ __html: location.description }}
        />
      )}

      {/* Senses */}
      {hasSenses && (
        <div className="flex flex-wrap gap-x-8 gap-y-2 border-b border-surface-200 bg-surface-50 px-5 py-3">
          {senses.see && (
            <div className="flex items-start gap-1.5">
              <Eye className="mt-0.5 h-3.5 w-3.5 shrink-0 text-surface-400" />
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-surface-400">Widzisz</p>
                <p className="text-sm text-surface-700">{senses.see}</p>
              </div>
            </div>
          )}
          {senses.hear && (
            <div className="flex items-start gap-1.5">
              <Ear className="mt-0.5 h-3.5 w-3.5 shrink-0 text-surface-400" />
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-surface-400">Słyszysz</p>
                <p className="text-sm text-surface-700">{senses.hear}</p>
              </div>
            </div>
          )}
          {senses.smell && (
            <div className="flex items-start gap-1.5">
              <Wind className="mt-0.5 h-3.5 w-3.5 shrink-0 text-surface-400" />
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-surface-400">Czujesz</p>
                <p className="text-sm text-surface-700">{senses.smell}</p>
              </div>
            </div>
          )}
          {senses.feel && (
            <div className="flex items-start gap-1.5">
              <Hand className="mt-0.5 h-3.5 w-3.5 shrink-0 text-surface-400" />
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-surface-400">Atmosfera</p>
                <p className="text-sm text-surface-700">{senses.feel}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

function NpcDetailModal({ npcId, sessionId, onClose }: { npcId: string; sessionId: string; onClose: () => void }) {
  const { db } = useCampaign();
  const npc = useLiveQuery(() => db.entities.get(npcId), [db, npcId]);
  if (!npc || !isNpc(npc)) return null;
  const data = npc.data;
  const isPC = isPlayerNpc(npc);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Szczegóły NPC ${npc.name}`}
        className="relative w-full max-w-md rounded-2xl border border-surface-200 bg-white shadow-xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-surface-100 px-5 py-3">
          {isPC && <span className="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">Gracz</span>}
          <h2 className="flex-1 truncate text-base font-bold text-surface-900">{npc.name}</h2>
          <Link
            to={`/npcs/${npc.id}`}
            state={{ returnToSessionLive: sessionId }}
            className="text-surface-400 hover:text-surface-600"
            onClick={onClose}
            aria-label="Otwórz pełny detal NPC"
          >
            <ExternalLink className="h-4 w-4" />
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label="Zamknij detal NPC"
            className="text-surface-400 hover:text-surface-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex flex-col gap-3 px-5 py-4 text-sm">
          {data.playerName && <p className="text-surface-500 italic">{data.playerName}</p>}
          {npc.description && (
            <div
              className="prose prose-sm max-w-none text-surface-700"
              dangerouslySetInnerHTML={{ __html: npc.description }}
            />
          )}
          {data.instinct && (
            <div><span className="font-semibold text-surface-600">Instynkt: </span><span className="text-surface-700">{data.instinct}</span></div>
          )}
          {data.motivation && (
            <div><span className="font-semibold text-surface-600">Motywacja: </span><span className="text-surface-700">{data.motivation}</span></div>
          )}
          {data.appearance && (
            <div><span className="font-semibold text-surface-600">Wygląd: </span><span className="text-surface-700">{data.appearance}</span></div>
          )}
          {data.playStyle && (
            <div><span className="font-semibold text-surface-600">Odgrywanie: </span><span className="text-surface-700">{data.playStyle}</span></div>
          )}
        </div>
      </div>
    </div>
  );
}

function NpcInlineCard({ npcId, sessionId, onClose }: { npcId: string; sessionId: string; onClose: () => void }) {
  const { db } = useCampaign();
  const npc = useLiveQuery(() => db.entities.get(npcId), [db, npcId]);
  const [expanded, setExpanded] = useState(false);
  if (!npc || !isNpc(npc)) return null;
  const data = npc.data;
  const isPC = isPlayerNpc(npc);

  return (
    <>
      {expanded && <NpcDetailModal npcId={npcId} sessionId={sessionId} onClose={() => setExpanded(false)} />}
      <div
        className="flex shrink-0 flex-col rounded-2xl border border-surface-200/90 bg-white shadow-sm transition-shadow hover:shadow-md"
        style={{ width: 'calc(25% - 22px)', minWidth: '190px' }}
      >
        <div className="flex select-none items-center gap-1.5 rounded-t-2xl border-b border-surface-100 bg-surface-50 px-3 py-2">
          {isPC && <span className="shrink-0 rounded-full bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700">Gracz</span>}
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-surface-800">{npc.name}</span>
          <button onClick={() => setExpanded(true)} className="text-surface-400 hover:text-surface-600" title="Rozwiń">
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
          <button onClick={onClose} className="text-surface-400 hover:text-surface-600">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex flex-col gap-1.5 px-3 py-3 text-sm">
          {data.playerName && <p className="text-surface-500 italic">{data.playerName}</p>}
          {data.instinct && (
            <div><span className="font-medium text-surface-600">Instynkt: </span><span className="text-surface-800">{data.instinct}</span></div>
          )}
          {data.motivation && (
            <div><span className="font-medium text-surface-600">Motywacja: </span><span className="text-surface-800">{data.motivation}</span></div>
          )}
          {data.playStyle && (
            <div><span className="font-medium text-surface-600">Odgrywanie: </span><span className="text-surface-800">{data.playStyle}</span></div>
          )}
        </div>
      </div>
    </>
  );
}

function NpcScrollRow({ npcIds, sessionId, onClose }: { npcIds: string[]; sessionId: string; onClose: (id: string) => void }) {
  const rowRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ startX: number; scrollLeft: number } | null>(null);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const el = rowRef.current;
    if (!el) return;
    if (e.target instanceof Element && e.target.closest('button, a, input, textarea, select, [role="button"]')) {
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { startX: e.clientX, scrollLeft: el.scrollLeft };
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current || !rowRef.current) return;
    rowRef.current.scrollLeft = drag.current.scrollLeft - (e.clientX - drag.current.startX);
  }, []);

  const onPointerUp = useCallback(() => { drag.current = null; }, []);

  return (
    <div
      ref={rowRef}
      className="npc-scroll-row flex gap-4 overflow-x-auto px-5 pt-5 pb-2 cursor-grab select-none active:cursor-grabbing"
      style={{ scrollbarWidth: 'none' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {npcIds.map((id) => (
        <NpcInlineCard key={id} npcId={id} sessionId={sessionId} onClose={() => onClose(id)} />
      ))}
    </div>
  );
}

function ThreadInlineCard({ thread }: { thread: Entity }) {
  const threadKind = (thread.data.kind as keyof typeof THREAD_KIND_LABELS | undefined) ?? 'side';
  return (
    <div
      className="flex shrink-0 flex-col rounded-2xl border border-surface-200/90 bg-white shadow-sm transition-shadow hover:shadow-md"
      style={{ width: 'calc(25% - 22px)', minWidth: '190px' }}
    >
      <div className="flex select-none items-center gap-1.5 rounded-t-2xl border-b border-surface-100 bg-surface-50 px-3 py-2">
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-surface-800">{thread.name}</span>
        <span className="shrink-0 rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-medium text-violet-700">
          {THREAD_KIND_LABELS[threadKind]}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 px-3 py-3 text-sm">
        {thread.description ? (
          <p className="line-clamp-3 text-surface-700">{thread.description}</p>
        ) : (
          <p className="text-surface-400">Wątek przypięty do sceny.</p>
        )}
      </div>
    </div>
  );
}

function ThreadScrollRow({ threads }: { threads: Entity[] }) {
  const rowRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ startX: number; scrollLeft: number } | null>(null);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const el = rowRef.current;
    if (!el) return;
    if (e.target instanceof Element && e.target.closest('button, a, input, textarea, select, [role="button"]')) {
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { startX: e.clientX, scrollLeft: el.scrollLeft };
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current || !rowRef.current) return;
    rowRef.current.scrollLeft = drag.current.scrollLeft - (e.clientX - drag.current.startX);
  }, []);

  const onPointerUp = useCallback(() => { drag.current = null; }, []);

  return (
    <div
      ref={rowRef}
      className="thread-scroll-row flex gap-4 overflow-x-auto px-5 pt-3 pb-2 cursor-grab select-none active:cursor-grabbing"
      style={{ scrollbarWidth: 'none' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {threads.map((thread) => (
        <ThreadInlineCard key={thread.id} thread={thread} />
      ))}
    </div>
  );
}

interface SceneCenterProps {
  sessionId: string;
  currentLocationId: string | null;
  openCardIds: string[];
  onLocationChange: (id: string | null) => void;
  onCloseCard: (id: string) => void;
  onOpenLocationPicker: () => void;
}

export interface SceneCenterHandle {
  openNameScene: () => void;
}

export const SceneCenter = forwardRef<SceneCenterHandle, SceneCenterProps>(function SceneCenter({
  sessionId,
  currentLocationId,
  openCardIds,
  onLocationChange,
  onCloseCard,
  onOpenLocationPicker,
}, ref) {
  const { db } = useCampaign();
  const [showNameScene, setShowNameScene] = useState(false);
  const [sceneName, setSceneName] = useState('');
  const [sceneNameSaving, setSceneNameSaving] = useState(false);
  // pendingChange: location id to navigate to after naming (null id = "Pusta scena"), undefined = no pending navigation
  const [pendingChange, setPendingChange] = useState<{ id: string | null } | undefined>(undefined);

  const draftSceneNpcs = useDraftSceneNpcs(sessionId);
  const sceneNpcIds = useContainedNpcIds(currentLocationId);
  const [closedNpcIds, setClosedNpcIds] = useState<Set<string>>(new Set());

  // Reset closed cards when location changes
  useEffect(() => {
    setClosedNpcIds(new Set());
  }, [currentLocationId]);

  function handleCloseNpcCard(id: string) {
    setClosedNpcIds((prev) => new Set([...prev, id]));
  }

  const visibleSceneNpcIds = (currentLocationId === null
    ? draftSceneNpcs.map((n) => n.id)
    : sceneNpcIds
  ).filter((id) => !closedNpcIds.has(id));
  const currentLocation = useLiveLocation(currentLocationId);

  useImperativeHandle(ref, () => ({
    openNameScene: () => setShowNameScene(true),
  }));

  // When a real location becomes active, dismiss the banner
  useEffect(() => {
    if (currentLocationId !== null) {
      setShowNameScene(false);
      setSceneName('');
      setPendingChange(undefined);
    }
  }, [currentLocationId]);

  // When the draft scene is emptied, close the naming prompt
  useEffect(() => {
    if (draftSceneNpcs.length === 0) {
      setShowNameScene(false);
      setSceneName('');
    }
  }, [draftSceneNpcs.length]);

  // Load entity types to decide which card to render
  const openEntities = useLiveQuery(async () => {
    if (openCardIds.length === 0) return new Map<string, Entity>();
    const entities = await db.entities.where('id').anyOf(openCardIds).toArray();
    return new Map(entities.map((e) => [e.id, e]));
  }, [db, openCardIds]) ?? new Map<string, Entity>();
  const openSceneThreads = openCardIds
    .map((entityId) => openEntities.get(entityId))
    .filter((entity): entity is Entity => entity !== undefined && entity.type === 'thread');

  function handleWrappedLocationChange(id: string | null) {
    if (id === currentLocationId) return;

    // If the empty scene already has NPCs on it, require naming before leaving
    if (currentLocationId === null && draftSceneNpcs.length > 0) {
      setPendingChange({ id });
      setShowNameScene(true);
      return;
    }
    onLocationChange(id);
  }

  async function handleNameScene() {
    const trimmed = sceneName.trim();
    if (!trimmed) return;
    setSceneNameSaving(true);
    try {
      const location = await createNamedSceneFromDraft(db, sessionId, trimmed);
      toast.success(`Scena „${trimmed}" zapisana`);
      setShowNameScene(false);
      setSceneName('');
      const nextId = pendingChange !== undefined ? pendingChange.id : location.id;
      setPendingChange(undefined);
      onLocationChange(nextId);
    } catch {
      toast.error('Nie udało się zapisać sceny');
    } finally {
      setSceneNameSaving(false);
    }
  }

  function handleSkipNaming() {
    setShowNameScene(false);
    setSceneName('');
    setPendingChange(undefined);
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Location breadcrumb + quick add row */}
      <div className="flex items-center gap-3 border-b border-surface-200 bg-white/90 px-4 py-2 backdrop-blur-sm">
        <LocationBreadcrumb
          sessionId={sessionId}
          currentLocationId={currentLocationId}
          onSelect={handleWrappedLocationChange}
        />
        <button
          type="button"
          onClick={onOpenLocationPicker}
          className="ml-auto inline-flex items-center gap-1 rounded-md bg-green-50 px-2 py-1 text-xs text-green-700 transition-colors hover:bg-green-100"
        >
          <MapPin className="h-3 w-3" />
          <span className="font-medium">Lokacja kampanii:</span>
          <span className="max-w-[220px] truncate">{currentLocation?.name ?? 'Pusta scena'}</span>
        </button>
      </div>

      {/* Location info panel — flat, below breadcrumb */}
      {currentLocationId && <LocationInfoCard locationId={currentLocationId} />}

      {/* Canvas — NPC cards + floating cards */}
      <div className="relative flex-1 overflow-y-auto overflow-x-hidden bg-gradient-to-b from-surface-50 to-surface-100/70">
        {/* Draft-scene banner: empty scene has NPCs and must be named before leaving */}
        {currentLocationId === null && draftSceneNpcs.length > 0 && (
          <div className="mx-4 mt-3">
            {showNameScene ? (
              <form
                onSubmit={(e) => { e.preventDefault(); void handleNameScene(); }}
                className="flex items-center gap-2 rounded-xl border border-primary-200 bg-white p-3 shadow-sm"
              >
                <span className="shrink-0 text-xs font-semibold text-primary-800">
                  Nazwij tę lokację ({draftSceneNpcs.length}{' '}
                  {draftSceneNpcs.length === 1 ? 'postać' : 'postaci'}):
                </span>
                <input
                  autoFocus
                  value={sceneName}
                  onChange={(e) => setSceneName(e.target.value)}
                  placeholder="Nazwa lokacji/sceny…"
                  className="flex-1 rounded border border-primary-300 px-2 py-1 text-sm focus:border-primary-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!sceneName.trim() || sceneNameSaving}
                  className="rounded-md bg-primary-600 px-3 py-1 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-50"
                >
                  {sceneNameSaving ? '…' : 'Zapisz'}
                </button>
                <button
                  type="button"
                  onClick={handleSkipNaming}
                  className="rounded-md border border-surface-300 px-3 py-1 text-xs text-surface-700 hover:bg-surface-50"
                >
                  Anuluj
                </button>
              </form>
            ) : (
              <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-2 text-xs text-amber-800 shadow-sm">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                <span>
                  {draftSceneNpcs.length === 1
                    ? 'Na pustej scenie jest 1 postać.'
                    : `Na pustej scenie jest ${draftSceneNpcs.length} postaci.`}
                </span>
                <button
                  type="button"
                  onClick={() => setShowNameScene(true)}
                  className="ml-1 font-medium underline hover:no-underline"
                >
                  Nazwij lokację →
                </button>
              </div>
            )}
          </div>
        )}
        {/* Inline NPC scene cards — horizontal drag-scroll */}
        {visibleSceneNpcIds.length > 0 && (
          <>
            <div className="px-5 pt-4 pb-0">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-surface-400">Postacie</span>
            </div>
            <NpcScrollRow npcIds={visibleSceneNpcIds} sessionId={sessionId} onClose={handleCloseNpcCard} />
          </>
        )}
        {openSceneThreads.length > 0 && (
          <>
            <div className="px-5 pt-3 pb-0">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-surface-400">Wątki</span>
            </div>
            <ThreadScrollRow threads={openSceneThreads} />
          </>
        )}

        {visibleSceneNpcIds.length === 0 && openSceneThreads.length === 0 && openCardIds.length === 0 && !(currentLocationId === null && draftSceneNpcs.length > 0) && (
          <div className="flex h-full items-center justify-center select-none">
            <p className="text-sm text-surface-400">
              Brak elementów na scenie. Dodaj postać lub wątek z panelu po prawej.
            </p>
          </div>
        )}
      </div>

      {/* Floating cards — threats and locations only */}
      {openCardIds.map((id, idx) => {
        const entity = openEntities.get(id);
        if (!entity) return null;
        if (entity.type === 'npc') return null;
        const ix = 64 + idx * 24;
        const iy = 80 + idx * 24;
        if (entity.type === 'threat')
          return <ThreatSceneCard key={id} threatId={id} onClose={() => onCloseCard(id)} initialX={ix} initialY={iy} />;
        if (entity.type === 'location')
          return <LocationSceneCard key={id} locationId={id} sessionId={sessionId} onClose={() => onCloseCard(id)} initialX={ix} initialY={iy} />;
        return null;
      })}
    </div>
  );
});
