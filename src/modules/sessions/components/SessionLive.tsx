import { useState, useEffect, useRef, type ReactNode } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowLeft, Zap, StopCircle, ChevronLeft } from 'lucide-react';
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
} from '../hooks/useLiveSessionState';
import { LoadingSpinner } from '@shared/components/LoadingSpinner';
import { ConfirmDialog } from '@shared/components/ConfirmDialog';
import { useCampaign } from '@shared/db/CampaignContext';
import { SceneCenter } from './SceneCenter';
import type { SceneCenterHandle } from './SceneCenter';
import { SpotlightTracker } from './SpotlightTracker';
import { SessionTimeline } from './SessionTimeline';
import { SessionNpcPanel } from './SessionNpcPanel';
import { ThreadTreePanel } from './ThreadTreePanel';
import { ActiveThreatsPanel } from './ActiveThreatsPanel';
import { LocationPickerModal } from './LocationPickerModal';
import { SessionSearchPanel } from './SessionSearchPanel';
import { QuickNotePanel } from '@modules/notes/components/QuickNotePanel';
import { useCurrentSceneNpcIds } from '../hooks/useLiveSessionQueries';
import { toast } from 'sonner';
import { ensureEntityAppearsInSession, moveNpcToLocation } from '../utils/liveSessionCommands';

