import { useLiveQuery } from 'dexie-react-hooks';
import { useCampaign } from '@shared/db/CampaignContext';
import { isThreat } from '../types';
import type { Threat } from '../types';

export function useThreats(frontId?: string): Threat[] | undefined {
  const { db } = useCampaign();
  return useLiveQuery(async () => {
    if (frontId) {
      // Load threats belonging to a specific front via belongs_to relation
      const rels = await db.relations
        .where('targetId')
        .equals(frontId)
        .filter((r) => r.type === 'belongs_to')
        .toArray();
      const ids = rels.map((r) => r.sourceId);
      if (!ids.length) return [];
      const entities = await db.entities.where('id').anyOf(ids).toArray();
      return entities.filter(isThreat);
    }
    const all = await db.entities.where('type').equals('threat').sortBy('name');
    return all.filter(isThreat);
  }, [db, frontId]);
}
