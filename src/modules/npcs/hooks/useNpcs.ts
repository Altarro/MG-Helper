import { useLiveQuery } from 'dexie-react-hooks';
import { useCampaign } from '@shared/db/CampaignContext';
import { isNpc } from '../types';
import type { Npc } from '../types';

/** Reactive list of all NPC entities, sorted by name */
export function useNpcs(): Npc[] | undefined {
  const { db } = useCampaign();
  return useLiveQuery(async () => {
    const all = await db.entities.where('type').equals('npc').sortBy('name');
    return all.filter(isNpc);
  }, [db]);
}
