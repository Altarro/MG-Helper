import { useLiveQuery } from 'dexie-react-hooks';
import { useCampaign } from '@shared/db/CampaignContext';
import { useRelations } from '@shared/hooks/useRelations';
import { isLocation } from '../types';
import type { Location } from '../types';

/** Reactive single location entity + its relations */
export function useLocationById(id: string | undefined): {
  location: Location | undefined;
  relations: ReturnType<typeof useRelations>;
} {
  const { db } = useCampaign();
  const entity = useLiveQuery(
    async () => {
      if (!id) return undefined;
      const e = await db.entities.get(id);
      return e && isLocation(e) ? e : undefined;
    },
    [db, id],
  );

  const relations = useRelations(id);

  return { location: entity, relations };
}
