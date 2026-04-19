import { useLiveQuery } from 'dexie-react-hooks';
import { useCampaign } from '@shared/db/CampaignContext';
import { useRelations } from '@shared/hooks/useRelations';
import { isFront } from '../types';
import type { Front } from '../types';

export function useFrontById(id: string | undefined): {
  front: Front | undefined;
  relations: ReturnType<typeof useRelations>;
} {
  const { db } = useCampaign();
  const entity = useLiveQuery(
    async () => {
      if (!id) return undefined;
      const e = await db.entities.get(id);
      return e && isFront(e) ? e : undefined;
    },
    [db, id],
  );
  const relations = useRelations(id);
  return { front: entity, relations };
}
