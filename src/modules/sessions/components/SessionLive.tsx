import { useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowLeft, BookOpen, Zap, StopCircle, ChevronLeft, ChevronUp } from 'lucide-react';
import { DndContext, DragOverlay } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import type { NpcDragData } from '@shared/components/DraggableNpcChip';
import type { SpotlightState } from '../types';
import { useSessionById } from '../hooks/useSessionById';
import {
  useLiveSessionState,
  setLiveSessionMarker,
  clearLiveSessionMarker,
  clearLiveSessionState,
  getLiveSessionMarker,
} from '../hooks/useLiveSessionState';
import { DetailNotFound } from '@shared/components/DetailNotFound';
import { LoadingSpinner } from '@shared/components/LoadingSpinner';
import { ConfirmDialog } from '@shared/components/ConfirmDialog';
import { Modal } from '@shared/components/Modal';
import { useCampaign } from '@shared/db/CampaignContext';
import { SceneCenter } from './SceneCenter';
import type { SceneCenterHandle } from './SceneCenter';
import { SpotlightTracker } from './SpotlightTracker';
import { SessionNowPlayingPanel } from './SessionNowPlayingPanel';
import { SessionTimeline } from './SessionTimeline';
import { SessionNpcPanel } from './SessionNpcPanel';
import { ThreadTreePanel } from './ThreadTreePanel';
import { ActiveThreatsPanel } from './ActiveThreatsPanel';
import { LocationPickerModal } from './LocationPickerModal';
import { SessionSearchPanel } from './SessionSearchPanel';
import { SessionCluesPanel } from './SessionCluesPanel';
import { SessionInspirationsPanel } from './SessionInspirationsPanel';
import { QuickNotePanel } from '@modules/notes/components/QuickNotePanel';
import { useCurrentSceneNpcIds } from '../hooks/useLiveSessionQueries';
import { toast } from 'sonner';
import { ensureEntityAppearsInSession, moveNpcToLocation } from '../utils/liveSessionCommands';
import { addEntity, addRelation, updateEntity } from '@shared/db/operations';
import { getSessionLifecycleStatus, isSession, type SessionData } from '../types';
import {
  buildCleanupPendingSessionData,
  formatSessionLabel,
  getBlockingCleanupSession,
} from '../utils/sessionLifecycle';

const DEFAULT_SPOTLIGHT: SpotlightState = {
  mgActive: false,
  mgTimer: { elapsed: 0, startedAt: null },
  mgTotalActiveTimer: { elapsed: 0, startedAt: null },
  players: [],
  isPaused: false,
  sessionStarted: false,
};

function timerNowSec(timer: { elapsed: number; startedAt: string | null }): number {
  if (!timer.startedAt) return timer.elapsed;
  return timer.elapsed + Math.max(0, Math.floor((Date.now() - Date.parse(timer.startedAt)) / 1000));
}

const RAIL_SECTIONS = [
  ['threats', 'Zagrożenia'],
  ['notes', 'Notatki'],
  ['npcs', 'Postacie'],
  ['threads', 'Wątki'],
  ['clues', 'Wskazówki'],
  ['inspirations', 'Inspiracje'],
  ['search', 'Wyszukaj'],
] as const;

