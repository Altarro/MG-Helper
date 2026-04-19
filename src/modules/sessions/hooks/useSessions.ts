import { useLiveQuery } from 'dexie-react-hooks';
import { useCampaign } from '@shared/db/CampaignContext';
import { getSessionSortOrder } from '@shared/utils/entityData';
import { isSession } from '../types';
import type { Session } from '../types';

export function useSessions(): Session[] | undefined {
  const { db } = useCampaign();
  return useLiveQuery(async () => {
    const all = await db.entities.where('type').equals('session').toArray();
    const sessions = all.filter(isSession);
    // Sort by explicit sortOrder first, then by session number descending
    return sessions.sort((a, b) => {
      const soA = getSessionSortOrder(a);
      const soB = getSessionSortOrder(b);
      if (soA !== soB) return soA - soB;
      return b.data.number - a.data.number;
    });
  }, [db]);
}
