import { useLiveQuery } from 'dexie-react-hooks';
import { useCampaign } from '@shared/db/CampaignContext';
import { useRelations } from '@shared/hooks/useRelations';
import { isThread } from '../types';
import type { Thread } from '../types';

/** Reactive single Thread entity + its relations */
export function useThreadById(id: string | undefined): {
  thread: Thread | undefined;
  relations: ReturnType<typeof useRelations>;
} {
  const { db } = useCampaign();
  const entity = useLiveQuery(
    async () => {
      if (!id) return undefined;
      const e = await db.entities.get(id);
      return e && isThread(e) ? e : undefined;
    },
    [db, id],
  );

  const relations = useRelations(id);

  return { thread: entity, relations };
}
