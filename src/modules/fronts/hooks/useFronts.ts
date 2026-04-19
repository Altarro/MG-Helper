import { useLiveQuery } from 'dexie-react-hooks';
import { useCampaign } from '@shared/db/CampaignContext';
import { isFront } from '../types';
import type { Front } from '../types';

export function useFronts(): Front[] | undefined {
  const { db } = useCampaign();
  return useLiveQuery(async () => {
    const all = await db.entities.where('type').equals('front').sortBy('name');
    return all.filter(isFront);
  }, [db]);
}
