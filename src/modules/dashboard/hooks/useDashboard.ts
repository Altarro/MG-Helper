import { useLiveQuery } from 'dexie-react-hooks';
import { useCampaign } from '@shared/db/CampaignContext';
import { isFront } from '@modules/fronts/types';
import { isClock } from '@modules/clocks/types';
import { isNpcLocationHistoryEvent } from '@modules/npcs/types';
import { getSessionLifecycleStatus, isSession } from '@modules/sessions/types';
import { getSessionEventData } from '@shared/utils/entityData';
import { threatNeedsCleanupReason } from '@shared/utils/threatLifecycle';
import type { Front } from '@modules/fronts/types';
import type { Clock } from '@modules/clocks/types';
import type { Entity } from '@shared/types/entity';
import type { Session } from '@modules/sessions/types';

export interface DashboardData {
  activeFronts: Front[];
  runningClocks: Clock[];
  recentEntities: Entity[];
  decisionItems: Array<{
    id: string;
    title: string;
    description: string;
    href: string;
    priority: 'high' | 'medium';
  }>;
}

export function useDashboard(): DashboardData | undefined {
  const { db } = useCampaign();
  return useLiveQuery(async () => {
    const [allEntities, allRelations] = await Promise.all([
      db.entities.toArray(),
      db.relations.toArray(),
    ]);

    // Active fronts
    const activeFronts = allEntities.filter(isFront);

    // Clocks with filled < segments (still running) and not dead
    const runningClocks = allEntities
      .filter(isClock)
      .filter((c) => c.data.filled < c.data.segments && c.data.isActive !== false);

    // Recently edited (top 10 by updatedAt, all types)
    const recentEntities = [...allEntities]
      .filter((entity) => !isNpcLocationHistoryEvent(entity))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 10);

    const sessions = allEntities.filter((entity): entity is Session => isSession(entity));
    const cleanupPendingSessions = sessions.filter(
      (session) => getSessionLifecycleStatus(session.data) === 'cleanup_pending',
    );

    const notesPendingCleanup = allEntities
      .filter((entity) => entity.type === 'note')
      .filter((entity) => (entity.data as { cleanupDecision?: string }).cleanupDecision === 'pending');

    const threatsNeedingReason = allEntities
      .filter((entity) => entity.type === 'threat')
      .filter((entity) => threatNeedsCleanupReason(entity.data));

    const criticalSignals = allEntities
      .filter((entity) => entity.type === 'event')
      .map((entity) => getSessionEventData(entity))
      .filter(
        (data) =>
          data.kind === 'session_signal' &&
          (data.signalType === 'entity_died_in_session' || data.signalType === 'threat_status_changed'),
      );

    const decisionItems: DashboardData['decisionItems'] = [];

    for (const pendingSession of cleanupPendingSessions) {
      decisionItems.push({
        id: `cleanup-${pendingSession.id}`,
        title: `Dokończ cleanup: ${pendingSession.name || `Sesja ${pendingSession.data.number}`}`,
        description: 'Nowy przebieg sesji jest blokowany do czasu finalizacji cleanup.',
        href: `/sessions/${pendingSession.id}/cleanup`,
        priority: 'high',
      });
    }

    if (notesPendingCleanup.length > 0 && cleanupPendingSessions[0]) {
      decisionItems.push({
        id: 'notes-pending',
        title: `Notatki czekają na decyzję (${notesPendingCleanup.length})`,
        description: 'Zdecyduj: zachowaj, archiwizuj albo usuń notatki live.',
        href: `/sessions/${cleanupPendingSessions[0].id}/cleanup`,
        priority: 'medium',
      });
    }

    if (threatsNeedingReason.length > 0 && cleanupPendingSessions[0]) {
      decisionItems.push({
        id: 'threat-reasons',
        title: `Uzupełnij powody zagrożeń (${threatsNeedingReason.length})`,
        description: 'Raport traci kontekst bez powodów zakończenia zagrożeń.',
        href: `/sessions/${cleanupPendingSessions[0].id}/cleanup`,
        priority: 'medium',
      });
    }

    if (criticalSignals.length > 0 && cleanupPendingSessions[0]) {
      decisionItems.push({
        id: 'critical-signals',
        title: `Sygnały krytyczne wymagają reakcji (${criticalSignals.length})`,
        description: 'Sprawdź zmiany statusów i zamknij konsekwencje fabularne.',
        href: `/sessions/${cleanupPendingSessions[0].id}/report`,
        priority: 'medium',
      });
    }

    void allRelations; // allRelations available for future use
    return { activeFronts, runningClocks, recentEntities, decisionItems };
  }, [db]);
}
