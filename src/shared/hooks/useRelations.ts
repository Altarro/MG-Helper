import { useLiveQuery } from 'dexie-react-hooks';
import { useCampaign } from '@shared/db/CampaignContext';
import type { Relation } from '@shared/types';

export function useRelations(entityId: string | undefined): Relation[] {
  const { db } = useCampaign();
  return (
    useLiveQuery(async () => {
      if (!entityId) return [];
      const [asSource, asTarget] = await Promise.all([
        db.relations.where('sourceId').equals(entityId).toArray(),
        db.relations.where('targetId').equals(entityId).toArray(),
      ]);
      return [...asSource, ...asTarget];
    }, [db, entityId]) ?? []
  );
}
