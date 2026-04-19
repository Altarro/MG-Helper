import { useLiveQuery } from 'dexie-react-hooks';
import { useCampaign } from '@shared/db/CampaignContext';
import { useRelations } from '@shared/hooks/useRelations';
import { isClue } from '../types';
import type { Clue } from '../types';

/** Reactive single Clue entity + its relations */
export function useClueById(id: string | undefined): {
  clue: Clue | undefined;
  relations: ReturnType<typeof useRelations>;
} {
  const { db } = useCampaign();
  const entity = useLiveQuery(
    async () => {
      if (!id) return undefined;
      const e = await db.entities.get(id);
      return e && isClue(e) ? e : undefined;
    },
    [db, id],
  );

  const relations = useRelations(id);

  return { clue: entity, relations };
}
