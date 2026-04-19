import { useLiveQuery } from 'dexie-react-hooks';
import { useCampaign } from '@shared/db/CampaignContext';
import { isItem } from '../types';
import type { Item } from '../types';

export function useItems(): Item[] | undefined {
  const { db } = useCampaign();
  return useLiveQuery(async () => {
    const all = await db.entities.where('type').equals('item').sortBy('name');
    return all.filter(isItem);
  }, [db]);
}
