import { useLiveQuery } from 'dexie-react-hooks';
import { useCampaign } from '@shared/db/CampaignContext';
import { isSessionEvent, type SessionEvent } from '../types';
import { getSessionEventData, getSessionEventTimestamp } from '@shared/utils/entityData';

export interface SessionSignalAggregate {
  total: number;
  byType: Map<string, number>;
  byEntityType: Map<string, number>;
}

export interface SessionSignalsData {
  events: SessionEvent[];
  aggregate: SessionSignalAggregate;
  // Placeholder feed: entities marked as "dead/completed" during this live session.
  deadDuringSession: Array<{ entityId: string; entityName: string; entityType: string; timestamp: string }>;
}

function buildAggregate(events: SessionEvent[]): SessionSignalAggregate {
  const byType = new Map<string, number>();
  const byEntityType = new Map<string, number>();

  for (const event of events) {
    const data = getSessionEventData(event);
    const signalType = data.signalType ?? 'unknown';
    const entityType = data.entityType ?? 'unknown';
    byType.set(signalType, (byType.get(signalType) ?? 0) + 1);
    byEntityType.set(entityType, (byEntityType.get(entityType) ?? 0) + 1);
  }

  return { total: events.length, byType, byEntityType };
}

export function useSessionSignals(sessionId: string | undefined): SessionSignalsData {
  const { db } = useCampaign();

  const events =
    useLiveQuery(async () => {
      if (!sessionId) return [] as SessionEvent[];
      const rels = await db.relations
        .where('targetId')
        .equals(sessionId)
        .filter((relation) => relation.type === 'appears_in')
        .toArray();

      if (rels.length === 0) return [] as SessionEvent[];
      const entities = await Promise.all(rels.map((relation) => db.entities.get(relation.sourceId)));
      return entities
        .filter((entity): entity is SessionEvent => entity !== undefined && isSessionEvent(entity))
        .filter((event) => getSessionEventData(event).kind === 'session_signal')
        .sort((a, b) => {
          const ta = getSessionEventTimestamp(a);
          const tb = getSessionEventTimestamp(b);
          return ta < tb ? -1 : ta > tb ? 1 : 0;
        });
    }, [db, sessionId]) ?? [];

  const deadDuringSession = events
    .filter((event) => getSessionEventData(event).signalType === 'entity_died_in_session')
    .map((event) => {
      const data = getSessionEventData(event);
      return {
        entityId: data.entityId ?? event.id,
        entityName: data.entityName ?? 'Nieznany obiekt',
        entityType: data.entityType ?? 'unknown',
        timestamp: data.timestamp,
      };
    });

  return {
    events,
    aggregate: buildAggregate(events),
    deadDuringSession,
  };
}