export function SessionLive() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { session } = useSessionById(id);
  const { db, campaignId } = useCampaign();

  const {
    currentLocationId,
    openCardIds,
    spotlightState,
    setCurrentLocationId,
    openCard,
    closeCard,
    setSpotlightState,
  } = useLiveSessionState(id ?? '');

  const [confirmEnd, setConfirmEnd] = useState(false);
  const [activeNpcDrag, setActiveNpcDrag] = useState<NpcDragData | null>(null);
  const sceneCenterRef = useRef<SceneCenterHandle>(null);
  const [openSection, setOpenSection] = useState<
    'npcs' | 'threads' | 'threats' | 'notes' | 'clues' | 'inspirations' | 'search' | null
  >(null);
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
  const [railHovered, setRailHovered] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [sessionClockModalOpen, setSessionClockModalOpen] = useState(false);
  const [sessionClockName, setSessionClockName] = useState('');
  const [sessionClockSegments, setSessionClockSegments] = useState<4 | 6>(4);
  const [sessionClockSaving, setSessionClockSaving] = useState(false);
  const [lifecycleUndoStack, setLifecycleUndoStack] = useState<
    Array<Array<{ entityId: string; prevData: Record<string, unknown> }>>
  >([]);
  const panelScrollRef = useRef<HTMLDivElement | null>(null);
  const panelDragRef = useRef<{ startY: number; scrollTop: number } | null>(null);
  const railButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const sessionIdForHooks = session?.id ?? id ?? '';

  const sceneNpcIds = useCurrentSceneNpcIds(sessionIdForHooks, currentLocationId);
  const sceneThreadIds =
    useLiveQuery(async () => {
      if (openCardIds.length === 0) return [] as string[];
      const entities = await db.entities.where('id').anyOf(openCardIds).toArray();
      return entities.filter((entity) => entity.type === 'thread').map((entity) => entity.id);
    }, [db, openCardIds]) ?? [];
  const blockingCleanupSession = useLiveQuery(async () => {
    const all = await db.entities.where('type').equals('session').toArray();
    return getBlockingCleanupSession(all.filter(isSession), session?.id ?? id);
  }, [db, id, session?.id]);

  useEffect(() => {
    if (!session || !id) return;
    const title = session.name || `Sesja ${session.data.number}`;
    setLiveSessionMarker({ sessionId: id, sessionName: title, isPaused: false, campaignId });
  }, [campaignId, id, session]);

  useEffect(() => {
    if (session !== null || !id) return;
    const marker = getLiveSessionMarker();
    if (marker?.sessionId !== id) return;
    clearLiveSessionMarker();
    clearLiveSessionState(id);
  }, [session, id]);

  useEffect(() => {
    if (!session || !id) return;
    if (blockingCleanupSession) {
      const blockedTitle = formatSessionLabel(blockingCleanupSession);
      toast.error(
        `Dokończ najpierw sprzątanie: ${blockedTitle}. Start nowej sesji na żywo jest zablokowany.`,
      );
      void navigate(`/sessions/${blockingCleanupSession.id}/cleanup`);
      return;
    }

    if (getSessionLifecycleStatus(session.data as SessionData) !== 'live') {
      void updateEntity(db, session.id, {
        data: {
          ...session.data,
          status: 'live',
        },
      });
    }
  }, [blockingCleanupSession, db, id, navigate, session]);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      setOpenSection(null);
      setRailHovered(false);
      setLocationPickerOpen(false);
      setConfirmEnd(false);
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  async function handleDragEnd(event: DragEndEvent) {
    setActiveNpcDrag(null);
    const { active, over } = event;
    if (!over || !id) return;
    const dragData = active.data.current as NpcDragData | undefined;
    if (dragData?.type !== 'npc') return;
    const overData = over.data.current as { sessionId?: string; locationId?: string } | undefined;

    if (overData?.sessionId === id) {
      const { npcId, npcName } = dragData;
      try {
        const added = await ensureEntityAppearsInSession(db, npcId, id);
        if (added) {
          toast.success(`${npcName} dodany do sesji`);
        }
      } catch {
        toast.error('Nie udało się dodać do sesji');
      }
      return;
    }

    if (overData?.locationId) {
      const toLocationId = overData.locationId;
      const { npcId, npcName, fromLocationId } = dragData;
      if (toLocationId === fromLocationId) return;
      try {
        await moveNpcToLocation(db, { npcId, toLocationId, fromLocationId, sessionId: id });
        setCurrentLocationId(toLocationId);
        const toLoc = await db.entities.get(toLocationId);
        toast.success(`${npcName} przeniesiony do ${toLoc?.name ?? 'lokacji'}`);
      } catch {
        toast.error('Nie udało się przenieść postaci');
      }
    }
  }

  async function handleEndSession() {
    if (!id || !session) return;
    if (blockingCleanupSession && blockingCleanupSession.id !== session.id) {
      toast.error(`Najpierw dokończ sprzątanie: ${formatSessionLabel(blockingCleanupSession)}.`);
      navigate(`/sessions/${blockingCleanupSession.id}/cleanup`);
      return;
    }
    const spotlightSnapshot = spotlightState ?? DEFAULT_SPOTLIGHT;
    const nowIso = new Date().toISOString();
    const spotlightSummary = {
      capturedAt: nowIso,
      mgTotalActiveSec: timerNowSec(spotlightSnapshot.mgTotalActiveTimer),
      mgWaitSec: timerNowSec(spotlightSnapshot.mgTimer),
      players: spotlightSnapshot.players.map((player) => ({
        id: player.id,
        name: player.name,
        playerName: player.playerName,
        totalActiveSec: timerNowSec(player.totalActiveTimer),
        waitSec: timerNowSec(player.waitTimer),
      })),
    };
    await updateEntity(db, session.id, {
      data: buildCleanupPendingSessionData(
        session.data,
        spotlightSummary,
        nowIso,
      ) as unknown as Record<string, unknown>,
    });
    clearLiveSessionMarker();
    clearLiveSessionState(id);
    navigate(`/sessions/${id}/cleanup`);
  }

  async function handleUndoLifecycleChange() {
    const snapshotBatch = lifecycleUndoStack[lifecycleUndoStack.length - 1];
    if (!snapshotBatch || snapshotBatch.length === 0) return;
    try {
      for (let i = snapshotBatch.length - 1; i >= 0; i -= 1) {
        const snapshot = snapshotBatch[i];
        if (!snapshot) continue;
        await updateEntity(db, snapshot.entityId, {
          data: snapshot.prevData,
        });
      }
      setLifecycleUndoStack((prev) => prev.slice(0, -1));
      toast.success('Cofnięto ostatnią zmianę lifecycle.');
    } catch {
      toast.error('Nie udało się cofnąć zmiany lifecycle.');
    }
  }

  async function handleCreateSessionClock() {
    if (!session || !id) return;
    const trimmed = sessionClockName.trim();
    if (!trimmed) return;
    setSessionClockSaving(true);
    try {
      const clock = await addEntity(db, {
        type: 'clock',
        name: trimmed,
        description: '',
        tags: ['sesyjny'],
        data: {
          kind: 'session',
          segments: sessionClockSegments,
          filled: 0,
          tickLabels: [],
          isActive: true,
        },
      });
      await addRelation(db, { type: 'appears_in', sourceId: clock.id, targetId: id });
      toast.success(`Dodano zegar sesyjny: ${trimmed}`);
      setSessionClockModalOpen(false);
      setSessionClockName('');
      setSessionClockSegments(4);
    } catch {
      toast.error('Nie udało się dodać zegara sesyjnego.');
    } finally {
      setSessionClockSaving(false);
    }
  }

  const handlePanelPointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const element = panelScrollRef.current;
    if (!element) return;
    if (
      event.target instanceof Element &&
      event.target.closest('button, a, input, textarea, select, label, [role="button"]')
    ) {
      return;
    }
    element.setPointerCapture(event.pointerId);
    panelDragRef.current = { startY: event.clientY, scrollTop: element.scrollTop };
  }, []);

  const handlePanelPointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const element = panelScrollRef.current;
    if (!element || !panelDragRef.current) return;
    element.scrollTop =
      panelDragRef.current.scrollTop - (event.clientY - panelDragRef.current.startY);
  }, []);

  const handlePanelPointerUp = useCallback(() => {
    panelDragRef.current = null;
  }, []);

  const handlePanelScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    setShowScrollTop(event.currentTarget.scrollTop > 180);
  }, []);

  const handleScrollToTop = useCallback(() => {
    panelScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  if (session === undefined) return <LoadingSpinner />;

  if (!session) {
    return (
      <DetailNotFound
        icon={BookOpen}
        title="Sesja nie znaleziona"
        description="Mogła zostać usunięta albo odnośnik jest nieaktualny."
        to="/sessions"
        linkLabel="Wróć do listy sesji"
      />
    );
  }

  const title = session.name || `Sesja ${session.data.number}`;

  function panelTitle(section: NonNullable<typeof openSection>): string {
    if (section === 'npcs') return 'Postacie';
    if (section === 'threads') return 'Wątki';
    if (section === 'clues') return 'Wskazówki';
    if (section === 'inspirations') return 'Inspiracje';
    if (section === 'threats') return 'Zagrożenia';
    if (section === 'notes') return 'Notatki';
    return 'Wyszukaj';
  }

  function renderPanelContent(
    section: NonNullable<typeof openSection>,
    sessionId: string,
  ): ReactNode {
    if (section === 'threats') return <ActiveThreatsPanel sessionId={sessionId} />;
    if (section === 'notes') {
      return (
        <QuickNotePanel
          sessionId={sessionId}
          contextLocationId={currentLocationId}
          contextNpcIds={sceneNpcIds}
          contextThreadIds={sceneThreadIds}
        />
      );
    }
    if (section === 'npcs') {
      return (
        <SessionNpcPanel
          sessionId={sessionId}
          currentLocationId={currentLocationId}
          onRequestNameScene={() => sceneCenterRef.current?.openNameScene()}
          onLifecycleSnapshotsCaptured={(snapshots) => {
            if (snapshots.length === 0) return;
            setLifecycleUndoStack((prev) => [...prev, snapshots]);
          }}
        />
      );
    }
    if (section === 'threads') {
      return (
        <ThreadTreePanel
          sessionId={sessionId}
          openCardIds={openCardIds}
          onOpenCard={openCard}
          onCloseCard={closeCard}
        />
      );
    }
    if (section === 'clues') return <SessionCluesPanel sessionId={sessionId} />;
    if (section === 'inspirations') {
      return (
        <SessionInspirationsPanel sessionId={sessionId} currentLocationId={currentLocationId} />
      );
    }
    return (
      <SessionSearchPanel
        sessionId={sessionId}
        canUndoLifecycle={lifecycleUndoStack.length > 0}
        onUndoLastLifecycleChange={() => void handleUndoLifecycleChange()}
        onLifecycleSnapshotsCaptured={(snapshots) => {
          if (snapshots.length === 0) return;
          setLifecycleUndoStack((prev) => [...prev, snapshots]);
        }}
      />
    );
  }

  function closeRightPanel() {
    setOpenSection(null);
    setRailHovered(false);
    setShowScrollTop(false);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
      <section className="app-panel-strong shrink-0 overflow-hidden rounded-[2.1rem] p-0">
        <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_auto]">
          <div className="relative flex min-w-0 items-center gap-4 px-6 py-5 lg:px-8">
            <div className="absolute inset-y-0 left-0 w-1.5 bg-[linear-gradient(180deg,var(--color-warning-500)_0%,var(--color-primary-500)_100%)]" />
            <Link
              to={`/sessions/${id}`}
              className="app-button-secondary text-surface-600 hover:text-primary-800 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition-colors"
              aria-label="Wróć do detalu sesji"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[rgba(242,196,88,0.18)] text-[#9a6710] shadow-[inset_0_1px_0_rgba(255,250,240,0.24)]">
              <Zap className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="mb-1 inline-flex items-center rounded-full border border-[rgba(210,166,67,0.22)] bg-[rgba(242,196,88,0.14)] px-2.5 py-0.5 text-[10px] font-semibold tracking-[0.16em] text-[#8b5b0c] uppercase">
                Live desk
              </div>
              <h1 className="text-primary-900 truncate text-[2rem] leading-none font-semibold tracking-[-0.05em] lg:text-[2.55rem]">
                {title}
              </h1>
              <p className="text-surface-700 mt-2 max-w-[70ch] text-sm leading-6">
                Scena w centrum, narzędzia pod ręką, notatki i zagrożenia w bocznym panelu.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 border-t border-[rgba(86,93,94,0.1)] bg-[rgba(255,250,240,0.11)] px-5 py-4 xl:border-t-0 xl:border-l">
            <button
              type="button"
              onClick={() => setSessionClockModalOpen(true)}
              className="text-primary-800 inline-flex items-center gap-2 rounded-2xl border border-[rgba(33,71,102,0.24)] bg-[rgba(111,146,164,0.1)] px-4 py-3 text-sm font-semibold transition-colors hover:bg-[rgba(111,146,164,0.16)]"
            >
              + Zegar sesyjny
            </button>
            <button
              type="button"
              onClick={() => setConfirmEnd(true)}
              className="text-danger-700 inline-flex items-center gap-2 rounded-2xl border border-[rgba(176,108,103,0.32)] bg-[rgba(176,108,103,0.08)] px-4 py-3 text-sm font-semibold transition-colors hover:bg-[rgba(176,108,103,0.14)]"
            >
              <StopCircle className="h-4 w-4" />
              Zakończ sesję
            </button>
          </div>
        </div>
      </section>

      <DndContext
        onDragStart={(event) => {
          const dragData = event.active.data.current as NpcDragData | undefined;
          if (dragData?.type === 'npc') setActiveNpcDrag(dragData);
        }}
        onDragEnd={(event) => void handleDragEnd(event)}
        onDragCancel={() => setActiveNpcDrag(null)}
      >
        <div className="grid min-h-0 flex-1 grid-cols-[320px_minmax(0,1fr)] gap-4 overflow-hidden px-1 pb-1">
          <aside className="flex min-h-0 flex-col gap-4">
            <div className="app-panel border-l-primary-500/40 min-h-0 flex-[1.88] overflow-hidden rounded-[1.8rem] border-l-2">
              <SessionTimeline sessionId={session.id} />
            </div>
            <div
              className="app-panel border-l-warning-500/50 min-h-0 flex-[1.12] overflow-y-auto rounded-[1.8rem] border-l-2 p-3"
              style={{ scrollbarWidth: 'none' }}
            >
              <SessionNowPlayingPanel
                scenes={Array.isArray(session.data.scenes) ? session.data.scenes : []}
                plannedDurationMin={session.data.plannedDurationMin}
                isPaused={(spotlightState ?? DEFAULT_SPOTLIGHT).isPaused}
              />
              <SpotlightTracker
                sessionId={session.id}
                state={spotlightState ?? DEFAULT_SPOTLIGHT}
                onChange={setSpotlightState}
              />
            </div>
          </aside>

          <div className="app-panel-strong min-h-0 overflow-hidden rounded-[2rem]">
            <SceneCenter
              ref={sceneCenterRef}
              sessionId={session.id}
              currentLocationId={currentLocationId}
              openCardIds={openCardIds}
              onLocationChange={setCurrentLocationId}
              onCloseCard={closeCard}
              onOpenLocationPicker={() => setLocationPickerOpen(true)}
            />
          </div>
        </div>

        <div
          className={`fixed top-1/2 z-[35] -translate-y-1/2 transition-all duration-300 ease-out ${
            openSection ? 'right-[min(26rem,42vw)]' : 'right-0'
          }`}
          onMouseEnter={() => setRailHovered(true)}
          onMouseLeave={() => {
            if (!openSection) setRailHovered(false);
          }}
        >
          {!openSection && <div className="absolute top-[-160px] -right-0 h-[320px] w-5" />}

          {!openSection && !railHovered && (
            <button
              type="button"
              onMouseEnter={() => setRailHovered(true)}
              onClick={() => {
                setRailHovered(true);
              }}
              aria-label="Rozwiń menu boczne"
              className="app-button-secondary text-surface-500 hover:text-primary-700 flex h-12 w-6 items-center justify-center rounded-l-full border-r-0 shadow-[0_10px_24px_rgba(18,45,66,0.14)]"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
          )}

          {(openSection || railHovered) && (
            <div className="flex flex-col gap-2.5">
              {RAIL_SECTIONS.map(([sectionId, label], index) => {
                const active = openSection === sectionId;
                return (
                  <button
                    key={sectionId}
                    ref={(node) => {
                      railButtonRefs.current[index] = node;
                    }}
                    type="button"
                    aria-pressed={active}
                    onKeyDown={(event) => {
                      if (event.key === 'ArrowDown') {
                        event.preventDefault();
                        railButtonRefs.current[(index + 1) % RAIL_SECTIONS.length]?.focus();
                      } else if (event.key === 'ArrowUp') {
                        event.preventDefault();
                        railButtonRefs.current[
                          (index - 1 + RAIL_SECTIONS.length) % RAIL_SECTIONS.length
                        ]?.focus();
                      } else if (event.key === 'Home') {
                        event.preventDefault();
                        railButtonRefs.current[0]?.focus();
                      } else if (event.key === 'End') {
                        event.preventDefault();
                        railButtonRefs.current[RAIL_SECTIONS.length - 1]?.focus();
                      }
                    }}
                    onClick={() => {
                      if (active) {
                        closeRightPanel();
                        return;
                      }
                      setOpenSection(sectionId);
                    }}
                    className={`group relative flex h-9 w-[7.5rem] items-center justify-center overflow-hidden rounded-l-full border border-r-0 px-3 text-center text-[11px] font-semibold tracking-[0.01em] transition-all ${
                      active
                        ? 'border-[rgba(18,45,66,0.2)] bg-[linear-gradient(180deg,var(--color-primary-600)_0%,var(--color-primary-700)_100%)] text-[#f7f3e8] shadow-[0_14px_28px_rgba(18,45,66,0.2)]'
                        : 'app-pill-muted text-surface-700 hover:text-primary-800 border-[rgba(86,93,94,0.14)] bg-[rgba(223,225,218,0.94)] shadow-[0_8px_18px_rgba(18,45,66,0.08)] hover:bg-[rgba(229,231,223,0.98)]'
                    }`}
                  >
                    {!active && (
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(111,146,164,0.04)_0%,rgba(111,146,164,0.16)_100%)] opacity-0 transition-opacity duration-150 group-hover:opacity-100"
                      />
                    )}
                    <span className="relative z-[1]">{label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {openSection && (
          <button
            type="button"
            aria-label="Zamknij panel boczny"
            onClick={closeRightPanel}
            className="fixed inset-0 z-30 bg-black/10 backdrop-blur-[1px]"
          />
        )}

        <div
          className={`fixed top-[5.5rem] right-0 bottom-6 z-[34] flex w-[min(26rem,42vw)] max-w-[calc(100vw-1.25rem)] min-w-[21.5rem] flex-col overflow-hidden rounded-l-[1.8rem] border border-r-0 border-[rgba(86,93,94,0.14)] bg-[linear-gradient(180deg,rgba(223,225,218,0.96)_0%,rgba(210,212,203,0.98)_100%)] shadow-[0_28px_52px_rgba(18,45,66,0.18)] transition-transform duration-300 ease-out ${
            openSection ? 'translate-x-0' : 'translate-x-full'
          } ${openSection ? 'pointer-events-auto' : 'pointer-events-none'}`}
        >
          {openSection && (
            <>
              <div className="flex items-center gap-2 border-b border-[rgba(86,93,94,0.1)] bg-[rgba(223,225,218,0.68)] px-4 py-3">
                <span className="text-primary-900 text-sm font-semibold tracking-[-0.02em]">
                  {panelTitle(openSection)}
                </span>
                <span className="flex-1" />
                <button
                  type="button"
                  onClick={closeRightPanel}
                  className="text-surface-600 hover:text-primary-800 rounded-xl px-3 py-1.5 text-xs font-medium transition-colors hover:bg-[rgba(223,225,218,0.75)]"
                >
                  Zamknij
                </button>
              </div>
              <div
                ref={panelScrollRef}
                className="rail-scroll min-h-0 flex-1 overflow-y-auto px-3.5 py-3.5 pb-10"
                onScroll={handlePanelScroll}
                onPointerDown={handlePanelPointerDown}
                onPointerMove={handlePanelPointerMove}
                onPointerUp={handlePanelPointerUp}
                onPointerCancel={handlePanelPointerUp}
                onPointerLeave={handlePanelPointerUp}
              >
                {renderPanelContent(openSection, session.id)}
              </div>
              {showScrollTop && (
                <button
                  type="button"
                  onClick={handleScrollToTop}
                  aria-label="Przewiń na górę"
                  className="app-button-secondary text-surface-700 absolute right-4 bottom-4 inline-flex h-10 w-10 items-center justify-center rounded-full border-[rgba(33,71,102,0.2)] bg-[rgba(223,225,218,0.9)] shadow-[0_12px_24px_rgba(18,45,66,0.18)]"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
              )}
            </>
          )}
        </div>

        <DragOverlay>
          {activeNpcDrag && (
            <div className="text-primary-900 rounded-full border border-[rgba(33,71,102,0.18)] bg-[rgba(111,146,164,0.2)] px-3 py-1 text-xs font-medium opacity-90 shadow-lg">
              {activeNpcDrag.npcName}
            </div>
          )}
        </DragOverlay>

        {locationPickerOpen && (
          <LocationPickerModal
            sessionId={session.id}
            currentLocationId={currentLocationId}
            onSelect={setCurrentLocationId}
            onClose={() => setLocationPickerOpen(false)}
          />
        )}
      </DndContext>

      <ConfirmDialog
        open={confirmEnd}
        title="Zakończyć sesję?"
        description="Przejdziesz do trybu sprzątania. Sesja nie zostanie usunięta."
        confirmLabel="Zakończ i sprzątaj"
        cancelLabel="Anuluj"
        destructive={false}
        onConfirm={() => void handleEndSession()}
        onCancel={() => setConfirmEnd(false)}
      />
      {sessionClockModalOpen && (
        <Modal title="Nowy zegar sesyjny" onClose={() => setSessionClockModalOpen(false)} size="md">
          <div className="space-y-3">
            <p className="text-surface-600 text-sm">
              Zegar sesyjny działa tylko w bieżącej sesji live (wariant 4 lub 6 segmentów).
            </p>
            <div className="space-y-1">
              <label htmlFor="session-clock-name" className="text-surface-700 text-sm font-medium">
                Nazwa zegara
              </label>
              <input
                id="session-clock-name"
                value={sessionClockName}
                onChange={(event) => setSessionClockName(event.target.value)}
                placeholder="Np. Pościg przez dzielnicę portową"
                className="app-input w-full rounded-xl px-3 py-2 text-sm"
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <label
                htmlFor="session-clock-segments"
                className="text-surface-700 text-sm font-medium"
              >
                Segmenty
              </label>
              <select
                id="session-clock-segments"
                value={sessionClockSegments}
                onChange={(event) => setSessionClockSegments(Number(event.target.value) as 4 | 6)}
                className="app-input w-full rounded-xl px-3 py-2 text-sm"
              >
                <option value={4}>4</option>
                <option value={6}>6</option>
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSessionClockModalOpen(false)}
                className="app-button-secondary rounded-xl px-3 py-2 text-sm"
              >
                Anuluj
              </button>
              <button
                type="button"
                onClick={() => void handleCreateSessionClock()}
                disabled={!sessionClockName.trim() || sessionClockSaving}
                className="app-button-primary rounded-xl px-3 py-2 text-sm disabled:opacity-40"
              >
                {sessionClockSaving ? 'Zapisywanie...' : 'Dodaj zegar'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
