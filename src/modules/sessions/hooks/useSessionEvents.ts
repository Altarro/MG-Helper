import { useLiveQuery } from 'dexie-react-hooks';
import { useCampaign } from '@shared/db/CampaignContext';
import { addEntity, addRelation, deleteEntity } from '@shared/db/operations';
import { nowISO } from '@shared/utils/date';
import { getSessionEventData, getSessionEventTimestamp } from '@shared/utils/entityData';
import { isSessionEvent } from '../types';
import type { SessionEventData } from '../types';
import type { Entity } from '@shared/types/entity';

export function useSessionEvents(sessionId: string | undefined) {
  const { db } = useCampaign();

  const events = useLiveQuery(async () => {
    if (!sessionId) return [];
    const rels = await db.relations
      .where('targetId')
      .equals(sessionId)
      .filter((r) => r.type === 'appears_in')
      .toArray();
    const entities = await Promise.all(
      rels.map((r) => db.entities.get(r.sourceId)),
    );
    const eventEntities = entities
      .filter((e): e is Entity => e !== undefined)
      .filter(isSessionEvent)
      .filter((event) => (event.data.kind ?? 'session_timeline') === 'session_timeline')
      .sort((a, b) => {
        const ta = getSessionEventTimestamp(a);
        const tb = getSessionEventTimestamp(b);
        return ta < tb ? -1 : ta > tb ? 1 : 0;
      });
    return eventEntities;
  }, [db, sessionId]) ?? [];

  async function addEvent(text: string) {
    if (!sessionId || !text.trim()) return;
    const entity = await addEntity(db, {
      type: 'event',
      name: text.slice(0, 80),
      description: '',
      tags: [],
      data: {
        kind: 'session_timeline',
        timestamp: nowISO(),
        text: text.trim(),
      } satisfies SessionEventData,
    });
    await addRelation(db, {
      type: 'appears_in',
      sourceId: entity.id,
      targetId: sessionId,
    });
    return { ...entity, type: 'event', data: getSessionEventData(entity) };
  }

  async function removeEvent(eventId: string) {
    await deleteEntity(db, eventId);
  }

  return { events, addEvent, removeEvent };
}
