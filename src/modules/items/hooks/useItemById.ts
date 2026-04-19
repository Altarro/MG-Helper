import { useLiveQuery } from 'dexie-react-hooks';
import { useCampaign } from '@shared/db/CampaignContext';
import { useRelations } from '@shared/hooks/useRelations';
import { isItem } from '../types';

export function useItemById(id: string | undefined) {
  const { db } = useCampaign();
  const entity = useLiveQuery(
    async () => {
      if (!id) return undefined;
      const e = await db.entities.get(id);
      return e && isItem(e) ? e : undefined;
    },
    [db, id],
  );
  const relations = useRelations(id);
  return { item: entity, relations };
}
