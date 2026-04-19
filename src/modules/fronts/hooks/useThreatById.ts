import { useLiveQuery } from 'dexie-react-hooks';
import { useCampaign } from '@shared/db/CampaignContext';
import { useRelations } from '@shared/hooks/useRelations';
import { isThreat } from '../types';
import type { Threat } from '../types';

export function useThreatById(id: string | undefined): {
  threat: Threat | undefined;
  relations: ReturnType<typeof useRelations>;
} {
  const { db } = useCampaign();
  const entity = useLiveQuery(
    async () => {
      if (!id) return undefined;
      const e = await db.entities.get(id);
      return e && isThreat(e) ? e : undefined;
    },
    [db, id],
  );
  const relations = useRelations(id);
  return { threat: entity, relations };
}
