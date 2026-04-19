import { useLiveQuery } from 'dexie-react-hooks';
import { useCampaign } from '@shared/db/CampaignContext';
import type { Entity } from '@shared/types';

/** Returns all entities linked to `entityId` via a `contains` relation (as target). */
export function useContained(entityId: string | undefined): Entity[] {
  const { db } = useCampaign();
  return (
    useLiveQuery(async () => {
      if (!entityId) return [];
      const relations = await db.relations
        .where('sourceId')
        .equals(entityId)
        .filter((r) => r.type === 'contains')
        .toArray();
      const ids = relations.map((r) => r.targetId);
      return db.entities.where('id').anyOf(ids).toArray();
    }, [db, entityId]) ?? []
  );
}
