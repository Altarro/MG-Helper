import { useLiveQuery } from 'dexie-react-hooks';
import { useCampaign } from '@shared/db/CampaignContext';
import { isFaction } from '../types';
import type { Faction } from '../types';

export function useFactions(): Faction[] | undefined {
  const { db } = useCampaign();
  return useLiveQuery(async () => {
    const all = await db.entities.where('type').equals('faction').sortBy('name');
    return all.filter(isFaction);
  }, [db]);
}
