import { useLiveQuery } from 'dexie-react-hooks';
import { useCampaign } from '@shared/db/CampaignContext';
import { useRelations } from '@shared/hooks/useRelations';
import { isNpc } from '../types';
import type { Npc } from '../types';

/** Reactive single NPC entity + its relations */
export function useNpcById(id: string | undefined): {
  npc: Npc | undefined;
  relations: ReturnType<typeof useRelations>;
} {
  const { db } = useCampaign();
  const entity = useLiveQuery(
    async () => {
      if (!id) return undefined;
      const e = await db.entities.get(id);
      return e && isNpc(e) ? e : undefined;
    },
    [db, id],
  );

  const relations = useRelations(id);

  return { npc: entity, relations };
}
