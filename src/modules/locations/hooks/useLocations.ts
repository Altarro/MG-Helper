import { useLiveQuery } from 'dexie-react-hooks';
import { useCampaign } from '@shared/db/CampaignContext';
import { isNamedLocation } from '../types';
import type { Location } from '../types';

/** Reactive list of all visible (named) location entities, sorted by name */
export function useLocations(): Location[] | undefined {
  const { db } = useCampaign();
  return useLiveQuery(async () => {
    const all = await db.entities.where('type').equals('location').sortBy('name');
    return all.filter(isNamedLocation);
  }, [db]);
}
