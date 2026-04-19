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
import {
  useCurrentSceneNpcIds,
} from '../hooks/useLiveSessionQueries';
import { toast } from 'sonner';
import { ensureEntityAppearsInSession, moveNpcToLocation } from '../utils/liveSessionCommands';

// ── SessionLive ───────────────────────────────────────────────────────────────
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

  const { currentLocationId, openCardIds, spotlightState, setCurrentLocationId, openCard, closeCard, setSpotlightState } =
    useLiveSessionState(id ?? '');

  const [confirmEnd, setConfirmEnd] = useState(false);
  const [activeNpcDrag, setActiveNpcDrag] = useState<NpcDragData | null>(null);
  const sceneCenterRef = useRef<SceneCenterHandle>(null);
  const [openSection, setOpenSection] = useState<'npcs' | 'threads' | 'threats' | 'notes' | 'search' | null>(null);
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
  const [railHovered, setRailHovered] = useState(false);
  const sessionIdForHooks = session?.id ?? id ?? '';
  const sceneNpcIds = useCurrentSceneNpcIds(sessionIdForHooks, currentLocationId);
  const sceneThreadIds = useLiveQuery(async () => {
    if (openCardIds.length === 0) return [] as string[];
    const entities = await db.entities.where('id').anyOf(openCardIds).toArray();
    return entities
      .filter((entity) => entity.type === 'thread')
      .map((entity) => entity.id);
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

  function renderPanelContent(section: NonNullable<typeof openSection>, sessionId: string): ReactNode {
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
    <div className="flex h-screen flex-col overflow-hidden bg-surface-50">
      {/* ── Header ── */}
      <div className="flex shrink-0 items-center gap-3 border-b border-surface-200/80 bg-white/90 px-5 py-3 backdrop-blur-sm">
        <Link
          to={`/sessions/${id}`}
          className="flex items-center gap-1 rounded-md px-1.5 py-1 text-sm text-surface-400 transition-colors hover:bg-surface-100 hover:text-surface-700"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <Zap className="h-5 w-5 text-amber-500 shrink-0" />
        <h1 className="flex-1 min-w-0 truncate font-semibold text-surface-900">{title} — Na żywo</h1>
        <button
          type="button"
          onClick={() => setConfirmEnd(true)}
          className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm text-red-600 shadow-sm transition-colors hover:bg-red-50"
        >
          <StopCircle className="h-4 w-4" />
          Zakończ sesję
        </button>
      </div>

      {/* ── DndContext wrapping body ── */}
      <DndContext
        onDragStart={(e) => {
          const d = e.active.data.current as NpcDragData | undefined;
          if (d?.type === 'npc') setActiveNpcDrag(d);
        }}
        onDragEnd={(e) => void handleDragEnd(e)}
        onDragCancel={() => setActiveNpcDrag(null)}
      >
        <div className="grid flex-1 grid-cols-[300px_minmax(0,1fr)] gap-3 overflow-hidden px-3 py-3">
          {/* Left rail: timeline + spotlight */}
          <aside className="flex min-h-0 flex-col gap-3">
            <div className="min-h-0 flex-[1.88] overflow-hidden rounded-xl border border-surface-200 bg-white shadow-sm">
              <SessionTimeline sessionId={session.id} />
            </div>
            <div
              className="min-h-0 flex-[1.12] overflow-y-auto rounded-xl border border-surface-200 bg-white p-2 shadow-sm"
              style={{ scrollbarWidth: 'none' }}
            >
              <SpotlightTracker
                sessionId={session.id}
                state={spotlightState ?? DEFAULT_SPOTLIGHT}
                onChange={setSpotlightState}
              />
            </div>
          </aside>

          {/* Center: scene */}
          <div className="min-h-0 overflow-hidden rounded-xl border border-surface-200 bg-white shadow-sm">
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

        {/* Right tabs hover zone + bookmarks */}
        <div
          className={`fixed top-1/2 z-[35] -translate-y-1/2 transition-all duration-300 ease-out ${
            openSection ? 'right-[340px]' : 'right-0'
          }`}
          onMouseEnter={() => setRailHovered(true)}
          onMouseLeave={() => {
            if (!openSection) setRailHovered(false);
          }}
        >
          {/* Hover hitbox on screen edge */}
          {!openSection && (
            <div className="absolute -right-0 top-[-160px] h-[320px] w-5" />
          )}

          {/* Collapsed handle */}
          {!openSection && !railHovered && (
            <button
              type="button"
              onMouseEnter={() => setRailHovered(true)}
              onClick={() => {
                setRailHovered(true);
              }}
              aria-label="Rozwiń menu boczne"
              className="flex h-11 w-5 items-center justify-center rounded-l-full border border-r-0 border-surface-200 bg-white/95 text-surface-400 shadow-md hover:text-primary-600"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Expanded tabs */}
          {(openSection || railHovered) && (
            <div className="flex flex-col gap-2">
              {([
                ['threats', 'Zagrożenia', null],
                ['notes', 'Notatki', null],
                ['npcs', 'Postacie', null],
                ['threads', 'Wątki', null],
                ['search', 'Wyszukaj', null],
              ] as const).map(([sectionId, label, badge]) => {
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
                    className={`relative flex h-8 w-28 items-center justify-center rounded-l-full border border-r-0 px-2 text-center text-[11px] font-medium transition-all ${
                      active
                        ? 'border-primary-600 bg-primary-600 text-white shadow-lg'
                        : 'border-surface-200 bg-white/95 text-surface-600 shadow-sm hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700 hover:shadow-md'
                    }`}
                  >
                    {label}
                    {typeof badge === 'number' && badge > 0 && (
                      <span className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] ${active ? 'bg-white/20' : 'bg-amber-100 text-amber-700'}`}>
                        {badge}
                      </span>
                    )}
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

        {/* Floating tactical panel */}
        <div
          className={`fixed bottom-14 right-0 top-20 z-[34] w-[340px] max-w-[35vw] overflow-hidden rounded-l-2xl border border-r-0 border-surface-200 bg-white shadow-2xl transition-transform duration-300 ease-out ${
            openSection ? 'translate-x-0' : 'translate-x-full'
          } ${openSection ? 'pointer-events-auto' : 'pointer-events-none'}`}
        >
          {openSection && (
            <>
              <div className="flex items-center gap-2 border-b border-surface-100 bg-surface-50 px-3 py-2">
                <span className="text-sm font-semibold text-surface-800">{panelTitle(openSection)}</span>
                <span className="flex-1" />
                <button
                  type="button"
                  onClick={closeRightPanel}
                  className="rounded-md px-2 py-1 text-xs text-surface-500 hover:bg-surface-100 hover:text-surface-700"
                >
                  Zamknij
                </button>
              </div>
              <div className="h-full overflow-y-auto p-2">{renderPanelContent(openSection, session.id)}</div>
            </>
          )}
        </div>

        {/* DragOverlay — ghost chip while dragging */}
        <DragOverlay>
          {activeNpcDrag && (
            <div className="rounded-full border border-primary-300 bg-primary-100 px-3 py-1 text-xs font-medium text-primary-800 shadow-lg opacity-90">
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

      {/* End session confirm dialog */}
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
