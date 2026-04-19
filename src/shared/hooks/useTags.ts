import { useLiveQuery } from 'dexie-react-hooks';
import { useCampaign } from '@shared/db/CampaignContext';

/** Returns a sorted, deduplicated list of all tags used across all entities. */
export function useTags(): string[] {
  const { db } = useCampaign();
  return (
    useLiveQuery(async () => {
      const all = await db.entities.toArray();
      const set = new Set<string>();
      for (const e of all) {
        for (const tag of e.tags) set.add(tag);
      }
      return [...set].sort();
    }, [db]) ?? []
  );
}
