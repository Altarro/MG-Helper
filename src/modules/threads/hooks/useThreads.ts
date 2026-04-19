import { useLiveQuery } from 'dexie-react-hooks';
import { useCampaign } from '@shared/db/CampaignContext';
import { getThreadSortOrder } from '@shared/utils/entityData';
import { isThread } from '../types';
import type { Thread } from '../types';

/** Reactive list of all Thread entities, sorted by sortOrder then name */
export function useThreads(): Thread[] | undefined {
  const { db } = useCampaign();
  return useLiveQuery(async () => {
    const all = await db.entities.where('type').equals('thread').sortBy('name');
    const threads = all.filter(isThread);
    return threads.sort((a, b) => {
      const soA = getThreadSortOrder(a);
      const soB = getThreadSortOrder(b);
      if (soA !== soB) return soA - soB;
      return a.name.localeCompare(b.name);
    });
  }, [db]);
}
