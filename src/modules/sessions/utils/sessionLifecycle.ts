import { getSessionLifecycleStatus, type Session, type SessionData } from '../types';

interface SpotlightSummaryDraft {
  capturedAt: string;
  mgTotalActiveSec: number;
  mgWaitSec: number;
  players: Array<{
    id: string;
    name: string;
    playerName?: string;
    totalActiveSec: number;
    waitSec: number;
  }>;
}

export function getBlockingCleanupSession(
  sessions: Session[],
  currentSessionId: string | undefined,
): Session | undefined {
  return sessions.find(
    (entity) =>
      entity.id !== currentSessionId &&
      getSessionLifecycleStatus(entity.data as SessionData) === 'cleanup_pending',
  );
}

export function formatSessionLabel(session: Session): string {
  return session.name || `Sesja ${session.data.number ?? '?'}`;
}

export function buildCleanupPendingSessionData(
  sessionData: SessionData,
  spotlightSummary: SpotlightSummaryDraft,
  nowIso: string,
): SessionData {
  return {
    ...sessionData,
    status: 'cleanup_pending',
    liveRunEndedAt: nowIso,
    spotlightSummary,
  };
}
