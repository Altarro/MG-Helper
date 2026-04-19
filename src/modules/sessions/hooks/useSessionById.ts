import { useLiveQuery } from 'dexie-react-hooks';
import { useCampaign } from '@shared/db/CampaignContext';
import { useRelations } from '@shared/hooks/useRelations';
import { isSession } from '../types';
import type { Session } from '../types';

export function useSessionById(id: string | undefined): {
  session: Session | undefined;
  relations: ReturnType<typeof useRelations>;
} {
  const { db } = useCampaign();
  const entity = useLiveQuery(
    async () => {
      if (!id) return undefined;
      const e = await db.entities.get(id);
      return e && isSession(e) ? e : undefined;
    },
    [db, id],
  );
  const relations = useRelations(id);
  return { session: entity, relations };
}