const DEFAULT_SPOTLIGHT: SpotlightState = {
  mgActive: false,
  mgTimer: { elapsed: 0, startedAt: null },
  mgTotalActiveTimer: { elapsed: 0, startedAt: null },
  players: [],
  isPaused: false,
  sessionStarted: false,
};

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
    'npcs' | 'threads' | 'threats' | 'notes' | 'search' | null
  >(null);
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
  const [railHovered, setRailHovered] = useState(false);
  const sessionIdForHooks = session?.id ?? id ?? '';

  const sceneNpcIds = useCurrentSceneNpcIds(sessionIdForHooks, currentLocationId);
  const sceneThreadIds =
    useLiveQuery(async () => {
      if (openCardIds.length === 0) return [] as string[];
      const entities = await db.entities.where('id').anyOf(openCardIds).toArray();
      return entities.filter((entity) => entity.type === 'thread').map((entity) => entity.id);
    }, [db, openCardIds]) ?? [];

  useEffect(() => {
    if (!session || !id) return;
    const title = session.name || `Sesja ${session.data.number}`;
    setLiveSessionMarker({ sessionId: id, sessionName: title, isPaused: false, campaignId });
  }, [campaignId, id, session]);

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
    if (!id) return;
    clearLiveSessionMarker();
    clearLiveSessionState(id);
    navigate(`/sessions/${id}/cleanup`);
  }

  if (session === undefined) return <LoadingSpinner />;

  if (!session) {
    return (
      <div className="p-6">
        <p className="text-surface-500">Sesja nie znaleziona.</p>
        <Link to="/sessions" className="text-primary-600 hover:underline">
          ← Powrót do sesji
        </Link>
      </div>
    );
  }

  const title = session.name || `Sesja ${session.data.number}`;

  function panelTitle(section: NonNullable<typeof openSection>): string {
    if (section === 'npcs') return 'Postacie';
    if (section === 'threads') return 'Wątki';
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
    return <SessionSearchPanel sessionId={sessionId} />;
  }

  function closeRightPanel() {
    setOpenSection(null);
    setRailHovered(false);
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-transparent">
      <div className="shrink-0 px-4 pt-3 pb-3">
        <div className="app-panel-strong flex items-center gap-3 rounded-[1.8rem] px-5 py-4">
          <Link
            to={`/sessions/${id}`}
            className="text-surface-600 hover:text-primary-800 flex h-10 w-10 items-center justify-center rounded-2xl bg-[rgba(223,225,218,0.72)] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[rgba(242,196,88,0.14)] text-[#9a6710]">
            <Zap className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-surface-500 text-[11px] font-semibold tracking-[0.18em] uppercase">
              Tryb na żywo
            </p>
            <h1 className="text-primary-900 truncate text-xl font-semibold tracking-[-0.03em]">
              {title}
            </h1>
          </div>
          <button
            type="button"
            onClick={() => setConfirmEnd(true)}
            className="text-danger-700 inline-flex items-center gap-2 rounded-2xl border border-[rgba(176,108,103,0.32)] bg-[rgba(176,108,103,0.08)] px-4 py-3 text-sm font-medium transition-colors hover:bg-[rgba(176,108,103,0.14)]"
          >
            <StopCircle className="h-4 w-4" />
            Zakończ sesję
          </button>
        </div>
      </div>

      <DndContext
        onDragStart={(event) => {
          const dragData = event.active.data.current as NpcDragData | undefined;
          if (dragData?.type === 'npc') setActiveNpcDrag(dragData);
        }}
        onDragEnd={(event) => void handleDragEnd(event)}
        onDragCancel={() => setActiveNpcDrag(null)}
      >
        <div className="grid flex-1 grid-cols-[300px_minmax(0,1fr)] gap-4 overflow-hidden px-4 pb-4">
          <aside className="flex min-h-0 flex-col gap-4">
            <div className="app-panel min-h-0 flex-[1.88] overflow-hidden rounded-[1.65rem]">
              <SessionTimeline sessionId={session.id} />
            </div>
            <div
              className="app-panel min-h-0 flex-[1.12] overflow-y-auto rounded-[1.65rem] p-3"
              style={{ scrollbarWidth: 'none' }}
            >
              <SpotlightTracker
                sessionId={session.id}
                state={spotlightState ?? DEFAULT_SPOTLIGHT}
                onChange={setSpotlightState}
              />
            </div>
          </aside>

          <div className="app-panel min-h-0 overflow-hidden rounded-[1.8rem]">
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
            openSection ? 'right-[348px]' : 'right-0'
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
              className="text-surface-500 hover:text-primary-700 flex h-12 w-6 items-center justify-center rounded-l-full border border-r-0 border-[rgba(86,93,94,0.14)] bg-[rgba(223,225,218,0.94)] shadow-[0_10px_24px_rgba(18,45,66,0.14)]"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
          )}

          {(openSection || railHovered) && (
            <div className="flex flex-col gap-2.5">
              {(
                [
                  ['threats', 'Zagrożenia'],
                  ['notes', 'Notatki'],
                  ['npcs', 'Postacie'],
                  ['threads', 'Wątki'],
                  ['search', 'Wyszukaj'],
                ] as const
              ).map(([sectionId, label]) => {
                const active = openSection === sectionId;
                return (
                  <button
                    key={sectionId}
                    type="button"
                    onClick={() => {
                      if (active) {
                        closeRightPanel();
                        return;
                      }
                      setOpenSection(sectionId);
                    }}
                    className={`relative flex h-9 w-[7.5rem] items-center justify-center rounded-l-full border border-r-0 px-3 text-center text-[11px] font-semibold tracking-[0.01em] transition-all ${
                      active
                        ? 'border-[rgba(18,45,66,0.2)] bg-[linear-gradient(180deg,var(--color-primary-600)_0%,var(--color-primary-700)_100%)] text-[#f7f3e8] shadow-[0_14px_28px_rgba(18,45,66,0.2)]'
                        : 'text-surface-700 hover:text-primary-800 border-[rgba(86,93,94,0.14)] bg-[rgba(223,225,218,0.94)] shadow-[0_8px_18px_rgba(18,45,66,0.08)] hover:bg-[rgba(229,231,223,0.98)]'
                    }`}
                  >
                    {label}
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
          className={`fixed top-[5.5rem] right-0 bottom-14 z-[34] w-[348px] max-w-[36vw] overflow-hidden rounded-l-[1.8rem] border border-r-0 border-[rgba(86,93,94,0.14)] bg-[linear-gradient(180deg,rgba(223,225,218,0.96)_0%,rgba(210,212,203,0.98)_100%)] shadow-[0_28px_52px_rgba(18,45,66,0.18)] transition-transform duration-300 ease-out ${
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
              <div className="h-full overflow-y-auto p-3">
                {renderPanelContent(openSection, session.id)}
              </div>
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
    </div>
  );
}
