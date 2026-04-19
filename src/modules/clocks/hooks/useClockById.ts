import { useLiveQuery } from 'dexie-react-hooks';
import { useCampaign } from '@shared/db/CampaignContext';
import { useRelations } from '@shared/hooks/useRelations';
import { isClock } from '../types';
import type { Clock } from '../types';

/** Reactive single clock entity + its relations */
export function useClockById(id: string | undefined): { clock: Clock | undefined; relations: ReturnType<typeof useRelations> } {
  const { db } = useCampaign();
  const entity = useLiveQuery(
    async () => {
      if (!id) return undefined;
      const e = await db.entities.get(id);
      return e && isClock(e) ? e : undefined;
    },
    [db, id],
  );

  const relations = useRelations(id);

  return { clock: entity, relations };
}
