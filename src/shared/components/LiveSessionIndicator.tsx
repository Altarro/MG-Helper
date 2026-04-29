import { useState, useEffect } from 'react';
import { Zap, Pause, Play } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useLiveQuery } from 'dexie-react-hooks';
import { useCampaign } from '@shared/db/CampaignContext';
import { toast } from 'sonner';
import { getSessionLifecycleStatus, type SessionData } from '@modules/sessions/types';
import {
  getLiveSessionMarker,
  setLiveSessionMarker,
  clearLiveSessionMarker,
  type LiveSessionMarker,
  LIVE_SESSION_MARKER_UPDATED_EVENT,
} from '@modules/sessions/hooks/useLiveSessionState';
import type { Entity } from '@shared/types/entity';

type LiveMarkerTarget =
  | { kind: 'idle' }
  | { kind: 'missing' }
  | { kind: 'found'; entity: Entity };

export function LiveSessionIndicator() {
  const navigate = useNavigate();
  const { db, campaignId } = useCampaign();
  const [marker, setMarker] = useState<LiveSessionMarker | null>(() => getLiveSessionMarker());
  const blockingCleanupSession = useLiveQuery(async () => {
    if (!marker) return undefined;
    const all = await db.entities.where('type').equals('session').toArray();
    return all.find(
      (entity) =>
        entity.id !== marker.sessionId &&
        getSessionLifecycleStatus(entity.data as unknown as SessionData) === 'cleanup_pending',
    );
  }, [db, marker]);
  /** Rozróżnienie „ładowanie” vs „brak encji”: samo `undefined` z get() jest niejednoznaczne dla useLiveQuery. */
  const liveMarkerTarget = useLiveQuery(
    async (): Promise<LiveMarkerTarget> => {
      if (!marker) return { kind: 'idle' };
      const entity = await db.entities.get(marker.sessionId);
      if (!entity) return { kind: 'missing' };
      return { kind: 'found', entity };
    },
    [db, marker],
  );

  useEffect(() => {
    function sync() {
      setMarker(getLiveSessionMarker());
    }
    window.addEventListener('storage', sync);
    window.addEventListener('focus', sync);
    window.addEventListener(LIVE_SESSION_MARKER_UPDATED_EVENT, sync);
    const t = setTimeout(sync, 200);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('focus', sync);
      window.removeEventListener(LIVE_SESSION_MARKER_UPDATED_EVENT, sync);
      clearTimeout(t);
    };
  }, []);

  useEffect(() => {
    if (!marker) return;
    if (marker.campaignId != null && marker.campaignId !== '' && marker.campaignId !== campaignId) {
      clearLiveSessionMarker();
      setMarker(null);
    }
  }, [campaignId, marker]);

  useEffect(() => {
    if (!marker) return;
    if (liveMarkerTarget === undefined) return;
    if (liveMarkerTarget.kind === 'idle') return;
    if (liveMarkerTarget.kind === 'missing') {
      clearLiveSessionMarker();
      setMarker(null);
      return;
    }
    const entity = liveMarkerTarget.entity;
    const isValidSession =
      entity?.type === 'session' &&
      getSessionLifecycleStatus(entity.data as unknown as SessionData) === 'live';
    if (isValidSession) return;
    clearLiveSessionMarker();
    setMarker(null);
  }, [liveMarkerTarget, marker]);

  if (!marker) return null;

  function handleTogglePause() {
    if (!marker) return;
    const updated: LiveSessionMarker = { ...marker, isPaused: !marker.isPaused };
    setLiveSessionMarker(updated);
    setMarker(updated);
  }

  function handleNavigate() {
    if (!marker) return;
    if (blockingCleanupSession) {
      const blockedTitle =
        blockingCleanupSession.name ||
        `Sesja ${(blockingCleanupSession.data as { number?: number }).number ?? '?'}`;
      toast.error(
        `Dokończ najpierw sprzątanie: ${blockedTitle}. Start nowej sesji na żywo jest zablokowany.`,
      );
      void navigate(`/sessions/${blockingCleanupSession.id}/cleanup`);
      return;
    }
    navigate(`/sessions/${marker.sessionId}/live`);
  }

  return (
    <div className="flex items-center gap-1.5 rounded-full border border-[rgba(210,166,67,0.55)] bg-[linear-gradient(180deg,rgba(242,196,88,0.22)_0%,rgba(242,196,88,0.12)_100%)] px-2.5 py-1 text-xs shadow-[0_6px_16px_rgba(210,166,67,0.16)]">
      <Zap className="h-3.5 w-3.5 shrink-0 text-warning-600" />
      <button
        type="button"
        onClick={handleNavigate}
        className="max-w-[140px] truncate font-medium text-[#7f5b12] hover:underline"
        title={`Sesja na żywo: ${marker.sessionName}`}
      >
        {marker.sessionName}
      </button>
      <button
        type="button"
        onClick={handleTogglePause}
        aria-label={marker.isPaused ? 'Wznów sesję' : 'Pauzuj sesję'}
        className="ml-0.5 rounded-full p-0.5 text-[#9a7019] transition-colors hover:text-[#6d4e10]"
      >
        {marker.isPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
      </button>
    </div>
  );
}
