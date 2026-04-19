import { useLiveQuery } from 'dexie-react-hooks';
import { useCampaign } from '@shared/db/CampaignContext';
import { useRelations } from '@shared/hooks/useRelations';
import { isFaction } from '../types';

export function useFactionById(id: string | undefined) {
  const { db } = useCampaign();
  const entity = useLiveQuery(
    async () => {
      if (!id) return undefined;
      const e = await db.entities.get(id);
      return e && isFaction(e) ? e : undefined;
    },
    [db, id],
  );
  const relations = useRelations(id);
  return { faction: entity, relations };
}
