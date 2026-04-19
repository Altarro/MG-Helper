import { useLiveQuery } from 'dexie-react-hooks';
import { useCampaign } from '@shared/db/CampaignContext';
import { isClock } from '../types';
import type { Clock } from '../types';

/** Reactive list of all clock entities, sorted by name */
export function useClocks(): Clock[] | undefined {
  const { db } = useCampaign();
  return useLiveQuery(async () => {
    const all = await db.entities.where('type').equals('clock').sortBy('name');
    return all.filter(isClock);
  }, [db]);
}
